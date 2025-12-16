import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// GET - Obtener todas las citas
export async function GET(request: Request) {
  try {
    const supabase = await createClient()
    const { searchParams } = new URL(request.url)
    
    // Filtros opcionales
    const therapistId = searchParams.get('therapist_id')
    const patientId = searchParams.get('patient_id')
    const estado = searchParams.get('estado')
    const fecha = searchParams.get('fecha')

    let query = supabase
      .from('appointments')
      .select(`
        *,
        patient:patients(*),
        therapist:therapists(*),
        service:services(*),
        package:packages(*)
      `)
      .order('fecha_hora', { ascending: true })

    // Aplicar filtros si existen
    if (therapistId) {
      query = query.eq('therapist_id', therapistId)
    }
    
    if (patientId) {
      query = query.eq('patient_id', patientId)
    }
    
    if (estado) {
      query = query.eq('estado', estado)
    }
    
    if (fecha) {
      // Filtrar por fecha específica (inicio y fin del día en zona horaria de Colombia UTC-5)
      // Agregamos la zona horaria explícitamente
      const startOfDay = `${fecha}T00:00:00-05:00`
      const endOfDay = `${fecha}T23:59:59-05:00`
      
      console.log('🔍 Filtrando por fecha:', { fecha, startOfDay, endOfDay })
      
      query = query
        .gte('fecha_hora', startOfDay)
        .lte('fecha_hora', endOfDay)
    }

    const { data, error } = await query

    if (error) {
      console.error('Error fetching appointments:', error)
      return NextResponse.json(
        { error: 'Error al obtener las citas' },
        { status: 500 }
      )
    }

    return NextResponse.json({ appointments: data })
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