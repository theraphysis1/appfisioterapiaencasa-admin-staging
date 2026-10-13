// src/app/patients/schedule/[id]/time/hooks/useTimeSlots.ts
'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import { buildSlotMap, getSlotState, getOtherSlots, parseTimeInput } from '../utils/timeSlots'
import { GRID_ROWS } from '../config/timeSlots.config'

export interface Appointment {
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
  direccion_final: string
  barrio_final: string
  referencia_final: string | null
  tiene_direccion_temporal: boolean
}

export interface Therapist {
  id: string
  nombre: string
  apellido: string
  cedula: string
  email: string
  contacto: string
  placa_moto: string | null
}

export function useTimeSlots() {
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
  const [showCustomTime, setShowCustomTime] = useState(false)
  const [customTime, setCustomTime] = useState('')
  const [customTimeError, setCustomTimeError] = useState<string | null>(null)

  useEffect(() => {
    if (dateParam) {
      const [year, month, day] = dateParam.split('T')[0].split('-').map(Number)
      setSelectedDate(new Date(year, month - 1, day))
    }

    const editMode = sessionStorage.getItem('returnToEdit') === 'true'
    setIsEditMode(editMode)

    if (editMode) {
      setEditingAppointmentId(sessionStorage.getItem('editingAppointmentId'))
    }

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

    // Mapa hora -> estado, calculado en memoria con las citas del día (pocas filas)
  const slotMap = buildSlotMap(appointments)
  const getSlot = (hour: number, minute: number) => getSlotState(slotMap, hour, minute)
  const otherSlots = getOtherSlots(slotMap)

  const handleMouseDown = (slotKey: string, displayTime: string) => {
    const timer = setTimeout(() => {
      setEditingSlot(slotKey)
      setEditedTime(displayTime)
    }, 2000)
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

  const handleTimeInputKeyDown = (
    e: React.KeyboardEvent<HTMLInputElement>,
    hour: number,
    minute: number
  ) => {
    if (e.key === 'Enter') {
      const timeMatch = editedTime.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i)
      if (timeMatch) {
        let newHour = parseInt(timeMatch[1])
        const newMinute = parseInt(timeMatch[2])
        const period = timeMatch[3].toUpperCase()

        if (period === 'PM' && newHour !== 12) {
          newHour += 12
        } else if (period === 'AM' && newHour === 12) {
          newHour = 0
        }

        setEditingSlot(null)
        handleTimeSelect(newHour, newMinute)
      } else {
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

  const goToEditAppointment = (appointmentId: string) => {
    router.push(`/appointments/${appointmentId}/edit`)
  }

  const openCustomTime = () => {
    setCustomTime('')
    setCustomTimeError(null)
    setShowCustomTime(true)
  }

  const closeCustomTime = () => {
    setShowCustomTime(false)
    setCustomTimeError(null)
  }

  const handleCustomTimeChange = (value: string) => {
    setCustomTime(value)
    setCustomTimeError(null)
  }

  const handleCustomTimeSubmit = () => {
    const parsed = parseTimeInput(customTime)

    if (!parsed) {
      setCustomTimeError('Formato inválido. Ejemplo: 4:45 PM')
      return
    }

    // Si ya hay una cita agendada exactamente a esa hora, se avisa antes de continuar
    const slot = getSlot(parsed.hour, parsed.minute)
    if (slot.status === 'occupied') {
      setCustomTimeError(`Ya hay una cita agendada a las ${slot.display}`)
      return
    }

    setShowCustomTime(false)
    handleTimeSelect(parsed.hour, parsed.minute)
  }

  const getDireccionIcon = (tieneTemporal: boolean) => (tieneTemporal ? '🏢' : '🏠')

  const getDireccionTooltip = (tieneTemporal: boolean) =>
    tieneTemporal ? 'Dirección temporal' : 'Dirección del domicilio'

  const formatDate = (date: Date) => {
    const days = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado']
    const months = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre']
    return `${days[date.getDay()]}, ${date.getDate()} de ${months[date.getMonth()]} de ${date.getFullYear()}`
  }

  const handleTimeSelect = (hour: number, minute: number) => {
    if (!selectedDate) return

    const year = selectedDate.getFullYear()
    const month = selectedDate.getMonth()
    const day = selectedDate.getDate()
    const appointmentDate = new Date(year, month, day, hour, minute, 0, 0)

    if (isEditMode && editingAppointmentId) {
      const editedData = {
        year,
        month,
        day,
        hour,
        minute,
        isoString: appointmentDate.toISOString()
      }
      sessionStorage.setItem('editedDateTime', JSON.stringify(editedData))
      router.push(`/appointments/${editingAppointmentId}/edit`)
    } else if (isPackageMode && packageData) {
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

      router.push(`/patients/schedule/${therapistId}/confirm`)
    } else {
      router.push(`/patients/schedule/${therapistId}/form?date=${appointmentDate.toISOString()}`)
    }
  }

  return {
    therapistId,
    therapist,
    loading,
    selectedDate,
    isPackageMode,
    packageData,
    isEditMode,
    editingSlot,
    editedTime,
    appointments,
    selectedAppointment,
    showAppointmentModal,
    gridRows: GRID_ROWS,
    getSlot,
    otherSlots,
    formatDate,
    getDireccionIcon,
    getDireccionTooltip,
    handleMouseDown,
    handleMouseUp,
    handleMouseLeave,
    handleTimeInputChange,
    handleTimeInputBlur,
    handleTimeInputKeyDown,
    handleOccupiedSlotClick,
    closeModal,
    handleTimeSelect,
    goToEditAppointment,
    showCustomTime,
    customTime,
    customTimeError,
    openCustomTime,
    closeCustomTime,
    handleCustomTimeChange,
    handleCustomTimeSubmit
  }
}