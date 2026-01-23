import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// POST - Calcular precio de paquete con descuento de valoración
export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const body = await request.json()

    const { service_id, patient_id, forma_pago, sesiones_primer_pago } = body

    // Validaciones
    if (!service_id || !patient_id || !forma_pago) {
      return NextResponse.json(
        { error: 'Faltan campos requeridos: service_id, patient_id, forma_pago' },
        { status: 400 }
      )
    }

    if (!['completo', 'fraccionado'].includes(forma_pago)) {
      return NextResponse.json(
        { error: 'forma_pago debe ser "completo" o "fraccionado"' },
        { status: 400 }
      )
    }

    if (forma_pago === 'fraccionado' && !sesiones_primer_pago) {
      return NextResponse.json(
        { error: 'Para pago fraccionado debe especificar sesiones_primer_pago' },
        { status: 400 }
      )
    }

    // Obtener información del servicio
    const { data: service, error: serviceError } = await supabase
      .from('services')
      .select('*')
      .eq('id', service_id)
      .single()

    if (serviceError || !service) {
      return NextResponse.json(
        { error: 'Servicio no encontrado' },
        { status: 404 }
      )
    }

    if (service.tipo !== 'paquete') {
      return NextResponse.json(
        { error: 'El servicio debe ser de tipo paquete' },
        { status: 400 }
      )
    }

    // Verificar si tiene valoración previa
    const { data: appointments } = await supabase
    .from('appointments')
    .select(`
        id,
        valor,
        service:services!inner(tipo)
    `)
    .eq('patient_id', patient_id)
    .eq('estado', 'completada')
    .is('package_id', null)

    // Filtrar solo las valoraciones
    const valoraciones = appointments?.filter((apt: any) => apt.service?.tipo === 'valoracion') || []
    const tiene_valoracion = valoraciones.length > 0
    const valoracion_monto = tiene_valoracion ? parseFloat(valoraciones[0].valor.toString()) : 0
    const valoracion_cita_id = tiene_valoracion ? valoraciones[0].id : null

    // Calcular precio base y descuento
    const precio_base = parseFloat(service.valor_default.toString())
    const precio_con_descuento = tiene_valoracion ? precio_base - valoracion_monto : precio_base
    
    // Calcular sesiones totales (si tiene valoración, ya tiene 1 sesión completada)
    const total_sesiones_a_agendar = tiene_valoracion 
      ? service.cantidad_sesiones - 1 
      : service.cantidad_sesiones

    // Calcular distribución de pagos
    let calculo = {
      precio_base,
      tiene_valoracion,
      valoracion_monto,
      valoracion_cita_id,
      descuento_aplicado: valoracion_monto,
      precio_final: precio_con_descuento,
      total_sesiones: service.cantidad_sesiones,
      total_sesiones_a_agendar,
      forma_pago,
      numero_pagos: forma_pago === 'completo' ? 1 : 2,
      monto_primer_pago: 0,
      monto_segundo_pago: 0,
      sesiones_primer_pago: 0,
      sesiones_segundo_pago: 0
    }

    if (forma_pago === 'completo') {
      calculo.monto_primer_pago = precio_con_descuento
      calculo.sesiones_primer_pago = total_sesiones_a_agendar
      calculo.monto_segundo_pago = 0
      calculo.sesiones_segundo_pago = 0
    } else {
      // Pago fraccionado
      const sesiones_pago_1 = sesiones_primer_pago
      const sesiones_pago_2 = total_sesiones_a_agendar - sesiones_pago_1

      if (sesiones_pago_1 <= 0 || sesiones_pago_2 <= 0) {
        return NextResponse.json(
          { error: 'La distribución de sesiones es inválida' },
          { status: 400 }
        )
      }

      // Calcular montos proporcionales
      const precio_por_sesion = precio_con_descuento / total_sesiones_a_agendar
      calculo.monto_primer_pago = Math.round(precio_por_sesion * sesiones_pago_1)
      calculo.monto_segundo_pago = Math.round(precio_por_sesion * sesiones_pago_2)
      calculo.sesiones_primer_pago = sesiones_pago_1
      calculo.sesiones_segundo_pago = sesiones_pago_2
    }

    return NextResponse.json({ calculo })

  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json(
      { error: 'Error inesperado del servidor' },
      { status: 500 }
    )
  }
}