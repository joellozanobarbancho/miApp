declare module 'docxtemplater-image-module-free' {
  export default class ImageModule {
    constructor(options?: Record<string, any>)
  }
}

declare module 'docxtemplater' {
  export default class Docxtemplater {
    constructor(zip: any, options?: Record<string, any>)
    render(data?: Record<string, any>): void
    getZip(): any
  }
}

declare module 'pizzip' {
  export default class PizZip {
    constructor(data: ArrayBuffer | Buffer)
    generate(options?: { type: string }): Blob
  }
}
