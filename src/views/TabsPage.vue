<template>
  <ion-page>
    <ion-tabs>
      <ion-router-outlet :key="route.path"></ion-router-outlet>
      <ion-tab-bar slot="bottom">
        
        <ion-tab-button tab="gallery" href="/tabs/gallery">
          <ion-icon name="images" />
          <ion-label>Gallery</ion-label>
        </ion-tab-button>

        <ion-tab-button tab="reports" href="/tabs/reports">
          <ion-icon name="document-text" />
          <ion-label>Reports</ion-label>
        </ion-tab-button>

      </ion-tab-bar>
    </ion-tabs>
  </ion-page>
</template>

<script setup lang="ts">
import { useRoute } from 'vue-router'
import { 
  IonTabBar, 
  IonTabButton, 
  IonTabs, 
  IonLabel, 
  IonIcon, 
  IonPage, 
  IonRouterOutlet 
} from '@ionic/vue';

const route = useRoute()
</script>
