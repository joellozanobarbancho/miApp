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
          <p class="empty-hint">
            Using the default template: {{ report.templateName ?? 'PLANTILLA 4.xlsx' }}
          </p>
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
            No reports generated yet. Open the default template and tap "Generate report" to start.
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
import ReportWizardModal from '@/components/ReportWizardModal.vue'
import { useGalleryStore, type GalleryPhoto } from '@/stores/galleryStore'
import { useReportStore, type SavedReport } from '@/stores/reportStore'
import { useReportGenerator, type ReportSlotSelection } from '@/composables/useReportGenerator'
import type { TemplateSlot } from '@/composables/useTemplateScanner'
import type { SheetValues } from '@/composables/useTemplateWriter'
import { Capacitor } from '@capacitor/core'

const report = useReportStore()
const gallery = useGalleryStore()
const { prepareReportWithFields, downloadReport, generateLocationMap, editReport } = useReportGenerator()

const isWizardOpen = ref(false)
const activeSlotId = ref<string | null>(null)
const isPreviewOpen = ref(false)
const isGalleryPickerOpen = ref(false)
const isSaving = ref(false)
const generatedBlob = ref<Blob | null>(null)
const generatedFileName = ref('')
const editableFileName = ref('')
const logoSelection = ref<ReportSlotSelection | null>(null)
const locationSelection = ref<ReportSlotSelection | null>(null)
const slotSelections = reactive<Record<string, ReportSlotSelection>>({})

const logoSlots = computed(() => report.slots.filter((slot) => slot.isPlaceholderLike && slot.isLogoSlot && !slot.isLocationSlot))
const logoPreviewSlot = computed(() => logoSlots.value[0] ?? null)
const editableSlots = computed(() => report.slots.filter((slot) => slot.isPlaceholderLike && !slot.isLocationSlot && !slot.isLogoSlot && /image3/i.test(slot.originalFileName)))
const locationSlot = computed(() => report.slots.find((slot) => slot.isLocationSlot) ?? null)
const hasEditableSlots = computed(() => logoSlots.value.length > 0 || editableSlots.value.length > 0 || locationSlot.value !== null)
const editableSlotsCount = computed(() => logoSlots.value.length + editableSlots.value.length + (locationSlot.value ? 1 : 0))
const configuredGroupsCount = computed(() => Number(Boolean(logoSelection.value)) + Number(Boolean(locationSelection.value)) + Object.keys(slotSelections).length)
const locationPreviewUrl = computed(() => locationSlot.value?.thumbnailDataUrl ?? '')
const locationPreviewAlt = computed(() => locationSlot.value?.originalFileName ?? 'Location placeholder')

const logoSlotIds = computed(() => {
  const bySheet = new Map<string, TemplateSlot>()

  for (const slot of report.slots) {
    const looksLikeLogo = slot.row <= 5 && slot.col <= 5
    if (!looksLikeLogo) continue

    const current = bySheet.get(slot.sheetName)
    if (!current) {
      bySheet.set(slot.sheetName, slot)
      continue
    }

    if (slot.row < current.row || (slot.row === current.row && slot.col < current.col)) {
      bySheet.set(slot.sheetName, slot)
    }
  }

  return Array.from(bySheet.values()).map((slot) => slot.id)
})

const inquadramentoSlotIds = computed(() =>
  report.slots.filter((slot) => slot.sheetName === 'inquadramento').map((slot) => slot.id)
)

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

function propagateSharedLogo(slotId: string) {
  if (!logoSlotIds.value.includes(slotId)) return

  const selection = slotSelections[slotId]
  if (!selection) return

  for (const logoSlotId of logoSlotIds.value) {
    slotSelections[logoSlotId] = selection
  }
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
      if (typeof result === 'string') resolve(result)
      else reject(new Error('Unable to read the selected image'))
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
    const slotId = activeSlotId.value

    const selection: ReportSlotSelection = {
      slotId,
      fileName: photo.id,
      mimeType: blob.type || 'image/jpeg',
      dataUrl,
      source: 'file'
    }

    slotSelections[slotId] = selection
    propagateSharedLogo(slotId)

    closeGalleryPicker()
  } catch (err) {
    await handleError(err instanceof Error ? err : new Error('Unable to select the gallery photo'))
  }
}

async function useLocationForSlot(slotId: string) {
  try {
    const locationMap = await generateLocationMap()

    slotSelections[slotId] = {
      slotId,
      fileName: locationMap.fileName,
      mimeType: 'image/png',
      dataUrl: locationMap.dataUrl,
      source: 'auto-location'
    }

    propagateSharedLogo(slotId)
  } catch (err) {
    await handleError(err instanceof Error ? err : new Error('Unable to get your location'))
  }
}

async function handleWizardFinish(valuesBySheet: Record<string, SheetValues>) {
  if (!report.template?.file) {
    await handleError(new Error('Default template not available'))
    return
  }

  try {
    if (inquadramentoSlotIds.value.length > 0) {
      const hasInquadramentoSelection = inquadramentoSlotIds.value.some((slotId) => slotSelections[slotId])
      if (!hasInquadramentoSelection) {
        const locationMap = await generateLocationMap()

        for (const slotId of inquadramentoSlotIds.value) {
          slotSelections[slotId] = {
            slotId,
            fileName: locationMap.fileName,
            mimeType: 'image/png',
            dataUrl: locationMap.dataUrl,
            source: 'auto-location'
          }
        }
      }
    }

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

async function editGeneratedReport() {
  if (!generatedBlob.value) return

  normalizeFileName()
  const finalFileName = `${editableFileName.value}.xlsx`

  try {
    const { path } = await editReport(generatedBlob.value, finalFileName)
    const toast = await toastController.create({
      message: Capacitor.getPlatform() === 'web' ? 'Report downloaded for editing' : `Open ${path} in a spreadsheet app`,
      duration: 2500,
      color: 'success',
      position: 'bottom'
    })
    await toast.present()
  } catch (err) {
    await handleError(err instanceof Error ? err : new Error('Unable to open the report for editing'))
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
