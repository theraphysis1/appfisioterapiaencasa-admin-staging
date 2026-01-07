import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

// GET - Listar aspirantes con filtros y paginación
export async function GET(request: NextRequest) {
  try {
    const supabase = createAdminClient()
    const { searchParams } = new URL(request.url)
    
    // Extraer parámetros de búsqueda
    const nombre = searchParams.get('nombre')
    const contacto = searchParams.get('contacto')
    const especialidad = searchParams.get('especialidad')
    const fecha_graduado_desde = searchParams.get('fecha_graduado_desde')
    const fecha_graduado_hasta = searchParams.get('fecha_graduado_hasta')
    const fecha_desde = searchParams.get('fecha_desde')
    const fecha_hasta = searchParams.get('fecha_hasta')
    const estado = searchParams.get('estado')

    // Parámetros de paginación
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = (page - 1) * limit

    // Construir query para contar total
    let countQuery = supabase
      .from('applicants')
      .select('*', { count: 'exact', head: true })

    // Construir query para datos
    let dataQuery = supabase
      .from('applicants')
      .select('*')

    // Aplicar filtros en ambas queries
    const applyFilters = (query: any) => {
      if (nombre) {
        query = query.ilike('nombre', `%${nombre}%`)
      }
      if (contacto) {
        query = query.ilike('contacto', `%${contacto}%`)
      }
      if (especialidad) {
        query = query.ilike('especialidad', `%${especialidad}%`)
      }
      if (fecha_graduado_desde) {
        query = query.gte('fecha_graduado', fecha_graduado_desde)
      }
      if (fecha_graduado_hasta) {
        query = query.lte('fecha_graduado', fecha_graduado_hasta)
      }
      if (fecha_desde) {
        query = query.gte('fecha_enviada_hv', fecha_desde)
      }
      if (fecha_hasta) {
        query = query.lte('fecha_enviada_hv', fecha_hasta)
      }
      if (estado) {
        query = query.eq('estado', estado)
      }
      return query
    }

    countQuery = applyFilters(countQuery)
    dataQuery = applyFilters(dataQuery)

    // Aplicar paginación y ordenamiento
    dataQuery = dataQuery
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    // Ejecutar ambas queries
    const [{ count, error: countError }, { data, error: dataError }] = await Promise.all([
      countQuery,
      dataQuery
    ])

    if (countError || dataError) {
      console.error('Error fetching applicants:', countError || dataError)
      return NextResponse.json(
        { error: 'Error al obtener aspirantes' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      data,
      pagination: {
        total: count || 0,
        page,
        limit,
        totalPages: Math.ceil((count || 0) / limit)
      }
    })
  } catch (error) {
    console.error('Error in GET /api/applicants:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}

// POST - Crear nuevo aspirante
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { nombre, contacto, cedula, direccion, barrio, especialidad, fecha_graduado, fecha_enviada_hv } = body

    // Validar solo campos requeridos (cedula y barrio son opcionales)
    if (!nombre || !contacto || !direccion || !especialidad || !fecha_graduado || !fecha_enviada_hv) {
      return NextResponse.json(
        { error: 'Todos los campos obligatorios deben ser completados' },
        { status: 400 }
      )
    }

    const supabase = createAdminClient()

    // Verificar si ya existe un aspirante con la misma cédula (solo si se proporcionó cédula)
    if (cedula && cedula.trim() !== '') {
      const { data: existing, error: checkError } = await supabase
        .from('applicants')
        .select('cedula, nombre')
        .eq('cedula', cedula)
        .single()

      if (checkError && checkError.code !== 'PGRST116') { // PGRST116 = no rows found
        console.error('Error checking existing applicant:', checkError)
        return NextResponse.json(
          { error: 'Error al verificar aspirante existente' },
          { status: 500 }
        )
      }

      if (existing) {
        return NextResponse.json(
          { 
            error: 'Ya existe un aspirante registrado con esta cédula',
            existing: existing.nombre 
          },
          { status: 409 } // 409 Conflict
        )
      }
    }

    // Crear nuevo aspirante
    const { data, error } = await supabase
      .from('applicants')
      .insert([
        {
          nombre,
          contacto,
          cedula,
          direccion,
          barrio,
          especialidad,
          fecha_graduado,
          fecha_enviada_hv,
        },
      ])
      .select()
      .single()

    if (error) {
      console.error('Error creating applicant:', error)
      return NextResponse.json(
        { error: 'Error al crear aspirante' },
        { status: 500 }
      )
    }

    return NextResponse.json(data, { status: 201 })
  } catch (error) {
    console.error('Error in POST /api/applicants:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}