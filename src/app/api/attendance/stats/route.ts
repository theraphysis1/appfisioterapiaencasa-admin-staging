import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

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

    // Query base
    let query = supabase
      .from('attendance_records')
      .select('*')
      .eq('therapist_id', therapistId)

    // Aplicar filtros de fecha
    if (fechaDesde) {
      const startDate = `${fechaDesde}T00:00:00-05:00`
      query = query.gte('created_at', startDate)
    }

    if (fechaHasta) {
      const endDate = `${fechaHasta}T23:59:59-05:00`
      query = query.lte('created_at', endDate)
    }

    const { data: records, error } = await query

    if (error) {
      console.error('Error fetching stats:', error)
      return NextResponse.json(
        { error: 'Error al obtener estadísticas' },
        { status: 500 }
      )
    }

    // Calcular estadísticas
    const total_citas = records?.length || 0
    const cancelados_admin = records?.filter(r => r.cancelada_por_admin).length || 0
    const registros_completos = records?.filter(r => r.registro_completo && !r.cancelada_por_admin).length || 0
    const solo_llegada = records?.filter(r => r.llegada_registrada && !r.salida_registrada && !r.cancelada_por_admin).length || 0
    const sin_registro = records?.filter(r => !r.llegada_registrada && !r.cancelada_por_admin).length || 0
    const citas_validas = total_citas - cancelados_admin
    const porcentaje_cumplimiento = citas_validas > 0 
      ? parseFloat(((registros_completos / citas_validas) * 100).toFixed(1))
      : 0

    // Análisis de dispositivos
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

    // Análisis de puntualidad (excluir cancelados)
    const registrosConCita = records?.filter(r => 
      r.appointment_id && 
      r.hora_llegada_real &&
      !r.cancelada_por_admin
    ) || []

    let llegadas_tarde = 0
    let llegadas_puntuales = 0
    let total_minutos_tarde = 0

    for (const record of registrosConCita) {
      // Obtener la cita para comparar hora programada
      const { data: appointment } = await supabase
        .from('appointments')
        .select('fecha_hora')
        .eq('id', record.appointment_id)
        .single()

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
