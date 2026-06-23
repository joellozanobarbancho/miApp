import { Camera, CameraResultType, CameraSource } from '@capacitor/camera'

export interface CameraPhoto {
  webPath: string
  data?: string
}

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()

    reader.onloadend = () => {
      const result = reader.result

      if (typeof result !== 'string') {
        reject(new Error('Failed to read image'))
        return
      }

      resolve(result.split(',')[1] ?? result)
    }

    reader.onerror = () => reject(reader.error ?? new Error('Failed to read image'))
    reader.readAsDataURL(blob)
  })
}

export function useCamera() {
  /**
   * Take a photo with the camera and return it as base64
   */
  async function takePhoto(): Promise<string> {
    try {
      console.log('[useCamera] Starting camera')
      const image = await Camera.getPhoto({
        quality: 80,
        allowEditing: false,
        resultType: CameraResultType.Uri,
        source: CameraSource.Camera
      })

      console.log('[useCamera] Camera result:', {
        path: image.path,
        webPath: image.webPath,
        format: image.format
      })

      // Always use webPath first as it's guaranteed to work cross-platform
      if (image.webPath) {
        console.log('[useCamera] Using webPath:', image.webPath)
        const response = await fetch(image.webPath)
        const blob = await response.blob()
        const base64Data = await blobToBase64(blob)
        console.log('[useCamera] Photo converted to base64, length:', base64Data.length)
        return base64Data
      }

      throw new Error('Unable to capture photo')
    } catch (err) {
      console.error('[useCamera] Error taking photo:', err)
      throw err
    }
  }

  /**
   * Pick a photo from the gallery and return it as base64
   */
  async function pickPhoto(): Promise<string> {
    try {
      console.log('[useCamera] Starting photo picker')
      const image = await Camera.getPhoto({
        quality: 80,
        allowEditing: false,
        resultType: CameraResultType.Uri,
        source: CameraSource.Photos
      })

      console.log('[useCamera] Photo picker result')

      if (image.webPath) {
        console.log('[useCamera] Using webPath from gallery')
        const response = await fetch(image.webPath)
        const blob = await response.blob()
        const base64Data = await blobToBase64(blob)
        console.log('[useCamera] Gallery photo converted to base64')
        return base64Data
      }

      throw new Error('Unable to pick photo')
    } catch (err) {
      console.error('[useCamera] Error picking photo:', err)
      throw err
    }
  }

  /**
   * Pick multiple photos from the gallery and return them as base64
   */
  async function pickMultiplePhotos(): Promise<string[]> {
    try {
      console.log('[useCamera] Starting multiple photo picker')
      const images = await Camera.pickImages({
        quality: 80,
        limit: 18 // Maximum photos allowed
      })

      console.log('[useCamera] Picked', images.photos.length, 'photos')
      
      const base64Photos: string[] = []

      for (const image of images.photos) {
        try {
          if (image.webPath) {
            const response = await fetch(image.webPath)
            const blob = await response.blob()
            const base64Data = await blobToBase64(blob)
            base64Photos.push(base64Data)
          }
        } catch (err) {
          console.error('[useCamera] Error processing individual photo:', err)
          // Continue with next photo
        }
      }

      console.log('[useCamera] Successfully converted', base64Photos.length, 'photos')
      return base64Photos
    } catch (err) {
      console.error('[useCamera] Error picking multiple photos:', err)
      throw err
    }
  }

  return {
    takePhoto,
    pickPhoto,
    pickMultiplePhotos
  }
}
