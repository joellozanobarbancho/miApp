<template>
  <div class="template-uploader">
    <ion-item button @click="selectTemplate" class="ion-margin-bottom">
      <ion-icon :icon="documentAttachOutline" slot="start"></ion-icon>
      <ion-label>
        <p v-if="!templateName" class="ion-margin">Upload PDF template</p>
        <p v-else>{{ templateName }}</p>
      </ion-label>
      <ion-icon 
        v-if="templateName" 
        :icon="checkmarkCircleOutline"
        color="success"
        slot="end"
      ></ion-icon>
    </ion-item>

    <ion-note v-if="templateName" color="success" class="ion-margin">
      <ion-icon :icon="checkmarkOutline" slot="start"></ion-icon>
      Template uploaded successfully
    </ion-note>

    <ion-button
      expand="block"
      class="ion-margin-top"
      color="danger"
      @click="clearTemplate"
      v-if="templateName"
      fill="outline"
    >
      <ion-icon :icon="trashOutline" slot="start"></ion-icon>
      Clear template
    </ion-button>

    <input
      ref="fileInput"
      type="file"
      accept=".docx,.doc,.xlsx,.xls"
      style="display: none"
      @change="handleFileSelect"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { 
  IonItem,
  IonLabel,
  IonIcon,
  IonNote,
  IonButton,
  toastController
} from '@ionic/vue'
import { 
  documentAttachOutline,
  checkmarkCircleOutline,
  checkmarkOutline,
  trashOutline
} from 'ionicons/icons'

interface Props {
  templateName?: string | null
  isLoading?: boolean
}

interface Emits {
  templateSelected: [file: File]
  templateCleared: []
  error: [error: Error]
}

const props = withDefaults(defineProps<Props>(), {
  templateName: null,
  isLoading: false
})

const emit = defineEmits<Emits>()

const fileInput = ref<HTMLInputElement>()

const hasTemplate = computed(() => !!props.templateName)

function selectTemplate() {
  fileInput.value?.click()
}

async function handleFileSelect(event: Event) {
  try {
    const input = event.target as HTMLInputElement
    const file = input.files?.[0]

    if (!file) return

    // Validate file type
    const validTypes = [
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel'
    ]

    if (!validTypes.includes(file.type)) {
      throw new Error('Invalid file type. Please upload a Word or Excel document.')
    }

    // Validate file size (max 10MB)
    const maxSize = 10 * 1024 * 1024
    if (file.size > maxSize) {
      throw new Error('File is too large. Maximum size is 10MB.')
    }

    emit('templateSelected', file)

    const toast = await toastController.create({
      message: `Template loaded: ${file.name}`,
      duration: 2000,
      position: 'bottom',
      color: 'success'
    })
    await toast.present()

    // Reset file input
    if (input) input.value = ''
  } catch (err) {
    console.error('[TemplateUploader] Error selecting template:', err)
    emit('error', err instanceof Error ? err : new Error('Failed to select template'))

    const toast = await toastController.create({
      message: err instanceof Error ? err.message : 'Error loading template',
      duration: 3000,
      position: 'bottom',
      color: 'danger'
    })
    await toast.present()
  }
}

async function clearTemplate() {
  emit('templateCleared')

  const toast = await toastController.create({
    message: 'Template cleared',
    duration: 1500,
    position: 'bottom'
  })
  await toast.present()
}
</script>

<style scoped>
.template-uploader {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

ion-note {
  border-radius: 4px;
  padding: 8px;
  background: rgba(76, 175, 80, 0.1);
}
</style>
