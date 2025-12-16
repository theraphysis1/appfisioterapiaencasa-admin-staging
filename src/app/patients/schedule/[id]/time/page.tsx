'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'

interface Therapist {
  id: string
  nombre: string
  apellido: string
  cedula: string
  email: string
  contacto: string
  placa_moto: string | null
}

export default function SelectTimePage() {
  const params = useParams()
  const router = useRouter()
  const searchParams = useSearchParams()
  
  const therapistId = params.id as string
  const dateParam = searchParams.get('date')

  const [therapist, setTherapist] = useState<Therapist | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [isPackageMode, setIsPackageMode] = useState(false)
  const [packageData, setPackageData] = useState<any>(null)
  const [editingSlot, setEditingSlot] = useState<string | null>(null)
  const [editedTime, setEditedTime] = useState<string>('')
  const [longPressTimer, setLongPressTimer] = useState<NodeJS.Timeout | null>(null)

  useEffect(() => {
    if (dateParam) {
      setSelectedDate(new Date(dateParam))
    }
    
    // Verificar si estamos en modo paquete
    const packageMode = sessionStorage.getItem('isSchedulingPackage') === 'true'
    setIsPackageMode(packageMode)
    
    if (packageMode) {
      const storedPackageData = sessionStorage.getItem('packageData')
      if (storedPackageData) {
        setPackageData(JSON.parse(storedPackageData))
      }
    }
    
    fetchTherapist()
  }, [therapistId, dateParam])

  const fetchTherapist = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/therapists')
      
      if (!response.ok) {
        throw new Error('Error al cargar terapeuta')
      }

      const data = await response.json()
      const foundTherapist = data.therapists.find((t: Therapist) => t.id === therapistId)
      
      if (!foundTherapist) {
        throw new Error('Terapeuta no encontrado')
      }

      setTherapist(foundTherapist)
    } catch (err) {
      console.error(err)
      router.push('/patients/create')
    } finally {
      setLoading(false)
    }
  }

  const generateTimeSlots = () => {
    const slots = []
    const startHour = 8 // 8:00 AM
    const endHour = 19 // 7:00 PM
    
    for (let hour = startHour; hour <= endHour; hour++) {
      // Añadir hora en punto
      if (hour < endHour || (hour === endHour && 0 === 0)) {
        slots.push({
          hour,
          minute: 0,
          display: formatTime(hour, 0)
        })
      }
      
      // Añadir media hora (excepto después de las 7:00 PM)
      if (hour < endHour) {
        slots.push({
          hour,
          minute: 30,
          display: formatTime(hour, 30)
        })
      }
    }
    
    return slots
  }

  const formatTime = (hour: number, minute: number) => {
    const period = hour >= 12 ? 'PM' : 'AM'
    const displayHour = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour
    const displayMinute = minute.toString().padStart(2, '0')
    return `${displayHour}:${displayMinute} ${period}`
  }

  const handleMouseDown = (slotKey: string, displayTime: string) => {
    const timer = setTimeout(() => {
      setEditingSlot(slotKey)
      setEditedTime(displayTime)
    }, 2000) // 2 segundos
    setLongPressTimer(timer)
  }

  const handleMouseUp = () => {
    if (longPressTimer) {
      clearTimeout(longPressTimer)
      setLongPressTimer(null)
    }
  }

  const handleMouseLeave = () => {
    if (longPressTimer) {
      clearTimeout(longPressTimer)
      setLongPressTimer(null)
    }
  }

  const handleTimeInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEditedTime(e.target.value)
  }

  const handleTimeInputBlur = () => {
    setEditingSlot(null)
  }

  const handleTimeInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, hour: number, minute: number) => {
    if (e.key === 'Enter') {
      // Parsear la hora editada y llamar a handleTimeSelect
      const timeMatch = editedTime.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i)
      if (timeMatch) {
        let newHour = parseInt(timeMatch[1])
        const newMinute = parseInt(timeMatch[2])
        const period = timeMatch[3].toUpperCase()
        
        // Convertir a formato 24 horas
        if (period === 'PM' && newHour !== 12) {
          newHour += 12
        } else if (period === 'AM' && newHour === 12) {
          newHour = 0
        }
        
        setEditingSlot(null)
        handleTimeSelect(newHour, newMinute)
      } else {
        // Si el formato no es válido, mantener la hora original
        setEditingSlot(null)
      }
    } else if (e.key === 'Escape') {
      setEditingSlot(null)
    }
  }

  const formatDate = (date: Date) => {
    const days = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado']
    const months = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre']
    
    return `${days[date.getDay()]}, ${date.getDate()} de ${months[date.getMonth()]} de ${date.getFullYear()}`
  }

  const handleTimeSelect = (hour: number, minute: number) => {
    if (!selectedDate) return
    
    const appointmentDate = new Date(selectedDate)
    appointmentDate.setHours(hour, minute, 0, 0)
    
    if (isPackageMode && packageData) {
      // Modo paquete: agregar cita directamente y volver a confirmación
      const selectedTherapist = JSON.parse(sessionStorage.getItem('selectedPackageTherapist') || '{}')
      const existingAppointments = JSON.parse(sessionStorage.getItem('packageAppointments') || '[]')
      
      const days = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado']
      const months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']
      
      const period = hour >= 12 ? 'PM' : 'AM'
      const displayHour = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour
      const displayMinute = minute.toString().padStart(2, '0')
      
      const newAppointment = {
        therapist_id: therapistId,
        therapist_name: `${selectedTherapist.nombre} ${selectedTherapist.apellido}`,
        fecha_hora: appointmentDate,
        displayDate: `${days[appointmentDate.getDay()]} ${appointmentDate.getDate()} ${months[appointmentDate.getMonth()]}`,
        displayTime: `${displayHour}:${displayMinute} ${period}`
      }
      
      existingAppointments.push(newAppointment)
      sessionStorage.setItem('packageAppointments', JSON.stringify(existingAppointments))
      
      // Volver a la página de confirmación
      router.push(`/patients/schedule/${therapistId}/confirm`)
    } else {
      // Modo normal: ir al formulario de paciente
      router.push(`/patients/schedule/${therapistId}/form?date=${appointmentDate.toISOString()}`)
    }
  }

  if (loading || !selectedDate) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-50 dark:bg-zinc-900">
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-purple-600 border-r-transparent"></div>
          <p className="mt-4 text-zinc-600 dark:text-zinc-400">Cargando...</p>
        </div>
      </div>
    )
  }

  if (!therapist) {
    return null
  }

  const timeSlots = generateTimeSlots()

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-900 py-12 px-6">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <Link
            href={`/patients/schedule/${therapistId}`}
            className="inline-flex items-center text-purple-600 hover:text-purple-700 dark:text-purple-400 dark:hover:text-purple-300 mb-4"
          >
            ← Volver al calendario
          </Link>
          <h1 className="text-3xl font-bold text-zinc-900 dark:text-zinc-50 mb-2">
            {isPackageMode ? 'Seleccionar Horario para Cita de Paquete' : 'Seleccionar Horario'}
          </h1>
          <p className="text-zinc-600 dark:text-zinc-400">
            Terapeuta: <span className="font-semibold">{therapist.nombre} {therapist.apellido}</span>
          </p>
          <p className="text-zinc-600 dark:text-zinc-400">
            Fecha: <span className="font-semibold">{formatDate(selectedDate)}</span>
          </p>
          {isPackageMode && packageData && (
            <p className="text-purple-600 dark:text-purple-400 mt-1 font-medium">
              📦 {packageData.service.nombre} - {packageData.patient.nombre} {packageData.patient.apellido}
            </p>
          )}
        </div>

        <div className="bg-white dark:bg-zinc-800 rounded-lg shadow-md p-6">
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50 mb-4">
            Horarios Disponibles
          </h2>
          
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {timeSlots.map((slot) => {
              const slotKey = `${slot.hour}-${slot.minute}`
              const isEditing = editingSlot === slotKey
              
              return isEditing ? (
                <input
                  key={slotKey}
                  type="text"
                  value={editedTime}
                  onChange={handleTimeInputChange}
                  onBlur={handleTimeInputBlur}
                  onKeyDown={(e) => handleTimeInputKeyDown(e, slot.hour, slot.minute)}
                  autoFocus
                  className="py-3 px-4 rounded-lg border-2 border-purple-500 text-zinc-900 dark:text-zinc-50 font-medium bg-white dark:bg-zinc-700 text-center focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              ) : (
                <button
                  key={slotKey}
                  onClick={() => handleTimeSelect(slot.hour, slot.minute)}
                  onMouseDown={() => handleMouseDown(slotKey, slot.display)}
                  onMouseUp={handleMouseUp}
                  onMouseLeave={handleMouseLeave}
                  onTouchStart={() => handleMouseDown(slotKey, slot.display)}
                  onTouchEnd={handleMouseUp}
                  className="py-3 px-4 rounded-lg border-2 border-zinc-200 dark:border-zinc-700 text-zinc-900 dark:text-zinc-50 font-medium hover:border-purple-500 hover:bg-purple-50 dark:hover:bg-purple-900/20 transition-all"
                >
                  {slot.display}
                </button>
              )
            })}
          </div>
        </div>

        <div className="mt-6 text-center text-sm text-zinc-600 dark:text-zinc-400">
          <p>Selecciona un horario para continuar con el registro del paciente</p>
        </div>
      </div>
    </div>
  )
}