import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// DELETE /api/holidays/[id] - Eliminar un día festivo
export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient()
    const params = await context.params
    const { id } = params

    if (!id) {
      return NextResponse.json(
        { error: 'ID del festivo es requerido' },
        { status: 400 }
      )
    }

    // Verificar que el festivo existe
    const { data: existing, error: checkError } = await supabase
      .from('holidays')
      .select('id')
      .eq('id', id)
      .single()

    if (checkError || !existing) {
      return NextResponse.json(
        { error: 'Día festivo no encontrado' },
        { status: 404 }
      )
    }

    // Eliminar el festivo
    const { error: deleteError } = await supabase
      .from('holidays')
      .delete()
      .eq('id', id)

    if (deleteError) {
      console.error('Error deleting holiday:', deleteError)
      return NextResponse.json(
        { error: 'Error al eliminar día festivo' },
        { status: 500 }
      )
    }

    return NextResponse.json(
      { message: 'Día festivo eliminado correctamente' },
      { status: 200 }
    )
  } catch (error) {
    console.error('Unexpected error in DELETE /api/holidays/[id]:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}