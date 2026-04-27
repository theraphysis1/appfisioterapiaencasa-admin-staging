import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export const TIPOS_GASTO = [
  'nomina_marketing',
  'nomina_oficina',
  'nomina_comercial',
  'linea_celular',
  'cuota_manejo',
  'impuesto_4x1000',
  'software_facturacion',
  'publicidad_google',
  'publicidad_facebook',
  'varios'
]

export const LABELS_GASTO: Record<string, string> = {
  nomina_marketing: 'Nómina Marketing',
  nomina_oficina: 'Nómina Empleado Oficina',
  nomina_comercial: 'Nómina Comercial',
  linea_celular: 'Línea Celular',
  cuota_manejo: 'Cuota Manejo Tarjeta',
  impuesto_4x1000: 'Impuesto 4×1000',
  software_facturacion: 'Software Facturación',
  publicidad_google: 'Publicidad Google',
  publicidad_facebook: 'Publicidad Facebook',
  varios: 'Varios'
}

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
      .from('accounting_expenses')
      .select('*')
      .eq('mes', parseInt(mes))
      .eq('anio', parseInt(anio))
      .order('created_at', { ascending: true })

    if (error) throw error

    const total = data.reduce((sum: number, item: { monto: number }) => sum + Number(item.monto), 0)

    // Agrupar por tipo para resumen
    const porTipo: Record<string, number> = {}
    for (const gasto of data) {
      if (!porTipo[gasto.tipo]) porTipo[gasto.tipo] = 0
      porTipo[gasto.tipo] += Number(gasto.monto)
    }

    return NextResponse.json({
      gastos: data,
      total,
      por_tipo: porTipo,
      count: data.length
    })
  } catch (error) {
    console.error('Error GET gastos:', error)
    return NextResponse.json(
      { error: 'Error al obtener los gastos' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const body = await request.json()
    const { mes, anio, tipo, descripcion, monto } = body

    if (!mes || !anio || !tipo || !monto) {
      return NextResponse.json(
        { error: 'Faltan campos requeridos: mes, anio, tipo, monto' },
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
      .insert({
        mes: parseInt(mes),
        anio: parseInt(anio),
        tipo,
        descripcion: descripcion || null,
        monto: Number(monto)
      })
      .select()
      .single()

    if (error) throw error

    return NextResponse.json(data, { status: 201 })
  } catch (error) {
    console.error('Error POST gastos:', error)
    return NextResponse.json(
      { error: 'Error al registrar el gasto' },
      { status: 500 }
    )
  }
}