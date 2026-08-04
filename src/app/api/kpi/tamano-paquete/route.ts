import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// GET - KPI: Tamaño de paquete (5 vs 10 sesiones) agrupado por mes
export async function GET(request: Request) {
  try {
    const supabase = await createClient()
    const { searchParams } = new URL(request.url)

    const fechaDesde = searchParams.get('fecha_desde')
    const fechaHasta = searchParams.get('fecha_hasta')

    if (!fechaDesde || !fechaHasta) {
      return NextResponse.json(
        { error: 'Los parámetros fecha_desde y fecha_hasta son requeridos' },
        { status: 400 }
      )
    }

    const desde = `${fechaDesde}T00:00:00-05:00`
    const hasta = `${fechaHasta}T23:59:59-05:00`

    const { data, error } = await supabase.rpc('kpi_tamano_paquete_por_mes', {
      p_fecha_desde: desde,
      p_fecha_hasta: hasta
    })

    if (error) {
      console.error('Error en kpi_tamano_paquete_por_mes:', error)
      return NextResponse.json(
        { error: 'Error al obtener el KPI de tamaño de paquete' },
        { status: 500 }
      )
    }

    return NextResponse.json({ data: data || [] })
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json(
      { error: 'Error inesperado del servidor' },
      { status: 500 }
    )
  }
}