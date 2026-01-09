import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function GET(request: Request) {
  try {
    const supabase = createAdminClient()
    const { searchParams } = new URL(request.url)
    
    const fecha = searchParams.get('fecha') // Opcional, default: hoy
    
    // Si no se proporciona fecha, usar hoy
    let targetDate = fecha || new Date().toISOString().split('T')[0]
    
    const startOfDay = `${targetDate}T00:00:00-05:00`
    const endOfDay = `${targetDate}T23:59:59-05:00`

    // 1. OBTENER TODAS LAS CITAS DEL DÍA
    const { data: appointments, error: appointmentsError } = await supabase
      .from('appointments')
      .select(`
        id,
        fecha_hora,
        estado,
        therapist:therapists(
          id,
          nombre,
          apellido
        ),
        patient:patients(
          id,
          nombre,
          apellido
        )
      `)
      .gte('fecha_hora', startOfDay)
      .lte('fecha_hora', endOfDay)
      .neq('estado', 'cancelada')

    if (appointmentsError) {
      console.error('Error fetching appointments:', appointmentsError)
      return NextResponse.json(
        { error: 'Error al obtener las citas' },
        { status: 500 }
      )
    }

    // 2. OBTENER TODOS LOS REGISTROS GPS DEL DÍA
    const { data: attendanceRecords, error: recordsError } = await supabase
      .from('attendance_records')
      .select('*')
      .gte('created_at', startOfDay)
      .lte('created_at', endOfDay)

    if (recordsError) {
      console.error('Error fetching attendance records:', recordsError)
      return NextResponse.json(
        { error: 'Error al obtener los registros GPS' },
        { status: 500 }
      )
    }

    // 3. IDENTIFICAR CITAS SIN REGISTRO
    const sin_registro = []
    
    for (const appointment of appointments || []) {
      const hasRecord = attendanceRecords?.some(
        record => record.appointment_id === appointment.id
      )

      if (!hasRecord) {
        const therapistData = Array.isArray(appointment.therapist) 
          ? appointment.therapist[0] 
          : appointment.therapist
        
        const patientData = Array.isArray(appointment.patient) 
          ? appointment.patient[0] 
          : appointment.patient

        sin_registro.push({
          appointment_id: appointment.id,
          terapeuta: therapistData 
            ? `${therapistData.nombre} ${therapistData.apellido}` 
            : 'N/A',
          paciente: patientData 
            ? `${patientData.nombre} ${patientData.apellido}` 
            : 'N/A',
          hora_programada: new Date(appointment.fecha_hora).toLocaleTimeString('es-CO', {
            hour: '2-digit',
            minute: '2-digit',
            hour12: true
          }),
          fecha_hora: appointment.fecha_hora
        })
      }
    }

    // 4. IDENTIFICAR REGISTROS INCOMPLETOS (solo llegada, sin salida)
    const sin_salida = []
    
    for (const record of attendanceRecords || []) {
      if (record.llegada_registrada && !record.salida_registrada) {
        // Calcular minutos transcurridos desde la llegada
        const horaLlegada = new Date(record.hora_llegada_real)
        const ahora = new Date()
        const minutos_transcurridos = Math.round((ahora.getTime() - horaLlegada.getTime()) / 1000 / 60)

        // Obtener información del terapeuta y paciente
        const { data: therapist } = await supabase
          .from('therapists')
          .select('nombre, apellido')
          .eq('id', record.therapist_id)
          .single()

        const { data: patient } = await supabase
          .from('patients')
          .select('nombre, apellido')
          .eq('id', record.patient_id)
          .single()

        sin_salida.push({
          appointment_id: record.appointment_id,
          terapeuta: therapist 
            ? `${therapist.nombre} ${therapist.apellido}` 
            : 'N/A',
          paciente: patient 
            ? `${patient.nombre} ${patient.apellido}` 
            : 'N/A',
          hora_llegada: new Date(record.hora_llegada_real).toLocaleTimeString('es-CO', {
            hour: '2-digit',
            minute: '2-digit',
            hour12: true
          }),
          minutos_transcurridos
        })
      }
    }

    // 5. IDENTIFICAR DISPOSITIVOS DIFERENTES
    const dispositivo_diferente = []
    
    for (const record of attendanceRecords || []) {
      if (record.registro_completo && !record.dispositivo_consistente) {
        // Obtener información del terapeuta
        const { data: therapist } = await supabase
          .from('therapists')
          .select('nombre, apellido')
          .eq('id', record.therapist_id)
          .single()

        // Obtener el dispositivo más usado por este terapeuta
        const { data: allRecords } = await supabase
          .from('attendance_records')
          .select('device_model_llegada')
          .eq('therapist_id', record.therapist_id)
          .not('device_model_llegada', 'is', null)

        // Contar dispositivos
        const deviceCounts: { [key: string]: number } = {}
        allRecords?.forEach(r => {
          if (r.device_model_llegada) {
            deviceCounts[r.device_model_llegada] = (deviceCounts[r.device_model_llegada] || 0) + 1
          }
        })

        // Encontrar el más usado
        let deviceHabitual = 'N/A'
        let maxCount = 0
        for (const [device, count] of Object.entries(deviceCounts)) {
          if (count > maxCount) {
            maxCount = count
            deviceHabitual = device
          }
        }

        dispositivo_diferente.push({
          appointment_id: record.appointment_id,
          terapeuta: therapist 
            ? `${therapist.nombre} ${therapist.apellido}` 
            : 'N/A',
          device_habitual: deviceHabitual,
          device_usado_llegada: record.device_model_llegada || 'N/A',
          device_usado_salida: record.device_model_salida || 'N/A'
        })
      }
    }

    return NextResponse.json({
      fecha: targetDate,
      sin_registro,
      sin_salida,
      dispositivo_diferente,
      resumen: {
        total_sin_registro: sin_registro.length,
        total_sin_salida: sin_salida.length,
        total_dispositivo_diferente: dispositivo_diferente.length
      }
    })

  } catch (error) {
    console.error('Unexpected error in alerts:', error)
    return NextResponse.json(
      { error: 'Error inesperado del servidor' },
      { status: 500 }
    )
  }
}
