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
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405 })
  }
  try {
    const { base64 } = await request.json() as any
    const key = process.env.REMOVE_BG_API_KEY
    if (!key) {
      return new Response(JSON.stringify({ error: 'API-nyckel saknas' }), { status: 500 })
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
      return new Response(
        JSON.stringify({ error: (errData as any).errors?.[0]?.title || 'Bakgrundsborttagning misslyckades' }),
        { status: res.status }
      )
    }

    const arrayBuffer = await res.arrayBuffer()
    const resultBase64 = arrayBufferToBase64(arrayBuffer)

    return new Response(
      JSON.stringify({ base64: resultBase64 }),
      { headers: { 'Content-Type': 'application/json' } }
    )
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500 })
  }
}
