'use client'

export function getPdfRenderScale() {
  const memory = (navigator as Navigator & { deviceMemory?: number }).deviceMemory || 8
  return memory <= 4 || window.innerWidth < 768 ? 3 : 4
}

export function getInvoicePdfRenderScale() {
  const memory = (navigator as Navigator & { deviceMemory?: number }).deviceMemory || 8
  return memory <= 4 || window.innerWidth < 768 ? 1.75 : 2
}

function importPdfLibraries() {
  return Promise.all([import('html2canvas'), import('jspdf')])
}

let pdfLibrariesPromise: ReturnType<typeof importPdfLibraries> | null = null

export function loadPdfLibraries() {
  pdfLibrariesPromise ||= importPdfLibraries()
  return pdfLibrariesPromise
}

export async function waitForPdfAssets(elements: HTMLElement | HTMLElement[]) {
  const targets = Array.isArray(elements) ? elements : [elements]
  const images = targets.flatMap((element) => Array.from(element.querySelectorAll('img')))
  await Promise.all(images.map((image) => image.complete ? Promise.resolve() : new Promise<void>((resolve) => {
    image.addEventListener('load', () => resolve(), { once: true })
    image.addEventListener('error', () => resolve(), { once: true })
  })))
  await targets[0]?.ownerDocument.fonts?.ready
  const view = targets[0]?.ownerDocument.defaultView
  if (view) {
    await new Promise<void>((resolve) => view.requestAnimationFrame(() => view.requestAnimationFrame(() => resolve())))
  }
}

export function releasePdfCanvas(canvas: HTMLCanvasElement) {
  canvas.width = 1
  canvas.height = 1
}
