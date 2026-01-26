import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// POST - Registrar primer o segundo pago
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient()
    const { id } = await params
    const body = await request.json()

    const { numero_pago, monto, metodo_pago, notas, registrado_por } = body

    // Validaciones
    if (!numero_pago || ![1, 2].includes(numero_pago)) {
      return NextResponse.json(
        { error: 'numero_pago debe ser 1 o 2' },
        { status: 400 }
      )
    }

    if (!monto || monto <= 0) {
      return NextResponse.json(
        { error: 'El monto debe ser mayor a 0' },
        { status: 400 }
      )
    }

    if (!registrado_por) {
      return NextResponse.json(
        { error: 'registrado_por es requerido' },
        { status: 400 }
      )
    }

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

    // Validar que el paquete sea de pago fraccionado
    if (packageData.forma_pago !== 'fraccionado') {
      return NextResponse.json(
        { error: 'Este paquete no es de pago fraccionado' },
        { status: 400 }
      )
    }

    // Validar según el número de pago
    if (numero_pago === 1 && packageData.primer_pago_completado) {
      return NextResponse.json(
        { error: 'El primer pago ya fue registrado' },
        { status: 400 }
      )
    }

    if (numero_pago === 2) {
      if (!packageData.primer_pago_completado) {
        return NextResponse.json(
          { error: 'Debe registrar el primer pago antes del segundo' },
          { status: 400 }
        )
      }
      if (packageData.segundo_pago_completado) {
        return NextResponse.json(
          { error: 'El segundo pago ya fue registrado' },
          { status: 400 }
        )
      }
    }

    // Calcular nuevo saldo pendiente
    const saldo_actual = parseFloat(packageData.saldo_pendiente.toString())
    const nuevo_saldo = Math.max(0, saldo_actual - monto)

    // Preparar actualización del paquete
    const updateData: any = {
      saldo_pendiente: nuevo_saldo
    }

    if (numero_pago === 1) {
      updateData.primer_pago_completado = true
      updateData.fecha_primer_pago = new Date().toISOString()
    } else {
      updateData.segundo_pago_completado = true
      updateData.fecha_segundo_pago = new Date().toISOString()
    }

    // Actualizar el paquete
    const { data: updatedPackage, error: updateError } = await supabase
      .from('packages')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()

    if (updateError) {
      console.error('Error updating package:', updateError)
      return NextResponse.json(
        { error: 'Error al actualizar el paquete' },
        { status: 500 }
      )
    }

    // Crear registro en payment_history
    const { error: historyError } = await supabase
      .from('payment_history')
      .insert([{
        package_id: id,
        patient_id: packageData.patient_id,
        numero_pago,
        monto,
        tipo_pago: 'pago_paquete',
        metodo_pago: metodo_pago || null,
        notas: notas || null,
        registrado_por
      }])

    if (historyError) {
      console.error('Error creating payment history:', historyError)
    }

    // Si es el segundo pago, marcar alerta como completada
    if (numero_pago === 2) {
      const { error: alertError } = await supabase
        .from('payment_alerts')
        .update({ 
          estado_alerta: 'completada',
          alerta_activa: false,
          fecha_cierre: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('package_id', id)

      if (alertError) {
        console.error('Error updating alert:', alertError)
      }
    }

    return NextResponse.json({ 
      message: `${numero_pago === 1 ? 'Primer' : 'Segundo'} pago registrado exitosamente`,
      package: updatedPackage,
      nuevo_saldo: nuevo_saldo
    }, { status: 200 })

  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json(
      { error: 'Error inesperado del servidor' },
      { status: 500 }
    )
  }
}