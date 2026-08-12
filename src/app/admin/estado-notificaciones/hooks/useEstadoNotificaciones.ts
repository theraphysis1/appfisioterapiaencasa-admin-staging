'use client'

import { useState, useEffect, useCallback } from 'react'

export type Semaforo = 'rojo' | 'amarillo' | 'verde' | 'gris'

export interface EstadoTerapeuta {
  therapist_id: string
  nombre: string
  plataforma: 'android' | 'ios' | 'desktop' | 'unknown'
  instalada: boolean
  suscripcion_activa: boolean
  confirmados: number
  enviados: number
  semaforo: Semaforo
  accion_sugerida: string
}

export interface Pagination {
  page: number
  limit: number
  total: number
  totalPages: number
  hasMore: boolean
}

export function useEstadoNotificaciones() {
  const [registros, setRegistros] = useState<EstadoTerapeuta[]>([])
  const [pagination, setPagination] = useState<Pagination | null>(null)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const fetchEstado = useCallback(async (pageToUse: number) => {
    setLoading(true)
    setError('')

    try {
      const response = await fetch(`/api/notifications/estado?page=${pageToUse}`)

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Error al cargar estado de notificaciones')
      }

      const data = await response.json()
      setRegistros(data.registros || [])
      setPagination(data.pagination)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchEstado(page)
  }, [page, fetchEstado])

  const handlePrevPage = () => {
    setPage((p) => Math.max(1, p - 1))
  }

  const handleNextPage = () => {
    setPage((p) => p + 1)
  }

  const handleRefresh = () => {
    fetchEstado(page)
  }

  return {
    registros,
    pagination,
    page,
    loading,
    error,
    handlePrevPage,
    handleNextPage,
    handleRefresh
  }
}