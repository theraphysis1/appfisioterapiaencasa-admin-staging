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

/**
 * Convierte un fecha_hora ISO (UTC) a sus partes de fecha y hora
 * EN HORA BOGOTÁ, de forma explícita (sin depender de la zona
 * horaria del navegador). Usado en formularios de edición para
 * evitar el bug de "día siguiente" al mezclar toISOString() (UTC)
 * con toTimeString() (hora local del navegador).
 */
export function isoToBogotaParts(fechaHoraISO: string): { fecha: string; hora: string } {
  const utcDate = new Date(fechaHoraISO)
  const bogota = new Date(utcDate.getTime() - BOGOTA_OFFSET_HOURS * 60 * 60 * 1000)

  const year = bogota.getUTCFullYear()
  const month = String(bogota.getUTCMonth() + 1).padStart(2, '0')
  const day = String(bogota.getUTCDate()).padStart(2, '0')
  const hour = String(bogota.getUTCHours()).padStart(2, '0')
  const minute = String(bogota.getUTCMinutes()).padStart(2, '0')

  return {
    fecha: `${year}-${month}-${day}`,
    hora: `${hour}:${minute}`
  }
}

/**
 * Convierte fecha ("YYYY-MM-DD") y hora ("HH:mm") EN HORA BOGOTÁ
 * a un ISO string en UTC, de forma explícita. Contraparte de
 * isoToBogotaParts(), usada al enviar el formulario de edición.
 */
export function bogotaPartsToISO(fecha: string, hora: string): string {
  const [year, month, day] = fecha.split('-').map(Number)
  const [hour, minute] = hora.split(':').map(Number)

  const utcMillis = Date.UTC(year, month - 1, day, hour + BOGOTA_OFFSET_HOURS, minute, 0)
  return new Date(utcMillis).toISOString()
}

/**
 * Convierte un rango de fechas calendario ("YYYY-MM-DD" a "YYYY-MM-DD")
 * EN HORA BOGOTÁ a un rango UTC listo para filtrar created_at (timestamptz).
 *
 * startISO = inicio del día fechaDesde en Bogotá (00:00:00 Bogotá = 05:00:00 UTC)
 * endISO   = inicio del día SIGUIENTE a fechaHasta en Bogotá (para usar con .lt())
 *
 * Se usa con .gte(startISO).lt(endISO) — NUNCA con .lte() en el borde final,
 * porque evita el bug de desfase que corta las últimas horas del día en Bogotá.
 */
export function bogotaDateRangeToUTC(fechaDesde: string, fechaHasta: string): { startISO: string; endISO: string } {
  const [y1, m1, d1] = fechaDesde.split('-').map(Number)
  const [y2, m2, d2] = fechaHasta.split('-').map(Number)

  const startISO = new Date(Date.UTC(y1, m1 - 1, d1, BOGOTA_OFFSET_HOURS, 0, 0)).toISOString()
  const endISO = new Date(Date.UTC(y2, m2 - 1, d2 + 1, BOGOTA_OFFSET_HOURS, 0, 0)).toISOString()

  return { startISO, endISO }
}