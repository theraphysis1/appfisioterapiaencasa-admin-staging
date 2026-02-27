import { ContinuationAlert, ContactLog, ContactFormData } from '../hooks/useContinuationAlerts'

interface AlertCardProps {
  alert: ContinuationAlert
  // Eliminar por no quiere continuar
  confirmDeleteId: string | null
  onConfirmDelete: (id: string) => void
  onCancelDelete: () => void
  onDelete: (id: string) => void
  // Eliminar por pagó y agendó
  confirmPaidId: string | null
  onConfirmPaid: (id: string) => void
  onCancelPaid: () => void
  onPaid: (id: string) => void
  // Estado general
  deletingId: string | null
  // Contacto
  contactModalId: string | null
  contactForm: ContactFormData
  savingContact: boolean
  contactError: string | null
  onOpenContactModal: (id: string) => void
  onCloseContactModal: () => void
  onContactFormChange: (field: keyof ContactFormData, value: string) => void
  onSaveContact: (alertId: string) => void
  // Historial
  historialId: string | null
  historialData: ContactLog[]
  loadingHistorial: boolean
  onOpenHistorial: (id: string) => void
  onCloseHistorial: () => void
}

const formatDate = (dateString: string) => {
  const [year, month, day] = dateString.split('T')[0].split('-').map(Number)
  return new Date(year, month - 1, day).toLocaleDateString('es-CO', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })
}

const formatDateTime = (dateString: string) => {
  return new Date(dateString).toLocaleString('es-CO', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

export default function AlertCard({
  alert,
  confirmDeleteId,
  onConfirmDelete,
  onCancelDelete,
  onDelete,
  confirmPaidId,
  onConfirmPaid,
  onCancelPaid,
  onPaid,
  deletingId,
  contactModalId,
  contactForm,
  savingContact,
  contactError,
  onOpenContactModal,
  onCloseContactModal,
  onContactFormChange,
  onSaveContact,
  historialId,
  historialData,
  loadingHistorial,
  onOpenHistorial,
  onCloseHistorial
}: AlertCardProps) {
  const isValoracion = alert.tipo_alerta === 'valoracion_completada'
  const isConfirmingDelete = confirmDeleteId === alert.id
  const isConfirmingPaid = confirmPaidId === alert.id
  const isDeleting = deletingId === alert.id
  const isContactModalOpen = contactModalId === alert.id
  const isHistorialOpen = historialId === alert.id
  const hasContacts = (alert.contact_count || 0) > 0

  const servicioNombre = isValoracion
    ? alert.appointment?.service?.nombre || 'Valoración'
    : alert.package?.service?.nombre || 'Servicio'

  const therapistData = isValoracion
    ? alert.appointment?.therapist
    : alert.ultima_cita_paquete?.therapist

  const terapeuta = therapistData
    ? `${therapistData.nombre} ${therapistData.apellido}`
    : null

  const fechaHoraFin = isValoracion
    ? alert.appointment?.fecha_hora
    : alert.ultima_cita_paquete?.fecha_hora

  const horaFinalizacion = fechaHoraFin
    ? formatDateTime(fechaHoraFin)
    : formatDate(alert.fecha_completado)

  return (
    <div className={`bg-white dark:bg-zinc-800 rounded-lg shadow-md p-5 border-l-4 ${
      isValoracion ? 'border-purple-500' : 'border-blue-500'
    }`}>

      {/* Encabezado */}
      <div className="mb-3">
        <div className="flex items-start justify-between gap-2 mb-2">
          <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-full ${
            isValoracion
              ? 'bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300'
              : 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300'
          }`}>
            {isValoracion ? '🩺 Valoración Completada' : '📦 Paquete Completado'}
          </span>

          {hasContacts && (
            <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-full bg-teal-100 text-teal-700 dark:bg-teal-900 dark:text-teal-300">
              💬 {alert.contact_count} contacto{alert.contact_count !== 1 ? 's' : ''}
            </span>
          )}
        </div>

        <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-50">
          {alert.patient?.nombre} {alert.patient?.apellido}
        </h3>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          📞 {alert.patient?.telefono}
        </p>
      </div>

      {/* Detalle */}
      <div className="bg-zinc-50 dark:bg-zinc-700 rounded-lg p-3 mb-4 space-y-1.5">
        <p className="text-sm text-zinc-700 dark:text-zinc-300">
          <span className="font-medium">Servicio:</span> {servicioNombre}
        </p>

        {!isValoracion && (
          <p className="text-sm text-zinc-700 dark:text-zinc-300">
            <span className="font-medium">Sesiones completadas:</span> {alert.total_sesiones}
          </p>
        )}

        <p className="text-sm text-zinc-700 dark:text-zinc-300">
          <span className="font-medium">⏰ Finalizó:</span> {horaFinalizacion}
        </p>

        {terapeuta && (
          <p className="text-sm text-zinc-700 dark:text-zinc-300">
            <span className="font-medium">👤 Terapeuta:</span> {terapeuta}
          </p>
        )}

        <p className="text-sm text-zinc-700 dark:text-zinc-300">
          <span className="font-medium">📍 Dirección:</span> {alert.patient?.direccion}
          {alert.patient?.barrio ? ` · ${alert.patient.barrio}` : ''}
        </p>

        {alert.patient?.referencia && (
          <p className="text-sm text-zinc-700 dark:text-zinc-300">
            <span className="font-medium">🗺️ Referencia:</span> {alert.patient.referencia}
          </p>
        )}

        {alert.proximo_seguimiento && (
          <p className="text-sm text-teal-700 dark:text-teal-300 font-medium">
            📅 Próximo seguimiento: {formatDate(alert.proximo_seguimiento)}
          </p>
        )}
      </div>

      {/* Historial de contactos */}
      {hasContacts && (
        <div className="mb-4">
          <button
            onClick={() => isHistorialOpen ? onCloseHistorial() : onOpenHistorial(alert.id)}
            className="text-xs text-teal-600 dark:text-teal-400 hover:underline font-medium"
          >
            {isHistorialOpen ? '▲ Ocultar historial' : '▼ Ver historial de contactos'}
          </button>

          {isHistorialOpen && (
            <div className="mt-2 space-y-2">
              {loadingHistorial ? (
                <p className="text-xs text-zinc-500 dark:text-zinc-400">Cargando...</p>
              ) : historialData.length === 0 ? (
                <p className="text-xs text-zinc-500 dark:text-zinc-400">Sin registros</p>
              ) : (
                historialData.map(log => (
                  <div key={log.id} className="bg-teal-50 dark:bg-teal-900/20 rounded-lg p-3 space-y-1">
                    <p className="text-xs text-zinc-500 dark:text-zinc-400">
                      {formatDateTime(log.created_at)}
                      {log.contactado_por ? ` · por ${log.contactado_por}` : ''}
                    </p>
                    {log.notas && (
                      <p className="text-sm text-zinc-700 dark:text-zinc-300">{log.notas}</p>
                    )}
                    {log.proximo_seguimiento && (
                      <p className="text-xs text-teal-700 dark:text-teal-300 font-medium">
                        📅 Seguimiento: {formatDate(log.proximo_seguimiento)}
                      </p>
                    )}
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      )}

      {/* Modal registrar contacto */}
      {isContactModalOpen && (
        <div className="mb-4 bg-teal-50 dark:bg-teal-900/20 rounded-lg p-4 border border-teal-200 dark:border-teal-800 space-y-3">
          <p className="text-sm font-semibold text-teal-800 dark:text-teal-200">
            💬 Registrar contacto por WhatsApp
          </p>

          <div>
            <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1">
              Notas del contacto <span className="text-red-500">*</span>
            </label>
            <textarea
              value={contactForm.notas}
              onChange={e => onContactFormChange('notas', e.target.value)}
              placeholder="Ej: Paciente confirmó interés, dice que paga la próxima semana"
              rows={3}
              className="w-full rounded-lg border border-zinc-300 dark:border-zinc-600 px-3 py-2 text-sm bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1">
              Próximo seguimiento
            </label>
            <input
              type="date"
              value={contactForm.proximo_seguimiento}
              onChange={e => onContactFormChange('proximo_seguimiento', e.target.value)}
              className="w-full rounded-lg border border-zinc-300 dark:border-zinc-600 px-3 py-2 text-sm bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1">
              Contactado por
            </label>
            <input
              type="text"
              value={contactForm.contactado_por}
              onChange={e => onContactFormChange('contactado_por', e.target.value)}
              placeholder="Nombre del admin"
              className="w-full rounded-lg border border-zinc-300 dark:border-zinc-600 px-3 py-2 text-sm bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
          </div>

          {contactError && (
            <p className="text-xs text-red-600 dark:text-red-400">{contactError}</p>
          )}

          <div className="flex gap-2">
            <button
              onClick={onCloseContactModal}
              disabled={savingContact}
              className="flex-1 rounded-lg border border-zinc-300 dark:border-zinc-600 px-4 py-2 text-sm font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-700 transition-colors disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              onClick={() => onSaveContact(alert.id)}
              disabled={savingContact}
              className="flex-1 rounded-lg bg-teal-600 px-4 py-2 text-sm font-medium text-white hover:bg-teal-700 transition-colors disabled:opacity-50"
            >
              {savingContact ? 'Guardando...' : 'Guardar contacto'}
            </button>
          </div>
        </div>
      )}

      {/* Acciones principales */}
      {!isConfirmingDelete && !isConfirmingPaid && !isContactModalOpen && (
        <div className="space-y-2">
          {/* Botón registrar contacto */}
          <button
            onClick={() => onOpenContactModal(alert.id)}
            disabled={isDeleting}
            className="w-full rounded-lg bg-teal-50 border border-teal-200 px-4 py-2 text-sm font-medium text-teal-700 hover:bg-teal-100 dark:bg-teal-900/20 dark:border-teal-800 dark:text-teal-400 dark:hover:bg-teal-900/40 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            💬 Registrar contacto
          </button>

          {/* Botón pagó y agendó */}
          <button
            onClick={() => onConfirmPaid(alert.id)}
            disabled={isDeleting}
            className="w-full rounded-lg bg-green-50 border border-green-200 px-4 py-2 text-sm font-medium text-green-700 hover:bg-green-100 dark:bg-green-900/20 dark:border-green-800 dark:text-green-400 dark:hover:bg-green-900/40 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isDeleting ? 'Procesando...' : '✅ Pagó y agendó'}
          </button>

          {/* Botón no quiere continuar */}
          <button
            onClick={() => onConfirmDelete(alert.id)}
            disabled={isDeleting}
            className="w-full rounded-lg bg-red-50 border border-red-200 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-100 dark:bg-red-900/20 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-900/40 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            ✕ No quiere continuar
          </button>
        </div>
      )}

      {/* Confirmación pagó y agendó */}
      {isConfirmingPaid && (
        <div className="space-y-2">
          <p className="text-sm text-center text-zinc-600 dark:text-zinc-400 font-medium">
            ¿Confirmar que el paciente pagó y ya fue agendado?
          </p>
          <div className="flex gap-2">
            <button
              onClick={onCancelPaid}
              className="flex-1 rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-600 dark:text-zinc-300 dark:hover:bg-zinc-700 transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={() => onPaid(alert.id)}
              className="flex-1 rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 transition-colors"
            >
              Sí, confirmar
            </button>
          </div>
        </div>
      )}

      {/* Confirmación no quiere continuar */}
      {isConfirmingDelete && (
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