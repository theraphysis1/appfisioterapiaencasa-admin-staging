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

    const dateToWithTime = `${date_to}T23:59:59.999Z`

    // 1. Buscar todas las citas con estado "agendada" en el rango de fechas
    const { data: appointments, error: fetchError } = await supabase
      .from('appointments')
      .select('id, fecha_hora, package_id, patient_id, service_id')
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

    // 2. Filtrar las citas que ya pasaron
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

    const continuation_alerts_creadas: string[] = []

    for (const packageId of packagesToUpdate) {
      const { data: packageData, error: pkgFetchError } = await supabase
        .from('packages')
        .select('sesiones_agendadas, sesiones_completadas, patient_id')
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

      // Verificar si el paquete se completó
      const { data: updatedPackage } = await supabase
        .from('packages')
        .select('total_sesiones, sesiones_completadas, estado, forma_pago, segundo_pago_completado')
        .eq('id', packageId)
        .single()

      // Un paquete fraccionado con segundo pago pendiente NO está realmente completado
      const esPaqueteFraccionadoPendiente =
        updatedPackage?.forma_pago === 'fraccionado' &&
        !updatedPackage?.segundo_pago_completado

      if (
        updatedPackage &&
        updatedPackage.sesiones_completadas === updatedPackage.total_sesiones &&
        updatedPackage.estado !== 'completado' &&
        !esPaqueteFraccionadoPendiente
      ){
        // Cambiar estado del paquete a completado
        const { error: statusError } = await supabase
          .from('packages')
          .update({ estado: 'completado' })
          .eq('id', packageId)

        if (statusError) {
          console.error(`Error updating package status for ${packageId}:`, statusError)
          continue
        }

        // Crear alerta de continuidad para paquete completado
        // El índice único en package_id previene duplicados automáticamente
        const { error: alertError } = await supabase
          .from('continuation_alerts')
          .insert({
            patient_id: packageData.patient_id,
            package_id: packageId,
            tipo_alerta: 'paquete_completado',
            total_sesiones: updatedPackage.total_sesiones,
            fecha_completado: new Date().toISOString()
          })

        if (alertError && alertError.code !== '23505') {
          // 23505 = unique violation, significa que ya existe la alerta, no es error real
          console.error(`Error creando alerta de continuidad para paquete ${packageId}:`, alertError)
        } else if (!alertError) {
          continuation_alerts_creadas.push(packageId)
          console.log(`✅ Alerta de continuidad creada para paquete ${packageId}`)
        }
      }
    }

    // 5. Detectar valoraciones completadas (citas sin package_id)
    const citasSinPaquete = appointmentsToComplete.filter(apt => !apt.package_id)

    if (citasSinPaquete.length > 0) {
      // Obtener los service_ids únicos de estas citas
      const serviceIds = [...new Set(citasSinPaquete.map(apt => apt.service_id))]

      // Buscar cuáles de esos servicios son de tipo 'valoracion'
      const { data: serviciosValoracion } = await supabase
        .from('services')
        .select('id')
        .in('id', serviceIds)
        .eq('tipo', 'valoracion')

      if (serviciosValoracion && serviciosValoracion.length > 0) {
        const valoracionServiceIds = new Set(serviciosValoracion.map(s => s.id))

        // Filtrar solo las citas que son valoraciones
        const citasValoracion = citasSinPaquete.filter(
          apt => valoracionServiceIds.has(apt.service_id)
        )

        for (const cita of citasValoracion) {
          // Crear alerta de continuidad para valoración completada
          // El índice único en appointment_id previene duplicados automáticamente
          const { error: alertError } = await supabase
            .from('continuation_alerts')
            .insert({
              patient_id: cita.patient_id,
              appointment_id: cita.id,
              tipo_alerta: 'valoracion_completada',
              total_sesiones: 1,
              fecha_completado: new Date().toISOString()
            })

          if (alertError && alertError.code !== '23505') {
            console.error(`Error creando alerta de valoración para cita ${cita.id}:`, alertError)
          } else if (!alertError) {
            continuation_alerts_creadas.push(cita.id)
            console.log(`✅ Alerta de continuidad creada para valoración ${cita.id}`)
          }
        }
      }
    }

    return NextResponse.json({
      message: `Se actualizaron ${appointmentsToComplete.length} cita${appointmentsToComplete.length !== 1 ? 's' : ''} a completada${appointmentsToComplete.length !== 1 ? 's' : ''}`,
      updated_count: appointmentsToComplete.length,
      continuation_alerts_creadas: continuation_alerts_creadas.length
    })

  } catch (error) {
    console.error('Error in bulk-complete:', error)
    return NextResponse.json(
      { error: 'Error al procesar la solicitud' },
      { status: 500 }
    )
  }
}