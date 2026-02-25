import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// DELETE - Eliminar alerta físicamente (paciente no quiere continuar)
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient()
    const { id } = await params

    // Verificar que existe antes de eliminar
    const { data: existing, error: fetchError } = await supabase
      .from('continuation_alerts')
      .select('id')
      .eq('id', id)
      .single()

    if (fetchError || !existing) {
      return NextResponse.json(
        { error: 'Alerta no encontrada' },
        { status: 404 }
      )
    }

    // Eliminación física
    const { error: deleteError } = await supabase
      .from('continuation_alerts')
      .delete()
      .eq('id', id)

    if (deleteError) {
      console.error('Error deleting continuation alert:', deleteError)
      return NextResponse.json(
        { error: 'Error al eliminar la alerta' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      message: '✅ Alerta eliminada exitosamente'
    })

  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json(
      { error: 'Error inesperado del servidor' },
      { status: 500 }
    )
  }
}