import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const body = await request.json()

    const {
      appointment_id,
      latitude,
      longitude,
      device_model,
      device_fingerprint,
      user_agent
    } = body

    // 1. VALIDACIONES DE ENTRADA
    if (!latitude || !longitude || !device_model || !device_fingerprint) {
      return NextResponse.json(
        { error: 'Los campos latitude, longitude, device_model y device_fingerprint son requeridos' },
        { status: 400 }
      )
    }

    // 2. OBTENER USUARIO AUTENTICADO
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'No autenticado' },
        { status: 401 }
      )
    }

    // 3. OBTENER TERAPEUTA ID DEL USUARIO
    const { data: therapist, error: therapistError } = await supabase
      .from('therapists')
      .select('id')
      .eq('user_id', user.id)
      .single()

    if (therapistError || !therapist) {
      return NextResponse.json(
        { error: 'Usuario no es un terapeuta' },
        { status: 403 }
      )
    }

    const therapist_id = therapist.id

    // 4. SI HAY appointment_id, VALIDAR LA CITA
    let patient_id = null
    let patient_lat = null
    let patient_lng = null

    if (appointment_id) {
      const { data: appointment, error: appointmentError } = await supabase
        .from('appointments')
        .select(`
          id,
          therapist_id,
          patient_id,
          direccion_lat_override,
          direccion_lng_override,
          patient:patients(
            id,
            direccion_lat,
            direccion_lng
          )
        `)
        .eq('id', appointment_id)
        .single()

      if (appointmentError || !appointment) {
        return NextResponse.json(
          { error: 'Cita no encontrada' },
          { status: 404 }
        )
      }

      // Verificar que la cita pertenece al terapeuta
      if (appointment.therapist_id !== therapist_id) {
        return NextResponse.json(
          { error: 'No estás asignado a esta cita' },
          { status: 403 }
        )
      }

      patient_id = appointment.patient_id
      
      // El patient viene como array, acceder al primer elemento
      const patientData = Array.isArray(appointment.patient) 
        ? appointment.patient[0] 
        : appointment.patient

      // ✅ NUEVO: Usar coordenadas override si existen, sino usar las del paciente
      patient_lat = appointment.direccion_lat_override || patientData?.direccion_lat
      patient_lng = appointment.direccion_lng_override || patientData?.direccion_lng      
    }

    // 5. VERIFICAR QUE NO EXISTA REGISTRO PREVIO DE LLEGADA
    let existingRecord = null

    if (appointment_id) {
      const { data } = await supabase
        .from('attendance_records')
        .select('id, llegada_registrada')
        .eq('appointment_id', appointment_id)
        .eq('therapist_id', therapist_id)
        .single()
      
      existingRecord = data
    }

    if (existingRecord?.llegada_registrada) {
      return NextResponse.json(
        { error: 'Ya registraste tu llegada para esta cita' },
        { status: 400 }
      )
    }

    // 6. CALCULAR DISTANCIA GPS (si tenemos coordenadas del paciente)
    let distancia_metros = null

    if (patient_lat && patient_lng) {
      const { data: distanceData, error: distanceError } = await supabase
        .rpc('calculate_distance_meters', {
          lat1: patient_lat,
          lng1: patient_lng,
          lat2: latitude,
          lng2: longitude
        })

      if (distanceError) {
        console.error('Error calculating distance:', distanceError)
      } else {
        distancia_metros = distanceData
      }

      // Validar radio máximo (100 metros)
      if (distancia_metros && distancia_metros > 100) {
        return NextResponse.json(
          { 
            error: 'Estás muy lejos de la dirección del paciente',
            distancia_metros,
            distancia_maxima: 100
          },
          { status: 400 }
        )
      }
    }

    // 7. OBTENER IP DEL REQUEST
    const ip_address = request.headers.get('x-forwarded-for') || 
                      request.headers.get('x-real-ip') || 
                      'unknown'

    // 8. REGISTRAR LLEGADA
    const now = new Date().toISOString()

    const recordData = {
      appointment_id: appointment_id || null,
      therapist_id,
      patient_id,
      hora_llegada_real: now,
      ubicacion_llegada_lat: latitude,
      ubicacion_llegada_lng: longitude,
      direccion_lat_paciente: patient_lat,
      direccion_lng_paciente: patient_lng,
      device_model_llegada: device_model,
      device_fingerprint_llegada: device_fingerprint,
      user_agent_llegada: user_agent || null,
      ip_address_llegada: ip_address,
      distancia_llegada_metros: distancia_metros,
      llegada_registrada: true,
      salida_registrada: false,
      registro_completo: false
    }

    let result

    if (existingRecord) {
      // Actualizar registro existente
      const { data, error } = await supabase
        .from('attendance_records')
        .update(recordData)
        .eq('id', existingRecord.id)
        .select()
        .single()

      if (error) {
        console.error('Error updating attendance:', error)
        return NextResponse.json(
          { error: 'Error al actualizar el registro de asistencia' },
          { status: 500 }
        )
      }

      result = data
    } else {
      // Crear nuevo registro
      const { data, error } = await supabase
        .from('attendance_records')
        .insert([recordData])
        .select()
        .single()

      if (error) {
        console.error('Error creating attendance:', error)
        return NextResponse.json(
          { error: 'Error al crear el registro de asistencia' },
          { status: 500 }
        )
      }

      result = data
    }

    return NextResponse.json({
      success: true,
      attendance_id: result.id,
      hora_llegada: result.hora_llegada_real,
      distancia_metros: distancia_metros,
      mensaje: 'Llegada registrada exitosamente'
    }, { status: 201 })

  } catch (error) {
    console.error('Unexpected error in check-in:', error)
    return NextResponse.json(
      { error: 'Error inesperado del servidor' },
      { status: 500 }
    )
  }
}
