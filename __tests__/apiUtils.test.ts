import { clip, parseAiJson } from '../api/_utils'

describe('clip', () => {
  it('kapar strängar till maxlängd', () => {
    expect(clip('hello', 3)).toBe('hel')
    expect(clip('hi', 10)).toBe('hi')
  })

  it('returnerar tom sträng för icke-strängar', () => {
    expect(clip(123, 5)).toBe('')
    expect(clip(null, 5)).toBe('')
    expect(clip(undefined, 5)).toBe('')
    expect(clip({}, 5)).toBe('')
  })
})

describe('parseAiJson', () => {
  it('tolkar JSON i ```json-block', () => {
    expect(parseAiJson('```json\n{"a":1}\n```')).toEqual({ a: 1 })
  })

  it('plockar ut JSON ur omgivande text', () => {
    expect(parseAiJson('Här kommer: {"b":2} klart')).toEqual({ b: 2 })
  })

  it('hanterar nästlade objekt (första { till sista })', () => {
    expect(parseAiJson('x {"a":{"b":1}} y')).toEqual({ a: { b: 1 } })
  })

  it('kastar när ingen JSON finns', () => {
    expect(() => parseAiJson('ingen json här')).toThrow()
  })
})
