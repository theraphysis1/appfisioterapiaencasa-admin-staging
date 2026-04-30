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

// GET - Buscar pacientes con detalle completo de citas y paquetes (OPTIMIZADO)
export async function GET(request: Request) {
  try {
    const supabase = createAdminClient()
    const { searchParams } = new URL(request.url)
    
    // Filtros requeridos
    const fechaDesde = searchParams.get('fecha_desde')
    const fechaHasta = searchParams.get('fecha_hasta')
    
    if (!fechaDesde || !fechaHasta) {
      return NextResponse.json(
        { error: 'Los parámetros fecha_desde y fecha_hasta son requeridos' },
        { status: 400 }
      )
    }

    // LÍMITE DE SEGURIDAD: Máximo 500 pacientes por búsqueda
    const LIMIT = 500

    // Buscar pacientes creados en el rango de fechas (CON LÍMITE)
    const { data: pacientes, error } = await supabase
      .from('patients')
      .select('*')
      .gte('created_at', `${fechaDesde}T00:00:00`)
      .lte('created_at', `${fechaHasta}T23:59:59`)
      .order('created_at', { ascending: false })
      .limit(LIMIT)

    if (error) {
      console.error('Error fetching patients:', error)
      return NextResponse.json(
        { error: 'Error al buscar los pacientes' },
        { status: 500 }
      )
    }

    if (!pacientes || pacientes.length === 0) {
      return NextResponse.json({
        pacientes_con_datos: [],
        pacientes_sin_datos: [],
        resumen: {
          total_pacientes: 0,
          con_datos: 0,
          sin_datos: 0,
          total_paquetes_asociados: 0,
          total_citas_asociadas: 0,
          limite_alcanzado: false
        }
      })
    }

    const pacientesIds = pacientes.map(p => p.id)

    // OPTIMIZACIÓN 1: Obtener TODOS los paquetes en una sola query
    const { data: todosPaquetes } = await supabase
      .from('packages')
      .select('id, patient_id, estado, total_sesiones')
      .in('patient_id', pacientesIds)

    // OPTIMIZACIÓN 2: Obtener TODAS las citas en una sola query
    const { data: todasCitas } = await supabase
      .from('appointments')
      .select('id, patient_id, estado, package_id')
      .in('patient_id', pacientesIds)

    // Crear mapas para acceso rápido por patient_id
    const paquetesPorPaciente = new Map<string, any[]>()
    const citasPorPaciente = new Map<string, any[]>()

    // Agrupar paquetes por paciente
    todosPaquetes?.forEach(paquete => {
      if (!paquetesPorPaciente.has(paquete.patient_id)) {
        paquetesPorPaciente.set(paquete.patient_id, [])
      }
      paquetesPorPaciente.get(paquete.patient_id)!.push(paquete)
    })

    // Agrupar citas por paciente
    todasCitas?.forEach(cita => {
      if (!citasPorPaciente.has(cita.patient_id)) {
        citasPorPaciente.set(cita.patient_id, [])
      }
      citasPorPaciente.get(cita.patient_id)!.push(cita)
    })

    // Procesar cada paciente con los datos ya cargados
    const pacientesConDetalle = []
    let totalPaquetes = 0
    let totalCitas = 0

    for (const paciente of pacientes) {
      const paquetes = paquetesPorPaciente.get(paciente.id) || []
      const citas = citasPorPaciente.get(paciente.id) || []

      const totalPaquetesPaciente = paquetes.length
      const totalCitasPaciente = citas.length

      // Separar citas individuales de citas de paquetes
      const citasIndividuales = citas.filter(c => !c.package_id)
      const citasDePaquetes = citas.filter(c => c.package_id)

      // Contar por estado
      const citasPorEstado = {
        agendada: citas.filter(c => c.estado === 'agendada').length,
        completada: citas.filter(c => c.estado === 'completada').length,
        cancelada: citas.filter(c => c.estado === 'cancelada').length,
        pendiente_reagendar: citas.filter(c => c.estado === 'pendiente_reagendar').length
      }

      const paquetesPorEstado = {
        activo: paquetes.filter(p => p.estado === 'activo').length,
        completado: paquetes.filter(p => p.estado === 'completado').length,
        cancelado: paquetes.filter(p => p.estado === 'cancelado').length
      }

      totalPaquetes += totalPaquetesPaciente
      totalCitas += totalCitasPaciente

      pacientesConDetalle.push({
        ...paciente,
        total_paquetes: totalPaquetesPaciente,
        total_citas: totalCitasPaciente,
        citas_individuales: citasIndividuales.length,
        citas_de_paquetes: citasDePaquetes.length,
        citas_por_estado: citasPorEstado,
        paquetes_por_estado: paquetesPorEstado,
        paquetes_ids: paquetes.map(p => p.id),
        citas_ids: citas.map(c => c.id)
      })
    }

    // Separar pacientes con y sin datos
    const pacientesConDatos = pacientesConDetalle.filter(p => p.total_citas > 0 || p.total_paquetes > 0)
    const pacientesSinDatos = pacientesConDetalle.filter(p => p.total_citas === 0 && p.total_paquetes === 0)

    // Resumen
    const resumen = {
      total_pacientes: pacientes.length,
      con_datos: pacientesConDatos.length,
      sin_datos: pacientesSinDatos.length,
      total_paquetes_asociados: totalPaquetes,
      total_citas_asociadas: totalCitas,
      limite_alcanzado: pacientes.length === LIMIT
    }

    return NextResponse.json({
      pacientes_con_datos: pacientesConDatos,
      pacientes_sin_datos: pacientesSinDatos,
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

// DELETE - Eliminar pacientes con TODOS sus registros relacionados (cascada total completa)
export async function DELETE(request: Request) {
  try {
    const supabase = createAdminClient()
    const body = await request.json()

    const { pacientes_ids } = body

    if (!pacientes_ids || !Array.isArray(pacientes_ids) || pacientes_ids.length === 0) {
      return NextResponse.json(
        { error: 'El campo pacientes_ids es requerido y debe ser un array con al menos un ID' },
        { status: 400 }
      )
    }

    let totalPaquetesEliminados = 0
    let totalCitasEliminadas = 0
    let totalAttendanceEliminados = 0
    let totalPaymentHistoryEliminados = 0
    let totalPaymentAlertsEliminados = 0
    let totalContactLogsEliminados = 0
    let totalContinuationAlertsEliminados = 0
    let totalContinuationContactLogsEliminados = 0

    const citasPorEstado = {
      agendada: 0,
      completada: 0,
      cancelada: 0,
      pendiente_reagendar: 0
    }

    for (const patientId of pacientes_ids) {

      // ============================================
      // PASO 1: Obtener IDs necesarios
      // ============================================

      const { data: paquetes } = await supabase
        .from('packages')
        .select('id')
        .eq('patient_id', patientId)

      const paquetesIds = paquetes?.map((p: any) => p.id) || []

      const { data: alertas } = await supabase
        .from('payment_alerts')
        .select('id')
        .eq('patient_id', patientId)

      const alertasIds = alertas?.map((a: any) => a.id) || []

      const { data: citas } = await supabase
        .from('appointments')
        .select('id, estado')
        .eq('patient_id', patientId)

      const citasIds = citas?.map((c: any) => c.id) || []

      if (citas) {
        totalCitasEliminadas += citas.length
        citasPorEstado.agendada += citas.filter(c => c.estado === 'agendada').length
        citasPorEstado.completada += citas.filter(c => c.estado === 'completada').length
        citasPorEstado.cancelada += citas.filter(c => c.estado === 'cancelada').length
        citasPorEstado.pendiente_reagendar += citas.filter(c => c.estado === 'pendiente_reagendar').length
      }

      // ============================================
      // PASO 2: Eliminar continuation_contact_logs → continuation_alerts
      // ============================================
      if (citasIds.length > 0) {
        const { data: contAlerts } = await supabase
          .from('continuation_alerts')
          .select('id')
          .in('appointment_id', citasIds)

        const contAlertIds = contAlerts?.map((a: any) => a.id) || []

        if (contAlertIds.length > 0) {
          const { data: contContactLogs, error: errContContactLogs } = await supabase
            .from('continuation_contact_logs')
            .delete()
            .in('continuation_alert_id', contAlertIds)
            .select('id')

          if (errContContactLogs) {
            console.error(`Error deleting continuation_contact_logs for patient ${patientId}:`, errContContactLogs)
            return NextResponse.json(
              { error: `Error al eliminar continuation_contact_logs del paciente ${patientId}` },
              { status: 500 }
            )
          }

          totalContinuationContactLogsEliminados += contContactLogs?.length || 0
        }

        const { data: contAlertsDeleted, error: errContAlerts } = await supabase
          .from('continuation_alerts')
          .delete()
          .in('appointment_id', citasIds)
          .select('id')

        if (errContAlerts) {
          console.error(`Error deleting continuation_alerts for patient ${patientId}:`, errContAlerts)
          return NextResponse.json(
            { error: `Error al eliminar continuation_alerts del paciente ${patientId}` },
            { status: 500 }
          )
        }

        totalContinuationAlertsEliminados += contAlertsDeleted?.length || 0
      }

      // ============================================
      // PASO 3: Eliminar contact_logs de payment_alerts
      // ============================================
      if (alertasIds.length > 0) {
        const { data: contactLogs, error: errorContactLogs } = await supabase
          .from('contact_logs')
          .delete()
          .in('alert_id', alertasIds)
          .select('id')

        if (errorContactLogs) {
          console.error(`Error deleting contact_logs for patient ${patientId}:`, errorContactLogs)
          return NextResponse.json(
            { error: `Error al eliminar contact_logs del paciente ${patientId}` },
            { status: 500 }
          )
        }

        totalContactLogsEliminados += contactLogs?.length || 0
      }

      // ============================================
      // PASO 4: Eliminar payment_history
      // ============================================
      if (paquetesIds.length > 0) {
        const { data: paymentHistory, error: errorPaymentHistory } = await supabase
          .from('payment_history')
          .delete()
          .in('package_id', paquetesIds)
          .select('id')

        if (errorPaymentHistory) {
          console.error(`Error deleting payment_history for patient ${patientId}:`, errorPaymentHistory)
          return NextResponse.json(
            { error: `Error al eliminar payment_history del paciente ${patientId}` },
            { status: 500 }
          )
        }

        totalPaymentHistoryEliminados += paymentHistory?.length || 0
      }

      // ============================================
      // PASO 5: Eliminar attendance_records
      // ============================================
      const { data: attendanceRecords, error: errorAttendance } = await supabase
        .from('attendance_records')
        .delete()
        .eq('patient_id', patientId)
        .select('id')

      if (errorAttendance) {
        console.error(`Error deleting attendance_records for patient ${patientId}:`, errorAttendance)
        return NextResponse.json(
          { error: `Error al eliminar attendance_records del paciente ${patientId}` },
          { status: 500 }
        )
      }

      totalAttendanceEliminados += attendanceRecords?.length || 0

      // ============================================
      // PASO 6: Eliminar payment_alerts
      // ============================================
      if (alertasIds.length > 0) {
        const { error: errorAlerts } = await supabase
          .from('payment_alerts')
          .delete()
          .eq('patient_id', patientId)

        if (errorAlerts) {
          console.error(`Error deleting payment_alerts for patient ${patientId}:`, errorAlerts)
          return NextResponse.json(
            { error: `Error al eliminar payment_alerts del paciente ${patientId}` },
            { status: 500 }
          )
        }

        totalPaymentAlertsEliminados += alertasIds.length
      }

      // ============================================
      // PASO 7: Eliminar appointments
      // ============================================
      const { error: errorCitas } = await supabase
        .from('appointments')
        .delete()
        .eq('patient_id', patientId)

      if (errorCitas) {
        console.error(`Error deleting appointments for patient ${patientId}:`, errorCitas)
        return NextResponse.json(
          { error: `Error al eliminar las citas del paciente ${patientId}` },
          { status: 500 }
        )
      }

      // ============================================
      // PASO 8: Eliminar packages
      // ============================================
      if (paquetesIds.length > 0) {
        const { error: errorPaquetes } = await supabase
          .from('packages')
          .delete()
          .eq('patient_id', patientId)

        if (errorPaquetes) {
          console.error(`Error deleting packages for patient ${patientId}:`, errorPaquetes)
          return NextResponse.json(
            { error: `Error al eliminar los paquetes del paciente ${patientId}` },
            { status: 500 }
          )
        }

        totalPaquetesEliminados += paquetesIds.length
      }

      // ============================================
      // PASO 9: Eliminar el paciente
      // ============================================
      const { error: errorPaciente } = await supabase
        .from('patients')
        .delete()
        .eq('id', patientId)

      if (errorPaciente) {
        console.error(`Error deleting patient ${patientId}:`, errorPaciente)
        return NextResponse.json(
          { error: `Error al eliminar el paciente ${patientId}: ${errorPaciente.message}` },
          { status: 500 }
        )
      }
    }

    return NextResponse.json({
      success: true,
      resultado: {
        pacientes_eliminados: pacientes_ids.length,
        paquetes_eliminados: totalPaquetesEliminados,
        citas_eliminadas: totalCitasEliminadas,
        citas_por_estado: citasPorEstado,
        attendance_records_eliminados: totalAttendanceEliminados,
        payment_history_eliminados: totalPaymentHistoryEliminados,
        payment_alerts_eliminados: totalPaymentAlertsEliminados,
        contact_logs_eliminados: totalContactLogsEliminados,
        continuation_alerts_eliminados: totalContinuationAlertsEliminados,
        continuation_contact_logs_eliminados: totalContinuationContactLogsEliminados
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
