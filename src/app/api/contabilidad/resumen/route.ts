// src/app/api/contabilidad/resumen/route.ts

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

    // ── Verificar si el mes ya está guardado ─────────────────────────
    const { data: resumenGuardado } = await supabase
      .from('accounting_monthly_summary')
      .select('*')
      .eq('mes', mesNum)
      .eq('anio', anioNum)
      .maybeSingle()

    // Si ya está guardado, devolver los valores guardados como calculado
    if (resumenGuardado) {
      return NextResponse.json({
        mes: mesNum,
        anio: anioNum,
        calculado: {
          ingresos_bancolombia: Number(resumenGuardado.ingresos_bancolombia),
          guardado_mes_anterior: Number(resumenGuardado.guardado_mes_anterior),
          total_disponible: Number(resumenGuardado.total_disponible),
          nomina_total: Number(resumenGuardado.nomina_total),
          gastos_total: Number(resumenGuardado.gastos_total),
          total_egresos: Number(resumenGuardado.total_egresos),
          dinero_a_guardar: Number(resumenGuardado.dinero_a_guardar),
          utilidad: Number(resumenGuardado.utilidad),
          acumulado_historico: Number(resumenGuardado.acumulado_historico)
        },
        guardado: resumenGuardado,
        ya_guardado: true
      })
    }

    // ── Si no está guardado, calcular en tiempo real ─────────────────

    // 1. Ingresos Bancolombia del mes
    const { data: ingresos, error: errorIngresos } = await supabase
      .from('accounting_income')
      .select('monto')
      .eq('mes', mesNum)
      .eq('anio', anioNum)

    if (errorIngresos) throw errorIngresos
    const ingresos_bancolombia = ingresos.reduce(
      (sum, i) => sum + Number(i.monto), 0
    )

    // 2. Guardado del mes anterior
    const mesAnterior = mesNum === 1 ? 12 : mesNum - 1
    const anioAnterior = mesNum === 1 ? anioNum - 1 : anioNum

    const { data: resumenAnterior } = await supabase
      .from('accounting_monthly_summary')
      .select('dinero_a_guardar')
      .eq('mes', mesAnterior)
      .eq('anio', anioAnterior)
      .maybeSingle()

    const guardado_mes_anterior = Number(resumenAnterior?.dinero_a_guardar || 0)

    // 3. Nómina
    const fechaInicio = `${anioNum}-${String(mesNum).padStart(2, '0')}-01`
    const ultimoDia = new Date(anioNum, mesNum, 0).getDate()
    const fechaFin = `${anioNum}-${String(mesNum).padStart(2, '0')}-${String(ultimoDia).padStart(2, '0')}`

    const { data: terapeutas, error: errorTerapeutas } = await supabase
      .from('therapists')
      .select('id')

    if (errorTerapeutas) throw errorTerapeutas

    const { data: payroll, error: errorPayroll } = await supabase
      .from('accounting_payroll')
      .select('therapist_id, subsidio_base, dias_descontados')
      .eq('mes', mesNum)
      .eq('anio', anioNum)

    if (errorPayroll) throw errorPayroll

    const { data: citasCompletadas, error: errorCompletadas } = await supabase
      .from('appointments')
      .select('therapist_id, comision')
      .eq('estado', 'completada')
      .gte('fecha_hora', `${fechaInicio}T00:00:00`)
      .lte('fecha_hora', `${fechaFin}T23:59:59`)

    if (errorCompletadas) throw errorCompletadas

    const { data: citasAgendadas, error: errorAgendadas } = await supabase
      .from('appointments')
      .select('therapist_id, comision')
      .eq('estado', 'agendada')

    if (errorAgendadas) throw errorAgendadas

    // Agrupar comisiones por terapeuta
    const completadasMap: Record<string, number> = {}
    for (const c of citasCompletadas || []) {
      completadasMap[c.therapist_id] = (completadasMap[c.therapist_id] || 0) + Number(c.comision)
    }

    const agendadasMap: Record<string, number> = {}
    for (const c of citasAgendadas || []) {
      agendadasMap[c.therapist_id] = (agendadasMap[c.therapist_id] || 0) + Number(c.comision)
    }

    // Calcular nómina total y dinero a guardar
    let nomina_total = 0
    let dinero_a_guardar = 0

    for (const terapeuta of terapeutas) {
      const config = payroll.find(p => p.therapist_id === terapeuta.id)
      const subsidio_base = Number(config?.subsidio_base || 0)
      const dias_descontados = Number(config?.dias_descontados || 0)
      const subsidio_a_pagar = subsidio_base - (subsidio_base / 30 * dias_descontados)
      const comision_completadas = completadasMap[terapeuta.id] || 0
      nomina_total += Math.round(subsidio_a_pagar + comision_completadas)
      dinero_a_guardar += agendadasMap[terapeuta.id] || 0
    }

    // 4. Gastos del mes
    const { data: gastos, error: errorGastos } = await supabase
      .from('accounting_expenses')
      .select('monto')
      .eq('mes', mesNum)
      .eq('anio', anioNum)

    if (errorGastos) throw errorGastos
    const gastos_total = gastos.reduce((sum, g) => sum + Number(g.monto), 0)

    // 5. Fórmula financiera
    const total_disponible = ingresos_bancolombia + guardado_mes_anterior
    const total_egresos = nomina_total + gastos_total + dinero_a_guardar
    const utilidad = total_disponible - total_egresos

    // 6. Acumulado histórico
    const { data: historicos } = await supabase
      .from('accounting_monthly_summary')
      .select('utilidad, mes, anio')
      .or(`anio.lt.${anioNum},and(anio.eq.${anioNum},mes.lt.${mesNum})`)

    const acumulado_historico = (historicos || []).reduce(
      (sum, h) => sum + Number(h.utilidad), 0
    ) + utilidad

    return NextResponse.json({
      mes: mesNum,
      anio: anioNum,
      calculado: {
        ingresos_bancolombia,
        guardado_mes_anterior,
        total_disponible,
        nomina_total,
        gastos_total,
        total_egresos,
        dinero_a_guardar,
        utilidad,
        acumulado_historico
      },
      guardado: null,
      ya_guardado: false
    })

  } catch (error) {
    console.error('Error GET resumen:', error)
    return NextResponse.json(
      { error: 'Error al calcular el resumen financiero' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const body = await request.json()
    const {
      mes, anio,
      ingresos_bancolombia,
      guardado_mes_anterior,
      total_disponible,
      nomina_total,
      gastos_total,
      total_egresos,
      dinero_a_guardar,
      utilidad,
      acumulado_historico
    } = body

    if (!mes || !anio) {
      return NextResponse.json(
        { error: 'Se requieren mes y anio' },
        { status: 400 }
      )
    }

    const { data, error } = await supabase
      .from('accounting_monthly_summary')
      .upsert({
        mes: parseInt(mes),
        anio: parseInt(anio),
        ingresos_bancolombia: Number(ingresos_bancolombia || 0),
        guardado_mes_anterior: Number(guardado_mes_anterior || 0),
        total_disponible: Number(total_disponible || 0),
        nomina_total: Number(nomina_total || 0),
        gastos_total: Number(gastos_total || 0),
        total_egresos: Number(total_egresos || 0),
        dinero_a_guardar: Number(dinero_a_guardar || 0),
        utilidad: Number(utilidad || 0),
        acumulado_historico: Number(acumulado_historico || 0),
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'mes,anio'
      })
      .select()
      .single()

    if (error) throw error

    return NextResponse.json(data, { status: 201 })
  } catch (error) {
    console.error('Error POST resumen:', error)
    return NextResponse.json(
      { error: 'Error al guardar el resumen financiero' },
      { status: 500 }
    )
  }
}