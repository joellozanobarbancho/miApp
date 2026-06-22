<template>
  <ion-page>
    <ion-header>
      <ion-toolbar>
        <ion-title>Gallery</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content>

      <ion-grid>
        <ion-row>
          <ion-col
            v-for="photo in gallery.photos"
            :key="photo.id"
            size="6"
          >
            <ion-img 
              :src="photo.path" 
              class="thumb"
              @click="openPhoto(photo)"
            />
          </ion-col>
        </ion-row>
      </ion-grid>

      <ion-fab vertical="bottom" horizontal="end" slot="fixed">
        <ion-fab-button @click="takePhoto">
          <ion-icon :icon="cameraOutline"></ion-icon>
        </ion-fab-button>
      </ion-fab>

      <ion-modal :is-open="selectedPhoto !== null" @didDismiss="closePhoto">
        <ion-content class="ion-padding">

          <ion-button fill="clear" @click="closePhoto">
            <ion-icon :icon="closeOutline"></ion-icon>
          </ion-button>

          <ion-img 
            :src="selectedPhoto?.path" 
            class="full-photo"
          />

          <ion-button 
            color="danger" 
            expand="block" 
            @click="deleteSelectedPhoto"
          >
            <ion-icon :icon="trashOutline" slot="start"></ion-icon>
            Delete photo
          </ion-button>

        </ion-content>
      </ion-modal>

    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { Camera, CameraResultType } from '@capacitor/camera'
import { useGalleryStore } from '@/stores/gallery'
import { 
  IonFab, 
  IonFabButton, 
  IonIcon, 
  IonModal 
} from '@ionic/vue'

import { cameraOutline, closeOutline, trashOutline } from 'ionicons/icons'

const gallery = useGalleryStore()
const selectedPhoto = ref<any>(null)

onMounted(() => {
  gallery.loadPhotos()
})

async function takePhoto() {
  try {
    const image = await Camera.getPhoto({
      quality: 80,
      allowEditing: false,
      resultType: CameraResultType.Base64
    })

    if (image.base64String) {
      await gallery.addPhoto(image.base64String)
    }

  } catch (err) {
    console.error('Error al tomar la foto:', err)
  }
}

function openPhoto(photo) {
  selectedPhoto.value = photo
}

function closePhoto() {
  selectedPhoto.value = null
}

function deleteSelectedPhoto() {
  if (!selectedPhoto.value) return
  gallery.deletePhoto(selectedPhoto.value.id)
  selectedPhoto.value = null
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
