import { defineStore } from 'pinia'
import { Capacitor } from '@capacitor/core'
import { Directory, Filesystem } from '@capacitor/filesystem'
import { Preferences } from '@capacitor/preferences'

export type GalleryPhoto = {
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

  getters: {
    photoCount(): number {
      return this.photos.length
    },
    
    canAddMorePhotos(): boolean {
      return this.photos.length < 18
    }
  },

  actions: {
    async loadPhotos() {
      try {
        console.log('[GalleryStore] Loading photos from Preferences')
        const { value } = await Preferences.get({ key: 'photos' })

        const storedPhotos = value ? (JSON.parse(value) as GalleryPhoto[]) : []
        console.log('[GalleryStore] Loaded stored photos:', storedPhotos.length)
        
        const resolvedPhotos = await Promise.all(storedPhotos.map(photo => toWebPath(photo)))

        this.photos = resolvedPhotos.filter((photo): photo is GalleryPhoto => photo !== null)
        console.log('[GalleryStore] Resolved photos after filtering:', this.photos.length)
      } catch (err) {
        console.error('[GalleryStore] Error loading photos:', err)
        this.photos = []
      }
    },

    async savePhotos() {
      try {
        console.log('[GalleryStore] Saving photos to Preferences, count:', this.photos.length)
        await Preferences.set({
          key: 'photos',
          value: JSON.stringify(this.photos)
        })
        console.log('[GalleryStore] Photos saved successfully')
      } catch (err) {
        console.error('[GalleryStore] Error saving photos:', err)
      }
    },

    async addPhoto(base64Data: string) {
      try {
        console.log('[GalleryStore] addPhoto called, data length:', base64Data.length)
        
        if (!this.canAddMorePhotos) {
          throw new Error('Maximum 18 photos allowed')
        }
        
        const storagePath = `photo-${createId()}.jpeg`
        console.log('[GalleryStore] Writing file to:', storagePath)
        
        const savedFile = await Filesystem.writeFile({
          path: storagePath,
          data: base64Data,
          directory: Directory.Data
        })

        console.log('[GalleryStore] File written successfully, URI:', savedFile.uri)

        const newPhoto: GalleryPhoto = {
          id: createId(),
          path: Capacitor.convertFileSrc(savedFile.uri),
          date: new Date().toISOString(),
          storagePath
        }

        console.log('[GalleryStore] Adding photo to array:', newPhoto.id)
        this.photos.unshift(newPhoto)
        await this.savePhotos()
        console.log('[GalleryStore] Photo added successfully, total photos:', this.photos.length)
      } catch (err) {
        console.error('[GalleryStore] Error adding photo:', err)
        if (err instanceof Error) {
          console.error('[GalleryStore] Error message:', err.message)
          console.error('[GalleryStore] Error stack:', err.stack)
        }
        throw err
      }
    },

    async deletePhoto(id: string) {
      try {
        console.log('[GalleryStore] deletePhoto called for id:', id)
        const photoToDelete = this.photos.find(photo => photo.id === id)

        if (photoToDelete?.storagePath) {
          console.log('[GalleryStore] Deleting file:', photoToDelete.storagePath)
          await Filesystem.deleteFile({
            path: photoToDelete.storagePath,
            directory: Directory.Data
          })
          console.log('[GalleryStore] File deleted successfully')
        }

        this.photos = this.photos.filter(photo => photo.id !== id)
        await this.savePhotos()
        console.log('[GalleryStore] Photo deleted, total photos:', this.photos.length)
      } catch (err) {
        console.error('[GalleryStore] Error deleting photo:', err)
        throw err
      }
    },

    async addMultiplePhotos(base64DataArray: string[]) {
      try {
        console.log('[GalleryStore] addMultiplePhotos called, count:', base64DataArray.length)
        const newPhotos: GalleryPhoto[] = []

        for (const base64Data of base64DataArray) {
          if (!this.canAddMorePhotos) {
            console.warn('[GalleryStore] Maximum photos reached, stopping import')
            break
          }
          
          const storagePath = `photo-${createId()}.jpeg`
          const savedFile = await Filesystem.writeFile({
            path: storagePath,
            data: base64Data,
            directory: Directory.Data
          })

          const newPhoto: GalleryPhoto = {
            id: createId(),
            path: Capacitor.convertFileSrc(savedFile.uri),
            date: new Date().toISOString(),
            storagePath
          }

          newPhotos.unshift(newPhoto)
        }

        this.photos = [...newPhotos, ...this.photos]
        await this.savePhotos()
        console.log('[GalleryStore] Multiple photos added successfully, total:', this.photos.length)
      } catch (err) {
        console.error('[GalleryStore] Error adding multiple photos:', err)
        throw err
      }
    }
  }
})
