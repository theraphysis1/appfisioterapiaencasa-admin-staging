import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// GET - Obtener un terapeuta específico
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('therapists')
      .select('*')
      .eq('id', id)
      .single()

    if (error || !data) {
      return NextResponse.json(
        { error: 'Terapeuta no encontrado' },
        { status: 404 }
      )
    }

    return NextResponse.json({ therapist: data })
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json(
      { error: 'Error inesperado del servidor' },
      { status: 500 }
    )
  }
}

// PUT - Actualizar un terapeuta
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const { nombre, apellido, contacto, placa_moto } = body

    // Validar campos requeridos
    if (!nombre || !apellido || !contacto) {
      return NextResponse.json(
        { error: 'Nombre, apellido y contacto son requeridos' },
        { status: 400 }
      )
    }

    const supabase = await createClient()

    // Actualizar el terapeuta
    const { data, error } = await supabase
      .from('therapists')
      .update({
        nombre,
        apellido,
        contacto,
        placa_moto: placa_moto || null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()

    if (error || !data || data.length === 0) {
      console.error('Update error:', error)
      return NextResponse.json(
        { error: error?.message || 'Terapeuta no encontrado' },
        { status: error ? 500 : 404 }
      )
    }

    if (error) {
      console.error('Update error:', error)
      return NextResponse.json(
        { error: 'Error al actualizar el terapeuta' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      therapist: data[0],
    })
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json(
      { error: 'Error inesperado del servidor' },
      { status: 500 }
    )
  }
}