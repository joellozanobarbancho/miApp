import { Capacitor } from '@capacitor/core'
import { Directory, Filesystem } from '@capacitor/filesystem'
import { Geolocation } from '@capacitor/geolocation'
import { Share } from '@capacitor/share'
import type JSZip from 'jszip'
import { useMap } from './useMap'
import type { TemplateSlot } from './useTemplateScanner'
import { useTemplateWriter, type SheetValues } from './useTemplateWriter'

export type ReportSlotSelection = {
  slotId: string
  fileName: string
  mimeType: string
  dataUrl: string
  source: 'file' | 'auto-location'
}

function stripDataUrlPrefix(dataUrl: string) {
  return dataUrl.includes(',') ? dataUrl.split(',')[1] ?? dataUrl : dataUrl
}

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const result = reader.result
      if (typeof result === 'string') {
        resolve(result)
        return
      }
      reject(new Error('Unable to read the file'))
    }
    reader.onerror = () => reject(reader.error ?? new Error('Unable to read the file'))
    reader.readAsDataURL(file)
  })
}

async function blobToDataUrl(blob: Blob) {
  return await new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const result = reader.result
      if (typeof result === 'string') {
        resolve(result)
        return
      }
      reject(new Error('Unable to read the image'))
    }
    reader.onerror = () => reject(reader.error ?? new Error('Unable to read the image'))
    reader.readAsDataURL(blob)
  })
}

function loadImage(dataUrl: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error('Unable to load the selected image'))
    img.src = dataUrl
  })
}

// Crops the user's photo to match the aspect ratio of the original
// placeholder in the template, so it doesn't end up stretched or squashed.
async function fitImageToSlot(dataUrl: string, slot: TemplateSlot): Promise<string> {
  if (!slot.widthEmu || !slot.heightEmu) return dataUrl

  const img = await loadImage(dataUrl)
  const targetRatio = slot.widthEmu / slot.heightEmu
  const sourceRatio = img.width / img.height

  let sx = 0
  let sy = 0
  let sw = img.width
  let sh = img.height

  if (sourceRatio > targetRatio) {
    sw = img.height * targetRatio
    sx = (img.width - sw) / 2
  } else if (sourceRatio < targetRatio) {
    sh = img.width / targetRatio
    sy = (img.height - sh) / 2
  }

  const canvas = document.createElement('canvas')
  const outputWidth = 1200
  canvas.width = outputWidth
  canvas.height = Math.round(outputWidth / targetRatio)

  const ctx = canvas.getContext('2d')
  if (!ctx) return dataUrl

  ctx.drawImage(img, sx, sy, sw, sh, 0, 0, canvas.width, canvas.height)
  return canvas.toDataURL('image/jpeg', 0.9)
}

function triggerBrowserDownload(blob: Blob, fileName: string) {
  const objectUrl = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = objectUrl
  anchor.download = fileName
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
  URL.revokeObjectURL(objectUrl)
}

export function useReportGenerator() {
  const { getStaticMap } = useMap()

  // Used by the "Use my location" button on any slot, not just a fixed one.
  async function generateLocationMap(): Promise<{ dataUrl: string; fileName: string }> {
    const position = await Geolocation.getCurrentPosition({ enableHighAccuracy: true, timeout: 12000 })
    const objectUrl = await getStaticMap(position.coords.latitude, position.coords.longitude)
    const response = await fetch(objectUrl)
    const blob = await response.blob()
    URL.revokeObjectURL(objectUrl)
    const dataUrl = await blobToDataUrl(blob)
    return { dataUrl, fileName: 'geolocation-map.png' }
  }

  // Escribe las imágenes seleccionadas dentro del zip del .xlsx. Si el
  // mediaPath original de una casilla está compartido por más de una
  // casilla en la plantilla (aunque alguna de esas casillas no se edite),
  // NUNCA se escribe in-place sobre ese archivo compartido: se crea una
  // copia única para cada casilla editada y se actualiza su relación
  // (.rels) para que apunte a la copia. Así, cualquier casilla que el
  // usuario deje sin sustituir conserva la imagen original de la
  // plantilla, en vez de heredar la foto de una casilla vecina que sí se
  // haya editado.
  async function writeSlotImages(
    zip: JSZip,
    slots: TemplateSlot[],
    selections: Record<string, ReportSlotSelection>
  ) {
    // Cuenta cuántas casillas (editadas o no) apuntan a cada mediaPath
    // original, usando TODAS las casillas de la plantilla, no solo las
    // que tienen selección.
    const mediaPathCounts = new Map<string, number>()
    for (const slot of slots) {
      mediaPathCounts.set(slot.mediaPath, (mediaPathCounts.get(slot.mediaPath) ?? 0) + 1)
    }

    let uniqueCounter = 0

    for (const slot of slots) {
      const selection = selections[slot.id]
      if (!selection) continue

      const fittedDataUrl = await fitImageToSlot(selection.dataUrl, slot)
      const contentBase64 = stripDataUrlPrefix(fittedDataUrl)

      const isSharedMediaPath = (mediaPathCounts.get(slot.mediaPath) ?? 0) > 1

      // Si el archivo original está compartido con otra casilla (esté o
      // no editada), y tenemos la info de relación necesaria, creamos
      // siempre una copia única en vez de tocar el archivo compartido.
      if (isSharedMediaPath && slot.relId && slot.drawingRelsPath && slot.mediaTarget) {
        uniqueCounter += 1

        const parts = slot.mediaPath.split('/')
        const origName = parts.pop() || `image-${uniqueCounter}`
        const dir = parts.join('/')
        const dotIdx = origName.lastIndexOf('.')
        const base = dotIdx >= 0 ? origName.slice(0, dotIdx) : origName
        const ext = dotIdx >= 0 ? origName.slice(dotIdx) : ''
        const newName = `${base}__copy${uniqueCounter}${ext}`
        const newMediaPath = dir ? `${dir}/${newName}` : newName

        // Update the rels XML to point to the new Target for this relId
        try {
          const relEntry = zip.file(slot.drawingRelsPath)
          if (relEntry) {
            const relText = await relEntry.async('text')
            const parser = new DOMParser()
            const relDoc = parser.parseFromString(relText, 'application/xml')
            const relEls = Array.from(relDoc.getElementsByTagName('Relationship'))
            for (const relEl of relEls) {
              const id = relEl.getAttribute('Id')
              if (id === slot.relId) {
                // preserve the same relative path structure as the original
                const origTarget = slot.mediaTarget!
                const origBasename = origTarget.split('/').pop() || origTarget
                const newTarget = origTarget.replace(origBasename, newName)
                relEl.setAttribute('Target', newTarget)
                break
              }
            }

            const serializer = new XMLSerializer()
            const updated = serializer.serializeToString(relDoc)
            zip.file(slot.drawingRelsPath, updated)
          } else {
            // No pudimos leer la relación: no es seguro tocar el archivo
            // compartido, así que dejamos la casilla sin escribir en vez
            // de arriesgarnos a corromper una casilla vecina.
            continue
          }
        } catch (e) {
          // No pudimos actualizar la relación: por seguridad, no tocamos
          // el archivo compartido (mejor dejar la foto sin aplicar que
          // corromper una casilla vecina no editada).
          continue
        }

        // write the new media file
        zip.file(newMediaPath, contentBase64, { base64: true })
      } else if (!isSharedMediaPath) {
        // Este mediaPath es exclusivo de esta casilla: es seguro
        // escribir in-place.
        zip.file(slot.mediaPath, contentBase64, { base64: true })
      } else {
        // Compartido pero sin info de relación suficiente para generar
        // una copia segura: preferimos no tocarlo antes que arriesgarnos
        // a sobreescribir la foto de una casilla vecina.
        continue
      }
    }
  }

  async function prepareReport(
    templateFile: File,
    slots: TemplateSlot[],
    selections: Record<string, ReportSlotSelection>
  ) {
    const { default: JSZip } = await import('jszip')
    const zip = await JSZip.loadAsync(await templateFile.arrayBuffer())

    await writeSlotImages(zip, slots, selections)

    const blob = await zip.generateAsync({ type: 'blob' })
    const fileName = `report-${new Date().toISOString().slice(0, 10)}.xlsx`

    return { blob, fileName }
  }

  // Como prepareReport, pero además escribe los datos de texto/fecha del
  // asistente por pasos (valuesBySheet) antes de reempaquetar el .xlsx.
  async function prepareReportWithFields(
    templateFile: File,
    slots: TemplateSlot[],
    imageSelections: Record<string, ReportSlotSelection>,
    valuesBySheet: Record<string, SheetValues>,
    baseFileName?: string
  ) {
    const { default: JSZip } = await import('jszip')
    const zip = await JSZip.loadAsync(await templateFile.arrayBuffer())

    const { applyFieldValues } = useTemplateWriter()
    await applyFieldValues(zip, valuesBySheet)

    await writeSlotImages(zip, slots, imageSelections)

    const blob = await zip.generateAsync({ type: 'blob' })
    const fileName = baseFileName
      ? `${baseFileName}.xlsx`
      : `report-${new Date().toISOString().slice(0, 10)}.xlsx`

    return { blob, fileName }
  }

  async function downloadReport(blob: Blob, fileName: string) {
    if (Capacitor.getPlatform() === 'web') {
      triggerBrowserDownload(blob, fileName)
      return { path: fileName }
    }

    if (Capacitor.getPlatform() === 'android') {
      const status = await Filesystem.checkPermissions()
      if (status.publicStorage !== 'granted') {
        const requested = await Filesystem.requestPermissions()
        if (requested.publicStorage !== 'granted') {
          throw new Error('Storage permission is required to save into Downloads')
        }
      }
    }

    const base64 = await fileToDataUrl(
      new File([blob], fileName, { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
    )

    // ExternalStorage points at the device's shared storage root
    // (/storage/emulated/0), so "Download/<file>" lands in the real,
    // user-visible Downloads folder instead of the app's private sandbox.
    const saved = await Filesystem.writeFile({
      path: `Download/${fileName}`,
      data: stripDataUrlPrefix(base64),
      directory: Directory.ExternalStorage,
      recursive: true
    })

    return { path: saved.uri }
  }

  async function editReport(blob: Blob, fileName: string) {
    if (Capacitor.getPlatform() === 'web') {
      triggerBrowserDownload(blob, fileName)
      return { path: fileName }
    }

    const base64 = await blobToDataUrl(blob)
    const saved = await Filesystem.writeFile({
      path: `report-edit/${Date.now()}-${fileName}`,
      data: stripDataUrlPrefix(base64),
      directory: Directory.Cache,
      recursive: true
    })

    await Share.share({
      title: 'Edit report',
      text: 'Open this Excel file in a spreadsheet app to edit it manually.',
      files: [saved.uri],
      dialogTitle: 'Edit report'
    })

    return { path: saved.uri }
  }

  return {
    prepareReport,
    prepareReportWithFields,
    downloadReport,
    generateLocationMap,
    editReport
  }
}