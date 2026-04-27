import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { searchParams } = new URL(request.url)
    const mes = searchParams.get('mes')
    const anio = searchParams.get('anio')

    if (!mes || !anio) {
      return NextResponse.json(
        { error: 'Se requieren los parámetros mes y anio' },
        { status: 400 }
      )
    }

    const { data, error } = await supabase
      .from('accounting_income')
      .select(`
        *,
        therapists (
          id,
          nombre,
          apellido
        )
      `)
      .eq('mes', parseInt(mes))
      .eq('anio', parseInt(anio))
      .order('fecha', { ascending: false })

    if (error) throw error

    const total = data.reduce((sum: number, item: { monto: number }) => sum + Number(item.monto), 0)
    const totalTerapias = data.reduce((sum: number, item: { cantidad_terapias: number }) => sum + item.cantidad_terapias, 0)

    return NextResponse.json({
      ingresos: data,
      total,
      total_terapias: totalTerapias,
      count: data.length
    })
  } catch (error) {
    console.error('Error GET ingresos:', error)
    return NextResponse.json(
      { error: 'Error al obtener los ingresos' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const body = await request.json()
    const { fecha, monto, cantidad_terapias, therapist_id, observacion } = body

    if (!fecha || !monto || !cantidad_terapias || !therapist_id) {
      return NextResponse.json(
        { error: 'Faltan campos requeridos: fecha, monto, cantidad_terapias, therapist_id' },
        { status: 400 }
      )
    }

    if (monto <= 0) {
      return NextResponse.json(
        { error: 'El monto debe ser mayor a 0' },
        { status: 400 }
      )
    }

    if (cantidad_terapias <= 0) {
      return NextResponse.json(
        { error: 'La cantidad de terapias debe ser mayor a 0' },
        { status: 400 }
      )
    }

    const fechaDate = new Date(fecha)
    const mes = fechaDate.getUTCMonth() + 1
    const anio = fechaDate.getUTCFullYear()

    const { data, error } = await supabase
      .from('accounting_income')
      .insert({
        fecha,
        monto: Number(monto),
        cantidad_terapias: Number(cantidad_terapias),
        therapist_id,
        observacion: observacion || null,
        mes,
        anio
      })
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

    return NextResponse.json(data, { status: 201 })
  } catch (error) {
    console.error('Error POST ingresos:', error)
    return NextResponse.json(
      { error: 'Error al registrar el ingreso' },
      { status: 500 }
    )
  }
}