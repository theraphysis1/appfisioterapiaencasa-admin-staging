import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// GET - Obtener un servicio específico
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient()
    const { id } = await params
    
    const { data, error } = await supabase
      .from('services')
      .select('*')
      .eq('id', id)
      .single()
    
    if (error) {
      console.error('Error fetching service:', error)
      return NextResponse.json(
        { error: 'Error al obtener el servicio' },
        { status: 500 }
      )
    }
    
    if (!data) {
      return NextResponse.json(
        { error: 'Servicio no encontrado' },
        { status: 404 }
      )
    }
    
    return NextResponse.json({ service: data })
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json(
      { error: 'Error inesperado del servidor' },
      { status: 500 }
    )
  }
}

// PUT - Actualizar un servicio
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient()
    const { id } = await params
    const body = await request.json()
    
    const { nombre, tipo, cantidad_sesiones, valor_default, comision_default, activo } = body
    
    // Validaciones
    if (!nombre || !tipo || !cantidad_sesiones || valor_default === undefined || comision_default === undefined) {
      return NextResponse.json(
        { error: 'Todos los campos son requeridos' },
        { status: 400 }
      )
    }
    
    if (!['valoracion', 'individual', 'paquete'].includes(tipo)) {
      return NextResponse.json(
        { error: 'Tipo de servicio inválido' },
        { status: 400 }
      )
    }
    
    const { data, error } = await supabase
      .from('services')
      .update({
        nombre,
        tipo,
        cantidad_sesiones,
        valor_default,
        comision_default,
        activo: activo !== undefined ? activo : true
      })
      .eq('id', id)
      .select()
      .single()
    
    if (error) {
      console.error('Error updating service:', error)
      return NextResponse.json(
        { error: 'Error al actualizar el servicio' },
        { status: 500 }
      )
    }
    
    return NextResponse.json({ service: data })
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json(
      { error: 'Error inesperado del servidor' },
      { status: 500 }
    )
  }
}

// DELETE - Eliminar un servicio (soft delete - marcar como inactivo)
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient()
    const { id } = await params
    
    // En lugar de eliminar, marcamos como inactivo
    const { data, error } = await supabase
      .from('services')
      .update({ activo: false })
      .eq('id', id)
      .select()
      .single()
    
    if (error) {
      console.error('Error deleting service:', error)
      return NextResponse.json(
        { error: 'Error al eliminar el servicio' },
        { status: 500 }
      )
    }
    
    return NextResponse.json({ 
      message: 'Servicio eliminado exitosamente',
      service: data 
    })
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json(
      { error: 'Error inesperado del servidor' },
      { status: 500 }
    )
  }
}