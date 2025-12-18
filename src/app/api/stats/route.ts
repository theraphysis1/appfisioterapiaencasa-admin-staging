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

    // 1. TOTAL DE CITAS POR ESTADO EN EL RANGO
    const { data: appointmentsByStatus, error: statusError } = await supabase
      .from('appointments')
      .select('estado')
      .gte('fecha_hora', dateFrom)
      .lte('fecha_hora', dateToEnd)

    if (statusError) throw statusError

    // Contar citas por estado
    const statusCounts = appointmentsByStatus.reduce((acc: any, apt: any) => {
      acc[apt.estado] = (acc[apt.estado] || 0) + 1
      return acc
    }, {})

    // 2. SUMA DE INGRESOS Y COMISIONES EN EL RANGO
    const { data: financialData, error: financialError } = await supabase
      .from('appointments')
      .select('valor, comision, estado')
      .gte('fecha_hora', dateFrom)
      .lte('fecha_hora', dateToEnd)

    if (financialError) throw financialError

    const totalIngresos = financialData
      .filter((apt: any) => apt.estado === 'completada')
      .reduce((sum: number, apt: any) => sum + (apt.valor || 0), 0)

    const totalComisiones = financialData
      .filter((apt: any) => apt.estado === 'completada')
      .reduce((sum: number, apt: any) => sum + (apt.comision || 0), 0)

      // Calcular ingresos y comisiones AGENDADAS (proyectados)
    const totalIngresosAgendados = financialData
      .filter((apt: any) => apt.estado === 'agendada')
      .reduce((sum: number, apt: any) => sum + (apt.valor || 0), 0)

    const totalComisionesAgendadas = financialData
      .filter((apt: any) => apt.estado === 'agendada')
      .reduce((sum: number, apt: any) => sum + (apt.comision || 0), 0)

    // 3. ESTADÍSTICAS POR TERAPEUTA
    const { data: appointmentsWithTherapist, error: therapistError } = await supabase
      .from('appointments')
      .select(`
        therapist_id,
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

    if (therapistError) throw therapistError

    // Agrupar por terapeuta
    const therapistStats = appointmentsWithTherapist.reduce((acc: any, apt: any) => {
      const therapistId = apt.therapist_id
      
      if (!acc[therapistId]) {
        acc[therapistId] = {
          therapist_id: therapistId,
          nombre: apt.therapists?.nombre || 'Desconocido',
          apellido: apt.therapists?.apellido || '',
          citas_completadas: 0,
          ingresos_generados: 0,
          comisiones_ganadas: 0,
          citas_agendadas: 0,
          ingresos_proyectados: 0,
          comisiones_proyectadas: 0
        }
      }

      if (apt.estado === 'completada') {
        acc[therapistId].citas_completadas += 1
        acc[therapistId].ingresos_generados += apt.valor || 0
        acc[therapistId].comisiones_ganadas += apt.comision || 0
      }

      if (apt.estado === 'agendada') {
        acc[therapistId].citas_agendadas += 1
        acc[therapistId].ingresos_proyectados += apt.valor || 0
        acc[therapistId].comisiones_proyectadas += apt.comision || 0
      }

      return acc
    }, {})

    // Convertir objeto a array
    const therapistStatsArray = Object.values(therapistStats)

    // 4. DATOS PARA GRÁFICO DE ÚLTIMOS 7 DÍAS
    const sevenDaysAgo = new Date()
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
    const sevenDaysAgoStr = sevenDaysAgo.toISOString().split('T')[0]

    const { data: last7DaysData, error: graphError } = await supabase
      .from('appointments')
      .select('fecha_hora, valor, estado')
      .gte('fecha_hora', sevenDaysAgoStr)
      .lte('fecha_hora', dateToEnd)

    if (graphError) throw graphError

    // Agrupar por día
    const dailyIngresos = last7DaysData.reduce((acc: any, apt: any) => {
      const date = apt.fecha_hora.split('T')[0]
      
      if (!acc[date]) {
        acc[date] = 0
      }

      if (apt.estado === 'completada') {
        acc[date] += apt.valor || 0
      }

      return acc
    }, {})

    // Convertir a array ordenado
    const dailyIngresosArray = Object.entries(dailyIngresos)
      .map(([date, ingresos]) => ({ date, ingresos }))
      .sort((a, b) => a.date.localeCompare(b.date))

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
    console.error('Error al obtener estadísticas:', error)
    return NextResponse.json(
      { error: 'Error al obtener estadísticas', details: error.message },
      { status: 500 }
    )
  }
}
