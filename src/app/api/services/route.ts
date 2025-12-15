import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// GET - Obtener todos los servicios
export async function GET() {
  try {
    const supabase = await createClient()
    
    const { data, error } = await supabase
      .from('services')
      .select('*')
      .order('created_at', { ascending: true })

    if (error) {
      console.error('Error fetching services:', error)
      return NextResponse.json(
        { error: 'Error al obtener los servicios' },
        { status: 500 }
      )
    }

    return NextResponse.json({ services: data })
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json(
      { error: 'Error inesperado del servidor' },
      { status: 500 }
    )
  }
}

// POST - Crear nuevo servicio
export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const body = await request.json()

    const { nombre, tipo, cantidad_sesiones, valor_default, comision_default } = body

    // Validaciones
    if (!nombre || !tipo || !cantidad_sesiones || valor_default === undefined || comision_default === undefined) {
      return NextResponse.json(
        { error: 'Todos los campos son requeridos' },
        { status: 400 }
      )
    }

    if (!['valoracion', 'individual', 'paquete'].includes(tipo)) {
      return NextResponse.json(
        { error: 'Tipo de servicio inválido' },
        { status: 400 }
      )
    }

    const { data, error } = await supabase
      .from('services')
      .insert([{
        nombre,
        tipo,
        cantidad_sesiones,
        valor_default,
        comision_default,
        activo: true
      }])
      .select()
      .single()

    if (error) {
      console.error('Error creating service:', error)
      return NextResponse.json(
        { error: 'Error al crear el servicio' },
        { status: 500 }
      )
    }

    return NextResponse.json({ service: data }, { status: 201 })
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json(
      { error: 'Error inesperado del servidor' },
      { status: 500 }
    )
  }
}