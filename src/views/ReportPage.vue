<template>
  <ion-page>
    <ion-header>
      <ion-toolbar>
        <ion-title>Reports</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content class="ion-padding">
      <!-- Template Uploader Component -->
      <ion-card class="ion-margin-bottom">
        <ion-card-header>
          <ion-card-title>
            <ion-icon :icon="documentOutline" slot="start"></ion-icon>
            Report Template
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

      <!-- Photos Selection -->
      <ion-card v-if="report.hasTemplate" class="ion-margin-bottom">
        <ion-card-header>
          <ion-card-title>
            <ion-icon :icon="imagesOutline" slot="start"></ion-icon>
            Select Photos ({{ selectedPhotosCount }}/18)
          </ion-card-title>
        </ion-card-header>
        <ion-card-content>
          <ion-checkbox 
            v-model="selectAllPhotos"
            label-placement="end"
            class="ion-margin-bottom"
          >
            <strong>Select all photos</strong>
          </ion-checkbox>

          <ion-list v-if="gallery.photos.length > 0">
            <ion-item v-for="photo in gallery.photos" :key="photo.id">
              <ion-checkbox
                :model-value="selectedPhotos.includes(photo.id)"
                @update:model-value="togglePhotoSelection(photo.id)"
                slot="start"
              ></ion-checkbox>
              <ion-label>
                <p>{{ formatDate(photo.date) }}</p>
              </ion-label>
              <ion-thumbnail slot="end">
                <ion-img :src="photo.path" />
              </ion-thumbnail>
            </ion-item>
          </ion-list>

          <ion-note v-else color="medium">
            No photos available. Add photos in the Gallery tab first.
          </ion-note>
        </ion-card-content>
      </ion-card>

      <!-- Generate Report Button -->
      <ion-button
        expand="block"
        size="large"
        class="ion-margin-top"
        :disabled="!canGenerateReport || isGenerating"
        @click="generateReport"
      >
        <ion-spinner v-if="isGenerating" name="crescent" slot="start"></ion-spinner>
        <ion-icon v-else :icon="downloadOutline" slot="start"></ion-icon>
        {{ isGenerating ? 'Generating...' : 'Generate Report' }}
      </ion-button>

      <!-- Info Message -->
      <ion-note v-if="!report.hasTemplate" color="warning" class="ion-margin-top ion-display-flex ion-justify-content-center">
        <ion-icon :icon="warningOutline" slot="start" class="ion-margin-end"></ion-icon>
        Please upload a template first
      </ion-note>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
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
  IonNote,
  IonCheckbox,
  IonList,
  IonItem,
  IonLabel,
  IonThumbnail,
  IonImg,
  IonSpinner,
  toastController
} from '@ionic/vue'
import { 
  documentOutline,
  imagesOutline,
  downloadOutline,
  warningOutline
} from 'ionicons/icons'
import TemplateUploader from '@/components/TemplateUploader.vue'
import { useGalleryStore } from '@/stores/galleryStore'
import { useReportStore } from '@/stores/reportStore'
import { useDocx } from '@/composables/useDocx'

const gallery = useGalleryStore()
const report = useReportStore()
const { generateDocx, saveDocument } = useDocx()

const selectedPhotos = ref<string[]>([])
const selectAllPhotos = ref(false)
const isGenerating = ref(false)

const selectedPhotosCount = computed(() => selectedPhotos.value.length)
const canGenerateReport = computed(() => {
  return report.hasTemplate && 
         selectedPhotos.value.length > 0 && 
         gallery.photos.length > 0
})

// Watch selectAllPhotos checkbox
watch(selectAllPhotos, (newValue) => {
  if (newValue) {
    selectedPhotos.value = gallery.photos.map(p => p.id)
  } else {
    selectedPhotos.value = []
  }
})

// Update selectAllPhotos when individual selections change
watch(selectedPhotos, (newValue) => {
  selectAllPhotos.value = newValue.length === gallery.photos.length
}, { deep: true })

function togglePhotoSelection(photoId: string) {
  const index = selectedPhotos.value.indexOf(photoId)
  if (index === -1) {
    selectedPhotos.value.push(photoId)
  } else {
    selectedPhotos.value.splice(index, 1)
  }
}

async function setTemplate(file: File) {
  try {
    await report.setTemplate(file)
    const toast = await toastController.create({
      message: 'Template set successfully',
      duration: 2000,
      color: 'success',
      position: 'bottom'
    })
    await toast.present()
  } catch (err) {
    console.error('[ReportsPage] Error setting template:', err)
    handleError(err instanceof Error ? err : new Error('Failed to set template'))
  }
}

async function clearTemplate() {
  try {
    await report.clearTemplate()
    selectedPhotos.value = []
    selectAllPhotos.value = false
  } catch (err) {
    console.error('[ReportsPage] Error clearing template:', err)
  }
}

async function generateReport() {
  if (!report.template || selectedPhotos.value.length === 0) {
    return
  }

  try {
    isGenerating.value = true
    report.setGenerating(true)

    // Get selected photos as base64
    const selectedPhotoObjects = gallery.photos.filter(p => 
      selectedPhotos.value.includes(p.id)
    )

    // Generate document
    const docBlob = await generateDocx({
      templateFile: report.template.file,
      photos: selectedPhotoObjects.map(p => p.path)
    })

    // Save document
    const fileName = `Report-${new Date().getTime()}.docx`
    await saveDocument(docBlob, fileName)

    const toast = await toastController.create({
      message: 'Report generated successfully',
      duration: 2000,
      color: 'success',
      position: 'bottom'
    })
    await toast.present()
  } catch (err) {
    console.error('[ReportsPage] Error generating report:', err)
    handleError(err instanceof Error ? err : new Error('Failed to generate report'))
  } finally {
    isGenerating.value = false
    report.setGenerating(false)
  }
}

async function handleError(error: Error) {
  console.error('[ReportsPage] Error:', error.message)
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
    return new Date(dateString).toLocaleDateString('es-ES', {
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
</script>

<style scoped>
ion-card-title {
  display: flex;
  align-items: center;
  gap: 8px;
}
</style>
