'use client'

import { useState, useEffect, useCallback } from 'react'

export interface Therapist {
  id: string
  nombre: string
  apellido: string
  email: string
  contacto: string
  cedula: string
  placa_moto: string | null
  activo: boolean
  created_at: string
}

export type EstadoFiltro = 'activo' | 'inactivo' | 'todos'

export function useTherapists() {
  const [therapists, setTherapists] = useState<Therapist[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [total, setTotal] = useState(0)
  const [searchTerm, setSearchTerm] = useState('')
  const [isSearching, setIsSearching] = useState(false)
  const [estado, setEstado] = useState<EstadoFiltro>('activo')

  // Modal de desactivar
  const [therapistToDeactivate, setTherapistToDeactivate] = useState<Therapist | null>(null)
  const [deactivateError, setDeactivateError] = useState('')
  const [isDeactivating, setIsDeactivating] = useState(false)

  // Modal de reactivar
  const [therapistToReactivate, setTherapistToReactivate] = useState<Therapist | null>(null)
  const [isReactivating, setIsReactivating] = useState(false)

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

  // --- Desactivar ---
  const openDeactivateModal = (therapist: Therapist) => {
    setDeactivateError('')
    setTherapistToDeactivate(therapist)
  }

  const closeDeactivateModal = () => {
    setTherapistToDeactivate(null)
    setDeactivateError('')
  }

  const confirmDeactivate = async () => {
    if (!therapistToDeactivate) return
    setIsDeactivating(true)
    setDeactivateError('')

    try {
      const response = await fetch(`/api/therapists/${therapistToDeactivate.id}`, {
        method: 'DELETE',
      })
      const data = await response.json()

      if (!response.ok) {
        setDeactivateError(data.error || 'Error al desactivar el terapeuta')
        setIsDeactivating(false)
        return
      }

      setIsDeactivating(false)
      setTherapistToDeactivate(null)
      await fetchTherapists(currentPage, searchTerm, estado)
    } catch (err) {
      console.error('Deactivate error:', err)
      setDeactivateError('Error de conexión')
      setIsDeactivating(false)
    }
  }

  // --- Reactivar ---
  const openReactivateModal = (therapist: Therapist) => setTherapistToReactivate(therapist)
  const closeReactivateModal = () => setTherapistToReactivate(null)

  const confirmReactivate = async () => {
    if (!therapistToReactivate) return
    setIsReactivating(true)

    try {
      const response = await fetch(`/api/therapists/${therapistToReactivate.id}`, {
        method: 'PATCH',
      })
      const data = await response.json()

      if (!response.ok) {
        alert(data.error || 'Error al reactivar el terapeuta')
        setIsReactivating(false)
        return
      }

      setIsReactivating(false)
      setTherapistToReactivate(null)
      await fetchTherapists(currentPage, searchTerm, estado)
    } catch (err) {
      console.error('Reactivate error:', err)
      alert('Error de conexión')
      setIsReactivating(false)
    }
  }

  return {
    therapists, loading, error,
    currentPage, totalPages, total,
    searchTerm, setSearchTerm, isSearching,
    estado, handleChangeEstado,
    handleSearch, handleClearSearch,
    handleNextPage, handlePrevPage, handlePageClick,
    therapistToDeactivate, deactivateError, isDeactivating,
    openDeactivateModal, closeDeactivateModal, confirmDeactivate,
    therapistToReactivate, isReactivating,
    openReactivateModal, closeReactivateModal, confirmReactivate,
  }
}