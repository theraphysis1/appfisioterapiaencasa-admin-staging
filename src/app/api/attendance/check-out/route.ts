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

    // 4. BUSCAR REGISTRO DE LLEGADA EXISTENTE
    let query = supabase
      .from('attendance_records')
      .select(`
        *,
        patient:patients(
          id,
          direccion_lat,
          direccion_lng
        )
      `)
      .eq('therapist_id', therapist_id)
      .eq('llegada_registrada', true)
      .eq('salida_registrada', false)

    if (appointment_id) {
      query = query.eq('appointment_id', appointment_id)
    }

    const { data: existingRecord, error: recordError } = await query.single()

    if (recordError || !existingRecord) {
      return NextResponse.json(
        { error: 'No existe registro de llegada para esta cita' },
        { status: 400 }
      )
    }

    // 5. VERIFICAR QUE NO EXISTA REGISTRO PREVIO DE SALIDA
    if (existingRecord.salida_registrada) {
      return NextResponse.json(
        { error: 'Ya registraste tu salida para esta cita' },
        { status: 400 }
      )
    }

    // 6. CALCULAR DISTANCIA GPS (si tenemos coordenadas del paciente)
    let distancia_metros = null
    
    const patientData = Array.isArray(existingRecord.patient) 
      ? existingRecord.patient[0] 
      : existingRecord.patient

    const patient_lat = patientData?.direccion_lat
    const patient_lng = patientData?.direccion_lng

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
    }

    // 7. CALCULAR DURACIÓN (en minutos)
    const hora_llegada = new Date(existingRecord.hora_llegada_real)
    const hora_salida = new Date()
    const duracion_minutos = Math.round((hora_salida.getTime() - hora_llegada.getTime()) / 1000 / 60)

    // 8. COMPARAR DISPOSITIVOS
    const dispositivo_consistente = 
      existingRecord.device_model_llegada === device_model

    const fingerprint_consistente = 
      existingRecord.device_fingerprint_llegada === device_fingerprint

    // 9. OBTENER IP DEL REQUEST
    const ip_address = request.headers.get('x-forwarded-for') || 
                      request.headers.get('x-real-ip') || 
                      'unknown'

    // 10. ACTUALIZAR REGISTRO CON DATOS DE SALIDA
    const now = new Date().toISOString()

    const { data: updatedRecord, error: updateError } = await supabase
      .from('attendance_records')
      .update({
        hora_salida_real: now,
        ubicacion_salida_lat: latitude,
        ubicacion_salida_lng: longitude,
        device_model_salida: device_model,
        device_fingerprint_salida: device_fingerprint,
        user_agent_salida: user_agent || null,
        ip_address_salida: ip_address,
        distancia_salida_metros: distancia_metros,
        duracion_real_minutos: duracion_minutos,
        dispositivo_consistente,
        fingerprint_consistente,
        salida_registrada: true,
        registro_completo: true
      })
      .eq('id', existingRecord.id)
      .select()
      .single()

    if (updateError) {
      console.error('Error updating check-out:', updateError)
      return NextResponse.json(
        { error: 'Error al registrar la salida' },
        { status: 500 }
      )
    }

    // 11. GENERAR ALERTAS SI ES NECESARIO
    const alertas: string[] = []

    if (duracion_minutos < 40) {
      alertas.push('Duración menor a 40 minutos')
    }

    if (!dispositivo_consistente) {
      alertas.push('Dispositivo diferente detectado')
    }

    if (!fingerprint_consistente) {
      alertas.push('Fingerprint de dispositivo diferente')
    }

    if (distancia_metros && distancia_metros > 100) {
      alertas.push(`Distancia de salida mayor a 100m (${distancia_metros}m)`)
    }

    return NextResponse.json({
      success: true,
      hora_salida: updatedRecord.hora_salida_real,
      duracion_minutos,
      dispositivo_consistente,
      fingerprint_consistente,
      distancia_metros,
      alertas: alertas.length > 0 ? alertas : undefined,
      mensaje: 'Salida registrada exitosamente'
    }, { status: 200 })

  } catch (error) {
    console.error('Unexpected error in check-out:', error)
    return NextResponse.json(
      { error: 'Error inesperado del servidor' },
      { status: 500 }
    )
  }
}
