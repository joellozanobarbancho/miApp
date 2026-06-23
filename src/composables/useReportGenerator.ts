import { Capacitor } from '@capacitor/core'
import { Directory, Filesystem } from '@capacitor/filesystem'
import { Geolocation } from '@capacitor/geolocation'
import { Share } from '@capacitor/share'

export const REPORT_SLOT_DEFINITIONS = [
  { key: 'logo', label: 'Logo', imageFile: 'image2.png', description: 'Shared report header' },
  { key: 'inquadramento', label: 'Context map', imageFile: 'image16.png', description: 'Automatic map from geolocation' },
  { key: 'scheda_struttura_2', label: 'Structure sheet 2', imageFile: 'image4.png', description: 'Main structure view' },
  { key: 'organi_radianti_2_izq', label: 'Radiant elements 2 left', imageFile: 'image8.png', description: 'Left-side detail' },
  { key: 'organi_radianti_2_der', label: 'Radiant elements 2 right', imageFile: 'image9.png', description: 'Right-side detail' },
  { key: 'vista_1', label: 'View 1', imageFile: 'image4.png', description: 'First overview' },
  { key: 'vista_2_izq', label: 'View 2 left', imageFile: 'image17.png', description: 'View 2 left side' },
  { key: 'vista_2_der', label: 'View 2 right', imageFile: 'image8.png', description: 'View 2 right side' },
  { key: 'vista_3', label: 'View 3', imageFile: 'image18.png', description: 'View 3' },
  { key: 'vista_4', label: 'View 4', imageFile: 'image19.png', description: 'View 4' },
  { key: 'vista_5', label: 'View 5', imageFile: 'image20.png', description: 'View 5' }
] as const

export type ReportSlotKey = (typeof REPORT_SLOT_DEFINITIONS)[number]['key']

export type ReportSlotSelection = {
  key: ReportSlotKey
  label: string
  fileName: string
  mimeType: string
  dataUrl: string
  source: 'file' | 'auto'
}

export type ReportGenerationInput = {
  templateFile: File
  selections: Partial<Record<ReportSlotKey, ReportSlotSelection>>
}

function escapeHtml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
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

      reject(new Error('Unable to generate the map'))
    }

    reader.onerror = () => reject(reader.error ?? new Error('Unable to generate the map'))
    reader.readAsDataURL(blob)
  })
}

function buildFallbackMapDataUrl(latitude: number, longitude: number) {
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="1200" height="700" viewBox="0 0 1200 700">
      <defs>
        <linearGradient id="bg" x1="0" x2="1" y1="0" y2="1">
          <stop offset="0%" stop-color="#132238" />
          <stop offset="100%" stop-color="#1f3b57" />
        </linearGradient>
      </defs>
      <rect width="1200" height="700" fill="url(#bg)" />
      <g opacity="0.12" stroke="#ffffff" stroke-width="1">
        ${Array.from({ length: 12 }, (_, index) => `<path d="M 0 ${index * 58} H 1200" />`).join('')}
        ${Array.from({ length: 16 }, (_, index) => `<path d="M ${index * 80} 0 V 700" />`).join('')}
      </g>
      <circle cx="600" cy="350" r="70" fill="#ffcc66" fill-opacity="0.16" />
      <circle cx="600" cy="350" r="22" fill="#ffcc66" />
      <text x="600" y="170" font-family="Arial, sans-serif" font-size="38" text-anchor="middle" fill="#ffffff">Automatic map</text>
      <text x="600" y="230" font-family="Arial, sans-serif" font-size="24" text-anchor="middle" fill="#c8d5e6">Geolocation detected</text>
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
    if (!response.ok) {
      throw new Error('Static map request failed')
    }

    const blob = await response.blob()
    return await blobToDataUrl(blob)
  } catch {
    return buildFallbackMapDataUrl(latitude, longitude)
  }
}

async function buildAutoMapSelection(): Promise<ReportSlotSelection> {
  const position = await Geolocation.getCurrentPosition({ enableHighAccuracy: true, timeout: 12000 })
  const dataUrl = await fetchMapDataUrl(position.coords.latitude, position.coords.longitude)

  return {
    key: 'inquadramento',
    label: 'Context map',
    fileName: 'geolocation-map.png',
    mimeType: 'image/png',
    dataUrl,
    source: 'auto'
  }
}

function buildPreviewHtml(fileName: string, selections: Partial<Record<ReportSlotKey, ReportSlotSelection>>, autoMap: ReportSlotSelection) {
  const cards = REPORT_SLOT_DEFINITIONS.map((slot) => {
    const selection = slot.key === 'inquadramento' ? (selections[slot.key] ?? autoMap) : selections[slot.key]
    const imageSrc = selection?.dataUrl ?? ''
    const status = selection ? (selection.source === 'auto' ? 'Auto' : 'Editada') : 'Pendiente'

    return `
      <article class="card ${selection ? 'filled' : 'empty'}">
        <div class="card-head">
          <div>
            <h3>${escapeHtml(slot.label)}</h3>
            <p>${escapeHtml(slot.description)}</p>
          </div>
          <span class="pill">${status}</span>
        </div>
        <div class="thumb">
          ${imageSrc ? `<img src="${imageSrc}" alt="${escapeHtml(slot.label)}" />` : '<span>No image</span>'}
        </div>
        <small>${selection ? escapeHtml(selection.fileName) : 'Not assigned'}</small>
      </article>
    `
  }).join('')

  return `
    <!doctype html>
    <html lang="en">
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>${escapeHtml(fileName)}</title>
        <style>
          :root { color-scheme: light; }
          * { box-sizing: border-box; }
          body {
            margin: 0;
            font-family: Inter, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
            background: linear-gradient(180deg, #f4f7fb 0%, #eef3f9 100%);
            color: #1d2b36;
          }
          header {
            padding: 24px 28px 10px;
            border-bottom: 1px solid rgba(29,43,54,.08);
            background: rgba(255,255,255,.75);
            backdrop-filter: blur(10px);
            position: sticky;
            top: 0;
          }
          h1 { margin: 0; font-size: 24px; }
          .sub { margin: 6px 0 0; color: #5d6b78; }
          main { padding: 22px 28px 30px; }
          .grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
            gap: 16px;
          }
          .card {
            background: #fff;
            border-radius: 18px;
            padding: 14px;
            box-shadow: 0 12px 40px rgba(19, 34, 56, .08);
            border: 1px solid rgba(19, 34, 56, .08);
          }
          .card.empty { opacity: .72; }
          .card-head {
            display: flex;
            justify-content: space-between;
            gap: 12px;
            align-items: flex-start;
            margin-bottom: 12px;
          }
          h3 { margin: 0; font-size: 15px; }
          p { margin: 4px 0 0; font-size: 12px; color: #65717d; }
          .pill {
            font-size: 11px;
            text-transform: uppercase;
            letter-spacing: .04em;
            padding: 5px 10px;
            border-radius: 999px;
            background: #eef4ff;
            color: #3657a6;
            white-space: nowrap;
          }
          .thumb {
            width: 100%;
            aspect-ratio: 4 / 3;
            border-radius: 14px;
            overflow: hidden;
            background: linear-gradient(135deg, #dfe7f1 0%, #edf2f8 100%);
            display: grid;
            place-items: center;
            margin-bottom: 10px;
          }
          .thumb img {
            width: 100%;
            height: 100%;
            object-fit: cover;
            display: block;
          }
          small { color: #6c7986; }
        </style>
      </head>
      <body>
        <header>
          <h1>${escapeHtml(fileName)}</h1>
          <p class="sub">Preview of editable slots before exporting to Excel.</p>
        </header>
        <main>
          <section class="grid">${cards}</section>
        </main>
      </body>
    </html>
  `
}

async function replaceImagesInTemplate(templateFile: File, selections: Partial<Record<ReportSlotKey, ReportSlotSelection>>) {
  const { default: JSZip } = await import('jszip')
  const templateBuffer = await templateFile.arrayBuffer()
  const zip = await JSZip.loadAsync(templateBuffer)

  const autoMapSelection = selections.inquadramento ?? await buildAutoMapSelection()
  const finalSelections: Partial<Record<ReportSlotKey, ReportSlotSelection>> = {
    ...selections,
    inquadramento: autoMapSelection
  }

  for (const slot of REPORT_SLOT_DEFINITIONS) {
    const selection = finalSelections[slot.key]
    if (!selection) {
      continue
    }

    const mediaPath = `xl/media/${slot.imageFile}`
    if (zip.file(mediaPath)) {
      zip.file(mediaPath, stripDataUrlPrefix(selection.dataUrl), { base64: true })
    }
  }

  const blob = await zip.generateAsync({ type: 'blob' })
  const fileName = `report-${new Date().toISOString().slice(0, 10)}.xlsx`
  const previewHtml = buildPreviewHtml(fileName, finalSelections, autoMapSelection)

  return {
    blob,
    fileName,
    previewHtml,
    autoMapSelection,
    finalSelections
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
  async function prepareReport(templateFile: File, selections: Partial<Record<ReportSlotKey, ReportSlotSelection>>) {
    return await replaceImagesInTemplate(templateFile, selections)
  }

  async function saveOrShareReport(blob: Blob, fileName: string) {
    if (Capacitor.getPlatform() === 'web') {
      triggerBrowserDownload(blob, fileName)
      return
    }

    const base64 = await fileToDataUrl(new File([blob], fileName, { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }))
    const saved = await Filesystem.writeFile({
      path: `reports/${fileName}`,
      data: stripDataUrlPrefix(base64),
      directory: Directory.Documents
    })

    await Share.share({
      title: fileName,
      text: 'Report generated',
      files: [saved.uri],
      dialogTitle: 'Share report'
    })
  }

  return {
    prepareReport,
    saveOrShareReport,
    REPORT_SLOT_DEFINITIONS
  }
}