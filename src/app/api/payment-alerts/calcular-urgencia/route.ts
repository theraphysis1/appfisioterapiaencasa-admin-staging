import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// POST - Calcular y actualizar urgencia de todas las alertas activas
export async function POST() {
  try {
    const supabase = await createClient()

    // Obtener todas las alertas activas
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
        message: 'No hay alertas activas para procesar',
        actualizadas: 0
      })
    }

    const hoy = new Date()
    let actualizadas = 0
    let cambios = {
      urgente: 0,
      normal: 0,
      bajo: 0
    }

    // Procesar cada alerta
    for (const alert of alerts) {
      const fechaUltimaSesion = new Date(alert.fecha_ultima_sesion_pagada)
      const diffTime = fechaUltimaSesion.getTime() - hoy.getTime()
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

      let nuevo_nivel: 'urgente' | 'normal' | 'bajo'

      // Calcular nuevo nivel de urgencia
      if (diffDays <= 3) {
        nuevo_nivel = 'urgente'
      } else if (diffDays <= 7) {
        nuevo_nivel = 'normal'
      } else {
        nuevo_nivel = 'bajo'
      }

      // Solo actualizar si cambió el nivel
      if (nuevo_nivel !== alert.nivel_urgencia) {
        const { error: updateError } = await supabase
          .from('payment_alerts')
          .update({ 
            nivel_urgencia: nuevo_nivel,
            updated_at: new Date().toISOString()
          })
          .eq('id', alert.id)

        if (!updateError) {
          actualizadas++
          cambios[nuevo_nivel]++
        }
      }
    }

    return NextResponse.json({ 
      message: `Urgencias actualizadas exitosamente`,
      total_procesadas: alerts.length,
      actualizadas,
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