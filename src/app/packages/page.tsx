'use client'

import Link from 'next/link'
import {
  usePackages,
  type Package,
  type Appointment
} from './hooks/usePackages'

// ─── Helpers de formato ────────────────────────────────────────────────────────

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0
  }).format(amount)

const formatDate = (dateString: string) => {
  const date = new Date(dateString)
  return date.toLocaleDateString('es-CO', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })
}

const formatDateTime = (dateString: string) => {
  const date = new Date(dateString)
  return date.toLocaleDateString('es-CO', {
    weekday: 'short',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

const formatShortDate = (dateString: string | null | undefined) => {
  if (!dateString) return 'N/A'
  const date = new Date(dateString)
  return date.toLocaleDateString('es-CO', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  })
}

const getEstadoBadgeColor = (estado: string) => {
  switch (estado) {
    case 'activo':
      return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
    case 'completado':
      return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
    case 'cancelado':
      return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
    default:
      return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200'
  }
}

const getAppointmentStatusBadge = (estado: string) => {
  switch (estado) {
    case 'agendada':
      return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
    case 'completada':
      return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
    case 'cancelada':
      return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
    default:
      return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200'
  }
}

const getPaymentStatusBadge = (pkg: Package) => {
  if (pkg.forma_pago === 'completo') {
    return {
      color: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
      text: '💰 PAGO COMPLETO'
    }
  }
  if (pkg.segundo_pago_completado) {
    return {
      color: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
      text: '✅ PAGADO COMPLETO'
    }
  }
  if (pkg.primer_pago_completado) {
    return {
      color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
      text: '⏳ PAGO PARCIAL'
    }
  }
  return {
    color: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
    text: '⚠️ PAGO PENDIENTE'
  }
}

// ─── Página principal ──────────────────────────────────────────────────────────

export default function PackagesPage() {
  const {
    loading,
    filterEstado,
    setFilterEstado,
    searchTerm,
    setSearchTerm,
    expandedPackages,
    currentPage,
    pagination,
    filteredPackages,

    showPaymentModal,
    selectedPackage,
    paymentForm,
    setPaymentForm,
    processingPayment,
    handleOpenPaymentModal,
    handleClosePaymentModal,
    handleRegistrarPago,

    showCancelModal,
    packageToCancel,
    cancelForm,
    setCancelForm,
    processingCancel,
    handleOpenCancelModal,
    handleCloseCancelModal,
    handleCancelarPaquete,

    toggleExpand,
    handlePageChange,
    handleAgendarSesionesRestantes,

    getFechaVencimiento,
    needsSecondPaymentButton,
    needsScheduleRemainingButton,
    getProgressPercentage,
    getSesionesDisponibles
  } = usePackages()

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-50 dark:bg-zinc-900">
        <div className="text-zinc-600 dark:text-zinc-400">Cargando paquetes...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-900 py-8 px-4">
      <div className="max-w-7xl mx-auto">

        {/* Header */}
        <div className="mb-8">
          <Link
            href="/home"
            className="inline-flex items-center text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 mb-4"
          >
            ← Volver al inicio
          </Link>
          <h1 className="text-3xl font-bold text-zinc-900 dark:text-zinc-50">
            Gestionar Paquetes
          </h1>
          <p className="text-zinc-600 dark:text-zinc-400 mt-2">
            {pagination ? (
              <>
                Mostrando {filteredPackages.length} de {pagination.total} paquete{pagination.total !== 1 ? 's' : ''} •
                Página {pagination.page} de {pagination.totalPages}
              </>
            ) : (
              `${filteredPackages.length} paquete${filteredPackages.length !== 1 ? 's' : ''} encontrado${filteredPackages.length !== 1 ? 's' : ''}`
            )}
          </p>
        </div>

        {/* Filtros */}
        <div className="bg-white dark:bg-zinc-800 rounded-lg shadow-sm p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                Buscar por paciente
              </label>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Nombre, apellido..."
                className="w-full px-4 py-2 rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 focus:ring-2 focus:ring-pink-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                Filtrar por estado
              </label>
              <select
                value={filterEstado}
                onChange={(e) => setFilterEstado(e.target.value)}
                className="w-full px-4 py-2 rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 focus:ring-2 focus:ring-pink-500"
              >
                <option value="todos">Todos los estados</option>
                <option value="activo">Activo</option>
                <option value="completado">Completado</option>
                <option value="cancelado">Cancelado</option>
              </select>
            </div>
          </div>
        </div>

        {/* Lista de paquetes */}
        {filteredPackages.length === 0 ? (
          <div className="bg-white dark:bg-zinc-800 rounded-lg shadow-sm p-12 text-center">
            <p className="text-zinc-600 dark:text-zinc-400">
              No se encontraron paquetes con los filtros aplicados
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredPackages.map((pkg) => (
              <div
                key={pkg.id}
                className="bg-white dark:bg-zinc-800 rounded-lg shadow-sm overflow-hidden"
              >
                <div className="p-6">
                  {/* Header del paquete */}
                  <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4 mb-4">
                    <div className="flex-1">

                      {/* Badges de estado */}
                      <div className="flex items-center gap-3 mb-2">
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${getEstadoBadgeColor(pkg.estado)}`}>
                          {pkg.estado.toUpperCase()}
                        </span>
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${getPaymentStatusBadge(pkg).color}`}>
                          {getPaymentStatusBadge(pkg).text}
                        </span>
                        <span className="px-3 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200">
                          📦 {pkg.service?.nombre || 'Paquete'}
                        </span>
                      </div>

                      <h3 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50 mb-1">
                        {pkg.patient?.nombre} {pkg.patient?.apellido}
                      </h3>

                      <div className="text-sm text-zinc-600 dark:text-zinc-400 space-y-1">

                        {/* Valoración previa */}
                        {pkg.tiene_valoracion_previa && pkg.valoracion_cita && (
                          <div className="mb-3 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                            <p className="text-xs font-semibold text-green-800 dark:text-green-300 mb-1">
                              ✅ Valoración Previa Vinculada
                            </p>
                            <p className="text-xs text-green-700 dark:text-green-400">
                              📅 {formatDate(pkg.valoracion_cita.fecha_hora)}
                            </p>
                            <p className="text-xs text-green-700 dark:text-green-400">
                              👨‍⚕️ {pkg.valoracion_cita.therapist?.nombre} {pkg.valoracion_cita.therapist?.apellido}
                            </p>
                            <p className="text-xs text-green-700 dark:text-green-400 font-medium">
                              💰 Descuento aplicado: {formatCurrency(pkg.valoracion_monto || 0)}
                            </p>
                          </div>
                        )}

                        {/* Pagos fraccionados */}
                        {pkg.forma_pago === 'fraccionado' && (
                          <div className="mb-3 p-3 bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-lg space-y-2">
                            <p className="text-xs font-semibold text-purple-800 dark:text-purple-300 mb-2">
                              📊 Pago Fraccionado ({pkg.numero_pagos} pagos)
                            </p>

                            {/* Primer pago */}
                            <div className="space-y-1">
                              <div className="flex items-center justify-between">
                                <span className="text-xs text-purple-700 dark:text-purple-400">
                                  1er Pago ({pkg.sesiones_primer_pago} sesiones):
                                </span>
                                <div className="flex items-center gap-2">
                                  <span className="text-xs font-medium text-purple-900 dark:text-purple-200">
                                    {formatCurrency(pkg.monto_primer_pago || 0)}
                                  </span>
                                  <span className="text-xs">
                                    {pkg.primer_pago_completado ? '✅' : '❌'}
                                  </span>
                                </div>
                              </div>
                              {pkg.fecha_primer_pago && (
                                <div className="text-xs text-purple-600 dark:text-purple-400 pl-2">
                                  📅 Pagado: {formatShortDate(pkg.fecha_primer_pago)}
                                </div>
                              )}
                            </div>

                            {/* Segundo pago */}
                            <div className="space-y-1">
                              <div className="flex items-center justify-between">
                                <span className="text-xs text-purple-700 dark:text-purple-400">
                                  2do Pago ({pkg.sesiones_segundo_pago} sesiones):
                                </span>
                                <div className="flex items-center gap-2">
                                  <span className="text-xs font-medium text-purple-900 dark:text-purple-200">
                                    {formatCurrency(pkg.monto_segundo_pago || 0)}
                                  </span>
                                  <span className="text-xs">
                                    {pkg.segundo_pago_completado ? '✅' : '❌'}
                                  </span>
                                </div>
                              </div>

                              {/* ✅ Fecha de vencimiento calculada en tiempo real */}
                              {!pkg.segundo_pago_completado && getFechaVencimiento(pkg) && (
                                <div className="text-xs text-orange-600 dark:text-orange-400 pl-2">
                                  ⏰ Vence: {formatShortDate(getFechaVencimiento(pkg))}
                                </div>
                              )}
                              {pkg.segundo_pago_completado && pkg.fecha_segundo_pago && (
                                <div className="text-xs text-purple-600 dark:text-purple-400 pl-2">
                                  📅 Pagado: {formatShortDate(pkg.fecha_segundo_pago)}
                                </div>
                              )}
                            </div>

                            {/* Saldo pendiente */}
                            {pkg.saldo_pendiente > 0 && (
                              <div className="pt-2 border-t border-purple-200 dark:border-purple-700">
                                <div className="flex items-center justify-between">
                                  <span className="text-xs font-semibold text-purple-800 dark:text-purple-300">
                                    💳 Saldo Pendiente:
                                  </span>
                                  <span className="text-xs font-bold text-red-600 dark:text-red-400">
                                    {formatCurrency(pkg.saldo_pendiente)}
                                  </span>
                                </div>
                              </div>
                            )}
                          </div>
                        )}

                        <p>📞 {pkg.patient?.telefono}</p>
                        <p>📅 Fecha de compra: {formatDate(pkg.fecha_compra)}</p>
                        <p>💰 Valor total: {formatCurrency(pkg.valor_total)}</p>
                      </div>
                    </div>

                    {/* Progreso y acciones */}
                    <div className="md:w-80 space-y-3">
                      <div>
                        <div className="text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                          Progreso del paquete
                        </div>
                        <div className="space-y-2">
                          <div className="flex justify-between text-sm">
                            <span className="text-zinc-600 dark:text-zinc-400">Completadas</span>
                            <span className="font-semibold text-zinc-900 dark:text-zinc-50">
                              {pkg.sesiones_completadas} / {pkg.total_sesiones}
                            </span>
                          </div>
                          <div className="w-full bg-zinc-200 dark:bg-zinc-700 rounded-full h-3">
                            <div
                              className="bg-green-600 h-3 rounded-full transition-all duration-300"
                              style={{ width: `${getProgressPercentage(pkg)}%` }}
                            />
                          </div>
                          <div className="grid grid-cols-2 gap-2 text-xs">
                            <div>
                              <span className="text-zinc-600 dark:text-zinc-400">Agendadas:</span>
                              <span className="ml-1 font-semibold text-blue-600 dark:text-blue-400">
                                {pkg.sesiones_agendadas}
                              </span>
                            </div>
                            <div>
                              <span className="text-zinc-600 dark:text-zinc-400">Pendientes:</span>
                              <span className="ml-1 font-semibold text-orange-600 dark:text-orange-400">
                                {pkg.sesiones_pendientes_agendar}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Sesiones disponibles (fraccionado) */}
                      {pkg.forma_pago === 'fraccionado' && (
                        <div className="p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                          <div className="text-xs font-semibold text-blue-800 dark:text-blue-300 mb-1">
                            🔓 Sesiones Disponibles
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-xs text-blue-700 dark:text-blue-400">
                              Para agendar:
                            </span>
                            <span className="text-sm font-bold text-blue-900 dark:text-blue-200">
                              {getSesionesDisponibles(pkg)} sesiones
                            </span>
                          </div>
                        </div>
                      )}

                      {/* Botón Registrar Segundo Pago */}
                      {needsSecondPaymentButton(pkg) && (
                        <button
                          onClick={() => handleOpenPaymentModal(pkg)}
                          className="w-full px-4 py-2.5 bg-gradient-to-r from-green-600 to-green-700 text-white rounded-lg hover:from-green-700 hover:to-green-800 transition-all text-sm font-semibold shadow-md hover:shadow-lg"
                        >
                          💳 Registrar Segundo Pago
                        </button>
                      )}

                      {/* Botón Agendar Sesiones Restantes */}
                      {needsScheduleRemainingButton(pkg) && (
                        <button
                          onClick={() => handleAgendarSesionesRestantes(pkg)}
                          className="w-full px-4 py-2.5 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg hover:from-blue-700 hover:to-blue-800 transition-all text-sm font-semibold shadow-md hover:shadow-lg"
                        >
                          📅 Agendar Sesiones Restantes ({pkg.sesiones_pendientes_agendar})
                        </button>
                      )}

                      {/* Botón Cancelar Paquete */}
                      {pkg.estado === 'activo' && (
                        <button
                          onClick={() => handleOpenCancelModal(pkg)}
                          className="w-full px-4 py-2.5 bg-gradient-to-r from-red-600 to-red-700 text-white rounded-lg hover:from-red-700 hover:to-red-800 transition-all text-sm font-semibold shadow-md hover:shadow-lg"
                        >
                          ❌ Cancelar Paquete
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Botón expandir citas */}
                  <button
                    onClick={() => toggleExpand(pkg.id)}
                    className="w-full mt-4 px-4 py-2 bg-zinc-100 dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100 rounded-lg hover:bg-zinc-200 dark:hover:bg-zinc-600 transition-colors text-sm font-medium"
                  >
                    {expandedPackages.has(pkg.id) ? '▲ Ocultar citas' : '▼ Ver todas las citas'}
                  </button>
                </div>

                {/* Lista de citas expandible */}
                {expandedPackages.has(pkg.id) && (
                  <div className="border-t border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-900 p-6">
                    {!pkg.appointments ? (
                      <div className="text-center text-zinc-600 dark:text-zinc-400 py-4">
                        Cargando citas...
                      </div>
                    ) : pkg.appointments.length === 0 ? (
                      <div className="text-center text-zinc-600 dark:text-zinc-400 py-4">
                        No hay citas para este paquete
                      </div>
                    ) : (
                      <div className="space-y-3">
                        <h4 className="font-semibold text-zinc-900 dark:text-zinc-50 mb-3">
                          Citas del paquete ({pkg.appointments.length})
                        </h4>
                        {pkg.appointments.map((apt: Appointment, index: number) => (
                          <div
                            key={apt.id}
                            className="bg-white dark:bg-zinc-800 p-4 rounded-lg"
                          >
                            <div className="flex items-start gap-3 mb-3">
                              <span className="font-semibold text-zinc-900 dark:text-zinc-50">
                                #{index + 1}
                              </span>
                              <div className="flex-1">
                                <p className="text-sm font-medium text-zinc-900 dark:text-zinc-50">
                                  📅 {formatDateTime(apt.fecha_hora)}
                                </p>
                                <p className="text-xs text-zinc-600 dark:text-zinc-400 mt-1">
                                  👨‍⚕️ {apt.therapist?.nombre} {apt.therapist?.apellido}
                                </p>
                                <div className="flex items-start gap-2 mt-2 pt-2 border-t border-zinc-200 dark:border-zinc-700">
                                  <span className="text-base">
                                    {apt.tiene_direccion_temporal ? '🏢' : '🏠'}
                                  </span>
                                  <div className="flex-1">
                                    <p className="text-xs text-zinc-600 dark:text-zinc-400">
                                      {apt.barrio_final} - {apt.direccion_final}
                                    </p>
                                    {apt.referencia_final && (
                                      <p className="text-xs text-zinc-500 dark:text-zinc-500 italic mt-0.5">
                                        Ref: {apt.referencia_final}
                                      </p>
                                    )}
                                  </div>
                                  {apt.tiene_direccion_temporal && (
                                    <span className="px-2 py-0.5 rounded text-xs font-medium bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200">
                                      Temporal
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center gap-2 pt-3 border-t border-zinc-200 dark:border-zinc-700">
                              <span className={`px-3 py-1 rounded-full text-xs font-medium ${getAppointmentStatusBadge(apt.estado)}`}>
                                {apt.estado.toUpperCase()}
                              </span>
                              <Link
                                href={`/appointments/${apt.id}/edit`}
                                className="px-3 py-1 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors text-xs font-medium"
                              >
                                ✏️ Editar
                              </Link>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Paginación */}
        {pagination && pagination.totalPages > 1 && (
          <div className="mt-8 flex items-center justify-between bg-white dark:bg-zinc-800 rounded-lg shadow-sm p-4">
            <button
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 1}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                currentPage === 1
                  ? 'bg-gray-200 text-gray-400 cursor-not-allowed dark:bg-zinc-700 dark:text-zinc-500'
                  : 'bg-pink-600 text-white hover:bg-pink-700'
              }`}
            >
              ← Anterior
            </button>
            <div className="flex items-center gap-2">
              <span className="text-sm text-zinc-600 dark:text-zinc-400">Página</span>
              <span className="px-3 py-1 bg-pink-100 dark:bg-pink-900 text-pink-800 dark:text-pink-200 rounded-lg font-semibold">
                {currentPage}
              </span>
              <span className="text-sm text-zinc-600 dark:text-zinc-400">de {pagination.totalPages}</span>
            </div>
            <button
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={!pagination.hasMore}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                !pagination.hasMore
                  ? 'bg-gray-200 text-gray-400 cursor-not-allowed dark:bg-zinc-700 dark:text-zinc-500'
                  : 'bg-pink-600 text-white hover:bg-pink-700'
              }`}
            >
              Siguiente →
            </button>
          </div>
        )}
      </div>

      {/* ── Modal Segundo Pago ────────────────────────────────────────────────── */}
      {showPaymentModal && selectedPackage && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-zinc-800 rounded-lg shadow-xl max-w-md w-full">
            <div className="p-6 border-b border-zinc-200 dark:border-zinc-700">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">
                  💳 Registrar Segundo Pago
                </h2>
                <button
                  onClick={handleClosePaymentModal}
                  disabled={processingPayment}
                  className="text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200"
                >
                  ✕
                </button>
              </div>
              <div className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
                Paciente: <span className="font-semibold">{selectedPackage.patient?.nombre} {selectedPackage.patient?.apellido}</span>
              </div>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                  Monto a Pagar *
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={paymentForm.monto}
                  onChange={(e) => setPaymentForm(prev => ({ ...prev, monto: e.target.value }))}
                  disabled={processingPayment}
                  className="w-full px-4 py-2 border border-zinc-300 dark:border-zinc-600 rounded-lg bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-50 focus:ring-2 focus:ring-green-500 disabled:bg-zinc-100 dark:disabled:bg-zinc-700"
                />
                <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
                  Monto esperado: {formatCurrency(selectedPackage.monto_segundo_pago || 0)}
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                  Método de Pago *
                </label>
                <select
                  value={paymentForm.metodo_pago}
                  onChange={(e) => setPaymentForm(prev => ({ ...prev, metodo_pago: e.target.value }))}
                  disabled={processingPayment}
                  className="w-full px-4 py-2 border border-zinc-300 dark:border-zinc-600 rounded-lg bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-50 focus:ring-2 focus:ring-green-500 disabled:bg-zinc-100 dark:disabled:bg-zinc-700"
                >
                  <option value="">Seleccionar método</option>
                  <option value="efectivo">Efectivo</option>
                  <option value="transferencia">Transferencia</option>
                  <option value="tarjeta">Tarjeta</option>
                  <option value="nequi">Nequi</option>
                  <option value="daviplata">Daviplata</option>
                  <option value="otro">Otro</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                  Notas (opcional)
                </label>
                <textarea
                  value={paymentForm.notas}
                  onChange={(e) => setPaymentForm(prev => ({ ...prev, notas: e.target.value }))}
                  disabled={processingPayment}
                  rows={3}
                  placeholder="Agregar observaciones sobre el pago..."
                  className="w-full px-4 py-2 border border-zinc-300 dark:border-zinc-600 rounded-lg bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-50 focus:ring-2 focus:ring-green-500 disabled:bg-zinc-100 dark:disabled:bg-zinc-700"
                />
              </div>
              <div className="p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                <p className="text-xs font-semibold text-blue-900 dark:text-blue-100 mb-2">
                  📋 Información del Paquete
                </p>
                <div className="space-y-1 text-xs text-blue-800 dark:text-blue-200">
                  <p>Servicio: {selectedPackage.service?.nombre}</p>
                  <p>Sesiones segundo pago: {selectedPackage.sesiones_segundo_pago}</p>
                  <p>Saldo pendiente: {formatCurrency(selectedPackage.saldo_pendiente)}</p>
                </div>
              </div>
            </div>
            <div className="p-6 border-t border-zinc-200 dark:border-zinc-700 flex gap-3">
              <button
                onClick={handleClosePaymentModal}
                disabled={processingPayment}
                className="flex-1 px-4 py-2 border border-zinc-300 dark:border-zinc-600 text-zinc-700 dark:text-zinc-300 rounded-lg hover:bg-zinc-50 dark:hover:bg-zinc-700 transition-colors disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                onClick={handleRegistrarPago}
                disabled={processingPayment}
                className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 font-medium flex items-center justify-center gap-2"
              >
                {processingPayment ? (
                  <>
                    <div className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-solid border-white border-r-transparent" />
                    Procesando...
                  </>
                ) : '✅ Registrar Pago'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal Cancelar Paquete ────────────────────────────────────────────── */}
      {showCancelModal && packageToCancel && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-zinc-800 rounded-lg shadow-xl max-w-lg w-full">
            <div className="p-6 border-b border-zinc-200 dark:border-zinc-700">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold text-red-600 dark:text-red-400">
                  ⚠️ Cancelar Paquete
                </h2>
                <button
                  onClick={handleCloseCancelModal}
                  disabled={processingCancel}
                  className="text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200"
                >
                  ✕
                </button>
              </div>
              <div className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
                Paciente: <span className="font-semibold">{packageToCancel.patient?.nombre} {packageToCancel.patient?.apellido}</span>
              </div>
            </div>
            <div className="p-6 space-y-4">
              <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                <p className="text-sm font-semibold text-red-900 dark:text-red-100 mb-2">
                  ⚠️ Esta acción NO se puede deshacer
                </p>
                <ul className="text-xs text-red-800 dark:text-red-200 space-y-1 list-disc list-inside">
                  <li>Se cancelará el paquete permanentemente</li>
                  <li>Se eliminarán todas las citas agendadas futuras</li>
                  <li>Se liberarán los espacios en la agenda de terapeutas</li>
                  <li>Se cerrará la alerta de pago pendiente</li>
                  <li>Las citas ya completadas se mantendrán en el historial</li>
                </ul>
              </div>
              <div className="p-3 bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-700 rounded-lg">
                <p className="text-xs font-semibold text-zinc-900 dark:text-zinc-100 mb-2">
                  📋 Información del Paquete
                </p>
                <div className="space-y-1 text-xs text-zinc-700 dark:text-zinc-300">
                  <p>Servicio: {packageToCancel.service?.nombre}</p>
                  <p>Total sesiones: {packageToCancel.total_sesiones}</p>
                  <p>Sesiones completadas: {packageToCancel.sesiones_completadas}</p>
                  <p>Sesiones agendadas: {packageToCancel.sesiones_agendadas}</p>
                  {packageToCancel.saldo_pendiente > 0 && (
                    <p className="text-red-600 dark:text-red-400 font-semibold">
                      Saldo pendiente: {formatCurrency(packageToCancel.saldo_pendiente)}
                    </p>
                  )}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                  Razón de Cancelación *
                </label>
                <textarea
                  value={cancelForm.razon_cancelacion}
                  onChange={(e) => setCancelForm(prev => ({ ...prev, razon_cancelacion: e.target.value }))}
                  disabled={processingCancel}
                  rows={4}
                  placeholder="Explica por qué se cancela este paquete (requerido)..."
                  className="w-full px-4 py-2 border border-zinc-300 dark:border-zinc-600 rounded-lg bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-50 focus:ring-2 focus:ring-red-500 disabled:bg-zinc-100 dark:disabled:bg-zinc-700"
                />
                <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
                  Esta razón quedará registrada permanentemente en el sistema
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                  Cancelado Por
                </label>
                <input
                  type="text"
                  value={cancelForm.cancelado_por}
                  onChange={(e) => setCancelForm(prev => ({ ...prev, cancelado_por: e.target.value }))}
                  disabled={processingCancel}
                  className="w-full px-4 py-2 border border-zinc-300 dark:border-zinc-600 rounded-lg bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-50 focus:ring-2 focus:ring-red-500 disabled:bg-zinc-100 dark:disabled:bg-zinc-700"
                />
              </div>
            </div>
            <div className="p-6 border-t border-zinc-200 dark:border-zinc-700 flex gap-3">
              <button
                onClick={handleCloseCancelModal}
                disabled={processingCancel}
                className="flex-1 px-4 py-2 border border-zinc-300 dark:border-zinc-600 text-zinc-700 dark:text-zinc-300 rounded-lg hover:bg-zinc-50 dark:hover:bg-zinc-700 transition-colors disabled:opacity-50"
              >
                Volver
              </button>
              <button
                onClick={handleCancelarPaquete}
                disabled={processingCancel || !cancelForm.razon_cancelacion.trim()}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 font-medium flex items-center justify-center gap-2"
              >
                {processingCancel ? (
                  <>
                    <div className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-solid border-white border-r-transparent" />
                    Cancelando...
                  </>
                ) : '❌ Confirmar Cancelación'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}