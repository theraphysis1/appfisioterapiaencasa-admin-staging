import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

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
      appointments // Array de citas: [{ therapist_id, fecha_hora, valor, comision }, ...]
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

    // Crear todas las citas asociadas al paquete
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
      estado: 'agendada'
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

    return NextResponse.json({ 
      package: packageData,
      appointments: createdAppointments,
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