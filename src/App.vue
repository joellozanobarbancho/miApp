<template>
  <ion-app>
    <ion-router-outlet />
  </ion-app>
</template>

<script setup lang="ts">
import { IonApp, IonRouterOutlet } from '@ionic/vue';
import { onMounted } from 'vue';
import { App } from '@capacitor/app';

onMounted(() => {
  // Handle app restoration when camera activity is dismissed
  App.addListener('appRestoredResult', (result) => {
    console.log('[App] appRestoredResult:', result);
  });
});
</script>
