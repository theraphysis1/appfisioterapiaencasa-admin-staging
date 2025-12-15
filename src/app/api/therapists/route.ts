import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  try {
    const supabase = await createClient()
    
    const { data, error } = await supabase
      .from('therapists')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching therapists:', error)
      return NextResponse.json(
        { error: 'Error al obtener los terapeutas' },
        { status: 500 }
      )
    }

    return NextResponse.json({ therapists: data })
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json(
      { error: 'Error inesperado del servidor' },
      { status: 500 }
    )
  }
}