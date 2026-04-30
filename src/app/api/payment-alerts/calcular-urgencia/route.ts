import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// POST - Calcular y actualizar urgencia de todas las alertas activas
export async function POST() {
  try {
    const supabase = await createClient()

    // Obtener todas las alertas activas con info del paquete
    const { data: alerts, error } = await supabase
      .from('payment_alerts')
      .select(`
        id,
        package_id,
        fecha_ultima_sesion_pagada,
        nivel_urgencia,
        package:packages(
          forma_pago,
          sesiones_primer_pago
        )
      `)
      .eq('alerta_activa', true)

    if (error) {
      console.error('Error fetching alerts:', error)
      return NextResponse.json(
        { error: 'Error al obtener las alertas' },
        { status: 500 }
      )
    }

    if (!alerts || alerts.length === 0) {
      return NextResponse.json({
        message: 'No hay alertas activas para procesar',
        actualizadas: 0
      })
    }

    // Obtener package_ids de paquetes fraccionados para recalcular fecha real
    const alertasFraccionadas = alerts.filter(
      (alert: any) =>
        alert.package?.forma_pago === 'fraccionado' &&
        alert.package?.sesiones_primer_pago > 0
    )

    const packageIds = alertasFraccionadas.map((alert: any) => alert.package_id)

    let fechaRealPorPaquete: Record<string, string | null> = {}

    if (packageIds.length > 0) {
      const { data: citas, error: citasError } = await supabase
        .from('appointments')
        .select('id, package_id, fecha_hora')
        .in('package_id', packageIds)
        .eq('estado', 'agendada')
        .order('fecha_hora', { ascending: true })

      if (!citasError && citas) {
        // Agrupar citas por package_id
        const citasAgrupadas: Record<string, any[]> = {}
        for (const cita of citas) {
          if (!citasAgrupadas[cita.package_id]) {
            citasAgrupadas[cita.package_id] = []
          }
          citasAgrupadas[cita.package_id].push(cita)
        }

        // Calcular fecha real para cada alerta fraccionada
        for (const alert of alertasFraccionadas) {
          const citasDelPaquete = citasAgrupadas[alert.package_id] || []
          const sesionesDelPrimerPago = (alert.package as any)?.sesiones_primer_pago || 0

          const citasCubiertasPrimerPago = citasDelPaquete.slice(0, sesionesDelPrimerPago)

          if (citasCubiertasPrimerPago.length > 0) {
            const ultimaCita = citasCubiertasPrimerPago[citasCubiertasPrimerPago.length - 1]
            fechaRealPorPaquete[alert.package_id] = ultimaCita.fecha_hora
          } else {
            fechaRealPorPaquete[alert.package_id] = null
          }
        }
      }
    }

    const hoy = new Date()
    let actualizadas = 0
    let fechasActualizadas = 0
    let cambios = {
      urgente: 0,
      normal: 0,
      bajo: 0
    }

    // Procesar cada alerta
    for (const alert of alerts) {
      // Determinar fecha a usar: calculada en tiempo real o la guardada en BD
      const fechaReal = fechaRealPorPaquete.hasOwnProperty(alert.package_id)
        ? fechaRealPorPaquete[alert.package_id]
        : alert.fecha_ultima_sesion_pagada

      const fechaUltimaSesion = fechaReal ? new Date(fechaReal) : null

      if (!fechaUltimaSesion) continue

      const diffTime = fechaUltimaSesion.getTime() - hoy.getTime()
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

      let nuevo_nivel: 'urgente' | 'normal' | 'bajo'

      if (diffDays <= 3) {
        nuevo_nivel = 'urgente'
      } else if (diffDays <= 7) {
        nuevo_nivel = 'normal'
      } else {
        nuevo_nivel = 'bajo'
      }

      // Preparar campos a actualizar
      const updateFields: any = {}

      // Actualizar fecha en BD si cambió
      if (
        fechaReal &&
        fechaReal !== alert.fecha_ultima_sesion_pagada
      ) {
        updateFields.fecha_ultima_sesion_pagada = fechaReal
        fechasActualizadas++
      }

      // Actualizar nivel si cambió
      if (nuevo_nivel !== alert.nivel_urgencia) {
        updateFields.nivel_urgencia = nuevo_nivel
        cambios[nuevo_nivel]++
        actualizadas++
      }

      // Solo hacer update si hay algo que cambiar
      if (Object.keys(updateFields).length > 0) {
        updateFields.updated_at = new Date().toISOString()

        await supabase
          .from('payment_alerts')
          .update(updateFields)
          .eq('id', alert.id)
      }
    }

    return NextResponse.json({
      message: 'Urgencias y fechas actualizadas exitosamente',
      total_procesadas: alerts.length,
      fechas_corregidas: fechasActualizadas,
      urgencias_actualizadas: actualizadas,
      cambios,
      desglose: {
        urgentes_ahora: cambios.urgente,
        normales_ahora: cambios.normal,
        bajas_ahora: cambios.bajo
      }
    })

  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json(
      { error: 'Error inesperado del servidor' },
      { status: 500 }
    )
  }
}

// GET - Obtener preview de cambios sin aplicarlos
export async function GET() {
  try {
    const supabase = await createClient()

    const { data: alerts, error } = await supabase
      .from('payment_alerts')
      .select('id, fecha_ultima_sesion_pagada, nivel_urgencia')
      .eq('alerta_activa', true)

    if (error) {
      console.error('Error fetching alerts:', error)
      return NextResponse.json(
        { error: 'Error al obtener las alertas' },
        { status: 500 }
      )
    }

    if (!alerts || alerts.length === 0) {
      return NextResponse.json({ 
        message: 'No hay alertas activas',
        cambios_propuestos: []
      })
    }

    const hoy = new Date()
    const cambios_propuestos = []

    for (const alert of alerts) {
      const fechaUltimaSesion = new Date(alert.fecha_ultima_sesion_pagada)
      const diffTime = fechaUltimaSesion.getTime() - hoy.getTime()
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

      let nuevo_nivel: 'urgente' | 'normal' | 'bajo'

      if (diffDays <= 3) {
        nuevo_nivel = 'urgente'
      } else if (diffDays <= 7) {
        nuevo_nivel = 'normal'
      } else {
        nuevo_nivel = 'bajo'
      }

      if (nuevo_nivel !== alert.nivel_urgencia) {
        cambios_propuestos.push({
          alert_id: alert.id,
          nivel_actual: alert.nivel_urgencia,
          nivel_propuesto: nuevo_nivel,
          dias_restantes: diffDays
        })
      }
    }

    return NextResponse.json({ 
      total_alertas: alerts.length,
      cambios_necesarios: cambios_propuestos.length,
      cambios_propuestos
    })

  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json(
      { error: 'Error inesperado del servidor' },
      { status: 500 }
    )
  }
}