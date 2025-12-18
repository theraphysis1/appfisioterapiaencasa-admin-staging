import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// GET - Obtener un paciente específico
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient()
    const { id } = await params

    const { data, error } = await supabase
      .from('patients')
      .select('*')
      .eq('id', id)
      .single()

    if (error) {
      console.error('Error fetching patient:', error)
      return NextResponse.json(
        { error: 'Error al obtener el paciente' },
        { status: 500 }
      )
    }

    if (!data) {
      return NextResponse.json(
        { error: 'Paciente no encontrado' },
        { status: 404 }
      )
    }

    return NextResponse.json({ patient: data })
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json(
      { error: 'Error inesperado del servidor' },
      { status: 500 }
    )
  }
}

// PUT - Actualizar un paciente
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient()
    const { id } = await params
    const body = await request.json()

    const { nombre, apellido, telefono, direccion, barrio, referencia } = body

    // Validaciones
    if (!nombre || !apellido || !telefono || !direccion || !barrio) {
      return NextResponse.json(
        { error: 'Los campos nombre, apellido, teléfono, dirección y barrio son requeridos' },
        { status: 400 }
      )
    }

    const { data, error } = await supabase
      .from('patients')
      .update({
        nombre,
        apellido,
        telefono,
        direccion,
        barrio,
        referencia: referencia || null,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('Error updating patient:', error)
      return NextResponse.json(
        { error: 'Error al actualizar el paciente' },
        { status: 500 }
      )
    }

    return NextResponse.json({ patient: data })
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json(
      { error: 'Error inesperado del servidor' },
      { status: 500 }
    )
  }
}

// DELETE - Eliminar un paciente
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient()
    const { id } = await params

    // Verificar si el paciente tiene citas
    const { data: appointments } = await supabase
      .from('appointments')
      .select('id')
      .eq('patient_id', id)
      .limit(1)

    if (appointments && appointments.length > 0) {
      return NextResponse.json(
        { error: 'No se puede eliminar el paciente porque tiene citas asociadas' },
        { status: 400 }
      )
    }

    const { error } = await supabase
      .from('patients')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('Error deleting patient:', error)
      return NextResponse.json(
        { error: 'Error al eliminar el paciente' },
        { status: 500 }
      )
    }

    return NextResponse.json({ 
      message: 'Paciente eliminado exitosamente'
    })
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json(
      { error: 'Error inesperado del servidor' },
      { status: 500 }
    )
  }
}