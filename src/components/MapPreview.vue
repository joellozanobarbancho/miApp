<template>
  <div v-if="src" class="map-wrapper">
    <img :src="src" class="map-image" />
  </div>

  <ion-text v-else color="medium">
    No hay mapa disponible
  </ion-text>
</template>

<script setup lang="ts">
defineProps<{ src: string | null }>();
</script>

<style scoped>
.map-wrapper {
  width: 100%;
  display: flex;
  justify-content: center;
}

.map-image {
  width: 100%;
  border-radius: 12px;
  box-shadow: 0 2px 10px rgba(0,0,0,0.2);
}
</style>
