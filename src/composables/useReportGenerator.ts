import { Capacitor } from '@capacitor/core'
import { Directory, Filesystem } from '@capacitor/filesystem'
import { Geolocation } from '@capacitor/geolocation'
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

function buildFallbackMapDataUrl(latitude: number, longitude: number) {
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="1200" height="700" viewBox="0 0 1200 700">
      <rect width="1200" height="700" fill="#1f3b57" />
      <circle cx="600" cy="350" r="22" fill="#ffcc66" />
      <text x="600" y="170" font-family="Arial, sans-serif" font-size="38" text-anchor="middle" fill="#ffffff">Automatic map</text>
      <text x="600" y="490" font-family="Arial, sans-serif" font-size="28" text-anchor="middle" fill="#ffffff">${latitude.toFixed(6)}, ${longitude.toFixed(6)}</text>
    </svg>
  `
  return `data:image/svg+xml;base64,${btoa(unescape(encodeURIComponent(svg)))}`
}

async function fetchMapDataUrl(latitude: number, longitude: number) {
  const mapUrl = new URL('https://staticmap.openstreetmap.de/staticmap.php')
  mapUrl.searchParams.set('center', `${latitude},${longitude}`)
  mapUrl.searchParams.set('zoom', '17')
  mapUrl.searchParams.set('size', '1200x700')
  mapUrl.searchParams.set('markers', `${latitude},${longitude},red-pushpin`)

  try {
    const response = await fetch(mapUrl.toString())
    if (!response.ok) throw new Error('Static map request failed')
    return await blobToDataUrl(await response.blob())
  } catch {
    return buildFallbackMapDataUrl(latitude, longitude)
  }
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
  // Used by the "Use my location" button on any slot, not just a fixed one.
  async function generateLocationMap(): Promise<{ dataUrl: string; fileName: string }> {
    const position = await Geolocation.getCurrentPosition({ enableHighAccuracy: true, timeout: 12000 })
    const dataUrl = await fetchMapDataUrl(position.coords.latitude, position.coords.longitude)
    return { dataUrl, fileName: 'geolocation-map.png' }
  }

  async function prepareReport(
    templateFile: File,
    slots: TemplateSlot[],
    selections: Record<string, ReportSlotSelection>
  ) {
    const { default: JSZip } = await import('jszip')
    const zip = await JSZip.loadAsync(await templateFile.arrayBuffer())

    for (const slot of slots) {
      const selection = selections[slot.id]
      if (!selection) continue

      const fittedDataUrl = await fitImageToSlot(selection.dataUrl, slot)
      zip.file(slot.mediaPath, stripDataUrlPrefix(fittedDataUrl), { base64: true })
    }

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

    for (const slot of slots) {
      const selection = imageSelections[slot.id]
      if (!selection) continue

      const fittedDataUrl = await fitImageToSlot(selection.dataUrl, slot)
      zip.file(slot.mediaPath, stripDataUrlPrefix(fittedDataUrl), { base64: true })
    }

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

  return {
    prepareReport,
    prepareReportWithFields,
    downloadReport,
    generateLocationMap
  }
}