import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  try {
    const supabase = await createClient()
    const { searchParams } = new URL(request.url)
    
    const dateFrom = searchParams.get('date_from')
    const dateTo = searchParams.get('date_to')

    // Validar que las fechas sean proporcionadas
    if (!dateFrom || !dateTo) {
      return NextResponse.json(
        { error: 'Se requieren date_from y date_to' },
        { status: 400 }
      )
    }

    // Ajustar dateTo para incluir todo el día final (23:59:59)
    const dateToEnd = `${dateTo}T23:59:59.999Z`

    console.log('📊 Consultando estadísticas:', { dateFrom, dateToEnd })

    // CONSULTA ÚNICA OPTIMIZADA - Obtiene todos los datos en una sola query
    const { data: allAppointments, error: appointmentsError } = await supabase
      .from('appointments')
      .select(`
        id,
        therapist_id,
        fecha_hora,
        valor,
        comision,
        estado,
        therapists (
          id,
          nombre,
          apellido
        )
      `)
      .gte('fecha_hora', dateFrom)
      .lte('fecha_hora', dateToEnd)

    if (appointmentsError) {
      console.error('❌ Error en consulta:', appointmentsError)
      throw appointmentsError
    }

    console.log(`✅ Registros obtenidos: ${allAppointments?.length || 0}`)

    // PROCESAMIENTO OPTIMIZADO - Un solo recorrido de datos
    const statusCounts: Record<string, number> = {}
    let totalIngresos = 0
    let totalComisiones = 0
    let totalIngresosAgendados = 0
    let totalComisionesAgendadas = 0
    
    const therapistMap: Record<string, any> = {}
    const dailyIngresosMap: Record<string, number> = {}

    // Calcular fecha de hace 7 días para el gráfico
    const sevenDaysAgo = new Date()
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
    const sevenDaysAgoTimestamp = sevenDaysAgo.getTime()

    // UN SOLO RECORRIDO para calcular todas las estadísticas
    allAppointments.forEach((apt) => {
      const estado = apt.estado
      const valor = apt.valor || 0
      const comision = apt.comision || 0
      const therapistId = apt.therapist_id
      const fechaHora = new Date(apt.fecha_hora)
      const fechaStr = apt.fecha_hora.split('T')[0]

      // 1. Contar estados
      statusCounts[estado] = (statusCounts[estado] || 0) + 1

      // 2. Calcular totales financieros
      if (estado === 'completada') {
        totalIngresos += valor
        totalComisiones += comision
      } else if (estado === 'agendada') {
        totalIngresosAgendados += valor
        totalComisionesAgendadas += comision
      }

      // 3. Estadísticas por terapeuta
      if (!therapistMap[therapistId]) {
        // therapists viene como array, tomamos el primer elemento
        const therapist = Array.isArray(apt.therapists) ? apt.therapists[0] : apt.therapists
        
        therapistMap[therapistId] = {
          therapist_id: therapistId,
          nombre: therapist?.nombre || 'Desconocido',
          apellido: therapist?.apellido || '',
          citas_completadas: 0,
          ingresos_generados: 0,
          comisiones_ganadas: 0,
          citas_agendadas: 0,
          ingresos_proyectados: 0,
          comisiones_proyectadas: 0
        }
      }

      if (estado === 'completada') {
        therapistMap[therapistId].citas_completadas += 1
        therapistMap[therapistId].ingresos_generados += valor
        therapistMap[therapistId].comisiones_ganadas += comision
      } else if (estado === 'agendada') {
        therapistMap[therapistId].citas_agendadas += 1
        therapistMap[therapistId].ingresos_proyectados += valor
        therapistMap[therapistId].comisiones_proyectadas += comision
      }

      // 4. Datos para gráfico de últimos 7 días (solo completadas)
      if (fechaHora.getTime() >= sevenDaysAgoTimestamp && estado === 'completada') {
        dailyIngresosMap[fechaStr] = (dailyIngresosMap[fechaStr] || 0) + valor
      }
    })

    // Convertir mapas a arrays
    const therapistStatsArray = Object.values(therapistMap)
    const dailyIngresosArray = Object.entries(dailyIngresosMap)
      .map(([date, ingresos]) => ({ date, ingresos }))
      .sort((a, b) => a.date.localeCompare(b.date))

    console.log('📈 Estadísticas procesadas:', {
      totalCitas: allAppointments.length,
      terapeutas: therapistStatsArray.length,
      diasConIngresos: dailyIngresosArray.length
    })

    // RESPUESTA FINAL
    return NextResponse.json({
      date_range: {
        from: dateFrom,
        to: dateTo
      },
      appointments_by_status: statusCounts,
      financial_summary: {
        total_ingresos: totalIngresos,
        total_comisiones: totalComisiones,
        total_ingresos_agendados: totalIngresosAgendados,
        total_comisiones_agendadas: totalComisionesAgendadas
      },
      therapist_stats: therapistStatsArray,
      daily_ingresos_last_7_days: dailyIngresosArray
    })

  } catch (error: any) {
    console.error('💥 Error al obtener estadísticas:', error)
    return NextResponse.json(
      { error: 'Error al obtener estadísticas', details: error.message },
      { status: 500 }
    )
  }
}
