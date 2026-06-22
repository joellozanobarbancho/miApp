import { defineStore } from 'pinia'
import { Preferences } from '@capacitor/preferences'
import { Filesystem, Directory } from '@capacitor/filesystem'

export const useGalleryStore = defineStore('gallery', {
  state: () => ({
    photos: [] as Array<{
      id: string
      path: string
      date: string
    }>
  }),

  actions: {
    async loadPhotos() {
      const { value } = await Preferences.get({ key: 'photos' })
      this.photos = value ? JSON.parse(value) : []
    },

    async savePhotos() {
      await Preferences.set({
        key: 'photos',
        value: JSON.stringify(this.photos)
      })
    },

    async addPhoto(base64Data: string) {
      const fileName = `${Date.now()}.jpeg`

      const saved = await Filesystem.writeFile({
        path: fileName,
        data: base64Data,
        directory: Directory.Data
      })

      const newPhoto = {
        id: crypto.randomUUID(),
        path: saved.uri,
        date: new Date().toISOString()
      }

      this.photos.unshift(newPhoto)
      await this.savePhotos()
    },

    async deletePhoto(id: string) {
      this.photos = this.photos.filter(p => p.id !== id)
      await this.savePhotos()
    }
  }
})
