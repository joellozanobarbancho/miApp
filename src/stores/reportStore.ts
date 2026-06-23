import { defineStore } from 'pinia'
import { Directory, Filesystem } from '@capacitor/filesystem'
import { Preferences } from '@capacitor/preferences'

export type ReportTemplate = {
  id: string
  name: string
  file: File
  uploadedAt: string
  storagePath?: string
}

function createId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
}

function base64ToFile(base64: string, fileName: string, mimeType: string) {
  const binaryString = atob(base64)
  const bytes = new Uint8Array(binaryString.length)

  for (let index = 0; index < binaryString.length; index += 1) {
    bytes[index] = binaryString.charCodeAt(index)
  }

  return new File([bytes], fileName, { type: mimeType })
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

export const useReportStore = defineStore('report', {
  state: () => ({
    template: null as ReportTemplate | null,
    isGenerating: false
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
      return this.loadTemplate()
    },

    async loadTemplate() {
      try {
        console.log('[ReportStore] Loading template from Preferences')
        const { value } = await Preferences.get({ key: 'reportTemplate' })

        if (value) {
          const templateData = JSON.parse(value)
          if (!templateData.storagePath) {
            console.log('[ReportStore] Template metadata found without file path:', templateData.name)
            this.template = templateData
            return
          }

          const fileResult = await Filesystem.readFile({
            path: templateData.storagePath,
            directory: Directory.Data
          })

          const base64Data = typeof fileResult.data === 'string'
            ? fileResult.data
            : await blobToBase64(fileResult.data)

          const file = base64ToFile(
            base64Data,
            templateData.name,
            templateData.mimeType ?? 'application/octet-stream'
          )

          console.log('[ReportStore] Template restored from storage:', templateData.name)
          this.template = {
            id: templateData.id,
            name: templateData.name,
            file,
            uploadedAt: templateData.uploadedAt,
            storagePath: templateData.storagePath
          }
        }
      } catch (err) {
        console.error('[ReportStore] Error loading template:', err)
        this.template = null
      }
    },

    async setTemplate(file: File) {
      try {
        console.log('[ReportStore] Setting template:', file.name)
        const id = createId()
        const storagePath = `report-template-${id}-${file.name}`
        const base64Data = await readFileAsBase64(file)

        await Filesystem.writeFile({
          path: storagePath,
          data: base64Data,
          directory: Directory.Data
        })
        
        this.template = {
          id,
          name: file.name,
          file,
          uploadedAt: new Date().toISOString(),
          storagePath
        }

        // Save metadata only (File object cannot be serialized)
        await Preferences.set({
          key: 'reportTemplate',
          value: JSON.stringify({
            id: this.template.id,
            name: this.template.name,
            uploadedAt: this.template.uploadedAt,
            storagePath: this.template.storagePath,
            mimeType: file.type
          })
        })

        console.log('[ReportStore] Template saved successfully')
      } catch (err) {
        console.error('[ReportStore] Error setting template:', err)
        throw err
      }
    },

    async clearTemplate() {
      try {
        console.log('[ReportStore] Clearing template')

        if (this.template?.storagePath) {
          await Filesystem.deleteFile({
            path: this.template.storagePath,
            directory: Directory.Data
          })
        }

        this.template = null
        await Preferences.remove({ key: 'reportTemplate' })
        console.log('[ReportStore] Template cleared successfully')
      } catch (err) {
        console.error('[ReportStore] Error clearing template:', err)
        throw err
      }
    },

    setGenerating(isGenerating: boolean) {
      this.isGenerating = isGenerating
    }
  }
})
