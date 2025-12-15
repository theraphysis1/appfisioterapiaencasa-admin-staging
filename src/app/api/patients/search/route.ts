import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// GET - Buscar pacientes por nombre o apellido
export async function GET(request: Request) {
  try {
    const supabase = await createClient()
    const { searchParams } = new URL(request.url)
    const query = searchParams.get('q')

    if (!query || query.trim().length === 0) {
      return NextResponse.json(
        { error: 'El parámetro de búsqueda es requerido' },
        { status: 400 }
      )
    }

    const searchTerm = `%${query.trim()}%`

    const { data, error } = await supabase
      .from('patients')
      .select('*')
      .or(`nombre.ilike.${searchTerm},apellido.ilike.${searchTerm}`)
      .order('created_at', { ascending: false })
      .limit(10)

    if (error) {
      console.error('Error searching patients:', error)
      return NextResponse.json(
        { error: 'Error al buscar pacientes' },
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