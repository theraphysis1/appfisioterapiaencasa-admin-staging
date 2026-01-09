import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

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
    const estado = searchParams.get('estado') // completo, incompleto, sin_registro

    // Query base para contar total
    let countQuery = supabase
      .from('attendance_records')
      .select('id', { count: 'exact', head: true })

    // Query principal para obtener datos
    let dataQuery = supabase
      .from('attendance_records')
      .select(`
        *,
        therapist:therapists(
          id,
          nombre,
          apellido
        ),
        patient:patients(
          id,
          nombre,
          apellido
        ),
        appointment:appointments(
          id,
          fecha_hora,
          estado
        )
      `)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    // Aplicar filtro por terapeuta
    if (therapistId) {
      countQuery = countQuery.eq('therapist_id', therapistId)
      dataQuery = dataQuery.eq('therapist_id', therapistId)
    }

    // Aplicar filtro por rango de fechas
    if (fechaDesde) {
      const startDate = `${fechaDesde}T00:00:00-05:00`
      countQuery = countQuery.gte('created_at', startDate)
      dataQuery = dataQuery.gte('created_at', startDate)
    }

    if (fechaHasta) {
      const endDate = `${fechaHasta}T23:59:59-05:00`
      countQuery = countQuery.lte('created_at', endDate)
      dataQuery = dataQuery.lte('created_at', endDate)
    }

    // Aplicar filtro por estado
    if (estado === 'completo') {
      countQuery = countQuery.eq('registro_completo', true)
      dataQuery = dataQuery.eq('registro_completo', true)
    } else if (estado === 'incompleto') {
      countQuery = countQuery
        .eq('llegada_registrada', true)
        .eq('salida_registrada', false)
      dataQuery = dataQuery
        .eq('llegada_registrada', true)
        .eq('salida_registrada', false)
    } else if (estado === 'sin_registro') {
      countQuery = countQuery.eq('llegada_registrada', false)
      dataQuery = dataQuery.eq('llegada_registrada', false)
    }

    // Ejecutar ambas queries en paralelo
    const [{ count, error: countError }, { data, error: dataError }] = await Promise.all([
      countQuery,
      dataQuery
    ])

    if (countError) {
      console.error('Error counting records:', countError)
      return NextResponse.json(
        { error: 'Error al contar los registros' },
        { status: 500 }
      )
    }

    if (dataError) {
      console.error('Error fetching records:', dataError)
      return NextResponse.json(
        { error: 'Error al obtener los registros' },
        { status: 500 }
      )
    }

    // Formatear datos para la respuesta
    const registros = data?.map(record => {
      const therapistData = Array.isArray(record.therapist) 
        ? record.therapist[0] 
        : record.therapist
      
      const patientData = Array.isArray(record.patient) 
        ? record.patient[0] 
        : record.patient
      
      const appointmentData = Array.isArray(record.appointment) 
        ? record.appointment[0] 
        : record.appointment

      return {
        id: record.id,
        appointment_id: record.appointment_id,
        terapeuta: therapistData 
          ? `${therapistData.nombre} ${therapistData.apellido}` 
          : 'N/A',
        paciente: patientData 
          ? `${patientData.nombre} ${patientData.apellido}` 
          : 'N/A',
        fecha_programada: appointmentData?.fecha_hora || null,
        hora_llegada_real: record.hora_llegada_real,
        hora_salida_real: record.hora_salida_real,
        duracion_minutos: record.duracion_real_minutos,
        device_model_llegada: record.device_model_llegada,
        device_model_salida: record.device_model_salida,
        dispositivo_consistente: record.dispositivo_consistente,
        fingerprint_consistente: record.fingerprint_consistente,
        distancia_llegada_metros: record.distancia_llegada_metros,
        distancia_salida_metros: record.distancia_salida_metros,
        llegada_registrada: record.llegada_registrada,
        salida_registrada: record.salida_registrada,
        registro_completo: record.registro_completo,
        observaciones: record.observaciones,
        created_at: record.created_at
      }
    }) || []

    const totalPages = Math.ceil((count || 0) / limit)

    return NextResponse.json({
      registros,
      pagination: {
        page,
        limit,
        total: count || 0,
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
