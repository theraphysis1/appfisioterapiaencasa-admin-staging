import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function GET(request: NextRequest) {
  try {
    const supabase = createAdminClient()
    
    // Usando cliente admin - bypasea RLS

    const searchParams = request.nextUrl.searchParams
    const therapist_id = searchParams.get('therapist_id')
    const fecha_desde = searchParams.get('fecha_desde')
    const fecha_hasta = searchParams.get('fecha_hasta')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '50')

    // Validar que venga al menos un filtro
    if (!therapist_id && !fecha_desde && !fecha_hasta) {
      return NextResponse.json(
        { error: 'Debes proporcionar al menos un filtro (therapist_id o fechas)' },
        { status: 400 }
      )
    }

    console.log('Preview filters:', { therapist_id, fecha_desde, fecha_hasta })

    // Construir query - SIN RLS porque somos admin
    let query = supabase
      .from('attendance_records')
      .select('*', { count: 'exact' })

    // Aplicar filtros
    if (therapist_id) {
      query = query.eq('therapist_id', therapist_id)
    }

    if (fecha_desde && fecha_hasta) {
      query = query
        .gte('created_at', `${fecha_desde}T00:00:00`)
        .lte('created_at', `${fecha_hasta}T23:59:59`)
    }

    // Aplicar paginación
    const from = (page - 1) * limit
    const to = from + limit - 1

    const { data: registros, error, count } = await query
      .order('created_at', { ascending: false })
      .range(from, to)

    if (error) {
      console.error('Error al obtener preview:', error)
      return NextResponse.json(
        { error: 'Error al obtener vista previa de registros', details: error.message },
        { status: 500 }
      )
    }

    console.log('Registros encontrados:', count)

    if (!registros || registros.length === 0) {
      return NextResponse.json({
        registros: [],
        pagination: {
          page,
          limit,
          total: 0,
          totalPages: 0,
          hasMore: false
        }
      })
    }

    // Obtener nombres de terapeutas y pacientes para el preview
    const therapistIds = [...new Set(registros.map(r => r.therapist_id).filter(Boolean))]
    const patientIds = [...new Set(registros.map(r => r.patient_id).filter(Boolean))]

    console.log('Buscando nombres - Therapists:', therapistIds.length, 'Patients:', patientIds.length)

    const [therapistsData, patientsData] = await Promise.all([
      therapistIds.length > 0
        ? supabase.from('therapists').select('id, nombre, apellido').in('id', therapistIds)
        : { data: [] },
      patientIds.length > 0
        ? supabase.from('patients').select('id, nombre, apellido').in('id', patientIds)
        : { data: [] }
    ])

    const therapistsMap = new Map(
      (therapistsData.data || []).map(t => [t.id, `${t.nombre} ${t.apellido}`])
    )
    const patientsMap = new Map(
      (patientsData.data || []).map(p => [p.id, `${p.nombre} ${p.apellido}`])
    )

    // Enriquecer registros con nombres
    const registrosEnriquecidos = registros.map(r => ({
      id: r.id,
      terapeuta: therapistsMap.get(r.therapist_id) || 'Desconocido',
      paciente: patientsMap.get(r.patient_id) || 'Desconocido',
      fecha: r.created_at,
      estado: r.registro_completo ? 'Completo' : (r.llegada_registrada ? 'Incompleto' : 'Sin registro')
    }))

    const totalPages = count ? Math.ceil(count / limit) : 0
    const hasMore = page < totalPages

    return NextResponse.json({
      registros: registrosEnriquecidos,
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages,
        hasMore
      }
    })

  } catch (error) {
    console.error('Error en preview:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
