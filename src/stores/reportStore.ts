import { defineStore } from 'pinia'
import { Preferences } from '@capacitor/preferences'
import { useTemplateScanner, type TemplateSlot } from '@/composables/useTemplateScanner'
import { useMap } from '@/composables/useMap'

const DEFAULT_TEMPLATE_PATH = '/PLANTILLA%204.xlsx'
const DEFAULT_TEMPLATE_NAME = 'PLANTILLA 4.xlsx'

export type ReportTemplate = {
  id: string
  choice: TemplateChoice
  name: string
  file: File
  uploadedAt: string
}

type TemplateDefinition = {
  choice: TemplateChoice
  label: string
  fileName: string
  url: string
}

const TEMPLATE_LIBRARY: Record<TemplateChoice, TemplateDefinition> = {
  traliccio: {
    choice: 'traliccio',
    label: 'Traliccio',
    fileName: 'traliccio.xlsx',
    url: new URL('../plantillas/traliccio.xlsx', import.meta.url).href
  },
  palo: {
    choice: 'palo',
    label: 'Palo',
    fileName: 'palo.xlsx',
    url: new URL('../plantillas/palo.xlsx', import.meta.url).href
  },
  rooftop: {
    choice: 'rooftop',
    label: 'Rooftop',
    fileName: 'rooftop.xlsx',
    url: new URL('../plantillas/rooftop.xlsx', import.meta.url).href
  }
}

const DEFAULT_TEMPLATE: TemplateChoice = 'traliccio'

function isTemplateChoice(value: string | null): value is TemplateChoice {
  return value === 'traliccio' || value === 'palo' || value === 'rooftop'
}

async function loadPresetTemplate(definition: TemplateDefinition) {
  const response = await fetch(definition.url)
  if (!response.ok) {
    throw new Error(`Unable to load the ${definition.label.toLowerCase()} template`)
  }

  const blob = await response.blob()
  return new File([blob], definition.fileName, {
    type: blob.type || 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  })
}

export type SavedReport = {
  id: string
  name: string
  createdAt: string
  storagePath: string
  mimeType: string
}

function createId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
}

async function blobToBase64(blob: Blob) {
  return await new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const result = reader.result
      if (typeof result === 'string') {
        resolve(result.split(',')[1] || result)
        return
      }
      reject(new Error('Failed to read stored template'))
    }
    reader.onerror = () => reject(reader.error ?? new Error('Failed to read stored template'))
    reader.readAsDataURL(blob)
  })
}

async function readFileAsBase64(file: File) {
  return await new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const result = reader.result
      if (typeof result === 'string') {
        resolve(result.split(',')[1] || result)
        return
      }
      reject(new Error('Failed to read template file'))
    }
    reader.onerror = () => reject(reader.error ?? new Error('Failed to read template file'))
    reader.readAsDataURL(file)
  })
}

async function loadFileFromUrl(url: string, fileName: string): Promise<File> {
  const response = await fetch(url)
  if (!response.ok) {
    throw new Error(`Unable to load default template from ${url}`)
  }

  const blob = await response.blob()
  return new File([blob], fileName, {
    type: blob.type || 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  })
}

export const useReportStore = defineStore('report', {
  state: () => ({
    template: null as ReportTemplate | null,
    slots: [] as TemplateSlot[],
    isScanning: false,
    isGenerating: false,

    location: {
      lat: null as number | null,
      lng: null as number | null
    },

    mapImage: null as string | null,

    reports: [] as SavedReport[]
  }),

  getters: {
    hasTemplate(): boolean {
      return this.template !== null
    },
    templateName(): string | null {
      return this.template?.name ?? null
    }
  },

  actions: {
    async loadFromStorage() {
      await this.loadDefaultTemplate().catch((err) => {
        console.warn('[ReportStore] Default template not available:', err)
      })
    },

    async loadDefaultTemplate() {
      const file = await loadFileFromUrl(DEFAULT_TEMPLATE_PATH, DEFAULT_TEMPLATE_NAME)

      this.template = {
        id: 'default-template',
        name: file.name,
        file,
        uploadedAt: new Date().toISOString()
      }

      await this.scanCurrentTemplate()
    },

    async scanCurrentTemplate() {
      if (!this.template?.file) return
      this.isScanning = true
      try {
        const { scanTemplate } = useTemplateScanner()
        this.slots = await scanTemplate(this.template.file)
        console.log('[ReportStore] Detected', this.slots.length, 'image slots in template')
      } catch (err) {
        console.error('[ReportStore] Error scanning template:', err)
        this.slots = []
        throw err
      } finally {
        this.isScanning = false
      }
    },

    async setTemplateChoice(choice: TemplateChoice, persistChoice = true) {
      try {
        console.log('[ReportStore] Setting template choice:', choice)
        const definition = TEMPLATE_LIBRARY[choice]
        const id = createId()
        const file = await loadPresetTemplate(definition)

        this.template = {
          id,
          choice,
          name: definition.label,
          file,
          uploadedAt: new Date().toISOString()
        }

        if (persistChoice) {
          await Preferences.set({
            key: 'reportTemplateChoice',
            value: choice
          })
        }

        await this.scanCurrentTemplate()

        console.log('[ReportStore] Template loaded successfully')
      } catch (err) {
        console.error('[ReportStore] Error setting template choice:', err)
        throw err
      }
    },

    async clearTemplate() {
      try {
        this.template = null
        this.slots = []
        await Preferences.remove({ key: 'reportTemplateChoice' })
      } catch (err) {
        console.error('[ReportStore] Error clearing template:', err)
        throw err
      }
    },

    setGenerating(isGenerating: boolean) {
      this.isGenerating = isGenerating
    },

    // ⬅️ NUEVO
    setLocation(lat: number, lng: number) {
      this.location.lat = lat
      this.location.lng = lng
    },

    async loadMap() {
      if (!this.location.lat || !this.location.lng) return

      const { getStaticMap } = useMap()
      this.mapImage = await getStaticMap(this.location.lat, this.location.lng)
    },

    // --- Informes generados (persistidos en el dispositivo) ---

    async loadReports() {
      try {
        const { value } = await Preferences.get({ key: 'generatedReports' })
        this.reports = value ? (JSON.parse(value) as SavedReport[]) : []
      } catch (err) {
        console.error('[ReportStore] Error loading generated reports:', err)
        this.reports = []
      }
    },

    async persistReportsList() {
      await Preferences.set({
        key: 'generatedReports',
        value: JSON.stringify(this.reports)
      })
    },

    async addGeneratedReport(blob: Blob, fileName: string): Promise<SavedReport> {
      const id = createId()
      const storagePath = `generated-report-${id}-${fileName}`
      const base64Data = await blobToBase64(blob)

      await Filesystem.writeFile({
        path: storagePath,
        data: base64Data,
        directory: Directory.Data
      })

      const saved: SavedReport = {
        id,
        name: fileName,
        createdAt: new Date().toISOString(),
        storagePath,
        mimeType: blob.type || 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      }

      this.reports.unshift(saved)
      await this.persistReportsList()
      return saved
    },

    async getReportBlob(id: string): Promise<Blob> {
      const report = this.reports.find((r) => r.id === id)
      if (!report) throw new Error('Report not found')

      const fileResult = await Filesystem.readFile({
        path: report.storagePath,
        directory: Directory.Data
      })

      if (typeof fileResult.data === 'string') {
        const binaryString = atob(fileResult.data)
        const bytes = new Uint8Array(binaryString.length)
        for (let i = 0; i < binaryString.length; i += 1) bytes[i] = binaryString.charCodeAt(i)
        return new Blob([bytes], { type: report.mimeType })
      }

      return fileResult.data
    },

    async deleteReport(id: string) {
      const report = this.reports.find((r) => r.id === id)
      if (!report) return

      try {
        await Filesystem.deleteFile({ path: report.storagePath, directory: Directory.Data })
      } catch (err) {
        console.error('[ReportStore] Error deleting report file:', err)
      }

      this.reports = this.reports.filter((r) => r.id !== id)
      await this.persistReportsList()
    }
  }
})
