'use client'

import { useState, useEffect } from 'react'

export interface Therapist {
  id: string
  nombre: string
  apellido: string
}

export interface PreviewRegistro {
  id: string
  terapeuta: string
  paciente: string
  tipo_evento: string
  titulo: string
  enviada: boolean
  fecha: string
  estado: string
}

export interface PreviewPagination {
  page: number
  limit: number
  total: number
  totalPages: number
  hasMore: boolean
}

export type ActiveTab = 'terapeuta' | 'fechas'

export function useLimpiezaNotificaciones() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('terapeuta')

  // Estados para limpieza por terapeuta
  const [therapists, setTherapists] = useState<Therapist[]>([])
  const [selectedTherapist, setSelectedTherapist] = useState('')

  // Estados para limpieza por fechas
  const [fechaDesde, setFechaDesde] = useState('')
  const [fechaHasta, setFechaHasta] = useState('')

  // Estados comunes
  const [confirmacion, setConfirmacion] = useState('')
  const [preview, setPreview] = useState<PreviewRegistro[]>([])
  const [previewPagination, setPreviewPagination] = useState<PreviewPagination | null>(null)
  const [previewPage, setPreviewPage] = useState(1)
  const [showPreview, setShowPreview] = useState(false)
  const [loading, setLoading] = useState(false)
  const [loadingPreview, setLoadingPreview] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  // Cargar terapeutas
  useEffect(() => {
    const fetchTherapists = async () => {
      try {
        const response = await fetch('/api/therapists')
        if (!response.ok) throw new Error('Error al cargar terapeutas')
        const data = await response.json()
        setTherapists(data.therapists || [])
      } catch (err) {
        console.error('Error cargando terapeutas:', err)
      }
    }
    fetchTherapists()
  }, [])

  // Cambiar de tab reseteando estado relacionado a resultados previos
  const handleChangeTab = (tab: ActiveTab) => {
    setActiveTab(tab)
    setError('')
    setSuccess('')
    setShowPreview(false)
    setConfirmacion('')
  }

  // Cargar preview
  const handleLoadPreview = async (pageOverride?: number) => {
    setError('')
    setSuccess('')
    setLoadingPreview(true)
    setShowPreview(false)

    try {
      const pageToUse = pageOverride ?? previewPage
      const params = new URLSearchParams({
        page: pageToUse.toString(),
        limit: '50'
      })

      if (activeTab === 'terapeuta') {
        if (!selectedTherapist) {
          setError('Selecciona un terapeuta')
          setLoadingPreview(false)
          return
        }
        params.append('therapist_id', selectedTherapist)
      } else {
        if (!fechaDesde || !fechaHasta) {
          setError('Selecciona ambas fechas')
          setLoadingPreview(false)
          return
        }
        params.append('fecha_desde', fechaDesde)
        params.append('fecha_hasta', fechaHasta)
      }

      const response = await fetch(`/api/notifications/cleanup/preview?${params}`)

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Error al cargar preview')
      }

      const data = await response.json()
      setPreview(data.registros || [])
      setPreviewPagination(data.pagination)
      setShowPreview(true)

      if (data.pagination.total === 0) {
        setError('No hay registros para eliminar con estos filtros')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido')
    } finally {
      setLoadingPreview(false)
    }
  }

  // Ir a la página anterior del preview
  const handlePreviewPrevPage = () => {
    const nuevaPagina = Math.max(1, previewPage - 1)
    setPreviewPage(nuevaPagina)
    handleLoadPreview(nuevaPagina)
  }

  // Ir a la página siguiente del preview
  const handlePreviewNextPage = () => {
    const nuevaPagina = previewPage + 1
    setPreviewPage(nuevaPagina)
    handleLoadPreview(nuevaPagina)
  }

  // Eliminar registros
  const handleDelete = async () => {
    if (confirmacion !== 'ELIMINAR') {
      setError('Debes escribir "ELIMINAR" para confirmar')
      return
    }

    setLoading(true)
    setError('')
    setSuccess('')

    try {
      let endpoint = ''
      let body = {}

      if (activeTab === 'terapeuta') {
        endpoint = '/api/notifications/cleanup/by-therapist'
        body = {
          therapist_id: selectedTherapist,
          confirmacion
        }
      } else {
        endpoint = '/api/notifications/cleanup/by-dates'
        body = {
          fecha_desde: fechaDesde,
          fecha_hasta: fechaHasta,
          confirmacion
        }
      }

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Error al eliminar registros')
      }

      setSuccess(data.mensaje)
      setConfirmacion('')
      setShowPreview(false)
      setPreview([])
      setPreviewPagination(null)
      setPreviewPage(1)

      // Limpiar formulario
      if (activeTab === 'terapeuta') {
        setSelectedTherapist('')
      } else {
        setFechaDesde('')
        setFechaHasta('')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido')
    } finally {
      setLoading(false)
    }
  }

  // Handlers de cambio que resetean preview/mensajes (para inputs controlados)
  const handleSelectTherapist = (id: string) => {
    setSelectedTherapist(id)
    setShowPreview(false)
    setError('')
    setSuccess('')
  }

  const handleChangeFechaDesde = (fecha: string) => {
    setFechaDesde(fecha)
    setShowPreview(false)
    setError('')
    setSuccess('')
  }

  const handleChangeFechaHasta = (fecha: string) => {
    setFechaHasta(fecha)
    setShowPreview(false)
    setError('')
    setSuccess('')
  }

  return {
    // estado de tabs
    activeTab,
    handleChangeTab,
    // terapeutas
    therapists,
    selectedTherapist,
    handleSelectTherapist,
    // fechas
    fechaDesde,
    fechaHasta,
    handleChangeFechaDesde,
    handleChangeFechaHasta,
    // confirmación
    confirmacion,
    setConfirmacion,
    // preview
    preview,
    previewPagination,
    showPreview,
    handleLoadPreview,
    handlePreviewPrevPage,
    handlePreviewNextPage,
    // acciones
    handleDelete,
    // estados de carga/mensajes
    loading,
    loadingPreview,
    error,
    success
  }
}