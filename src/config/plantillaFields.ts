
export type FieldType = 'text' | 'textarea' | 'date' | 'checkbox'

export type TemplateField = {
  id: string
  label: string
  cellRef: string
  type: FieldType
  placeholder?: string
  verified: boolean
}

export type HeaderBlock = {
  codiceSito: string
  nomeSito: string
  indirizzo: string
  comune: string
  dataSopralluogo: string
}

export type TemplateStep = {
  sheetName: string
  title: string
  description?: string
  headerBlock?: HeaderBlock // si la hoja recibe el bloque de identificación propagado
  fields: TemplateField[]
}

function checkboxField(id: string, label: string, cellRef: string, verified = true): TemplateField {
  return { id, label, cellRef, type: 'checkbox', verified }
}

export const PLANTILLA4_STEPS: TemplateStep[] = [
  {
    sheetName: 'testalino',
    title: 'Identificazione e indirizzo',
    description: 'Datos del sitio. Aquí puedes usar tu ubicación actual para rellenar la dirección.',
    fields: [
      { id: 'codiceSito', label: 'Codice sito', cellRef: 'E37', type: 'text', verified: true },
      { id: 'nomeSito', label: 'Nome sito', cellRef: 'I37', type: 'text', verified: true },
      { id: 'indirizzo', label: 'Indirizzo', cellRef: 'E38', type: 'text', verified: true },
      { id: 'comune', label: 'Comune', cellRef: 'I38', type: 'text', verified: true },
      { id: 'dataSopralluogo', label: 'Data sopralluogo', cellRef: 'E39', type: 'date', verified: true },
      { id: 'tipologiaDocumento', label: 'Tipologia documento', cellRef: 'G39', type: 'text', placeholder: 'Tipologia Documento: Allegato fotografico Sopralluogo', verified: true }
    ]
  },
  {
    sheetName: 'sommario',
    title: 'Sommario',
    headerBlock: { codiceSito: 'D32', nomeSito: 'I32', indirizzo: 'D33', comune: 'I33', dataSopralluogo: 'D34' },
    fields: []
  },
  {
    sheetName: 'scheda struttura',
    title: 'Scheda tecnica struttura (1/2)',
    fields: []
  },
  {
    sheetName: 'scheda struttura (2)',
    title: 'Scheda tecnica struttura (2/2)',
    fields: []
  },
  {
    sheetName: 'organi radianti',
    title: "Organi radianti e guide d'onda (1/3)",
    fields: []
  },
  {
    sheetName: 'organi radianti (2)',
    title: "Organi radianti e guide d'onda (2/3)",
    fields: []
  },
  {
    sheetName: 'organi radianti (3)',
    title: "Organi radianti e guide d'onda (3/3)",
    fields: []
  },
  {
    sheetName: 'BULLONERIA',
    title: 'Bulloneria',
    fields: []
  },
  {
    sheetName: 'VERNICIATURA',
    title: 'Verniciatura e antiossido',
    fields: []
  },
  {
    sheetName: 'TERRA',
    title: 'Impianto di terra e parafulmine',
    fields: []
  },
  {
    sheetName: 'SOV',
    title: 'SOV e impianto elettrico',
    fields: []
  },
  {
    sheetName: 'fondazioni',
    title: 'Fondazioni',
    fields: []
  },
  {
    sheetName: 'riferimenti normativi',
    title: 'Rispondenza normativa',
    fields: []
  },
  {
    sheetName: 'inquadramento',
    title: 'Foto: inquadramento generale',
    headerBlock: { codiceSito: 'D32', nomeSito: 'I32', indirizzo: 'D33', comune: 'I33', dataSopralluogo: 'D34' },
    fields: []
  },
  {
    sheetName: 'vista 1',
    title: 'Foto: vista 1',
    headerBlock: { codiceSito: 'D32', nomeSito: 'I32', indirizzo: 'D33', comune: 'I33', dataSopralluogo: 'D34' },
    fields: []
  },
  {
    sheetName: 'vista 2',
    title: 'Foto: vista 2',
    headerBlock: { codiceSito: 'D32', nomeSito: 'I32', indirizzo: 'D33', comune: 'I33', dataSopralluogo: 'D34' },
    fields: []
  },
  {
    sheetName: 'vista 3',
    title: 'Foto: vista 3',
    headerBlock: { codiceSito: 'D32', nomeSito: 'I32', indirizzo: 'D33', comune: 'I33', dataSopralluogo: 'D34' },
    fields: []
  },
  {
    sheetName: 'vista 4',
    title: 'Foto: vista 4',
    headerBlock: { codiceSito: 'D32', nomeSito: 'I32', indirizzo: 'D33', comune: 'I33', dataSopralluogo: 'D34' },
    fields: []
  },
  {
    sheetName: 'vista 5',
    title: 'Foto: vista 5',
    headerBlock: { codiceSito: 'D32', nomeSito: 'I32', indirizzo: 'D33', comune: 'I33', dataSopralluogo: 'D34' },
    fields: []
  }
]

export function getStep(sheetName: string): TemplateStep | undefined {
  return PLANTILLA4_STEPS.find((step) => step.sheetName === sheetName)
}

export const PLANTILLA3_STEPS = PLANTILLA4_STEPS
