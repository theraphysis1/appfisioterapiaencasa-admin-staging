import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { bogotaDateRangeToUTC } from '@/lib/utils/dateRangeBogota'

export async function POST(request: NextRequest) {
  try {
    const supabase = createAdminClient()

    const body = await request.json()
    const { fecha_desde, fecha_hasta, confirmacion } = body

    // Validaciones
    if (!fecha_desde || !fecha_hasta) {
      return NextResponse.json(
        { error: 'Las fechas desde y hasta son requeridas' },
        { status: 400 }
      )
    }

    if (confirmacion !== 'ELIMINAR') {
      return NextResponse.json(
        { error: 'Debes confirmar escribiendo "ELIMINAR"' },
        { status: 400 }
      )
    }

    // Validar que fecha_desde sea anterior a fecha_hasta
    if (new Date(fecha_desde) > new Date(fecha_hasta)) {
      return NextResponse.json(
        { error: 'La fecha desde debe ser anterior o igual a la fecha hasta' },
        { status: 400 }
      )
    }

    const { startISO, endISO } = bogotaDateRangeToUTC(fecha_desde, fecha_hasta)

    // Contar registros antes de eliminar
    const { count: totalRegistros } = await supabase
      .from('notifications_log')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', startISO)
      .lt('created_at', endISO)

    if (!totalRegistros || totalRegistros === 0) {
      return NextResponse.json(
        { error: 'No hay registros para eliminar en este rango de fechas' },
        { status: 404 }
      )
    }

    // ELIMINAR registros
    const { error: deleteError } = await supabase
      .from('notifications_log')
      .delete()
      .gte('created_at', startISO)
      .lt('created_at', endISO)

    if (deleteError) {
      console.error('Error al eliminar notificaciones:', deleteError)
      return NextResponse.json(
        { error: 'Error al eliminar los registros' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      mensaje: `${totalRegistros} registros eliminados correctamente`,
      fecha_desde,
      fecha_hasta,
      registros_eliminados: totalRegistros
    })

  } catch (error) {
    console.error('Error en limpieza de notificaciones por fechas:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}