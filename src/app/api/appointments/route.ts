import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// GET - Obtener todas las citas con paginación
export async function GET(request: Request) {
  try {
    const supabase = await createClient()
    const { searchParams } = new URL(request.url)
    
    // Parámetros de paginación
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const offset = (page - 1) * limit
    
    // Filtros opcionales
    const therapistId = searchParams.get('therapist_id')
    const patientId = searchParams.get('patient_id')
    const estado = searchParams.get('estado')
    const fecha = searchParams.get('fecha')

    // Query base para contar total de registros (sin joins para ser más rápido)
    let countQuery = supabase
      .from('appointments')
      .select('id', { count: 'exact', head: true })

    // Query principal para obtener datos con joins
    let dataQuery = supabase
      .from('appointments')
      .select(`
        *,
        patient:patients(*),
        therapist:therapists(*),
        service:services(*),
        package:packages(*)
      `)
      .order('fecha_hora', { ascending: false })
      .range(offset, offset + limit - 1)

    // Aplicar filtros a ambas queries
    if (therapistId) {
      countQuery = countQuery.eq('therapist_id', therapistId)
      dataQuery = dataQuery.eq('therapist_id', therapistId)
    }
    
    if (patientId) {
      countQuery = countQuery.eq('patient_id', patientId)
      dataQuery = dataQuery.eq('patient_id', patientId)
    }
    
    if (estado) {
      countQuery = countQuery.eq('estado', estado)
      dataQuery = dataQuery.eq('estado', estado)
    }
    
    if (fecha) {
      // Filtrar por fecha específica (inicio y fin del día en zona horaria de Colombia UTC-5)
      const startOfDay = `${fecha}T00:00:00-05:00`
      const endOfDay = `${fecha}T23:59:59-05:00`
      
      console.log('🔍 Filtrando por fecha:', { fecha, startOfDay, endOfDay })
      
      countQuery = countQuery
        .gte('fecha_hora', startOfDay)
        .lte('fecha_hora', endOfDay)
      
      dataQuery = dataQuery
        .gte('fecha_hora', startOfDay)
        .lte('fecha_hora', endOfDay)
    }

    // Ejecutar ambas queries en paralelo para mejor performance
    const [{ count, error: countError }, { data, error: dataError }] = await Promise.all([
      countQuery,
      dataQuery
    ])

    if (countError) {
      console.error('Error counting appointments:', countError)
      return NextResponse.json(
        { error: 'Error al contar las citas' },
        { status: 500 }
      )
    }

    if (dataError) {
      console.error('Error fetching appointments:', dataError)
      return NextResponse.json(
        { error: 'Error al obtener las citas' },
        { status: 500 }
      )
    }

    const totalPages = Math.ceil((count || 0) / limit)

    return NextResponse.json({ 
      appointments: data,
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

// POST - Crear nueva cita individual
export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const body = await request.json()

    const {
      patient_id,
      therapist_id,
      service_id,
      package_id,
      fecha_hora,
      patologia,
      valor,
      comision,
      observacion
    } = body

    // Validaciones
    if (!patient_id || !therapist_id || !service_id || !fecha_hora || !patologia) {
      return NextResponse.json(
        { error: 'Los campos patient_id, therapist_id, service_id, fecha_hora y patologia son requeridos' },
        { status: 400 }
      )
    }

    if (valor === undefined || comision === undefined) {
      return NextResponse.json(
        { error: 'Los campos valor y comision son requeridos' },
        { status: 400 }
      )
    }

    // Verificar que la fecha/hora no esté ocupada por el terapeuta
    const { data: existingAppointment } = await supabase
      .from('appointments')
      .select('id')
      .eq('therapist_id', therapist_id)
      .eq('fecha_hora', fecha_hora)
      .eq('estado', 'agendada')
      .single()

    if (existingAppointment) {
      return NextResponse.json(
        { error: 'El terapeuta ya tiene una cita agendada en ese horario' },
        { status: 400 }
      )
    }

    const { data, error } = await supabase
      .from('appointments')
      .insert([{
        patient_id,
        therapist_id,
        service_id,
        package_id: package_id || null,
        fecha_hora,
        patologia,
        valor,
        comision,
        observacion: observacion || null,
        estado: 'agendada'
      }])
      .select(`
        *,
        patient:patients(*),
        therapist:therapists(*),
        service:services(*)
      `)
      .single()

    if (error) {
      console.error('Error creating appointment:', error)
      return NextResponse.json(
        { error: 'Error al crear la cita' },
        { status: 500 }
      )
    }

    return NextResponse.json({ appointment: data }, { status: 201 })
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json(
      { error: 'Error inesperado del servidor' },
      { status: 500 }
    )
  }
}