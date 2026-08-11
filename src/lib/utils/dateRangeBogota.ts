// src/lib/utils/dateRangeBogota.ts
/**
 * Colombia usa UTC-5 todo el año (no tiene horario de verano/DST).
 * El servidor de Vercel corre en UTC, por eso no podemos usar
 * new Date().getFullYear()/getMonth()/getDate() directamente:
 * a partir de las 7:00 p.m. hora Bogotá, el servidor ya está
 * en el día calendario siguiente.
 *
 * Espejo exacto de src/lib/utils/dateRangeBogota.ts en la App Terapeutas,
 * para evitar reintroducir el bug de zona horaria documentado en
 * CONTEXT.md (Agosto 2026).
 */
const BOGOTA_OFFSET_HOURS = 5

/**
 * Calcula el rango UTC (inicio y fin del día) correspondiente
 * a un día calendario en Bogotá.
 *
 * @param daysOffset 0 = hoy, 1 = mañana, -1 = ayer, etc.
 */
export function getBogotaDayRange(daysOffset: number = 0): { startISO: string; endISO: string } {
  const now = new Date()
  const bogotaNow = new Date(now.getTime() - BOGOTA_OFFSET_HOURS * 60 * 60 * 1000)
  bogotaNow.setUTCDate(bogotaNow.getUTCDate() + daysOffset)

  const year = bogotaNow.getUTCFullYear()
  const month = bogotaNow.getUTCMonth()
  const day = bogotaNow.getUTCDate()

  const startUTC = new Date(Date.UTC(year, month, day, BOGOTA_OFFSET_HOURS, 0, 0))
  const endUTC = new Date(Date.UTC(year, month, day + 1, BOGOTA_OFFSET_HOURS - 1, 59, 59))

  return {
    startISO: startUTC.toISOString(),
    endISO: endUTC.toISOString()
  }
}

export type AppointmentDayScope = 'today' | 'tomorrow' | 'other'

/**
 * Determina si una fecha_hora de cita cae en "hoy" o "mañana"
 * en hora Bogotá. Usado para decidir si se envía push y a qué
 * pantalla debe apuntar (today vs tomorrow) en la App Terapeutas.
 */
export function getAppointmentDayScope(fechaHoraISO: string): AppointmentDayScope {
  const target = new Date(fechaHoraISO).getTime()

  const todayRange = getBogotaDayRange(0)
  const todayStart = new Date(todayRange.startISO).getTime()
  const todayEnd = new Date(todayRange.endISO).getTime()

  if (target >= todayStart && target <= todayEnd) {
    return 'today'
  }

  const tomorrowRange = getBogotaDayRange(1)
  const tomorrowStart = new Date(tomorrowRange.startISO).getTime()
  const tomorrowEnd = new Date(tomorrowRange.endISO).getTime()

  if (target >= tomorrowStart && target <= tomorrowEnd) {
    return 'tomorrow'
  }

  return 'other'
}