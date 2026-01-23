import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// GET - Contador de alertas activas
export async function GET() {
  try {
    const supabase = await createClient()

    // Contar alertas activas por nivel de urgencia
    const { data: alertas, error } = await supabase
      .from('payment_alerts')
      .select('nivel_urgencia, monto_pendiente')
      .eq('alerta_activa', true)

    if (error) {
      console.error('Error counting alerts:', error)
      return NextResponse.json(
        { error: 'Error al contar las alertas' },
        { status: 500 }
      )
    }

    // Agrupar por nivel de urgencia
    const urgentes = alertas?.filter(a => a.nivel_urgencia === 'urgente') || []
    const normales = alertas?.filter(a => a.nivel_urgencia === 'normal') || []
    const bajas = alertas?.filter(a => a.nivel_urgencia === 'bajo') || []

    // Calcular monto total por cobrar
    const monto_total = alertas?.reduce((sum, alert) => {
      return sum + parseFloat(alert.monto_pendiente.toString())
    }, 0) || 0

    return NextResponse.json({
      total: alertas?.length || 0,
      urgentes: urgentes.length,
      normales: normales.length,
      bajas: bajas.length,
      monto_total_pendiente: monto_total,
      desglose: {
        urgente: {
          cantidad: urgentes.length,
          monto: urgentes.reduce((sum, a) => sum + parseFloat(a.monto_pendiente.toString()), 0)
        },
        normal: {
          cantidad: normales.length,
          monto: normales.reduce((sum, a) => sum + parseFloat(a.monto_pendiente.toString()), 0)
        },
        bajo: {
          cantidad: bajas.length,
          monto: bajas.reduce((sum, a) => sum + parseFloat(a.monto_pendiente.toString()), 0)
        }
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