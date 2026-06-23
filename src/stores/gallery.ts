import { defineStore } from 'pinia'
import { Capacitor } from '@capacitor/core'
import { Directory, Filesystem } from '@capacitor/filesystem'
import { Preferences } from '@capacitor/preferences'

type GalleryPhoto = {
  id: string
  path: string
  date: string
  storagePath?: string
}

function createId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
}

async function toWebPath(photo: GalleryPhoto) {
  if (!photo.storagePath) {
    return photo
  }

  try {
    const { uri } = await Filesystem.getUri({
      directory: Directory.Data,
      path: photo.storagePath
    })

    return {
      ...photo,
      path: Capacitor.convertFileSrc(uri)
    }
  } catch {
    return null
  }
}

export const useGalleryStore = defineStore('gallery', {
  state: () => ({
    photos: [] as GalleryPhoto[]
  }),

  actions: {
    async loadPhotos() {
      try {
        console.log('[Store] Loading photos from Preferences')
        const { value } = await Preferences.get({ key: 'photos' })

        const storedPhotos = value ? (JSON.parse(value) as GalleryPhoto[]) : []
        console.log('[Store] Loaded stored photos:', storedPhotos.length)
        
        const resolvedPhotos = await Promise.all(storedPhotos.map(photo => toWebPath(photo)))

        this.photos = resolvedPhotos.filter((photo): photo is GalleryPhoto => photo !== null)
        console.log('[Store] Resolved photos after filtering:', this.photos.length)
      } catch (err) {
        console.error('[Store] Error loading photos:', err)
        this.photos = []
      }
    },

    async savePhotos() {
      try {
        console.log('[Store] Saving photos to Preferences, count:', this.photos.length)
        await Preferences.set({
          key: 'photos',
          value: JSON.stringify(this.photos)
        })
        console.log('[Store] Photos saved successfully')
      } catch (err) {
        console.error('[Store] Error saving photos:', err)
      }
    },

    async addPhoto(base64Data: string) {
      try {
        console.log('[Store] addPhoto called, data length:', base64Data.length)
        const storagePath = `photo-${createId()}.jpeg`
        console.log('[Store] Writing file to:', storagePath)
        
        const savedFile = await Filesystem.writeFile({
          path: storagePath,
          data: base64Data,
          directory: Directory.Data
        })

        console.log('[Store] File written successfully, URI:', savedFile.uri)

        const newPhoto = {
          id: createId(),
          path: Capacitor.convertFileSrc(savedFile.uri),
          date: new Date().toISOString(),
          storagePath
        }

        console.log('[Store] Adding photo to array:', newPhoto.id)
        this.photos.unshift(newPhoto)
        await this.savePhotos()
        console.log('[Store] Photo added successfully, total photos:', this.photos.length)
      } catch (err) {
        console.error('[Store] Error adding photo:', err)
        if (err instanceof Error) {
          console.error('[Store] Error message:', err.message)
          console.error('[Store] Error stack:', err.stack)
        }
      }
    },

    async deletePhoto(id: string) {
      try {
        console.log('[Store] deletePhoto called for id:', id)
        const photoToDelete = this.photos.find(photo => photo.id === id)

        if (photoToDelete?.storagePath) {
          console.log('[Store] Deleting file:', photoToDelete.storagePath)
          await Filesystem.deleteFile({
            path: photoToDelete.storagePath,
            directory: Directory.Data
          })
          console.log('[Store] File deleted successfully')
        }

        this.photos = this.photos.filter(photo => photo.id !== id)
        await this.savePhotos()
        console.log('[Store] Photo deleted, total photos:', this.photos.length)
      } catch (err) {
        console.error('[Store] Error deleting photo:', err)
      }
    }
  }
})
