import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// GET - Conteo de alertas por tipo para el widget del dashboard
export async function GET() {
  try {
    const supabase = await createClient()

    const { data, error, count } = await supabase
      .from('continuation_alerts')
      .select('tipo_alerta', { count: 'exact' })

    if (error) {
      console.error('Error fetching continuation alerts count:', error)
      return NextResponse.json(
        { error: 'Error al obtener conteo de alertas' },
        { status: 500 }
      )
    }

    const valoraciones = data?.filter(a => a.tipo_alerta === 'valoracion_completada').length || 0
    const paquetes = data?.filter(a => a.tipo_alerta === 'paquete_completado').length || 0

    return NextResponse.json({
      total: count || 0,
      valoraciones,
      paquetes
    })

  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json(
      { error: 'Error inesperado del servidor' },
      { status: 500 }
    )
  }
}