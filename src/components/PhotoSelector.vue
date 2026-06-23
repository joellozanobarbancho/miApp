<template>
  <div class="photo-selector">
    <ion-button 
      expand="block" 
      class="ion-margin-bottom"
      @click="takeNewPhoto"
      :disabled="isLoading"
    >
      <ion-icon :icon="cameraOutline" slot="start"></ion-icon>
      Take Photo
    </ion-button>

    <ion-button 
      expand="block" 
      @click="pickFromGallery"
      :disabled="isLoading"
    >
      <ion-icon :icon="imagesOutline" slot="start"></ion-icon>
      Pick from Gallery
    </ion-button>

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
  IonProgressBar,
  toastController
} from '@ionic/vue'
import { 
  cameraOutline, 
  imagesOutline
} from 'ionicons/icons'
import { useCamera } from '@/composables/useCamera'

interface Props {
  isLoading?: boolean
}

interface Emits {
  photosTaken: [photos: string[]]
  error: [error: Error]
}

const props = withDefaults(defineProps<Props>(), {
  isLoading: false,
})

const emit = defineEmits<Emits>()

const { takePhoto, pickMultiplePhotos } = useCamera()

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
</style>
