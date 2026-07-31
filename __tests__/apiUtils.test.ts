import { clip, isReasoningModel, parseAiJson } from '../api/_utils'

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

describe('isReasoningModel', () => {
  it('känner igen gpt-5-familjen och o-serien', () => {
    expect(isReasoningModel('gpt-5.6-luna')).toBe(true)
    expect(isReasoningModel('gpt-5-mini')).toBe(true)
    expect(isReasoningModel('o3')).toBe(true)
    expect(isReasoningModel('o4-mini')).toBe(true)
  })

  it('behandlar gpt-4-familjen som icke-reasoning', () => {
    expect(isReasoningModel('gpt-4.1-mini')).toBe(false)
    expect(isReasoningModel('gpt-4o')).toBe(false)
    expect(isReasoningModel('gpt-4.1')).toBe(false)
  })
})
