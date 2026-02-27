import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// GET - Obtener historial de contactos de una alerta
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient()
    const { id } = await params

    const { data, error } = await supabase
      .from('continuation_contact_logs')
      .select('id, notas, proximo_seguimiento, contactado_por, created_at')
      .eq('continuation_alert_id', id)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching contact logs:', error)
      return NextResponse.json(
        { error: 'Error al obtener el historial de contactos' },
        { status: 500 }
      )
    }

    return NextResponse.json({ contacts: data || [] })

  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json(
      { error: 'Error inesperado del servidor' },
      { status: 500 }
    )
  }
}

// POST - Registrar nuevo contacto
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient()
    const { id } = await params
    const body = await request.json()

    const { notas, proximo_seguimiento, contactado_por } = body

    // Verificar que la alerta existe
    const { data: existing, error: fetchError } = await supabase
      .from('continuation_alerts')
      .select('id')
      .eq('id', id)
      .single()

    if (fetchError || !existing) {
      return NextResponse.json(
        { error: 'Alerta no encontrada' },
        { status: 404 }
      )
    }

    // Registrar el contacto
    const { data, error } = await supabase
      .from('continuation_contact_logs')
      .insert({
        continuation_alert_id: id,
        notas: notas || null,
        proximo_seguimiento: proximo_seguimiento || null,
        contactado_por: contactado_por || null
      })
      .select()
      .single()

    if (error) {
      console.error('Error inserting contact log:', error)
      return NextResponse.json(
        { error: 'Error al registrar el contacto' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      message: '✅ Contacto registrado exitosamente',
      contact: data
    })

  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json(
      { error: 'Error inesperado del servidor' },
      { status: 500 }
    )
  }
}