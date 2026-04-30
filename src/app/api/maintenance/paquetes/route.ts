import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

// Helper: elimina todas las dependencias de un array de citas_ids antes de borrarlas
async function eliminarDependenciasDeCitas(supabase: any, citasIds: string[]) {
  if (!citasIds.length) return null

  const { data: contAlerts } = await supabase
    .from('continuation_alerts')
    .select('id')
    .in('appointment_id', citasIds)

  const contAlertIds = contAlerts?.map((a: any) => a.id) || []

  if (contAlertIds.length > 0) {
    const { error } = await supabase
      .from('continuation_contact_logs')
      .delete()
      .in('continuation_alert_id', contAlertIds)
    if (error) return error
  }

  const { error: errContAlerts } = await supabase
    .from('continuation_alerts')
    .delete()
    .in('appointment_id', citasIds)
  if (errContAlerts) return errContAlerts

  return null
}

// GET - Buscar paquetes con detalle de citas asociadas - OPTIMIZADO
export async function GET(request: Request) {
  try {
    const supabase = createAdminClient()
    const { searchParams } = new URL(request.url)
    
    // Filtros requeridos
    const fechaDesde = searchParams.get('fecha_desde')
    const fechaHasta = searchParams.get('fecha_hasta')
    const estados = searchParams.get('estados') // Formato: "activo,completado,cancelado"
    
    if (!fechaDesde || !fechaHasta || !estados) {
      return NextResponse.json(
        { error: 'Los parámetros fecha_desde, fecha_hasta y estados son requeridos' },
        { status: 400 }
      )
    }

    // Convertir estados de string a array
    const estadosArray = estados.split(',')

    // LÍMITE DE SEGURIDAD: Máximo 500 paquetes por búsqueda
    const LIMIT = 500

    // Buscar paquetes en el rango de fechas con los estados seleccionados (CON LÍMITE)
    const { data: paquetes, error } = await supabase
      .from('packages')
      .select(`
        *,
        patient:patients(id, nombre, apellido, telefono),
        service:services(id, nombre)
      `)
      .gte('fecha_compra', fechaDesde)
      .lte('fecha_compra', fechaHasta)
      .in('estado', estadosArray)
      .order('fecha_compra', { ascending: false })
      .limit(LIMIT)

    if (error) {
      console.error('Error fetching packages:', error)
      return NextResponse.json(
        { error: 'Error al buscar los paquetes' },
        { status: 500 }
      )
    }

    if (!paquetes || paquetes.length === 0) {
      return NextResponse.json({
        paquetes: [],
        resumen: {
          total_paquetes: 0,
          total_citas_asociadas: 0,
          por_estado: {},
          limite_alcanzado: false
        }
      })
    }

    const paquetesIds = paquetes.map(p => p.id)

    // OPTIMIZACIÓN: Obtener TODAS las citas de todos los paquetes en UNA SOLA query
    const { data: todasCitas, error: errorCitas } = await supabase
      .from('appointments')
      .select('id, estado, fecha_hora, package_id')
      .in('package_id', paquetesIds)
      .order('fecha_hora', { ascending: true })

    if (errorCitas) {
      console.error('Error fetching appointments:', errorCitas)
      return NextResponse.json(
        { error: 'Error al buscar las citas de los paquetes' },
        { status: 500 }
      )
    }

    // Agrupar citas por package_id
    const citasPorPaquete = new Map<string, any[]>()
    todasCitas?.forEach(cita => {
      if (!citasPorPaquete.has(cita.package_id)) {
        citasPorPaquete.set(cita.package_id, [])
      }
      citasPorPaquete.get(cita.package_id)!.push(cita)
    })

    // Construir paquetes con detalle
    const paquetesConDetalle = []
    let totalCitasAsociadas = 0

    for (const paquete of paquetes) {
      const citas = citasPorPaquete.get(paquete.id) || []

      const citasPorEstado = {
        agendada: citas.filter(c => c.estado === 'agendada').length,
        completada: citas.filter(c => c.estado === 'completada').length,
        cancelada: citas.filter(c => c.estado === 'cancelada').length,
        pendiente_reagendar: citas.filter(c => c.estado === 'pendiente_reagendar').length
      }

      totalCitasAsociadas += citas.length

      paquetesConDetalle.push({
        ...paquete,
        total_citas: citas.length,
        citas_por_estado: citasPorEstado,
        citas_ids: citas.map(c => c.id)
      })
    }

    // Resumen
    const resumen = {
      total_paquetes: paquetes.length,
      total_citas_asociadas: totalCitasAsociadas,
      por_estado: estadosArray.reduce((acc: any, estado: string) => {
        acc[estado] = paquetes.filter(p => p.estado === estado).length
        return acc
      }, {}),
      limite_alcanzado: paquetes.length === LIMIT
    }

    return NextResponse.json({
      paquetes: paquetesConDetalle,
      resumen
    })

  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json(
      { error: 'Error inesperado del servidor' },
      { status: 500 }
    )
  }
}

// DELETE - Eliminar paquetes con TODAS sus citas (cascada)
export async function DELETE(request: Request) {
  try {
    const supabase = createAdminClient()
    const body = await request.json()

    const { paquetes_ids } = body

    if (!paquetes_ids || !Array.isArray(paquetes_ids) || paquetes_ids.length === 0) {
      return NextResponse.json(
        { error: 'El campo paquetes_ids es requerido y debe ser un array con al menos un ID' },
        { status: 400 }
      )
    }

    // Contar cuántas citas se eliminarán en total
    const { data: citasAEliminar, error: errorCount } = await supabase
      .from('appointments')
      .select('id, estado')
      .in('package_id', paquetes_ids)

    if (errorCount) {
      console.error('Error counting appointments:', errorCount)
      return NextResponse.json(
        { error: 'Error al contar las citas a eliminar' },
        { status: 500 }
      )
    }

    const totalCitas = citasAEliminar?.length || 0
    const todasCitasIds = citasAEliminar?.map((c: any) => c.id) || []

    const citasPorEstado = {
      agendada: citasAEliminar?.filter(c => c.estado === 'agendada').length || 0,
      completada: citasAEliminar?.filter(c => c.estado === 'completada').length || 0,
      cancelada: citasAEliminar?.filter(c => c.estado === 'cancelada').length || 0,
      pendiente_reagendar: citasAEliminar?.filter(c => c.estado === 'pendiente_reagendar').length || 0
    }

    // PASO 1: Eliminar dependencias de las citas (continuation_contact_logs → continuation_alerts)
    if (todasCitasIds.length > 0) {
      const depError = await eliminarDependenciasDeCitas(supabase, todasCitasIds)
      if (depError) {
        console.error('Error eliminando dependencias de citas:', depError)
        return NextResponse.json(
          { error: 'Error al eliminar dependencias de las citas' },
          { status: 500 }
        )
      }
    }

    // PASO 2: Eliminar contact_logs → payment_alerts de estos paquetes
    const { data: payAlerts } = await supabase
      .from('payment_alerts')
      .select('id')
      .in('package_id', paquetes_ids)

    const payAlertIds = payAlerts?.map((a: any) => a.id) || []

    if (payAlertIds.length > 0) {
      const { error: errContactLogs } = await supabase
        .from('contact_logs')
        .delete()
        .in('alert_id', payAlertIds)

      if (errContactLogs) {
        console.error('Error deleting contact_logs:', errContactLogs)
        return NextResponse.json(
          { error: 'Error al eliminar los registros de contacto' },
          { status: 500 }
        )
      }

      const { error: errPayAlerts } = await supabase
        .from('payment_alerts')
        .delete()
        .in('package_id', paquetes_ids)

      if (errPayAlerts) {
        console.error('Error deleting payment_alerts:', errPayAlerts)
        return NextResponse.json(
          { error: 'Error al eliminar las alertas de pago' },
          { status: 500 }
        )
      }
    }

    // PASO 3: Eliminar payment_history de estos paquetes
    const { error: errPayHistory } = await supabase
      .from('payment_history')
      .delete()
      .in('package_id', paquetes_ids)

    if (errPayHistory) {
      console.error('Error deleting payment_history:', errPayHistory)
      return NextResponse.json(
        { error: 'Error al eliminar el historial de pagos' },
        { status: 500 }
      )
    }

    // PASO 4: Eliminar TODAS las citas de esos paquetes
    const { error: errorCitas } = await supabase
      .from('appointments')
      .delete()
      .in('package_id', paquetes_ids)

    if (errorCitas) {
      console.error('Error deleting appointments:', errorCitas)
      return NextResponse.json(
        { error: 'Error al eliminar las citas de los paquetes' },
        { status: 500 }
      )
    }

    // PASO 5: Eliminar los paquetes
    const { error: errorPaquetes } = await supabase
      .from('packages')
      .delete()
      .in('id', paquetes_ids)

    if (errorPaquetes) {
      console.error('Error deleting packages:', errorPaquetes)
      return NextResponse.json(
        { error: 'Error al eliminar los paquetes' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      resultado: {
        paquetes_eliminados: paquetes_ids.length,
        citas_eliminadas: totalCitas,
        citas_por_estado: citasPorEstado
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
