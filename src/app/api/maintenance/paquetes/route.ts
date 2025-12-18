import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

// GET - Buscar paquetes con detalle de citas asociadas
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

    // Buscar todos los paquetes en el rango de fechas con los estados seleccionados
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

    if (error) {
      console.error('Error fetching packages:', error)
      return NextResponse.json(
        { error: 'Error al buscar los paquetes' },
        { status: 500 }
      )
    }

    // Para cada paquete, contar sus citas y obtener detalle
    const paquetesConDetalle = []
    let totalCitasAsociadas = 0

    for (const paquete of paquetes) {
      // Contar todas las citas del paquete
      const { data: citas, error: errorCitas } = await supabase
        .from('appointments')
        .select('id, estado, fecha_hora')
        .eq('package_id', paquete.id)
        .order('fecha_hora', { ascending: true })

      if (!errorCitas && citas) {
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
    }

    // Resumen
    const resumen = {
      total_paquetes: paquetes.length,
      total_citas_asociadas: totalCitasAsociadas,
      por_estado: estadosArray.reduce((acc: any, estado: string) => {
        acc[estado] = paquetes.filter(p => p.estado === estado).length
        return acc
      }, {})
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
    const citasPorEstado = {
      agendada: citasAEliminar?.filter(c => c.estado === 'agendada').length || 0,
      completada: citasAEliminar?.filter(c => c.estado === 'completada').length || 0,
      cancelada: citasAEliminar?.filter(c => c.estado === 'cancelada').length || 0,
      pendiente_reagendar: citasAEliminar?.filter(c => c.estado === 'pendiente_reagendar').length || 0
    }

    // PASO 1: Eliminar TODAS las citas de esos paquetes
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

    // PASO 2: Eliminar los paquetes
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
