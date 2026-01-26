import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

// GET - Obtener una cita específica
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = createAdminClient()
    const { id } = await params

    const { data, error } = await supabase
      .from('appointments')
      .select(`
        *,
        patient:patients(*),
        therapist:therapists(*),
        service:services(*),
        package:packages!appointments_package_id_fkey(*)
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

    // ✅ NUEVO: Calcular dirección final
    const hasOverride = !!(
      data.direccion_override || 
      data.barrio_override || 
      data.direccion_lat_override
    )

    const appointmentWithLocation = {
      ...data,
      // Campos calculados de dirección final
      direccion_final: data.direccion_override || data.patient?.direccion || null,
      barrio_final: data.barrio_override || data.patient?.barrio || null,
      referencia_final: data.referencia_override || data.patient?.referencia || null,
      direccion_lat_final: data.direccion_lat_override || data.patient?.direccion_lat || null,
      direccion_lng_final: data.direccion_lng_override || data.patient?.direccion_lng || null,
      tiene_direccion_temporal: hasOverride
    }

    return NextResponse.json({ appointment: appointmentWithLocation })
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
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = createAdminClient()
    const { id } = await params
    const body = await request.json()

    const {
      therapist_id,
      fecha_hora,
      patologia,
      valor,
      comision,
      observacion,
      estado,
      // ✅ NUEVO: Campos de dirección override
      direccion_override,
      barrio_override,
      referencia_override,
      direccion_lat_override,
      direccion_lng_override
    } = body

    // Validaciones
    if (!therapist_id || !fecha_hora || !patologia) {
      return NextResponse.json(
        { error: 'Los campos therapist_id, fecha_hora y patologia son requeridos' },
        { status: 400 }
      )
    }

    if (valor === undefined || comision === undefined) {
      return NextResponse.json(
        { error: 'Los campos valor y comision son requeridos' },
        { status: 400 }
      )
    }

    // Obtener el estado actual de la cita ANTES de actualizar
    const { data: currentAppointment } = await supabase
      .from('appointments')
      .select('therapist_id, fecha_hora, estado, package_id')
      .eq('id', id)
      .single()

    if (currentAppointment) {
      const therapistChanged = currentAppointment.therapist_id !== therapist_id
      const timeChanged = currentAppointment.fecha_hora !== fecha_hora

      // Si se cambia la fecha/hora o terapeuta, verificar disponibilidad
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

    // Actualizar la cita
    const { data, error } = await supabase
      .from('appointments')
      .update({
        therapist_id,
        fecha_hora,
        patologia,
        valor,
        comision,
        observacion: observacion || null,
        estado: estado || 'agendada',
        // ✅ NUEVO: Actualizar campos override
        // Si vienen como undefined, no se actualizan (mantienen valor actual)
        // Si vienen como null, se limpian (se eliminan)
        // Si vienen con valor, se actualizan
        ...(direccion_override !== undefined && { direccion_override }),
        ...(barrio_override !== undefined && { barrio_override }),
        ...(referencia_override !== undefined && { referencia_override }),
        ...(direccion_lat_override !== undefined && { direccion_lat_override }),
        ...(direccion_lng_override !== undefined && { direccion_lng_override }),
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

    // Si la cita pertenece a un paquete Y cambió el estado, actualizar contadores
    if (currentAppointment?.package_id && currentAppointment.estado !== estado) {
      const packageId = currentAppointment.package_id
      const oldStatus = currentAppointment.estado
      const newStatus = estado

      // Obtener el paquete actual
      const { data: packageData } = await supabase
        .from('packages')
        .select('sesiones_agendadas, sesiones_completadas, sesiones_pendientes_agendar')
        .eq('id', packageId)
        .single()

      if (packageData) {
        let newAgendadas = packageData.sesiones_agendadas
        let newCompletadas = packageData.sesiones_completadas
        let newPendientes = packageData.sesiones_pendientes_agendar

        // Revertir el estado anterior
        if (oldStatus === 'agendada') {
          newAgendadas -= 1
        } else if (oldStatus === 'completada') {
          newCompletadas -= 1
        } else if (oldStatus === 'cancelada') {
          newPendientes -= 1
        }

        // Aplicar el nuevo estado
        if (newStatus === 'agendada') {
          newAgendadas += 1
        } else if (newStatus === 'completada') {
          newCompletadas += 1
        } else if (newStatus === 'cancelada') {
          newPendientes += 1
        }

        // Actualizar el paquete
        const { error: packageError } = await supabase
          .from('packages')
          .update({
            sesiones_agendadas: newAgendadas,
            sesiones_completadas: newCompletadas,
            sesiones_pendientes_agendar: newPendientes
          })
          .eq('id', packageId)

        if (packageError) {
          console.error('Error updating package counters:', packageError)
        }
        // Verificar si el paquete se completó
        const { data: updatedPackage } = await supabase
          .from('packages')
          .select('total_sesiones, sesiones_completadas, estado')
          .eq('id', packageId)
          .single()

        if (updatedPackage && 
            updatedPackage.sesiones_completadas === updatedPackage.total_sesiones &&
            updatedPackage.estado !== 'completado') {
          // Cambiar el estado del paquete a completado
          const { error: statusError } = await supabase
            .from('packages')
            .update({ estado: 'completado' })
            .eq('id', packageId)

          if (statusError) {
            console.error('Error updating package status to completado:', statusError)
          }
        }
      }
    }

    // ✅ NUEVO: Calcular dirección final en la respuesta
    const hasOverride = !!(
      data.direccion_override || 
      data.barrio_override || 
      data.direccion_lat_override
    )

    const appointmentWithLocation = {
      ...data,
      direccion_final: data.direccion_override || data.patient?.direccion || null,
      barrio_final: data.barrio_override || data.patient?.barrio || null,
      referencia_final: data.referencia_override || data.patient?.referencia || null,
      direccion_lat_final: data.direccion_lat_override || data.patient?.direccion_lat || null,
      direccion_lng_final: data.direccion_lng_override || data.patient?.direccion_lng || null,
      tiene_direccion_temporal: hasOverride
    }

    return NextResponse.json({ appointment: appointmentWithLocation })
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
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = createAdminClient()
    const { id } = await params

    // Obtener la cita antes de cancelarla
    const { data: appointment } = await supabase
      .from('appointments')
      .select('package_id')
      .eq('id', id)
      .single()

    // Marcar como cancelada
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

    // Si la cita pertenece a un paquete, actualizar los contadores
    if (appointment?.package_id) {
      // Obtener el paquete actual
      const { data: packageData } = await supabase
        .from('packages')
        .select('sesiones_agendadas, sesiones_pendientes_agendar')
        .eq('id', appointment.package_id)
        .single()

      if (packageData) {
        // Decrementar sesiones_agendadas e incrementar sesiones_pendientes_agendar
        const { error: packageError } = await supabase
          .from('packages')
          .update({ 
            sesiones_agendadas: packageData.sesiones_agendadas - 1,
            sesiones_pendientes_agendar: packageData.sesiones_pendientes_agendar + 1
          })
          .eq('id', appointment.package_id)

        if (packageError) {
          console.error('Error updating package:', packageError)
        }
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