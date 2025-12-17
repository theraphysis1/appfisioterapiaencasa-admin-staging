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
    // Cargar datos del paquete desde sessionStorage
    const storedData = sessionStorage.getItem('packageData')
    if (!storedData) {
      alert('No se encontraron datos del paquete')
      router.push('/home')
      return
    }

    const data = JSON.parse(storedData)
    setPackageData(data)
    
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

    if (scheduledAppointments.length < packageData.service.cantidad_sesiones) {
      alert(`Debes agendar ${packageData.service.cantidad_sesiones} citas para completar el paquete`)
      return
    }

    setSubmitting(true)

    try {
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
          }))
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
    } catch (error: any) {
      console.error('Error:', error)
      alert(error.message || 'Error al confirmar el paquete')
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
  const isComplete = scheduledAppointments.length === packageData.service.cantidad_sesiones

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
            Confirmación de {packageData.service.nombre}
          </h1>
          <p className="text-zinc-600 dark:text-zinc-400">
            Agenda las {packageData.service.cantidad_sesiones} citas del paquete
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
                
                <div className="pt-3 border-t border-zinc-200 dark:border-zinc-700">
                  <p className="text-zinc-600 dark:text-zinc-400">Valor total</p>
                  <p className="text-lg font-bold text-green-600 dark:text-green-400">
                    {formatCurrency(totalValue)}
                  </p>
                </div>
                
                <div>
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
                    {scheduledAppointments.length} / {packageData.service.cantidad_sesiones}
                  </span>
                </div>
                <div className="w-full bg-purple-200 dark:bg-purple-800 rounded-full h-2">
                  <div 
                    className="bg-purple-600 dark:bg-purple-400 h-2 rounded-full transition-all"
                    style={{ width: `${(scheduledAppointments.length / packageData.service.cantidad_sesiones) * 100}%` }}
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

              {scheduledAppointments.length === 0 ? (
                <div className="text-center py-12 text-zinc-500 dark:text-zinc-400">
                  <p className="text-4xl mb-4">📅</p>
                  <p>Aún no has agendado ninguna cita</p>
                  <p className="text-sm mt-2">Haz clic en "Agendar Siguiente Cita" para comenzar</p>
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
                    + Agendar {scheduledAppointments.length === 0 ? 'Primera' : 'Siguiente'} Cita ({scheduledAppointments.length + 1} de {packageData.service.cantidad_sesiones})
                  </button>
                )}
                
                {isComplete && (
                  <button
                    onClick={handleConfirmPackage}
                    disabled={submitting}
                    className="flex-1 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-zinc-400 disabled:cursor-not-allowed transition-colors font-medium"
                  >
                    {submitting ? 'Confirmando...' : '✓ Confirmar Paquete Completo'}
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