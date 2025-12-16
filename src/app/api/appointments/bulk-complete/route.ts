import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: Request) {
  try {
    const { date_from, date_to } = await request.json()

    if (!date_from || !date_to) {
      return NextResponse.json(
        { error: 'Se requieren las fechas desde y hasta' },
        { status: 400 }
      )
    }

    const supabase = await createClient()

    // Agregar hora al final del día para incluir todo el día final
    const dateToWithTime = `${date_to}T23:59:59.999Z`

    // 1. Buscar todas las citas con estado "agendada" en el rango de fechas
    const { data: appointments, error: fetchError } = await supabase
      .from('appointments')
      .select('id, fecha_hora, package_id')
      .eq('estado', 'agendada')
      .gte('fecha_hora', date_from)
      .lte('fecha_hora', dateToWithTime)

    if (fetchError) {
      console.error('Error fetching appointments:', fetchError)
      return NextResponse.json(
        { error: 'Error al buscar citas' },
        { status: 500 }
      )
    }

    if (!appointments || appointments.length === 0) {
      return NextResponse.json({
        message: 'No hay citas agendadas en este rango de fechas',
        updated_count: 0
      })
    }

    // 2. Filtrar las citas que ya pasaron (comparar con hora actual)
    const now = new Date()
    const appointmentsToComplete = appointments.filter(apt => {
      const aptDate = new Date(apt.fecha_hora)
      return aptDate < now
    })

    if (appointmentsToComplete.length === 0) {
      return NextResponse.json({
        message: 'No hay citas que hayan pasado su horario',
        updated_count: 0
      })
    }

    // 3. Actualizar las citas a estado "completada"
    const appointmentIds = appointmentsToComplete.map(apt => apt.id)

    const { error: updateError } = await supabase
      .from('appointments')
      .update({ 
        estado: 'completada',
        updated_at: new Date().toISOString()
      })
      .in('id', appointmentIds)

    if (updateError) {
      console.error('Error updating appointments:', updateError)
      return NextResponse.json(
        { error: 'Error al actualizar citas' },
        { status: 500 }
      )
    }

    // 4. Actualizar contadores de paquetes si aplica
    const packagesToUpdate = new Set<string>()
    appointmentsToComplete.forEach(apt => {
      if (apt.package_id) {
        packagesToUpdate.add(apt.package_id)
      }
    })

    // Actualizar cada paquete
    for (const packageId of packagesToUpdate) {
      const { data: packageData, error: pkgFetchError } = await supabase
        .from('packages')
        .select('sesiones_agendadas, sesiones_completadas')
        .eq('id', packageId)
        .single()

      if (pkgFetchError || !packageData) continue

      const countInPackage = appointmentsToComplete.filter(
        apt => apt.package_id === packageId
      ).length

      const { error: pkgUpdateError } = await supabase
        .from('packages')
        .update({
          sesiones_agendadas: packageData.sesiones_agendadas - countInPackage,
          sesiones_completadas: packageData.sesiones_completadas + countInPackage
        })
        .eq('id', packageId)

      if (pkgUpdateError) {
        console.error(`Error updating package ${packageId}:`, pkgUpdateError)
      }
    }

    return NextResponse.json({
      message: `Se actualizaron ${appointmentsToComplete.length} cita${appointmentsToComplete.length !== 1 ? 's' : ''} a completada${appointmentsToComplete.length !== 1 ? 's' : ''}`,
      updated_count: appointmentsToComplete.length
    })

  } catch (error) {
    console.error('Error in bulk-complete:', error)
    return NextResponse.json(
      { error: 'Error al procesar la solicitud' },
      { status: 500 }
    )
  }
}