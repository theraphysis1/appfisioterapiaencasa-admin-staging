import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function POST(request: NextRequest) {
  try {
    const supabase = createAdminClient()

    const body = await request.json()
    const { therapist_id, confirmacion } = body

    // Validaciones
    if (!therapist_id) {
      return NextResponse.json(
        { error: 'El therapist_id es requerido' },
        { status: 400 }
      )
    }

    if (confirmacion !== 'ELIMINAR') {
      return NextResponse.json(
        { error: 'Debes confirmar escribiendo "ELIMINAR"' },
        { status: 400 }
      )
    }

    // Verificar que el terapeuta existe
    const { data: therapistExists, error: therapistCheckError } = await supabase
      .from('therapists')
      .select('id, nombre, apellido')
      .eq('id', therapist_id)
      .single()

    if (therapistCheckError || !therapistExists) {
      return NextResponse.json(
        { error: 'El terapeuta no existe' },
        { status: 404 }
      )
    }

    // Contar registros antes de eliminar
    const { count: totalRegistros } = await supabase
      .from('notifications_log')
      .select('*', { count: 'exact', head: true })
      .eq('therapist_id', therapist_id)

    if (!totalRegistros || totalRegistros === 0) {
      return NextResponse.json(
        { error: 'No hay registros para eliminar de este terapeuta' },
        { status: 404 }
      )
    }

    // ELIMINAR registros
    const { error: deleteError } = await supabase
      .from('notifications_log')
      .delete()
      .eq('therapist_id', therapist_id)

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
      terapeuta: `${therapistExists.nombre} ${therapistExists.apellido}`,
      registros_eliminados: totalRegistros
    })

  } catch (error) {
    console.error('Error en limpieza de notificaciones por terapeuta:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}