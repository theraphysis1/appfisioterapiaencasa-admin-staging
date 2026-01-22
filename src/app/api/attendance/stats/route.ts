import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

interface Appointment {
  id: string
  fecha_hora: string
  direccion_override: string | null
  barrio_override: string | null
  direccion_lat_override: number | null
  direccion_lng_override: number | null
}

export async function GET(request: Request) {
  try {
    const supabase = createAdminClient()
    const { searchParams } = new URL(request.url)
    
    const therapistId = searchParams.get('therapist_id')
    const fechaDesde = searchParams.get('fecha_desde')
    const fechaHasta = searchParams.get('fecha_hasta')

    // Validar que al menos therapist_id esté presente
    if (!therapistId) {
      return NextResponse.json(
        { error: 'El parámetro therapist_id es requerido' },
        { status: 400 }
      )
    }

    // NUEVA LÓGICA: Primero obtener TODAS las citas del terapeuta en el rango de fechas
    let appointmentsQuery = supabase
      .from('appointments')
      .select('id, fecha_hora, direccion_override, barrio_override, direccion_lat_override, direccion_lng_override')
      .eq('therapist_id', therapistId)

    // Aplicar filtros de fecha a appointments
    if (fechaDesde) {
      const startDate = `${fechaDesde}T00:00:00-05:00`
      appointmentsQuery = appointmentsQuery.gte('fecha_hora', startDate)
    }

    if (fechaHasta) {
      const endDate = `${fechaHasta}T23:59:59-05:00`
      appointmentsQuery = appointmentsQuery.lte('fecha_hora', endDate)
    }

    const { data: appointments, error: appointmentsError } = await appointmentsQuery as { data: Appointment[] | null; error: any }

    if (appointmentsError) {
      console.error('Error fetching appointments:', appointmentsError)
      return NextResponse.json(
        { error: 'Error al obtener citas' },
        { status: 500 }
      )
    }

    const total_citas = appointments?.length || 0
    const appointmentIds = appointments?.map(a => a.id) || []

    // Obtener registros GPS para estas citas
    const { data: records, error: recordsError } = appointmentIds.length > 0
      ? await supabase
          .from('attendance_records')
          .select('*')
          .in('appointment_id', appointmentIds)
      : { data: [], error: null }

    if (recordsError) {
      console.error('Error fetching records:', recordsError)
      return NextResponse.json(
        { error: 'Error al obtener registros GPS' },
        { status: 500 }
      )
    }

    // Crear mapa de registros por appointment_id
    const recordsMap = new Map(
      records?.map(record => [record.appointment_id, record])
    )

    // Calcular estadísticas
    let registros_completos = 0
    let solo_llegada = 0
    let sin_registro = 0
    let cancelados_admin = 0

    appointments?.forEach(appointment => {
      const record = recordsMap.get(appointment.id)
      
      if (!record) {
        // No hay registro GPS para esta cita
        sin_registro++
      } else if (record.cancelada_por_admin) {
        cancelados_admin++
      } else if (record.registro_completo) {
        registros_completos++
      } else if (record.llegada_registrada && !record.salida_registrada) {
        solo_llegada++
      } else {
        sin_registro++
      }
    })

    const citas_validas = total_citas - cancelados_admin
    const porcentaje_cumplimiento = citas_validas > 0 
      ? parseFloat(((registros_completos / citas_validas) * 100).toFixed(1))
      : 0

    // Análisis de dispositivos (solo registros no cancelados)
    const deviceCounts: { [key: string]: number } = {}
    const deviceDates: { [key: string]: string[] } = {}

    records?.forEach(record => {
      // Excluir registros cancelados del análisis de dispositivos
      if (record.cancelada_por_admin) return
      
      if (record.device_model_llegada) {
        const model = record.device_model_llegada
        deviceCounts[model] = (deviceCounts[model] || 0) + 1
        
        if (!deviceDates[model]) {
          deviceDates[model] = []
        }
        
        if (record.created_at) {
          const fecha = new Date(record.created_at).toISOString().split('T')[0]
          if (!deviceDates[model].includes(fecha)) {
            deviceDates[model].push(fecha)
          }
        }
      }
    })

    // Encontrar dispositivo principal (el más usado)
    let principal = null
    let maxUsos = 0
    
    for (const [model, count] of Object.entries(deviceCounts)) {
      if (count > maxUsos) {
        maxUsos = count
        principal = model
      }
    }

    // Dispositivos diferentes al principal
    const dispositivos_diferentes = Object.entries(deviceCounts)
      .filter(([model]) => model !== principal)
      .map(([modelo, usos]) => ({
        modelo,
        usos,
        fechas: deviceDates[modelo] || []
      }))

    // Análisis de puntualidad (excluir cancelados y sin registro)
    const recordsConCita = records?.filter(r => 
      r.appointment_id && 
      r.hora_llegada_real &&
      !r.cancelada_por_admin
    ) || []

    let llegadas_tarde = 0
    let llegadas_puntuales = 0
    let total_minutos_tarde = 0

    for (const record of recordsConCita) {
      // Buscar la cita en el array de appointments
      const appointment = appointments?.find(a => a.id === record.appointment_id)

      if (appointment?.fecha_hora && record.hora_llegada_real) {
        const programada = new Date(appointment.fecha_hora)
        const real = new Date(record.hora_llegada_real)
        const diferencia_minutos = Math.round((real.getTime() - programada.getTime()) / 1000 / 60)

        if (diferencia_minutos > 5) {
          llegadas_tarde++
          total_minutos_tarde += diferencia_minutos
        } else {
          llegadas_puntuales++
        }
      }
    }

    const promedio_minutos_tarde = llegadas_tarde > 0
      ? Math.round(total_minutos_tarde / llegadas_tarde)
      : 0

    // Construir respuesta
    const stats = {
      total_citas,
      registros_completos,
      solo_llegada,
      sin_registro,
      cancelados_admin,
      porcentaje_cumplimiento,
      
      dispositivos: {
        principal: principal || 'N/A',
        usos_dispositivo_principal: maxUsos,
        dispositivos_diferentes
      },
      
      puntualidad: {
        promedio_minutos_tarde,
        llegadas_tarde,
        llegadas_puntuales,
        total_analizadas: llegadas_tarde + llegadas_puntuales
      }
    }

    return NextResponse.json(stats)

  } catch (error) {
    console.error('Unexpected error in stats:', error)
    return NextResponse.json(
      { error: 'Error inesperado del servidor' },
      { status: 500 }
    )
  }
}