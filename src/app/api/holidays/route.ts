import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// GET /api/holidays - Listar todos los días festivos
export async function GET() {
  try {
    const supabase = await createClient()

    const { data: holidays, error } = await supabase
      .from('holidays')
      .select('*')
      .order('fecha', { ascending: true })

    if (error) {
      console.error('Error fetching holidays:', error)
      return NextResponse.json(
        { error: 'Error al obtener días festivos' },
        { status: 500 }
      )
    }

    return NextResponse.json(holidays)
  } catch (error) {
    console.error('Unexpected error in GET /api/holidays:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}

// POST /api/holidays - Crear un nuevo día festivo
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const body = await request.json()

    const { fecha, descripcion } = body

    // Validaciones
    if (!fecha) {
      return NextResponse.json(
        { error: 'La fecha es requerida' },
        { status: 400 }
      )
    }

    // Validar formato de fecha (YYYY-MM-DD)
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/
    if (!dateRegex.test(fecha)) {
      return NextResponse.json(
        { error: 'Formato de fecha inválido. Use YYYY-MM-DD' },
        { status: 400 }
      )
    }

    // Verificar si la fecha ya existe
    const { data: existing, error: checkError } = await supabase
      .from('holidays')
      .select('id')
      .eq('fecha', fecha)
      .single()

    if (checkError && checkError.code !== 'PGRST116') {
      // PGRST116 = no rows returned
      console.error('Error checking existing holiday:', checkError)
      return NextResponse.json(
        { error: 'Error al verificar festivo existente' },
        { status: 500 }
      )
    }

    if (existing) {
      return NextResponse.json(
        { error: 'Ya existe un festivo para esta fecha' },
        { status: 409 }
      )
    }

    // Insertar el nuevo festivo
    const { data: newHoliday, error: insertError } = await supabase
      .from('holidays')
      .insert({
        fecha,
        descripcion: descripcion || null,
      })
      .select()
      .single()

    if (insertError) {
      console.error('Error inserting holiday:', insertError)
      return NextResponse.json(
        { error: 'Error al crear día festivo' },
        { status: 500 }
      )
    }

    return NextResponse.json(newHoliday, { status: 201 })
  } catch (error) {
    console.error('Unexpected error in POST /api/holidays:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}