'use client'

import Link from 'next/link'
import { usePicoPlaca, DIAS_SEMANA, EstadoFiltro } from './hooks/usePicoPlaca'

export default function PicoPlacaPage() {
  const {
    therapists, loading, error,
    currentPage, totalPages, total,
    searchTerm, setSearchTerm, isSearching,
    estado, handleChangeEstado,
    handleSearch, handleClearSearch,
    handleNextPage, handlePrevPage, handlePageClick,
    saveStatus, toggleDia,
  } = usePicoPlaca()

  const filtros: { key: EstadoFiltro; label: string }[] = [
    { key: 'activo', label: 'Activos' },
    { key: 'inactivo', label: 'Inactivos' },
    { key: 'todos', label: 'Todos' },
  ]

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
      <div className="max-w-5xl mx-auto">
        <div className="mb-8">
          <Link
            href="/home"
            className="text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 font-medium mb-4 inline-block"
          >
            ← Volver al Home
          </Link>
          <h1 className="text-3xl font-bold text-zinc-900 dark:text-zinc-50 mb-2">
            Pico y Placa de Terapeutas
          </h1>
          <p className="text-zinc-600 dark:text-zinc-400">
            Marca los días en que cada terapeuta tiene restricción de pico y placa. Los cambios se guardan automáticamente.
          </p>

          {/* Filtro de estado */}
          <div className="mt-6 flex gap-2">
            {filtros.map((f) => (
              <button
                key={f.key}
                onClick={() => handleChangeEstado(f.key)}
                className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
                  estado === f.key
                    ? 'bg-slate-600 text-white'
                    : 'bg-zinc-200 dark:bg-zinc-700 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-300 dark:hover:bg-zinc-600'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          {/* Barra de búsqueda */}
          <div className="mt-4 flex flex-col sm:flex-row gap-2">
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

          <div className="mt-4 text-sm text-zinc-600 dark:text-zinc-400">
            Mostrando {therapists.length} de {total} terapeuta(s)
            {searchTerm && ` (búsqueda: "${searchTerm}")`}
          </div>
        </div>

        {therapists.length === 0 ? (
          <div className="bg-white dark:bg-zinc-800 rounded-lg shadow p-8 text-center">
            <p className="text-zinc-600 dark:text-zinc-400">No hay terapeutas para este filtro</p>
          </div>
        ) : (
          <div className="space-y-4">
            {therapists.map((therapist) => {
              const diasSeleccionados = therapist.pico_placa_dias || []
              const status = saveStatus[therapist.id] || 'idle'

              return (
                <div
                  key={therapist.id}
                  className={`bg-white dark:bg-zinc-800 rounded-lg shadow-sm p-4 ${
                    !therapist.activo ? 'opacity-60' : ''
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
                          {therapist.nombre} {therapist.apellido}
                        </h3>
                        {!therapist.activo && (
                          <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-zinc-200 dark:bg-zinc-700 text-zinc-600 dark:text-zinc-300">
                            Inactivo
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-zinc-600 dark:text-zinc-400">
                        Placa: {therapist.placa_moto || 'No registrada'}
                      </p>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="flex gap-2">
                        {DIAS_SEMANA.map((dia) => {
                          const checked = diasSeleccionados.includes(dia.key)
                          return (
                            <label
                              key={dia.key}
                              className={`flex flex-col items-center gap-1 px-2 py-1.5 rounded-lg border cursor-pointer transition-colors select-none ${
                                checked
                                  ? 'bg-slate-600 border-slate-600 text-white'
                                  : 'bg-zinc-100 dark:bg-zinc-700 border-zinc-300 dark:border-zinc-600 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-600'
                              }`}
                            >
                              <input
                                type="checkbox"
                                checked={checked}
                                onChange={() => toggleDia(therapist.id, dia.key)}
                                className="sr-only"
                              />
                              <span className="text-xs font-semibold">{dia.label}</span>
                            </label>
                          )
                        })}
                      </div>

                      {/* Indicador de estado de guardado */}
                      <div className="w-20 text-sm flex-shrink-0">
                        {status === 'saving' && (
                          <span className="text-zinc-400">Guardando...</span>
                        )}
                        {status === 'saved' && (
                          <span className="text-green-600 dark:text-green-400 font-medium">✓ Guardado</span>
                        )}
                        {status === 'error' && (
                          <span className="text-red-600 dark:text-red-400 font-medium">✗ Error</span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}

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
    </div>
  )
}