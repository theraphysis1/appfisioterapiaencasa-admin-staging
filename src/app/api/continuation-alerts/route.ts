import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// GET - Listar alertas de continuidad con paginación y filtros
export async function GET(request: Request) {
  try {
    const supabase = await createClient()
    const { searchParams } = new URL(request.url)

    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const tipo = searchParams.get('tipo') // 'valoracion_completada' | 'paquete_completado'
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
          barrio
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
          service:services(nombre)
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

    return NextResponse.json({
      alerts: data || [],
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