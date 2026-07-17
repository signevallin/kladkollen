// Anledningar till att ett plagg ligger i arkivet, med en Ionicons-ikon var.
export type ArchiveReason = { key: string; label: string; icon: string }

export const ARCHIVE_REASONS: ArchiveReason[] = [
  { key: 'small',    label: 'För liten',            icon: 'contract-outline' },
  { key: 'big',      label: 'För stor',             icon: 'expand-outline' },
  { key: 'style',    label: 'Inte min stil längre', icon: 'heart-dislike-outline' },
  { key: 'season',   label: 'Fel säsong',           icon: 'snow-outline' },
  { key: 'worn',     label: 'Sliten eller trasig',  icon: 'bandage-outline' },
  { key: 'storage',  label: 'Undanpackad',          icon: 'cube-outline' },
  { key: 'lent',     label: 'Utlånad',              icon: 'people-outline' },
  { key: 'keepsake', label: 'Sparar för minnet',    icon: 'heart-outline' },
]

export function reasonFor(key: string | null | undefined): ArchiveReason | undefined {
  if (!key) return undefined
  return ARCHIVE_REASONS.find(r => r.key === key)
}
