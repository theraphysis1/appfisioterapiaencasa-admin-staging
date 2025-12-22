'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

interface Therapist {
  id: string
  nombre: string
  apellido: string
  email: string
  contacto: string
  cedula: string
  placa_moto: string | null
  created_at: string
}

export default function TherapistsPage() {
  const [therapists, setTherapists] = useState<Therapist[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [total, setTotal] = useState(0)
  const [searchTerm, setSearchTerm] = useState('')
  const [isSearching, setIsSearching] = useState(false)
  const router = useRouter()

  const handleSearch = async () => {
    setIsSearching(true)
    setCurrentPage(1)
    await fetchTherapists(1, searchTerm)
    setIsSearching(false)
  }

  const handleClearSearch = async () => {
    setSearchTerm('')
    setCurrentPage(1)
    await fetchTherapists(1, '')
  }

  const handleNextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1)
    }
  }

  const handlePrevPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1)
    }
  }

  const handlePageClick = (page: number) => {
    setCurrentPage(page)
  }

  const handleDelete = async (therapistId: string, therapistName: string) => {
    if (!confirm(`¿Estás seguro de eliminar a ${therapistName}?`)) {
      return
    }

    try {
      const response = await fetch(`/api/therapists/${therapistId}`, {
        method: 'DELETE',
      })

      const data = await response.json()

      if (!response.ok) {
        alert(data.error || 'Error al eliminar el terapeuta')
        return
      }

      // Recargar la lista
      fetchTherapists()
    } catch (err) {
      console.error('Delete error:', err)
      alert('Error de conexión')
    }
  }

  useEffect(() => {
    fetchTherapists(currentPage, searchTerm)
  }, [currentPage])

  const fetchTherapists = async (page = 1, search = '') => {
    try {
      setLoading(true)
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '20'
      })
      
      if (search) {
        params.append('search', search)
      }
      
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
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-50 dark:bg-zinc-900 flex items-center justify-center">
        <div className="text-lg text-zinc-600 dark:text-zinc-400">Cargando terapeutas...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-zinc-50 dark:bg-zinc-900 flex items-center justify-center">
        <div className="text-lg text-red-600 dark:text-red-400">{error}</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-900 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <Link
            href="/home"
            className="text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 font-medium mb-4 inline-block"
          >
            ← Volver al Home
          </Link>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <h1 className="text-3xl font-bold text-zinc-900 dark:text-zinc-50">
              Lista de Terapeutas
            </h1>
            <Link
              href="/therapists/create"
              className="w-full sm:w-auto bg-green-600 hover:bg-green-700 text-white font-semibold px-4 sm:px-6 py-2.5 sm:py-3 rounded-lg transition-colors text-center text-sm sm:text-base whitespace-nowrap"
            >
              + Crear Terapeuta
            </Link>
          </div>

          {/* Barra de búsqueda */}
          <div className="mt-6 flex flex-col sm:flex-row gap-2">
            <input
              type="text"
              placeholder="Buscar por nombre, apellido o cédula..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              className="flex-1 px-4 py-2 border border-zinc-300 dark:border-zinc-600 rounded-lg bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <div className="flex gap-2">
              <button
                onClick={handleSearch}
                disabled={isSearching}
                className="flex-1 sm:flex-none px-6 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-semibold rounded-lg transition-colors"
              >
                {isSearching ? 'Buscando...' : 'Buscar'}
              </button>
              {searchTerm && (
                <button
                  onClick={handleClearSearch}
                  className="flex-1 sm:flex-none px-4 py-2 bg-zinc-500 hover:bg-zinc-600 text-white font-semibold rounded-lg transition-colors"
                >
                  Limpiar
                </button>
              )}
            </div>
          </div>

          {/* Información de resultados */}
          {!loading && (
            <div className="mt-4 text-sm text-zinc-600 dark:text-zinc-400">
              Mostrando {therapists.length} de {total} terapeuta(s)
              {searchTerm && ` (búsqueda: "${searchTerm}")`}
            </div>
          )}
        </div>

        {therapists.length === 0 ? (
          <div className="bg-white dark:bg-zinc-800 rounded-lg shadow p-8 text-center">
            <p className="text-zinc-600 dark:text-zinc-400">No hay terapeutas registrados</p>
            <Link
              href="/therapists/create"
              className="inline-block mt-4 text-blue-600 hover:text-blue-700 dark:text-blue-400 font-medium"
            >
              Crear el primer terapeuta
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {therapists.map((therapist) => (
              <div
                key={therapist.id}
                className="bg-white dark:bg-zinc-800 rounded-lg shadow-sm p-4 flex items-start gap-4"
              >
                {/* Avatar */}
                <div className="flex-shrink-0">
                  <div className="w-16 h-16 bg-zinc-300 dark:bg-zinc-600 rounded-full flex items-center justify-center">
                    <svg className="w-8 h-8 text-zinc-600 dark:text-zinc-300" fill="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
                    </svg>
                  </div>
                </div>

                {/* Información */}
                <div className="flex-1 min-w-0">
                  <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50 mb-1">
                    {therapist.nombre} {therapist.apellido}
                  </h3>
                  <div className="space-y-0.5 text-sm text-zinc-600 dark:text-zinc-400">
                    <p>Contacto: {therapist.contacto}</p>
                    <p>Cédula: {therapist.cedula}</p>
                    <p>Placa: {therapist.placa_moto || 'No registrada'}</p>
                  </div>
                </div>

                {/* Botones de acción */}
                <div className="flex-shrink-0 flex gap-3">
                  <button
                    onClick={() => router.push(`/therapists/${therapist.id}/edit`)}
                    className="text-blue-500 hover:text-blue-600 dark:text-blue-400 dark:hover:text-blue-300 transition-colors"
                    title="Editar terapeuta"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                  </button>
                  <button
                    onClick={() => handleDelete(therapist.id, `${therapist.nombre} ${therapist.apellido}`)}
                    className="text-red-500 hover:text-red-600 dark:text-red-400 dark:hover:text-red-300 transition-colors"
                    title="Eliminar terapeuta"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      {/* Controles de paginación */}
        {totalPages > 1 && (
          <div className="mt-8 flex flex-col sm:flex-row items-center justify-between gap-4 bg-white dark:bg-zinc-800 rounded-lg shadow-sm p-4">
            <button
              onClick={handlePrevPage}
              disabled={currentPage === 1}
              className="w-full sm:w-auto px-6 py-2 bg-slate-600 hover:bg-slate-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition-colors"
            >
              ← Anterior
            </button>

            <div className="flex items-center gap-2">
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                <button
                  key={page}
                  onClick={() => handlePageClick(page)}
                  className={`w-10 h-10 rounded-lg font-semibold transition-colors ${
                    page === currentPage
                      ? 'bg-blue-600 text-white'
                      : 'bg-zinc-200 dark:bg-zinc-700 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-300 dark:hover:bg-zinc-600'
                  }`}
                >
                  {page}
                </button>
              ))}
            </div>

            <button
              onClick={handleNextPage}
              disabled={currentPage === totalPages}
              className="w-full sm:w-auto px-6 py-2 bg-slate-600 hover:bg-slate-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition-colors"
            >
              Siguiente →
            </button>
          </div>
        )}
    </div>
  )
}