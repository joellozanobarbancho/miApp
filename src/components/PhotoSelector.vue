<template>
  <div class="photo-selector">
    <ion-button 
      expand="block" 
      class="ion-margin-bottom"
      @click="takeNewPhoto"
      :disabled="isLoading || !canAddMore"
    >
      <ion-icon :icon="cameraOutline" slot="start"></ion-icon>
      Take Photo ({{ photoCount }}/18)
    </ion-button>

    <ion-button 
      expand="block" 
      class="ion-margin-bottom"
      color="secondary"
      @click="pickFromGallery"
      :disabled="isLoading || !canAddMore"
    >
      <ion-icon :icon="imageOutline" slot="start"></ion-icon>
      Pick from Gallery
    </ion-button>

    <ion-button 
      expand="block" 
      color="tertiary"
      @click="pickMultiple"
      :disabled="isLoading || !canAddMore"
    >
      <ion-icon :icon="imagesOutline" slot="start"></ion-icon>
      Pick Multiple (Bulk)
    </ion-button>

    <!-- Warning when max photos reached -->
    <ion-note v-if="!canAddMore" color="warning" class="ion-margin-top ion-display-flex ion-justify-content-center">
      <ion-icon :icon="warningOutline" slot="start" class="ion-margin-end"></ion-icon>
      Maximum 18 photos reached
    </ion-note>

    <!-- Loading indicator -->
    <ion-progress-bar 
      v-if="isLoading"
      type="indeterminate"
      class="ion-margin-top"
    ></ion-progress-bar>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { 
  IonButton, 
  IonIcon,
  IonNote,
  IonProgressBar,
  toastController
} from '@ionic/vue'
import { 
  cameraOutline, 
  imageOutline, 
  imagesOutline,
  warningOutline
} from 'ionicons/icons'
import { useCamera } from '@/composables/useCamera'

interface Props {
  photoCount?: number
  isLoading?: boolean
  maxPhotos?: number
}

interface Emits {
  photosTaken: [photos: string[]]
  error: [error: Error]
}

const props = withDefaults(defineProps<Props>(), {
  photoCount: 0,
  isLoading: false,
  maxPhotos: 18
})

const emit = defineEmits<Emits>()

const { takePhoto, pickPhoto, pickMultiplePhotos } = useCamera()

const canAddMore = computed(() => props.photoCount < props.maxPhotos)

async function takeNewPhoto() {
  try {
    const base64Photo = await takePhoto()
    emit('photosTaken', [base64Photo])
    
    const toast = await toastController.create({
      message: 'Photo captured',
      duration: 1500,
      position: 'bottom'
    })
    await toast.present()
  } catch (err) {
    console.error('[PhotoSelector] Error taking photo:', err)
    emit('error', err instanceof Error ? err : new Error('Failed to take photo'))
    
    const toast = await toastController.create({
      message: 'Error taking photo',
      duration: 2000,
      color: 'danger',
      position: 'bottom'
    })
    await toast.present()
  }
}

async function pickFromGallery() {
  try {
    const base64Photo = await pickPhoto()
    emit('photosTaken', [base64Photo])
    
    const toast = await toastController.create({
      message: 'Photo selected',
      duration: 1500,
      position: 'bottom'
    })
    await toast.present()
  } catch (err) {
    console.error('[PhotoSelector] Error picking photo:', err)
    emit('error', err instanceof Error ? err : new Error('Failed to pick photo'))
  }
}

async function pickMultiple() {
  try {
    const photos = await pickMultiplePhotos()
    
    if (photos.length === 0) {
      const toast = await toastController.create({
        message: 'No photos selected',
        duration: 1500,
        position: 'bottom'
      })
      await toast.present()
      return
    }

    emit('photosTaken', photos)
    
    const toast = await toastController.create({
      message: `${photos.length} photos selected`,
      duration: 1500,
      position: 'bottom'
    })
    await toast.present()
  } catch (err) {
    console.error('[PhotoSelector] Error picking multiple photos:', err)
    emit('error', err instanceof Error ? err : new Error('Failed to pick photos'))
  }
}
</script>

<style scoped>
.photo-selector {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

ion-note {
  border-radius: 4px;
  padding: 8px;
  background: rgba(255, 193, 7, 0.1);
}
</style>
