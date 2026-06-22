<template>
  <ion-page>
    <ion-tabs>
      <ion-router-outlet></ion-router-outlet>
      <ion-tab-bar slot="bottom">
        
        <ion-tab-button tab="gallery" href="/tabs/gallery">
          <ion-icon name="images" />
          <ion-label>Gallery</ion-label>
        </ion-tab-button>

      <ion-tab-button tab="report" href="/tabs/report">
        <ion-icon name="document-text" />
        <ion-label>Reports</ion-label>
      </ion-tab-button>

      </ion-tab-bar>
    </ion-tabs>
  </ion-page>
</template>

<script setup lang="ts">
import { 
  IonTabBar, 
  IonTabButton, 
  IonTabs, 
  IonLabel, 
  IonIcon, 
  IonPage, 
  IonRouterOutlet 
} from '@ionic/vue';
</script>
