import { supabase } from './supabase'
import type { LotSide } from './lotShape'

export interface ReadLotShapeResult {
  found: boolean
  sides: LotSide[]
  lot_area_sqm: number | null
  lot_label: string | null
  notes: string
}

// Long edge in pixels. Big enough for small typewriter text, small enough to upload quickly.
const MAX_IMAGE_EDGE = 2576
const MAX_PDF_BYTES = 18 * 1024 * 1024

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result).split(',')[1] ?? '')
    reader.onerror = () => reject(new Error('The file could not be read.'))
    reader.readAsDataURL(blob)
  })
}

// Phone photos are often 10+ MB: shrink them to a size the reader handles well, as JPEG.
async function prepareImage(blob: Blob): Promise<{ base64: string; mediaType: string }> {
  const url = URL.createObjectURL(blob)
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image()
      el.onload = () => resolve(el)
      el.onerror = () =>
        reject(new Error('This image format cannot be opened here. Please use a JPG or PNG (iPhone: send it as JPG).'))
      el.src = url
    })
    const scale = Math.min(1, MAX_IMAGE_EDGE / Math.max(img.naturalWidth, img.naturalHeight))
    const canvas = document.createElement('canvas')
    canvas.width = Math.round(img.naturalWidth * scale)
    canvas.height = Math.round(img.naturalHeight * scale)
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('The image could not be prepared.')
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
    const jpeg = await new Promise<Blob>((resolve, reject) =>
      canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('The image could not be prepared.'))), 'image/jpeg', 0.9),
    )
    return { base64: await blobToBase64(jpeg), mediaType: 'image/jpeg' }
  } finally {
    URL.revokeObjectURL(url)
  }
}

// Sends a scan or photo of a title, technical description or lot plan to the read-lot-shape
// service (admins only) and returns the sides of the lot it found.
export async function readLotShapeFromFile(file: Blob, fileName = ''): Promise<ReadLotShapeResult> {
  const isPdf = file.type === 'application/pdf' || fileName.toLowerCase().endsWith('.pdf')
  let payload: { file_base64: string; media_type: string }
  if (isPdf) {
    if (file.size > MAX_PDF_BYTES) throw new Error('The PDF is too large (max. 18 MB). Please use only the page with the boundary.')
    payload = { file_base64: await blobToBase64(file), media_type: 'application/pdf' }
  } else {
    const img = await prepareImage(file)
    payload = { file_base64: img.base64, media_type: img.mediaType }
  }

  const { data, error } = await supabase.functions.invoke('read-lot-shape', { body: payload })
  if (error) {
    let message = 'The document could not be read right now. Please try again.'
    const context = (error as { context?: Response }).context
    if (context && typeof context.json === 'function') {
      try {
        const body = await context.json()
        if (body?.error) message = body.error
      } catch {
        // keep the general message
      }
    }
    throw new Error(message)
  }
  return data as ReadLotShapeResult
}
