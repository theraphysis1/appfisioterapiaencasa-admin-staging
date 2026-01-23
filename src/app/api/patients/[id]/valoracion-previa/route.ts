import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// GET - Verificar si el paciente tiene valoración previa
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient()
    const { id } = await params

    // Buscar citas del paciente donde:
    // - service.tipo = 'valoracion'
    // - estado = 'completada'
    // - package_id IS NULL (no está vinculada a ningún paquete)
    const { data: appointments, error } = await supabase
      .from('appointments')
      .select(`
        id,
        fecha_hora,
        valor,
        comision,
        estado,
        package_id,
        therapist:therapists!inner(id, nombre, apellido),
        service:services!inner(id, nombre, tipo)
      `)
      .eq('patient_id', id)
      .eq('estado', 'completada')
      .is('package_id', null)

    if (error) {
      console.error('Error fetching appointments:', error)
      return NextResponse.json(
        { error: 'Error al buscar valoraciones previas' },
        { status: 500 }
      )
    }

    // Filtrar solo valoraciones con casting de tipos
    const valoraciones = appointments?.filter(
      (apt: any) => apt.service?.tipo === 'valoracion'
    ) || []

    if (valoraciones.length === 0) {
      return NextResponse.json({
        tiene_valoracion: false,
        cita_id: null,
        fecha: null,
        monto: null,
        terapeuta: null
      })
    }

    // Retornar la valoración más reciente
    const valoracionReciente = valoraciones.sort(
      (a: any, b: any) => new Date(b.fecha_hora).getTime() - new Date(a.fecha_hora).getTime()
    )[0] as any

    return NextResponse.json({
      tiene_valoracion: true,
      cita_id: valoracionReciente.id,
      fecha: valoracionReciente.fecha_hora,
      monto: valoracionReciente.valor,
      terapeuta: valoracionReciente.therapist
        ? `${valoracionReciente.therapist.nombre} ${valoracionReciente.therapist.apellido}`
        : 'No especificado'
    })

  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json(
      { error: 'Error inesperado del servidor' },
      { status: 500 }
    )
  }
}