import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

interface Therapist {
  id: string
  nombre: string
  apellido: string
}

interface Patient {
  id: string
  nombre: string
  apellido: string
  barrio: string | null
  direccion: string | null
}

interface Appointment {
  id: string
  fecha_hora: string
  estado: string
  therapist_id: string
  patient_id: string
  therapists: Therapist
  patients: Patient
}

export async function GET(request: Request) {
  try {
    const supabase = createAdminClient()
    const { searchParams } = new URL(request.url)
    
    // Parámetros de paginación
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const offset = (page - 1) * limit
    
    // Filtros opcionales
    const therapistId = searchParams.get('therapist_id')
    const fechaDesde = searchParams.get('fecha_desde')
    const fechaHasta = searchParams.get('fecha_hasta')
    const estado = searchParams.get('estado') // completo, incompleto, sin_registro, cancelado

    // NUEVA LÓGICA: Query base en appointments con LEFT JOIN a attendance_records
    const baseQuery = `
      id, fecha_hora, estado, therapist_id, patient_id,
      therapists!appointments_therapist_id_fkey(id, nombre, apellido),
      patients!appointments_patient_id_fkey(id, nombre, apellido, barrio, direccion)
    `

    let countQuery = supabase
      .from('appointments')
      .select('id', { count: 'exact', head: true })

    let dataQuery = supabase
      .from('appointments')
      .select(baseQuery)
      .order('fecha_hora', { ascending: false })

    // Aplicar filtro por terapeuta
    if (therapistId) {
      countQuery = countQuery.eq('therapist_id', therapistId)
      dataQuery = dataQuery.eq('therapist_id', therapistId)
    }

    // Aplicar filtro por rango de fechas
    if (fechaDesde) {
      const startDate = `${fechaDesde}T00:00:00-05:00`
      countQuery = countQuery.gte('fecha_hora', startDate)
      dataQuery = dataQuery.gte('fecha_hora', startDate)
    }

    if (fechaHasta) {
      const endDate = `${fechaHasta}T23:59:59-05:00`
      countQuery = countQuery.lte('fecha_hora', endDate)
      dataQuery = dataQuery.lte('fecha_hora', endDate)
    }

    // Ejecutar query de appointments
    const [countResult, dataResult] = await Promise.all([
      countQuery,
      dataQuery
    ])

    const { count, error: countError } = countResult
    const { data: appointments, error: dataError } = dataResult as { data: Appointment[] | null; error: any }

    if (countError) {
      console.error('Error counting appointments:', countError)
      return NextResponse.json(
        { error: 'Error al contar las citas' },
        { status: 500 }
      )
    }

    if (dataError) {
      console.error('Error fetching appointments:', dataError)
      return NextResponse.json(
        { error: 'Error al obtener las citas' },
        { status: 500 }
      )
    }

    // Obtener los IDs de las citas para buscar sus registros GPS
    const appointmentIds = appointments?.map(a => a.id) || []

    // Consultar registros GPS para estas citas
    const { data: attendanceRecords } = appointmentIds.length > 0
      ? await supabase
          .from('attendance_records')
          .select('*')
          .in('appointment_id', appointmentIds)
      : { data: [] }

    // Crear mapa de registros GPS por appointment_id
    const attendanceMap = new Map(
      attendanceRecords?.map(record => [record.appointment_id, record])
    )

    // Combinar appointments con sus attendance_records (LEFT JOIN simulado)
    let registrosCombinados = appointments?.map(appointment => {
      const attendance = attendanceMap.get(appointment.id) || null
      const therapist = appointment.therapists
      const patient = appointment.patients

      return {
        id: attendance?.id || `no-attendance-${appointment.id}`,
        appointment_id: appointment.id,
        terapeuta: therapist 
          ? `${therapist.nombre} ${therapist.apellido}` 
          : 'N/A',
        paciente: patient 
          ? `${patient.nombre} ${patient.apellido}` 
          : 'N/A',
        barrio_paciente: patient?.barrio || 'N/A',
        direccion_paciente: patient?.direccion || 'N/A',
        fecha_programada: appointment.fecha_hora,
        hora_llegada_real: attendance?.hora_llegada_real || null,
        hora_salida_real: attendance?.hora_salida_real || null,
        duracion_minutos: attendance?.duracion_real_minutos || null,
        device_model_llegada: attendance?.device_model_llegada || null,
        device_model_salida: attendance?.device_model_salida || null,
        dispositivo_consistente: attendance?.dispositivo_consistente || null,
        fingerprint_consistente: attendance?.fingerprint_consistente || null,
        distancia_llegada_metros: attendance?.distancia_llegada_metros || null,
        distancia_salida_metros: attendance?.distancia_salida_metros || null,
        llegada_registrada: attendance?.llegada_registrada || false,
        salida_registrada: attendance?.salida_registrada || false,
        registro_completo: attendance?.registro_completo || false,
        observaciones: attendance?.observaciones || null,
        cancelada_por_admin: attendance?.cancelada_por_admin || false,
        razon_cancelacion: attendance?.razon_cancelacion || null,
        fecha_cancelacion: attendance?.fecha_cancelacion || null,
        created_at: attendance?.created_at || appointment.fecha_hora
      }
    }) || []

    // Aplicar filtro por estado DESPUÉS de combinar
    if (estado === 'completo') {
      registrosCombinados = registrosCombinados.filter(r => 
        r.registro_completo && !r.cancelada_por_admin
      )
    } else if (estado === 'incompleto') {
      registrosCombinados = registrosCombinados.filter(r => 
        r.llegada_registrada && !r.salida_registrada && !r.cancelada_por_admin
      )
    } else if (estado === 'sin_registro') {
      registrosCombinados = registrosCombinados.filter(r => 
        !r.llegada_registrada && !r.cancelada_por_admin
      )
    } else if (estado === 'cancelado') {
      registrosCombinados = registrosCombinados.filter(r => 
        r.cancelada_por_admin
      )
    }

    // Aplicar paginación manualmente
    const totalFiltrados = registrosCombinados.length
    const registrosPaginados = registrosCombinados.slice(offset, offset + limit)

    const totalPages = Math.ceil(totalFiltrados / limit)

    return NextResponse.json({
      registros: registrosPaginados,
      pagination: {
        page,
        limit,
        total: totalFiltrados,
        totalPages,
        hasMore: page < totalPages
      }
    })

  } catch (error) {
    console.error('Unexpected error in records:', error)
    return NextResponse.json(
      { error: 'Error inesperado del servidor' },
      { status: 500 }
    )
  }
}