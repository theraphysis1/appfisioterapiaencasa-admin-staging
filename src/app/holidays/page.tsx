'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

interface Holiday {
  id: string
  fecha: string
  descripcion: string | null
  created_at: string
}

export default function HolidaysPage() {
  const router = useRouter()
  const [holidays, setHolidays] = useState<Holiday[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedDate, setSelectedDate] = useState('')
  const [descripcion, setDescripcion] = useState('')
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear())
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth())
  const [saving, setSaving] = useState(false)

  // Cargar festivos al montar el componente
  useEffect(() => {
    fetchHolidays()
  }, [])

  const fetchHolidays = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/holidays')
      if (response.ok) {
        const data = await response.json()
        setHolidays(data)
      }
    } catch (error) {
      console.error('Error fetching holidays:', error)
      alert('Error al cargar días festivos')
    } finally {
      setLoading(false)
    }
  }

  const handleAddHoliday = async () => {
    if (!selectedDate) {
      alert('Por favor selecciona una fecha')
      return
    }

    try {
      setSaving(true)
      const response = await fetch('/api/holidays', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fecha: selectedDate,
          descripcion: descripcion.trim() || null,
        }),
      })

      if (response.ok) {
        alert('Día festivo agregado correctamente')
        setSelectedDate('')
        setDescripcion('')
        fetchHolidays()
      } else {
        const error = await response.json()
        alert(error.error || 'Error al agregar día festivo')
      }
    } catch (error) {
      console.error('Error adding holiday:', error)
      alert('Error al agregar día festivo')
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteHoliday = async (id: string, fecha: string) => {
    if (!confirm(`¿Eliminar el día festivo del ${new Date(fecha + 'T00:00:00').toLocaleDateString('es-CO')}?`)) {
      return
    }

    try {
      const response = await fetch(`/api/holidays/${id}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        alert('Día festivo eliminado')
        fetchHolidays()
      } else {
        alert('Error al eliminar día festivo')
      }
    } catch (error) {
      console.error('Error deleting holiday:', error)
      alert('Error al eliminar día festivo')
    }
  }

  // Generar días del calendario
  const getDaysInMonth = (year: number, month: number) => {
    return new Date(year, month + 1, 0).getDate()
  }

  const getFirstDayOfMonth = (year: number, month: number) => {
    return new Date(year, month, 1).getDay()
  }

  const isHoliday = (year: number, month: number, day: number) => {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
    return holidays.some(h => h.fecha === dateStr)
  }

  const isSelectedDate = (year: number, month: number, day: number) => {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
    return selectedDate === dateStr
  }

  const handleDateClick = (year: number, month: number, day: number) => {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
    setSelectedDate(dateStr)
  }

  const renderCalendar = () => {
    const daysInMonth = getDaysInMonth(currentYear, currentMonth)
    const firstDay = getFirstDayOfMonth(currentYear, currentMonth)
    const days = []
    const monthNames = [
      'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
      'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
    ]

    // Días vacíos antes del primer día
    for (let i = 0; i < firstDay; i++) {
      days.push(<div key={`empty-${i}`} className="h-12"></div>)
    }

    // Días del mes
    for (let day = 1; day <= daysInMonth; day++) {
      const isHol = isHoliday(currentYear, currentMonth, day)
      const isSelected = isSelectedDate(currentYear, currentMonth, day)
      
      days.push(
        <button
          key={day}
          onClick={() => handleDateClick(currentYear, currentMonth, day)}
          className={`h-12 flex items-center justify-center rounded-lg transition-all ${
            isHol
              ? 'bg-red-500 text-white font-bold'
              : isSelected
              ? 'bg-blue-500 text-white'
              : 'bg-white hover:bg-gray-100 border border-gray-200'
          }`}
        >
          {day}
        </button>
      )
    }

    return (
      <div className="bg-white rounded-lg shadow p-6">
        {/* Header del calendario */}
        <div className="flex items-center justify-between mb-4 gap-2">
          <button
            onClick={() => {
              if (currentMonth === 0) {
                setCurrentMonth(11)
                setCurrentYear(currentYear - 1)
              } else {
                setCurrentMonth(currentMonth - 1)
              }
            }}
            className="px-2 sm:px-3 py-1 bg-gray-200 rounded hover:bg-gray-300 text-xs sm:text-sm whitespace-nowrap"
          >
            ← Anterior
          </button>
          <h3 className="text-base sm:text-lg font-semibold text-center flex-shrink min-w-0">
            {monthNames[currentMonth]} {currentYear}
          </h3>
          <button
            onClick={() => {
              if (currentMonth === 11) {
                setCurrentMonth(0)
                setCurrentYear(currentYear + 1)
              } else {
                setCurrentMonth(currentMonth + 1)
              }
            }}
            className="px-2 sm:px-3 py-1 bg-gray-200 rounded hover:bg-gray-300 text-xs sm:text-sm whitespace-nowrap"
          >
            Siguiente →
          </button>
        </div>

        {/* Días de la semana */}
        <div className="grid grid-cols-7 gap-2 mb-2">
          {['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'].map(day => (
            <div key={day} className="text-center font-semibold text-gray-600 text-sm">
              {day}
            </div>
          ))}
        </div>

        {/* Días del mes */}
        <div className="grid grid-cols-7 gap-2">
          {days}
        </div>

        {/* Leyenda */}
        <div className="mt-4 flex gap-4 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-red-500 rounded"></div>
            <span>Festivo</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-blue-500 rounded"></div>
            <span>Seleccionado</span>
          </div>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="max-w-6xl mx-auto">
          <p className="text-center text-gray-600">Cargando días festivos...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-800">Gestión de Días Festivos</h1>
              <p className="text-gray-600 mt-1">
                Configura los días festivos que estarán bloqueados para agendamiento.
              </p>
            </div>
            <button
              onClick={() => router.push('/home')}
              className="w-full sm:w-auto px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 text-sm sm:text-base whitespace-nowrap"
            >
              ← Volver al Inicio
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Calendario */}
          <div className="lg:col-span-2">
            {renderCalendar()}
          </div>

          {/* Panel de agregar festivo */}
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold mb-4">Agregar Festivo</h2>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Fecha seleccionada
                  </label>
                  <input
                    type="text"
                    value={selectedDate ? new Date(selectedDate + 'T00:00:00').toLocaleDateString('es-CO') : 'Ninguna'}
                    readOnly
                    className="w-full px-3 py-2 border rounded-lg bg-gray-50"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">
                    Descripción (opcional)
                  </label>
                  <input
                    type="text"
                    value={descripcion}
                    onChange={(e) => setDescripcion(e.target.value)}
                    placeholder="Ej: Navidad, Año Nuevo..."
                    className="w-full px-3 py-2 border rounded-lg"
                  />
                </div>

                <button
                  onClick={handleAddHoliday}
                  disabled={!selectedDate || saving}
                  className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
                >
                  {saving ? 'Guardando...' : 'Agregar Festivo'}
                </button>
              </div>
            </div>

            {/* Lista de festivos */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold mb-4">
                Festivos Configurados ({holidays.length})
              </h2>
              
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {holidays.length === 0 ? (
                  <p className="text-gray-500 text-sm text-center py-4">
                    No hay festivos configurados
                  </p>
                ) : (
                  holidays.map(holiday => (
                    <div
                      key={holiday.id}
                      className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                    >
                      <div>
                        <p className="font-medium">
                          {new Date(holiday.fecha + 'T00:00:00').toLocaleDateString('es-CO', {
                            weekday: 'short',
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric'
                          })}
                        </p>
                        {holiday.descripcion && (
                          <p className="text-sm text-gray-600">{holiday.descripcion}</p>
                        )}
                      </div>
                      <button
                        onClick={() => handleDeleteHoliday(holiday.id, holiday.fecha)}
                        className="px-3 py-1 text-red-600 hover:bg-red-50 rounded"
                      >
                        Eliminar
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}