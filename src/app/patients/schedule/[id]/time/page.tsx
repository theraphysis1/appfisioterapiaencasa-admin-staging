'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'

interface TimeSlot {
  hour: number
  minute: number
  display: string
  isOccupied: boolean
  isCancelled: boolean
  appointment: Appointment | null
}

interface Appointment {
  id: string
  patient_id: string
  therapist_id: string
  service_id: string
  package_id: string | null
  fecha_hora: string
  patologia: string
  valor: number
  comision: number
  observacion: string | null
  estado: string
  created_at: string
  updated_at: string
  patient: {
    id: string
    nombre: string
    apellido: string
    telefono: string
    direccion: string
    barrio: string
  }
  service: {
    id: string
    nombre: string
    tipo: string
  }
  package: any
}

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
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null)
  const [showAppointmentModal, setShowAppointmentModal] = useState(false)
  const [isEditMode, setIsEditMode] = useState(false)
  const [editingAppointmentId, setEditingAppointmentId] = useState<string | null>(null)

  useEffect(() => {
    if (dateParam) {
      // Parsear la fecha en formato local sin conversión UTC
      const [year, month, day] = dateParam.split('T')[0].split('-').map(Number)
      const localDate = new Date(year, month - 1, day)
      setSelectedDate(localDate)
    }
    
    // Verificar si estamos en modo edición
    const editMode = sessionStorage.getItem('returnToEdit') === 'true'
    setIsEditMode(editMode)
    
    if (editMode) {
      const appointmentId = sessionStorage.getItem('editingAppointmentId')
      setEditingAppointmentId(appointmentId)
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

  useEffect(() => {
    if (selectedDate) {
      fetchAppointments()
    }
  }, [selectedDate, therapistId])

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

  const fetchAppointments = async () => {
    if (!selectedDate) return
    
    try {
      // Crear fecha en zona horaria local (Colombia)
      const year = selectedDate.getFullYear()
      const month = String(selectedDate.getMonth() + 1).padStart(2, '0')
      const day = String(selectedDate.getDate()).padStart(2, '0')
      const dateStr = `${year}-${month}-${day}`
      const response = await fetch(`/api/appointments?therapist_id=${therapistId}&fecha=${dateStr}`)
      
      if (!response.ok) {
        throw new Error('Error al cargar citas')
      }

      const data = await response.json()
      setAppointments(data.appointments || [])
    } catch (err) {
      console.error('Error fetching appointments:', err)
      setAppointments([])
    }
  }

  const generateTimeSlots = (): TimeSlot[] => {
    const slots: TimeSlot[] = []
    const startHour = 8 // 8:00 AM
    const endHour = 19 // 7:00 PM
    
    // Generar horarios predefinidos
    for (let hour = startHour; hour <= endHour; hour++) {
      // Añadir hora en punto
      if (hour < endHour || (hour === endHour && 0 === 0)) {
        slots.push({
          hour,
          minute: 0,
          display: formatTime(hour, 0),
          isOccupied: false,
          isCancelled: false,
          appointment: null
        })
      }
      
      // Añadir media hora (excepto después de las 7:00 PM)
      if (hour < endHour) {
        slots.push({
          hour,
          minute: 30,
          display: formatTime(hour, 30),
          isOccupied: false,
          isCancelled: false,
          appointment: null
        })
      }
    }
    
    // Agregar horarios de citas existentes que no estén en el grid
    appointments.forEach(appointment => {
      const appointmentDate = new Date(appointment.fecha_hora)
      const hour = appointmentDate.getHours()
      const minute = appointmentDate.getMinutes()
      
      // Buscar si ya existe este horario en el grid
      const existingSlot = slots.find(s => s.hour === hour && s.minute === minute)
      
      if (existingSlot) {
        const isCancelled = appointment.estado === 'cancelada'
        // Marcar como ocupado solo si NO está cancelada
        existingSlot.isOccupied = !isCancelled
        existingSlot.isCancelled = isCancelled
        existingSlot.appointment = appointment
      } else {
        const isCancelled = appointment.estado === 'cancelada'
        // Agregar nuevo horario personalizado
        slots.push({
          hour,
          minute,
          display: formatTime(hour, minute),
          isOccupied: !isCancelled,
          isCancelled: isCancelled,
          appointment
        })
      }
    })
    
    // Ordenar todos los horarios cronológicamente
    return slots.sort((a, b) => {
      if (a.hour !== b.hour) return a.hour - b.hour
      return a.minute - b.minute
    })
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

  const handleOccupiedSlotClick = (appointment: Appointment) => {
    setSelectedAppointment(appointment)
    setShowAppointmentModal(true)
  }

  const closeModal = () => {
    setShowAppointmentModal(false)
    setSelectedAppointment(null)
  }

  const formatDate = (date: Date) => {
    const days = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado']
    const months = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre']
    
    return `${days[date.getDay()]}, ${date.getDate()} de ${months[date.getMonth()]} de ${date.getFullYear()}`
  }

  const handleTimeSelect = (hour: number, minute: number) => {
    if (!selectedDate) return
    
    // Crear fecha en zona horaria local (Colombia) sin conversión UTC
    const year = selectedDate.getFullYear()
    const month = selectedDate.getMonth()
    const day = selectedDate.getDate()
    const appointmentDate = new Date(year, month, day, hour, minute, 0, 0)
    
    if (isEditMode && editingAppointmentId) {
      // Modo edición: guardar nueva fecha/hora y regresar a edición
      // Guardar en formato más explícito para evitar problemas de zona horaria
      const editedData = {
        year: year,
        month: month,
        day: day,
        hour: hour,
        minute: minute,
        isoString: appointmentDate.toISOString()
      }
      sessionStorage.setItem('editedDateTime', JSON.stringify(editedData))
      router.push(`/appointments/${editingAppointmentId}/edit`)
    } else if (isPackageMode && packageData) {
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
            {isEditMode ? 'Seleccionar Nuevo Horario para Cita' : isPackageMode ? 'Seleccionar Horario para Cita de Paquete' : 'Seleccionar Horario'}
          </h1>
          <p className="text-zinc-600 dark:text-zinc-400">
            Terapeuta: <span className="font-semibold">{therapist.nombre} {therapist.apellido}</span>
          </p>
          <p className="text-zinc-600 dark:text-zinc-400">
            Fecha: <span className="font-semibold">{formatDate(selectedDate)}</span>
          </p>
          {isEditMode && (
            <div className="mt-2 px-4 py-2 bg-blue-100 dark:bg-blue-900/30 border border-blue-300 dark:border-blue-700 rounded-lg">
              <p className="text-blue-800 dark:text-blue-200 font-medium">
                📝 Editando cita - Selecciona un nuevo horario
              </p>
            </div>
          )}
          {isPackageMode && packageData && !isEditMode && (
            <p className="text-purple-600 dark:text-purple-400 mt-1 font-medium">
              📦 {packageData.service.nombre} - {packageData.patient.nombre} {packageData.patient.apellido}
            </p>
          )}
        </div>

        <div className="bg-white dark:bg-zinc-800 rounded-lg shadow-md p-6">
          {/* Mini-lista de citas del día */}
          {appointments.filter(apt => apt.estado !== 'cancelada').length > 0 && (
            <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
              <h3 className="text-sm font-semibold text-blue-900 dark:text-blue-100 mb-2 flex items-center gap-2">
                📅 Citas agendadas hoy ({appointments.filter(apt => apt.estado !== 'cancelada').length})
              </h3>
              <div className="space-y-1 max-h-32 overflow-y-auto">
                {appointments
                  .filter(apt => apt.estado !== 'cancelada')
                  .map(apt => {
                    const aptDate = new Date(apt.fecha_hora)
                    const hours = aptDate.getHours()
                    const minutes = aptDate.getMinutes()
                    const timeStr = formatTime(hours, minutes)
                    
                    return (
                      <div key={apt.id} className="text-sm text-blue-800 dark:text-blue-200 py-1.5 border-b border-blue-200 dark:border-blue-800 last:border-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-base">{timeStr}</span>
                          <span className="font-semibold">{apt.patient.nombre} {apt.patient.apellido}</span>
                        </div>
                        <div className="flex items-center gap-2 mt-0.5 text-xs flex-wrap">
                          <span className="inline-flex items-center gap-1">
                            📍 <span className="text-blue-600 dark:text-blue-400 font-medium">{apt.patient.barrio}</span>
                          </span>
                          <span>•</span>
                          <span className="text-blue-700 dark:text-blue-300">{apt.service.nombre}</span>
                        </div>
                      </div>
                    )
                  })}
              </div>
            </div>
          )}

          <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50 mb-4">
            Horarios Disponibles
          </h2>
          
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {timeSlots.map((slot) => {
              const slotKey = `${slot.hour}-${slot.minute}`
              const isEditing = editingSlot === slotKey
              const isOccupied = slot.isOccupied
              const isCancelled = slot.isCancelled
              
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
              ) : isCancelled ? (
                <button
                  key={slotKey}
                  onClick={() => handleTimeSelect(slot.hour, slot.minute)}
                  onMouseDown={() => handleMouseDown(slotKey, slot.display)}
                  onMouseUp={handleMouseUp}
                  onMouseLeave={handleMouseLeave}
                  onTouchStart={() => handleMouseDown(slotKey, slot.display)}
                  onTouchEnd={handleMouseUp}
                  className="py-3 px-4 rounded-lg border-2 border-yellow-500 bg-yellow-50 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-300 font-medium hover:border-yellow-600 hover:bg-yellow-100 dark:hover:bg-yellow-900/30 transition-all relative"
                  title="Cita cancelada - Disponible para reagendar"
                >
                  {slot.display}
                  <span className="absolute top-0 right-0 text-xs">⚠️</span>
                </button>
              ) : isOccupied ? (
                <button
                  key={slotKey}
                  onClick={() => handleOccupiedSlotClick(slot.appointment!)}
                  className="py-3 px-4 rounded-lg border-2 border-red-500 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 font-medium cursor-pointer hover:bg-red-100 dark:hover:bg-red-900/30 transition-all"
                >
                  {slot.display}
                </button>
              ) : (
                <button
                  key={slotKey}
                  onClick={() => handleTimeSelect(slot.hour, slot.minute)}
                  onMouseDown={() => handleMouseDown(slotKey, slot.display)}
                  onMouseUp={handleMouseUp}
                  onMouseLeave={handleMouseLeave}
                  onTouchStart={() => handleMouseDown(slotKey, slot.display)}
                  onTouchEnd={handleMouseUp}
                  className="py-3 px-4 rounded-lg border-2 border-green-500 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300 font-medium hover:border-green-600 hover:bg-green-100 dark:hover:bg-green-900/30 transition-all"
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

      {/* Modal de información de cita ocupada */}
      {showAppointmentModal && selectedAppointment && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={closeModal}>
          <div className="bg-white dark:bg-zinc-800 rounded-lg shadow-xl max-w-md w-full p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-zinc-900 dark:text-zinc-50 flex items-center gap-2">
                📋 Cita Ocupada
              </h3>
              <button
                onClick={closeModal}
                className="text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200 text-2xl"
              >
                ×
              </button>
            </div>
            
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-lg font-semibold text-purple-600 dark:text-purple-400">
                🕐 {formatTime(new Date(selectedAppointment.fecha_hora).getHours(), new Date(selectedAppointment.fecha_hora).getMinutes())}
              </div>
              
              <div className="border-t border-zinc-200 dark:border-zinc-700 pt-3 space-y-2">
                <div>
                  <span className="text-sm text-zinc-500 dark:text-zinc-400">Paciente:</span>
                  <p className="font-semibold text-zinc-900 dark:text-zinc-50">
                    {selectedAppointment.patient.nombre} {selectedAppointment.patient.apellido}
                  </p>
                </div>
                
                <div>
                  <span className="text-sm text-zinc-500 dark:text-zinc-400">Barrio:</span>
                  <p className="font-semibold text-zinc-900 dark:text-zinc-50">
                    {selectedAppointment.patient.barrio}
                  </p>
                </div>
                
                <div>
                  <span className="text-sm text-zinc-500 dark:text-zinc-400">Teléfono:</span>
                  <p className="font-semibold text-zinc-900 dark:text-zinc-50">
                    {selectedAppointment.patient.telefono}
                  </p>
                </div>
                
                <div>
                  <span className="text-sm text-zinc-500 dark:text-zinc-400">Servicio:</span>
                  <p className="font-semibold text-zinc-900 dark:text-zinc-50">
                    {selectedAppointment.service.nombre}
                  </p>
                </div>
                
                <div>
                  <span className="text-sm text-zinc-500 dark:text-zinc-400">Patología:</span>
                  <p className="font-semibold text-zinc-900 dark:text-zinc-50">
                    {selectedAppointment.patologia}
                  </p>
                </div>
                
                <div>
                  <span className="text-sm text-zinc-500 dark:text-zinc-400">Estado:</span>
                  <span className={`ml-2 px-2 py-1 rounded text-xs font-semibold ${
                    selectedAppointment.estado === 'agendada' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300' :
                    selectedAppointment.estado === 'completada' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300' :
                    'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300'
                  }`}>
                    {selectedAppointment.estado}
                  </span>
                </div>
                
                {selectedAppointment.observacion && (
                  <div>
                    <span className="text-sm text-zinc-500 dark:text-zinc-400">Observación:</span>
                    <p className="text-sm text-zinc-700 dark:text-zinc-300">
                      {selectedAppointment.observacion}
                    </p>
                  </div>
                )}
              </div>
            </div>
            
            <div className="mt-6 flex gap-3">
              <button
                onClick={closeModal}
                className="flex-1 px-4 py-2 bg-zinc-200 dark:bg-zinc-700 text-zinc-900 dark:text-zinc-50 rounded-lg font-medium hover:bg-zinc-300 dark:hover:bg-zinc-600 transition-colors"
              >
                Cerrar
              </button>
              <button
                onClick={() => router.push(`/appointments/${selectedAppointment.id}/edit`)}
                className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-lg font-medium hover:bg-purple-700 transition-colors"
              >
                ✏️ Editar cita
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
