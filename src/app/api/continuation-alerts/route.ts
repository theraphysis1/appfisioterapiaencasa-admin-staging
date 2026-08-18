import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: Request) {
  try {
    const supabase = await createClient()
    const { searchParams } = new URL(request.url)

    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const tipo = searchParams.get('tipo')
    const offset = (page - 1) * limit

    let query = supabase
      .from('continuation_alerts')
      .select(`
        id,
        tipo_alerta,
        total_sesiones,
        fecha_completado,
        created_at,
        patient:patients(
          id,
          nombre,
          apellido,
          telefono,
          barrio,
          direccion,
          referencia
        ),
        package:packages(
          id,
          total_sesiones,
          valor_total,
          tiene_valoracion_previa,
          valoracion_cita_id,
          service:services(nombre)
        ),
        appointment:appointments(
          id,
          fecha_hora,
          therapist_id,
          patologia,
          service:services(nombre),
          therapist:therapists(nombre, apellido)
        )
      `, { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (tipo) {
      query = query.eq('tipo_alerta', tipo)
    }

    const { data, error, count } = await query

    if (error) {
      console.error('Error fetching continuation alerts:', error)
      return NextResponse.json(
        { error: 'Error al obtener alertas de continuidad' },
        { status: 500 }
      )
    }

    // Obtener IDs de alertas para consultar contactos en una sola query
    const alertIds = (data || []).map(a => a.id)

    // Consultar todos los contactos de estas alertas en una sola query
    const { data: contactLogs } = alertIds.length > 0
      ? await supabase
          .from('continuation_contact_logs')
          .select('continuation_alert_id, proximo_seguimiento, created_at')
          .in('continuation_alert_id', alertIds)
          .order('created_at', { ascending: false })
      : { data: [] }

    // Agrupar contactos por alerta_id para calcular conteo y último seguimiento
    const contactosPorAlerta = (contactLogs || []).reduce((acc, log) => {
      const alertId = log.continuation_alert_id
      if (!acc[alertId]) {
        acc[alertId] = { count: 0, proximo_seguimiento: null }
      }
      acc[alertId].count += 1
      // El primero en orden desc es el más reciente
      if (!acc[alertId].proximo_seguimiento && log.proximo_seguimiento) {
        acc[alertId].proximo_seguimiento = log.proximo_seguimiento
      }
      return acc
    }, {} as Record<string, { count: number; proximo_seguimiento: string | null }>)

    // Enriquecer alertas con última cita de paquete + patología + datos de contacto
    const alertsEnriquecidas = await Promise.all(
      (data || []).map(async (alert) => {
        const packageData = Array.isArray(alert.package) ? alert.package[0] : alert.package
        const appointmentData = Array.isArray(alert.appointment) ? alert.appointment[0] : alert.appointment
        const contactInfo = contactosPorAlerta[alert.id] || { count: 0, proximo_seguimiento: null }

        let ultima_cita_paquete = null
        let patologia: string | null = null

        if (alert.tipo_alerta === 'paquete_completado' && packageData?.id) {
          const { data: ultimaCita } = await supabase
            .from('appointments')
            .select(`
              id,
              fecha_hora,
              therapist:therapists(nombre, apellido)
            `)
            .eq('package_id', packageData.id)
            .eq('estado', 'completada')
            .order('fecha_hora', { ascending: false })
            .limit(1)
            .single()

          ultima_cita_paquete = ultimaCita || null

          // Patología: cita de valoración si el paquete la tuvo, si no la primera cita del paquete
          if (packageData.tiene_valoracion_previa && packageData.valoracion_cita_id) {
            const { data: citaValoracion } = await supabase
              .from('appointments')
              .select('patologia')
              .eq('id', packageData.valoracion_cita_id)
              .single()

            patologia = citaValoracion?.patologia || null
          } else {
            const { data: primeraCita } = await supabase
              .from('appointments')
              .select('patologia')
              .eq('package_id', packageData.id)
              .order('fecha_hora', { ascending: true })
              .limit(1)
              .single()

            patologia = primeraCita?.patologia || null
          }
        } else if (alert.tipo_alerta === 'valoracion_completada') {
          // La patología es la de la propia cita de valoración
          patologia = appointmentData?.patologia || null
        }

        return {
          ...alert,
          ultima_cita_paquete,
          patologia,
          contact_count: contactInfo.count,
          proximo_seguimiento: contactInfo.proximo_seguimiento
        }
      })
    )

    return NextResponse.json({
      alerts: alertsEnriquecidas,
      total: count || 0,
      page,
      limit,
      total_pages: Math.ceil((count || 0) / limit)
    })

  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json(
      { error: 'Error inesperado del servidor' },
      { status: 500 }
    )
  }
}