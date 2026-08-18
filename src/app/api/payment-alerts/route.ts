import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// GET - Listar alertas con filtros
export async function GET(request: Request) {
  try {
    const supabase = await createClient()
    const { searchParams } = new URL(request.url)

    const nivel_urgencia = searchParams.get('nivel_urgencia')
    const alerta_activa = searchParams.get('alerta_activa')
    const fecha_desde = searchParams.get('fecha_desde')
    const fecha_hasta = searchParams.get('fecha_hasta')
    const contactado = searchParams.get('contactado')

    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = (page - 1) * limit

    let query = supabase
      .from('payment_alerts')
      .select(`
        *,
        patient:patients(
          id,
          nombre,
          apellido,
          telefono,
          direccion,
          referencia
        ),
        package:packages(
          id,
          total_sesiones,
          sesiones_agendadas,
          valor_total,
          saldo_pendiente,
          forma_pago,
          sesiones_primer_pago,
          tiene_valoracion_previa,
          valoracion_cita_id,
          service:services(
            nombre,
            tipo
          )
        )
      `, { count: 'exact' })

    if (nivel_urgencia) {
      query = query.eq('nivel_urgencia', nivel_urgencia)
    }

    if (alerta_activa !== null && alerta_activa !== undefined) {
      query = query.eq('alerta_activa', alerta_activa === 'true')
    }

    if (contactado !== null && contactado !== undefined) {
      query = query.eq('contactado', contactado === 'true')
    }

    const { data, error, count } = await query
      .order('nivel_urgencia', { ascending: true })
      .order('fecha_ultima_sesion_pagada', { ascending: true })
      .range(offset, offset + limit - 1)

    if (error) {
      console.error('Error fetching alerts:', error)
      return NextResponse.json(
        { error: 'Error al obtener las alertas' },
        { status: 500 }
      )
    }

    if (!data || data.length === 0) {
      return NextResponse.json({
        alerts: [],
        pagination: {
          page,
          limit,
          total: 0,
          totalPages: 0,
          hasMore: false
        }
      })
    }

    // Calcular fecha_ultima_sesion_pagada en tiempo real desde appointments
    // Solo para alertas con paquete fraccionado y primer pago completado
    const alertasConPaqueteFraccionado = data.filter(
      (alert: any) =>
        alert.package?.forma_pago === 'fraccionado' &&
        alert.package?.sesiones_primer_pago > 0
    )

    const packageIds = alertasConPaqueteFraccionado.map(
      (alert: any) => alert.package_id
    )

    let fechaRealPorPaquete: Record<string, string | null> = {}

    if (packageIds.length > 0) {
      const { data: citas, error: citasError } = await supabase
        .from('appointments')
        .select('id, package_id, fecha_hora')
        .in('package_id', packageIds)
        .eq('estado', 'agendada')
        .order('fecha_hora', { ascending: true })

      if (!citasError && citas) {
        // Agrupar citas por package_id
        const citasAgrupadas: Record<string, any[]> = {}
        for (const cita of citas) {
          if (!citasAgrupadas[cita.package_id]) {
            citasAgrupadas[cita.package_id] = []
          }
          citasAgrupadas[cita.package_id].push(cita)
        }

        // Para cada alerta, tomar la última cita cubierta por el primer pago
        for (const alert of alertasConPaqueteFraccionado) {
          const citasDelPaquete = citasAgrupadas[alert.package_id] || []
          const sesionesDelPrimerPago = alert.package?.sesiones_primer_pago || 0

          const citasCubiertasPrimerPago = citasDelPaquete.slice(0, sesionesDelPrimerPago)

          if (citasCubiertasPrimerPago.length > 0) {
            const ultimaCita = citasCubiertasPrimerPago[citasCubiertasPrimerPago.length - 1]
            fechaRealPorPaquete[alert.package_id] = ultimaCita.fecha_hora
          } else {
            fechaRealPorPaquete[alert.package_id] = null
          }
        }
      }
    }

    // ── Patología por paquete ──
    // Criterio: patología de la cita de valoración si el paquete tuvo valoración previa;
    // si no, la patología de la primera cita (más antigua) del paquete.
    const patologiaPorPaquete: Record<string, string | null> = {}

    const todosLosPackageIds = Array.from(
      new Set(data.map((alert: any) => alert.package_id).filter(Boolean))
    )

    const valoracionCitaIds = Array.from(
      new Set(
        data
          .filter((alert: any) => alert.package?.tiene_valoracion_previa && alert.package?.valoracion_cita_id)
          .map((alert: any) => alert.package.valoracion_cita_id)
      )
    )

    if (todosLosPackageIds.length > 0) {
      const { data: citasPatologia, error: citasPatologiaError } = await supabase
        .from('appointments')
        .select('id, package_id, fecha_hora, patologia')
        .in('package_id', todosLosPackageIds)
        .order('fecha_hora', { ascending: true })

      const primeraCitaPorPaquete: Record<string, string | null> = {}
      if (!citasPatologiaError && citasPatologia) {
        for (const cita of citasPatologia) {
          if (!(cita.package_id in primeraCitaPorPaquete)) {
            primeraCitaPorPaquete[cita.package_id] = cita.patologia || null
          }
        }
      }

      let patologiaPorValoracion: Record<string, string | null> = {}
      if (valoracionCitaIds.length > 0) {
        const { data: citasValoracion, error: citasValoracionError } = await supabase
          .from('appointments')
          .select('id, patologia')
          .in('id', valoracionCitaIds)

        if (!citasValoracionError && citasValoracion) {
          for (const cita of citasValoracion) {
            patologiaPorValoracion[cita.id] = cita.patologia || null
          }
        }
      }

      for (const alert of data as any[]) {
        const pkg = alert.package
        if (pkg?.tiene_valoracion_previa && pkg?.valoracion_cita_id && patologiaPorValoracion[pkg.valoracion_cita_id]) {
          patologiaPorPaquete[alert.package_id] = patologiaPorValoracion[pkg.valoracion_cita_id]
        } else {
          patologiaPorPaquete[alert.package_id] = primeraCitaPorPaquete[alert.package_id] ?? null
        }
      }
    }

    // Construir alertas con fecha real calculada y días restantes
    const alertsWithDays = data.map((alert: any) => {
      // Usar fecha calculada si existe, si no usar la guardada en BD
      const fechaFinal =
        fechaRealPorPaquete.hasOwnProperty(alert.package_id)
          ? fechaRealPorPaquete[alert.package_id]
          : alert.fecha_ultima_sesion_pagada

      const fechaUltimaSesion = fechaFinal ? new Date(fechaFinal) : null
      const hoy = new Date()
      const diffDays = fechaUltimaSesion
        ? Math.ceil((fechaUltimaSesion.getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24))
        : null

      return {
        ...alert,
        fecha_ultima_sesion_pagada: fechaFinal ?? alert.fecha_ultima_sesion_pagada,
        dias_restantes: diffDays,
        patient_nombre: alert.patient
          ? `${alert.patient.nombre} ${alert.patient.apellido}`
          : 'Paciente no encontrado',
        patient_telefono: alert.patient?.telefono || 'Sin teléfono',
        package_nombre: alert.package?.service?.nombre || 'Servicio no encontrado',
        patologia: patologiaPorPaquete[alert.package_id] || null
      }
    })

    // Aplicar filtros de fecha sobre la fecha ya calculada
    let alertsFiltradas = alertsWithDays
    if (fecha_desde) {
      alertsFiltradas = alertsFiltradas.filter(
        (a: any) => a.fecha_ultima_sesion_pagada >= fecha_desde
      )
    }
    if (fecha_hasta) {
      alertsFiltradas = alertsFiltradas.filter(
        (a: any) => a.fecha_ultima_sesion_pagada <= fecha_hasta
      )
    }

    const totalPages = Math.ceil((count || 0) / limit)

    return NextResponse.json({
      alerts: alertsFiltradas,
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages,
        hasMore: page < totalPages
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