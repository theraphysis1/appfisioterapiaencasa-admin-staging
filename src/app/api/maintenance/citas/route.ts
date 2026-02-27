import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

// GET - Buscar citas con separación automática (individuales vs paquetes) - OPTIMIZADO
export async function GET(request: Request) {
  try {
    const supabase = createAdminClient()
    const { searchParams } = new URL(request.url)
    
    // Filtros requeridos
    const fechaDesde = searchParams.get('fecha_desde')
    const fechaHasta = searchParams.get('fecha_hasta')
    const estados = searchParams.get('estados') // Formato: "agendada,completada,cancelada"
    
    if (!fechaDesde || !fechaHasta || !estados) {
      return NextResponse.json(
        { error: 'Los parámetros fecha_desde, fecha_hasta y estados son requeridos' },
        { status: 400 }
      )
    }

    // Convertir estados de string a array
    const estadosArray = estados.split(',')

    // LÍMITE DE SEGURIDAD: Máximo 1000 citas por búsqueda
    const LIMIT = 1000

    // Buscar citas en el rango de fechas con los estados seleccionados (CON LÍMITE)
    const { data: allAppointments, error } = await supabase
      .from('appointments')
      .select(`
        *,
        patient:patients(nombre, apellido),
        therapist:therapists(nombre, apellido),
        service:services(nombre),
        package:packages!appointments_package_id_fkey(id, total_sesiones, sesiones_completadas)
      `)
      .gte('fecha_hora', `${fechaDesde}T00:00:00-05:00`)
      .lte('fecha_hora', `${fechaHasta}T23:59:59-05:00`)
      .in('estado', estadosArray)
      .order('fecha_hora', { ascending: true })
      .limit(LIMIT)

    if (error) {
      console.error('Error fetching appointments:', error)
      return NextResponse.json(
        { error: 'Error al buscar las citas' },
        { status: 500 }
      )
    }

    if (!allAppointments || allAppointments.length === 0) {
      return NextResponse.json({
        citas_individuales: [],
        citas_de_paquetes: [],
        resumen: {
          total_encontradas: 0,
          individuales: { total: 0, por_estado: {} },
          de_paquetes: { total_citas: 0, total_paquetes: 0, por_estado: {}, paquetes: [] },
          limite_alcanzado: false
        }
      })
    }

    // Separar citas individuales de citas de paquetes
    const citasIndividuales = allAppointments.filter(cita => !cita.package_id)
    const citasDePaquetes = allAppointments.filter(cita => cita.package_id)

    // Agrupar citas de paquetes por package_id
    const paquetesMap = new Map()
    
    citasDePaquetes.forEach(cita => {
      const pkgId = cita.package_id
      if (!paquetesMap.has(pkgId)) {
        paquetesMap.set(pkgId, {
          package_id: pkgId,
          citas: [],
          total_citas_en_filtro: 0,
          total_sesiones_paquete: cita.package?.total_sesiones || 0,
          sesiones_completadas: cita.package?.sesiones_completadas || 0
        })
      }
      paquetesMap.get(pkgId).citas.push(cita)
      paquetesMap.get(pkgId).total_citas_en_filtro += 1
    })

    // OPTIMIZACIÓN: Obtener TODAS las citas de los paquetes en UNA SOLA query
    const packageIds = Array.from(paquetesMap.keys())
    let todasLasCitasPorPaquete = new Map()

    if (packageIds.length > 0) {
      const { data: citasCompletas, error: errorPkg } = await supabase
        .from('appointments')
        .select('id, estado, package_id')
        .in('package_id', packageIds)

      if (!errorPkg && citasCompletas) {
        // Agrupar por package_id
        citasCompletas.forEach(cita => {
          if (!todasLasCitasPorPaquete.has(cita.package_id)) {
            todasLasCitasPorPaquete.set(cita.package_id, [])
          }
          todasLasCitasPorPaquete.get(cita.package_id).push(cita)
        })
      }
    }

    // Construir detalle de paquetes
    const paquetesDetalle = []
    for (const [pkgId, paqueteInfo] of paquetesMap) {
      const todasLasCitas = todasLasCitasPorPaquete.get(pkgId) || []
      
      paquetesDetalle.push({
        ...paqueteInfo,
        total_citas_del_paquete: todasLasCitas.length,
        citas_ids: paqueteInfo.citas.map((c: any) => c.id)
      })
    }

    // Resumen
    const resumen = {
      total_encontradas: allAppointments.length,
      individuales: {
        total: citasIndividuales.length,
        por_estado: estadosArray.reduce((acc: any, estado: string) => {
          acc[estado] = citasIndividuales.filter(c => c.estado === estado).length
          return acc
        }, {})
      },
      de_paquetes: {
        total_citas: citasDePaquetes.length,
        total_paquetes: paquetesDetalle.length,
        por_estado: estadosArray.reduce((acc: any, estado: string) => {
          acc[estado] = citasDePaquetes.filter(c => c.estado === estado).length
          return acc
        }, {}),
        paquetes: paquetesDetalle
      },
      limite_alcanzado: allAppointments.length === LIMIT
    }

    return NextResponse.json({
      citas_individuales: citasIndividuales,
      citas_de_paquetes: citasDePaquetes,
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

// DELETE - Eliminar citas según selección
export async function DELETE(request: Request) {
  try {
    const supabase = createAdminClient()
    const body = await request.json()

    const {
      tipo, // "individuales" | "paquetes_solo_filtro" | "paquetes_completos"
      citas_ids, // Array de IDs de citas a eliminar
      paquetes_ids // Array de IDs de paquetes a eliminar (solo si tipo es "paquetes_completos")
    } = body

    if (!tipo || !citas_ids || !Array.isArray(citas_ids)) {
      return NextResponse.json(
        { error: 'Los campos tipo y citas_ids son requeridos' },
        { status: 400 }
      )
    }

    let resultado = {
      citas_eliminadas: 0,
      paquetes_eliminados: 0,
      citas_adicionales_eliminadas: 0 // Solo para cuando eliminamos paquetes completos
    }

    // CASO 1: Eliminar solo citas individuales
    if (tipo === 'individuales') {
      // Primero eliminar alertas de continuidad que referencien estas citas
      const { error: alertError } = await supabase
        .from('continuation_alerts')
        .delete()
        .in('appointment_id', citas_ids)

      if (alertError) {
        console.error('Error deleting continuation alerts for appointments:', alertError)
        return NextResponse.json(
          { error: 'Error al eliminar alertas de continuidad asociadas' },
          { status: 500 }
        )
      }

      const { error } = await supabase
        .from('appointments')
        .delete()
        .in('id', citas_ids)

      if (error) {
        console.error('Error deleting individual appointments:', error)
        return NextResponse.json(
          { error: 'Error al eliminar las citas individuales' },
          { status: 500 }
        )
      }

      resultado.citas_eliminadas = citas_ids.length
    }

    // CASO 2: Eliminar solo las citas del filtro (de paquetes) - DESBALANCEA
    if (tipo === 'paquetes_solo_filtro') {
      // Primero eliminar alertas de continuidad que referencien estas citas
      const { error: alertError } = await supabase
        .from('continuation_alerts')
        .delete()
        .in('appointment_id', citas_ids)

      if (alertError) {
        console.error('Error deleting continuation alerts for package appointments:', alertError)
        return NextResponse.json(
          { error: 'Error al eliminar alertas de continuidad asociadas' },
          { status: 500 }
        )
      }

      // Primero obtener los package_ids de las citas a eliminar
      const { data: citasAEliminar } = await supabase
        .from('appointments')
        .select('package_id')
        .in('id', citas_ids)

      const packageIds = [...new Set(citasAEliminar?.map(c => c.package_id).filter(Boolean))]

      // Eliminar las citas
      const { error } = await supabase
        .from('appointments')
        .delete()
        .in('id', citas_ids)

      if (error) {
        console.error('Error deleting package appointments:', error)
        return NextResponse.json(
          { error: 'Error al eliminar las citas de paquetes' },
          { status: 500 }
        )
      }

      // Recalcular contadores de los paquetes afectados
      for (const pkgId of packageIds) {
        const { data: citasRestantes } = await supabase
          .from('appointments')
          .select('estado')
          .eq('package_id', pkgId)

        const agendadas = citasRestantes?.filter(c => c.estado === 'agendada').length || 0
        const completadas = citasRestantes?.filter(c => c.estado === 'completada').length || 0
        const total = citasRestantes?.length || 0

        await supabase
          .from('packages')
          .update({
            sesiones_agendadas: agendadas,
            sesiones_completadas: completadas,
            sesiones_pendientes_agendar: Math.max(0, total - agendadas - completadas)
          })
          .eq('id', pkgId)
      }

      resultado.citas_eliminadas = citas_ids.length
    }

    // CASO 3: Eliminar paquetes completos (con TODAS sus citas)
    if (tipo === 'paquetes_completos') {
      if (!paquetes_ids || !Array.isArray(paquetes_ids)) {
        return NextResponse.json(
          { error: 'El campo paquetes_ids es requerido para eliminar paquetes completos' },
          { status: 400 }
        )
      }

      // Primero eliminar alertas de continuidad que referencien estos paquetes
      const { error: alertPkgError } = await supabase
        .from('continuation_alerts')
        .delete()
        .in('package_id', paquetes_ids)

      if (alertPkgError) {
        console.error('Error deleting continuation alerts for packages:', alertPkgError)
        return NextResponse.json(
          { error: 'Error al eliminar alertas de continuidad de paquetes' },
          { status: 500 }
        )
      }

      // Primero contar cuántas citas adicionales se eliminarán
      const { data: todasLasCitas } = await supabase
        .from('appointments')
        .select('id')
        .in('package_id', paquetes_ids)

      const totalCitasDelPaquete = todasLasCitas?.length || 0
      const citasAdicionalesEliminadas = totalCitasDelPaquete - citas_ids.length

      // Eliminar TODAS las citas de esos paquetes
      const { error: errorCitas } = await supabase
        .from('appointments')
        .delete()
        .in('package_id', paquetes_ids)

      if (errorCitas) {
        console.error('Error deleting package appointments:', errorCitas)
        return NextResponse.json(
          { error: 'Error al eliminar las citas de los paquetes' },
          { status: 500 }
        )
      }

      // Eliminar los paquetes
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

      resultado.citas_eliminadas = citas_ids.length
      resultado.citas_adicionales_eliminadas = citasAdicionalesEliminadas
      resultado.paquetes_eliminados = paquetes_ids.length
    }

    return NextResponse.json({
      success: true,
      resultado
    })

  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json(
      { error: 'Error inesperado del servidor' },
      { status: 500 }
    )
  }
}
