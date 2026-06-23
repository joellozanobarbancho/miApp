<template>
  <div class="photo-grid">
    <ion-grid>
      <ion-row>
        <ion-col
          v-for="photo in photos"
          :key="photo.id"
          size="6"
        >
          <div class="photo-item" @click="selectPhoto(photo)">
            <ion-img 
              :src="photo.path" 
              class="thumb"
            />
            <div class="photo-overlay">
              <ion-icon :icon="openOutline" class="icon"></ion-icon>
            </div>
          </div>
        </ion-col>
      </ion-row>
    </ion-grid>

    <!-- Photo Detail Modal -->
    <ion-modal 
      :is-open="selectedPhoto !== null" 
      @didDismiss="closePhoto"
      class="photo-modal"
    >
      <ion-header>
        <ion-toolbar>
          <ion-buttons slot="start">
            <ion-button @click="closePhoto">
              <ion-icon slot="icon-only" :icon="closeOutline"></ion-icon>
            </ion-button>
          </ion-buttons>
          <ion-title>Photo Details</ion-title>
          <ion-buttons slot="end">
            <ion-button 
              color="danger"
              @click="deletePhoto"
              :disabled="isDeleting"
            >
              <ion-icon slot="icon-only" :icon="trashOutline"></ion-icon>
            </ion-button>
          </ion-buttons>
        </ion-toolbar>
      </ion-header>
      
      <ion-content class="ion-padding">
        <ion-img 
          v-if="selectedPhoto"
          :src="selectedPhoto.path" 
          class="full-photo"
        />
        
        <ion-item v-if="selectedPhoto" lines="none" class="ion-margin-top">
          <ion-label>
            <p><strong>Date:</strong></p>
            <p>{{ formatDate(selectedPhoto.date) }}</p>
          </ion-label>
        </ion-item>
      </ion-content>
    </ion-modal>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { 
  IonGrid, 
  IonRow, 
  IonCol, 
  IonImg, 
  IonModal,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonButtons,
  IonButton,
  IonIcon,
  IonContent,
  IonItem,
  IonLabel,
  toastController
} from '@ionic/vue'
import { closeOutline, openOutline, trashOutline } from 'ionicons/icons'
import type { GalleryPhoto } from '@/stores/galleryStore'

interface Props {
  photos: GalleryPhoto[]
  loading?: boolean
}

interface Emits {
  select: [photo: GalleryPhoto]
  delete: [photoId: string]
}

withDefaults(defineProps<Props>(), {
  loading: false
})

const emit = defineEmits<Emits>()

const selectedPhoto = ref<GalleryPhoto | null>(null)
const isDeleting = ref(false)

function selectPhoto(photo: GalleryPhoto) {
  selectedPhoto.value = photo
  emit('select', photo)
}

function closePhoto() {
  selectedPhoto.value = null
}

async function deletePhoto() {
  if (!selectedPhoto.value) return

  try {
    isDeleting.value = true
    emit('delete', selectedPhoto.value.id)
    closePhoto()
    
    const toast = await toastController.create({
      message: 'Photo deleted',
      duration: 2000,
      position: 'bottom'
    })
    await toast.present()
  } finally {
    isDeleting.value = false
  }
}

function formatDate(dateString: string): string {
  try {
    return new Date(dateString).toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'long',
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
.photo-grid {
  width: 100%;
}

.photo-item {
  position: relative;
  cursor: pointer;
  aspect-ratio: 1;
  border-radius: 8px;
  overflow: hidden;
}

.thumb {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.photo-overlay {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.3);
  opacity: 0;
  transition: opacity 0.3s ease;
}

.photo-item:hover .photo-overlay {
  opacity: 1;
}

.photo-overlay .icon {
  font-size: 32px;
  color: white;
}

.full-photo {
  max-width: 100%;
  max-height: 70vh;
  margin: 0 auto;
}

.photo-modal::part(content) {
  display: flex;
  flex-direction: column;
  align-items: center;
}
</style>
