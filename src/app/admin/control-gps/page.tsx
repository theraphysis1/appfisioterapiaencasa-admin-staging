'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'

interface Registro {
  id: string
  appointment_id: string | null
  terapeuta: string
  paciente: string
  fecha_programada: string | null
  hora_llegada_real: string | null
  hora_salida_real: string | null
  duracion_minutos: number | null
  device_model_llegada: string | null
  device_model_salida: string | null
  dispositivo_consistente: boolean | null
  fingerprint_consistente: boolean | null
  distancia_llegada_metros: number | null
  distancia_salida_metros: number | null
  llegada_registrada: boolean
  salida_registrada: boolean
  registro_completo: boolean
  observaciones: string | null
  created_at: string
}

interface Pagination {
  page: number
  limit: number
  total: number
  totalPages: number
  hasMore: boolean
}

export default function ControlGPSPage() {
  const [registros, setRegistros] = useState<Registro[]>([])
  const [pagination, setPagination] = useState<Pagination | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  // Filtros
  const [selectedDate, setSelectedDate] = useState('')
  const [selectedEstado, setSelectedEstado] = useState('todos')
  const [currentPage, setCurrentPage] = useState(1)

  // Inicializar fecha a hoy
  useEffect(() => {
    const today = new Date().toISOString().split('T')[0]
    setSelectedDate(today)
  }, [])

  // Cargar registros
  useEffect(() => {
    if (!selectedDate) return

    const fetchRegistros = async () => {
      setLoading(true)
      setError('')

      try {
        const params = new URLSearchParams({
          page: currentPage.toString(),
          limit: '20',
          fecha_desde: selectedDate,
          fecha_hasta: selectedDate
        })

        if (selectedEstado !== 'todos') {
          params.append('estado', selectedEstado)
        }

        const response = await fetch(`/api/attendance/records?${params}`)
        
        if (!response.ok) {
          throw new Error('Error al cargar los registros')
        }

        const data = await response.json()
        setRegistros(data.registros || [])
        setPagination(data.pagination)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Error desconocido')
      } finally {
        setLoading(false)
      }
    }

    fetchRegistros()
  }, [selectedDate, selectedEstado, currentPage])

  // Calcular resumen
  const resumen = {
    completos: registros.filter(r => r.registro_completo).length,
    sin_registro: registros.filter(r => !r.llegada_registrada).length,
    incompletos: registros.filter(r => r.llegada_registrada && !r.salida_registrada).length
  }

  // Formatear fecha
  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'N/A'
    const date = new Date(dateString)
    return date.toLocaleDateString('es-CO', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    })
  }

  // Formatear hora
  const formatTime = (dateString: string | null) => {
    if (!dateString) return 'Sin registro'
    const date = new Date(dateString)
    return date.toLocaleTimeString('es-CO', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    })
  }

  // Obtener estado visual
  const getEstadoVisual = (registro: Registro) => {
    if (registro.registro_completo) {
      return {
        icon: '✅',
        text: 'Completo',
        color: 'text-green-600 dark:text-green-400'
      }
    }
    if (registro.llegada_registrada && !registro.salida_registrada) {
      return {
        icon: '⚠️',
        text: 'Sin salida',
        color: 'text-yellow-600 dark:text-yellow-400'
      }
    }
    return {
      icon: '🔴',
      text: 'Sin registro',
      color: 'text-red-600 dark:text-red-400'
    }
  }

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-900 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <Link
            href="/home"
            className="inline-flex items-center text-sm text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 mb-4"
          >
            ← Volver al menú
          </Link>
          <h1 className="text-3xl font-bold text-zinc-900 dark:text-white">
            Control de Asistencia GPS
          </h1>
          <p className="text-zinc-600 dark:text-zinc-400 mt-2">
            Monitoreo diario de registros GPS de terapeutas
          </p>
        </div>

        {/* Filtros */}
        <div className="bg-white dark:bg-zinc-800 rounded-lg shadow-md p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Filtro de fecha */}
            <div>
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                Fecha
              </label>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => {
                  setSelectedDate(e.target.value)
                  setCurrentPage(1)
                }}
                className="w-full px-4 py-2 border border-zinc-300 dark:border-zinc-600 rounded-lg bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              />
            </div>

            {/* Filtro de estado */}
            <div>
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                Estado
              </label>
              <select
                value={selectedEstado}
                onChange={(e) => {
                  setSelectedEstado(e.target.value)
                  setCurrentPage(1)
                }}
                className="w-full px-4 py-2 border border-zinc-300 dark:border-zinc-600 rounded-lg bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              >
                <option value="todos">Todos</option>
                <option value="completo">Completos</option>
                <option value="incompleto">Incompletos</option>
                <option value="sin_registro">Sin registro</option>
              </select>
            </div>

            {/* Resumen */}
            <div className="flex items-end">
              <div className="w-full bg-zinc-100 dark:bg-zinc-700 rounded-lg p-3">
                <div className="text-xs text-zinc-600 dark:text-zinc-400 mb-1">Resumen:</div>
                <div className="flex gap-4 text-sm">
                  <span className="text-green-600 dark:text-green-400">✅ {resumen.completos}</span>
                  <span className="text-yellow-600 dark:text-yellow-400">⚠️ {resumen.incompletos}</span>
                  <span className="text-red-600 dark:text-red-400">🔴 {resumen.sin_registro}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Loading */}
        {loading && (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-emerald-500 border-t-transparent"></div>
            <p className="text-zinc-600 dark:text-zinc-400 mt-4">Cargando registros...</p>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 mb-6">
            <p className="text-red-800 dark:text-red-200">{error}</p>
          </div>
        )}

        {/* Lista de registros */}
        {!loading && !error && (
          <>
            {registros.length === 0 ? (
              <div className="bg-white dark:bg-zinc-800 rounded-lg shadow-md p-12 text-center">
                <p className="text-zinc-600 dark:text-zinc-400 text-lg">
                  No hay registros para la fecha seleccionada
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {registros.map((registro) => {
                  const estado = getEstadoVisual(registro)
                  
                  return (
                    <div
                      key={registro.id}
                      className="bg-white dark:bg-zinc-800 rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow"
                    >
                      <div className="flex items-start justify-between">
                        {/* Info principal */}
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <span className="text-2xl">{estado.icon}</span>
                            <div>
                              <h3 className="text-lg font-semibold text-zinc-900 dark:text-white">
                                {registro.terapeuta} → {registro.paciente}
                              </h3>
                              <p className={`text-sm font-medium ${estado.color}`}>
                                {estado.text}
                              </p>
                            </div>
                          </div>

                          {/* Detalles */}
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4 text-sm">
                            <div>
                              <span className="text-zinc-600 dark:text-zinc-400">Programada:</span>
                              <p className="font-medium text-zinc-900 dark:text-white">
                                {formatTime(registro.fecha_programada)}
                              </p>
                            </div>
                            <div>
                              <span className="text-zinc-600 dark:text-zinc-400">Llegada:</span>
                              <p className="font-medium text-zinc-900 dark:text-white">
                                {formatTime(registro.hora_llegada_real)}
                              </p>
                            </div>
                            <div>
                              <span className="text-zinc-600 dark:text-zinc-400">Salida:</span>
                              <p className="font-medium text-zinc-900 dark:text-white">
                                {formatTime(registro.hora_salida_real)}
                              </p>
                            </div>
                          </div>

                          {/* Info adicional */}
                          {(registro.registro_completo || registro.llegada_registrada) && (
                            <div className="mt-4 pt-4 border-t border-zinc-200 dark:border-zinc-700">
                              <div className="flex flex-wrap gap-4 text-sm">
                                {/* Duración (solo si está completo) */}
                                {registro.registro_completo && registro.duracion_minutos !== null && (
                                  <div>
                                    <span className="text-zinc-600 dark:text-zinc-400">Duración:</span>
                                    <span className="ml-2 font-medium text-zinc-900 dark:text-white">
                                      {registro.duracion_minutos} min
                                    </span>
                                  </div>
                                )}

                                {/* Tiempo transcurrido (solo si tiene llegada pero no salida) */}
                                {registro.llegada_registrada && !registro.salida_registrada && registro.hora_llegada_real && (
                                  <div>
                                    <span className="text-zinc-600 dark:text-zinc-400">Tiempo transcurrido:</span>
                                    <span className="ml-2 font-medium text-yellow-600 dark:text-yellow-400">
                                      {Math.round((new Date().getTime() - new Date(registro.hora_llegada_real).getTime()) / 1000 / 60)} min
                                    </span>
                                  </div>
                                )}

                                {/* Dispositivo de llegada */}
                                {registro.device_model_llegada && (
                                  <div>
                                    <span className="text-zinc-600 dark:text-zinc-400">Dispositivo llegada:</span>
                                    <span className="ml-2 font-medium text-zinc-900 dark:text-white">
                                      {registro.device_model_llegada}
                                    </span>
                                  </div>
                                )}

                                {/* Dispositivo de salida (solo si está completo) */}
                                {registro.registro_completo && registro.device_model_salida && (
                                  <div>
                                    <span className="text-zinc-600 dark:text-zinc-400">Dispositivo salida:</span>
                                    <span className="ml-2 font-medium text-zinc-900 dark:text-white">
                                      {registro.device_model_salida}
                                    </span>
                                  </div>
                                )}

                                {/* Consistencia de dispositivo (solo si está completo) */}
                                {registro.registro_completo && registro.dispositivo_consistente !== null && (
                                  <div>
                                    <span className="text-zinc-600 dark:text-zinc-400">Consistencia:</span>
                                    <span className="ml-2 font-medium text-zinc-900 dark:text-white">
                                      {registro.dispositivo_consistente ? '✓ Consistente' : '⚠️ Diferente'}
                                    </span>
                                  </div>
                                )}

                                {/* Distancia de llegada */}
                                {registro.distancia_llegada_metros !== null && (
                                  <div>
                                    <span className="text-zinc-600 dark:text-zinc-400">Distancia llegada:</span>
                                    <span className="ml-2 font-medium text-zinc-900 dark:text-white">
                                      {registro.distancia_llegada_metros}m
                                    </span>
                                  </div>
                                )}

                                {/* Distancia de salida (solo si está completo) */}
                                {registro.registro_completo && registro.distancia_salida_metros !== null && (
                                  <div>
                                    <span className="text-zinc-600 dark:text-zinc-400">Distancia salida:</span>
                                    <span className="ml-2 font-medium text-zinc-900 dark:text-white">
                                      {registro.distancia_salida_metros}m
                                    </span>
                                  </div>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}

            {/* Paginación */}
            {pagination && pagination.totalPages > 1 && (
              <div className="mt-8 flex items-center justify-between">
                <button
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="px-4 py-2 bg-slate-600 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-700 transition-colors"
                >
                  ← Anterior
                </button>
                
                <span className="text-zinc-600 dark:text-zinc-400">
                  Página {currentPage} de {pagination.totalPages} ({pagination.total} registros)
                </span>
                
                <button
                  onClick={() => setCurrentPage(p => p + 1)}
                  disabled={!pagination.hasMore}
                  className="px-4 py-2 bg-slate-600 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-700 transition-colors"
                >
                  Siguiente →
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}