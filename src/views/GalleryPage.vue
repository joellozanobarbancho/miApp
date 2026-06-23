<template>
  <ion-page>
    <ion-header>
      <ion-toolbar>
        <ion-title>Gallery</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content class="ion-padding">
      <!-- Photo Counter -->
      <ion-note class="ion-display-flex ion-justify-content-between ion-align-items-center">
        <span><strong>{{ gallery.photoCount }}</strong> photos</span>
      </ion-note>

      <!-- Photo Selector Component -->
      <photo-selector
        :is-loading="isLoading"
        @photos-taken="addPhotos"
        @error="handleError"
        class="ion-margin-bottom"
      />

      <!-- Photo Grid Component -->
      <div v-if="gallery.photos.length > 0" class="ion-margin-top">
        <photo-grid
          :photos="gallery.photos"
          @select="selectPhoto"
          @delete="deletePhoto"
        />
      </div>

      <!-- Empty State -->
      <ion-card v-else class="ion-text-center ion-padding">
        <ion-card-header>
          <ion-card-title>No photos yet</ion-card-title>
        </ion-card-header>
        <ion-card-content>
          <p>Start by taking or selecting photos using the buttons above.</p>
        </ion-card-content>
      </ion-card>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { App } from '@capacitor/app'
import { 
  IonPage, 
  IonHeader, 
  IonToolbar, 
  IonTitle, 
  IonContent,
  IonNote,
  IonCard,
  IonCardHeader,
  IonCardTitle,
  IonCardContent,
  toastController
} from '@ionic/vue'
import PhotoGrid from '@/components/PhotoGrid.vue'
import PhotoSelector from '@/components/PhotoSelector.vue'
import { useGalleryStore } from '@/stores/galleryStore'
import type { GalleryPhoto } from '@/stores/galleryStore'

const gallery = useGalleryStore()
const isLoading = ref(false)
const selectedPhoto = ref<GalleryPhoto | null>(null)

onMounted(async () => {
  console.log('[GalleryPage] Mounted, loading photos')
  await gallery.loadPhotos()

  // Handle app restoration after camera activity
  App.addListener('appStateChange', async (state) => {
    console.log('[GalleryPage] App state changed:', state.isActive)
    if (state.isActive) {
      console.log('[GalleryPage] App restored to foreground, reloading photos')
      await gallery.loadPhotos()
    }
  })
})

async function addPhotos(photos: string[]) {
  try {
    isLoading.value = true

    if (photos.length === 1) {
      await gallery.addPhoto(photos[0])
    } else {
      await gallery.addMultiplePhotos(photos)
    }
  } catch (err) {
    console.error('[GalleryPage] Error adding photos:', err)
    handleError(err instanceof Error ? err : new Error('Failed to add photos'))
  } finally {
    isLoading.value = false
  }
}

function selectPhoto(photo: GalleryPhoto) {
  selectedPhoto.value = photo
}

async function deletePhoto(photoId: string) {
  try {
    await gallery.deletePhoto(photoId)
    selectedPhoto.value = null
  } catch (err) {
    console.error('[GalleryPage] Error deleting photo:', err)
    handleError(err instanceof Error ? err : new Error('Failed to delete photo'))
  }
}

async function handleError(error: Error) {
  console.error('[GalleryPage] Error:', error.message)
  const toast = await toastController.create({
    message: error.message,
    duration: 3000,
    color: 'danger',
    position: 'bottom'
  })
  await toast.present()
}
</script>

<style scoped>
.thumb {
  width: 100%;
  height: 120px;
  object-fit: cover;
  border-radius: 8px;
}

.full-photo {
  width: 100%;
  height: auto;
  margin-top: 20px;
}

ion-fab {
  bottom: calc(env(safe-area-inset-bottom) + 90px);
  right: 20px;
}

ion-fab-button {
  --size: 60px;
}
</style>
