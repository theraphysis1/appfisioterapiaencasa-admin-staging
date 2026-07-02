import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { searchParams } = new URL(request.url)
    const mes = searchParams.get('mes')
    const anio = searchParams.get('anio')

    if (!mes || !anio) {
      return NextResponse.json(
        { error: 'Se requieren los parámetros mes y anio' },
        { status: 400 }
      )
    }

    const mesNum = parseInt(mes)
    const anioNum = parseInt(anio)

    // Traer todos los terapeutas (activos e inactivos, se filtra después)
    const { data: terapeutas, error: errorTerapeutas } = await supabase
      .from('therapists')
      .select('id, nombre, apellido, activo')
      .order('nombre', { ascending: true })

    if (errorTerapeutas) throw errorTerapeutas

    // Traer configuración de nómina del mes para cada terapeuta
    const { data: payroll, error: errorPayroll } = await supabase
      .from('accounting_payroll')
      .select('*')
      .eq('mes', mesNum)
      .eq('anio', anioNum)

    if (errorPayroll) throw errorPayroll

    // Calcular rango de fechas del mes
    const fechaInicio = `${anioNum}-${String(mesNum).padStart(2, '0')}-01`
    const fechaFin = new Date(anioNum, mesNum, 0)
    const fechaFinStr = `${anioNum}-${String(mesNum).padStart(2, '0')}-${String(fechaFin.getDate()).padStart(2, '0')}`

    // Traer citas completadas del mes con su comisión
    const { data: citasCompletadas, error: errorCitas } = await supabase
      .from('appointments')
      .select('therapist_id, comision')
      .eq('estado', 'completada')
      .gte('fecha_hora', `${fechaInicio}T00:00:00`)
      .lte('fecha_hora', `${fechaFinStr}T23:59:59`)

    if (errorCitas) throw errorCitas

    // Traer citas agendadas (pendientes) del mes
    const { data: citasAgendadas, error: errorAgendadas } = await supabase
      .from('appointments')
      .select('therapist_id, comision')
      .eq('estado', 'agendada')
      .gte('fecha_hora', `${fechaInicio}T00:00:00`)
      .lte('fecha_hora', `${fechaFinStr}T23:59:59`)

    if (errorAgendadas) throw errorAgendadas

    // Agrupar citas completadas por terapeuta
    const completadasPorTerapeuta: Record<string, { sesiones: number; comision_total: number }> = {}
    for (const cita of citasCompletadas || []) {
      if (!completadasPorTerapeuta[cita.therapist_id]) {
        completadasPorTerapeuta[cita.therapist_id] = { sesiones: 0, comision_total: 0 }
      }
      completadasPorTerapeuta[cita.therapist_id].sesiones += 1
      completadasPorTerapeuta[cita.therapist_id].comision_total += Number(cita.comision)
    }

    // Agrupar citas agendadas por terapeuta
    const agendadasPorTerapeuta: Record<string, { sesiones: number; comision_total: number }> = {}
    for (const cita of citasAgendadas || []) {
      if (!agendadasPorTerapeuta[cita.therapist_id]) {
        agendadasPorTerapeuta[cita.therapist_id] = { sesiones: 0, comision_total: 0 }
      }
      agendadasPorTerapeuta[cita.therapist_id].sesiones += 1
      agendadasPorTerapeuta[cita.therapist_id].comision_total += Number(cita.comision)
    }

    // Construir respuesta por terapeuta
    const resultadoCompleto = terapeutas.map(terapeuta => {
      const config = payroll.find(p => p.therapist_id === terapeuta.id)
      const completadas = completadasPorTerapeuta[terapeuta.id] || { sesiones: 0, comision_total: 0 }
      const agendadas = agendadasPorTerapeuta[terapeuta.id] || { sesiones: 0, comision_total: 0 }

      const subsidio_base = Number(config?.subsidio_base || 0)
      const dias_descontados = Number(config?.dias_descontados || 0)
      const subsidio_a_pagar = subsidio_base - (subsidio_base / 30 * dias_descontados)
      const total_nomina = subsidio_a_pagar + completadas.comision_total

      return {
        therapist_id: terapeuta.id,
        nombre: terapeuta.nombre,
        apellido: terapeuta.apellido,
        activo: terapeuta.activo,
        subsidio_base,
        dias_descontados,
        subsidio_a_pagar: Math.round(subsidio_a_pagar),
        sesiones_completadas: completadas.sesiones,
        comision_completadas: completadas.comision_total,
        sesiones_pendientes: agendadas.sesiones,
        comision_pendientes: agendadas.comision_total,
        total_nomina: Math.round(total_nomina),
        tiene_config: !!config,
        config_id: config?.id || null
      }
    })

    // Mostrar: terapeutas activos, o inactivos que tuvieron actividad/config ese mes
    const resultado = resultadoCompleto.filter(t =>
      t.activo || t.sesiones_completadas > 0 || t.tiene_config
    )

    const total_nomina_general = resultado.reduce((sum, t) => sum + t.total_nomina, 0)
    const total_dinero_guardar = resultado.reduce((sum, t) => sum + t.comision_pendientes, 0)

    return NextResponse.json({
      terapeutas: resultado,
      total_nomina_general,
      total_dinero_guardar,
      mes: mesNum,
      anio: anioNum
    })
  } catch (error) {
    console.error('Error GET nomina:', error)
    return NextResponse.json(
      { error: 'Error al obtener la nómina' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const body = await request.json()
    const { therapist_id, mes, anio, subsidio_base, dias_descontados } = body

    if (!therapist_id || !mes || !anio) {
      return NextResponse.json(
        { error: 'Faltan campos requeridos: therapist_id, mes, anio' },
        { status: 400 }
      )
    }

    if (dias_descontados < 0 || dias_descontados > 30) {
      return NextResponse.json(
        { error: 'Los días descontados deben estar entre 0 y 30' },
        { status: 400 }
      )
    }

    const { data, error } = await supabase
      .from('accounting_payroll')
      .upsert({
        therapist_id,
        mes: parseInt(mes),
        anio: parseInt(anio),
        subsidio_base: Number(subsidio_base || 0),
        dias_descontados: Number(dias_descontados || 0),
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'therapist_id,mes,anio'
      })
      .select()
      .single()

    if (error) throw error

    return NextResponse.json(data, { status: 201 })
  } catch (error) {
    console.error('Error POST nomina:', error)
    return NextResponse.json(
      { error: 'Error al guardar la configuración de nómina' },
      { status: 500 }
    )
  }
}