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

      <ion-card v-if="report.isScanning" class="section-card">
        <ion-card-content class="ion-text-center">
          <ion-spinner name="crescent"></ion-spinner>
          <p>Reading template…</p>
        </ion-card-content>
      </ion-card>

      <ion-card v-else-if="report.hasTemplate && report.slots.length === 0" class="section-card">
        <ion-card-content>
          <p>No editable images were detected in this template. Make sure the .xlsx already contains placeholder pictures in the cells you want to replace.</p>
        </ion-card-content>
      </ion-card>

      <ion-card v-else-if="report.slots.length > 0" class="section-card">
        <ion-card-header>
          <ion-card-title>
            <ion-icon :icon="imagesOutline" slot="start"></ion-icon>
            Editable images
          </ion-card-title>
        </ion-card-header>
        <ion-card-content>
          <div class="slot-grid">
            <article v-for="slot in report.slots" :key="slot.id" class="slot-card">
              <div class="slot-card__head">
                <div>
                  <h3>{{ slot.sheetName }}</h3>
                  <p>{{ slot.originalFileName }} · row {{ slot.row + 1 }}, col {{ slot.col + 1 }}</p>
                </div>
                <span v-if="slotSelections[slot.id]" class="pill">
                  {{ slotSelections[slot.id]?.source === 'auto-location' ? 'Location' : 'Selected' }}
                </span>
              </div>

              <div class="slot-preview">
                <img
                  :src="slotSelections[slot.id]?.dataUrl ?? slot.thumbnailDataUrl"
                  :alt="slot.originalFileName"
                />
              </div>

              <p class="slot-meta">
                {{ slotSelections[slot.id] ? 'Custom image selected' : 'Showing current template image' }}
              </p>

              <div class="slot-actions">
                <ion-button size="small" @click="selectImage(slot.id)">
                  Select from gallery
                </ion-button>
                <ion-button size="small" fill="outline" @click="useLocationForSlot(slot.id)">
                  Use my location
                </ion-button>
                <ion-button
                  size="small"
                  fill="outline"
                  color="medium"
                  :disabled="!slotSelections[slot.id]"
                  @click="clearSlot(slot.id)"
                >
                  Clear
                </ion-button>
              </div>
            </article>
          </div>
        </ion-card-content>
      </ion-card>

      <ion-card v-if="report.mapImage" class="section-card">
        <ion-card-header>
          <ion-card-title>
            <ion-icon :icon="imagesOutline" slot="start"></ion-icon>
            Location preview
          </ion-card-title>
        </ion-card-header>
        <ion-card-content>
          <MapPreview :src="report.mapImage" />
        </ion-card-content>
      </ion-card>

      <ion-card v-if="report.slots.length > 0" class="section-card summary-card">
        <ion-card-content>
          <div>
            <strong>{{ selectedSlotsCount }}</strong>
            <span>configured slots</span>
          </div>
          <div>
            <strong>{{ report.slots.length }}</strong>
            <span>detected slots</span>
          </div>
        </ion-card-content>
      </ion-card>

      <ion-button
        expand="block"
        size="large"
        class="generate-button"
        :disabled="!report.hasTemplate || report.slots.length === 0 || report.isGenerating"
        @click="generateReport"
      >
        <ion-spinner v-if="report.isGenerating" name="crescent" slot="start"></ion-spinner>
        <ion-icon v-else :icon="downloadOutline" slot="start"></ion-icon>
        {{ report.isGenerating ? 'Generating...' : 'Generate report' }}
      </ion-button>

      <ion-modal :is-open="isPreviewOpen" @didDismiss="isPreviewOpen = false">
        <ion-header>
          <ion-toolbar>
            <ion-title>Report ready</ion-title>
            <ion-buttons slot="end">
              <ion-button @click="isPreviewOpen = false">Close</ion-button>
            </ion-buttons>
          </ion-toolbar>
        </ion-header>

        <ion-content class="ion-padding">
          <ion-item>
            <ion-label position="stacked">Report name</ion-label>
            <ion-input
              v-model="editableFileName"
              placeholder="report-name"
              @ionBlur="normalizeFileName"
            ></ion-input>
          </ion-item>

          <div class="preview-actions">
            <ion-button expand="block" :disabled="!generatedBlob" @click="downloadGeneratedReport">
              Download
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
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { Capacitor } from '@capacitor/core'
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
  IonItem,
  IonLabel,
  IonInput,
  toastController
} from '@ionic/vue'
import {
  documentOutline,
  imagesOutline,
  downloadOutline
} from 'ionicons/icons'
import TemplateUploader from '@/components/TemplateUploader.vue'
import { useGalleryStore, type GalleryPhoto } from '@/stores/galleryStore'
import { useReportStore } from '@/stores/reportStore'
import { useReportGenerator, type ReportSlotSelection } from '@/composables/useReportGenerator'

const report = useReportStore()
const gallery = useGalleryStore()
const { prepareReport, downloadReport, generateLocationMap } = useReportGenerator()

const activeSlotId = ref<string | null>(null)
const isPreviewOpen = ref(false)
const isGalleryPickerOpen = ref(false)
const generatedBlob = ref<Blob | null>(null)
const generatedFileName = ref('')
const editableFileName = ref('')

function stripExtension(name: string) {
  return name.replace(/\.xlsx$/i, '')
}

function normalizeFileName() {
  const trimmed = editableFileName.value.trim()
  editableFileName.value = trimmed.length > 0 ? trimmed : stripExtension(generatedFileName.value)
}

const slotSelections = reactive<Record<string, ReportSlotSelection>>({})

watch(
  () => report.template?.id,
  () => {
    for (const key of Object.keys(slotSelections)) {
      delete slotSelections[key]
    }
  }
)

const selectedSlotsCount = computed(() =>
  report.slots.reduce((count, slot) => count + (slotSelections[slot.id] ? 1 : 0), 0)
)

onMounted(async () => {
  await gallery.loadPhotos()
  if (report.hasTemplate && report.slots.length === 0) {
    await report.scanCurrentTemplate().catch(() => {})
  }
})

function selectImage(slotId: string) {
  activeSlotId.value = slotId
  isGalleryPickerOpen.value = true
}

function closeGalleryPicker() {
  isGalleryPickerOpen.value = false
  activeSlotId.value = null
}

function clearSlot(slotId: string) {
  delete slotSelections[slotId]
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

async function chooseGalleryPhoto(photo: GalleryPhoto) {
  if (!activeSlotId.value) {
    return
  }

  try {
    const response = await fetch(photo.path)
    if (!response.ok) {
      throw new Error('Unable to load the selected gallery photo')
    }

    const blob = await response.blob()
    const dataUrl = await blobToDataUrl(blob)

    slotSelections[activeSlotId.value] = {
      slotId: activeSlotId.value,
      fileName: photo.id,
      mimeType: blob.type || 'image/jpeg',
      dataUrl,
      source: 'file'
    }

    closeGalleryPicker()
  } catch (err) {
    await handleError(err instanceof Error ? err : new Error('Unable to select the gallery photo'))
  }
}

async function useLocationForSlot(slotId: string) {
  try {
    const { Geolocation } = await import('@capacitor/geolocation')
    const pos = await Geolocation.getCurrentPosition()

    const lat = pos.coords.latitude
    const lng = pos.coords.longitude

    report.setLocation(lat, lng)

    await report.loadMap()

    if (!report.mapImage) {
      throw new Error('Unable to generate map image')
    }

    slotSelections[slotId] = {
      slotId,
      fileName: `location-${Date.now()}.png`,
      mimeType: 'image/png',
      dataUrl: report.mapImage,
      source: 'auto-location'
    }
  } catch (err) {
    await handleError(err instanceof Error ? err : new Error('Unable to get your location'))
  }
}

async function setTemplate(file: File) {
  try {
    await report.setTemplate(file)
    const toast = await toastController.create({
      message: `Template uploaded — ${report.slots.length} editable image(s) detected`,
      duration: 2500,
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

  if (report.slots.length === 0) {
    await handleError(new Error('No editable images were detected in this template'))
    return
  }

  try {
    report.setGenerating(true)
    const result = await prepareReport(report.template.file, report.slots, slotSelections)
    generatedBlob.value = result.blob
    generatedFileName.value = result.fileName
    editableFileName.value = stripExtension(result.fileName)
    isPreviewOpen.value = true
  } catch (err) {
    await handleError(err instanceof Error ? err : new Error('Unable to generate the report'))
  } finally {
    report.setGenerating(false)
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
  if (!generatedBlob.value) {
    return
  }

  normalizeFileName()
  const finalFileName = `${editableFileName.value}.xlsx`

  try {
    const { path } = await downloadReport(generatedBlob.value, finalFileName)
    const toast = await toastController.create({
      message: Capacitor.getPlatform() === 'web' ? 'Report downloaded' : `Saved to ${path}`,
      duration: 2500,
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

.pill {
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  padding: 5px 10px;
  border-radius: 999px;
  background: #eef4ff;
  color: #3657a6;
  white-space: nowrap;
  height: fit-content;
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

.slot-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.slot-actions ion-button {
  flex: 1;
  min-width: 110px;
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