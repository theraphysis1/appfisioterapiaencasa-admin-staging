import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// GET - Obtener todos los paquetes con paginación
export async function GET(request: Request) {
  try {
    const supabase = await createClient()
    const { searchParams } = new URL(request.url)

    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const offset = (page - 1) * limit

    const patientId = searchParams.get('patient_id')
    const estado = searchParams.get('estado')
    const search = searchParams.get('search')

    let countQuery = supabase
      .from('packages')
      .select('id', { count: 'exact', head: true })

    let dataQuery = supabase
      .from('packages')
      .select(`
        *,
        patient:patients(*),
        service:services(*),
        valoracion_cita:appointments!packages_valoracion_cita_id_fkey(
          id,
          fecha_hora,
          therapist:therapists(nombre, apellido)
        )
      `)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (patientId) {
      countQuery = countQuery.eq('patient_id', patientId)
      dataQuery = dataQuery.eq('patient_id', patientId)
    }

    if (estado) {
      countQuery = countQuery.eq('estado', estado)
      dataQuery = dataQuery.eq('estado', estado)
    }

    // Filtro por búsqueda de texto en paciente (nombre + apellido, cualquier orden)
    if (search) {
      const searchTokens = search.trim().split(/\s+/).filter(Boolean)

      let patientsQuery = supabase.from('patients').select('id')

      // Cada token debe aparecer en nombre O apellido (AND entre tokens, OR entre campos)
      searchTokens.forEach((token) => {
        patientsQuery = patientsQuery.or(`nombre.ilike.%${token}%,apellido.ilike.%${token}%`)
      })

      const { data: matchingPatients } = await patientsQuery
      const patientIds = matchingPatients?.map(p => p.id) || []

      if (patientIds.length > 0) {
        countQuery = countQuery.in('patient_id', patientIds)
        dataQuery = dataQuery.in('patient_id', patientIds)
      } else {
        // Si no hay coincidencias, retornar vacío
        return NextResponse.json({
          packages: [],
          pagination: {
            page,
            limit,
            total: 0,
            totalPages: 0,
            hasMore: false
          }
        })
      }
    }

    const [{ count, error: countError }, { data, error: dataError }] = await Promise.all([
      countQuery,
      dataQuery
    ])

    if (countError) {
      console.error('Error counting packages:', countError)
      return NextResponse.json(
        { error: 'Error al contar los paquetes' },
        { status: 500 }
      )
    }

    if (dataError) {
      console.error('Error fetching packages:', dataError)
      return NextResponse.json(
        { error: 'Error al obtener los paquetes' },
        { status: 500 }
      )
    }

    if (!data || data.length === 0) {
      return NextResponse.json({
        packages: [],
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
    // Solo para paquetes fraccionados con primer pago completado y segundo pago pendiente
    const packagesFraccionadosPendientes = data.filter(
      (pkg: any) =>
        pkg.forma_pago === 'fraccionado' &&
        pkg.primer_pago_completado === true &&
        pkg.segundo_pago_completado === false &&
        pkg.sesiones_primer_pago > 0
    )

    // Obtener IDs de esos paquetes
    const packageIds = packagesFraccionadosPendientes.map((pkg: any) => pkg.id)

    // Traer todas las citas agendadas de esos paquetes en una sola query
    let citasPorPaquete: Record<string, string | null> = {}

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

        // Para cada paquete, tomar la última cita del grupo cubierto por el primer pago
        for (const pkg of packagesFraccionadosPendientes) {
          const citasDelPaquete = citasAgrupadas[pkg.id] || []
          const sesionesDelPrimerPago = pkg.sesiones_primer_pago || 0

          // Tomar las primeras N citas (cubiertas por el primer pago)
          const citasCubiertasPrimerPago = citasDelPaquete.slice(0, sesionesDelPrimerPago)

          if (citasCubiertasPrimerPago.length > 0) {
            // La última de ese grupo es la fecha de vencimiento
            const ultimaCita = citasCubiertasPrimerPago[citasCubiertasPrimerPago.length - 1]
            citasPorPaquete[pkg.id] = ultimaCita.fecha_hora
          } else {
            citasPorPaquete[pkg.id] = null
          }
        }
      }
    }

    // Inyectar fecha_ultima_sesion_pagada calculada en cada paquete
    const packagesConFecha = data.map((pkg: any) => {
      if (citasPorPaquete.hasOwnProperty(pkg.id)) {
        return {
          ...pkg,
          fecha_ultima_sesion_pagada_real: citasPorPaquete[pkg.id]
        }
      }
      return pkg
    })

    const totalPages = Math.ceil((count || 0) / limit)

    return NextResponse.json({
      packages: packagesConFecha,
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
