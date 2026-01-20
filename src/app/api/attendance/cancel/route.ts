import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function POST(request: Request) {
  try {
    const supabase = createAdminClient()
    const body = await request.json()
    
    const { attendance_id, razon_cancelacion } = body

    // Validaciones
    if (!attendance_id) {
      return NextResponse.json(
        { error: 'El ID del registro es requerido' },
        { status: 400 }
      )
    }

    if (!razon_cancelacion || razon_cancelacion.trim().length === 0) {
      return NextResponse.json(
        { error: 'La razón de cancelación es requerida' },
        { status: 400 }
      )
    }

    if (razon_cancelacion.trim().length > 500) {
      return NextResponse.json(
        { error: 'La razón de cancelación no puede exceder 500 caracteres' },
        { status: 400 }
      )
    }

    // Verificar que el registro exista
    const { data: registro, error: fetchError } = await supabase
      .from('attendance_records')
      .select('id, cancelada_por_admin')
      .eq('id', attendance_id)
      .single()

    if (fetchError || !registro) {
      return NextResponse.json(
        { error: 'Registro GPS no encontrado' },
        { status: 404 }
      )
    }

    // Verificar si ya está cancelado
    if (registro.cancelada_por_admin) {
      return NextResponse.json(
        { error: 'Este registro ya está cancelado' },
        { status: 400 }
      )
    }

    // Actualizar registro con cancelación
    const { data: updated, error: updateError } = await supabase
      .from('attendance_records')
      .update({
        cancelada_por_admin: true,
        razon_cancelacion: razon_cancelacion.trim(),
        fecha_cancelacion: new Date().toISOString()
      })
      .eq('id', attendance_id)
      .select()
      .single()

    if (updateError) {
      console.error('Error updating record:', updateError)
      return NextResponse.json(
        { error: 'Error al cancelar el registro' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Registro cancelado exitosamente',
      data: updated
    })

  } catch (error) {
    console.error('Unexpected error in cancel:', error)
    return NextResponse.json(
      { error: 'Error inesperado del servidor' },
      { status: 500 }
    )
  }
}