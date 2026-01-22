import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// GET - Obtener un paquete específico con sus citas
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient()
    const { id } = await params

    // Obtener el paquete
    const { data: packageData, error: packageError } = await supabase
      .from('packages')
      .select(`
        *,
        patient:patients(*),
        service:services(*)
      `)
      .eq('id', id)
      .single()

    if (packageError) {
      console.error('Error fetching package:', packageError)
      return NextResponse.json(
        { error: 'Error al obtener el paquete' },
        { status: 500 }
      )
    }

    if (!packageData) {
      return NextResponse.json(
        { error: 'Paquete no encontrado' },
        { status: 404 }
      )
    }

    // Obtener las citas asociadas al paquete
    const { data: appointments, error: appointmentsError } = await supabase
      .from('appointments')
      .select(`
        id,
        patient_id,
        therapist_id,
        service_id,
        package_id,
        fecha_hora,
        estado,
        patologia,
        valor,
        comision,
        observacion,
        direccion_override,
        barrio_override,
        referencia_override,
        direccion_lat_override,
        direccion_lng_override,
        therapist:therapists(
          id,
          nombre,
          apellido
        ),
        patient:patients(
          id,
          nombre,
          apellido,
          direccion,
          barrio,
          referencia,
          direccion_lat,
          direccion_lng
        )
      `)
      .eq('package_id', id)
      .order('fecha_hora', { ascending: true })

    if (appointmentsError) {
      console.error('Error fetching appointments:', appointmentsError)
    }

    // Calcular campos finales para cada cita
    const appointmentsWithFinalFields = (appointments || []).map(apt => {
      // El patient viene como array, acceder al primer elemento
      const patientData = Array.isArray(apt.patient) 
        ? apt.patient[0] 
        : apt.patient

      // Determinar si tiene override
      const tiene_direccion_temporal = apt.direccion_override !== null

      // Calcular campos finales
      const direccion_final = apt.direccion_override || patientData?.direccion || ''
      const barrio_final = apt.barrio_override || patientData?.barrio || ''
      const referencia_final = apt.referencia_override || patientData?.referencia || null
      const direccion_lat_final = apt.direccion_lat_override || patientData?.direccion_lat || null
      const direccion_lng_final = apt.direccion_lng_override || patientData?.direccion_lng || null

      return {
        ...apt,
        direccion_final,
        barrio_final,
        referencia_final,
        direccion_lat_final,
        direccion_lng_final,
        tiene_direccion_temporal
      }
    })

    // Devolver el paquete con las citas incluidas
    return NextResponse.json({ 
      package: {
        ...packageData,
        appointments: appointmentsWithFinalFields
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

// PUT - Actualizar estado del paquete
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient()
    const { id } = await params
    const body = await request.json()

    const { estado, sesiones_completadas } = body

    if (!estado || !['activo', 'completado', 'cancelado'].includes(estado)) {
      return NextResponse.json(
        { error: 'Estado inválido. Debe ser: activo, completado o cancelado' },
        { status: 400 }
      )
    }

    const updateData: any = {
      estado,
      updated_at: new Date().toISOString()
    }

    if (sesiones_completadas !== undefined) {
      updateData.sesiones_completadas = sesiones_completadas
    }

    const { data, error } = await supabase
      .from('packages')
      .update(updateData)
      .eq('id', id)
      .select(`
        *,
        patient:patients(*),
        service:services(*)
      `)
      .single()

    if (error) {
      console.error('Error updating package:', error)
      return NextResponse.json(
        { error: 'Error al actualizar el paquete' },
        { status: 500 }
      )
    }

    return NextResponse.json({ package: data })
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json(
      { error: 'Error inesperado del servidor' },
      { status: 500 }
    )
  }
}

// DELETE - Cancelar paquete completo
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient()
    const { id } = await params

    // Marcar el paquete como cancelado
    const { data: packageData, error: packageError } = await supabase
      .from('packages')
      .update({ 
        estado: 'cancelado'
      })
      .eq('id', id)
      .select()
      .single()

    if (packageError) {
      console.error('Error canceling package:', packageError)
      return NextResponse.json(
        { error: 'Error al cancelar el paquete' },
        { status: 500 }
      )
    }

    // Cancelar todas las citas agendadas del paquete
    const { error: appointmentsError } = await supabase
      .from('appointments')
      .update({ 
        estado: 'cancelada',
        updated_at: new Date().toISOString()
      })
      .eq('package_id', id)
      .eq('estado', 'agendada')

    if (appointmentsError) {
      console.error('Error canceling appointments:', appointmentsError)
    }

    return NextResponse.json({ 
      message: 'Paquete y citas cancelados exitosamente',
      package: packageData 
    })
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json(
      { error: 'Error inesperado del servidor' },
      { status: 500 }
    )
  }
}