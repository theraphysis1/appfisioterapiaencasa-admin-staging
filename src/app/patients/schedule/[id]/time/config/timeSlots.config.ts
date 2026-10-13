// src/app/patients/schedule/[id]/time/config/timeSlots.config.ts

export interface FixedSlot {
  hour: number
  minute: number
  optional?: boolean
}

export type GridRow =
  | { type: 'pair'; left: FixedSlot; right: FixedSlot }
  | { type: 'single'; slot: FixedSlot }
  | { type: 'break'; label: string }

// Para cambiar horarios en el futuro, solo se edita este arreglo.
export const GRID_ROWS: GridRow[] = [
  {
    type: 'pair',
    left: { hour: 8, minute: 0 },
    right: { hour: 9, minute: 15 }
  },
  {
    type: 'pair',
    left: { hour: 10, minute: 30 },
    right: { hour: 11, minute: 45 }
  },
  { type: 'break', label: 'ALMUERZO' },
  {
    type: 'pair',
    left: { hour: 13, minute: 0 },
    right: { hour: 14, minute: 15 }
  },
  {
    type: 'pair',
    left: { hour: 15, minute: 30 },
    right: { hour: 17, minute: 0 }
  },
  { type: 'single', slot: { hour: 18, minute: 0, optional: true } }
]

// Lista plana de los horarios seleccionables de la grilla
export const FIXED_SLOTS: FixedSlot[] = GRID_ROWS.flatMap((row) => {
  if (row.type === 'pair') return [row.left, row.right]
  if (row.type === 'single') return [row.slot]
  return []
})