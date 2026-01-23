import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// POST - Registrar contacto con el paciente
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient()
    const { id } = await params
    const body = await request.json()

    const { 
      tipo_contacto, 
      notas, 
      resultado, 
      proximo_seguimiento,
      contactado_por 
    } = body

    // Validaciones
    if (!tipo_contacto) {
      return NextResponse.json(
        { error: 'tipo_contacto es requerido' },
        { status: 400 }
      )
    }

    if (!contactado_por) {
      return NextResponse.json(
        { error: 'contactado_por es requerido' },
        { status: 400 }
      )
    }

    const tiposValidos = ['llamada_exitosa', 'no_contesto', 'mensaje_voz', 'whatsapp', 'email']
    if (!tiposValidos.includes(tipo_contacto)) {
      return NextResponse.json(
        { error: `tipo_contacto debe ser uno de: ${tiposValidos.join(', ')}` },
        { status: 400 }
      )
    }

    // Obtener la alerta
    const { data: alert, error: alertError } = await supabase
      .from('payment_alerts')
      .select('*')
      .eq('id', id)
      .single()

    if (alertError || !alert) {
      return NextResponse.json(
        { error: 'Alerta no encontrada' },
        { status: 404 }
      )
    }

    // Actualizar la alerta
    const { data: updatedAlert, error: updateError } = await supabase
      .from('payment_alerts')
      .update({
        contactado: true,
        fecha_ultimo_contacto: new Date().toISOString(),
        proximo_seguimiento: proximo_seguimiento || null,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single()

    if (updateError) {
      console.error('Error updating alert:', updateError)
      return NextResponse.json(
        { error: 'Error al actualizar la alerta' },
        { status: 500 }
      )
    }

    // Crear registro en contact_logs
    const { data: contactLog, error: logError } = await supabase
      .from('contact_logs')
      .insert([{
        alert_id: id,
        package_id: alert.package_id,
        patient_id: alert.patient_id,
        tipo_contacto,
        notas: notas || null,
        resultado: resultado || null,
        proximo_seguimiento: proximo_seguimiento || null,
        contactado_por
      }])
      .select()
      .single()

    if (logError) {
      console.error('Error creating contact log:', logError)
      return NextResponse.json(
        { error: 'Error al registrar el contacto' },
        { status: 500 }
      )
    }

    return NextResponse.json({ 
      message: 'Contacto registrado exitosamente',
      alert: updatedAlert,
      contact_log: contactLog
    }, { status: 201 })

  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json(
      { error: 'Error inesperado del servidor' },
      { status: 500 }
    )
  }
}