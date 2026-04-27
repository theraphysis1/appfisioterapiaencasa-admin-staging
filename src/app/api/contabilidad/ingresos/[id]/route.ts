import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient()
    const { id } = await params

    const { error } = await supabase
      .from('accounting_income')
      .delete()
      .eq('id', id)

    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error DELETE ingreso:', error)
    return NextResponse.json(
      { error: 'Error al eliminar el ingreso' },
      { status: 500 }
    )
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient()
    const { id } = await params
    const body = await request.json()
    const { fecha, monto, cantidad_terapias, therapist_id, observacion } = body

    if (!fecha || !monto || !cantidad_terapias || !therapist_id) {
      return NextResponse.json(
        { error: 'Faltan campos requeridos' },
        { status: 400 }
      )
    }

    const fechaDate = new Date(fecha)
    const mes = fechaDate.getUTCMonth() + 1
    const anio = fechaDate.getUTCFullYear()

    const { data, error } = await supabase
      .from('accounting_income')
      .update({
        fecha,
        monto: Number(monto),
        cantidad_terapias: Number(cantidad_terapias),
        therapist_id,
        observacion: observacion || null,
        mes,
        anio
      })
      .eq('id', id)
      .select(`
        *,
        therapists (
          id,
          nombre,
          apellido
        )
      `)
      .single()

    if (error) throw error

    return NextResponse.json(data)
  } catch (error) {
    console.error('Error PUT ingreso:', error)
    return NextResponse.json(
      { error: 'Error al actualizar el ingreso' },
      { status: 500 }
    )
  }
}