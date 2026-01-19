'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

interface Therapist {
  id: string
  nombre: string
  apellido: string
}

interface PreviewRegistro {
  id: string
  terapeuta: string
  paciente: string
  fecha: string
  estado: string
}

interface PreviewPagination {
  page: number
  limit: number
  total: number
  totalPages: number
  hasMore: boolean
}

export default function LimpiezaDatosPage() {
  const [activeTab, setActiveTab] = useState<'terapeuta' | 'fechas'>('terapeuta')
  
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

  // Cargar preview
  const handleLoadPreview = async () => {
    setError('')
    setSuccess('')
    setLoadingPreview(true)
    setShowPreview(false)

    try {
      const params = new URLSearchParams({
        page: previewPage.toString(),
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

      const response = await fetch(`/api/attendance/cleanup/preview?${params}`)
      
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
        endpoint = '/api/attendance/cleanup/by-therapist'
        body = {
          therapist_id: selectedTherapist,
          confirmacion
        }
      } else {
        endpoint = '/api/attendance/cleanup/by-dates'
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

  // Formatear fecha
  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('es-CO', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-900 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <Link
            href="/home"
            className="inline-flex items-center text-sm text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 mb-4"
          >
            ← Volver al menú
          </Link>
          <h1 className="text-3xl font-bold text-zinc-900 dark:text-white">
            Limpieza de Datos GPS
          </h1>
          <p className="text-zinc-600 dark:text-zinc-400 mt-2">
            Eliminar registros GPS por terapeuta o por rango de fechas
          </p>
          
          {/* Advertencia */}
          <div className="mt-4 bg-red-50 dark:bg-red-900/20 border-l-4 border-red-500 p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-500" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800 dark:text-red-200">
                  ⚠️ ADVERTENCIA: Esta acción es irreversible
                </h3>
                <p className="text-sm text-red-700 dark:text-red-300 mt-1">
                  Los registros eliminados NO se pueden recuperar. Asegúrate de hacer un backup antes de continuar.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-white dark:bg-zinc-800 rounded-lg shadow-md mb-6">
          <div className="flex border-b border-zinc-200 dark:border-zinc-700">
            <button
              onClick={() => {
                setActiveTab('terapeuta')
                setError('')
                setSuccess('')
                setShowPreview(false)
                setConfirmacion('')
              }}
              className={`flex-1 px-6 py-4 text-sm font-medium transition-colors ${
                activeTab === 'terapeuta'
                  ? 'border-b-2 border-emerald-500 text-emerald-600 dark:text-emerald-400'
                  : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200'
              }`}
            >
              🧑‍⚕️ Por Terapeuta
            </button>
            <button
              onClick={() => {
                setActiveTab('fechas')
                setError('')
                setSuccess('')
                setShowPreview(false)
                setConfirmacion('')
              }}
              className={`flex-1 px-6 py-4 text-sm font-medium transition-colors ${
                activeTab === 'fechas'
                  ? 'border-b-2 border-emerald-500 text-emerald-600 dark:text-emerald-400'
                  : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200'
              }`}
            >
              📅 Por Fechas
            </button>
          </div>

          {/* Contenido del tab */}
          <div className="p-6">
            {/* Tab: Por Terapeuta */}
            {activeTab === 'terapeuta' && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                    Seleccionar Terapeuta
                  </label>
                  <select
                    value={selectedTherapist}
                    onChange={(e) => {
                      setSelectedTherapist(e.target.value)
                      setShowPreview(false)
                      setError('')
                      setSuccess('')
                    }}
                    className="w-full px-4 py-3 border border-zinc-300 dark:border-zinc-600 rounded-lg bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                  >
                    <option value="">-- Selecciona un terapeuta --</option>
                    {therapists.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.nombre} {t.apellido}
                      </option>
                    ))}
                  </select>
                </div>
                <p className="text-sm text-zinc-600 dark:text-zinc-400">
                  Se eliminarán TODOS los registros GPS de este terapeuta (sin importar la fecha).
                </p>
              </div>
            )}

            {/* Tab: Por Fechas */}
            {activeTab === 'fechas' && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                      Fecha Desde
                    </label>
                    <input
                      type="date"
                      value={fechaDesde}
                      onChange={(e) => {
                        setFechaDesde(e.target.value)
                        setShowPreview(false)
                        setError('')
                        setSuccess('')
                      }}
                      className="w-full px-4 py-3 border border-zinc-300 dark:border-zinc-600 rounded-lg bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                      Fecha Hasta
                    </label>
                    <input
                      type="date"
                      value={fechaHasta}
                      onChange={(e) => {
                        setFechaHasta(e.target.value)
                        setShowPreview(false)
                        setError('')
                        setSuccess('')
                      }}
                      className="w-full px-4 py-3 border border-zinc-300 dark:border-zinc-600 rounded-lg bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                    />
                  </div>
                </div>
                <p className="text-sm text-zinc-600 dark:text-zinc-400">
                  Se eliminarán TODOS los registros GPS de TODOS los terapeutas en este rango de fechas.
                </p>
              </div>
            )}

            {/* Botón de vista previa */}
            <div className="mt-6">
              <button
                onClick={handleLoadPreview}
                disabled={loadingPreview}
                className="w-full px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {loadingPreview ? 'Cargando...' : '👁️ Ver Vista Previa'}
              </button>
            </div>
          </div>
        </div>

        {/* Mensajes */}
        {error && (
          <div className="mb-6 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
            <p className="text-red-800 dark:text-red-200">{error}</p>
          </div>
        )}

        {success && (
          <div className="mb-6 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
            <p className="text-green-800 dark:text-green-200">✅ {success}</p>
          </div>
        )}

        {/* Vista Previa */}
        {showPreview && previewPagination && (
          <div className="bg-white dark:bg-zinc-800 rounded-lg shadow-md p-6 mb-6">
            <h2 className="text-xl font-bold text-zinc-900 dark:text-white mb-4">
              Vista Previa - {previewPagination.total} registros
            </h2>

            {preview.length > 0 ? (
              <>
                <div className="space-y-2 max-h-96 overflow-y-auto mb-4">
                  {preview.map((reg) => (
                    <div
                      key={reg.id}
                      className="flex items-center justify-between p-3 bg-zinc-50 dark:bg-zinc-700 rounded-lg text-sm"
                    >
                      <div className="flex-1">
                        <span className="font-medium text-zinc-900 dark:text-white">
                          {reg.terapeuta} → {reg.paciente}
                        </span>
                      </div>
                      <div className="flex items-center gap-4 text-zinc-600 dark:text-zinc-400">
                        <span>{formatDate(reg.fecha)}</span>
                        <span className={
                          reg.estado === 'Completo' ? 'text-green-600' :
                          reg.estado === 'Incompleto' ? 'text-yellow-600' :
                          'text-red-600'
                        }>
                          {reg.estado}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Paginación del preview */}
                {previewPagination.totalPages > 1 && (
                  <div className="flex items-center justify-between mt-4 pt-4 border-t border-zinc-200 dark:border-zinc-700">
                    <button
                      onClick={() => {
                        setPreviewPage(p => Math.max(1, p - 1))
                        handleLoadPreview()
                      }}
                      disabled={previewPage === 1}
                      className="px-4 py-2 bg-slate-600 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-700 transition-colors text-sm"
                    >
                      ← Anterior
                    </button>
                    
                    <span className="text-sm text-zinc-600 dark:text-zinc-400">
                      Mostrando {preview.length} de {previewPagination.total} registros
                    </span>
                    
                    <button
                      onClick={() => {
                        setPreviewPage(p => p + 1)
                        handleLoadPreview()
                      }}
                      disabled={!previewPagination.hasMore}
                      className="px-4 py-2 bg-slate-600 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-700 transition-colors text-sm"
                    >
                      Siguiente →
                    </button>
                  </div>
                )}
              </>
            ) : (
              <p className="text-zinc-600 dark:text-zinc-400">No hay registros para mostrar</p>
            )}
          </div>
        )}

        {/* Sección de Confirmación */}
        {showPreview && previewPagination && previewPagination.total > 0 && (
          <div className="bg-white dark:bg-zinc-800 rounded-lg shadow-md p-6">
            <h2 className="text-xl font-bold text-red-600 dark:text-red-400 mb-4">
              ⚠️ Confirmación de Eliminación
            </h2>
            
            <div className="mb-4">
              <p className="text-zinc-700 dark:text-zinc-300 mb-2">
                Estás a punto de eliminar <strong>{previewPagination.total} registros</strong>. 
                Esta acción NO se puede deshacer.
              </p>
              <p className="text-zinc-700 dark:text-zinc-300">
                Para confirmar, escribe <strong className="text-red-600">ELIMINAR</strong> en el campo de abajo:
              </p>
            </div>

            <input
              type="text"
              value={confirmacion}
              onChange={(e) => setConfirmacion(e.target.value.toUpperCase())}
              placeholder="Escribe ELIMINAR para confirmar"
              className="w-full px-4 py-3 border-2 border-red-300 dark:border-red-700 rounded-lg bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white focus:ring-2 focus:ring-red-500 focus:border-transparent mb-4"
            />

            <button
              onClick={handleDelete}
              disabled={loading || confirmacion !== 'ELIMINAR'}
              className="w-full px-6 py-3 bg-red-600 text-white font-bold rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? 'Eliminando...' : `🗑️ ELIMINAR ${previewPagination.total} REGISTROS`}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}