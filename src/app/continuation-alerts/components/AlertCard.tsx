import { ContinuationAlert } from '../hooks/useContinuationAlerts'

interface AlertCardProps {
  alert: ContinuationAlert
  confirmDeleteId: string | null
  deletingId: string | null
  onConfirmDelete: (id: string) => void
  onCancelDelete: () => void
  onDelete: (id: string) => void
}

const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString('es-CO', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })
}

export default function AlertCard({
  alert,
  confirmDeleteId,
  deletingId,
  onConfirmDelete,
  onCancelDelete,
  onDelete
}: AlertCardProps) {
  const isValoracion = alert.tipo_alerta === 'valoracion_completada'
  const isConfirming = confirmDeleteId === alert.id
  const isDeleting = deletingId === alert.id

  const servicioNombre = isValoracion
    ? alert.appointment?.service?.nombre || 'Valoración'
    : alert.package?.service?.nombre || 'Servicio'

  const fechaCompletado = formatDate(alert.fecha_completado)

  return (
    <div className={`bg-white dark:bg-zinc-800 rounded-lg shadow-md p-5 border-l-4 ${
      isValoracion ? 'border-purple-500' : 'border-blue-500'
    }`}>
      {/* Encabezado */}
      <div className="flex items-start justify-between mb-3">
        <div>
          <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-full mb-2 ${
            isValoracion
              ? 'bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300'
              : 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300'
          }`}>
            {isValoracion ? '🩺 Valoración Completada' : '📦 Paquete Completado'}
          </span>
          <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-50">
            {alert.patient?.nombre} {alert.patient?.apellido}
          </h3>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            {alert.patient?.barrio} · 📞 {alert.patient?.telefono}
          </p>
        </div>
      </div>

      {/* Detalle */}
      <div className="bg-zinc-50 dark:bg-zinc-700 rounded-lg p-3 mb-4 space-y-1">
        <p className="text-sm text-zinc-700 dark:text-zinc-300">
          <span className="font-medium">Servicio:</span> {servicioNombre}
        </p>
        {!isValoracion && (
          <p className="text-sm text-zinc-700 dark:text-zinc-300">
            <span className="font-medium">Sesiones completadas:</span> {alert.total_sesiones}
          </p>
        )}
        <p className="text-sm text-zinc-700 dark:text-zinc-300">
          <span className="font-medium">Fecha de finalización:</span> {fechaCompletado}
        </p>
      </div>

      {/* Acciones */}
      {!isConfirming ? (
        <button
          onClick={() => onConfirmDelete(alert.id)}
          disabled={isDeleting}
          className="w-full rounded-lg bg-red-50 border border-red-200 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-100 dark:bg-red-900/20 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-900/40 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isDeleting ? 'Eliminando...' : '✕ Paciente no quiere continuar'}
        </button>
      ) : (
        <div className="space-y-2">
          <p className="text-sm text-center text-zinc-600 dark:text-zinc-400 font-medium">
            ¿Confirmar que el paciente no quiere continuar?
          </p>
          <div className="flex gap-2">
            <button
              onClick={onCancelDelete}
              className="flex-1 rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-600 dark:text-zinc-300 dark:hover:bg-zinc-700 transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={() => onDelete(alert.id)}
              className="flex-1 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 transition-colors"
            >
              Sí, eliminar
            </button>
          </div>
        </div>
      )}
    </div>
  )
}