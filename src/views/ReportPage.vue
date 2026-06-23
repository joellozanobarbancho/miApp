<template>
  <ion-page>
    <ion-header>
      <ion-toolbar>
        <ion-title>Reports</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content class="report-page ion-padding">
      <ion-card class="section-card">
        <ion-card-header>
          <ion-card-title>
            <ion-icon :icon="documentOutline" slot="start"></ion-icon>
            Excel template
          </ion-card-title>
        </ion-card-header>
        <ion-card-content>
          <template-uploader
            :template-name="report.templateName"
            @template-selected="setTemplate"
            @template-cleared="clearTemplate"
            @error="handleError"
          />
        </ion-card-content>
      </ion-card>

      <ion-card class="section-card">
        <ion-card-header>
          <ion-card-title>
            <ion-icon :icon="imagesOutline" slot="start"></ion-icon>
            Editable images
          </ion-card-title>
        </ion-card-header>
        <ion-card-content>
          <div class="slot-grid">
            <article v-for="slot in editableSlots" :key="slot.key" class="slot-card">
              <div class="slot-card__head">
                <div>
                  <h3>{{ slot.label }}</h3>
                  <p>{{ slot.description }}</p>
                </div>
              </div>

              <div class="slot-preview">
                <img v-if="slotSelections[slot.key]?.dataUrl" :src="slotSelections[slot.key]?.dataUrl" :alt="slot.label" />
                <div v-else class="slot-preview__empty">
                  <ion-icon :icon="imageOutline"></ion-icon>
                  <span>No image</span>
                </div>
              </div>

              <p class="slot-meta">
                {{ slotSelections[slot.key]?.fileName ?? 'Choose an image' }}
              </p>

              <div class="slot-actions">
                <ion-button size="small" @click="selectImage(slot.key)">
                  Select image
                </ion-button>
                <ion-button size="small" fill="outline" color="medium" :disabled="!slotSelections[slot.key]" @click="clearSlot(slot.key)">
                  Clear
                </ion-button>
              </div>
            </article>
          </div>
        </ion-card-content>
      </ion-card>

      <ion-card class="section-card summary-card">
        <ion-card-content>
          <div>
            <strong>{{ selectedSlotsCount }}</strong>
            <span>configured slots</span>
          </div>
          <div>
            <strong>{{ editableSlots.length }}</strong>
            <span>available slots</span>
          </div>
        </ion-card-content>
      </ion-card>

      <ion-button
        expand="block"
        size="large"
        class="generate-button"
        :disabled="!report.hasTemplate || isGenerating"
        @click="generateReport"
      >
        <ion-spinner v-if="isGenerating" name="crescent" slot="start"></ion-spinner>
        <ion-icon v-else :icon="downloadOutline" slot="start"></ion-icon>
        {{ isGenerating ? 'Generating...' : 'Generate report' }}
      </ion-button>

      <ion-modal :is-open="isPreviewOpen" @didDismiss="isPreviewOpen = false">
        <ion-header>
          <ion-toolbar>
            <ion-title>Preview</ion-title>
            <ion-buttons slot="end">
              <ion-button @click="isPreviewOpen = false">Close</ion-button>
            </ion-buttons>
          </ion-toolbar>
        </ion-header>

        <ion-content class="ion-padding">
          <iframe v-if="previewHtml" class="preview-frame" :srcdoc="previewHtml"></iframe>

          <div class="preview-actions">
            <ion-button expand="block" :disabled="!generatedBlob" @click="downloadGeneratedReport">
              Download as Excel
            </ion-button>
          </div>
        </ion-content>
      </ion-modal>

      <ion-modal :is-open="isGalleryPickerOpen" @didDismiss="closeGalleryPicker">
        <ion-header>
          <ion-toolbar>
            <ion-title>Select from Gallery</ion-title>
            <ion-buttons slot="end">
              <ion-button @click="closeGalleryPicker">Close</ion-button>
            </ion-buttons>
          </ion-toolbar>
        </ion-header>

        <ion-content class="ion-padding gallery-picker-content">
          <p class="gallery-picker__hint">
            Choose one of the saved photos from the Gallery tab.
          </p>

          <div v-if="gallery.photos.length > 0" class="gallery-picker-grid">
            <button
              v-for="photo in gallery.photos"
              :key="photo.id"
              type="button"
              class="gallery-picker-card"
              @click="chooseGalleryPhoto(photo)"
            >
              <img :src="photo.path" alt="Gallery photo" />
              <span>{{ formatPhotoDate(photo.date) }}</span>
            </button>
          </div>

          <ion-card v-else class="ion-text-center ion-padding">
            <ion-card-header>
              <ion-card-title>No saved photos</ion-card-title>
            </ion-card-header>
            <ion-card-content>
              <p>Add photos in the Gallery tab first, then come back here to select them.</p>
            </ion-card-content>
          </ion-card>
        </ion-content>
      </ion-modal>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import {
  IonPage,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonCard,
  IonCardHeader,
  IonCardTitle,
  IonCardContent,
  IonButton,
  IonIcon,
  IonSpinner,
  IonModal,
  IonButtons,
  toastController
} from '@ionic/vue'
import {
  documentOutline,
  imagesOutline,
  downloadOutline,
  imageOutline
} from 'ionicons/icons'
import TemplateUploader from '@/components/TemplateUploader.vue'
import { useGalleryStore, type GalleryPhoto } from '@/stores/galleryStore'
import { useReportStore } from '@/stores/reportStore'
import {
  REPORT_SLOT_DEFINITIONS,
  type ReportSlotKey,
  type ReportSlotSelection,
  useReportGenerator
} from '@/composables/useReportGenerator'

const report = useReportStore()
const gallery = useGalleryStore()
const { prepareReport, saveOrShareReport } = useReportGenerator()

const activeSlotKey = ref<ReportSlotKey | null>(null)
const isGenerating = ref(false)
const isPreviewOpen = ref(false)
const isGalleryPickerOpen = ref(false)
const previewHtml = ref('')
const generatedBlob = ref<Blob | null>(null)
const generatedFileName = ref('')

const slotSelections = reactive<Partial<Record<ReportSlotKey, ReportSlotSelection>>>({})

const editableSlots = computed(() =>
  REPORT_SLOT_DEFINITIONS.filter((slot) => slot.key !== 'inquadramento')
)

const selectedSlotsCount = computed(() =>
  editableSlots.value.reduce((count, slot) => count + (slotSelections[slot.key] ? 1 : 0), 0)
)

onMounted(async () => {
  await gallery.loadPhotos()
})

function toSelection(slotKey: ReportSlotKey, fileName: string, mimeType: string, dataUrl: string): ReportSlotSelection {
  const slot = REPORT_SLOT_DEFINITIONS.find((entry) => entry.key === slotKey)

  return {
    key: slotKey,
    label: slot?.label ?? slotKey,
    fileName,
    mimeType,
    dataUrl,
    source: 'file'
  }
}

function selectImage(slotKey: ReportSlotKey) {
  activeSlotKey.value = slotKey
  isGalleryPickerOpen.value = true
}

function closeGalleryPicker() {
  isGalleryPickerOpen.value = false
  activeSlotKey.value = null
}

function clearSlot(slotKey: ReportSlotKey) {
  delete slotSelections[slotKey]
}

async function blobToDataUrl(blob: Blob) {
  return await new Promise<string>((resolve, reject) => {
    const reader = new FileReader()

    reader.onload = () => {
      const result = reader.result
      if (typeof result === 'string') {
        resolve(result)
        return
      }

      reject(new Error('Unable to read the selected image'))
    }

    reader.onerror = () => reject(reader.error ?? new Error('Unable to read the selected image'))
    reader.readAsDataURL(blob)
  })
}

async function photoToSelection(photo: GalleryPhoto) {
  const response = await fetch(photo.path)
  if (!response.ok) {
    throw new Error('Unable to load the selected gallery photo')
  }

  const blob = await response.blob()
  const dataUrl = await blobToDataUrl(blob)

  return {
    dataUrl,
    mimeType: blob.type || 'image/jpeg'
  }
}

async function chooseGalleryPhoto(photo: GalleryPhoto) {
  if (!activeSlotKey.value) {
    return
  }

  try {
    const { dataUrl, mimeType } = await photoToSelection(photo)
    slotSelections[activeSlotKey.value] = toSelection(activeSlotKey.value, photo.id, mimeType, dataUrl)
    closeGalleryPicker()
  } catch (err) {
    await handleError(err instanceof Error ? err : new Error('Unable to select the gallery photo'))
  }
}

async function setTemplate(file: File) {
  try {
    await report.setTemplate(file)
    const toast = await toastController.create({
      message: 'Template uploaded successfully',
      duration: 2000,
      color: 'success',
      position: 'bottom'
    })
    await toast.present()
  } catch (err) {
    await handleError(err instanceof Error ? err : new Error('Unable to save the template'))
  }
}

async function clearTemplate() {
  try {
    await report.clearTemplate()
    previewHtml.value = ''
    generatedBlob.value = null
    generatedFileName.value = ''
    isPreviewOpen.value = false
  } catch (err) {
    await handleError(err instanceof Error ? err : new Error('Unable to clear the template'))
  }
}

async function generateReport() {
  if (!report.template?.file) {
    await handleError(new Error('Upload the Excel template first'))
    return
  }

  try {
    isGenerating.value = true
    const result = await prepareReport(report.template.file, slotSelections)
    previewHtml.value = result.previewHtml
    generatedBlob.value = result.blob
    generatedFileName.value = result.fileName
    isPreviewOpen.value = true
  } catch (err) {
    await handleError(err instanceof Error ? err : new Error('Unable to generate the report'))
  } finally {
    isGenerating.value = false
  }
}

async function handleError(error: Error) {
  const toast = await toastController.create({
    message: error.message,
    duration: 3000,
    color: 'danger',
    position: 'bottom'
  })
  await toast.present()
}

async function downloadGeneratedReport() {
  if (!generatedBlob.value || !generatedFileName.value) {
    return
  }

  try {
    await saveOrShareReport(generatedBlob.value, generatedFileName.value)
    const toast = await toastController.create({
      message: 'Report is ready to download or share',
      duration: 1800,
      color: 'success',
      position: 'bottom'
    })
    await toast.present()
  } catch (err) {
    await handleError(err instanceof Error ? err : new Error('Unable to download the report'))
  }
}

function formatPhotoDate(dateString: string): string {
  try {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  } catch {
    return dateString
  }
}
</script>

<style scoped>
.report-page {
  --background: linear-gradient(180deg, #f5f8fc 0%, #edf2f8 100%);
}

.section-card {
  margin-bottom: 16px;
  border-radius: 20px;
  overflow: hidden;
}

.slot-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 14px;
}

.slot-card {
  border: 1px solid rgba(20, 36, 55, 0.08);
  border-radius: 18px;
  background: #ffffff;
  padding: 14px;
  box-shadow: 0 12px 30px rgba(20, 36, 55, 0.06);
}

.slot-card__head {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 12px;
}

.slot-card__head h3 {
  margin: 0;
  font-size: 1rem;
}

.slot-card__head p,
.slot-meta {
  margin: 4px 0 0;
  font-size: 0.82rem;
  color: #667582;
}

.slot-preview {
  aspect-ratio: 4 / 3;
  border-radius: 14px;
  overflow: hidden;
  background: linear-gradient(135deg, #dfe8f2 0%, #eef3f8 100%);
  display: grid;
  place-items: center;
  margin-bottom: 10px;
}

.slot-preview img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.slot-preview__empty {
  color: #7b8896;
  display: grid;
  place-items: center;
  gap: 6px;
}

.slot-preview__empty ion-icon {
  font-size: 1.6rem;
}

.slot-actions {
  display: flex;
  gap: 10px;
}

.slot-actions ion-button {
  flex: 1;
}

.summary-card ion-card-content {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}

.summary-card strong {
  display: block;
  font-size: 1.4rem;
  color: #17324f;
}

.summary-card span {
  color: #6a7784;
  font-size: 0.9rem;
}

.generate-button {
  margin-top: 8px;
}

.preview-frame {
  width: 100%;
  min-height: 68vh;
  border: 0;
  border-radius: 18px;
  background: #fff;
  box-shadow: 0 12px 30px rgba(20, 36, 55, 0.08);
}

.preview-actions {
  margin-top: 16px;
}

.gallery-picker-content {
  --background: #f5f8fc;
}

.gallery-picker__hint {
  margin: 0 0 16px;
  color: #5f6d7a;
}

.gallery-picker-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 12px;
}

.gallery-picker-card {
  border: 0;
  border-radius: 16px;
  overflow: hidden;
  background: #fff;
  box-shadow: 0 12px 30px rgba(20, 36, 55, 0.08);
  padding: 0;
  text-align: left;
  cursor: pointer;
}

.gallery-picker-card img {
  width: 100%;
  aspect-ratio: 1;
  object-fit: cover;
  display: block;
}

.gallery-picker-card span {
  display: block;
  padding: 10px 12px 12px;
  font-size: 0.82rem;
  color: #5f6d7a;
}
</style>
