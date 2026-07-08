import { json, requireUser } from './_utils'

export const config = { runtime: 'edge' }

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer)
  let binary = ''
  const chunkSize = 8192
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.subarray(i, i + chunkSize)
    binary += String.fromCharCode(...Array.from(chunk))
  }
  return btoa(binary)
}

export default async function handler(request: Request): Promise<Response> {
  if (request.method !== 'POST') {
    return json({ error: 'Method not allowed' }, 405)
  }
  const auth = await requireUser(request)
  if (auth instanceof Response) return auth

  try {
    const { base64 } = await request.json() as any
    if (!base64) return json({ error: 'Bild saknas' }, 400)
    const key = process.env.REMOVE_BG_API_KEY
    if (!key) {
      return json({ error: 'REMOVE_BG_API_KEY saknas på servern' }, 500)
    }

    const formData = new FormData()
    formData.append('image_file_b64', base64)
    formData.append('size', 'auto')
    formData.append('type', 'product')

    const res = await fetch('https://api.remove.bg/v1.0/removebg', {
      method: 'POST',
      headers: { 'X-Api-Key': key },
      body: formData,
    })

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}))
      return json({ error: (errData as any).errors?.[0]?.title || 'Bakgrundsborttagning misslyckades' }, res.status)
    }

    const arrayBuffer = await res.arrayBuffer()
    return json({ base64: arrayBufferToBase64(arrayBuffer) })
  } catch (e: any) {
    return json({ error: e.message }, 500)
  }
}
