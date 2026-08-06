// Bygger personliga "Insikter" ur användarens garderobsdata – deterministiskt
// (inga AI-anrop, så siffrorna stämmer alltid) men formulerat som en personlig
// stylist. Varje insikt visas bara när det finns tillräckligt med data för att
// den ska vara meningsfull, så nya användare inte möts av tomma/felaktiga påståenden.
export type Insight = { icon: string; text: string }

type BuildArgs = {
  garments: any[]
  outfits: any[]
  calendar: { date: string; outfit_id: string | null }[]
  tr: (s: string) => string
  formatPrice: (n: number) => string
}

const YEAR_MS = 365 * 24 * 60 * 60 * 1000

// Månad (0-index) → svensk säsong.
function seasonOf(month: number): string {
  if (month >= 2 && month <= 4) return 'Vår'
  if (month >= 5 && month <= 7) return 'Sommar'
  if (month >= 8 && month <= 10) return 'Höst'
  return 'Vinter'
}

export function buildInsights({ garments, outfits, calendar, tr, formatPrice }: BuildArgs): Insight[] {
  const out: Insight[] = []
  const now = Date.now()
  const total = garments.length
  if (total === 0) return out

  const lower = (s: string) => tr(s).toLowerCase()

  // ── Utnyttjandegrad (Pareto): hur liten del av garderoben som bär looken ──
  const totalWears = garments.reduce((s, g) => s + (g.times_worn || 0), 0)
  if (totalWears >= 10 && total >= 8) {
    const sorted = [...garments].sort((a, b) => (b.times_worn || 0) - (a.times_worn || 0))
    let cum = 0, count = 0
    for (const g of sorted) { cum += g.times_worn || 0; count++; if (cum >= totalWears * 0.7) break }
    const pct = Math.round((count / total) * 100)
    if (pct > 0 && pct < 70) {
      out.push({ icon: 'pie-chart', text: tr('Du bär {p}% av garderoben mest – de står för 70 % av all användning.').replace('{p}', String(pct)) })
    }
  }

  // ── Vilande plagg (inte burna på över ett år) ──
  const resting = garments.filter(g => {
    if ((g.times_worn || 0) === 0 && !g.last_worn) {
      return g.created_at && (now - new Date(g.created_at).getTime()) > YEAR_MS
    }
    return g.last_worn && (now - new Date(g.last_worn).getTime()) > YEAR_MS
  })
  if (resting.length > 0) {
    out.push({ icon: 'schedule', text: tr('{n} plagg har vilat i över ett år – kanske dags att sälja eller styla om?').replace('{n}', String(resting.length)) })
    const restValue = resting.reduce((s, g) => s + (Number(g.price) || 0), 0)
    if (restValue > 0) {
      out.push({ icon: 'savings', text: tr('Det ligger ungefär {v} i plagg du inte burit på ett år.').replace('{v}', formatPrice(restValue)) })
    }
  }

  // ── Bäst köp: lägst kostnad per användning (per kategori) ──
  const catCost: Record<string, { sum: number; count: number }> = {}
  garments.forEach(g => {
    const price = Number(g.price) || 0
    const uses = g.times_worn || 0
    if (price > 0 && uses > 0 && g.category) {
      const c = catCost[g.category] || { sum: 0, count: 0 }
      c.sum += price / uses; c.count++; catCost[g.category] = c
    }
  })
  const cpu = Object.entries(catCost).filter(([, v]) => v.count >= 2).map(([cat, v]) => ({ cat, val: v.sum / v.count }))
  if (cpu.length >= 2) {
    cpu.sort((a, b) => a.val - b.val)
    out.push({ icon: 'trending-down', text: tr('Bäst köp: dina {cat} kostar bara ungefär {v} per användning.').replace('{cat}', lower(cpu[0].cat)).replace('{v}', formatPrice(Math.max(1, Math.round(cpu[0].val)))) })
  }

  // ── Färgfavorit efter betyg (join outfits ↔ plaggfärger via garment_ids) ──
  const colorById = new Map(garments.map(g => [g.id, g.color]))
  const colorRating: Record<string, { sum: number; count: number }> = {}
  outfits.filter(o => o.rating != null).forEach(o => {
    const colors = new Set<string>()
    ;(o.garment_ids || []).forEach((id: string) => { const c = colorById.get(id); if (c) colors.add(c) })
    colors.forEach(c => { const r = colorRating[c] || { sum: 0, count: 0 }; r.sum += o.rating; r.count++; colorRating[c] = r })
  })
  const colors = Object.entries(colorRating).filter(([, v]) => v.count >= 2).map(([c, v]) => ({ c, avg: v.sum / v.count }))
  if (colors.length >= 2) {
    colors.sort((a, b) => b.avg - a.avg)
    out.push({ icon: 'favorite', text: tr('Du verkar trivas bäst i {color} – de outfitsen får dina högsta betyg.').replace('{color}', lower(colors[0].c)) })
  }

  // ── Äger många men bär sällan (kategori med lågt snitt jämfört med helheten) ──
  const catStats: Record<string, { count: number; wearSum: number }> = {}
  garments.forEach(g => { if (g.category) { const c = catStats[g.category] || { count: 0, wearSum: 0 }; c.count++; c.wearSum += (g.times_worn || 0); catStats[g.category] = c } })
  const avgWear = totalWears / total
  const rarely = Object.entries(catStats)
    .filter(([, v]) => v.count >= 4 && (v.wearSum / v.count) < avgWear * 0.5)
    .map(([cat, v]) => ({ cat, count: v.count }))
    .sort((a, b) => b.count - a.count)
  if (rarely.length > 0 && avgWear > 0) {
    out.push({ icon: 'inventory-2', text: tr('Du äger {n} {cat} men bär dem sällan.').replace('{n}', String(rarely[0].count)).replace('{cat}', lower(rarely[0].cat)) })
  }

  // ── Mest burna plagg ──
  const mostWorn = [...garments].sort((a, b) => (b.times_worn || 0) - (a.times_worn || 0))[0]
  if (mostWorn && (mostWorn.times_worn || 0) >= 3) {
    out.push({ icon: 'star', text: tr('Ditt mest burna plagg: {name} ({n} gånger).').replace('{name}', mostWorn.name).replace('{n}', String(mostWorn.times_worn)) })
  }

  // ── Mest aktiva säsong (ur kalendern) ──
  if (calendar.length >= 6) {
    const seasonCount: Record<string, number> = {}
    calendar.forEach(e => { const d = new Date(e.date + 'T12:00:00'); const s = seasonOf(d.getMonth()); seasonCount[s] = (seasonCount[s] || 0) + 1 })
    const top = Object.entries(seasonCount).sort((a, b) => b[1] - a[1])[0]
    if (top) out.push({ icon: 'wb-sunny', text: tr('Du loggar flest outfits på {season}.').replace('{season}', lower(top[0] === 'Vår' ? 'våren' : top[0] === 'Sommar' ? 'sommaren' : top[0] === 'Höst' ? 'hösten' : 'vintern')) })
  }

  // ── Din go-to outfit (mest återkommande i kalendern) ──
  if (calendar.length >= 4) {
    const idCount: Record<string, number> = {}
    calendar.forEach(e => { if (e.outfit_id) idCount[e.outfit_id] = (idCount[e.outfit_id] || 0) + 1 })
    const top = Object.entries(idCount).sort((a, b) => b[1] - a[1])[0]
    if (top && top[1] >= 3) {
      const o = outfits.find(x => x.id === top[0])
      if (o?.name) out.push({ icon: 'repeat', text: tr('Din go-to outfit "{name}" har du burit {n} gånger.').replace('{name}', o.name).replace('{n}', String(top[1])) })
    }
  }

  return out
}
