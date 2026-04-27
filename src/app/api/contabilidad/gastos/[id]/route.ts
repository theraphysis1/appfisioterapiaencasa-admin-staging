import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { TIPOS_GASTO } from '../route'

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient()
    const { id } = await params
    const body = await request.json()
    const { tipo, descripcion, monto } = body

    if (!tipo || !monto) {
      return NextResponse.json(
        { error: 'Faltan campos requeridos: tipo, monto' },
        { status: 400 }
      )
    }

    if (!TIPOS_GASTO.includes(tipo)) {
      return NextResponse.json(
        { error: 'Tipo de gasto no válido' },
        { status: 400 }
      )
    }

    if (Number(monto) <= 0) {
      return NextResponse.json(
        { error: 'El monto debe ser mayor a 0' },
        { status: 400 }
      )
    }

    if (tipo === 'varios' && !descripcion) {
      return NextResponse.json(
        { error: 'Los gastos de tipo "Varios" requieren una descripción' },
        { status: 400 }
      )
    }

    const { data, error } = await supabase
      .from('accounting_expenses')
      .update({
        tipo,
        descripcion: descripcion || null,
        monto: Number(monto),
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single()

    if (error) throw error

    return NextResponse.json(data)
  } catch (error) {
    console.error('Error PUT gasto:', error)
    return NextResponse.json(
      { error: 'Error al actualizar el gasto' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient()
    const { id } = await params

    const { error } = await supabase
      .from('accounting_expenses')
      .delete()
      .eq('id', id)

    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error DELETE gasto:', error)
    return NextResponse.json(
      { error: 'Error al eliminar el gasto' },
      { status: 500 }
    )
  }
}