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

      <ion-card class="section-card">
        <ion-card-header>
          <ion-card-title>
            <ion-icon :icon="folderOpenOutline" slot="start"></ion-icon>
            Generated reports
          </ion-card-title>
        </ion-card-header>
        <ion-card-content>
          <p v-if="report.reports.length === 0" class="empty-hint">
            No reports generated yet. Upload a template and tap "Generate report" to start.
          </p>

          <ion-list v-else class="reports-list">
            <ion-item v-for="item in report.reports" :key="item.id" button @click="downloadSavedReport(item)">
              <ion-icon :icon="documentTextOutline" slot="start"></ion-icon>
              <ion-label>
                <h3>{{ item.name }}</h3>
                <p>{{ formatDate(item.createdAt) }}</p>
              </ion-label>
              <ion-button slot="end" fill="clear" color="medium" @click.stop="removeSavedReport(item.id)">
                <ion-icon :icon="trashOutline"></ion-icon>
              </ion-button>
            </ion-item>
          </ion-list>
        </ion-card-content>
      </ion-card>

      <ion-button
        expand="block"
        size="large"
        class="generate-button"
        :disabled="!report.hasTemplate || report.slots.length === 0"
        @click="openWizard"
      >
        <ion-icon :icon="playOutline" slot="start"></ion-icon>
        Generate report
      </ion-button>
      <p v-if="report.hasTemplate && report.slots.length === 0 && !report.isScanning" class="empty-hint">
        No editable images were detected in this template.
      </p>

      <ReportWizardModal
        v-model:is-open="isWizardOpen"
        :slots="report.slots"
        :image-selections="slotSelections"
        @select-image="selectImage"
        @use-location-for-slot="useLocationForSlot"
        @finish="handleWizardFinish"
      />

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
            <ion-button expand="block" :disabled="isSaving" @click="confirmAndSaveReport">
              <ion-spinner v-if="isSaving" name="crescent" slot="start"></ion-spinner>
              Save report
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
import { onMounted, reactive, ref } from 'vue'
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
  IonList,
  toastController
} from '@ionic/vue'
import {
  documentOutline,
  documentTextOutline,
  folderOpenOutline,
  trashOutline,
  playOutline
} from 'ionicons/icons'
import TemplateUploader from '@/components/TemplateUploader.vue'
import ReportWizardModal from '@/components/ReportWizardModal.vue'
import { useGalleryStore, type GalleryPhoto } from '@/stores/galleryStore'
import { useReportStore, type SavedReport } from '@/stores/reportStore'
import { useReportGenerator, type ReportSlotSelection } from '@/composables/useReportGenerator'
import type { SheetValues } from '@/composables/useTemplateWriter'
import { Capacitor } from '@capacitor/core'

const report = useReportStore()
const gallery = useGalleryStore()
const { prepareReportWithFields, downloadReport } = useReportGenerator()

const isWizardOpen = ref(false)
const activeSlotId = ref<string | null>(null)
const isPreviewOpen = ref(false)
const isGalleryPickerOpen = ref(false)
const isSaving = ref(false)
const generatedBlob = ref<Blob | null>(null)
const generatedFileName = ref('')
const editableFileName = ref('')

const slotSelections = reactive<Record<string, ReportSlotSelection>>({})

function stripExtension(name: string) {
  return name.replace(/\.xlsx$/i, '')
}

function normalizeFileName() {
  const trimmed = editableFileName.value.trim()
  editableFileName.value = trimmed.length > 0 ? trimmed : stripExtension(generatedFileName.value)
}

onMounted(async () => {
  await gallery.loadPhotos()
  await report.loadReports()
  if (report.hasTemplate && report.slots.length === 0) {
    await report.scanCurrentTemplate().catch(() => {})
  }
})

function openWizard() {
  for (const key of Object.keys(slotSelections)) delete slotSelections[key]
  isWizardOpen.value = true
}

function selectImage(slotId: string) {
  activeSlotId.value = slotId
  isGalleryPickerOpen.value = true
}

function closeGalleryPicker() {
  isGalleryPickerOpen.value = false
  activeSlotId.value = null
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
  if (!activeSlotId.value) return

  try {
    const response = await fetch(photo.path)
    if (!response.ok) throw new Error('Unable to load the selected gallery photo')

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

    report.setLocation(pos.coords.latitude, pos.coords.longitude)
    await report.loadMap()

    if (!report.mapImage) throw new Error('Unable to generate map image')

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
  } catch (err) {
    await handleError(err instanceof Error ? err : new Error('Unable to clear the template'))
  }
}

async function handleWizardFinish(valuesBySheet: Record<string, SheetValues>) {
  if (!report.template?.file) {
    await handleError(new Error('Upload the Excel template first'))
    return
  }

  try {
    const result = await prepareReportWithFields(
      report.template.file,
      report.slots,
      slotSelections,
      valuesBySheet
    )
    generatedBlob.value = result.blob
    generatedFileName.value = result.fileName
    editableFileName.value = stripExtension(result.fileName)
    isWizardOpen.value = false
    isPreviewOpen.value = true
  } catch (err) {
    await handleError(err instanceof Error ? err : new Error('Unable to generate the report'))
  }
}

async function confirmAndSaveReport() {
  if (!generatedBlob.value) return

  normalizeFileName()
  const finalFileName = `${editableFileName.value}.xlsx`

  isSaving.value = true
  try {
    await report.addGeneratedReport(generatedBlob.value, finalFileName)
    isPreviewOpen.value = false
    generatedBlob.value = null

    const toast = await toastController.create({
      message: 'Report saved',
      duration: 2000,
      color: 'success',
      position: 'bottom'
    })
    await toast.present()
  } catch (err) {
    await handleError(err instanceof Error ? err : new Error('Unable to save the report'))
  } finally {
    isSaving.value = false
  }
}

async function downloadSavedReport(item: SavedReport) {
  try {
    const blob = await report.getReportBlob(item.id)
    const { path } = await downloadReport(blob, item.name)
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

async function removeSavedReport(id: string) {
  try {
    await report.deleteReport(id)
  } catch (err) {
    await handleError(err instanceof Error ? err : new Error('Unable to delete the report'))
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

function formatDate(dateString: string): string {
  try {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  } catch {
    return dateString
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

.empty-hint {
  color: #6a7784;
  font-size: 0.9rem;
}

.reports-list {
  background: transparent;
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
