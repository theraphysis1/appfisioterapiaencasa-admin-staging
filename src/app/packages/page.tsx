'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'

interface Patient {
  id: string
  nombre: string
  apellido: string
  telefono: string
}

interface Service {
  id: string
  nombre: string
  tipo: string
  cantidad_sesiones: number
}

interface Appointment {
  id: string
  fecha_hora: string
  estado: string
  therapist: {
    nombre: string
    apellido: string
  }
  patient: {
    direccion: string
    barrio: string
  }
  // Campos calculados del backend
  direccion_final: string
  barrio_final: string
  referencia_final: string | null
  tiene_direccion_temporal: boolean
}

interface Pagination {
  page: number
  limit: number
  total: number
  totalPages: number
  hasMore: boolean
}

interface Package {
  id: string
  patient_id: string
  service_id: string
  total_sesiones: number
  sesiones_agendadas: number
  sesiones_completadas: number
  sesiones_pendientes_agendar: number
  valor_total: number
  comision_total: number
  estado: string
  fecha_compra: string
  patient: Patient
  service: Service
  appointments?: Appointment[]
}

export default function PackagesPage() {
  const [packages, setPackages] = useState<Package[]>([])
  const [loading, setLoading] = useState(true)
  const [filterEstado, setFilterEstado] = useState('todos')
  const [searchTerm, setSearchTerm] = useState('')
  const [expandedPackages, setExpandedPackages] = useState<Set<string>>(new Set())
  const [currentPage, setCurrentPage] = useState(1)
  const [pagination, setPagination] = useState<Pagination | null>(null)

  useEffect(() => {
    fetchPackages()
  }, [currentPage, filterEstado])

  const fetchPackages = async () => {
    try {
      setLoading(true)
      
      // Construir URL con parámetros
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: '20'
      })
      
      if (filterEstado !== 'todos') {
        params.append('estado', filterEstado)
      }
      
      const response = await fetch(`/api/packages?${params.toString()}`)
      const data = await response.json()

      if (response.ok) {
        setPackages(data.packages || [])
        setPagination(data.pagination)
      }
    } catch (error) {
      console.error('Error fetching packages:', error)
    } finally {
      setLoading(false)
    }
  }

  const handlePageChange = (newPage: number) => {
    setCurrentPage(newPage)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const fetchPackageAppointments = async (packageId: string) => {
    try {
      const response = await fetch(`/api/packages/${packageId}`)
      const data = await response.json()

      if (response.ok && data.package) {
        // Actualizar el paquete con las citas
        setPackages(prev => prev.map(pkg => 
          pkg.id === packageId 
            ? { ...pkg, appointments: data.package.appointments }
            : pkg
        ))
      }
    } catch (error) {
      console.error('Error fetching package appointments:', error)
    }
  }

  const toggleExpand = async (packageId: string) => {
    const newExpanded = new Set(expandedPackages)
    
    if (newExpanded.has(packageId)) {
      newExpanded.delete(packageId)
    } else {
      newExpanded.add(packageId)
      // Cargar las citas si no están cargadas
      const pkg = packages.find(p => p.id === packageId)
      if (pkg && !pkg.appointments) {
        await fetchPackageAppointments(packageId)
      }
    }
    
    setExpandedPackages(newExpanded)
  }

  const filteredPackages = packages.filter(pkg => {
    const patientName = pkg.patient?.nombre?.toLowerCase() || ''
    const patientLastName = pkg.patient?.apellido?.toLowerCase() || ''
    const search = searchTerm.toLowerCase()

    const matchesSearch = 
      patientName.includes(search) ||
      patientLastName.includes(search)

    const matchesEstado = filterEstado === 'todos' || pkg.estado === filterEstado

    return matchesSearch && matchesEstado
  })

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0
    }).format(amount)
  }

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

  const getDireccionIcon = (tieneTemporal: boolean) => {
    return tieneTemporal ? '🏢' : '🏠'
  }

  const getDireccionTooltip = (tieneTemporal: boolean) => {
    return tieneTemporal ? 'Dirección temporal' : 'Dirección del domicilio'
  }

  const getProgressPercentage = (pkg: Package) => {
    return (pkg.sesiones_completadas / pkg.total_sesiones) * 100
  }

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
            {/* Búsqueda */}
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

            {/* Filtro por estado */}
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
                      <div className="flex items-center gap-3 mb-2">
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${getEstadoBadgeColor(pkg.estado)}`}>
                          {pkg.estado.toUpperCase()}
                        </span>
                        <span className="px-3 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200">
                          📦 {pkg.service?.nombre || 'Paquete'}
                        </span>
                      </div>
                      
                      <h3 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50 mb-1">
                        {pkg.patient?.nombre} {pkg.patient?.apellido}
                      </h3>
                      
                      <div className="text-sm text-zinc-600 dark:text-zinc-400 space-y-1">
                        <p>📞 {pkg.patient?.telefono}</p>
                        <p>📅 Fecha de compra: {formatDate(pkg.fecha_compra)}</p>
                        <p>💰 Valor total: {formatCurrency(pkg.valor_total)}</p>
                        <p>💵 Comisión total: {formatCurrency(pkg.comision_total)}</p>
                      </div>
                    </div>

                    {/* Progreso */}
                    <div className="md:w-64">
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
                  </div>

                  {/* Botón para expandir/colapsar citas */}
                  <button
                    onClick={() => toggleExpand(pkg.id)}
                    className="w-full mt-4 px-4 py-2 bg-zinc-100 dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100 rounded-lg hover:bg-zinc-200 dark:hover:bg-zinc-600 transition-colors text-sm font-medium"
                  >
                    {expandedPackages.has(pkg.id) ? '▲ Ocultar citas' : '▼ Ver todas las citas'}
                  </button>
                </div>

                {/* Lista de citas (expandible) */}
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
                        {pkg.appointments.map((apt, index) => (
                          <div
                            key={apt.id}
                            className="bg-white dark:bg-zinc-800 p-4 rounded-lg"
                          >
                            {/* SECCIÓN SUPERIOR: Información de la cita */}
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
                                
                                {/* Dirección con indicador */}
                                <div className="flex items-start gap-2 mt-2 pt-2 border-t border-zinc-200 dark:border-zinc-700">
                                  <span 
                                    className="text-base" 
                                    title={getDireccionTooltip(apt.tiene_direccion_temporal)}
                                  >
                                    {getDireccionIcon(apt.tiene_direccion_temporal)}
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
                            
                            {/* SECCIÓN INFERIOR: Estado y acciones */}
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
        {/* Controles de paginación */}
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
              <span className="text-sm text-zinc-600 dark:text-zinc-400">
                Página
              </span>
              <span className="px-3 py-1 bg-pink-100 dark:bg-pink-900 text-pink-800 dark:text-pink-200 rounded-lg font-semibold">
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
                  : 'bg-pink-600 text-white hover:bg-pink-700'
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
      