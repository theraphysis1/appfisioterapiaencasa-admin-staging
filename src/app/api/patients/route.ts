import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// GET - Obtener todos los pacientes
export async function GET() {
  try {
    const supabase = await createClient()
    
    const { data, error } = await supabase
      .from('patients')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching patients:', error)
      return NextResponse.json(
        { error: 'Error al obtener los pacientes' },
        { status: 500 }
      )
    }

    return NextResponse.json({ patients: data })
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json(
      { error: 'Error inesperado del servidor' },
      { status: 500 }
    )
  }
}

// POST - Crear nuevo paciente (o devolver existente si ya existe)
export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const body = await request.json()
    const { nombre, apellido, telefono, direccion, barrio, referencia } = body

    // Validaciones
    if (!nombre || !apellido || !telefono || !direccion || !barrio) {
      return NextResponse.json(
        { error: 'Los campos nombre, apellido, teléfono, dirección y barrio son requeridos' },
        { status: 400 }
      )
    }

    // Buscar si ya existe un paciente con el mismo teléfono
    const { data: existingPatient, error: searchError } = await supabase
      .from('patients')
      .select('*')
      .eq('telefono', telefono)
      .single()

    // Si existe, devolver el paciente existente
    if (existingPatient && !searchError) {
      console.log('Paciente existente encontrado:', existingPatient.id)
      return NextResponse.json({ patient: existingPatient }, { status: 200 })
    }

    // Si no existe, crear nuevo paciente
    const { data, error } = await supabase
      .from('patients')
      .insert([{
        nombre,
        apellido,
        telefono,
        direccion,
        barrio,
        referencia: referencia || null
      }])
      .select()
      .single()

    if (error) {
      console.error('Error creating patient:', error)
      return NextResponse.json(
        { error: 'Error al crear el paciente' },
        { status: 500 }
      )
    }

    return NextResponse.json({ patient: data }, { status: 201 })
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json(
      { error: 'Error inesperado del servidor' },
      { status: 500 }
    )
  }
}