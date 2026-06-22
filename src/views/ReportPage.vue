<template>
  <ion-page>
    <ion-header>
      <ion-toolbar>
        <ion-title>Reports</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content class="ion-padding">

      <!-- Upload PDF sheet -->
      <ion-item button @click="selectTemplate">
        <ion-icon name="document-attach" slot="start"></ion-icon>
        <ion-label>
          {{ templateName || 'Upload PDF template' }}
        </ion-label>
      </ion-item>

      <ion-note v-if="templateName" color="medium" class="ion-margin-top">
        Selected template: {{ templateName }}
      </ion-note>

      <!-- Generate report -->
      <ion-button
        expand="block"
        class="ion-margin-top"
        :disabled="!templateFile"
        @click="generateReport"
      >
        Generate report
      </ion-button>

    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { Filesystem, Directory } from '@capacitor/filesystem'
import { 
  IonPage, 
  IonHeader, 
  IonToolbar, 
  IonTitle, 
  IonContent, 
  IonItem, 
  IonLabel, 
  IonButton, 
  IonButtons,
  IonNote, 
  IonIcon 
} from '@ionic/vue'

const templateFile = ref<File | null>(null)
const templateName = ref<string | null>(null)

async function selectTemplate() {
  const input = document.createElement('input')
  input.type = 'file'
  input.accept = 'application/pdf'

  input.onchange = async () => {
    const file = input.files?.[0]
    if (!file) return

    templateFile.value = file
    templateName.value = file.name
  }

  input.click()
}

async function generateReport() {
  console.log('Generating report with template:', templateName.value)
}
</script>
