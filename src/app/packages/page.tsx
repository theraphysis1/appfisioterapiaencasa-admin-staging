'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'

interface Patient {
  id: string
  nombre: string
  apellido: string
  telefono: string
  direccion?: string
  barrio?: string
  referencia?: string
}

interface Service {
  id: string
  nombre: string
  tipo: string
  cantidad_sesiones: number
  valor_default: number
  comision_default: number
}

interface ValoracionCita {
  id: string
  fecha_hora: string
  therapist: {
    nombre: string
    apellido: string
  }
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
  // Campos de valoración y pagos fraccionados
  tiene_valoracion_previa: boolean
  valoracion_cita_id: string | null
  valoracion_monto: number | null
  forma_pago: 'completo' | 'fraccionado'
  numero_pagos: number
  monto_primer_pago: number | null
  monto_segundo_pago: number | null
  sesiones_primer_pago: number | null
  sesiones_segundo_pago: number | null
  primer_pago_completado: boolean
  fecha_primer_pago: string | null
  segundo_pago_completado: boolean
  fecha_segundo_pago: string | null
  saldo_pendiente: number
  // Relaciones
  patient: Patient
  service: Service
  valoracion_cita?: ValoracionCita | null
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
  const [showPaymentModal, setShowPaymentModal] = useState(false)
  const [selectedPackage, setSelectedPackage] = useState<Package | null>(null)
  const [paymentForm, setPaymentForm] = useState({
    monto: '',
    metodo_pago: '',
    notas: ''
  })
  const [processingPayment, setProcessingPayment] = useState(false)

  const [showCancelModal, setShowCancelModal] = useState(false)
  const [packageToCancel, setPackageToCancel] = useState<Package | null>(null)
  const [cancelForm, setCancelForm] = useState({
    razon_cancelacion: '',
    cancelado_por: 'Admin' // TODO: Obtener del usuario autenticado
  })
  const [processingCancel, setProcessingCancel] = useState(false)

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

  const handleOpenPaymentModal = (pkg: Package) => {
    setSelectedPackage(pkg)
    setPaymentForm({
      monto: (pkg.monto_segundo_pago || 0).toString(),
      metodo_pago: '',
      notas: ''
    })
    setShowPaymentModal(true)
  }

  const handleClosePaymentModal = () => {
    setShowPaymentModal(false)
    setSelectedPackage(null)
    setPaymentForm({
      monto: '',
      metodo_pago: '',
      notas: ''
    })
  }

  const handleRegistrarPago = async () => {
    if (!selectedPackage) return

    if (!paymentForm.monto || parseFloat(paymentForm.monto) <= 0) {
      alert('El monto debe ser mayor a 0')
      return
    }

    if (!paymentForm.metodo_pago) {
      alert('Selecciona un método de pago')
      return
    }

    try {
      setProcessingPayment(true)

      const response = await fetch(`/api/packages/${selectedPackage.id}/registrar-pago`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          numero_pago: 2,
          monto: parseFloat(paymentForm.monto),
          metodo_pago: paymentForm.metodo_pago,
          notas: paymentForm.notas || null,
          registrado_por: 'admin' // TODO: Obtener del usuario autenticado
        })
      })

      const data = await response.json()

      if (response.ok) {
        alert('✅ Segundo pago registrado exitosamente')
        handleClosePaymentModal()
        // Recargar los paquetes para ver los cambios
        fetchPackages()
      } else {
        alert(`❌ Error: ${data.error}`)
      }
    } catch (error) {
      console.error('Error registrando pago:', error)
      alert('❌ Error al registrar el pago')
    } finally {
      setProcessingPayment(false)
    }
  }

  const getProgressPercentage = (pkg: Package) => {
    return (pkg.sesiones_completadas / pkg.total_sesiones) * 100
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

  const needsSecondPaymentButton = (pkg: Package) => {
    return (
      pkg.forma_pago === 'fraccionado' &&
      pkg.primer_pago_completado &&
      !pkg.segundo_pago_completado
    )
  }

  const needsScheduleRemainingButton = (pkg: Package) => {
    return (
      pkg.forma_pago === 'fraccionado' &&
      pkg.segundo_pago_completado &&
      pkg.sesiones_pendientes_agendar > 0
    )
  }

  const formatCurrencyCompact = (amount: number) => {
    if (amount >= 1000000) {
      return `$${(amount / 1000000).toFixed(1)}M`
    }
    if (amount >= 1000) {
      return `$${(amount / 1000).toFixed(0)}K`
    }
    return formatCurrency(amount)
  }

  const handleOpenCancelModal = (pkg: Package) => {
    setPackageToCancel(pkg)
    setCancelForm({
      razon_cancelacion: '',
      cancelado_por: 'Admin' // TODO: Obtener del usuario autenticado
    })
    setShowCancelModal(true)
  }

  const handleCloseCancelModal = () => {
    setShowCancelModal(false)
    setPackageToCancel(null)
    setCancelForm({
      razon_cancelacion: '',
      cancelado_por: 'Admin'
    })
  }

  const handleCancelarPaquete = async () => {
    if (!packageToCancel) return

    if (!cancelForm.razon_cancelacion || cancelForm.razon_cancelacion.trim() === '') {
      alert('⚠️ Debes proporcionar una razón de cancelación')
      return
    }

    const confirmacion = confirm(
      `⚠️ ¿CONFIRMAS LA CANCELACIÓN?\n\n` +
      `Paciente: ${packageToCancel.patient?.nombre} ${packageToCancel.patient?.apellido}\n` +
      `Paquete: ${packageToCancel.service?.nombre}\n\n` +
      `Esta acción:\n` +
      `• Cancelará el paquete permanentemente\n` +
      `• Eliminará todas las citas agendadas futuras\n` +
      `• Liberará los espacios en la agenda de terapeutas\n` +
      `• Cerrará la alerta de pago pendiente\n\n` +
      `Esta acción NO SE PUEDE DESHACER.`
    )

    if (!confirmacion) return

    try {
      setProcessingCancel(true)

      const response = await fetch(`/api/packages/${packageToCancel.id}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          razon_cancelacion: cancelForm.razon_cancelacion.trim(),
          cancelado_por: cancelForm.cancelado_por.trim()
        })
      })

      const data = await response.json()

      if (response.ok) {
        alert(
          `✅ Paquete cancelado exitosamente\n\n` +
          `${data.citas_eliminadas} cita(s) eliminada(s)\n` +
          `Espacios liberados en agenda de terapeutas`
        )
        handleCloseCancelModal()
        // Recargar los paquetes para ver los cambios
        fetchPackages()
      } else {
        alert(`❌ Error: ${data.error}`)
      }
    } catch (error) {
      console.error('Error cancelando paquete:', error)
      alert('❌ Error al cancelar el paquete')
    } finally {
      setProcessingCancel(false)
    }
  }

  const getSesionesDisponibles = (pkg: Package) => {
  // ✅ Sesiones disponibles = sesiones pagadas que aún no están agendadas
  // Ya no necesitamos calcular esto manualmente porque sesiones_pendientes_agendar 
  // ya viene calculado correctamente desde el backend
  return pkg.sesiones_pendientes_agendar
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
                        {/* Información de valoración previa */}
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

                        {/* Información de pagos fraccionados */}
                        {pkg.forma_pago === 'fraccionado' && (
                          <div className="mb-3 p-3 bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-lg space-y-2">
                            <p className="text-xs font-semibold text-purple-800 dark:text-purple-300 mb-2">
                              📊 Pago Fraccionado ({pkg.numero_pagos} pagos)
                            </p>
                            
                            {/* Primer pago */}
                            <div className="flex items-center justify-between">
                              <span className="text-xs text-purple-700 dark:text-purple-400">
                                1er Pago ({pkg.sesiones_primer_pago} sesiones):
                              </span>
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-medium text-purple-900 dark:text-purple-200">
                                  {formatCurrency(pkg.monto_primer_pago || 0)}
                                </span>
                                {pkg.primer_pago_completado ? (
                                  <span className="text-xs text-green-600 dark:text-green-400">✅</span>
                                ) : (
                                  <span className="text-xs text-red-600 dark:text-red-400">❌</span>
                                )}
                              </div>
                            </div>

                            {/* Segundo pago */}
                            <div className="flex items-center justify-between">
                              <span className="text-xs text-purple-700 dark:text-purple-400">
                                2do Pago ({pkg.sesiones_segundo_pago} sesiones):
                              </span>
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-medium text-purple-900 dark:text-purple-200">
                                  {formatCurrency(pkg.monto_segundo_pago || 0)}
                                </span>
                                {pkg.segundo_pago_completado ? (
                                  <span className="text-xs text-green-600 dark:text-green-400">✅</span>
                                ) : (
                                  <span className="text-xs text-red-600 dark:text-red-400">❌</span>
                                )}
                              </div>
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
                      {/* Progreso del paquete */}
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

                      {/* Indicador de sesiones disponibles (pago fraccionado) */}
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
                          onClick={() => {
                            // Guardar datos del paquete para completarlo
                            const completePackageData = {
                              mode: 'complete',
                              package_id: pkg.id,
                              patient: pkg.patient,
                              service: pkg.service,
                              sesiones_restantes: pkg.sesiones_pendientes_agendar,
                              tiene_valoracion_previa: pkg.tiene_valoracion_previa,
                              valor: pkg.service.valor_default, // Valor por sesión del servicio
                              comision: pkg.service.comision_default, // Comisión por sesión del servicio
                              observacion: null
                            }

                            // 🔍 DEBUG: Ver qué datos estamos pasando
                            console.log('📦 Datos del paquete:', {
                              valor_total: pkg.valor_total,
                              comision_total: pkg.comision_total,
                              total_sesiones: pkg.total_sesiones,
                              valor_default: pkg.service?.valor_default,
                              comision_default: pkg.service?.comision_default,
                              valoracion_monto: pkg.valoracion_monto,
                              monto_primer_pago: pkg.monto_primer_pago,
                              monto_segundo_pago: pkg.monto_segundo_pago
                            })

                            console.log('🔍 Service completo:', pkg.service)
                            console.log('🔍 valor_default:', pkg.service?.valor_default)
                            console.log('🔍 comision_default:', pkg.service?.comision_default)
                            
                            // Adaptar al formato PackageData completo
                            const packageDataForConfirm = {
                              patient: {
                                id: pkg.patient.id,
                                nombre: pkg.patient.nombre,
                                apellido: pkg.patient.apellido,
                                telefono: pkg.patient.telefono,
                                direccion: pkg.patient.direccion || '',
                                barrio: pkg.patient.barrio || '',
                                referencia: pkg.patient.referencia || '',
                                patologia: 'Continuación de tratamiento'
                              },
                              service: pkg.service,
                              valor: pkg.service.valor_default,
                              comision: pkg.service.comision_default,
                              observacion: null,
                              tiene_valoracion_previa: pkg.tiene_valoracion_previa,
                              valoracion_cita_id: pkg.valoracion_cita_id,
                              valoracion_monto: pkg.valoracion_monto,
                              forma_pago: 'fraccionado',
                              numero_pagos: 2,
                              monto_primer_pago: pkg.monto_primer_pago,
                              monto_segundo_pago: pkg.monto_segundo_pago,
                              sesiones_primer_pago: 0,
                              sesiones_segundo_pago: pkg.sesiones_pendientes_agendar,
                              precio_calculado: {
                                precio_original: pkg.service.valor_default * pkg.total_sesiones,
                                descuento_valoracion: pkg.valoracion_monto || 0,
                                precio_final: (pkg.service.valor_default * pkg.total_sesiones) - (pkg.valoracion_monto || 0),
                                monto_primer_pago: pkg.monto_primer_pago || 0,
                                monto_segundo_pago: pkg.monto_segundo_pago || 0,
                                sesiones_primer_pago: 0, // ✅ Ya están agendadas (primer pago)
                                sesiones_segundo_pago: pkg.sesiones_pendientes_agendar // ✅ Las que faltan por agendar
                              }
                            }
                            
                            // Limpiar storage previo
                            sessionStorage.removeItem('packageAppointments')
                            sessionStorage.removeItem('isSchedulingPackage')
                            
                            // Guardar datos
                            sessionStorage.setItem('completePackageData', JSON.stringify(completePackageData))
                            sessionStorage.setItem('packageData', JSON.stringify(packageDataForConfirm))
                            sessionStorage.setItem('isCompletingPackage', 'true')

                            // 🔍 DEBUG: Verificar qué se guardó
                            console.log('💾 packageDataForConfirm guardado:', packageDataForConfirm)
                            console.log('💾 valoracion_monto:', packageDataForConfirm.valoracion_monto)
                            console.log('💾 monto_primer_pago:', packageDataForConfirm.monto_primer_pago)
                            console.log('💾 precio_calculado:', packageDataForConfirm.precio_calculado)
                            
                            // Redirigir DIRECTO a confirmación (usamos un therapist_id dummy)
                            window.location.href = '/patients/schedule/dummy/confirm'
                          }}
                          className="w-full px-4 py-2.5 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg hover:from-blue-700 hover:to-blue-800 transition-all text-sm font-semibold shadow-md hover:shadow-lg"
                        >
                          📅 Agendar Sesiones Restantes ({pkg.sesiones_pendientes_agendar})
                        </button>
                        )}

                      {/* Botón Cancelar Paquete - Solo para paquetes activos */}
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
      {/* Modal de Registro de Segundo Pago */}
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
              {/* Monto */}
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
                  className="w-full px-4 py-2 border border-zinc-300 dark:border-zinc-600 rounded-lg bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-50 focus:ring-2 focus:ring-green-500 focus:border-transparent disabled:bg-zinc-100 dark:disabled:bg-zinc-700"
                />
                <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
                  Monto esperado: {formatCurrency(selectedPackage.monto_segundo_pago || 0)}
                </p>
              </div>

              {/* Método de pago */}
              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                  Método de Pago *
                </label>
                <select
                  value={paymentForm.metodo_pago}
                  onChange={(e) => setPaymentForm(prev => ({ ...prev, metodo_pago: e.target.value }))}
                  disabled={processingPayment}
                  className="w-full px-4 py-2 border border-zinc-300 dark:border-zinc-600 rounded-lg bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-50 focus:ring-2 focus:ring-green-500 focus:border-transparent disabled:bg-zinc-100 dark:disabled:bg-zinc-700"
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

              {/* Notas */}
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
                  className="w-full px-4 py-2 border border-zinc-300 dark:border-zinc-600 rounded-lg bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-50 focus:ring-2 focus:ring-green-500 focus:border-transparent disabled:bg-zinc-100 dark:disabled:bg-zinc-700"
                />
              </div>

              {/* Información del paquete */}
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
                className="flex-1 px-4 py-2 border border-zinc-300 dark:border-zinc-600 text-zinc-700 dark:text-zinc-300 rounded-lg hover:bg-zinc-50 dark:hover:bg-zinc-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancelar
              </button>
              <button
                onClick={handleRegistrarPago}
                disabled={processingPayment}
                className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium flex items-center justify-center gap-2"
              >
                {processingPayment ? (
                  <>
                    <div className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-solid border-white border-r-transparent"></div>
                    Procesando...
                  </>
                ) : (
                  '✅ Registrar Pago'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Modal de Cancelación de Paquete */}
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
              {/* Advertencia */}
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

              {/* Información del paquete */}
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

              {/* Razón de cancelación */}
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
                  className="w-full px-4 py-2 border border-zinc-300 dark:border-zinc-600 rounded-lg bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-50 focus:ring-2 focus:ring-red-500 focus:border-transparent disabled:bg-zinc-100 dark:disabled:bg-zinc-700"
                />
                <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
                  Esta razón quedará registrada permanentemente en el sistema
                </p>
              </div>

              {/* Cancelado por */}
              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                  Cancelado Por
                </label>
                <input
                  type="text"
                  value={cancelForm.cancelado_por}
                  onChange={(e) => setCancelForm(prev => ({ ...prev, cancelado_por: e.target.value }))}
                  disabled={processingCancel}
                  className="w-full px-4 py-2 border border-zinc-300 dark:border-zinc-600 rounded-lg bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-50 focus:ring-2 focus:ring-red-500 focus:border-transparent disabled:bg-zinc-100 dark:disabled:bg-zinc-700"
                />
              </div>
            </div>

            <div className="p-6 border-t border-zinc-200 dark:border-zinc-700 flex gap-3">
              <button
                onClick={handleCloseCancelModal}
                disabled={processingCancel}
                className="flex-1 px-4 py-2 border border-zinc-300 dark:border-zinc-600 text-zinc-700 dark:text-zinc-300 rounded-lg hover:bg-zinc-50 dark:hover:bg-zinc-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Volver
              </button>
              <button
                onClick={handleCancelarPaquete}
                disabled={processingCancel || !cancelForm.razon_cancelacion.trim()}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium flex items-center justify-center gap-2"
              >
                {processingCancel ? (
                  <>
                    <div className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-solid border-white border-r-transparent"></div>
                    Cancelando...
                  </>
                ) : (
                  '❌ Confirmar Cancelación'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
      