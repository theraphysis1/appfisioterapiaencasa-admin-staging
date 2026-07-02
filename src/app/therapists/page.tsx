'use client'

import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useTherapists, EstadoFiltro } from './hooks/useTherapists'

export default function TherapistsPage() {
  const router = useRouter()
  const {
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
  } = useTherapists()

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
            {therapists.map((therapist) => (
              <div
                key={therapist.id}
                className={`bg-white dark:bg-zinc-800 rounded-lg shadow-sm p-4 flex items-start gap-4 ${
                  !therapist.activo ? 'opacity-60' : ''
                }`}
              >
                <div className="flex-shrink-0">
                  <div className="w-16 h-16 bg-zinc-300 dark:bg-zinc-600 rounded-full flex items-center justify-center">
                    <svg className="w-8 h-8 text-zinc-600 dark:text-zinc-300" fill="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
                    </svg>
                  </div>
                </div>

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
                  <div className="space-y-0.5 text-sm text-zinc-600 dark:text-zinc-400">
                    <p>Contacto: {therapist.contacto}</p>
                    <p>Cédula: {therapist.cedula}</p>
                    <p>Placa: {therapist.placa_moto || 'No registrada'}</p>
                  </div>
                </div>

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

                  {therapist.activo ? (
                    <button
                      onClick={() => openDeactivateModal(therapist)}
                      className="text-red-500 hover:text-red-600 dark:text-red-400 dark:hover:text-red-300 transition-colors"
                      title="Desactivar terapeuta"
                    >
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                      </svg>
                    </button>
                  ) : (
                    <button
                      onClick={() => openReactivateModal(therapist)}
                      className="text-green-500 hover:text-green-600 dark:text-green-400 dark:hover:text-green-300 transition-colors"
                      title="Reactivar terapeuta"
                    >
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

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

      {/* Modal: Desactivar */}
      {therapistToDeactivate && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-zinc-800 rounded-lg shadow-xl p-6 max-w-md w-full">
            <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-50 mb-2">
              ¿Desactivar a {therapistToDeactivate.nombre} {therapistToDeactivate.apellido}?
            </h3>
            <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-4">
              El terapeuta ya no aparecerá disponible para agendar nuevas citas ni paquetes,
              y su acceso a la app quedará bloqueado. Su historial de citas, comisiones e
              ingresos se conserva intacto.
            </p>

            {deactivateError && (
              <div className="mb-4 p-3 rounded-lg bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 text-sm text-red-700 dark:text-red-300">
                {deactivateError}
              </div>
            )}

            <div className="flex gap-3 justify-end">
              <button
                onClick={closeDeactivateModal}
                disabled={isDeactivating}
                className="px-4 py-2 rounded-lg bg-zinc-200 dark:bg-zinc-700 text-zinc-700 dark:text-zinc-300 font-semibold hover:bg-zinc-300 dark:hover:bg-zinc-600 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={confirmDeactivate}
                disabled={isDeactivating}
                className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 disabled:bg-red-400 text-white font-semibold transition-colors"
              >
                {isDeactivating ? 'Desactivando...' : 'Desactivar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Reactivar */}
      {therapistToReactivate && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-zinc-800 rounded-lg shadow-xl p-6 max-w-md w-full">
            <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-50 mb-2">
              ¿Reactivar a {therapistToReactivate.nombre} {therapistToReactivate.apellido}?
            </h3>
            <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-4">
              El terapeuta volverá a estar disponible para agendar citas y paquetes,
              y recuperará su acceso a la app.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={closeReactivateModal}
                disabled={isReactivating}
                className="px-4 py-2 rounded-lg bg-zinc-200 dark:bg-zinc-700 text-zinc-700 dark:text-zinc-300 font-semibold hover:bg-zinc-300 dark:hover:bg-zinc-600 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={confirmReactivate}
                disabled={isReactivating}
                className="px-4 py-2 rounded-lg bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white font-semibold transition-colors"
              >
                {isReactivating ? 'Reactivando...' : 'Reactivar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}