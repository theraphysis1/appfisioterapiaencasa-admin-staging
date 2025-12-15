import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// GET - Obtener una cita específica
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient()
    const { id } = params

    const { data, error } = await supabase
      .from('appointments')
      .select(`
        *,
        patient:patients(*),
        therapist:therapists(*),
        service:services(*),
        package:packages(*)
      `)
      .eq('id', id)
      .single()

    if (error) {
      console.error('Error fetching appointment:', error)
      return NextResponse.json(
        { error: 'Error al obtener la cita' },
        { status: 500 }
      )
    }

    if (!data) {
      return NextResponse.json(
        { error: 'Cita no encontrada' },
        { status: 404 }
      )
    }

    return NextResponse.json({ appointment: data })
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json(
      { error: 'Error inesperado del servidor' },
      { status: 500 }
    )
  }
}

// PUT - Actualizar una cita
export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient()
    const { id } = params
    const body = await request.json()

    const {
      patient_id,
      therapist_id,
      service_id,
      fecha_hora,
      patologia,
      valor,
      comision,
      observacion,
      estado
    } = body

    // Validaciones
    if (!patient_id || !therapist_id || !service_id || !fecha_hora || !patologia) {
      return NextResponse.json(
        { error: 'Los campos patient_id, therapist_id, service_id, fecha_hora y patologia son requeridos' },
        { status: 400 }
      )
    }

    if (valor === undefined || comision === undefined) {
      return NextResponse.json(
        { error: 'Los campos valor y comision son requeridos' },
        { status: 400 }
      )
    }

    // Si se cambia la fecha/hora o terapeuta, verificar disponibilidad
    const { data: currentAppointment } = await supabase
      .from('appointments')
      .select('therapist_id, fecha_hora')
      .eq('id', id)
      .single()

    if (currentAppointment) {
      const therapistChanged = currentAppointment.therapist_id !== therapist_id
      const timeChanged = currentAppointment.fecha_hora !== fecha_hora

      if (therapistChanged || timeChanged) {
        const { data: conflictingAppointment } = await supabase
          .from('appointments')
          .select('id')
          .eq('therapist_id', therapist_id)
          .eq('fecha_hora', fecha_hora)
          .eq('estado', 'agendada')
          .neq('id', id)
          .single()

        if (conflictingAppointment) {
          return NextResponse.json(
            { error: 'El terapeuta ya tiene una cita agendada en ese horario' },
            { status: 400 }
          )
        }
      }
    }

    const { data, error } = await supabase
      .from('appointments')
      .update({
        patient_id,
        therapist_id,
        service_id,
        fecha_hora,
        patologia,
        valor,
        comision,
        observacion: observacion || null,
        estado: estado || 'agendada',
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select(`
        *,
        patient:patients(*),
        therapist:therapists(*),
        service:services(*)
      `)
      .single()

    if (error) {
      console.error('Error updating appointment:', error)
      return NextResponse.json(
        { error: 'Error al actualizar la cita' },
        { status: 500 }
      )
    }

    return NextResponse.json({ appointment: data })
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json(
      { error: 'Error inesperado del servidor' },
      { status: 500 }
    )
  }
}

// DELETE - Cancelar una cita
export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient()
    const { id } = params

    // En lugar de eliminar, marcamos como cancelada
    const { data, error } = await supabase
      .from('appointments')
      .update({ 
        estado: 'cancelada',
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('Error canceling appointment:', error)
      return NextResponse.json(
        { error: 'Error al cancelar la cita' },
        { status: 500 }
      )
    }

    // Si la cita pertenece a un paquete, actualizar el contador
    if (data.package_id) {
      const { error: packageError } = await supabase
        .from('packages')
        .update({ 
          sesiones_agendadas: supabase.rpc('decrement', { row_id: data.package_id }),
          sesiones_pendientes_agendar: supabase.rpc('increment', { row_id: data.package_id })
        })
        .eq('id', data.package_id)

      if (packageError) {
        console.error('Error updating package:', packageError)
      }
    }

    return NextResponse.json({ 
      message: 'Cita cancelada exitosamente',
      appointment: data 
    })
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json(
      { error: 'Error inesperado del servidor' },
      { status: 500 }
    )
  }
}