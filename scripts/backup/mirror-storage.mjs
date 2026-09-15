#!/usr/bin/env node
/**
 * Speglar garments-bucketen till en lokal katalog, inkrementellt.
 *
 * pg_dump tar bara med storage.objects-RADERNA, inte själva filerna. Utan den
 * här spegeln är en databasbackup värdelös för bilderna: raderna pekar på
 * filer som inte finns.
 *
 * Hämtar bara filer som saknas lokalt eller har annan storlek. Raderar ALDRIG
 * lokala filer – en fil som försvunnit i molnet ska finnas kvar i backupen.
 *
 *   node --env-file=.env scripts/backup/mirror-storage.mjs ~/Backups/skrud/storage
 */
import { createClient } from '@supabase/supabase-js'
import { mkdir, stat, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'

const BUCKET = 'garments'
const PAGE = 1000
const dest = process.argv[2]
if (!dest) { console.error('Ange målkatalog.'); process.exit(1) }

const url = process.env.SUPABASE_URL || process.env.EXPO_PUBLIC_SUPABASE_URL
const key = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!url || !key) { console.error('Saknar SUPABASE_URL/SUPABASE_SERVICE_ROLE_KEY.'); process.exit(1) }
const db = createClient(url, key, { auth: { persistSession: false } })

// storage.list() ger 100 poster som default och bara en nivå – sidindela och gå rekursivt.
async function listAll(prefix = '') {
  const files = [], folders = []
  for (let offset = 0; ; offset += PAGE) {
    const { data, error } = await db.storage.from(BUCKET).list(prefix, { limit: PAGE, offset })
    if (error) throw new Error(`list ${prefix}: ${error.message}`)
    if (!data?.length) break
    for (const e of data) {
      const path = prefix ? `${prefix}/${e.name}` : e.name
      if (e.id == null) folders.push(path)
      else files.push({ path, size: e.metadata?.size ?? -1 })
    }
    if (data.length < PAGE) break
  }
  for (const f of folders) files.push(...await listAll(f))
  return files
}

const remote = await listAll()
let fetched = 0, skipped = 0, failed = 0
for (const f of remote) {
  const local = join(dest, f.path)
  try {
    const s = await stat(local)
    if (s.size === f.size) { skipped++; continue }
  } catch { /* finns inte lokalt */ }
  try {
    const { data, error } = await db.storage.from(BUCKET).download(f.path)
    if (error || !data) throw new Error(error?.message || 'tom')
    await mkdir(dirname(local), { recursive: true })
    await writeFile(local, Buffer.from(await data.arrayBuffer()))
    fetched++
  } catch (e) {
    failed++
    console.error(`  MISSLYCKADES ${f.path}: ${e.message}`)
  }
}
console.log(`storage: ${remote.length} objekt i molnet, ${fetched} hämtade, ${skipped} redan aktuella, ${failed} misslyckade`)
if (failed) process.exit(1)
