import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// GET - Obtener todos los paquetes con paginación
export async function GET(request: Request) {
  try {
    const supabase = await createClient()
    const { searchParams } = new URL(request.url)
    
    // Parámetros de paginación
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const offset = (page - 1) * limit
    
    // Filtros opcionales
    const patientId = searchParams.get('patient_id')
    const estado = searchParams.get('estado')

    // Query base para contar total de registros (sin joins para ser más rápido)
    let countQuery = supabase
      .from('packages')
      .select('id', { count: 'exact', head: true })

    // Query principal para obtener datos con joins
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
        ),
        payment_alert:payment_alerts(
          fecha_ultima_sesion_pagada
        )
      `)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    // Aplicar filtros a ambas queries
    if (patientId) {
      countQuery = countQuery.eq('patient_id', patientId)
      dataQuery = dataQuery.eq('patient_id', patientId)
    }
    
    if (estado) {
      countQuery = countQuery.eq('estado', estado)
      dataQuery = dataQuery.eq('estado', estado)
    }

    // Ejecutar ambas queries en paralelo para mejor performance
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

    const totalPages = Math.ceil((count || 0) / limit)

    return NextResponse.json({ 
      packages: data,
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
