'use client'

import Link from 'next/link'
import { useContinuationAlerts } from './hooks/useContinuationAlerts'
import AlertCard from './components/AlertCard'
import FiltersSection from './components/FiltersSection'

export default function ContinuationAlertsPage() {
  const {
    state,
    filtroTipo,
    deletingId,
    confirmDeleteId,
    handleFiltroChange,
    handlePageChange,
    handleConfirmDelete,
    handleCancelDelete,
    handleDelete
  } = useContinuationAlerts()

  const { alerts, total, page, total_pages, loading, error } = state

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-900 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">

        {/* Encabezado */}
        <div className="mb-8">
          <Link
            href="/home"
            className="inline-flex items-center text-teal-600 hover:text-teal-700 dark:text-teal-400 dark:hover:text-teal-300 mb-4 text-sm"
          >
            ← Volver al inicio
          </Link>
          <h1 className="text-3xl font-bold text-zinc-900 dark:text-zinc-50 mb-1">
            Seguimiento de Pacientes
          </h1>
          <p className="text-zinc-500 dark:text-zinc-400 text-sm">
            Pacientes que terminaron su valoración o paquete y pueden continuar el tratamiento
          </p>
        </div>

        {/* Filtros */}
        <FiltersSection
          filtroTipo={filtroTipo}
          total={total}
          onFiltroChange={handleFiltroChange}
        />

        {/* Estado de carga */}
        {loading && (
          <div className="flex justify-center py-16">
            <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-teal-600 border-r-transparent"></div>
          </div>
        )}

        {/* Error */}
        {error && !loading && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 text-red-600 dark:text-red-400 text-sm">
            {error}
          </div>
        )}

        {/* Lista vacía */}
        {!loading && !error && alerts.length === 0 && (
          <div className="text-center py-16">
            <div className="text-5xl mb-4">✅</div>
            <p className="text-zinc-500 dark:text-zinc-400 text-lg font-medium">
              No hay pacientes pendientes de contactar
            </p>
            <p className="text-zinc-400 dark:text-zinc-500 text-sm mt-1">
              Las alertas aparecerán automáticamente cuando un terapeuta complete una valoración o paquete
            </p>
          </div>
        )}

        {/* Lista de alertas */}
        {!loading && !error && alerts.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {alerts.map(alert => (
              <AlertCard
                key={alert.id}
                alert={alert}
                confirmDeleteId={confirmDeleteId}
                deletingId={deletingId}
                onConfirmDelete={handleConfirmDelete}
                onCancelDelete={handleCancelDelete}
                onDelete={handleDelete}
              />
            ))}
          </div>
        )}

        {/* Paginación */}
        {!loading && total_pages > 1 && (
          <div className="flex justify-center gap-2 mt-8">
            <button
              onClick={() => handlePageChange(page - 1)}
              disabled={page === 1}
              className="px-4 py-2 rounded-lg border border-zinc-300 dark:border-zinc-600 text-sm font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              ← Anterior
            </button>
            <span className="px-4 py-2 text-sm text-zinc-500 dark:text-zinc-400">
              Página {page} de {total_pages}
            </span>
            <button
              onClick={() => handlePageChange(page + 1)}
              disabled={page === total_pages}
              className="px-4 py-2 rounded-lg border border-zinc-300 dark:border-zinc-600 text-sm font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Siguiente →
            </button>
          </div>
        )}

      </div>
    </div>
  )
}