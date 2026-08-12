import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { bogotaDateRangeToUTC } from '@/lib/utils/dateRangeBogota'

export async function GET(request: NextRequest) {
  try {
    const supabase = createAdminClient()

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

    // Construir query - SIN RLS porque somos admin
    let query = supabase
      .from('notifications_log')
      .select('*', { count: 'exact' })

    // Aplicar filtros
    if (therapist_id) {
      query = query.eq('therapist_id', therapist_id)
    }

    if (fecha_desde && fecha_hasta) {
      const { startISO, endISO } = bogotaDateRangeToUTC(fecha_desde, fecha_hasta)
      query = query
        .gte('created_at', startISO)
        .lt('created_at', endISO)
    }

    // Aplicar paginación
    const from = (page - 1) * limit
    const to = from + limit - 1

    const { data: registros, error, count } = await query
      .order('created_at', { ascending: false })
      .range(from, to)

    if (error) {
      console.error('Error al obtener preview de notificaciones:', error)
      return NextResponse.json(
        { error: 'Error al obtener vista previa de registros', details: error.message },
        { status: 500 }
      )
    }

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

    // Obtener nombres de pacientes (therapist_nombre ya viene desnormalizado en la tabla)
    const patientIds = [...new Set(registros.map(r => r.patient_id).filter(Boolean))]

    const { data: patientsData } = patientIds.length > 0
      ? await supabase.from('patients').select('id, nombre, apellido').in('id', patientIds)
      : { data: [] }

    const patientsMap = new Map(
      (patientsData || []).map(p => [p.id, `${p.nombre} ${p.apellido}`])
    )

    // Enriquecer registros para el preview
    const registrosEnriquecidos = registros.map(r => ({
      id: r.id,
      terapeuta: r.therapist_nombre || 'Desconocido',
      paciente: r.patient_id ? (patientsMap.get(r.patient_id) || 'Desconocido') : '—',
      tipo_evento: r.tipo_evento,
      titulo: r.titulo,
      enviada: r.enviada,
      fecha: r.created_at,
      estado: r.enviada ? 'Enviada' : 'Fallida'
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
    console.error('Error en preview de notificaciones:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}