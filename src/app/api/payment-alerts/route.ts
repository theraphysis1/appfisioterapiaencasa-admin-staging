import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// GET - Listar alertas con filtros
export async function GET(request: Request) {
  try {
    const supabase = await createClient()
    const { searchParams } = new URL(request.url)
    
    // Filtros opcionales
    const nivel_urgencia = searchParams.get('nivel_urgencia')
    const alerta_activa = searchParams.get('alerta_activa')
    const fecha_desde = searchParams.get('fecha_desde')
    const fecha_hasta = searchParams.get('fecha_hasta')
    const contactado = searchParams.get('contactado')
    
    // Paginación
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = (page - 1) * limit

    // Query base
    let query = supabase
      .from('payment_alerts')
      .select(`
        *,
        patient:patients(
          id,
          nombre,
          apellido,
          telefono,
          direccion
        ),
        package:packages(
          id,
          total_sesiones,
          sesiones_agendadas,
          valor_total,
          saldo_pendiente,
          forma_pago,
          service:services(
            nombre,
            tipo
          )
        )
      `, { count: 'exact' })

    // Aplicar filtros
    if (nivel_urgencia) {
      query = query.eq('nivel_urgencia', nivel_urgencia)
    }

    if (alerta_activa !== null && alerta_activa !== undefined) {
      query = query.eq('alerta_activa', alerta_activa === 'true')
    }

    if (contactado !== null && contactado !== undefined) {
      query = query.eq('contactado', contactado === 'true')
    }

    if (fecha_desde) {
      query = query.gte('fecha_ultima_sesion_pagada', fecha_desde)
    }

    if (fecha_hasta) {
      query = query.lte('fecha_ultima_sesion_pagada', fecha_hasta)
    }

    // Ordenar por urgencia y fecha
    const { data, error, count } = await query
      .order('nivel_urgencia', { ascending: true }) // urgente primero (alfabéticamente)
      .order('fecha_ultima_sesion_pagada', { ascending: true }) // más próximas primero
      .range(offset, offset + limit - 1)

    if (error) {
      console.error('Error fetching alerts:', error)
      return NextResponse.json(
        { error: 'Error al obtener las alertas' },
        { status: 500 }
      )
    }

    // Calcular días restantes para cada alerta
    const alertsWithDays = data?.map((alert: any) => {
      const fechaUltimaSesion = new Date(alert.fecha_ultima_sesion_pagada)
      const hoy = new Date()
      const diffTime = fechaUltimaSesion.getTime() - hoy.getTime()
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

      return {
        ...alert,
        dias_restantes: diffDays,
        patient_nombre: alert.patient ? `${alert.patient.nombre} ${alert.patient.apellido}` : 'Paciente no encontrado',
        patient_telefono: alert.patient?.telefono || 'Sin teléfono',
        package_nombre: alert.package?.service?.nombre || 'Servicio no encontrado'
      }
    })

    const totalPages = Math.ceil((count || 0) / limit)

    return NextResponse.json({ 
      alerts: alertsWithDays,
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages,
        hasMore: page < totalPages
      }
    })
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json(
      { error: 'Error inesperado del servidor' },
      { status: 500 }
    )
  }
}