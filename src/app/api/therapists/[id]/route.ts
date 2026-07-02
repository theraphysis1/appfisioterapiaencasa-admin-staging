import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

// GET - Obtener un terapeuta específico
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('therapists')
      .select('*')
      .eq('id', id)
      .single()

    if (error || !data) {
      return NextResponse.json(
        { error: 'Terapeuta no encontrado' },
        { status: 404 }
      )
    }

    return NextResponse.json({ therapist: data })
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json(
      { error: 'Error inesperado del servidor' },
      { status: 500 }
    )
  }
}

// PUT - Actualizar un terapeuta
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const { nombre, apellido, contacto, placa_moto } = body

    // Validar campos requeridos
    if (!nombre || !apellido || !contacto) {
      return NextResponse.json(
        { error: 'Nombre, apellido y contacto son requeridos' },
        { status: 400 }
      )
    }

    const supabase = await createClient()

    // Actualizar el terapeuta
    const { data, error } = await supabase
      .from('therapists')
      .update({
        nombre,
        apellido,
        contacto,
        placa_moto: placa_moto || null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()

    if (error || !data || data.length === 0) {
      console.error('Update error:', error)
      return NextResponse.json(
        { error: error?.message || 'Terapeuta no encontrado' },
        { status: error ? 500 : 404 }
      )
    }

    if (error) {
      console.error('Update error:', error)
      return NextResponse.json(
        { error: 'Error al actualizar el terapeuta' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      therapist: data[0],
    })
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json(
      { error: 'Error inesperado del servidor' },
      { status: 500 }
    )
  }
}

// DELETE - Desactivar un terapeuta (soft delete)
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createClient()

    // Obtener el terapeuta y su user_id
    const { data: therapist } = await supabase
      .from('therapists')
      .select('user_id, activo')
      .eq('id', id)
      .single()

    if (!therapist) {
      return NextResponse.json(
        { error: 'Terapeuta no encontrado' },
        { status: 404 }
      )
    }

    if (therapist.activo === false) {
      return NextResponse.json(
        { error: 'El terapeuta ya está desactivado' },
        { status: 400 }
      )
    }

    // Validar que no tenga citas futuras agendadas
    const ahora = new Date().toISOString()
    const { data: citasFuturas, error: citasError } = await supabase
      .from('appointments')
      .select('id', { count: 'exact' })
      .eq('therapist_id', id)
      .eq('estado', 'agendada')
      .gte('fecha_hora', ahora)

    if (citasError) {
      console.error('Error checking future appointments:', citasError)
      return NextResponse.json(
        { error: 'Error al verificar citas del terapeuta' },
        { status: 500 }
      )
    }

    if (citasFuturas && citasFuturas.length > 0) {
      return NextResponse.json(
        {
          error: `Este terapeuta tiene ${citasFuturas.length} cita(s) agendada(s) pendiente(s). Reasígnalas o cancélalas antes de desactivarlo.`,
        },
        { status: 409 }
      )
    }

    // Desactivar el terapeuta (soft delete)
    const { error: updateError } = await supabase
      .from('therapists')
      .update({
        activo: false,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)

    if (updateError) {
      console.error('Deactivate error:', updateError)
      return NextResponse.json(
        { error: 'Error al desactivar el terapeuta' },
        { status: 500 }
      )
    }

    // Bloquear el acceso del terapeuta en Supabase Auth
    if (therapist.user_id) {
      const adminClient = createAdminClient()
      const { error: banError } = await adminClient.auth.admin.updateUserById(
        therapist.user_id,
        { ban_duration: '876000h' } // ~100 años, efectivamente indefinido
      )

      if (banError) {
        console.error('Error blocking auth user:', banError)
        // No revertimos el soft delete por esto, pero avisamos
        return NextResponse.json({
          success: true,
          warning: 'Terapeuta desactivado, pero no se pudo bloquear su acceso. Revisa manualmente.',
        })
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Terapeuta desactivado correctamente',
    })
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json(
      { error: 'Error inesperado del servidor' },
      { status: 500 }
    )
  }
}

// PATCH - Reactivar un terapeuta previamente desactivado
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createClient()

    const { data: therapist } = await supabase
      .from('therapists')
      .select('user_id, activo')
      .eq('id', id)
      .single()

    if (!therapist) {
      return NextResponse.json(
        { error: 'Terapeuta no encontrado' },
        { status: 404 }
      )
    }

    if (therapist.activo === true) {
      return NextResponse.json(
        { error: 'El terapeuta ya está activo' },
        { status: 400 }
      )
    }

    const { error: updateError } = await supabase
      .from('therapists')
      .update({
        activo: true,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)

    if (updateError) {
      console.error('Reactivate error:', updateError)
      return NextResponse.json(
        { error: 'Error al reactivar el terapeuta' },
        { status: 500 }
      )
    }

    // Restaurar el acceso del terapeuta en Supabase Auth
    if (therapist.user_id) {
      const adminClient = createAdminClient()
      const { error: unbanError } = await adminClient.auth.admin.updateUserById(
        therapist.user_id,
        { ban_duration: 'none' }
      )

      if (unbanError) {
        console.error('Error unblocking auth user:', unbanError)
        return NextResponse.json({
          success: true,
          warning: 'Terapeuta reactivado, pero no se pudo restaurar su acceso. Revisa manualmente.',
        })
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Terapeuta reactivado correctamente',
    })
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json(
      { error: 'Error inesperado del servidor' },
      { status: 500 }
    )
  }
}