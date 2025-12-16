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
        *,
        therapist:therapists(*)
      `)
      .eq('package_id', id)
      .order('fecha_hora', { ascending: true })

    if (appointmentsError) {
      console.error('Error fetching appointments:', appointmentsError)
    }

    // Devolver el paquete con las citas incluidas
    return NextResponse.json({ 
      package: {
        ...packageData,
        appointments: appointments || []
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