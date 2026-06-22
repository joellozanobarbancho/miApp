import { defineStore } from 'pinia'
import { Filesystem, Directory } from '@capacitor/filesystem'

export const useGalleryStore = defineStore('gallery', {
  state: () => ({
    photos: [] as Array<{
      id: string
      path: string
      date: string
      location?: { lat: number; lng: number }
    }>
  }),

  actions: {
    async addPhoto(base64Data: string) {
      const fileName = `${Date.now()}.jpeg`

      const saved = await Filesystem.writeFile({
        path: fileName,
        data: base64Data,
        directory: Directory.Data
      })

      this.photos.push({
        id: crypto.randomUUID(),
        path: saved.uri,
        date: new Date().toISOString()
      })
    },

    async loadPhotos() {
    
    } ,

    deletePhoto(id) {
      this.photos = this.photos.filter(p => p.id !== id)
    }

  }
})
