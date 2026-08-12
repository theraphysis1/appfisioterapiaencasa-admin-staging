// src/app/api/notifications/estado/route.ts

import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

const VENTANA_DIAS = 7
const LIMITE_POR_PAGINA = 20

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10))
    const offset = (page - 1) * LIMITE_POR_PAGINA

    const supabase = createAdminClient()

    // 1. Total de terapeutas activos (para paginación)
    const { count: totalTherapists, error: countError } = await supabase
      .from('therapists')
      .select('id', { count: 'exact', head: true })
      .eq('activo', true)

    if (countError) {
      console.error('Error contando terapeutas:', countError)
      return NextResponse.json({ error: 'Error al contar terapeutas' }, { status: 500 })
    }

    // 2. Terapeutas activos, paginados
    const { data: therapists, error: therapistsError } = await supabase
      .from('therapists')
      .select('id, nombre, apellido')
      .eq('activo', true)
      .order('nombre', { ascending: true })
      .range(offset, offset + LIMITE_POR_PAGINA - 1)

    if (therapistsError) {
      console.error('Error obteniendo terapeutas:', therapistsError)
      return NextResponse.json({ error: 'Error al obtener terapeutas' }, { status: 500 })
    }

    if (!therapists || therapists.length === 0) {
      return NextResponse.json({
        registros: [],
        pagination: { page, limit: LIMITE_POR_PAGINA, total: totalTherapists || 0, totalPages: Math.ceil((totalTherapists || 0) / LIMITE_POR_PAGINA), hasMore: false }
      })
    }

    const therapistIds = therapists.map((t) => t.id)

    // 3. Estado de dispositivo (1 fila por terapeuta)
    const { data: deviceStatus, error: deviceError } = await supabase
      .from('therapist_device_status')
      .select('therapist_id, plataforma, modo_standalone, push_soportado')
      .in('therapist_id', therapistIds)

    if (deviceError) {
      console.error('Error obteniendo device status:', deviceError)
      return NextResponse.json({ error: 'Error al obtener estado de dispositivo' }, { status: 500 })
    }

    // 4. Suscripciones activas (puede haber varias por terapeuta)
    const { data: subscriptions, error: subsError } = await supabase
      .from('push_subscriptions')
      .select('therapist_id')
      .in('therapist_id', therapistIds)

    if (subsError) {
      console.error('Error obteniendo suscripciones:', subsError)
      return NextResponse.json({ error: 'Error al obtener suscripciones' }, { status: 500 })
    }

    // 5. Notificaciones de los últimos N días (para calcular confirmados/enviados)
    const fechaLimite = new Date()
    fechaLimite.setDate(fechaLimite.getDate() - VENTANA_DIAS)

    const { data: notifications, error: notifsError } = await supabase
      .from('notifications_log')
      .select('therapist_id, enviada, estado_entrega')
      .in('therapist_id', therapistIds)
      .gte('created_at', fechaLimite.toISOString())

    if (notifsError) {
      console.error('Error obteniendo notifications_log:', notifsError)
      return NextResponse.json({ error: 'Error al obtener notificaciones' }, { status: 500 })
    }

    // 6. Armar mapas de lookup por therapist_id
    const deviceMap = new Map(deviceStatus?.map((d) => [d.therapist_id, d]) || [])
    const subsCountMap = new Map<string, number>()
    subscriptions?.forEach((s) => {
      subsCountMap.set(s.therapist_id, (subsCountMap.get(s.therapist_id) || 0) + 1)
    })

    const notifStatsMap = new Map<string, { enviados: number; confirmados: number }>()
    notifications?.forEach((n) => {
      const actual = notifStatsMap.get(n.therapist_id) || { enviados: 0, confirmados: 0 }
      if (n.enviada) {
        actual.enviados += 1
        if (n.estado_entrega === 'confirmado') actual.confirmados += 1
      }
      notifStatsMap.set(n.therapist_id, actual)
    })

    // 7. Construir respuesta final por terapeuta, calculando el semáforo
    const registros = therapists.map((t) => {
      const device = deviceMap.get(t.id)
      const suscripcionActiva = (subsCountMap.get(t.id) || 0) > 0
      const stats = notifStatsMap.get(t.id) || { enviados: 0, confirmados: 0 }

      const plataforma = device?.plataforma || 'unknown'
      const instalada = device?.modo_standalone || false
      const pushSoportado = device?.push_soportado ?? true

      let semaforo: 'rojo' | 'amarillo' | 'verde' | 'gris' = 'gris'
      let accionSugerida = 'Sin datos aún — el terapeuta no ha abierto la app'

      if (!device) {
        semaforo = 'gris'
        accionSugerida = 'Sin datos aún — el terapeuta no ha abierto la app'
      } else if (plataforma === 'ios' && !instalada) {
        semaforo = 'rojo'
        accionSugerida = 'Nunca puede recibir push — decirle que instale la app'
      } else if (!pushSoportado) {
        semaforo = 'rojo'
        accionSugerida = 'Dispositivo sin soporte de push'
      } else if (!suscripcionActiva) {
        semaforo = 'rojo'
        accionSugerida = 'Sin suscripción activa — revisar permisos de notificaciones'
      } else if (stats.enviados === 0) {
        semaforo = 'gris'
        accionSugerida = 'Sin notificaciones enviadas en los últimos 7 días'
      } else if (stats.confirmados / stats.enviados < 0.5) {
        semaforo = 'amarillo'
        accionSugerida = 'Baja tasa de confirmación — investigar o contactar al terapeuta'
      } else {
        semaforo = 'verde'
        accionSugerida = 'Todo bien'
      }

      return {
        therapist_id: t.id,
        nombre: `${t.nombre} ${t.apellido}`,
        plataforma,
        instalada,
        suscripcion_activa: suscripcionActiva,
        confirmados: stats.confirmados,
        enviados: stats.enviados,
        semaforo,
        accion_sugerida: accionSugerida
      }
    })

    return NextResponse.json({
      registros,
      pagination: {
        page,
        limit: LIMITE_POR_PAGINA,
        total: totalTherapists || 0,
        totalPages: Math.ceil((totalTherapists || 0) / LIMITE_POR_PAGINA),
        hasMore: offset + LIMITE_POR_PAGINA < (totalTherapists || 0)
      }
    })
  } catch (error) {
    console.error('Unexpected error en notifications/estado:', error)
    return NextResponse.json({ error: 'Error inesperado del servidor' }, { status: 500 })
  }
}