// src/app/patients/schedule/[id]/time/utils/timeSlots.ts

import { FIXED_SLOTS } from '../config/timeSlots.config'

export type SlotStatus = 'free' | 'occupied' | 'cancelled'

export interface SlotState<T> {
  hour: number
  minute: number
  display: string
  status: SlotStatus
  appointment: T | null
}

interface AppointmentLike {
  fecha_hora: string
  estado: string
}

export const slotKey = (hour: number, minute: number): string => `${hour}-${minute}`

export const formatTime = (hour: number, minute: number): string => {
  const period = hour >= 12 ? 'PM' : 'AM'
  const displayHour = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour
  const displayMinute = minute.toString().padStart(2, '0')
  return `${displayHour}:${displayMinute} ${period}`
}

/**
 * Construye un mapa hora -> estado a partir de las citas del día.
 * Se lee la hora con getHours()/getMinutes() (hora local del navegador),
 * igual que funciona hoy.
 * Regla de prioridad: ocupado > cancelado. Una cita cancelada nunca
 * pisa a una agendada en la misma hora, sin importar el orden de llegada.
 */
export function buildSlotMap<T extends AppointmentLike>(
  appointments: T[]
): Map<string, SlotState<T>> {
  const map = new Map<string, SlotState<T>>()

  appointments.forEach((appointment) => {
    const date = new Date(appointment.fecha_hora)
    const hour = date.getHours()
    const minute = date.getMinutes()
    const key = slotKey(hour, minute)
    const isCancelled = appointment.estado === 'cancelada'
    const existing = map.get(key)

    // Si ya hay una cita ocupada en esta hora, no se reemplaza
    if (existing && existing.status === 'occupied') return
    // Si ya hay una cancelada y llega otra cancelada, se conserva la primera
    if (existing && isCancelled) return

    map.set(key, {
      hour,
      minute,
      display: formatTime(hour, minute),
      status: isCancelled ? 'cancelled' : 'occupied',
      appointment
    })
  })

  return map
}

/** Estado de un horario fijo de la grilla (libre si no hay cita). */
export function getSlotState<T>(
  map: Map<string, SlotState<T>>,
  hour: number,
  minute: number
): SlotState<T> {
  return (
    map.get(slotKey(hour, minute)) || {
      hour,
      minute,
      display: formatTime(hour, minute),
      status: 'free',
      appointment: null
    }
  )
}

/** Citas del día cuya hora NO coincide con ningún botón de la grilla. */
export function getOtherSlots<T>(map: Map<string, SlotState<T>>): SlotState<T>[] {
  const fixedKeys = new Set(FIXED_SLOTS.map((s) => slotKey(s.hour, s.minute)))

  return Array.from(map.values())
    .filter((slot) => !fixedKeys.has(slotKey(slot.hour, slot.minute)))
    .sort((a, b) => (a.hour !== b.hour ? a.hour - b.hour : a.minute - b.minute))
}

/**
 * Interpreta lo que escribe el usuario: "4:45 PM", "4:45pm" o "16:45".
 * Devuelve null si el formato o los valores no son válidos.
 */
export function parseTimeInput(input: string): { hour: number; minute: number } | null {
  const match = input.trim().match(/^(\d{1,2}):(\d{2})\s*(AM|PM)?$/i)
  if (!match) return null

  let hour = parseInt(match[1], 10)
  const minute = parseInt(match[2], 10)
  const period = match[3]?.toUpperCase()

  if (minute > 59) return null

  if (period) {
    if (hour < 1 || hour > 12) return null
    if (period === 'PM' && hour !== 12) hour += 12
    else if (period === 'AM' && hour === 12) hour = 0
  } else if (hour > 23) {
    return null
  }

  return { hour, minute }
}