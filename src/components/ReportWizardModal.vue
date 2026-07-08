<template>
  <ion-modal :is-open="isOpen" @didDismiss="handleDismiss">
    <ion-header>
      <ion-toolbar>
        <ion-title>{{ currentStep?.title ?? 'Generate report' }}</ion-title>
        <ion-buttons slot="end">
          <ion-button @click="handleDismiss">Close</ion-button>
        </ion-buttons>
      </ion-toolbar>
      <ion-progress-bar :value="progress"></ion-progress-bar>
    </ion-header>

    <ion-content class="ion-padding wizard-content">
      <p class="step-counter">Step {{ currentStepIndex + 1 }} of {{ steps.length }} — {{ currentStep?.sheetName }}</p>
      <p v-if="currentStep?.description" class="step-description">{{ currentStep.description }}</p>

      <ion-card v-if="currentStep?.isAddressStep" class="location-card">
        <ion-card-content>
          <ion-button expand="block" fill="outline" :disabled="isLocating" @click="useMyLocation">
            <ion-spinner v-if="isLocating" name="crescent" slot="start"></ion-spinner>
            <ion-icon v-else :icon="locateOutline" slot="start"></ion-icon>
            {{ isLocating ? 'Locating…' : 'Use my location to fill Indirizzo/Comune' }}
          </ion-button>
        </ion-card-content>
      </ion-card>

      <ion-list v-if="currentStep && currentStep.fields.length > 0" class="fields-list">
        <template v-for="field in currentStep.fields" :key="field.id">
          <ion-item v-if="field.type === 'checkbox'">
            <ion-label>
              {{ field.label }}
              <span v-if="!field.verified" class="unverified-pill">verify cell</span>
            </ion-label>

            <ion-checkbox
              slot="end"
              :checked="getValue(currentStep.sheetName, field.id) === 'true'"
              @ionChange="(e: CustomEvent) => setValue(currentStep!.sheetName, field.id, ((e.target as HTMLIonCheckboxElement).checked ? 'true' : ''))"
            ></ion-checkbox>
          </ion-item>

          <ion-item v-else>
            <ion-label position="stacked">
              {{ field.label }}
              <span v-if="!field.verified" class="unverified-pill">verify cell</span>
            </ion-label>

            <ion-textarea
              v-if="field.type === 'textarea'"
              :model-value="getValue(currentStep.sheetName, field.id)"
              :placeholder="field.placeholder"
              auto-grow
              @ionInput="(e: CustomEvent) => setValue(currentStep!.sheetName, field.id, (e.target as HTMLTextAreaElement).value)"
            ></ion-textarea>

            <ion-input
              v-else
              :type="field.type === 'date' ? 'date' : 'text'"
              :model-value="getValue(currentStep.sheetName, field.id)"
              :placeholder="field.placeholder"
              @ionInput="(e: CustomEvent) => setValue(currentStep!.sheetName, field.id, (e.target as HTMLInputElement).value)"
            ></ion-input>
          </ion-item>
        </template>
      </ion-list>

      <div v-if="currentStepSlots.length > 0" class="slots-section">
        <h3>Photos for this page</h3>
        <div class="slot-grid">
          <article v-for="slot in currentStepSlots" :key="slot.id" class="slot-card">
            <div class="slot-preview">
              <img :src="imageSelections[slot.id]?.dataUrl ?? slot.thumbnailDataUrl" :alt="slot.originalFileName" />
            </div>
            <div class="slot-actions">
              <ion-button size="small" @click="$emit('select-image', slot.id)">Select photo</ion-button>
              <ion-button size="small" fill="outline" @click="$emit('use-location-for-slot', slot.id)">
                Use my location
              </ion-button>
            </div>
          </article>
        </div>
      </div>

      <p v-if="currentStep && currentStep.fields.length === 0 && currentStepSlots.length === 0" class="empty-step">
        No editable data on this page. Continue to the next step.
      </p>
    </ion-content>

    <ion-footer>
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-button :disabled="currentStepIndex === 0" @click="goBack">Back</ion-button>
        </ion-buttons>
        <ion-buttons slot="end">
          <ion-button v-if="!isLastStep" @click="goNext">Next</ion-button>
          <ion-button v-else :disabled="isFinishing" @click="finish" color="primary" fill="solid">
            <ion-spinner v-if="isFinishing" name="crescent" slot="start"></ion-spinner>
            {{ isFinishing ? 'Generating…' : 'Generate report' }}
          </ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-footer>
  </ion-modal>
</template>

<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import {
  IonModal,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonButtons,
  IonButton,
  IonContent,
  IonFooter,
  IonList,
  IonItem,
  IonLabel,
  IonInput,
  IonTextarea,
  IonCheckbox,
  IonCard,
  IonCardContent,
  IonIcon,
  IonSpinner,
  IonProgressBar
} from '@ionic/vue'
import { locateOutline } from 'ionicons/icons'
import { PLANTILLA3_STEPS } from '@/config/plantillaFields'
import type { TemplateSlot } from '@/composables/useTemplateScanner'
import type { ReportSlotSelection } from '@/composables/useReportGenerator'
import { useMap } from '@/composables/useMap'
import type { SheetValues } from '@/composables/useTemplateWriter'

const props = defineProps<{
  isOpen: boolean
  slots: TemplateSlot[]
  imageSelections: Record<string, ReportSlotSelection>
}>()

const emit = defineEmits<{
  (e: 'update:isOpen', value: boolean): void
  (e: 'select-image', slotId: string): void
  (e: 'use-location-for-slot', slotId: string): void
  (e: 'finish', valuesBySheet: Record<string, SheetValues>): void
}>()

const steps = PLANTILLA3_STEPS
const currentStepIndex = ref(0)
const isLocating = ref(false)
const isFinishing = ref(false)

// draftValues[sheetName][fieldId] = value
const draftValues = reactive<Record<string, Record<string, string>>>({})

const currentStep = computed(() => steps[currentStepIndex.value])
const isLastStep = computed(() => currentStepIndex.value === steps.length - 1)
const progress = computed(() => (currentStepIndex.value + 1) / steps.length)

const currentStepSlots = computed(() => {
  if (!currentStep.value) return []
  return props.slots.filter((slot) => slot.sheetName === currentStep.value!.sheetName)
})

watch(
  () => props.isOpen,
  (open) => {
    if (open) currentStepIndex.value = 0
  }
)

function getValue(sheetName: string, fieldId: string) {
  return draftValues[sheetName]?.[fieldId] ?? ''
}

function setValue(sheetName: string, fieldId: string, value: string) {
  if (!draftValues[sheetName]) draftValues[sheetName] = {}
  draftValues[sheetName][fieldId] = value
}

function goBack() {
  if (currentStepIndex.value > 0) currentStepIndex.value -= 1
}

function goNext() {
  if (currentStepIndex.value < steps.length - 1) currentStepIndex.value += 1
}

function handleDismiss() {
  emit('update:isOpen', false)
}

async function useMyLocation() {
  isLocating.value = true
  try {
    const { Geolocation } = await import('@capacitor/geolocation')
    const pos = await Geolocation.getCurrentPosition({ enableHighAccuracy: true, timeout: 12000 })
    const { reverseGeocode } = useMap()
    const { indirizzo, comune } = await reverseGeocode(pos.coords.latitude, pos.coords.longitude)

    if (currentStep.value) {
      if (indirizzo) setValue(currentStep.value.sheetName, 'indirizzo', indirizzo)
      if (comune) setValue(currentStep.value.sheetName, 'comune', comune)
    }
  } catch (err) {
    console.error('[ReportWizardModal] Unable to use location:', err)
  } finally {
    isLocating.value = false
  }
}

// Vuelca draftValues -> { sheetName: { cellRef: value } }, aplicando la
// propagación del bloque de identificación (indirizzo, comune, etc.) a las
// hojas que lo repiten (sommario, inquadramento, vista 1-5).
function buildValuesBySheet(): Record<string, SheetValues> {
  const result: Record<string, SheetValues> = {}
  const address = draftValues['testalino'] ?? {}

  for (const step of steps) {
    const sheetValues: SheetValues = {}

    for (const field of step.fields) {
      const value = draftValues[step.sheetName]?.[field.id]
      if (!value) continue

      sheetValues[field.cellRef] = field.type === 'checkbox' ? '■' : value
    }

    if (step.headerBlock) {
      if (address.codiceSito) sheetValues[step.headerBlock.codiceSito] = address.codiceSito
      if (address.nomeSito) sheetValues[step.headerBlock.nomeSito] = address.nomeSito
      if (address.indirizzo) sheetValues[step.headerBlock.indirizzo] = address.indirizzo
      if (address.comune) sheetValues[step.headerBlock.comune] = address.comune
      if (address.dataSopralluogo) sheetValues[step.headerBlock.dataSopralluogo] = address.dataSopralluogo
    }

    result[step.sheetName] = sheetValues
  }

  return result
}

async function finish() {
  isFinishing.value = true
  try {
    emit('finish', buildValuesBySheet())
  } finally {
    isFinishing.value = false
  }
}

defineExpose({ resetDraft: () => Object.keys(draftValues).forEach((k) => delete draftValues[k]) })
</script>

<style scoped>
.wizard-content {
  --background: #f5f8fc;
}

.step-counter {
  margin: 0 0 4px;
  font-size: 0.8rem;
  color: #6a7784;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.step-description {
  margin: 0 0 16px;
  color: #45505c;
}

.location-card {
  border-radius: 16px;
  margin-bottom: 16px;
}

.fields-list {
  background: transparent;
}

.unverified-pill {
  margin-left: 6px;
  font-size: 10px;
  text-transform: uppercase;
  color: #b5751a;
  background: #fdf1de;
  padding: 2px 6px;
  border-radius: 999px;
}

.slots-section {
  margin-top: 20px;
}

.slots-section h3 {
  margin: 0 0 10px;
  font-size: 1rem;
}

.slot-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 12px;
}

.slot-card {
  background: #fff;
  border-radius: 14px;
  padding: 10px;
  box-shadow: 0 8px 20px rgba(20, 36, 55, 0.06);
}

.slot-preview {
  aspect-ratio: 4 / 3;
  border-radius: 10px;
  overflow: hidden;
  margin-bottom: 8px;
}

.slot-preview img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.slot-actions {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.empty-step {
  color: #6a7784;
  text-align: center;
  margin-top: 40px;
}
</style>
