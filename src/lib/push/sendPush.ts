// src/lib/push/sendPush.ts

import webpush from 'web-push'
import { createAdminClient } from '@/lib/supabase/admin'
import { getAppointmentDayScope } from '@/lib/utils/dateRangeBogota'

webpush.setVapidDetails(
  process.env.VAPID_SUBJECT!,
  process.env.VAPID_PUBLIC_KEY!,
  process.env.VAPID_PRIVATE_KEY!
)

export type TipoEventoNotificacion =
  | 'cita_nueva'
  | 'cita_reasignada'
  | 'cita_cancelada'
  | 'cita_pendiente_reagendar'
  | 'cita_reprogramada'
  | 'cita_direccion_cambiada'

interface NotifyParams {
  therapistId: string
  therapistNombre: string
  appointmentId: string
  patientId: string | null
  fechaHoraISO: string
  tipoEvento: TipoEventoNotificacion
  pacienteNombreCompleto: string
}

const MENSAJES: Record<TipoEventoNotificacion, (paciente: string, hora: string) => { titulo: string; mensaje: string }> = {
  cita_nueva: (paciente, hora) => ({
    titulo: 'Nueva cita asignada',
    mensaje: `Tienes una nueva cita con ${paciente} a las ${hora}`
  }),
  cita_reasignada: (paciente, hora) => ({
    titulo: 'Cita asignada a ti',
    mensaje: `Se te asignó una cita con ${paciente} a las ${hora}`
  }),
  cita_cancelada: (paciente, hora) => ({
    titulo: 'Cita cancelada',
    mensaje: `Tu cita con ${paciente} de las ${hora} fue cancelada`
  }),
  cita_pendiente_reagendar: (paciente, hora) => ({
    titulo: 'Cita pendiente de reagendar',
    mensaje: `Tu cita con ${paciente} de las ${hora} quedó pendiente por reagendar`
  }),
  cita_reprogramada: (paciente, hora) => ({
    titulo: 'Cita reprogramada',
    mensaje: `Tu cita con ${paciente} cambió de horario. Nueva hora: ${hora}`
  }),
  cita_direccion_cambiada: (paciente, hora) => ({
    titulo: 'Dirección de cita actualizada',
    mensaje: `Cambió la dirección de tu cita con ${paciente} de las ${hora}`
  })
}

function formatHoraBogota(fechaHoraISO: string): string {
  return new Date(fechaHoraISO).toLocaleTimeString('es-CO', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
    timeZone: 'America/Bogota'
  })
}

/**
 * Envía push al terapeuta SOLO si la cita cae en "hoy" o "mañana"
 * (hora Bogotá). Registra el resultado en notifications_log.
 * No lanza excepciones: los fallos de push nunca deben tumbar
 * la respuesta del endpoint de citas que la invoca.
 */
export async function notifyTherapist(params: NotifyParams): Promise<void> {
  const {
    therapistId,
    therapistNombre,
    appointmentId,
    patientId,
    fechaHoraISO,
    tipoEvento,
    pacienteNombreCompleto
  } = params

  const scope = getAppointmentDayScope(fechaHoraISO)
  if (scope === 'other') return // Fuera de today/tomorrow, no se notifica

  const supabase = createAdminClient()

  const { data: subscriptions, error: subsError } = await supabase
    .from('push_subscriptions')
    .select('id, endpoint, keys_p256dh, keys_auth')
    .eq('therapist_id', therapistId)

  if (subsError) {
    console.error('Error obteniendo push_subscriptions:', subsError)
    await logNotification({ therapistId, therapistNombre, appointmentId, patientId, tipoEvento, enviada: false, errorDetalle: subsError.message })
    return
  }

  if (!subscriptions || subscriptions.length === 0) {
    await logNotification({ therapistId, therapistNombre, appointmentId, patientId, tipoEvento, enviada: false, errorDetalle: 'Sin suscripciones activas' })
    return
  }

  const hora = formatHoraBogota(fechaHoraISO)
  const { titulo, mensaje } = MENSAJES[tipoEvento](pacienteNombreCompleto, hora)
  const targetUrl = scope === 'today' ? '/appointments/today' : '/appointments/tomorrow'

  const payload = JSON.stringify({
    title: titulo,
    body: mensaje,
    url: targetUrl,
    tag: `appointment-${appointmentId}`
  })

  const results = await Promise.allSettled(
    subscriptions.map((sub) =>
      webpush.sendNotification(
        {
          endpoint: sub.endpoint,
          keys: { p256dh: sub.keys_p256dh, auth: sub.keys_auth }
        },
        payload
      ).catch(async (err) => {
        // 404/410 = suscripción vencida o el navegador la eliminó -> limpiar
        if (err.statusCode === 404 || err.statusCode === 410) {
          await supabase.from('push_subscriptions').delete().eq('id', sub.id)
        }
        throw err
      })
    )
  )

  const algunExito = results.some((r) => r.status === 'fulfilled')
  const errores = results
    .filter((r): r is PromiseRejectedResult => r.status === 'rejected')
    .map((r) => r.reason?.message || String(r.reason))
    .join(' | ')

  await logNotification({
    therapistId,
    therapistNombre,
    appointmentId,
    patientId,
    tipoEvento,
    enviada: algunExito,
    errorDetalle: algunExito ? null : (errores || 'Fallo desconocido')
  })
}

async function logNotification(params: {
  therapistId: string
  therapistNombre: string
  appointmentId: string
  patientId: string | null
  tipoEvento: TipoEventoNotificacion
  enviada: boolean
  errorDetalle: string | null
}): Promise<void> {
  const supabase = createAdminClient()
  const { titulo, mensaje } = MENSAJES[params.tipoEvento]('', '')

  const { error } = await supabase.from('notifications_log').insert({
    therapist_id: params.therapistId,
    therapist_nombre: params.therapistNombre,
    patient_id: params.patientId,
    appointment_id: params.appointmentId,
    tipo_evento: params.tipoEvento,
    titulo,
    mensaje,
    enviada: params.enviada,
    error_detalle: params.errorDetalle
  })

  if (error) {
    console.error('Error insertando en notifications_log:', error)
  }
}