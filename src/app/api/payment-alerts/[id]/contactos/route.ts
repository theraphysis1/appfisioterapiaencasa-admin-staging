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

    // Verificar que la alerta existe
    const { data: alert, error: alertError } = await supabase
      .from('payment_alerts')
      .select('id')
      .eq('id', id)
      .single()

    if (alertError || !alert) {
      return NextResponse.json(
        { error: 'Alerta no encontrada' },
        { status: 404 }
      )
    }

    // Obtener todos los contactos de esta alerta
    const { data: contacts, error } = await supabase
      .from('contact_logs')
      .select('*')
      .eq('alert_id', id)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching contacts:', error)
      return NextResponse.json(
        { error: 'Error al obtener el historial de contactos' },
        { status: 500 }
      )
    }

    // Formatear datos para mostrar
    const formattedContacts = contacts?.map(contact => ({
      ...contact,
      fecha_formateada: new Date(contact.created_at).toLocaleString('es-CO', {
        dateStyle: 'medium',
        timeStyle: 'short'
      }),
      tipo_contacto_label: getTipoContactoLabel(contact.tipo_contacto),
      resultado_label: getResultadoLabel(contact.resultado)
    }))

    return NextResponse.json({ 
      contacts: formattedContacts,
      total: contacts?.length || 0
    })

  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json(
      { error: 'Error inesperado del servidor' },
      { status: 500 }
    )
  }
}

// Helpers para labels
function getTipoContactoLabel(tipo: string): string {
  const labels: Record<string, string> = {
    'llamada_exitosa': 'Llamada exitosa',
    'no_contesto': 'No contestó',
    'mensaje_voz': 'Mensaje de voz',
    'whatsapp': 'WhatsApp',
    'email': 'Email'
  }
  return labels[tipo] || tipo
}

function getResultadoLabel(resultado: string | null): string {
  if (!resultado) return 'Sin resultado'
  
  const labels: Record<string, string> = {
    'confirmo_pago': 'Confirmó pago',
    'pide_extension': 'Pide extensión',
    'no_puede_pagar': 'No puede pagar',
    'otro': 'Otro'
  }
  return labels[resultado] || resultado
}