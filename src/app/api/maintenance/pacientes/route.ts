import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

// GET - Buscar pacientes con detalle completo de citas y paquetes
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

    // Buscar todos los pacientes creados en el rango de fechas
    const { data: pacientes, error } = await supabase
      .from('patients')
      .select('*')
      .gte('created_at', `${fechaDesde}T00:00:00`)
      .lte('created_at', `${fechaHasta}T23:59:59`)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching patients:', error)
      return NextResponse.json(
        { error: 'Error al buscar los pacientes' },
        { status: 500 }
      )
    }

    // Para cada paciente, obtener detalle completo
    const pacientesConDetalle = []
    let totalPaquetes = 0
    let totalCitas = 0

    for (const paciente of pacientes) {
      // Buscar paquetes del paciente
      const { data: paquetes, error: errorPkg } = await supabase
        .from('packages')
        .select('id, estado, total_sesiones')
        .eq('patient_id', paciente.id)

      // Buscar todas las citas del paciente (individuales + de paquetes)
      const { data: citas, error: errorCitas } = await supabase
        .from('appointments')
        .select('id, estado, package_id')
        .eq('patient_id', paciente.id)

      if (!errorPkg && !errorCitas) {
        const totalPaquetesPaciente = paquetes?.length || 0
        const totalCitasPaciente = citas?.length || 0

        // Separar citas individuales de citas de paquetes
        const citasIndividuales = citas?.filter(c => !c.package_id) || []
        const citasDePaquetes = citas?.filter(c => c.package_id) || []

        // Contar por estado
        const citasPorEstado = {
          agendada: citas?.filter(c => c.estado === 'agendada').length || 0,
          completada: citas?.filter(c => c.estado === 'completada').length || 0,
          cancelada: citas?.filter(c => c.estado === 'cancelada').length || 0,
          pendiente_reagendar: citas?.filter(c => c.estado === 'pendiente_reagendar').length || 0
        }

        const paquetesPorEstado = {
          activo: paquetes?.filter(p => p.estado === 'activo').length || 0,
          completado: paquetes?.filter(p => p.estado === 'completado').length || 0,
          cancelado: paquetes?.filter(p => p.estado === 'cancelado').length || 0
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
          paquetes_ids: paquetes?.map(p => p.id) || [],
          citas_ids: citas?.map(c => c.id) || []
        })
      }
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
      total_citas_asociadas: totalCitas
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
