// src/app/patients/schedule/[id]/time/components/TimeGrid.tsx
'use client'

import type { GridRow, FixedSlot } from '../config/timeSlots.config'
import type { SlotState } from '../utils/timeSlots'
import { slotKey, formatTime } from '../utils/timeSlots'
import type { Appointment } from '../hooks/useTimeSlots'

interface TimeGridProps {
  rows: GridRow[]
  getSlot: (hour: number, minute: number) => SlotState<Appointment>
  otherSlots: SlotState<Appointment>[]
  editingSlot: string | null
  editedTime: string
  onSelect: (hour: number, minute: number) => void
  onOccupiedClick: (appointment: Appointment) => void
  onMouseDown: (slotKey: string, displayTime: string) => void
  onMouseUp: () => void
  onMouseLeave: () => void
  onTimeInputChange: (e: React.ChangeEvent<HTMLInputElement>) => void
  onTimeInputBlur: () => void
  onTimeInputKeyDown: (e: React.KeyboardEvent<HTMLInputElement>, hour: number, minute: number) => void
}

export default function TimeGrid(props: TimeGridProps) {
  const {
    rows,
    getSlot,
    otherSlots,
    editingSlot,
    editedTime,
    onSelect,
    onOccupiedClick,
    onMouseDown,
    onMouseUp,
    onMouseLeave,
    onTimeInputChange,
    onTimeInputBlur,
    onTimeInputKeyDown
  } = props

  const renderSlot = (slot: SlotState<Appointment>, optional = false) => {
    const key = slotKey(slot.hour, slot.minute)

    if (editingSlot === key) {
      return (
        <input
          key={key}
          type="text"
          value={editedTime}
          onChange={onTimeInputChange}
          onBlur={onTimeInputBlur}
          onKeyDown={(e) => onTimeInputKeyDown(e, slot.hour, slot.minute)}
          autoFocus
          className="w-full py-4 px-4 rounded-lg border-2 border-purple-500 text-zinc-900 dark:text-zinc-50 font-medium bg-white dark:bg-zinc-700 text-center focus:outline-none focus:ring-2 focus:ring-purple-500"
        />
      )
    }

    const label = (
      <>
        <span className="block text-base">{slot.display}</span>
        {optional && <span className="block text-xs font-normal opacity-80">Opcional</span>}
      </>
    )

    if (slot.status === 'occupied') {
      return (
        <button
          key={key}
          onClick={() => onOccupiedClick(slot.appointment!)}
          className="w-full py-4 px-4 rounded-lg border-2 border-red-500 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 font-medium cursor-pointer hover:bg-red-100 dark:hover:bg-red-900/30 transition-all"
        >
          {label}
        </button>
      )
    }

    const isCancelled = slot.status === 'cancelled'
    const colorClasses = isCancelled
      ? 'border-yellow-500 bg-yellow-50 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-300 hover:border-yellow-600 hover:bg-yellow-100 dark:hover:bg-yellow-900/30'
      : 'border-green-500 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300 hover:border-green-600 hover:bg-green-100 dark:hover:bg-green-900/30'

    return (
      <button
        key={key}
        onClick={() => onSelect(slot.hour, slot.minute)}
        onMouseDown={() => onMouseDown(key, slot.display)}
        onMouseUp={onMouseUp}
        onMouseLeave={onMouseLeave}
        onTouchStart={() => onMouseDown(key, slot.display)}
        onTouchEnd={onMouseUp}
        className={`relative w-full py-4 px-4 rounded-lg border-2 font-medium transition-all ${colorClasses}`}
        title={isCancelled ? 'Cita cancelada - Disponible para reagendar' : undefined}
      >
        {label}
        {isCancelled && <span className="absolute top-0 right-1 text-xs">⚠️</span>}
      </button>
    )
  }

  const renderFixed = (fixed: FixedSlot) =>
    renderSlot(getSlot(fixed.hour, fixed.minute), fixed.optional)

  return (
    <div>
      <div className="grid grid-cols-2 gap-3 max-w-md mx-auto">
        {rows.map((row, index) => {
          if (row.type === 'pair') {
            return (
              <div key={`row-${index}`} className="contents">
                {renderFixed(row.left)}
                {renderFixed(row.right)}
              </div>
            )
          }

          if (row.type === 'single') {
            return (
              <div key={`row-${index}`} className="col-span-2 flex justify-center">
                <div className="w-[calc(50%-6px)]">{renderFixed(row.slot)}</div>
              </div>
            )
          }

          return (
            <div key={`row-${index}`} className="col-span-2 flex justify-center">
              <div className="w-[calc(50%-6px)] py-4 px-4 rounded-lg bg-zinc-200 dark:bg-zinc-700 text-zinc-600 dark:text-zinc-300 text-center font-semibold select-none">
                {row.label}
              </div>
            </div>
          )
        })}
      </div>

      {otherSlots.length > 0 && (
        <div className="mt-8 pt-6 border-t border-zinc-200 dark:border-zinc-700">
          <h3 className="text-sm font-semibold text-zinc-700 dark:text-zinc-300 mb-3">
            Otros horarios del día
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 max-w-md mx-auto">
            {otherSlots.map((slot) => renderSlot(slot))}
          </div>
        </div>
      )}
    </div>
  )
}