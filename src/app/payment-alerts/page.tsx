'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'

// Interfaces
interface Patient {
  id: string
  nombre: string
  apellido: string
  telefono: string
}

interface Service {
  nombre: string
  cantidad_sesiones: number
}

interface Package {
  id: string
  service: Service
  segundo_pago_completado: boolean
  monto_segundo_pago: number
}

interface Alert {
  id: string
  package_id: string
  patient_id: string
  monto_pendiente: number
  fecha_ultima_sesion_pagada: string
  nivel_urgencia: 'urgente' | 'normal' | 'bajo'
  contactado: boolean
  fecha_ultimo_contacto: string | null
  proximo_seguimiento: string | null
  alerta_activa: boolean
  estado_alerta: 'activa' | 'completada' | 'cancelada' | 'vencida'
  created_at: string
  patient: Patient
  package: Package
}

interface ContactLog {
  id: string
  alert_id: string
  tipo_contacto: string
  notas: string | null
  resultado: string | null
  proximo_seguimiento: string | null
  contactado_por: string
  created_at: string
}

// Componentes de iconos SVG
const BellAlertIcon = ({ className = "w-6 h-6" }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 0 0 5.454-1.31A8.967 8.967 0 0 1 18 9.75V9A6 6 0 0 0 6 9v.75a8.967 8.967 0 0 1-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 0 1-5.714 0m5.714 0a3 3 0 1 1-5.714 0M3.124 7.5A8.969 8.969 0 0 1 5.292 3m13.416 0a8.969 8.969 0 0 1 2.168 4.5" />
  </svg>
)

const PhoneIcon = ({ className = "w-5 h-5" }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 0 0 2.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 0 1-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 0 0-1.091-.852H4.5A2.25 2.25 0 0 0 2.25 4.5v2.25Z" />
  </svg>
)

const CurrencyIcon = ({ className = "w-5 h-5" }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
  </svg>
)

const PackageIcon = ({ className = "w-5 h-5" }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" d="m20.25 7.5-.625 10.632a2.25 2.25 0 0 1-2.247 2.118H6.622a2.25 2.25 0 0 1-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125Z" />
  </svg>
)

const XCircleIcon = ({ className = "w-5 h-5" }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" d="m9.75 9.75 4.5 4.5m0-4.5-4.5 4.5M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
  </svg>
)

const ClockIcon = ({ className = "w-5 h-5" }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
  </svg>
)

export default function PaymentAlertsPage() {
  const [alerts, setAlerts] = useState<Alert[]>([])
  const [loading, setLoading] = useState(true)
  const [filterUrgencia, setFilterUrgencia] = useState<string>('todos')
  const [filterContactado, setFilterContactado] = useState<string>('todos')
  const [searchTerm, setSearchTerm] = useState('')
  const [actualizandoUrgencias, setActualizandoUrgencias] = useState(false)
  const [expandedAlert, setExpandedAlert] = useState<string | null>(null)
  const [contactLogs, setContactLogs] = useState<Record<string, ContactLog[]>>({})
  const [showContactModal, setShowContactModal] = useState(false)
  const [showCancelModal, setShowCancelModal] = useState(false)
  const [showVencidaModal, setShowVencidaModal] = useState(false)
  const [selectedAlert, setSelectedAlert] = useState<Alert | null>(null)
  const [contactForm, setContactForm] = useState({
    tipo_contacto: '',
    notas: '',
    resultado: '',
    proximo_seguimiento: ''
  })
  const [cancelForm, setCancelForm] = useState({
    notas_finales: ''
  })
  const [processing, setProcessing] = useState(false)

  const [currentPage, setCurrentPage] = useState(1)
  const [pagination, setPagination] = useState<{
    page: number
    limit: number
    total: number
    totalPages: number
    hasMore: boolean
  } | null>(null)

  useEffect(() => {
    fetchAlerts()
  }, [filterUrgencia, currentPage])

  const fetchAlerts = async () => {
    try {
      setLoading(true)
      
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: '20' // 20 alertas por página
      })
      
      if (filterUrgencia !== 'todos') {
        params.append('nivel_urgencia', filterUrgencia)
      }
      params.append('alerta_activa', 'true') // Solo alertas activas
      
      const response = await fetch(`/api/payment-alerts?${params.toString()}`)
      const data = await response.json()

      if (response.ok) {
        setAlerts(data.alerts || [])
        setPagination(data.pagination)
      }
    } catch (error) {
      console.error('Error fetching alerts:', error)
    } finally {
      setLoading(false)
    }
  }

  const handlePageChange = (newPage: number) => {
    setCurrentPage(newPage)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const actualizarUrgencias = async () => {
    setActualizandoUrgencias(true)
    try {
      const response = await fetch('/api/payment-alerts/calcular-urgencia', {
        method: 'POST'
      })
      
      if (response.ok) {
        await fetchAlerts() // Recargar alertas con urgencias actualizadas
        alert('✅ Urgencias actualizadas correctamente')
      }
    } catch (error) {
      console.error('Error actualizando urgencias:', error)
      alert('❌ Error al actualizar urgencias')
    } finally {
      setActualizandoUrgencias(false)
    }
  }

  const fetchContactLogs = async (alertId: string) => {
    try {
      const response = await fetch(`/api/payment-alerts/${alertId}/contactos`)
      const data = await response.json()

      if (response.ok) {
        // El backend devuelve "contacts" (inglés), no "contactos"
        setContactLogs(prev => ({
          ...prev,
          [alertId]: data.contacts || []
        }))
      }
    } catch (error) {
      console.error('Error fetching contact logs:', error)
    }
  }

  const toggleExpand = async (alertId: string) => {
    if (expandedAlert === alertId) {
      setExpandedAlert(null)
    } else {
      setExpandedAlert(alertId)
      // Cargar historial de contactos si no está cargado
      if (!contactLogs[alertId]) {
        await fetchContactLogs(alertId)
      }
    }
  }

  const handleOpenContactModal = (alert: Alert) => {
    setSelectedAlert(alert)
    setContactForm({
      tipo_contacto: '',
      notas: '',
      resultado: '',
      proximo_seguimiento: ''
    })
    setShowContactModal(true)
  }

  const handleOpenCancelModal = (alert: Alert) => {
    setSelectedAlert(alert)
    setCancelForm({ notas_finales: '' })
    setShowCancelModal(true)
  }

  const handleOpenVencidaModal = (alert: Alert) => {
    setSelectedAlert(alert)
    setCancelForm({ notas_finales: '' })
    setShowVencidaModal(true)
  }

  const handleRegistrarContacto = async () => {
    if (!selectedAlert) return

    if (!contactForm.tipo_contacto) {
      alert('Selecciona un tipo de contacto')
      return
    }

    try {
      setProcessing(true)

      const response = await fetch(`/api/payment-alerts/${selectedAlert.id}/registrar-contacto`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          tipo_contacto: contactForm.tipo_contacto,
          notas: contactForm.notas || null,
          resultado: contactForm.resultado || null,
          proximo_seguimiento: contactForm.proximo_seguimiento || null,
          contactado_por: 'admin' // TODO: Obtener del usuario autenticado
        })
      })

      const data = await response.json()

      if (response.ok) {
        const alertId = selectedAlert.id
        
        alert('✅ Contacto registrado exitosamente')
        setShowContactModal(false)
        setSelectedAlert(null)
        
        // Recargar alertas
        await fetchAlerts()
        
        // Forzar recarga del historial para esta alerta específica
        // Limpiar cache del historial primero
        setContactLogs(prev => {
          const newLogs = { ...prev }
          delete newLogs[alertId]
          return newLogs
        })
        
        // Si la alerta estaba expandida, recargar su historial
        if (expandedAlert === alertId) {
          await fetchContactLogs(alertId)
        }
      } else {
        alert(`❌ Error: ${data.error}`)
      }
    } catch (error) {
      console.error('Error registrando contacto:', error)
      alert('❌ Error al registrar el contacto')
    } finally {
      setProcessing(false)
    }
  }

  const handleCambiarEstado = async (nuevoEstado: 'cancelada' | 'vencida') => {
    if (!selectedAlert) return

    try {
      setProcessing(true)

      const response = await fetch(`/api/payment-alerts/${selectedAlert.id}/cambiar-estado`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          nuevo_estado: nuevoEstado,
          notas_finales: cancelForm.notas_finales || null
        })
      })

      const data = await response.json()

      if (response.ok) {
        alert(`✅ Alerta marcada como ${nuevoEstado}`)
        setShowCancelModal(false)
        setShowVencidaModal(false)
        setSelectedAlert(null)
        // Recargar alertas
        await fetchAlerts()
      } else {
        alert(`❌ Error: ${data.error}`)
      }
    } catch (error) {
      console.error('Error cambiando estado:', error)
      alert('❌ Error al cambiar el estado')
    } finally {
      setProcessing(false)
    }
  }

  const filteredAlerts = alerts.filter(alert => {
    const patientName = alert.patient?.nombre?.toLowerCase() || ''
    const patientLastName = alert.patient?.apellido?.toLowerCase() || ''
    const search = searchTerm.toLowerCase()

    const matchesSearch = 
      patientName.includes(search) ||
      patientLastName.includes(search) ||
      alert.patient?.telefono?.includes(search)

    const matchesContactado = 
      filterContactado === 'todos' ||
      (filterContactado === 'si' && alert.contactado) ||
      (filterContactado === 'no' && !alert.contactado)

    return matchesSearch && matchesContactado
  })

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0
    }).format(amount)
  }

  const formatDate = (dateString: string) => {
    if (!dateString) return ''
    // Si es fecha pura (sin hora real), extraer año/mes/día directamente del string
    // para evitar desfase UTC (Colombia es UTC-5)
    if (dateString.includes('T00:00:00')) {
      const [year, month, day] = dateString.substring(0, 10).split('-').map(Number)
      const date = new Date(year, month - 1, day)
      return date.toLocaleDateString('es-CO', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      })
    }
    const date = new Date(dateString)
    return date.toLocaleDateString('es-CO', {
      year: 'numeric',
      month: 'short',
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

  const getDiasRestantes = (fechaString: string) => {
    const fecha = new Date(fechaString)
    const hoy = new Date()
    const diff = Math.ceil((fecha.getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24))
    return diff
  }

  const getUrgenciaBadge = (nivel: string) => {
    switch (nivel) {
      case 'urgente':
        return {
          color: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200 border-red-300 dark:border-red-700',
          icon: '🔴',
          text: 'URGENTE'
        }
      case 'normal':
        return {
          color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200 border-yellow-300 dark:border-yellow-700',
          icon: '🟡',
          text: 'NORMAL'
        }
      case 'bajo':
        return {
          color: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 border-blue-300 dark:border-blue-700',
          icon: '🔵',
          text: 'BAJA'
        }
      default:
        return {
          color: 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200 border-gray-300 dark:border-gray-700',
          icon: '⚪',
          text: 'DESCONOCIDA'
        }
    }
  }

  const getTipoContactoBadge = (tipo: string) => {
    switch (tipo) {
      case 'llamada_exitosa':
        return { icon: '📞', text: 'Llamada exitosa', color: 'text-green-600' }
      case 'no_contesto':
        return { icon: '📵', text: 'No contestó', color: 'text-orange-600' }
      case 'mensaje_voz':
        return { icon: '🎤', text: 'Mensaje de voz', color: 'text-blue-600' }
      case 'whatsapp':
        return { icon: '💬', text: 'WhatsApp', color: 'text-green-600' }
      default:
        return { icon: '📝', text: tipo, color: 'text-gray-600' }
    }
  }

 const getResultadoBadge = (resultado: string) => {
    switch (resultado) {
      case 'confirmo_pago':
        return { icon: '✅', text: 'Confirmó pago', color: 'bg-green-50 text-green-700 border-green-200' }
      case 'pide_extension':
        return { icon: '⏰', text: 'Pide extensión', color: 'bg-yellow-50 text-yellow-700 border-yellow-200' }
      case 'no_puede_pagar':
        return { icon: '❌', text: 'No puede pagar', color: 'bg-red-50 text-red-700 border-red-200' }
      default:
        return { icon: '📝', text: resultado, color: 'bg-gray-50 text-gray-700 border-gray-200' }
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-50 dark:bg-zinc-900">
        <div className="text-zinc-600 dark:text-zinc-400">Cargando alertas...</div>
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
          <div className="flex items-center gap-3 mb-2">
            <BellAlertIcon className="w-8 h-8 text-orange-600" />
            <h1 className="text-3xl font-bold text-zinc-900 dark:text-zinc-50">
              Alertas de Pagos Pendientes
            </h1>
          </div>
          <p className="text-zinc-600 dark:text-zinc-400">
            {pagination ? (
              <>
                Mostrando {filteredAlerts.length} de {pagination.total} alerta{pagination.total !== 1 ? 's' : ''} • 
                Página {pagination.page} de {pagination.totalPages}
              </>
            ) : (
              `${filteredAlerts.length} alerta${filteredAlerts.length !== 1 ? 's' : ''} encontrada${filteredAlerts.length !== 1 ? 's' : ''}`
            )}
          </p>
        </div>

        {/* Resumen y controles */}
        <div className="bg-white dark:bg-zinc-800 rounded-lg shadow-md p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="text-center">
              <div className="text-3xl font-bold text-red-600 dark:text-red-400">
                {alerts.filter(a => a.nivel_urgencia === 'urgente').length}
              </div>
              <div className="text-sm text-zinc-600 dark:text-zinc-400 mt-1">
                🔴 Urgentes
              </div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-yellow-600 dark:text-yellow-400">
                {alerts.filter(a => a.nivel_urgencia === 'normal').length}
              </div>
              <div className="text-sm text-zinc-600 dark:text-zinc-400 mt-1">
                🟡 Normales
              </div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-blue-600 dark:text-blue-400">
                {alerts.filter(a => a.nivel_urgencia === 'bajo').length}
              </div>
              <div className="text-sm text-zinc-600 dark:text-zinc-400 mt-1">
                🔵 Bajas
              </div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-emerald-600 dark:text-emerald-400">
                {formatCurrency(alerts.reduce((sum, a) => sum + a.monto_pendiente, 0))}
              </div>
              <div className="text-sm text-zinc-600 dark:text-zinc-400 mt-1">
                💵 Total por Cobrar
              </div>
            </div>
          </div>

          <button
            onClick={actualizarUrgencias}
            disabled={actualizandoUrgencias}
            className="w-full rounded-lg bg-slate-600 px-4 py-3 text-base font-semibold text-white shadow-md transition-all hover:bg-slate-700 hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-slate-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {actualizandoUrgencias ? '🔄 Actualizando...' : '🔄 Actualizar Urgencias'}
          </button>
        </div>

        {/* Filtros */}
        <div className="bg-white dark:bg-zinc-800 rounded-lg shadow-sm p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Búsqueda */}
            <div>
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                Buscar paciente
              </label>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Nombre, teléfono..."
                className="w-full px-4 py-2 rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 focus:ring-2 focus:ring-orange-500"
              />
            </div>

            {/* Filtro por urgencia */}
            <div>
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                Nivel de urgencia
              </label>
              <select
                value={filterUrgencia}
                onChange={(e) => {
                  setFilterUrgencia(e.target.value)
                  setCurrentPage(1) // ← AGREGAR ESTA LÍNEA
                }}
                className="w-full px-4 py-2 rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 focus:ring-2 focus:ring-orange-500"
              >
                <option value="todos">Todas las urgencias</option>
                <option value="urgente">🔴 Urgente</option>
                <option value="normal">🟡 Normal</option>
                <option value="bajo">🔵 Baja</option>
              </select>
            </div>

            {/* Filtro por contactado */}
            <div>
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                Estado de contacto
              </label>
              <select
                value={filterContactado}
                onChange={(e) => {
                  setFilterContactado(e.target.value)
                  setCurrentPage(1) // ← AGREGAR ESTA LÍNEA
                }}
                className="w-full px-4 py-2 rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 focus:ring-2 focus:ring-orange-500"
              >
                <option value="todos">Todos</option>
                <option value="si">Contactados</option>
                <option value="no">Sin contactar</option>
              </select>
            </div>
          </div>
        </div>

        {/* Lista de alertas */}
        {filteredAlerts.length === 0 ? (
          <div className="bg-white dark:bg-zinc-800 rounded-lg shadow-sm p-12 text-center">
            <BellAlertIcon className="w-16 h-16 mx-auto text-zinc-400 mb-4" />
            <p className="text-zinc-600 dark:text-zinc-400 text-lg">
              No hay alertas activas con los filtros aplicados
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredAlerts.map((alert) => {
              const diasRestantes = getDiasRestantes(alert.fecha_ultima_sesion_pagada)
              const urgenciaBadge = getUrgenciaBadge(alert.nivel_urgencia)
              
              return (
                <div
                  key={alert.id}
                  className={`bg-white dark:bg-zinc-800 rounded-lg shadow-sm overflow-hidden border-l-4 ${
                    alert.nivel_urgencia === 'urgente' ? 'border-red-500' :
                    alert.nivel_urgencia === 'normal' ? 'border-yellow-500' :
                    'border-blue-500'
                  }`}
                >
                  <div className="p-6">
                    {/* Header de la alerta */}
                    <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4 mb-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-3">
                          <span className={`px-3 py-1.5 rounded-full text-xs font-bold border-2 ${urgenciaBadge.color}`}>
                            {urgenciaBadge.icon} {urgenciaBadge.text}
                          </span>
                          {alert.contactado && (
                            <span className="px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                              ✅ Contactado
                            </span>
                          )}
                        </div>

                        <h3 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50 mb-2">
                          {alert.patient?.nombre} {alert.patient?.apellido}
                        </h3>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-2 text-sm">
                          <div className="flex items-center gap-2 text-zinc-600 dark:text-zinc-400">
                            <PhoneIcon className="w-4 h-4" />
                            <a 
                              href={`tel:${alert.patient?.telefono}`}
                              className="hover:text-blue-600 dark:hover:text-blue-400"
                            >
                              {alert.patient?.telefono}
                            </a>
                          </div>

                          <div className="flex items-center gap-2 text-zinc-600 dark:text-zinc-400">
                            <PackageIcon className="w-4 h-4" />
                            <span>{alert.package?.service?.nombre}</span>
                          </div>

                          <div className="flex items-center gap-2 text-zinc-600 dark:text-zinc-400">
                            <CurrencyIcon className="w-4 h-4" />
                            <span className="font-semibold text-red-600 dark:text-red-400">
                              {formatCurrency(alert.monto_pendiente)} pendiente
                            </span>
                          </div>

                          <div className="flex items-center gap-2 text-zinc-600 dark:text-zinc-400">
                            <ClockIcon className="w-4 h-4" />
                            <span>
                              Última sesión pagada: {formatDate(alert.fecha_ultima_sesion_pagada)}
                            </span>
                          </div>
                        </div>

                        {/* Días restantes */}
                        <div className={`mt-3 inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-semibold ${
                          diasRestantes <= 0 ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200' :
                          diasRestantes <= 3 ? 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200' :
                          'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
                        }`}>
                          {diasRestantes <= 0 ? '⚠️ VENCIDO' :
                           diasRestantes === 1 ? '⏰ 1 día restante' :
                           `⏰ ${diasRestantes} días restantes`}
                        </div>

                        {/* Último contacto */}
                        {alert.fecha_ultimo_contacto && (
                          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-2">
                            Último contacto: {formatDateTime(alert.fecha_ultimo_contacto)}
                          </p>
                        )}
                        {alert.proximo_seguimiento && (
                          <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                            Próximo seguimiento: {formatDate(alert.proximo_seguimiento)}
                          </p>
                        )}
                      </div>

                      {/* Acciones */}
                      <div className="md:w-72 space-y-2">
                        <button
                          onClick={() => handleOpenContactModal(alert)}
                          className="w-full px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-semibold shadow-md hover:shadow-lg flex items-center justify-center gap-2"
                        >
                          <PhoneIcon className="w-4 h-4" />
                          Registrar Contacto
                        </button>

                        <Link
                          href="/packages"
                          className="block w-full px-4 py-2.5 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-sm font-semibold shadow-md hover:shadow-lg text-center"
                        >
                          <PackageIcon className="w-4 h-4 inline mr-2" />
                          Ver Paquete
                        </Link>

                        <button
                          onClick={() => handleOpenCancelModal(alert)}
                          className="w-full px-4 py-2.5 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm font-semibold shadow-md hover:shadow-lg flex items-center justify-center gap-2"
                        >
                          <XCircleIcon className="w-4 h-4" />
                          Cancelar Paquete
                        </button>

                        <button
                          onClick={() => handleOpenVencidaModal(alert)}
                          className="w-full px-4 py-2.5 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors text-sm font-semibold shadow-md hover:shadow-lg flex items-center justify-center gap-2"
                        >
                          <ClockIcon className="w-4 h-4" />
                          Marcar como Vencida
                        </button>
                      </div>
                    </div>

                    {/* Botón para ver historial */}
                    <button
                      onClick={() => toggleExpand(alert.id)}
                      className="w-full mt-4 px-4 py-2 bg-zinc-100 dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100 rounded-lg hover:bg-zinc-200 dark:hover:bg-zinc-600 transition-colors text-sm font-medium"
                    >
                      {expandedAlert === alert.id ? '▲ Ocultar historial de contactos' : '▼ Ver historial de contactos'}
                    </button>
                  </div>

                  {/* Historial de contactos (expandible) */}
                  {expandedAlert === alert.id && (
                    <div className="border-t border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-900 p-6">
                      {!contactLogs[alert.id] ? (
                        <div className="text-center text-zinc-600 dark:text-zinc-400 py-4">
                          Cargando historial...
                        </div>
                      ) : contactLogs[alert.id].length === 0 ? (
                        <div className="text-center text-zinc-600 dark:text-zinc-400 py-4">
                          No hay contactos registrados para esta alerta
                        </div>
                      ) : (
                        <div className="space-y-3">
                          <h4 className="font-semibold text-zinc-900 dark:text-zinc-50 mb-3">
                            Historial de Contactos ({contactLogs[alert.id].length})
                          </h4>
                          {contactLogs[alert.id].map((log) => {
                            const tipoBadge = getTipoContactoBadge(log.tipo_contacto)
                            const resultadoBadge = log.resultado ? getResultadoBadge(log.resultado) : null

                            return (
                              <div
                                key={log.id}
                                className="bg-white dark:bg-zinc-800 p-4 rounded-lg border border-zinc-200 dark:border-zinc-700"
                              >
                                <div className="flex items-start justify-between mb-2">
                                  <div className="flex items-center gap-2">
                                    <span className={`text-sm font-medium ${tipoBadge.color}`}>
                                      {tipoBadge.icon} {tipoBadge.text}
                                    </span>
                                    {resultadoBadge && (
                                      <span className={`text-xs px-2 py-1 rounded-full border ${resultadoBadge.color}`}>
                                        {resultadoBadge.icon} {resultadoBadge.text}
                                      </span>
                                    )}
                                  </div>
                                  <span className="text-xs text-zinc-500 dark:text-zinc-400">
                                    {formatDateTime(log.created_at)}
                                  </span>
                                </div>

                                {log.notas && (
                                  <p className="text-sm text-zinc-700 dark:text-zinc-300 mb-2">
                                    {log.notas}
                                  </p>
                                )}

                                <div className="flex items-center justify-between text-xs text-zinc-500 dark:text-zinc-400">
                                  <span>Por: {log.contactado_por}</span>
                                  {log.proximo_seguimiento && (
                                    <span className="text-blue-600 dark:text-blue-400">
                                      Próximo seguimiento: {formatDate(log.proximo_seguimiento)}
                                    </span>
                                  )}
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Modal de Registrar Contacto */}
      {showContactModal && selectedAlert && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-zinc-800 rounded-lg shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-zinc-200 dark:border-zinc-700">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">
                  📞 Registrar Contacto
                </h2>
                <button
                  onClick={() => setShowContactModal(false)}
                  disabled={processing}
                  className="text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200"
                >
                  ✕
                </button>
              </div>
              <div className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
                Paciente: <span className="font-semibold">{selectedAlert.patient?.nombre} {selectedAlert.patient?.apellido}</span>
              </div>
            </div>

            <div className="p-6 space-y-4">
              {/* Tipo de contacto */}
              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                  Tipo de Contacto *
                </label>
                <select
                  value={contactForm.tipo_contacto}
                  onChange={(e) => setContactForm(prev => ({ ...prev, tipo_contacto: e.target.value }))}
                  disabled={processing}
                  className="w-full px-4 py-2 border border-zinc-300 dark:border-zinc-600 rounded-lg bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-50 focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-zinc-100 dark:disabled:bg-zinc-700"
                >
                  <option value="">Seleccionar tipo</option>
                  <option value="llamada_exitosa">📞 Llamada exitosa</option>
                  <option value="no_contesto">📵 No contestó</option>
                  <option value="mensaje_voz">🎤 Mensaje de voz</option>
                  <option value="whatsapp">💬 WhatsApp</option>
                </select>
              </div>

              {/* Resultado */}
              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                  Resultado del Contacto
                </label>
                <select
                  value={contactForm.resultado}
                  onChange={(e) => setContactForm(prev => ({ ...prev, resultado: e.target.value }))}
                  disabled={processing}
                  className="w-full px-4 py-2 border border-zinc-300 dark:border-zinc-600 rounded-lg bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-50 focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-zinc-100 dark:disabled:bg-zinc-700"
                >
                  <option value="">Ninguno</option>
                  <option value="confirmo_pago">✅ Confirmó pago</option>
                  <option value="pide_extension">⏰ Pide extensión</option>
                  <option value="no_puede_pagar">❌ No puede pagar</option>
                </select>
              </div>

              {/* Notas */}
              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                  Notas del Contacto
                </label>
                <textarea
                  value={contactForm.notas}
                  onChange={(e) => setContactForm(prev => ({ ...prev, notas: e.target.value }))}
                  disabled={processing}
                  rows={4}
                  placeholder="Describe qué se habló con el paciente..."
                  className="w-full px-4 py-2 border border-zinc-300 dark:border-zinc-600 rounded-lg bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-50 focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-zinc-100 dark:disabled:bg-zinc-700"
                />
              </div>

              {/* Próximo seguimiento */}
              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                  Próximo Seguimiento (opcional)
                </label>
                <input
                  type="date"
                  value={contactForm.proximo_seguimiento}
                  onChange={(e) => setContactForm(prev => ({ ...prev, proximo_seguimiento: e.target.value }))}
                  disabled={processing}
                  className="w-full px-4 py-2 border border-zinc-300 dark:border-zinc-600 rounded-lg bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-50 focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-zinc-100 dark:disabled:bg-zinc-700"
                />
              </div>
            </div>

            <div className="p-6 border-t border-zinc-200 dark:border-zinc-700 flex gap-3">
              <button
                onClick={() => setShowContactModal(false)}
                disabled={processing}
                className="flex-1 px-4 py-2 border border-zinc-300 dark:border-zinc-600 text-zinc-700 dark:text-zinc-300 rounded-lg hover:bg-zinc-50 dark:hover:bg-zinc-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancelar
              </button>
              <button
                onClick={handleRegistrarContacto}
                disabled={processing}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium flex items-center justify-center gap-2"
              >
                {processing ? (
                  <>
                    <div className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-solid border-white border-r-transparent"></div>
                    Guardando...
                  </>
                ) : (
                  '✅ Registrar Contacto'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Cancelar Paquete */}
      {showCancelModal && selectedAlert && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-zinc-800 rounded-lg shadow-xl max-w-md w-full">
            <div className="p-6 border-b border-zinc-200 dark:border-zinc-700">
              <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">
                ❌ Cancelar Paquete
              </h2>
              <p className="text-sm text-zinc-600 dark:text-zinc-400 mt-2">
                ¿Estás seguro de que deseas marcar esta alerta como <span className="font-semibold">cancelada</span>? El paciente decidió no continuar con el tratamiento.
              </p>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                  Notas Finales
                </label>
                <textarea
                  value={cancelForm.notas_finales}
                  onChange={(e) => setCancelForm({ notas_finales: e.target.value })}
                  disabled={processing}
                  rows={4}
                  placeholder="Explica el motivo de la cancelación..."
                  className="w-full px-4 py-2 border border-zinc-300 dark:border-zinc-600 rounded-lg bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-50 focus:ring-2 focus:ring-red-500 focus:border-transparent disabled:bg-zinc-100 dark:disabled:bg-zinc-700"
                />
              </div>
            </div>

            <div className="p-6 border-t border-zinc-200 dark:border-zinc-700 flex gap-3">
              <button
                onClick={() => setShowCancelModal(false)}
                disabled={processing}
                className="flex-1 px-4 py-2 border border-zinc-300 dark:border-zinc-600 text-zinc-700 dark:text-zinc-300 rounded-lg hover:bg-zinc-50 dark:hover:bg-zinc-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Volver
              </button>
              <button
                onClick={() => handleCambiarEstado('cancelada')}
                disabled={processing}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium flex items-center justify-center gap-2"
              >
                {processing ? (
                  <>
                    <div className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-solid border-white border-r-transparent"></div>
                    Procesando...
                  </>
                ) : (
                  '❌ Confirmar Cancelación'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Marcar como Vencida */}
      {showVencidaModal && selectedAlert && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-zinc-800 rounded-lg shadow-xl max-w-md w-full">
            <div className="p-6 border-b border-zinc-200 dark:border-zinc-700">
              <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">
                ⏰ Marcar como Vencida
              </h2>
              <p className="text-sm text-zinc-600 dark:text-zinc-400 mt-2">
                ¿Estás seguro de que deseas marcar esta alerta como <span className="font-semibold">vencida</span>? El paciente no ha respondido a múltiples intentos de contacto.
              </p>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                  Notas Finales
                </label>
                <textarea
                  value={cancelForm.notas_finales}
                  onChange={(e) => setCancelForm({ notas_finales: e.target.value })}
                  disabled={processing}
                  rows={4}
                  placeholder="Describe los intentos de contacto realizados..."
                  className="w-full px-4 py-2 border border-zinc-300 dark:border-zinc-600 rounded-lg bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-50 focus:ring-2 focus:ring-gray-500 focus:border-transparent disabled:bg-zinc-100 dark:disabled:bg-zinc-700"
                />
              </div>
            </div>

            <div className="p-6 border-t border-zinc-200 dark:border-zinc-700 flex gap-3">
              <button
                onClick={() => setShowVencidaModal(false)}
                disabled={processing}
                className="flex-1 px-4 py-2 border border-zinc-300 dark:border-zinc-600 text-zinc-700 dark:text-zinc-300 rounded-lg hover:bg-zinc-50 dark:hover:bg-zinc-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Volver
              </button>
              <button
                onClick={() => handleCambiarEstado('vencida')}
                disabled={processing}
                className="flex-1 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium flex items-center justify-center gap-2"
              >
                {processing ? (
                  <>
                    <div className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-solid border-white border-r-transparent"></div>
                    Procesando...
                  </>
                ) : (
                  '⏰ Marcar como Vencida'
                )}
              </button>
            </div>
          </div>
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
                  : 'bg-orange-600 text-white hover:bg-orange-700'
              }`}
            >
              ← Anterior
            </button>

            <div className="flex items-center gap-2">
              <span className="text-sm text-zinc-600 dark:text-zinc-400">
                Página
              </span>
              <span className="px-3 py-1 bg-orange-100 dark:bg-orange-900 text-orange-800 dark:text-orange-200 rounded-lg font-semibold">
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
                  : 'bg-orange-600 text-white hover:bg-orange-700'
              }`}
            >
              Siguiente →
            </button>
          </div>
        )}
    </div>
  )
}