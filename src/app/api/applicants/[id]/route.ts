import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

// PUT - Actualizar estado y observación de un aspirante
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const { estado, observacion } = body

    // Validar que al menos uno de los campos esté presente
    if (estado === undefined && observacion === undefined) {
      return NextResponse.json(
        { error: 'Debe proporcionar al menos estado u observación' },
        { status: 400 }
      )
    }

    // Validar estados permitidos
    const estadosPermitidos = ['pendiente', 'contactado', 'rechazado', 'activo', 'retirado']
    if (estado && !estadosPermitidos.includes(estado)) {
      return NextResponse.json(
        { error: 'Estado no válido' },
        { status: 400 }
      )
    }

    const supabase = createAdminClient()

    // Construir objeto de actualización
    const updateData: { estado?: string; observacion?: string; updated_at?: string } = {
      updated_at: new Date().toISOString()
    }
    
    if (estado !== undefined) {
      updateData.estado = estado
    }
    if (observacion !== undefined) {
      updateData.observacion = observacion
    }

    // Actualizar aspirante
    const { data, error } = await supabase
      .from('applicants')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('Error updating applicant:', error)
      return NextResponse.json(
        { error: 'Error al actualizar aspirante' },
        { status: 500 }
      )
    }

    if (!data) {
      return NextResponse.json(
        { error: 'Aspirante no encontrado' },
        { status: 404 }
      )
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error('Error in PUT /api/applicants/[id]:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}