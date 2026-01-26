import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// GET - Obtener un paquete específico con sus citas
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
      .select(`
        *,
        patient:patients(*),
        service:services(*)
      `)
      .eq('id', id)
      .single()

    if (packageError) {
      console.error('Error fetching package:', packageError)
      return NextResponse.json(
        { error: 'Error al obtener el paquete' },
        { status: 500 }
      )
    }

    if (!packageData) {
      return NextResponse.json(
        { error: 'Paquete no encontrado' },
        { status: 404 }
      )
    }

    // Obtener las citas asociadas al paquete
    const { data: appointments, error: appointmentsError } = await supabase
      .from('appointments')
      .select(`
        id,
        patient_id,
        therapist_id,
        service_id,
        package_id,
        fecha_hora,
        estado,
        patologia,
        valor,
        comision,
        observacion,
        direccion_override,
        barrio_override,
        referencia_override,
        direccion_lat_override,
        direccion_lng_override,
        therapist:therapists(
          id,
          nombre,
          apellido
        ),
        patient:patients(
          id,
          nombre,
          apellido,
          direccion,
          barrio,
          referencia,
          direccion_lat,
          direccion_lng
        )
      `)
      .eq('package_id', id)
      .order('fecha_hora', { ascending: true })

    if (appointmentsError) {
      console.error('Error fetching appointments:', appointmentsError)
    }

    // Calcular campos finales para cada cita
    const appointmentsWithFinalFields = (appointments || []).map(apt => {
      // El patient viene como array, acceder al primer elemento
      const patientData = Array.isArray(apt.patient) 
        ? apt.patient[0] 
        : apt.patient

      // Determinar si tiene override
      const tiene_direccion_temporal = apt.direccion_override !== null

      // Calcular campos finales
      const direccion_final = apt.direccion_override || patientData?.direccion || ''
      const barrio_final = apt.barrio_override || patientData?.barrio || ''
      const referencia_final = apt.referencia_override || patientData?.referencia || null
      const direccion_lat_final = apt.direccion_lat_override || patientData?.direccion_lat || null
      const direccion_lng_final = apt.direccion_lng_override || patientData?.direccion_lng || null

      return {
        ...apt,
        direccion_final,
        barrio_final,
        referencia_final,
        direccion_lat_final,
        direccion_lng_final,
        tiene_direccion_temporal
      }
    })

    // Devolver el paquete con las citas incluidas
    return NextResponse.json({ 
      package: {
        ...packageData,
        appointments: appointmentsWithFinalFields
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

// PUT - Actualizar estado del paquete O recalcular contadores
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient()
    const { id } = await params
    const body = await request.json()

    const { estado, sesiones_completadas, recalcular_contadores } = body

    // ✅ MODO ESPECIAL: Recalcular contadores basándose en citas reales
    if (recalcular_contadores === true) {
      // Obtener el paquete actual
      const { data: currentPackage, error: pkgError } = await supabase
        .from('packages')
        .select('*')
        .eq('id', id)
        .single()

      if (pkgError || !currentPackage) {
        return NextResponse.json(
          { error: 'Paquete no encontrado' },
          { status: 404 }
        )
      }

      // Contar citas REALES del paquete
      const { data: appointments, error: aptsError } = await supabase
        .from('appointments')
        .select('id, estado')
        .eq('package_id', id)

      if (aptsError) {
        return NextResponse.json(
          { error: 'Error al obtener citas del paquete' },
          { status: 500 }
        )
      }

      // Calcular valores reales
      const citas_agendadas = appointments?.filter(apt => apt.estado === 'agendada').length || 0
      const citas_completadas = appointments?.filter(apt => apt.estado === 'completada').length || 0
      const citas_totales = appointments?.length || 0

      // Calcular sesiones pendientes
      const sesiones_pendientes = Math.max(
        0,
        currentPackage.total_sesiones - citas_totales
      )

      console.log('🔧 RECALCULANDO CONTADORES:')
      console.log('  Total sesiones del paquete:', currentPackage.total_sesiones)
      console.log('  Citas totales en DB:', citas_totales)
      console.log('  Citas agendadas:', citas_agendadas)
      console.log('  Citas completadas:', citas_completadas)
      console.log('  Sesiones pendientes calculadas:', sesiones_pendientes)

      // Actualizar con valores reales
      const { data, error } = await supabase
        .from('packages')
        .update({
          sesiones_agendadas: citas_agendadas,
          sesiones_completadas: citas_completadas,
          sesiones_pendientes_agendar: sesiones_pendientes
        })
        .eq('id', id)
        .select(`
          *,
          patient:patients(*),
          service:services(*)
        `)
        .single()

      if (error) {
        console.error('Error recalculando contadores:', error)
        return NextResponse.json(
          { error: 'Error al recalcular contadores' },
          { status: 500 }
        )
      }

      return NextResponse.json({ 
        message: '✅ Contadores recalculados exitosamente',
        package: data,
        debug: {
          antes: {
            sesiones_agendadas: currentPackage.sesiones_agendadas,
            sesiones_completadas: currentPackage.sesiones_completadas,
            sesiones_pendientes_agendar: currentPackage.sesiones_pendientes_agendar
          },
          despues: {
            sesiones_agendadas: citas_agendadas,
            sesiones_completadas: citas_completadas,
            sesiones_pendientes_agendar: sesiones_pendientes
          }
        }
      })
    }

    // MODO NORMAL: Actualizar estado
    if (!estado || !['activo', 'completado', 'cancelado'].includes(estado)) {
      return NextResponse.json(
        { error: 'Estado inválido. Debe ser: activo, completado o cancelado' },
        { status: 400 }
      )
    }

    const updateData: any = {
      estado
    }

    if (sesiones_completadas !== undefined) {
      updateData.sesiones_completadas = sesiones_completadas
    }

    const { data, error } = await supabase
      .from('packages')
      .update(updateData)
      .eq('id', id)
      .select(`
        *,
        patient:patients(*),
        service:services(*)
      `)
      .single()

    if (error) {
      console.error('Error updating package:', error)
      return NextResponse.json(
        { error: 'Error al actualizar el paquete' },
        { status: 500 }
      )
    }

    return NextResponse.json({ package: data })
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json(
      { error: 'Error inesperado del servidor' },
      { status: 500 }
    )
  }
}

// PATCH - Actualizar campos específicos del paquete
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient()
    const { id } = await params
    const body = await request.json()

    const { 
      sesiones_agendadas_increment,
      valor_total,
      comision_total
    } = body

    // Obtener el paquete actual
    const { data: currentPackage, error: fetchError } = await supabase
      .from('packages')
      .select('*')
      .eq('id', id)
      .single()

    if (fetchError || !currentPackage) {
      return NextResponse.json(
        { error: 'Paquete no encontrado' },
        { status: 404 }
      )
    }

    // Preparar objeto de actualización
    const updateData: any = {}

    // ✅ MODO 1: Incrementar sesiones agendadas
    if (sesiones_agendadas_increment !== undefined) {
      if (sesiones_agendadas_increment <= 0) {
        return NextResponse.json(
          { error: 'sesiones_agendadas_increment debe ser mayor a 0' },
          { status: 400 }
        )
      }

      const new_sesiones_agendadas = currentPackage.sesiones_agendadas + sesiones_agendadas_increment
      const new_sesiones_pendientes = Math.max(
        0,
        currentPackage.total_sesiones - new_sesiones_agendadas - currentPackage.sesiones_completadas
      )

      updateData.sesiones_agendadas = new_sesiones_agendadas
      updateData.sesiones_pendientes_agendar = new_sesiones_pendientes
    }

    // ✅ MODO 2: Actualizar valor_total
    if (valor_total !== undefined) {
      updateData.valor_total = valor_total
    }

    // ✅ MODO 3: Actualizar comision_total
    if (comision_total !== undefined) {
      updateData.comision_total = comision_total
    }

    // Validar que haya algo que actualizar
    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { error: 'No se proporcionaron campos para actualizar' },
        { status: 400 }
      )
    }

    // Actualizar el paquete
    const { data, error } = await supabase
      .from('packages')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('Error updating package:', error)
      return NextResponse.json(
        { error: 'Error al actualizar el paquete' },
        { status: 500 }
      )
    }

    return NextResponse.json({ 
      message: 'Paquete actualizado exitosamente',
      package: data,
      campos_actualizados: Object.keys(updateData)
    })
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json(
      { error: 'Error inesperado del servidor' },
      { status: 500 }
    )
  }
}

// DELETE - Cancelar paquete completo
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient()
    const { id } = await params
    const body = await request.json()

    const { razon_cancelacion, cancelado_por } = body

    // Validar campos obligatorios
    if (!razon_cancelacion || razon_cancelacion.trim() === '') {
      return NextResponse.json(
        { error: 'La razón de cancelación es obligatoria' },
        { status: 400 }
      )
    }

    if (!cancelado_por || cancelado_por.trim() === '') {
      return NextResponse.json(
        { error: 'El nombre del admin que cancela es obligatorio' },
        { status: 400 }
      )
    }

    // Obtener el paquete actual para validar
    const { data: currentPackage, error: fetchError } = await supabase
      .from('packages')
      .select('*, patient:patients(nombre, apellido)')
      .eq('id', id)
      .single()

    if (fetchError || !currentPackage) {
      return NextResponse.json(
        { error: 'Paquete no encontrado' },
        { status: 404 }
      )
    }

    // Validar que no esté ya cancelado
    if (currentPackage.estado === 'cancelado') {
      return NextResponse.json(
        { error: 'Este paquete ya está cancelado' },
        { status: 400 }
      )
    }

    // PASO 1: Obtener todas las citas agendadas que se van a eliminar
    const { data: citasAgendadas, error: citasError } = await supabase
      .from('appointments')
      .select('id, fecha_hora, therapist:therapists(nombre, apellido)')
      .eq('package_id', id)
      .eq('estado', 'agendada')

    if (citasError) {
      console.error('Error obteniendo citas agendadas:', citasError)
    }

    const citasCount = citasAgendadas?.length || 0

    // PASO 2: ELIMINAR todas las citas agendadas (liberar espacios)
    if (citasCount > 0) {
      const { error: deleteError } = await supabase
        .from('appointments')
        .delete()
        .eq('package_id', id)
        .eq('estado', 'agendada')

      if (deleteError) {
        console.error('Error eliminando citas agendadas:', deleteError)
        return NextResponse.json(
          { error: 'Error al eliminar las citas agendadas' },
          { status: 500 }
        )
      }
    }

    // PASO 3: Marcar el paquete como cancelado
    const { data: packageData, error: packageError } = await supabase
      .from('packages')
      .update({ 
        estado: 'cancelado',
        fecha_cancelacion: new Date().toISOString(),
        razon_cancelacion: razon_cancelacion.trim(),
        cancelado_por: cancelado_por.trim()
      })
      .eq('id', id)
      .select('*, patient:patients(nombre, apellido), service:services(*)')
      .single()

    if (packageError) {
      console.error('Error cancelando paquete:', packageError)
      return NextResponse.json(
        { error: 'Error al cancelar el paquete' },
        { status: 500 }
      )
    }

    // PASO 4: Cerrar la alerta de pago si existe
    const { error: alertError } = await supabase
      .from('payment_alerts')
      .update({
        estado_alerta: 'cancelada',
        alerta_activa: false,
        fecha_cierre: new Date().toISOString(),
        notas_finales: `Paquete cancelado: ${razon_cancelacion.trim()}`
      })
      .eq('package_id', id)
      .eq('alerta_activa', true)

    if (alertError) {
      console.error('Error cerrando alerta de pago:', alertError)
      // No devolvemos error porque el paquete ya fue cancelado
    }

    // Extraer datos del paciente correctamente (Supabase puede retornar array)
    const patientData = Array.isArray(currentPackage.patient) 
      ? currentPackage.patient[0] 
      : currentPackage.patient

    return NextResponse.json({ 
      message: '✅ Paquete cancelado exitosamente',
      package: packageData,
      citas_eliminadas: citasCount,
      detalles: {
        paciente: `${patientData?.nombre || ''} ${patientData?.apellido || ''}`,
        citas_liberadas: citasAgendadas?.map(cita => {
          const therapistData = Array.isArray(cita.therapist) 
            ? cita.therapist[0] 
            : cita.therapist
          
          return {
            fecha: new Date(cita.fecha_hora).toLocaleString('es-CO'),
            terapeuta: `${therapistData?.nombre || ''} ${therapistData?.apellido || ''}`
          }
        }) || []
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