'use client'

import { useState, useEffect, useCallback, useRef } from 'react'

export interface TherapistPicoPlaca {
  id: string
  nombre: string
  apellido: string
  cedula: string
  placa_moto: string | null
  activo: boolean
  pico_placa_dias: string[] | null
}

export type EstadoFiltro = 'activo' | 'inactivo' | 'todos'

export const DIAS_SEMANA = [
  { key: 'lunes', label: 'Lun' },
  { key: 'martes', label: 'Mar' },
  { key: 'miercoles', label: 'Mié' },
  { key: 'jueves', label: 'Jue' },
  { key: 'viernes', label: 'Vie' },
] as const

export type SaveStatus = 'idle' | 'saving' | 'saved' | 'error'

export function usePicoPlaca() {
  const [therapists, setTherapists] = useState<TherapistPicoPlaca[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [total, setTotal] = useState(0)
  const [searchTerm, setSearchTerm] = useState('')
  const [isSearching, setIsSearching] = useState(false)
  const [estado, setEstado] = useState<EstadoFiltro>('activo')

  // Estado de guardado por terapeuta (para mostrar el check verde o error puntual)
  const [saveStatus, setSaveStatus] = useState<Record<string, SaveStatus>>({})
  const saveStatusTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({})

  const fetchTherapists = useCallback(
    async (page = 1, search = '', estadoFiltro: EstadoFiltro = 'activo') => {
      try {
        setLoading(true)
        const params = new URLSearchParams({
          page: page.toString(),
          limit: '20',
          estado: estadoFiltro,
        })
        if (search) params.append('search', search)

        const response = await fetch(`/api/therapists?${params}`)
        const data = await response.json()

        if (!response.ok) {
          setError(data.error || 'Error al cargar terapeutas')
          setLoading(false)
          return
        }

        setTherapists(data.therapists || [])
        setCurrentPage(data.pagination.page)
        setTotalPages(data.pagination.totalPages)
        setTotal(data.pagination.total)
        setLoading(false)
      } catch (err) {
        console.error('Fetch error:', err)
        setError('Error de conexión')
        setLoading(false)
      }
    },
    []
  )

  useEffect(() => {
    fetchTherapists(currentPage, searchTerm, estado)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage, estado])

  const handleSearch = async () => {
    setIsSearching(true)
    setCurrentPage(1)
    await fetchTherapists(1, searchTerm, estado)
    setIsSearching(false)
  }

  const handleClearSearch = async () => {
    setSearchTerm('')
    setCurrentPage(1)
    await fetchTherapists(1, '', estado)
  }

  const handleChangeEstado = (nuevoEstado: EstadoFiltro) => {
    setEstado(nuevoEstado)
    setCurrentPage(1)
  }

  const handleNextPage = () => {
    if (currentPage < totalPages) setCurrentPage(currentPage + 1)
  }

  const handlePrevPage = () => {
    if (currentPage > 1) setCurrentPage(currentPage - 1)
  }

  const handlePageClick = (page: number) => setCurrentPage(page)

  // Marca el estado de guardado de un terapeuta puntual y lo revierte a 'idle'
  // automáticamente después de un tiempo (solo para 'saved' y 'error')
  const setStatusWithTimeout = (therapistId: string, status: SaveStatus) => {
    setSaveStatus((prev) => ({ ...prev, [therapistId]: status }))

    if (saveStatusTimers.current[therapistId]) {
      clearTimeout(saveStatusTimers.current[therapistId])
    }

    if (status === 'saved' || status === 'error') {
      saveStatusTimers.current[therapistId] = setTimeout(() => {
        setSaveStatus((prev) => ({ ...prev, [therapistId]: 'idle' }))
      }, 2000)
    }
  }

  // Toggle de un día para un terapeuta: actualiza optimistamente en UI,
  // guarda en backend, y revierte si falla
  const toggleDia = async (therapistId: string, dia: string) => {
    const therapist = therapists.find((t) => t.id === therapistId)
    if (!therapist) return

    const diasActuales = therapist.pico_placa_dias || []
    const yaEstaba = diasActuales.includes(dia)
    const nuevosDias = yaEstaba
      ? diasActuales.filter((d) => d !== dia)
      : [...diasActuales, dia]

    // Optimistic update
    setTherapists((prev) =>
      prev.map((t) =>
        t.id === therapistId ? { ...t, pico_placa_dias: nuevosDias } : t
      )
    )
    setStatusWithTimeout(therapistId, 'saving')

    try {
      const response = await fetch(`/api/therapists/${therapistId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pico_placa_dias: nuevosDias.length > 0 ? nuevosDias : null }),
      })

      if (!response.ok) {
        throw new Error('Error al guardar')
      }

      setStatusWithTimeout(therapistId, 'saved')
    } catch (err) {
      console.error('Error guardando pico_placa_dias:', err)

      // Revertir el cambio optimista
      setTherapists((prev) =>
        prev.map((t) =>
          t.id === therapistId ? { ...t, pico_placa_dias: diasActuales } : t
        )
      )
      setStatusWithTimeout(therapistId, 'error')
    }
  }

  return {
    therapists, loading, error,
    currentPage, totalPages, total,
    searchTerm, setSearchTerm, isSearching,
    estado, handleChangeEstado,
    handleSearch, handleClearSearch,
    handleNextPage, handlePrevPage, handlePageClick,
    saveStatus, toggleDia,
  }
}