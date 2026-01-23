import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

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
      // ✅ Campos de dirección override
      direccion_override,
      barrio_override,
      referencia_override,
      direccion_lat_override,
      direccion_lng_override,
      // ✅ NUEVO: Campos de pago fraccionado
      tiene_valoracion_previa,
      valoracion_cita_id,
      valoracion_monto,
      forma_pago, // 'completo' o 'fraccionado'
      numero_pagos, // 1 o 2
      monto_primer_pago,
      monto_segundo_pago,
      sesiones_primer_pago,
      sesiones_segundo_pago
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

    // ✅ NUEVO: Validar que si tiene valoración previa, solo debe crear (total_sesiones - 1) citas
    const sesiones_esperadas = tiene_valoracion_previa 
      ? service.cantidad_sesiones - 1 
      : service.cantidad_sesiones

    if (service.tipo === 'paquete' && appointments.length !== sesiones_esperadas) {
      return NextResponse.json(
        { error: `El servicio ${service.nombre} requiere exactamente ${sesiones_esperadas} citas nuevas ${tiene_valoracion_previa ? '(ya tiene 1 valoración)' : ''}` },
        { status: 400 }
      )
    }

    // ✅ NUEVO: Si tiene valoración, verificar que la cita existe y no está vinculada
    if (tiene_valoracion_previa && valoracion_cita_id) {
      const { data: valoracionCita, error: valoracionError } = await supabase
        .from('appointments')
        .select('id, package_id')
        .eq('id', valoracion_cita_id)
        .single()

      if (valoracionError || !valoracionCita) {
        return NextResponse.json(
          { error: 'La cita de valoración no existe' },
          { status: 404 }
        )
      }

      if (valoracionCita.package_id) {
        return NextResponse.json(
          { error: 'La valoración ya está vinculada a otro paquete' },
          { status: 400 }
        )
      }
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

    // ✅ NUEVO: Calcular saldo pendiente
    const saldo_pendiente = forma_pago === 'fraccionado' && monto_segundo_pago 
      ? parseFloat(monto_segundo_pago.toString())
      : 0

    // Crear el paquete
    const { data: packageData, error: packageError } = await supabase
      .from('packages')
      .insert([{
        patient_id,
        service_id,
        total_sesiones: service.cantidad_sesiones,
        sesiones_agendadas: appointments.length,
        sesiones_completadas: tiene_valoracion_previa ? 1 : 0,
        sesiones_pendientes_agendar: 0,
        valor_total,
        comision_total,
        estado: 'activo',
        // ✅ NUEVO: Campos de pago fraccionado
        tiene_valoracion_previa: tiene_valoracion_previa || false,
        valoracion_cita_id: valoracion_cita_id || null,
        valoracion_monto: valoracion_monto || 0,
        forma_pago: forma_pago || 'completo',
        numero_pagos: numero_pagos || 1,
        monto_primer_pago: monto_primer_pago || null,
        monto_segundo_pago: monto_segundo_pago || null,
        sesiones_primer_pago: sesiones_primer_pago || null,
        sesiones_segundo_pago: sesiones_segundo_pago || null,
        primer_pago_completado: true, // El primer pago se marca como completado al crear
        fecha_primer_pago: new Date().toISOString(),
        segundo_pago_completado: false,
        fecha_segundo_pago: null,
        saldo_pendiente
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

    // ✅ NUEVO: Si tiene valoración, vincularla al paquete
    if (tiene_valoracion_previa && valoracion_cita_id) {
      const { error: updateValoracionError } = await supabase
        .from('appointments')
        .update({ package_id: packageData.id })
        .eq('id', valoracion_cita_id)

      if (updateValoracionError) {
        console.error('Error vinculando valoración:', updateValoracionError)
        // No fallar, pero registrar el error
      }
    }

    // Crear todas las citas con los campos override del paquete
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

    // ✅ NUEVO: Registrar en payment_history si hay valoración previa
    if (tiene_valoracion_previa && valoracion_monto) {
      await supabase
        .from('payment_history')
        .insert([{
          package_id: packageData.id,
          patient_id,
          numero_pago: 0,
          monto: valoracion_monto,
          tipo_pago: 'valoracion',
          metodo_pago: null,
          notas: 'Valoración previa aplicada al paquete',
          registrado_por: 'Sistema'
        }])
    }

    // ✅ NUEVO: Registrar primer pago en payment_history
    if (monto_primer_pago) {
      await supabase
        .from('payment_history')
        .insert([{
          package_id: packageData.id,
          patient_id,
          numero_pago: 1,
          monto: monto_primer_pago,
          tipo_pago: 'pago_paquete',
          metodo_pago: null,
          notas: 'Primer pago del paquete',
          registrado_por: 'Sistema'
        }])
    }

    // ✅ NUEVO: Crear alerta si es pago fraccionado
    if (forma_pago === 'fraccionado' && appointments.length > 0) {
      // Obtener la fecha de la última sesión del primer pago
      const sesionesOrdenadas = [...appointments].sort(
        (a, b) => new Date(a.fecha_hora).getTime() - new Date(b.fecha_hora).getTime()
      )
      const ultimaSesionPrimerPago = sesionesOrdenadas[sesiones_primer_pago - 1]

      await supabase
        .from('payment_alerts')
        .insert([{
          package_id: packageData.id,
          patient_id,
          monto_pendiente: monto_segundo_pago,
          fecha_ultima_sesion_pagada: ultimaSesionPrimerPago.fecha_hora,
          nivel_urgencia: 'bajo',
          contactado: false,
          alerta_activa: true
        }])
    }

    // Calcular dirección final para cada cita en la respuesta
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
