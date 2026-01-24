'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'

interface Therapist {
  id: string
  nombre: string
  apellido: string
}

interface ScheduledAppointment {
  therapist_id: string
  therapist_name: string
  fecha_hora: Date
  displayDate: string
  displayTime: string
}

interface PackageData {
  patient: {
    id: string
    nombre: string
    apellido: string
    telefono: string
    direccion: string
    barrio: string
    referencia: string
    patologia: string
  }
  service: {
    id: string
    nombre: string
    tipo: string
    cantidad_sesiones: number
    valor_default: number
    comision_default: number
  }
  valor: number
  comision: number
  observacion: string | null
  // NUEVOS CAMPOS DE PAGOS
  tiene_valoracion_previa: boolean
  valoracion_cita_id: string | null
  valoracion_monto: number | null
  forma_pago: 'completo' | 'fraccionado'
  numero_pagos: number
  monto_primer_pago: number
  monto_segundo_pago: number
  sesiones_primer_pago: number
  sesiones_segundo_pago: number
  precio_calculado: {
    precio_original: number
    descuento_valoracion: number
    precio_final: number
    monto_primer_pago: number
    monto_segundo_pago: number
    sesiones_primer_pago: number
    sesiones_segundo_pago: number
  }
}

export default function ConfirmPackagePage() {
  const params = useParams()
  const router = useRouter()
  const therapistId = params.id as string

  const [packageData, setPackageData] = useState<PackageData | null>(null)
  const [scheduledAppointments, setScheduledAppointments] = useState<ScheduledAppointment[]>([])
  const [currentStep, setCurrentStep] = useState(0)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    // Verificar si estamos en modo "completar paquete"
    const isCompleting = sessionStorage.getItem('isCompletingPackage') === 'true'
    
    if (isCompleting) {
      // Modo completar: cargar datos completos del paquete
      const packageDataStr = sessionStorage.getItem('packageData')
      if (!packageDataStr) {
        alert('No se encontraron datos del paquete a completar')
        router.push('/home')
        return
      }
      
      const data = JSON.parse(packageDataStr)
      
      // Los datos ya vienen en el formato correcto desde packages/page.tsx
      setPackageData(data)
    } else {
      // Modo crear: cargar datos del paquete nuevo
      const storedData = sessionStorage.getItem('packageData')
      if (!storedData) {
        alert('No se encontraron datos del paquete')
        router.push('/home')
        return
      }

      const data = JSON.parse(storedData)
      setPackageData(data)
    }
    
    // Cargar citas ya agendadas
    const storedAppointments = sessionStorage.getItem('packageAppointments')
    if (storedAppointments) {
      const appointments = JSON.parse(storedAppointments)
      // Convertir las fechas de string a Date
      const parsedAppointments = appointments.map((apt: any) => ({
        ...apt,
        fecha_hora: new Date(apt.fecha_hora)
      }))
      setScheduledAppointments(parsedAppointments)
      setCurrentStep(parsedAppointments.length)
    }
    
    // Limpiar flag de modo paquete cuando se carga la página
    sessionStorage.removeItem('isSchedulingPackage')
  }, [])

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0
    }).format(value)
  }

  const handleAddAppointment = (therapist: Therapist, fecha: Date) => {
    const days = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado']
    const months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']
    
    const hours = fecha.getHours()
    const minutes = fecha.getMinutes()
    const period = hours >= 12 ? 'PM' : 'AM'
    const displayHour = hours > 12 ? hours - 12 : hours === 0 ? 12 : hours
    const displayMinute = minutes.toString().padStart(2, '0')

    const newAppointment: ScheduledAppointment = {
      therapist_id: therapist.id,
      therapist_name: `${therapist.nombre} ${therapist.apellido}`,
      fecha_hora: fecha,
      displayDate: `${days[fecha.getDay()]} ${fecha.getDate()} ${months[fecha.getMonth()]}`,
      displayTime: `${displayHour}:${displayMinute} ${period}`
    }

    setScheduledAppointments([...scheduledAppointments, newAppointment])
    setCurrentStep(currentStep + 1)
  }

  const handleRemoveAppointment = (index: number) => {
    const newAppointments = scheduledAppointments.filter((_, i) => i !== index)
    setScheduledAppointments(newAppointments)
    setCurrentStep(newAppointments.length)
    
    // Actualizar en sessionStorage
    sessionStorage.setItem('packageAppointments', JSON.stringify(newAppointments))
  }

  const handleEditAppointment = (index: number) => {
    // Guardar las citas actuales excepto la que se va a editar
    const newAppointments = scheduledAppointments.filter((_, i) => i !== index)
    setScheduledAppointments(newAppointments)
    sessionStorage.setItem('packageAppointments', JSON.stringify(newAppointments))
    setCurrentStep(newAppointments.length)
    
    // Activar modo paquete y redirigir
    sessionStorage.setItem('isSchedulingPackage', 'true')
    // Guardar que venimos desde confirmación
    sessionStorage.setItem('packageConfirmTherapistId', therapistId)
    router.push('/patients/create')
  }

  const handleScheduleNextAppointment = () => {
    // Guardar estado de que estamos en modo paquete
    sessionStorage.setItem('isSchedulingPackage', 'true')
    sessionStorage.setItem('packageAppointments', JSON.stringify(scheduledAppointments))
    // Guardar que venimos desde confirmación para navegación correcta
    sessionStorage.setItem('packageConfirmTherapistId', therapistId)
    
    // Redirigir a selección de terapeuta para la siguiente cita
    router.push('/patients/create')
  }

  const handleConfirmPackage = async () => {
    if (!packageData) return

    // Verificar si estamos en modo "completar paquete"
    const isCompleting = sessionStorage.getItem('isCompletingPackage') === 'true'
    const completeData = isCompleting ? JSON.parse(sessionStorage.getItem('completePackageData') || '{}') : null

    // ✅ Validar según forma de pago
    const sesiones_minimas = packageData.forma_pago === 'fraccionado'
      ? packageData.sesiones_primer_pago
      : packageData.tiene_valoracion_previa 
        ? packageData.service.cantidad_sesiones - 1 
        : packageData.service.cantidad_sesiones

    if (scheduledAppointments.length < sesiones_minimas) {
      const mensaje = isCompleting
        ? `Debes agendar las ${sesiones_minimas} sesiones restantes para completar el paquete`
        : packageData.forma_pago === 'fraccionado'
          ? `Debes agendar las ${sesiones_minimas} citas del primer pago para continuar`
          : `Debes agendar ${sesiones_minimas} citas${packageData.tiene_valoracion_previa ? ' nuevas (la valoración ya cuenta como sesión #1)' : ''} para completar el paquete`
      
      alert(mensaje)
      return
    }

    setSubmitting(true)

    try {
      if (isCompleting && completeData) {
        // MODO COMPLETAR: Crear solo citas nuevas para paquete existente
        const appointmentsToCreate = scheduledAppointments.map(apt => ({
          patient_id: packageData.patient.id,
          therapist_id: apt.therapist_id,
          service_id: packageData.service.id,
          package_id: completeData.package_id,
          fecha_hora: apt.fecha_hora.toISOString(),
          patologia: packageData.patient.patologia || 'N/A',
          valor: packageData.valor,
          comision: packageData.comision,
          observacion: packageData.observacion,
          estado: 'agendada'
        }))

        // Crear las citas una por una
        // ✅ Cada POST incrementa automáticamente sesiones_agendadas en el paquete
        for (const appointment of appointmentsToCreate) {
          const response = await fetch('/api/appointments', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify(appointment)
          })

          if (!response.ok) {
            const errorData = await response.json()
            throw new Error(errorData.error || 'Error al crear una de las citas')
          }
        }

        console.log(`✅ ${scheduledAppointments.length} citas creadas exitosamente`)

        // ✅ Recalcular contadores del paquete para sincronizar
        const recalcResponse = await fetch(`/api/packages/${completeData.package_id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            recalcular_contadores: true
          })
        })

        if (!recalcResponse.ok) {
          console.error('⚠️ Error recalculando contadores (no crítico)')
        } else {
          console.log('✅ Contadores del paquete recalculados automáticamente')
        }

        // Limpiar sessionStorage
        sessionStorage.removeItem('completePackageData')
        sessionStorage.removeItem('isCompletingPackage')
        sessionStorage.removeItem('packageAppointments')
        sessionStorage.removeItem('isSchedulingPackage')
        sessionStorage.removeItem('selectedPackageTherapist')
        sessionStorage.removeItem('packageConfirmTherapistId')

        alert(`✅ Sesiones completadas exitosamente!\n\n${scheduledAppointments.length} citas agendadas para ${packageData.patient.nombre} ${packageData.patient.apellido}`)
        
        router.push('/packages')
      } else {
        // MODO CREAR: Crear paquete nuevo con todas las citas
        const response = await fetch('/api/appointments/bulk', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            patient_id: packageData.patient.id,
            service_id: packageData.service.id,
            patologia: packageData.patient.patologia,
            observacion: packageData.observacion,
            appointments: scheduledAppointments.map(apt => ({
              therapist_id: apt.therapist_id,
              fecha_hora: apt.fecha_hora.toISOString(),
              valor: packageData.valor,
              comision: packageData.comision
            })),
            // ✅ NUEVOS 13 CAMPOS DE PAGOS FRACCIONADOS
            tiene_valoracion_previa: packageData.tiene_valoracion_previa || false,
            valoracion_cita_id: packageData.valoracion_cita_id || null,
            valoracion_monto: packageData.valoracion_monto || null,
            forma_pago: packageData.forma_pago || 'completo',
            numero_pagos: packageData.numero_pagos || 1,
            monto_primer_pago: packageData.monto_primer_pago,
            monto_segundo_pago: packageData.monto_segundo_pago || null,
            sesiones_primer_pago: packageData.sesiones_primer_pago,
            sesiones_segundo_pago: packageData.sesiones_segundo_pago || null
          })
        })

        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(errorData.error || 'Error al crear el paquete')
        }

        // Limpiar TODO el sessionStorage relacionado con paquetes
        sessionStorage.removeItem('packageData')
        sessionStorage.removeItem('packageAppointments')
        sessionStorage.removeItem('isSchedulingPackage')
        sessionStorage.removeItem('selectedPackageTherapist')
        sessionStorage.removeItem('packageConfirmTherapistId')

        alert(`✅ Paquete agendado exitosamente!\n\n${packageData.service.nombre} completado\n${scheduledAppointments.length} citas agendadas`)
        
        router.push('/home')
      }
    } catch (error: any) {
      console.error('Error:', error)
      alert(error.message || 'Error al confirmar')
    } finally {
      setSubmitting(false)
    }
  }

  if (!packageData) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-50 dark:bg-zinc-900">
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-purple-600 border-r-transparent"></div>
          <p className="mt-4 text-zinc-600 dark:text-zinc-400">Cargando...</p>
        </div>
      </div>
    )
  }

  const totalValue = packageData.valor * packageData.service.cantidad_sesiones
  const totalCommission = packageData.comision * packageData.service.cantidad_sesiones
  
  // ✅ Detectar si estamos completando un paquete
const isCompletingPackage = sessionStorage.getItem('isCompletingPackage') === 'true'

const sesiones_a_agendar = packageData.forma_pago === 'fraccionado'
  ? (isCompletingPackage 
      ? packageData.sesiones_segundo_pago // ✅ En modo completar: sesiones del segundo pago
      : packageData.sesiones_primer_pago) // En modo crear: sesiones del primer pago
  : packageData.tiene_valoracion_previa 
    ? packageData.service.cantidad_sesiones - 1 
    : packageData.service.cantidad_sesiones
  
  const isComplete = scheduledAppointments.length === sesiones_a_agendar

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-900 py-12 px-6">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <Link
            href="/home"
            onClick={() => {
              // Limpiar TODO el sessionStorage al cancelar
              sessionStorage.removeItem('packageData')
              sessionStorage.removeItem('packageAppointments')
              sessionStorage.removeItem('isSchedulingPackage')
              sessionStorage.removeItem('selectedPackageTherapist')
              sessionStorage.removeItem('packageConfirmTherapistId')
            }}
            className="inline-flex items-center text-purple-600 hover:text-purple-700 dark:text-purple-400 dark:hover:text-purple-300 mb-4"
          >
            ← Cancelar y volver al inicio
          </Link>
          <h1 className="text-3xl font-bold text-zinc-900 dark:text-zinc-50 mb-2">
            {sessionStorage.getItem('isCompletingPackage') === 'true' 
              ? `Completar ${packageData.service.nombre}`
              : `Confirmación de ${packageData.service.nombre}`
            }
          </h1>
          <p className="text-zinc-600 dark:text-zinc-400">
            {sessionStorage.getItem('isCompletingPackage') === 'true'
              ? `Agenda las ${sesiones_a_agendar} sesiones restantes del segundo pago`
              : packageData.forma_pago === 'fraccionado'
                ? `Agenda las ${sesiones_a_agendar} citas del primer pago${packageData.tiene_valoracion_previa ? ' (valoración ya completada)' : ''}`
                : packageData.tiene_valoracion_previa 
                  ? `Agenda las ${sesiones_a_agendar} citas restantes del paquete (valoración ya completada)`
                  : `Agenda las ${packageData.service.cantidad_sesiones} citas del paquete`
            }
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Información del paciente y resumen */}
          <div className="lg:col-span-1 space-y-6">
            <div className="bg-white dark:bg-zinc-800 rounded-lg shadow-md p-6">
              <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50 mb-4">
                📋 Información del Paquete
              </h2>
              
              <div className="space-y-3 text-sm">
                <div>
                  <p className="text-zinc-600 dark:text-zinc-400">Paciente</p>
                  <p className="font-semibold text-zinc-900 dark:text-zinc-50">
                    {packageData.patient.nombre} {packageData.patient.apellido}
                  </p>
                </div>
                
                <div>
                  <p className="text-zinc-600 dark:text-zinc-400">Teléfono</p>
                  <p className="font-semibold text-zinc-900 dark:text-zinc-50">
                    {packageData.patient.telefono}
                  </p>
                </div>
                
                <div>
                  <p className="text-zinc-600 dark:text-zinc-400">Servicio</p>
                  <p className="font-semibold text-zinc-900 dark:text-zinc-50">
                    {packageData.service.nombre}
                  </p>
                </div>
                
                <div>
                  <p className="text-zinc-600 dark:text-zinc-400">Patología</p>
                  <p className="font-semibold text-zinc-900 dark:text-zinc-50">
                    {packageData.patient.patologia}
                  </p>
                </div>
                
                {/* Información de Valoración Previa */}
                {packageData.tiene_valoracion_previa && (
                  <div className="pt-3 border-t border-zinc-200 dark:border-zinc-700">
                    <div className="p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                      <p className="text-xs font-semibold text-green-900 dark:text-green-100 mb-1">
                        ✅ Valoración Previa Incluida
                      </p>
                      <p className="text-sm text-green-800 dark:text-green-200">
                        Monto: {formatCurrency(packageData.valoracion_monto || 0)}
                      </p>
                    </div>
                  </div>
                )}

                <div className="pt-3 border-t border-zinc-200 dark:border-zinc-700">
                  <p className="text-zinc-600 dark:text-zinc-400">Precio Original</p>
                  <p className="text-base font-semibold text-zinc-700 dark:text-zinc-300">
                    {formatCurrency(packageData.precio_calculado.precio_original)}
                  </p>
                  
                  {packageData.precio_calculado.descuento_valoracion > 0 && (
                    <>
                      <p className="text-zinc-600 dark:text-zinc-400 mt-2">Descuento Valoración</p>
                      <p className="text-base font-semibold text-green-600 dark:text-green-400">
                        -{formatCurrency(packageData.precio_calculado.descuento_valoracion)}
                      </p>
                    </>
                  )}
                  
                  <p className="text-zinc-600 dark:text-zinc-400 mt-2">Precio Final</p>
                  <p className="text-lg font-bold text-purple-600 dark:text-purple-400">
                    {formatCurrency(packageData.precio_calculado.precio_final)}
                  </p>
                </div>

                {/* Información de Forma de Pago */}
                <div className="pt-3 border-t border-zinc-200 dark:border-zinc-700">
                  <p className="text-zinc-600 dark:text-zinc-400 mb-2">Forma de Pago</p>
                  {packageData.forma_pago === 'completo' ? (
                    <div className="p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                      <p className="text-sm font-semibold text-blue-900 dark:text-blue-100">
                        💰 Pago Completo
                      </p>
                      <p className="text-xs text-blue-800 dark:text-blue-200 mt-1">
                        {packageData.service.cantidad_sesiones} sesiones
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <div className="p-3 bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-lg">
                        <p className="text-sm font-semibold text-purple-900 dark:text-purple-100">
                          📊 Pago Fraccionado (2 pagos)
                        </p>
                      </div>
                      <div className="p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                        <p className="text-xs text-blue-800 dark:text-blue-200">
                          <span className="font-semibold">Primer pago:</span> {formatCurrency(packageData.monto_primer_pago)}
                        </p>
                        <p className="text-xs text-blue-700 dark:text-blue-300">
                          {packageData.tiene_valoracion_previa 
                            ? `(${packageData.precio_calculado.sesiones_primer_pago} sesiones nuevas + 1 valoración)`
                            : `(${packageData.precio_calculado.sesiones_primer_pago} sesiones)`
                          }
                        </p>
                      </div>
                      <div className="p-2 bg-orange-50 dark:bg-orange-900/20 rounded-lg">
                        <p className="text-xs text-orange-800 dark:text-orange-200">
                          <span className="font-semibold">Segundo pago:</span> {formatCurrency(packageData.monto_segundo_pago)}
                        </p>
                        <p className="text-xs text-orange-700 dark:text-orange-300">
                          ({packageData.precio_calculado.sesiones_segundo_pago} sesiones nuevas)
                        </p>
                      </div>
                    </div>
                  )}
                </div>
                
                <div className="pt-3 border-t border-zinc-200 dark:border-zinc-700">
                  <p className="text-zinc-600 dark:text-zinc-400">Comisión total</p>
                  <p className="text-lg font-bold text-blue-600 dark:text-blue-400">
                    {formatCurrency(totalCommission)}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-lg p-4">
              <h3 className="text-sm font-semibold text-purple-900 dark:text-purple-100 mb-2">
                📌 Progreso
              </h3>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-purple-800 dark:text-purple-200">Citas agendadas</span>
                  <span className="font-bold text-purple-900 dark:text-purple-100">
                    {scheduledAppointments.length} / {sesiones_a_agendar}
                    {packageData.tiene_valoracion_previa && (
                      <span className="text-xs ml-1">(+ 1 valoración)</span>
                    )}
                  </span>
                </div>
                <div className="w-full bg-purple-200 dark:bg-purple-800 rounded-full h-2">
                  <div 
                    className="bg-purple-600 dark:bg-purple-400 h-2 rounded-full transition-all"
                    style={{ width: `${(scheduledAppointments.length / sesiones_a_agendar) * 100}%` }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Lista de citas agendadas */}
          <div className="lg:col-span-2">
            <div className="bg-white dark:bg-zinc-800 rounded-lg shadow-md p-6">
              <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50 mb-4">
                Citas Agendadas
              </h2>

              {/* Mostrar valoración si existe */}
              {packageData.tiene_valoracion_previa && (
                <div className="mb-4 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <div className="w-10 h-10 rounded-full bg-green-600 text-white flex items-center justify-center font-bold">
                        ✓
                      </div>
                      <div>
                        <p className="font-semibold text-green-900 dark:text-green-100">
                          Valoración Previa Completada
                        </p>
                        <p className="text-sm text-green-800 dark:text-green-200">
                          Sesión #1 del paquete • {formatCurrency(packageData.valoracion_monto || 0)}
                        </p>
                      </div>
                    </div>
                    <span className="px-3 py-1 rounded-full text-xs font-semibold bg-green-200 text-green-800 dark:bg-green-800 dark:text-green-200">
                      COMPLETADA
                    </span>
                  </div>
                </div>
              )}

              {scheduledAppointments.length === 0 ? (
                <div className="text-center py-12 text-zinc-500 dark:text-zinc-400">
                  <p className="text-4xl mb-4">📅</p>
                  <p>Aún no has agendado {packageData.tiene_valoracion_previa ? 'las citas restantes' : 'ninguna cita'}</p>
                  <p className="text-sm mt-2">Haz clic en "Agendar {packageData.tiene_valoracion_previa ? 'Primera Cita Restante' : 'Primera Cita'}" para comenzar</p>
                </div>
              ) : (
                <div className="space-y-3 mb-6">
                  {scheduledAppointments.map((apt, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-4 border border-zinc-200 dark:border-zinc-700 rounded-lg"
                    >
                      <div className="flex items-center space-x-4">
                        <div className="w-10 h-10 rounded-full bg-purple-600 text-white flex items-center justify-center font-bold">
                          {index + 1}
                        </div>
                        <div>
                          <p className="font-semibold text-zinc-900 dark:text-zinc-50">
                            {apt.therapist_name}
                          </p>
                          <p className="text-sm text-zinc-600 dark:text-zinc-400">
                            {apt.displayDate} - {apt.displayTime}
                          </p>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleEditAppointment(index)}
                          className="text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 text-sm"
                          title="Editar cita"
                        >
                          ✏️
                        </button>
                        <button
                          onClick={() => handleRemoveAppointment(index)}
                          className="text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
                          title="Eliminar cita"
                        >
                          ✕
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div className="flex flex-col sm:flex-row gap-4">
                {!isComplete && (
                  <button
                    onClick={handleScheduleNextAppointment}
                    className="flex-1 px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-medium"
                  >
                    + Agendar {scheduledAppointments.length === 0 ? 'Primera' : 'Siguiente'} Cita ({scheduledAppointments.length + 1} de {sesiones_a_agendar})
                  </button>
                )}
                
                {isComplete && (
                  <button
                    onClick={handleConfirmPackage}
                    disabled={submitting}
                    className="flex-1 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-zinc-400 disabled:cursor-not-allowed transition-colors font-medium"
                  >
                    {submitting 
                      ? 'Procesando...' 
                      : sessionStorage.getItem('isCompletingPackage') === 'true'
                        ? '✓ Completar Paquete'
                        : '✓ Confirmar Paquete Completo'
                    }
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}