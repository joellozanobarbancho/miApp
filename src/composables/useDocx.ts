import { Filesystem, Directory } from '@capacitor/filesystem'
import { Share } from '@capacitor/share'

export interface DocxGenerationOptions {
  templateFile: File
  photos: string[] // Array of base64 encoded images
  templateData?: Record<string, any>
}

export function useDocx() {
  /**
   * Generate a DOCX file from template with photos
   * Uses docxtemplater library
   */
  async function generateDocx(options: DocxGenerationOptions): Promise<Blob> {
    try {
      console.log('[useDocx] Starting document generation')
      
      // Dynamic import of docxtemplater to keep bundle small
      const { default: PizZip } = await import('pizzip')
      const { default: Docxtemplater } = await import('docxtemplater')
      const { default: ImageModule } = await import('docxtemplater-image-module-free')

      // Read template file
      const templateBuffer = await options.templateFile.arrayBuffer()
      const zip = new PizZip(templateBuffer)
      
      const doc = new Docxtemplater(zip, {
        modules: [new ImageModule({})]
      })

      // Prepare template data with photos
      const templateVars = {
        ...options.templateData,
        photos: options.photos.map((photo, index) => ({
          image: photo.split(',')[1] || photo, // Remove data:image/... prefix if exists
          index: index + 1
        }))
      }

      doc.render(templateVars)

      // Generate document
      const docBuffer = doc.getZip().generate({ type: 'blob' })
      
      console.log('[useDocx] Document generated successfully')
      return docBuffer
    } catch (err) {
      console.error('[useDocx] Error generating document:', err)
      throw err
    }
  }

  /**
   * Save generated document to device storage
   */
  async function saveDocument(docBlob: Blob, fileName: string): Promise<string> {
    try {
      console.log('[useDocx] Saving document:', fileName)
      
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader()
        reader.onloadend = () => {
          const result = reader.result
          if (typeof result === 'string') {
            resolve(result.split(',')[1] || result)
          } else {
            reject(new Error('Failed to convert blob to base64'))
          }
        }
        reader.onerror = () => reject(reader.error)
        reader.readAsDataURL(docBlob)
      })

      const result = await Filesystem.writeFile({
        path: `reports/${fileName}`,
        data: base64,
        directory: Directory.Documents
      })

      console.log('[useDocx] Document saved to:', result.uri)
      return result.uri
    } catch (err) {
      console.error('[useDocx] Error saving document:', err)
      throw err
    }
  }

  /**
   * Share generated document
   */
  async function shareDocument(filePath: string, fileName: string): Promise<void> {
    try {
      console.log('[useDocx] Sharing document:', fileName)
      
      const file = await Filesystem.readFile({
        path: filePath,
        directory: Directory.Documents
      })

      await Share.share({
        title: fileName,
        text: 'Generated report',
        files: [file.data as unknown as string],
        dialogTitle: 'Share Report'
      })

      console.log('[useDocx] Document shared successfully')
    } catch (err) {
      console.error('[useDocx] Error sharing document:', err)
      throw err
    }
  }

  return {
    generateDocx,
    saveDocument,
    shareDocument
  }
}
