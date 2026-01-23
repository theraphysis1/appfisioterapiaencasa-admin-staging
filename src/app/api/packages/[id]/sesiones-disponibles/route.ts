import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// GET - Obtener número de sesiones disponibles para agendar
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient()
    const { id } = await params

    // Obtener el paquete
    const { data: packageData, error: packageError } = await supabase
      .from('packages')
      .select('*')
      .eq('id', id)
      .single()

    if (packageError || !packageData) {
      return NextResponse.json(
        { error: 'Paquete no encontrado' },
        { status: 404 }
      )
    }

    // Si es pago completo, todas las sesiones están disponibles
    if (packageData.forma_pago === 'completo') {
      return NextResponse.json({
        sesiones_disponibles: packageData.total_sesiones,
        sesiones_agendadas: packageData.sesiones_agendadas,
        puede_agendar: packageData.sesiones_agendadas < packageData.total_sesiones,
        forma_pago: 'completo',
        todas_disponibles: true
      })
    }

    // Para pago fraccionado, calcular según pagos completados
    let sesiones_disponibles = 0
    
    // Si tiene valoración previa, sumar 1 (ya está completada)
    if (packageData.tiene_valoracion_previa) {
      sesiones_disponibles += 1
    }

    // Sumar sesiones del primer pago si está completado
    if (packageData.primer_pago_completado && packageData.sesiones_primer_pago) {
      sesiones_disponibles += packageData.sesiones_primer_pago
    }

    // Sumar sesiones del segundo pago si está completado
    if (packageData.segundo_pago_completado && packageData.sesiones_segundo_pago) {
      sesiones_disponibles += packageData.sesiones_segundo_pago
    }

    const puede_agendar = packageData.sesiones_agendadas < sesiones_disponibles

    return NextResponse.json({
      sesiones_disponibles,
      sesiones_agendadas: packageData.sesiones_agendadas,
      sesiones_completadas: packageData.sesiones_completadas,
      puede_agendar,
      forma_pago: 'fraccionado',
      primer_pago_completado: packageData.primer_pago_completado,
      segundo_pago_completado: packageData.segundo_pago_completado,
      sesiones_primer_pago: packageData.sesiones_primer_pago,
      sesiones_segundo_pago: packageData.sesiones_segundo_pago,
      tiene_valoracion_previa: packageData.tiene_valoracion_previa,
      saldo_pendiente: packageData.saldo_pendiente,
      // Info adicional para el frontend
      mensaje: puede_agendar 
        ? `Puede agendar ${sesiones_disponibles - packageData.sesiones_agendadas} sesiones más`
        : packageData.segundo_pago_completado
          ? 'Todas las sesiones ya están agendadas'
          : 'Debe registrar el siguiente pago para agendar más sesiones'
    })

  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json(
      { error: 'Error inesperado del servidor' },
      { status: 500 }
    )
  }
}