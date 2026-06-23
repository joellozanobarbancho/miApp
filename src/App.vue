<template>
  <ion-app>
    <ion-router-outlet />
  </ion-app>
</template>

<script setup lang="ts">
import { IonApp, IonRouterOutlet } from '@ionic/vue';
import { onMounted } from 'vue';
import { App } from '@capacitor/app';
import { useReportStore } from '@/stores/reportStore'

const reportStore = useReportStore()

onMounted(() => {
  void reportStore.loadFromStorage()

  // Handle app restoration when camera activity is dismissed
  App.addListener('appRestoredResult', (result) => {
    console.log('[App] appRestoredResult:', result);
  });
});
</script>
