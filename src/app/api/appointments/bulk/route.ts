import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// POST - Crear paquete con múltiples citas
// POST - Crear paquete con múltiples citas
export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const body = await request.json()

    const {
      patient_id,
      service_id,
      patologia,
      observacion,
      appointments, // Array de citas: [{ therapist_id, fecha_hora, valor, comision }, ...]
      // ✅ NUEVO: Campos de dirección override (aplicables a TODAS las citas del paquete)
      direccion_override,
      barrio_override,
      referencia_override,
      direccion_lat_override,
      direccion_lng_override
    } = body

    // Validaciones
    if (!patient_id || !service_id || !patologia || !appointments || !Array.isArray(appointments)) {
      return NextResponse.json(
        { error: 'Faltan campos requeridos o el formato de citas es inválido' },
        { status: 400 }
      )
    }

    if (appointments.length === 0) {
      return NextResponse.json(
        { error: 'Debe proporcionar al menos una cita' },
        { status: 400 }
      )
    }

    // Obtener información del servicio
    const { data: service, error: serviceError } = await supabase
      .from('services')
      .select('*')
      .eq('id', service_id)
      .single()

    if (serviceError || !service) {
      return NextResponse.json(
        { error: 'Servicio no encontrado' },
        { status: 404 }
      )
    }

    // Verificar que el número de citas coincida con el servicio
    if (service.tipo === 'paquete' && appointments.length !== service.cantidad_sesiones) {
      return NextResponse.json(
        { error: `El servicio ${service.nombre} requiere exactamente ${service.cantidad_sesiones} citas` },
        { status: 400 }
      )
    }

    // Verificar conflictos de horario para cada cita
    for (const apt of appointments) {
      const { data: conflictingAppointment } = await supabase
        .from('appointments')
        .select('id')
        .eq('therapist_id', apt.therapist_id)
        .eq('fecha_hora', apt.fecha_hora)
        .eq('estado', 'agendada')
        .single()

      if (conflictingAppointment) {
        return NextResponse.json(
          { error: `El terapeuta ya tiene una cita agendada el ${new Date(apt.fecha_hora).toLocaleString('es-CO')}` },
          { status: 400 }
        )
      }
    }

    // Calcular totales
    const valor_total = appointments.reduce((sum, apt) => sum + parseFloat(apt.valor), 0)
    const comision_total = appointments.reduce((sum, apt) => sum + parseFloat(apt.comision), 0)

    // Crear el paquete
    const { data: packageData, error: packageError } = await supabase
      .from('packages')
      .insert([{
        patient_id,
        service_id,
        total_sesiones: appointments.length,
        sesiones_agendadas: appointments.length,
        sesiones_completadas: 0,
        sesiones_pendientes_agendar: 0,
        valor_total,
        comision_total,
        estado: 'activo'
      }])
      .select()
      .single()

    if (packageError || !packageData) {
      console.error('Error creating package:', packageError)
      return NextResponse.json(
        { error: 'Error al crear el paquete' },
        { status: 500 }
      )
    }

    // ✅ NUEVO: Crear todas las citas con los campos override del paquete
    const appointmentsToInsert = appointments.map((apt: any) => ({
      patient_id,
      therapist_id: apt.therapist_id,
      service_id,
      package_id: packageData.id,
      fecha_hora: apt.fecha_hora,
      patologia,
      valor: apt.valor,
      comision: apt.comision,
      observacion: observacion || null,
      estado: 'agendada',
      // ✅ NUEVO: Aplicar override a TODAS las citas del paquete
      direccion_override: direccion_override || null,
      barrio_override: barrio_override || null,
      referencia_override: referencia_override || null,
      direccion_lat_override: direccion_lat_override || null,
      direccion_lng_override: direccion_lng_override || null
    }))

    const { data: createdAppointments, error: appointmentsError } = await supabase
      .from('appointments')
      .insert(appointmentsToInsert)
      .select(`
        *,
        patient:patients(*),
        therapist:therapists(*),
        service:services(*)
      `)

    if (appointmentsError) {
      console.error('Error creating appointments:', appointmentsError)
      
      // Rollback: eliminar el paquete creado
      await supabase
        .from('packages')
        .delete()
        .eq('id', packageData.id)

      return NextResponse.json(
        { error: 'Error al crear las citas del paquete' },
        { status: 500 }
      )
    }

    // ✅ NUEVO: Calcular dirección final para cada cita en la respuesta
    const appointmentsWithLocation = createdAppointments?.map(appointment => {
      const hasOverride = !!(
        appointment.direccion_override || 
        appointment.barrio_override || 
        appointment.direccion_lat_override
      )

      return {
        ...appointment,
        direccion_final: appointment.direccion_override || appointment.patient?.direccion || null,
        barrio_final: appointment.barrio_override || appointment.patient?.barrio || null,
        referencia_final: appointment.referencia_override || appointment.patient?.referencia || null,
        direccion_lat_final: appointment.direccion_lat_override || appointment.patient?.direccion_lat || null,
        direccion_lng_final: appointment.direccion_lng_override || appointment.patient?.direccion_lng || null,
        tiene_direccion_temporal: hasOverride
      }
    })

    return NextResponse.json({ 
      package: packageData,
      appointments: appointmentsWithLocation,
      message: 'Paquete y citas creados exitosamente'
    }, { status: 201 })

  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json(
      { error: 'Error inesperado del servidor' },
      { status: 500 }
    )
  }
}