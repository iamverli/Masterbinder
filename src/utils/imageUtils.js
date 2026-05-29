/**
 * Compress an image file to base64 for storage in Firestore.
 * Target: card aspect ratio (roughly 2.5:3.5), max ~150KB output.
 */

const MAX_WIDTH = 300
const MAX_HEIGHT = 420
const QUALITY = 0.72

export function compressImageToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      const img = new Image()
      img.onload = () => {
        const canvas = document.createElement('canvas')

        // Scale to fit within max dimensions, preserving aspect ratio
        let { width, height } = img
        const ratio = Math.min(MAX_WIDTH / width, MAX_HEIGHT / height)
        width = Math.round(width * ratio)
        height = Math.round(height * ratio)

        canvas.width = width
        canvas.height = height

        const ctx = canvas.getContext('2d')
        ctx.drawImage(img, 0, 0, width, height)

        const base64 = canvas.toDataURL('image/jpeg', QUALITY)
        resolve(base64)
      }
      img.onerror = reject
      img.src = e.target.result
    }
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

export function base64ToApproxKB(base64) {
  // Rough estimate: base64 is ~4/3 of original bytes
  return Math.round((base64.length * 0.75) / 1024)
}
