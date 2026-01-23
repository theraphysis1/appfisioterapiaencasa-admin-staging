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
    const search = searchParams.get('search')
    const fechaDesde = searchParams.get('fecha_desde')
    const fechaHasta = searchParams.get('fecha_hasta')

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
        package:packages!appointments_package_id_fkey(*)
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

    // Filtro por búsqueda de texto en paciente o terapeuta
    if (search) {
      // Para el filtro de búsqueda, necesitamos hacer un enfoque diferente
      // ya que necesitamos buscar en las tablas relacionadas
      
      // Primero obtenemos los IDs de pacientes que coinciden
      const { data: matchingPatients } = await supabase
        .from('patients')
        .select('id')
        .or(`nombre.ilike.%${search}%,apellido.ilike.%${search}%`)
      
      // Luego obtenemos los IDs de terapeutas que coinciden
      const { data: matchingTherapists } = await supabase
        .from('therapists')
        .select('id')
        .or(`nombre.ilike.%${search}%,apellido.ilike.%${search}%`)
      
      const patientIds = matchingPatients?.map(p => p.id) || []
      const therapistIds = matchingTherapists?.map(t => t.id) || []
      
      // Si hay coincidencias, filtramos por esos IDs
      if (patientIds.length > 0 || therapistIds.length > 0) {
        // Construir el filtro OR para pacientes y terapeutas
        const filters: string[] = []
        if (patientIds.length > 0) {
          filters.push(`patient_id.in.(${patientIds.join(',')})`)
        }
        if (therapistIds.length > 0) {
          filters.push(`therapist_id.in.(${therapistIds.join(',')})`)
        }
        
        const orFilter = filters.join(',')
        countQuery = countQuery.or(orFilter)
        dataQuery = dataQuery.or(orFilter)
      } else {
        // Si no hay coincidencias, retornar vacío
        return NextResponse.json({ 
          appointments: [],
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

    // Filtro por rango de fechas
    if (fechaDesde || fechaHasta) {
      if (fechaDesde) {
        const startDate = `${fechaDesde}T00:00:00-05:00`
        countQuery = countQuery.gte('fecha_hora', startDate)
        dataQuery = dataQuery.gte('fecha_hora', startDate)
      }
      
      if (fechaHasta) {
        const endDate = `${fechaHasta}T23:59:59-05:00`
        countQuery = countQuery.lte('fecha_hora', endDate)
        dataQuery = dataQuery.lte('fecha_hora', endDate)
      }
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

    // ✅ NUEVO: Calcular dirección final para cada cita
    const appointmentsWithLocation = data?.map(appointment => {
      const hasOverride = !!(
        appointment.direccion_override || 
        appointment.barrio_override || 
        appointment.direccion_lat_override
      )

      return {
        ...appointment,
        // Campos calculados de dirección final
        direccion_final: appointment.direccion_override || appointment.patient?.direccion || null,
        barrio_final: appointment.barrio_override || appointment.patient?.barrio || null,
        referencia_final: appointment.referencia_override || appointment.patient?.referencia || null,
        direccion_lat_final: appointment.direccion_lat_override || appointment.patient?.direccion_lat || null,
        direccion_lng_final: appointment.direccion_lng_override || appointment.patient?.direccion_lng || null,
        tiene_direccion_temporal: hasOverride
      }
    })

    const totalPages = Math.ceil((count || 0) / limit)

    return NextResponse.json({ 
      appointments: appointmentsWithLocation,
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
      observacion,
      // ✅ Campos de dirección override
      direccion_override,
      barrio_override,
      referencia_override,
      direccion_lat_override,
      direccion_lng_override
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

    // ✅ NUEVO: Si pertenece a un paquete, validar sesiones disponibles
    if (package_id) {
      const { data: packageData, error: packageError } = await supabase
        .from('packages')
        .select('*')
        .eq('id', package_id)
        .single()

      if (packageError || !packageData) {
        return NextResponse.json(
          { error: 'Paquete no encontrado' },
          { status: 404 }
        )
      }

      // Solo validar si es pago fraccionado
      if (packageData.forma_pago === 'fraccionado') {
        // Calcular sesiones disponibles
        let sesiones_disponibles = 0
        
        if (packageData.tiene_valoracion_previa) {
          sesiones_disponibles += 1
        }
        
        if (packageData.primer_pago_completado && packageData.sesiones_primer_pago) {
          sesiones_disponibles += packageData.sesiones_primer_pago
        }
        
        if (packageData.segundo_pago_completado && packageData.sesiones_segundo_pago) {
          sesiones_disponibles += packageData.sesiones_segundo_pago
        }

        // Verificar si puede agendar más sesiones
        if (packageData.sesiones_agendadas >= sesiones_disponibles) {
          const mensaje = packageData.segundo_pago_completado
            ? 'Todas las sesiones del paquete ya están agendadas'
            : `Debe registrar el ${packageData.primer_pago_completado ? 'segundo' : 'primer'} pago para agendar más sesiones`
          
          return NextResponse.json(
            { 
              error: mensaje,
              codigo: 'SESIONES_BLOQUEADAS',
              sesiones_disponibles,
              sesiones_agendadas: packageData.sesiones_agendadas,
              saldo_pendiente: packageData.saldo_pendiente,
              monto_proximo_pago: packageData.primer_pago_completado 
                ? packageData.monto_segundo_pago 
                : packageData.monto_primer_pago
            },
            { status: 400 }
          )
        }
      }
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
        estado: 'agendada',
        direccion_override: direccion_override || null,
        barrio_override: barrio_override || null,
        referencia_override: referencia_override || null,
        direccion_lat_override: direccion_lat_override || null,
        direccion_lng_override: direccion_lng_override || null
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

    // ✅ NUEVO: Si pertenece a un paquete, actualizar contador de sesiones_agendadas
    if (package_id) {
      const { error: updateError } = await supabase
        .from('packages')
        .update({ 
          sesiones_agendadas: supabase.rpc('increment', { row_id: package_id })
        })
        .eq('id', package_id)

      if (updateError) {
        console.error('Error updating package sessions:', updateError)
        // No fallar la creación de la cita, solo registrar el error
      }
    }

    // Calcular dirección final en la respuesta
    const hasOverride = !!(
      data.direccion_override || 
      data.barrio_override || 
      data.direccion_lat_override
    )

    const appointmentWithLocation = {
      ...data,
      direccion_final: data.direccion_override || data.patient?.direccion || null,
      barrio_final: data.barrio_override || data.patient?.barrio || null,
      referencia_final: data.referencia_override || data.patient?.referencia || null,
      direccion_lat_final: data.direccion_lat_override || data.patient?.direccion_lat || null,
      direccion_lng_final: data.direccion_lng_override || data.patient?.direccion_lng || null,
      tiene_direccion_temporal: hasOverride
    }

    return NextResponse.json({ appointment: appointmentWithLocation }, { status: 201 })
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json(
      { error: 'Error inesperado del servidor' },
      { status: 500 }
    )
  }
}