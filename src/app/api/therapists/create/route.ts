import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { nombre, apellido, email, contacto, cedula, placa_moto, password } = body

    // Validar campos requeridos
    if (!nombre || !apellido || !email || !contacto || !cedula || !password) {
      return NextResponse.json(
        { error: 'Todos los campos marcados con * son requeridos' },
        { status: 400 }
      )
    }

    // Validar longitud de contraseña
    if (password.length < 6) {
      return NextResponse.json(
        { error: 'La contraseña debe tener al menos 6 caracteres' },
        { status: 400 }
      )
    }

    const supabase = createAdminClient()

    // Crear usuario en auth.users
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // Auto-confirmar el email
    })

    if (authError || !authData.user) {
      console.error('Auth error:', authError)
      return NextResponse.json(
        { error: authError?.message || 'Error al crear usuario de autenticación' },
        { status: 500 }
      )
    }

    // Crear registro en la tabla therapists
    const { data: therapistData, error: therapistError } = await supabase
      .from('therapists')
      .insert({
        user_id: authData.user.id,
        nombre,
        apellido,
        email,
        contacto,
        cedula,
        placa_moto: placa_moto || null,
      })
      .select()
      .single()

    if (therapistError) {
      console.error('Therapist creation error:', therapistError)
      
      // Si falla la creación del terapeuta, eliminar el usuario de auth
      await supabase.auth.admin.deleteUser(authData.user.id)
      
      return NextResponse.json(
        { error: therapistError.message || 'Error al crear el terapeuta' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      therapist: therapistData,
    })
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json(
      { error: 'Error inesperado del servidor' },
      { status: 500 }
    )
  }
}