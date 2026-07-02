'use client'

import { useEffect, useState, useCallback } from 'react'

interface Patient {
  id: string
  nombre: string
  apellido: string
  telefono: string
  direccion: string
  barrio: string
  referencia: string | null
}

interface Therapist {
  id: string
  nombre: string
  apellido: string
  cedula: string
  email: string
  contacto: string
  placa_moto: string
}

interface Service {
  id: string
  nombre: string
  tipo: string
  cantidad_sesiones: number
  valor_default: number
  comision_default: number
}

interface Pagination {
  page: number
  limit: number
  total: number
  totalPages: number
  hasMore: boolean
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
  patient: Patient
  therapist: Therapist
  service: Service
  direccion_final: string
  barrio_final: string
  referencia_final: string | null
  direccion_lat_final: number | null
  direccion_lng_final: number | null
  tiene_direccion_temporal: boolean
}

export function useAppointments() {
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [loading, setLoading] = useState(true)

  // searchTerm: lo que el admin va escribiendo (no dispara fetch)
  // activeSearchTerm: el valor confirmado (Buscar / Enter) que sí dispara fetch
  const [searchTerm, setSearchTerm] = useState('')
  const [activeSearchTerm, setActiveSearchTerm] = useState('')

  const [filterEstado, setFilterEstado] = useState('todos')

  // filterFechaDesde/Hasta: lo que el admin va seleccionando (no dispara fetch)
  // activeFechaDesde/Hasta: el valor confirmado (Buscar / Enter) que sí dispara fetch
  const [filterFechaDesde, setFilterFechaDesde] = useState('')
  const [filterFechaHasta, setFilterFechaHasta] = useState('')
  const [activeFechaDesde, setActiveFechaDesde] = useState('')
  const [activeFechaHasta, setActiveFechaHasta] = useState('')
  const [isUpdating, setIsUpdating] = useState(false)
  const [updateMessage, setUpdateMessage] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [pagination, setPagination] = useState<Pagination | null>(null)

  const fetchAppointments = useCallback(async () => {
    try {
      setLoading(true)

      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: '20'
      })

      if (filterEstado !== 'todos') {
        params.append('estado', filterEstado)
      }

      if (activeSearchTerm.trim()) {
        params.append('search', activeSearchTerm.trim())
      }

      if (activeFechaDesde) {
        params.append('fecha_desde', activeFechaDesde)
      }

      if (activeFechaHasta) {
        params.append('fecha_hasta', activeFechaHasta)
      }

      const response = await fetch(`/api/appointments?${params.toString()}`)
      const data = await response.json()

      if (response.ok) {
        setAppointments(data.appointments || [])
        setPagination(data.pagination)
      }
    } catch (error) {
      console.error('Error fetching appointments:', error)
    } finally {
      setLoading(false)
    }
  }, [currentPage, filterEstado, activeSearchTerm, activeFechaDesde, activeFechaHasta])

  useEffect(() => {
    fetchAppointments()
  }, [fetchAppointments])

  // Ejecuta la búsqueda: confirma texto y fechas, resetea a página 1
  const handleSearch = () => {
    setCurrentPage(1)
    setActiveSearchTerm(searchTerm)
    setActiveFechaDesde(filterFechaDesde)
    setActiveFechaHasta(filterFechaHasta)
  }

  // Limpia la búsqueda de texto (las fechas no se tocan)
  const handleClearSearch = () => {
    setSearchTerm('')
    setCurrentPage(1)
    setActiveSearchTerm('')
  }

  // Limpia el filtro de fecha desde
  const handleClearFechaDesde = () => {
    setFilterFechaDesde('')
    setCurrentPage(1)
    setActiveFechaDesde('')
  }

  // Limpia el filtro de fecha hasta
  const handleClearFechaHasta = () => {
    setFilterFechaHasta('')
    setCurrentPage(1)
    setActiveFechaHasta('')
  }

  // Detecta Enter en el input de búsqueda
  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      handleSearch()
    }
  }

  const handleBulkComplete = async () => {
    if (!filterFechaDesde || !filterFechaHasta) {
      setUpdateMessage('⚠️ Por favor selecciona un rango de fechas')
      setTimeout(() => setUpdateMessage(''), 3000)
      return
    }

    const confirmacion = window.confirm(
      '¿Estás seguro de actualizar todas las citas agendadas que ya pasaron su horario en el rango seleccionado?'
    )

    if (!confirmacion) return

    setIsUpdating(true)
    setUpdateMessage('')

    try {
      const response = await fetch('/api/appointments/bulk-complete', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          date_from: filterFechaDesde,
          date_to: filterFechaHasta,
        }),
      })

      const data = await response.json()

      if (response.ok) {
        setUpdateMessage(`✅ ${data.message}`)
        await fetchAppointments()
      } else {
        setUpdateMessage(`❌ Error: ${data.error}`)
      }
    } catch (error) {
      console.error('Error updating appointments:', error)
      setUpdateMessage('❌ Error al actualizar las citas')
    } finally {
      setIsUpdating(false)
      setTimeout(() => setUpdateMessage(''), 5000)
    }
  }

  const handlePageChange = (newPage: number) => {
    setCurrentPage(newPage)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  return {
    appointments,
    loading,
    searchTerm,
    setSearchTerm,
    handleSearch,
    handleClearSearch,
    handleSearchKeyDown,
    filterEstado,
    setFilterEstado,
    filterFechaDesde,
    setFilterFechaDesde,
    filterFechaHasta,
    setFilterFechaHasta,
    handleClearFechaDesde,
    handleClearFechaHasta,
    isUpdating,
    updateMessage,
    currentPage,
    pagination,
    handleBulkComplete,
    handlePageChange,
  }
}