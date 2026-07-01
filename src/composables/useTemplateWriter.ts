// Escribe valores de texto/fecha directamente en celdas concretas de un .xlsx,
// manipulando el XML interno (igual que useTemplateScanner.ts hace con las
// imágenes). Así se conserva el 100% del formato, estilos y merges originales:
// solo se toca el contenido de las celdas indicadas.

import type JSZip from 'jszip'

const REL_NS = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships'
const MAIN_NS = 'http://schemas.openxmlformats.org/spreadsheetml/2006/main'

function localName(el: Element) {
  return el.tagName.includes(':') ? el.tagName.split(':').pop()! : el.tagName
}

function findDirectChildren(parent: Element, name: string): Element[] {
  return Array.from(parent.children).filter((el) => localName(el) === name)
}

function getRelId(el: Element | null): string | null {
  if (!el) return null
  return el.getAttribute('r:id') ?? el.getAttributeNS(REL_NS, 'id')
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

// "B20" -> { col: 2, row: 20 }
function parseCellRef(cellRef: string) {
  const match = /^([A-Z]+)(\d+)$/.exec(cellRef.trim().toUpperCase())
  if (!match) throw new Error(`Invalid cell reference: ${cellRef}`)
  const [, colLetters, rowStr] = match
  let col = 0
  for (const char of colLetters) {
    col = col * 26 + (char.charCodeAt(0) - 64)
  }
  return { col, row: Number(rowStr), colLetters }
}

async function readXml(zip: JSZip, path: string): Promise<Document | null> {
  const entry = zip.file(path)
  if (!entry) return null
  const text = await entry.async('text')
  return new DOMParser().parseFromString(text, 'application/xml')
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

async function resolveSheetPath(zip: JSZip, sheetName: string): Promise<string | null> {
  const workbookDoc = await readXml(zip, 'xl/workbook.xml')
  if (!workbookDoc) return null
  const workbookRels = parseRels(await readXml(zip, 'xl/_rels/workbook.xml.rels'))

  const sheetEl = Array.from(workbookDoc.getElementsByTagName('*')).find(
    (el) => localName(el) === 'sheet' && el.getAttribute('name') === sheetName
  )
  if (!sheetEl) return null

  const rId = getRelId(sheetEl)
  const target = rId ? workbookRels.get(rId) : null
  if (!target) return null

  return resolvePath('xl/workbook.xml', target)
}

// Encuentra (o crea) el <c r="B20"> dentro del <row r="20">, manteniendo el
// orden ascendente de filas/columnas que exige el formato SpreadsheetML.
function getOrCreateCell(sheetDoc: Document, sheetData: Element, cellRef: string): Element {
  const { col, row } = parseCellRef(cellRef)
  const rows = findDirectChildren(sheetData, 'row')

  let rowEl = rows.find((r) => Number(r.getAttribute('r')) === row) ?? null
  if (!rowEl) {
    rowEl = sheetDoc.createElementNS(MAIN_NS, 'row')
    rowEl.setAttribute('r', String(row))
    const nextRow = rows.find((r) => Number(r.getAttribute('r')) > row) ?? null
    sheetData.insertBefore(rowEl, nextRow)
  }

  const cells = findDirectChildren(rowEl, 'c')
  let cellEl = cells.find((c) => {
    const ref = c.getAttribute('r')
    return ref === cellRef.toUpperCase()
  }) ?? null

  if (!cellEl) {
    cellEl = sheetDoc.createElementNS(MAIN_NS, 'c')
    cellEl.setAttribute('r', cellRef.toUpperCase())
    const nextCell = cells.find((c) => {
      const ref = c.getAttribute('r')
      if (!ref) return false
      return parseCellRef(ref).col > col
    }) ?? null
    rowEl.insertBefore(cellEl, nextCell)
  }

  return cellEl
}

// Sustituye el contenido de una celda por una cadena de texto (inline string),
// preservando el atributo de estilo `s` si ya existía.
function setCellInlineString(sheetDoc: Document, cellEl: Element, value: string) {
  while (cellEl.firstChild) cellEl.removeChild(cellEl.firstChild)
  cellEl.setAttribute('t', 'inlineStr')

  const isEl = sheetDoc.createElementNS(MAIN_NS, 'is')
  const tEl = sheetDoc.createElementNS(MAIN_NS, 't')
  tEl.setAttribute('xml:space', 'preserve')
  tEl.textContent = value
  isEl.appendChild(tEl)
  cellEl.appendChild(isEl)
}

export type SheetValues = Record<string, string> // cellRef -> value

export function useTemplateWriter() {
  // valuesBySheet: { "testalino": { "E37": "TOS071", ... }, "sommario": {...} }
  async function applyFieldValues(zip: JSZip, valuesBySheet: Record<string, SheetValues>) {
    const serializer = new XMLSerializer()

    for (const [sheetName, values] of Object.entries(valuesBySheet)) {
      const nonEmptyValues = Object.entries(values).filter(([, v]) => v !== undefined && v !== null)
      if (nonEmptyValues.length === 0) continue

      const sheetPath = await resolveSheetPath(zip, sheetName)
      if (!sheetPath) {
        console.warn(`[useTemplateWriter] Sheet not found: ${sheetName}`)
        continue
      }

      const sheetDoc = await readXml(zip, sheetPath)
      if (!sheetDoc) continue

      const sheetData = findDirectChildren(sheetDoc.documentElement, 'sheetData')[0]
      if (!sheetData) continue

      for (const [cellRef, value] of nonEmptyValues) {
        const cellEl = getOrCreateCell(sheetDoc, sheetData, cellRef)
        setCellInlineString(sheetDoc, cellEl, value)
      }

      const serialized = serializer.serializeToString(sheetDoc)
      zip.file(sheetPath, serialized)
    }
  }

  return { applyFieldValues }
}
