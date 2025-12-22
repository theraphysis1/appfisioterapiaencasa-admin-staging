import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

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

// DELETE - Eliminar pacientes con TODOS sus paquetes y citas (cascada total)
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
    const citasPorEstado = {
      agendada: 0,
      completada: 0,
      cancelada: 0,
      pendiente_reagendar: 0
    }

    // Para cada paciente, eliminar en cascada
    for (const patientId of pacientes_ids) {
      
      // PASO 1: Obtener todos los paquetes del paciente
      const { data: paquetes } = await supabase
        .from('packages')
        .select('id')
        .eq('patient_id', patientId)

      const paquetesIds = paquetes?.map(p => p.id) || []
      totalPaquetesEliminados += paquetesIds.length

      // PASO 2: Contar y obtener todas las citas del paciente (individuales + de paquetes)
      const { data: citas } = await supabase
        .from('appointments')
        .select('id, estado')
        .eq('patient_id', patientId)

      if (citas) {
        totalCitasEliminadas += citas.length
        citasPorEstado.agendada += citas.filter(c => c.estado === 'agendada').length
        citasPorEstado.completada += citas.filter(c => c.estado === 'completada').length
        citasPorEstado.cancelada += citas.filter(c => c.estado === 'cancelada').length
        citasPorEstado.pendiente_reagendar += citas.filter(c => c.estado === 'pendiente_reagendar').length
      }

      // PASO 3: Eliminar TODAS las citas del paciente
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

      // PASO 4: Eliminar todos los paquetes del paciente
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
      }

      // PASO 5: Eliminar el paciente
      const { error: errorPaciente } = await supabase
        .from('patients')
        .delete()
        .eq('id', patientId)

      if (errorPaciente) {
        console.error(`Error deleting patient ${patientId}:`, errorPaciente)
        return NextResponse.json(
          { error: `Error al eliminar el paciente ${patientId}` },
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
