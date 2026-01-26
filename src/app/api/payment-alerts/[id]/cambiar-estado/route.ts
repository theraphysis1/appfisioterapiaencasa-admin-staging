import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// POST - Cambiar estado de una alerta (cancelada, vencida)
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient()
    const { id } = await params
    const body = await request.json()

    const { nuevo_estado, notas_finales } = body

    // Validaciones
    if (!nuevo_estado || !['cancelada', 'vencida'].includes(nuevo_estado)) {
      return NextResponse.json(
        { error: 'nuevo_estado debe ser "cancelada" o "vencida"' },
        { status: 400 }
      )
    }

    // Obtener la alerta actual
    const { data: alertData, error: alertError } = await supabase
      .from('payment_alerts')
      .select('*, packages(*), patients(*)')
      .eq('id', id)
      .single()

    if (alertError || !alertData) {
      return NextResponse.json(
        { error: 'Alerta no encontrada' },
        { status: 404 }
      )
    }

    // Validar que la alerta esté activa
    if (!alertData.alerta_activa) {
      return NextResponse.json(
        { error: 'Esta alerta ya fue cerrada' },
        { status: 400 }
      )
    }

    // Actualizar la alerta
    const { data: updatedAlert, error: updateError } = await supabase
      .from('payment_alerts')
      .update({
        estado_alerta: nuevo_estado,
        alerta_activa: false,
        notas_finales: notas_finales || null,
        fecha_cierre: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single()

    if (updateError) {
      console.error('Error updating alert:', updateError)
      return NextResponse.json(
        { error: 'Error al actualizar la alerta' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      message: `Alerta marcada como ${nuevo_estado}`,
      alert: updatedAlert
    }, { status: 200 })

  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json(
      { error: 'Error inesperado del servidor' },
      { status: 500 }
    )
  }
}

