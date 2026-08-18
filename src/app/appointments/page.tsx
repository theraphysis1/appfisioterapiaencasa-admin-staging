//src/app/appointments/page.tsx

'use client'

import Link from 'next/link'
import { useAppointments } from './hooks/useAppointments'

export default function AppointmentsPage() {
  const {
    appointments,
    loading,
    searchTerm,
    setSearchTerm,
    handleSearch,
    handleClearSearch,
    handleSearchKeyDown,
    filterEstado,
    setFilterEstado,
    filterServicio,
    handleFilterServicioChange,
    services,
    filterFechaDesde,
    setFilterFechaDesde,
    filterFechaHasta,
    setFilterFechaHasta,
    handleClearFechaDesde,
    handleClearFechaHasta,
    isUpdating,
    updateMessage,
    currentPage,
    pagination,
    handleBulkComplete,
    handlePageChange,
  } = useAppointments()

  const formatDate = (dateString: string) => {
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

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0
    }).format(amount)
  }

  const getDireccionIcon = (tieneTemporal: boolean) => {
    return tieneTemporal ? '🏢' : '🏠'
  }

  const getDireccionTooltip = (tieneTemporal: boolean) => {
    return tieneTemporal ? 'Dirección temporal' : 'Dirección del domicilio'
  }

  const getEstadoBadgeColor = (estado: string) => {
    switch (estado) {
      case 'agendada':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
      case 'completada':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
      case 'cancelada':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
      case 'pendiente_reagendar':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200'
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-50 dark:bg-zinc-900">
        <div className="text-zinc-600 dark:text-zinc-400">Cargando citas...</div>
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
            Gestionar Citas
          </h1>
          <p className="text-zinc-600 dark:text-zinc-400 mt-2">
            {pagination ? (
            <>
              Mostrando {appointments.length} de {pagination.total} cita{pagination.total !== 1 ? 's' : ''} • Página {pagination.page} de {pagination.totalPages}
            </>
            ) : (
              `${appointments.length} cita${appointments.length !== 1 ? 's' : ''} encontrada${appointments.length !== 1 ? 's' : ''}`
            )}
          </p>
        </div>

        {/* Filtros */}
        <div className="bg-white dark:bg-zinc-800 rounded-lg shadow-sm p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Búsqueda */}
            <div>
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                Buscar por paciente o terapeuta
              </label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    onKeyDown={handleSearchKeyDown}
                    placeholder="Nombre, apellido..."
                    className="w-full px-4 py-2 rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 focus:ring-2 focus:ring-indigo-500"
                  />
                  {searchTerm && (
                    <button
                      onClick={handleClearSearch}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200"
                      title="Limpiar búsqueda"
                    >
                      ✕
                    </button>
                  )}
                </div>
                <button
                  onClick={handleSearch}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors text-sm font-medium whitespace-nowrap"
                >
                  🔍 Buscar
                </button>
              </div>
            </div>

            {/* Filtro por estado */}
            <div>
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                Filtrar por estado
              </label>
              <select
                value={filterEstado}
                onChange={(e) => setFilterEstado(e.target.value)}
                className="w-full px-4 py-2 rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 focus:ring-2 focus:ring-indigo-500"
              >
                <option value="todos">Todos los estados</option>
                <option value="agendada">Agendada</option>
                <option value="completada">Completada</option>
                <option value="cancelada">Cancelada</option>
                <option value="pendiente_reagendar">Pendiente Reagendar</option>
              </select>
            </div>

            {/* Filtro por servicio */}
            <div>
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                Filtrar por servicio
              </label>
              <select
                value={filterServicio}
                onChange={(e) => handleFilterServicioChange(e.target.value)}
                className="w-full px-4 py-2 rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 focus:ring-2 focus:ring-indigo-500"
              >
                <option value="todos">Todos los servicios</option>
                {services.map((servicio) => (
                  <option key={servicio.id} value={servicio.id}>
                    {servicio.nombre}
                  </option>
                ))}
              </select>
            </div>
            {/* Filtro por fecha desde */}
            <div>
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                Desde
              </label>
              <div className="relative">
                <input
                  type="date"
                  value={filterFechaDesde}
                  onChange={(e) => setFilterFechaDesde(e.target.value)}
                  className="w-full px-4 py-2 rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 focus:ring-2 focus:ring-indigo-500"
                />
                {filterFechaDesde && (
                  <button
                    onClick={handleClearFechaDesde}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200"
                    title="Limpiar fecha desde"
                  >
                    ✕
                  </button>
                )}
              </div>
            </div>

            {/* Filtro por fecha hasta */}
            <div>
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                Hasta
              </label>
              <div className="relative">
                <input
                  type="date"
                  value={filterFechaHasta}
                  onChange={(e) => setFilterFechaHasta(e.target.value)}
                  className="w-full px-4 py-2 rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 focus:ring-2 focus:ring-indigo-500"
                />
                {filterFechaHasta && (
                  <button
                    onClick={handleClearFechaHasta}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200"
                    title="Limpiar fecha hasta"
                  >
                    ✕
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Botón de actualización masiva */}
          <div className="mt-4 flex flex-col sm:flex-row items-start sm:items-center gap-3">
            <button
              onClick={handleBulkComplete}
              disabled={isUpdating || !filterFechaDesde || !filterFechaHasta}
              className={`px-6 py-3 rounded-lg font-medium transition-colors ${
                isUpdating || !filterFechaDesde || !filterFechaHasta
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  : 'bg-green-600 text-white hover:bg-green-700'
              }`}
            >
              {isUpdating ? '⏳ Actualizando...' : '🔄 Actualizar Citas Completadas'}
            </button>

            {updateMessage && (
              <div className={`px-4 py-2 rounded-lg text-sm font-medium ${
                updateMessage.startsWith('✅') 
                  ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                  : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
              }`}>
                {updateMessage}
              </div>
            )}
          </div>
        </div>

        {/* Lista de citas */}
        {appointments.length === 0 ? (
          <div className="bg-white dark:bg-zinc-800 rounded-lg shadow-sm p-12 text-center">
            <p className="text-zinc-600 dark:text-zinc-400">
              No se encontraron citas con los filtros aplicados
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {appointments.map((apt) => (
              <div
                key={apt.id}
                className="bg-white dark:bg-zinc-800 rounded-lg shadow-sm p-6 hover:shadow-md transition-shadow"
              >
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                  {/* Info principal */}
                  <div className="flex-1">
                    <div className="flex items-start gap-3 mb-2">
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${getEstadoBadgeColor(apt.estado)}`}>
                        {apt.estado.replace('_', ' ').toUpperCase()}
                      </span>
                      {apt.package_id && (
                        <span className="px-3 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200">
                          📦 PAQUETE
                        </span>
                      )}
                    </div>
                    
                    <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50 mb-1">
                      {apt.patient.nombre} {apt.patient.apellido}
                    </h3>

                    {apt.patologia && (
                      <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-2">
                        <span className="font-medium">🩺 Patología:</span> {apt.patologia}
                      </p>
                    )}
                    
                    {/* Dirección con indicador visual */}
                    <div className="flex items-start gap-2 mb-2">
                      <span 
                        className="text-lg" 
                        title={getDireccionTooltip(apt.tiene_direccion_temporal)}
                      >
                        {getDireccionIcon(apt.tiene_direccion_temporal)}
                      </span>
                      <div className="flex-1">
                        <p className="text-sm text-zinc-600 dark:text-zinc-400">
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
                    
                    <div className="text-sm text-zinc-600 dark:text-zinc-400 space-y-1">
                      <p>📅 {formatDate(apt.fecha_hora)}</p>
                      <p>👨‍⚕️ {apt.therapist.nombre} {apt.therapist.apellido}</p>
                      <p>💼 {apt.service.nombre}</p>
                      <p>💰 {formatCurrency(apt.valor)}</p>
                      {apt.observacion && (
                        <p className="italic">📝 {apt.observacion}</p>
                      )}
                    </div>
                  </div>

                  {/* Botones de acción */}
                  <div className="flex flex-col gap-2 md:w-40">
                    <Link
                      href={`/appointments/${apt.id}/edit`}
                      className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors text-center text-sm font-medium"
                    >
                      ✏️ Editar
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Controles de paginación */}
        {pagination && pagination.total > 20 && (
          <div className="mt-8 flex items-center justify-between bg-white dark:bg-zinc-800 rounded-lg shadow-sm p-4">
            <button
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 1}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                currentPage === 1
                  ? 'bg-gray-200 text-gray-400 cursor-not-allowed dark:bg-zinc-700 dark:text-zinc-500'
                  : 'bg-indigo-600 text-white hover:bg-indigo-700'
              }`}
            >
              ← Anterior
            </button>

            <div className="flex items-center gap-2">
              <span className="text-sm text-zinc-600 dark:text-zinc-400">
                Página
              </span>
              <span className="px-3 py-1 bg-indigo-100 dark:bg-indigo-900 text-indigo-800 dark:text-indigo-200 rounded-lg font-semibold">
                {currentPage}
              </span>
              <span className="text-sm text-zinc-600 dark:text-zinc-400">
                de {pagination.totalPages}
              </span>
            </div>

            <button
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={!pagination.hasMore}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                !pagination.hasMore
                  ? 'bg-gray-200 text-gray-400 cursor-not-allowed dark:bg-zinc-700 dark:text-zinc-500'
                  : 'bg-indigo-600 text-white hover:bg-indigo-700'
              }`}
            >
              Siguiente →
            </button>
          </div>
        )}
      </div>
    </div>
  )
}