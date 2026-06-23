import { defineStore } from 'pinia'
import { Preferences } from '@capacitor/preferences'

export type ReportTemplate = {
  id: string
  name: string
  file: File
  uploadedAt: string
}

function createId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
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
    async loadTemplate() {
      try {
        console.log('[ReportStore] Loading template from Preferences')
        const { value } = await Preferences.get({ key: 'reportTemplate' })

        if (value) {
          const templateData = JSON.parse(value)
          // Note: File object cannot be serialized, so we store only metadata
          // The actual file needs to be uploaded again
          console.log('[ReportStore] Template metadata found:', templateData.name)
          this.template = templateData
        }
      } catch (err) {
        console.error('[ReportStore] Error loading template:', err)
        this.template = null
      }
    },

    async setTemplate(file: File) {
      try {
        console.log('[ReportStore] Setting template:', file.name)
        
        this.template = {
          id: createId(),
          name: file.name,
          file,
          uploadedAt: new Date().toISOString()
        }

        // Save metadata only (File object cannot be serialized)
        await Preferences.set({
          key: 'reportTemplate',
          value: JSON.stringify({
            id: this.template.id,
            name: this.template.name,
            uploadedAt: this.template.uploadedAt
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
