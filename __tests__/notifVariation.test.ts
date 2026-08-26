import { pickVaried } from '../api/send-notifications'

// Plagg sorterade som i notisvalet: mest bortglömt först.
const sorted = Array.from({ length: 30 }, (_, i) => ({ id: `g${i}` }))

describe('pickVaried – variation i notisförslagen', () => {
  it('väljer inom de N mest bortglömda, aldrig längre ner', () => {
    const ids = new Set<string>()
    for (let i = 0; i < 400; i++) ids.add(pickVaried(sorted, null, 10)!.id)
    // Bara de tio första får förekomma – avsikten "längst oanvänd först" består.
    expect([...ids].every(id => Number(id.slice(1)) < 10)).toBe(true)
  })

  it('varierar i stället för att alltid ta den översta', () => {
    const ids = new Set<string>()
    for (let i = 0; i < 400; i++) ids.add(pickVaried(sorted, null, 10)!.id)
    // Med 400 dragningar ur 10 är sannolikheten att missa något försumbar.
    expect(ids.size).toBe(10)
  })

  it('utesluter plagget som föreslogs senast', () => {
    for (let i = 0; i < 200; i++) {
      expect(pickVaried(sorted, 'g0', 10)!.id).not.toBe('g0')
    }
  })

  it('faller inte isär när urvalet är litet', () => {
    expect(pickVaried([{ id: 'a' }], null, 10)!.id).toBe('a')
    // Enda kandidaten är den som redan föreslagits → hellre inget än en upprepning.
    expect(pickVaried([{ id: 'a' }], 'a', 10)).toBeNull()
    expect(pickVaried([], null, 10)).toBeNull()
  })

  it('samma plagg kan aldrig komma två gånger i rad', () => {
    let previous: string | null = null
    for (let i = 0; i < 500; i++) {
      const pick: { id: string } = pickVaried(sorted, previous, 10)!
      expect(pick.id).not.toBe(previous)
      previous = pick.id
    }
  })
})
