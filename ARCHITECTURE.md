# miApp - Estructura Refactorizada

## 📋 Descripción General

El proyecto ha sido refactorizado siguiendo principios de separación de responsabilidades y arquitectura de componentes moderna con Vue 3 + TypeScript.

## 🏗️ Estructura de Carpetas

```
src/
├── stores/                 # Pinia stores
│   ├── galleryStore.ts    # Gestión de fotos (Filesystem + Preferences)
│   └── reportStore.ts     # Gestión de plantillas y reportes
│
├── views/                  # Vistas principales
│   ├── GalleryPage.vue    # Galería de fotos
│   ├── ReportPage.vue     # Generación de reportes
│   └── TabsPage.vue       # Contenedor de tabs
│
├── components/            # Componentes reutilizables
│   ├── PhotoGrid.vue      # Grid de fotos con modal
│   ├── PhotoSelector.vue  # Controles de cámara/galería
│   └── TemplateUploader.vue # Carga de plantillas
│
├── composables/           # Composables (lógica reutilizable)
│   ├── useCamera.ts       # Interfaz de cámara
│   └── useDocx.ts         # Generación de documentos
│
├── router/                # Configuración de rutas
├── theme/                 # Estilos globales
└── main.ts               # Punto de entrada
```

## 📦 Stores (Pinia)

### `galleryStore.ts`
Maneja la persistencia y recuperación de fotos.

```typescript
import { useGalleryStore } from '@/stores/galleryStore'

const gallery = useGalleryStore()

// Propiedades
gallery.photos          // Array de fotos (GalleryPhoto[])
gallery.photoCount      // Getter: número de fotos
gallery.canAddMorePhotos // Getter: validar límite de 18 fotos

// Métodos
await gallery.loadPhotos()              // Cargar fotos guardadas
await gallery.addPhoto(base64Data)      // Agregar una foto
await gallery.addMultiplePhotos([...])  // Agregar múltiples fotos
await gallery.deletePhoto(photoId)      // Eliminar una foto
await gallery.savePhotos()              // Guardar en Preferences
```

### `reportStore.ts`
Maneja la plantilla y metadatos del reporte.

```typescript
import { useReportStore } from '@/stores/reportStore'

const report = useReportStore()

// Propiedades
report.template         // ReportTemplate | null
report.isGenerating     // boolean

// Getters
report.hasTemplate      // boolean
report.templateName     // string | null

// Métodos
await report.loadTemplate()     // Cargar plantilla guardada
await report.setTemplate(file)  // Guardar nueva plantilla
await report.clearTemplate()    // Eliminar plantilla
report.setGenerating(boolean)   // Actualizar estado
```

## 🎨 Componentes

### `PhotoGrid.vue`
Muestra un grid de fotos (2 columnas) con modal de detalles.

**Props:**
```typescript
photos: GalleryPhoto[]
loading?: boolean
```

**Eventos:**
```typescript
select(photo: GalleryPhoto)  // Foto seleccionada
delete(photoId: string)     // Solicitud de eliminar foto
```

**Uso:**
```vue
<photo-grid
  :photos="gallery.photos"
  @select="selectPhoto"
  @delete="deletePhoto"
/>
```

### `PhotoSelector.vue`
Controles para capturar, seleccionar y cargar fotos en lote.

**Props:**
```typescript
photoCount?: number      // Cantidad actual de fotos (default: 0)
isLoading?: boolean      // Mostrar indicador de carga (default: false)
maxPhotos?: number       // Límite máximo (default: 18)
```

**Eventos:**
```typescript
photosTaken(photos: string[])  // Fotos en base64
error(error: Error)            // Error al procesar fotos
```

**Uso:**
```vue
<photo-selector
  :photo-count="gallery.photoCount"
  :is-loading="isLoading"
  @photos-taken="addPhotos"
  @error="handleError"
/>
```

### `TemplateUploader.vue`
Carga y valida archivos de plantilla (DOCX, XLSX).

**Props:**
```typescript
templateName?: string | null   // Nombre del archivo cargado
isLoading?: boolean            // Estado de carga
```

**Eventos:**
```typescript
templateSelected(file: File)   // Archivo seleccionado
templateCleared()              // Plantilla eliminada
error(error: Error)            // Error en la validación
```

**Uso:**
```vue
<template-uploader
  :template-name="report.templateName"
  @template-selected="setTemplate"
  @template-cleared="clearTemplate"
  @error="handleError"
/>
```

## 🎯 Composables

### `useCamera.ts`
Abstrae la API de Capacitor Camera.

```typescript
import { useCamera } from '@/composables/useCamera'

const { takePhoto, pickPhoto, pickMultiplePhotos } = useCamera()

// Capturar foto con cámara
const base64 = await takePhoto()

// Seleccionar una foto de la galería
const base64 = await pickPhoto()

// Seleccionar múltiples fotos (hasta 18)
const photos = await pickMultiplePhotos()
```

### `useDocx.ts`
Maneja la generación y guardado de documentos.

```typescript
import { useDocx } from '@/composables/useDocx'

const { generateDocx, saveDocument, shareDocument } = useDocx()

// Generar documento desde plantilla
const docBlob = await generateDocx({
  templateFile: reportTemplate,
  photos: ['base64photo1', 'base64photo2'],
  templateData: { name: 'John', date: '2024-01-01' }
})

// Guardar documento
const filePath = await saveDocument(docBlob, 'Report.docx')

// Compartir documento
await shareDocument(filePath, 'Report.docx')
```

## 📄 Tipos TypeScript

### `GalleryPhoto`
```typescript
type GalleryPhoto = {
  id: string          // Identificador único
  path: string        // Ruta web para visualizar
  date: string        // ISO 8601 timestamp
  storagePath?: string // Ruta en el almacenamiento del dispositivo
}
```

### `ReportTemplate`
```typescript
type ReportTemplate = {
  id: string          // Identificador único
  name: string        // Nombre del archivo
  file: File          // Objeto File (no se serializa)
  uploadedAt: string  // ISO 8601 timestamp
}
```

## 🔄 Flujo de Datos

### Añadir Fotos (GalleryPage)
1. Usuario interactúa con `PhotoSelector`
2. Composable `useCamera` captura/selecciona foto(s)
3. Base64 se emite como evento `photosTaken`
4. `GalleryPage` llama a `gallery.addPhoto()` o `gallery.addMultiplePhotos()`
5. Store persiste en Filesystem y Preferences

### Generar Reporte (ReportPage)
1. Usuario carga plantilla vía `TemplateUploader`
2. Store guarda metadata de la plantilla
3. Usuario selecciona fotos del grid
4. Al hacer click en "Generate Report":
   - Composable `useDocx` genera el documento
   - `saveDocument` lo persiste en Documents
   - Toast confirma éxito o error

## ⚙️ Instalación de Dependencias

Para utilizar completamente los composables, instala:

```bash
npm install docxtemplater pizzip
npm install @types/docxtemplater @types/pizzip --save-dev
```

## 📝 Límites

- **Máximo de fotos:** 18 por proyecto
- **Formatos de plantilla:** .docx, .doc, .xlsx, .xls
- **Tamaño máximo de plantilla:** 10MB
- **Calidad de foto:** 80% (comprimida)

## 🐛 Debugging

Todos los módulos incluyen logs con prefijos:
- `[GalleryPage]` - Vista de galería
- `[ReportPage]` - Vista de reportes
- `[PhotoGrid]` - Componente grid
- `[PhotoSelector]` - Selector de fotos
- `[TemplateUploader]` - Cargador de plantillas
- `[useCamera]` - Composable de cámara
- `[useDocx]` - Composable de documentos
- `[GalleryStore]` - Store de fotos
- `[ReportStore]` - Store de reportes

Abre la consola del navegador (DevTools) para ver todos los logs.

## 🚀 Próximos Pasos

1. **Agregar validaciones adicionales** en los componentes
2. **Implementar descarga/compartir** de reportes
3. **Agregar edición de metadatos** de fotos
4. **Incluir preview de plantillas** antes de generar
5. **Agregar sincronización en nube** (opcional)

## 📚 Referencias

- [Vue 3 Documentation](https://vuejs.org/)
- [Pinia Documentation](https://pinia.vuejs.org/)
- [Ionic Vue](https://ionicframework.com/docs/vue/)
- [Capacitor Plugins](https://capacitorjs.com/docs/plugins/)
