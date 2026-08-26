import { wardrobeGapReason, buildGroupedGarmentList } from '../utils/outfit'

describe('wardrobeGapReason', () => {
  it('säger inget när listan har innehåll', () => {
    expect(wardrobeGapReason('NEDERDEL\n  • Jeans', 1)).toBeNull()
  })

  it('skiljer tom garderob från oanvändbara kategorier', () => {
    expect(wardrobeGapReason('', 0)).toBe('empty')
    expect(wardrobeGapReason('', 5)).toBe('no-usable')
  })
})

describe('buildGroupedGarmentList – när blir listan tom?', () => {
  it('tom garderob ger tom lista', () => {
    expect(buildGroupedGarmentList([], false)).toBe('')
  })

  it('bara sovkläder och underkläder ger tom lista', () => {
    // Sovkläder, Underkläder och Badkläder saknas MED FLIT i categoryMap, så de
    // är osynliga för genereringen. Det är just det fallet som var förvirrande:
    // användaren ser plagg i appen men får "garderobslista saknas".
    const list = buildGroupedGarmentList(
      [
        { name: 'Pyjamas', category: 'Sovkläder' },
        { name: 'Kalsonger', category: 'Underkläder' },
        { name: 'Badbyxor', category: 'Badkläder' },
      ],
      false,
    )
    expect(list).toBe('')
    expect(wardrobeGapReason(list, 3)).toBe('no-usable')
  })

  it('ett enda användbart plagg räcker för att listan ska bli icke-tom', () => {
    const list = buildGroupedGarmentList([{ name: 'Jeans', category: 'Byxor' }], false)
    expect(list).not.toBe('')
    expect(wardrobeGapReason(list, 1)).toBeNull()
  })
})
