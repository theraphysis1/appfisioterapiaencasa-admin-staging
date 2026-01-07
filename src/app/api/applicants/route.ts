import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

// GET - Listar todos los aspirantes
export async function GET() {
  try {
    const supabase = createAdminClient()

    const { data, error } = await supabase
      .from('applicants')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching applicants:', error)
      return NextResponse.json(
        { error: 'Error al obtener aspirantes' },
        { status: 500 }
      )
    }

    return NextResponse.json(data)
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