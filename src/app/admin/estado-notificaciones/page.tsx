'use client'

import Link from 'next/link'
import { useEstadoNotificaciones, type Semaforo } from './hooks/useEstadoNotificaciones'

const SEMAFORO_CONFIG: Record<Semaforo, { icon: string; label: string; bg: string }> = {
  rojo: { icon: '🔴', label: 'Crítico', bg: 'bg-red-50 dark:bg-red-900/20' },
  amarillo: { icon: '🟡', label: 'Revisar', bg: 'bg-amber-50 dark:bg-amber-900/20' },
  verde: { icon: '🟢', label: 'Todo bien', bg: 'bg-green-50 dark:bg-green-900/20' },
  gris: { icon: '⚪', label: 'Sin datos', bg: 'bg-zinc-50 dark:bg-zinc-700/40' }
}

const PLATAFORMA_LABEL: Record<string, string> = {
  android: '🤖 Android',
  ios: '🍎 iOS',
  desktop: '💻 Desktop',
  unknown: '❔ Desconocida'
}

export default function EstadoNotificacionesPage() {
  const {
    registros,
    pagination,
    page,
    loading,
    error,
    handlePrevPage,
    handleNextPage,
    handleRefresh
  } = useEstadoNotificaciones()

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-900 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <Link
            href="/home"
            className="inline-flex items-center text-sm text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 mb-4"
          >
            ← Volver al menú
          </Link>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-zinc-900 dark:text-white">
                Estado de Notificaciones Push
              </h1>
              <p className="text-zinc-600 dark:text-zinc-400 mt-2">
                Plataforma, instalación y confirmación real de entrega por terapeuta (últimos 7 días)
              </p>
            </div>
            <button
              onClick={handleRefresh}
              disabled={loading}
              className="px-4 py-2 bg-slate-600 text-white text-sm font-medium rounded-lg hover:bg-slate-700 disabled:opacity-50 transition-colors"
            >
              🔄 Actualizar
            </button>
          </div>
        </div>

        {/* Mensajes */}
        {error && (
          <div className="mb-6 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
            <p className="text-red-800 dark:text-red-200">{error}</p>
          </div>
        )}

        {/* Tabla */}
        <div className="bg-white dark:bg-zinc-800 rounded-lg shadow-md overflow-hidden">
          {loading ? (
            <div className="p-8 text-center text-zinc-600 dark:text-zinc-400">
              Cargando...
            </div>
          ) : registros.length === 0 ? (
            <div className="p-8 text-center text-zinc-600 dark:text-zinc-400">
              No hay terapeutas activos para mostrar
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-zinc-100 dark:bg-zinc-700">
                  <tr>
                    <th className="px-4 py-3 text-left font-medium text-zinc-700 dark:text-zinc-300">Terapeuta</th>
                    <th className="px-4 py-3 text-left font-medium text-zinc-700 dark:text-zinc-300">Plataforma</th>
                    <th className="px-4 py-3 text-left font-medium text-zinc-700 dark:text-zinc-300">Instalada</th>
                    <th className="px-4 py-3 text-left font-medium text-zinc-700 dark:text-zinc-300">Suscripción</th>
                    <th className="px-4 py-3 text-left font-medium text-zinc-700 dark:text-zinc-300">Confirmados / Enviados</th>
                    <th className="px-4 py-3 text-left font-medium text-zinc-700 dark:text-zinc-300">Estado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-200 dark:divide-zinc-700">
                  {registros.map((r) => {
                    const config = SEMAFORO_CONFIG[r.semaforo]
                    return (
                      <tr key={r.therapist_id} className={config.bg}>
                        <td className="px-4 py-3 font-medium text-zinc-900 dark:text-white">
                          {r.nombre}
                        </td>
                        <td className="px-4 py-3 text-zinc-700 dark:text-zinc-300">
                          {PLATAFORMA_LABEL[r.plataforma]}
                        </td>
                        <td className="px-4 py-3 text-zinc-700 dark:text-zinc-300">
                          {r.instalada ? '✅ Sí' : '❌ No'}
                        </td>
                        <td className="px-4 py-3 text-zinc-700 dark:text-zinc-300">
                          {r.suscripcion_activa ? '✅ Activa' : '❌ Sin suscripción'}
                        </td>
                        <td className="px-4 py-3 text-zinc-700 dark:text-zinc-300">
                          {r.enviados > 0 ? `${r.confirmados}/${r.enviados}` : '—'}
                        </td>
                        <td className="px-4 py-3">
                          <span className="inline-flex items-center gap-1.5 font-medium text-zinc-800 dark:text-zinc-200" title={r.accion_sugerida}>
                            {config.icon} {config.label}
                          </span>
                          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                            {r.accion_sugerida}
                          </p>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Paginación */}
        {pagination && pagination.totalPages > 1 && (
          <div className="flex items-center justify-between mt-4">
            <button
              onClick={handlePrevPage}
              disabled={page === 1}
              className="px-4 py-2 bg-slate-600 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-700 transition-colors text-sm"
            >
              ← Anterior
            </button>

            <span className="text-sm text-zinc-600 dark:text-zinc-400">
              Página {page} de {pagination.totalPages} — {pagination.total} terapeutas
            </span>

            <button
              onClick={handleNextPage}
              disabled={!pagination.hasMore}
              className="px-4 py-2 bg-slate-600 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-700 transition-colors text-sm"
            >
              Siguiente →
            </button>
          </div>
        )}
      </div>
    </div>
  )
}