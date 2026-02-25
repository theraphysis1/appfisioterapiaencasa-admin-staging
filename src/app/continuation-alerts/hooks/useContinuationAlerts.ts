import { useState, useEffect, useCallback } from 'react'

export interface ContinuationAlert {
  id: string
  tipo_alerta: 'valoracion_completada' | 'paquete_completado'
  total_sesiones: number
  fecha_completado: string
  created_at: string
  patient: {
    id: string
    nombre: string
    apellido: string
    telefono: string
    barrio: string
  } | null
  package: {
    id: string
    total_sesiones: number
    valor_total: number
    service: { nombre: string } | null
  } | null
  appointment: {
    id: string
    fecha_hora: string
    service: { nombre: string } | null
  } | null
}

export interface AlertsState {
  alerts: ContinuationAlert[]
  total: number
  page: number
  total_pages: number
  loading: boolean
  error: string | null
}

export type FiltroTipo = 'todos' | 'valoracion_completada' | 'paquete_completado'

export function useContinuationAlerts() {
  const [state, setState] = useState<AlertsState>({
    alerts: [],
    total: 0,
    page: 1,
    total_pages: 1,
    loading: true,
    error: null
  })

  const [filtroTipo, setFiltroTipo] = useState<FiltroTipo>('todos')
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)

  const fetchAlerts = useCallback(async (page = 1, tipo: FiltroTipo = 'todos') => {
    setState(prev => ({ ...prev, loading: true, error: null }))

    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: '20'
      })

      if (tipo !== 'todos') {
        params.set('tipo', tipo)
      }

      const response = await fetch(`/api/continuation-alerts?${params.toString()}`)

      if (!response.ok) {
        throw new Error('Error al cargar las alertas')
      }

      const data = await response.json()

      setState({
        alerts: data.alerts || [],
        total: data.total || 0,
        page: data.page || 1,
        total_pages: data.total_pages || 1,
        loading: false,
        error: null
      })
    } catch (error) {
      setState(prev => ({
        ...prev,
        loading: false,
        error: error instanceof Error ? error.message : 'Error desconocido'
      }))
    }
  }, [])

  useEffect(() => {
    fetchAlerts(1, filtroTipo)
  }, [filtroTipo, fetchAlerts])

  const handleFiltroChange = (tipo: FiltroTipo) => {
    setFiltroTipo(tipo)
  }

  const handlePageChange = (newPage: number) => {
    fetchAlerts(newPage, filtroTipo)
  }

  const handleConfirmDelete = (id: string) => {
    setConfirmDeleteId(id)
  }

  const handleCancelDelete = () => {
    setConfirmDeleteId(null)
  }

  const handleDelete = async (id: string) => {
    setDeletingId(id)
    setConfirmDeleteId(null)

    try {
      const response = await fetch(`/api/continuation-alerts/${id}`, {
        method: 'DELETE'
      })

      if (!response.ok) {
        throw new Error('Error al eliminar la alerta')
      }

      // Remover de la lista local sin recargar
      setState(prev => ({
        ...prev,
        alerts: prev.alerts.filter(a => a.id !== id),
        total: prev.total - 1
      }))
    } catch (error) {
      console.error('Error eliminando alerta:', error)
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Error al eliminar'
      }))
    } finally {
      setDeletingId(null)
    }
  }

  return {
    state,
    filtroTipo,
    deletingId,
    confirmDeleteId,
    handleFiltroChange,
    handlePageChange,
    handleConfirmDelete,
    handleCancelDelete,
    handleDelete,
    refetch: () => fetchAlerts(state.page, filtroTipo)
  }
}