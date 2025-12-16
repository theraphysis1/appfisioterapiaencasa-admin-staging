'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
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

export default function ScheduleCalendarPage() {
  const params = useParams()
  const router = useRouter()
  const therapistId = params.id as string

  const [therapist, setTherapist] = useState<Therapist | null>(null)
  const [loading, setLoading] = useState(true)
  const [currentDate, setCurrentDate] = useState(new Date())
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [isPackageMode, setIsPackageMode] = useState(false)

  useEffect(() => {
    // Verificar si estamos en modo paquete
    const packageMode = sessionStorage.getItem('isSchedulingPackage') === 'true'
    setIsPackageMode(packageMode)
    
    fetchTherapist()
  }, [therapistId])
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

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear()
    const month = date.getMonth()
    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)
    const daysInMonth = lastDay.getDate()
    const startingDayOfWeek = firstDay.getDay()

    return { daysInMonth, startingDayOfWeek, year, month }
  }

  const handlePreviousMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1))
  }

  const handleNextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1))
  }

  const handleDateClick = (day: number) => {
    const selected = new Date(currentDate.getFullYear(), currentDate.getMonth(), day)
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    
    if (selected >= today) {
      setSelectedDate(selected)
      // Navegar a la selección de hora
      router.push(`/patients/schedule/${therapistId}/time?date=${selected.toISOString()}`)
    }
  }

  const isToday = (day: number) => {
    const today = new Date()
    return (
      day === today.getDate() &&
      currentDate.getMonth() === today.getMonth() &&
      currentDate.getFullYear() === today.getFullYear()
    )
  }

  const isPastDate = (day: number) => {
    const selected = new Date(currentDate.getFullYear(), currentDate.getMonth(), day)
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    selected.setHours(0, 0, 0, 0)
    return selected < today
  }

  const monthNames = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
  ]

  const dayNames = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']

  if (loading) {
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

  const { daysInMonth, startingDayOfWeek, year, month } = getDaysInMonth(currentDate)
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1)
  const emptyDays = Array.from({ length: startingDayOfWeek }, (_, i) => i)

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-900 py-12 px-6">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <Link
            href="/patients/create"
            className="inline-flex items-center text-purple-600 hover:text-purple-700 dark:text-purple-400 dark:hover:text-purple-300 mb-4"
          >
            ← {isPackageMode ? 'Volver a selección de terapeuta' : 'Volver a terapeutas'}
          </Link>
          <h1 className="text-3xl font-bold text-zinc-900 dark:text-zinc-50 mb-2">
            {isPackageMode ? 'Seleccionar Fecha para Cita de Paquete' : 'Seleccionar Fecha'}
          </h1>
          <p className="text-zinc-600 dark:text-zinc-400">
            Terapeuta: <span className="font-semibold">{therapist.nombre} {therapist.apellido}</span>
          </p>
          {isPackageMode && (
            <p className="text-purple-600 dark:text-purple-400 mt-1 font-medium">
              📦 Modo paquete activo
            </p>
          )}
        </div>

        <div className="bg-white dark:bg-zinc-800 rounded-lg shadow-md p-6">
          {/* Header del calendario */}
          <div className="flex items-center justify-between mb-6">
            <button
              onClick={handlePreviousMonth}
              className="p-2 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-700 transition-colors"
            >
              <svg className="w-6 h-6 text-zinc-600 dark:text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            
            <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">
              {monthNames[month]} {year}
            </h2>

            <button
              onClick={handleNextMonth}
              className="p-2 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-700 transition-colors"
            >
              <svg className="w-6 h-6 text-zinc-600 dark:text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>

          {/* Días de la semana */}
          <div className="grid grid-cols-7 gap-2 mb-2">
            {dayNames.map((day) => (
              <div
                key={day}
                className="text-center text-sm font-semibold text-zinc-600 dark:text-zinc-400 py-2"
              >
                {day}
              </div>
            ))}
          </div>

          {/* Días del mes */}
          <div className="grid grid-cols-7 gap-2">
            {emptyDays.map((_, index) => (
              <div key={`empty-${index}`} className="aspect-square" />
            ))}
            
            {days.map((day) => {
              const past = isPastDate(day)
              const today = isToday(day)
              
              return (
                <button
                  key={day}
                  onClick={() => handleDateClick(day)}
                  disabled={past}
                  className={`
                    aspect-square flex items-center justify-center rounded-lg text-sm font-medium transition-all
                    ${past 
                      ? 'text-zinc-300 dark:text-zinc-700 cursor-not-allowed' 
                      : 'text-zinc-900 dark:text-zinc-50 hover:bg-purple-100 dark:hover:bg-purple-900/30 cursor-pointer'
                    }
                    ${today ? 'bg-purple-500 text-white hover:bg-purple-600' : ''}
                  `}
                >
                  {day}
                </button>
              )
            })}
          </div>
        </div>

        <div className="mt-6 text-center text-sm text-zinc-600 dark:text-zinc-400">
          <p>Selecciona una fecha para continuar con el agendamiento</p>
        </div>
      </div>
    </div>
  )
}