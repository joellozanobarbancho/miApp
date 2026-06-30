// Reads an .xlsx file and finds every embedded picture

export type TemplateSlot = {
  id: string                 
  sheetName: string
  mediaPath: string        
  originalFileName: string   
  col: number                
  row: number                 
  widthEmu: number | null     
  heightEmu: number | null
  thumbnailDataUrl: string    
}

const REL_NS = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships'

function localName(el: Element) {
  return el.tagName.includes(':') ? el.tagName.split(':').pop()! : el.tagName
}

function findDescendants(parent: Element, name: string): Element[] {
  return Array.from(parent.getElementsByTagName('*')).filter((el) => localName(el) === name)
}

function findDirectChild(parent: Element, name: string): Element | null {
  return Array.from(parent.children).find((el) => localName(el) === name) ?? null
}

function getRelId(el: Element | null, attr: 'id' | 'embed'): string | null {
  if (!el) return null
  return el.getAttribute(`r:${attr}`) ?? el.getAttributeNS(REL_NS, attr)
}

function resolvePath(basePath: string, target: string): string {
  if (target.startsWith('/')) return target.slice(1)
  const baseDir = basePath.split('/').slice(0, -1)
  for (const part of target.split('/')) {
    if (part === '..') baseDir.pop()
    else if (part !== '.') baseDir.push(part)
  }
  return baseDir.join('/')
}

async function blobToDataUrl(blob: Blob): Promise<string> {
  return await new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = () => reject(reader.error ?? new Error('Unable to read image'))
    reader.readAsDataURL(blob)
  })
}

export function useTemplateScanner() {
  async function scanTemplate(file: File): Promise<TemplateSlot[]> {
    const { default: JSZip } = await import('jszip')
    const zip = await JSZip.loadAsync(await file.arrayBuffer())
    const parser = new DOMParser()

    async function readXml(path: string): Promise<Document | null> {
      const entry = zip.file(path)
      if (!entry) return null
      const text = await entry.async('text')
      return parser.parseFromString(text, 'application/xml')
    }

    function parseRels(doc: Document | null): Map<string, string> {
      const map = new Map<string, string>()
      if (!doc) return map
      for (const rel of Array.from(doc.getElementsByTagName('Relationship'))) {
        const id = rel.getAttribute('Id')
        const target = rel.getAttribute('Target')
        if (id && target) map.set(id, target)
      }
      return map
    }

    const workbookDoc = await readXml('xl/workbook.xml')
    if (!workbookDoc) {
      throw new Error('This does not look like a valid .xlsx file')
    }

    const workbookRels = parseRels(await readXml('xl/_rels/workbook.xml.rels'))

    const sheets = findDescendants(workbookDoc.documentElement, 'sheet').map((el) => ({
      name: el.getAttribute('name') ?? 'Sheet',
      rId: getRelId(el, 'id')
    }))

    const slots: TemplateSlot[] = []

    for (const sheet of sheets) {
      const sheetTarget = sheet.rId ? workbookRels.get(sheet.rId) : null
      if (!sheetTarget) continue
      const sheetPath = resolvePath('xl/workbook.xml', sheetTarget)

      const sheetDoc = await readXml(sheetPath)
      if (!sheetDoc) continue

      const drawingEl = findDescendants(sheetDoc.documentElement, 'drawing')[0]
      const drawingRId = getRelId(drawingEl ?? null, 'id')
      if (!drawingRId) continue

      const sheetFileName = sheetPath.split('/').pop()
      const sheetRelsPath = resolvePath(sheetPath, `_rels/${sheetFileName}.rels`)
      const sheetRels = parseRels(await readXml(sheetRelsPath))
      const drawingTarget = sheetRels.get(drawingRId)
      if (!drawingTarget) continue
      const drawingPath = resolvePath(sheetPath, drawingTarget)

      const drawingDoc = await readXml(drawingPath)
      if (!drawingDoc) continue

      const drawingFileName = drawingPath.split('/').pop()
      const drawingRelsPath = resolvePath(drawingPath, `_rels/${drawingFileName}.rels`)
      const drawingRels = parseRels(await readXml(drawingRelsPath))

      const anchors = [
        ...findDescendants(drawingDoc.documentElement, 'twoCellAnchor'),
        ...findDescendants(drawingDoc.documentElement, 'oneCellAnchor')
      ]

      let index = 0
      for (const anchor of anchors) {
        const pic = findDescendants(anchor, 'pic')[0]
        if (!pic) continue

        const blip = findDescendants(pic, 'blip')[0]
        const embedRId = getRelId(blip ?? null, 'embed')
        if (!embedRId) continue

        const mediaTarget = drawingRels.get(embedRId)
        if (!mediaTarget) continue
        const mediaPath = resolvePath(drawingPath, mediaTarget)
        const mediaFile = zip.file(mediaPath)
        if (!mediaFile) continue

        const fromEl = findDirectChild(anchor, 'from')
        const col = fromEl ? Number(findDirectChild(fromEl, 'col')?.textContent ?? 0) : 0
        const row = fromEl ? Number(findDirectChild(fromEl, 'row')?.textContent ?? 0) : 0

        const ext = findDescendants(anchor, 'ext')[0]
        const widthEmu = ext?.getAttribute('cx') ? Number(ext.getAttribute('cx')) : null
        const heightEmu = ext?.getAttribute('cy') ? Number(ext.getAttribute('cy')) : null

        const blob = await mediaFile.async('blob')
        const thumbnailDataUrl = await blobToDataUrl(blob)

        slots.push({
          id: `${sheet.name}__${mediaPath}__${index}`,
          sheetName: sheet.name,
          mediaPath,
          originalFileName: mediaPath.split('/').pop() ?? mediaPath,
          col,
          row,
          widthEmu,
          heightEmu,
          thumbnailDataUrl
        })

        index += 1
      }
    }

    if (slots.length === 0) {
      throw new Error('No embedded images were found in this template')
    }

    return slots
  }

  return { scanTemplate }
}