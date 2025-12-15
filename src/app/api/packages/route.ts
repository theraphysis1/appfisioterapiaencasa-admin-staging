import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// GET - Obtener todos los paquetes
export async function GET(request: Request) {
  try {
    const supabase = await createClient()
    const { searchParams } = new URL(request.url)
    
    // Filtros opcionales
    const patientId = searchParams.get('patient_id')
    const estado = searchParams.get('estado')

    let query = supabase
      .from('packages')
      .select(`
        *,
        patient:patients(*),
        service:services(*)
      `)
      .order('created_at', { ascending: false })

    // Aplicar filtros si existen
    if (patientId) {
      query = query.eq('patient_id', patientId)
    }
    
    if (estado) {
      query = query.eq('estado', estado)
    }

    const { data, error } = await query

    if (error) {
      console.error('Error fetching packages:', error)
      return NextResponse.json(
        { error: 'Error al obtener los paquetes' },
        { status: 500 }
      )
    }

    return NextResponse.json({ packages: data })
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json(
      { error: 'Error inesperado del servidor' },
      { status: 500 }
    )
  }
}