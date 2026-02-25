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
          service:services(nombre)
        ),
        appointment:appointments(
          id,
          fecha_hora,
          therapist_id,
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

    // Para alertas de paquete, buscar la última cita completada
    const alertsEnriquecidas = await Promise.all(
      (data || []).map(async (alert) => {
        const packageData = Array.isArray(alert.package) ? alert.package[0] : alert.package
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

          return {
            ...alert,
            ultima_cita_paquete: ultimaCita || null
          }
        }

        return {
          ...alert,
          ultima_cita_paquete: null
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