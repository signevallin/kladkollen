import { apiPost } from './api'

// Tar bort bakgrunden på en base64-bild via /api/remove-background.
//
// Endpointen kör som ett kort START-anrop (som returnerar ett jobb-id) + korta
// POLL-anrop. Så en långsam modell (kallstart, 30 s+) hålls ALDRIG i en enda
// lång request – det fick mobilen att släppa anslutningen ("Network request
// failed"). Varje anrop här är bara någon sekund.
//
// Returnerar den bakgrundsfria PNG:n som base64, eller null om det inte gick
// (anroparen faller då tillbaka på originalbilden). Kastar bara vidare om start-
// anropet ger ett riktigt serverfel (t.ex. modell saknas), så anroparens
// try/catch kan visa orsaken.
export async function removeBackground(base64: string): Promise<string | null> {
  const start = await apiPost<{ base64?: string; predictionId?: string; status?: string }>(
    '/api/remove-background', { base64 },
  )
  if (start?.base64) return start.base64 // varm modell – klar direkt
  const id = start?.predictionId
  if (!id) return null

  // Polla i upp till ~60 s (30 × 2 s). Varje statuskoll är ett kort, robust anrop.
  for (let i = 0; i < 30; i++) {
    await new Promise(r => setTimeout(r, 2000))
    try {
      const res = await apiPost<{ base64?: string; status?: string }>(
        '/api/remove-background', { predictionId: id },
      )
      if (res?.base64) return res.base64
      const s = res?.status
      if (s && s !== 'processing' && s !== 'starting') return null
    } catch {
      // Ett enstaka misslyckat poll-anrop (t.ex. nätglapp) ska inte stoppa
      // hela jobbet – försök igen nästa varv.
    }
  }
  return null // tog för lång tid – anroparen använder originalbilden
}
