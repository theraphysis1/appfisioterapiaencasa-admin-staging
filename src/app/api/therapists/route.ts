import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: Request) {
  try {
    const supabase = await createClient()
    const { searchParams } = new URL(request.url)
    
    // Obtener parámetros de paginación
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const search = searchParams.get('search') || ''
    
    // Calcular offset para la paginación
    const offset = (page - 1) * limit
    
    // Construir query base
    let query = supabase
      .from('therapists')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
    
    // Aplicar búsqueda si existe
    if (search) {
      query = query.or(`nombre.ilike.%${search}%,apellido.ilike.%${search}%,cedula.ilike.%${search}%`)
    }
    
    // Aplicar paginación
    query = query.range(offset, offset + limit - 1)
    
    const { data, error, count } = await query

    if (error) {
      console.error('Error fetching therapists:', error)
      return NextResponse.json(
        { error: 'Error al obtener los terapeutas' },
        { status: 500 }
      )
    }

    return NextResponse.json({ 
      therapists: data,
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit)
      }
    })
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json(
      { error: 'Error inesperado del servidor' },
      { status: 500 }
    )
  }
}