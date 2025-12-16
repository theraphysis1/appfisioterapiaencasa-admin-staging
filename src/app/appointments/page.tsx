'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

interface Patient {
  id: string
  nombre: string
  apellido: string
  telefono: string
  direccion: string
  barrio: string
  referencia: string | null
}

interface Therapist {
  id: string
  nombre: string
  apellido: string
  cedula: string
  email: string
  contacto: string
  placa_moto: string
}

interface Service {
  id: string
  nombre: string
  tipo: string
  cantidad_sesiones: number
  valor_default: number
  comision_default: number
}

interface Appointment {
  id: string
  patient_id: string
  therapist_id: string
  service_id: string
  package_id: string | null
  fecha_hora: string
  patologia: string
  valor: number
  comision: number
  observacion: string | null
  estado: string
  created_at: string
  updated_at: string
  patient: Patient
  therapist: Therapist
  service: Service
}

export default function AppointmentsPage() {
  const router = useRouter()
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterEstado, setFilterEstado] = useState('todos')
  const [filterFechaDesde, setFilterFechaDesde] = useState('')
  const [filterFechaHasta, setFilterFechaHasta] = useState('')
  const [isUpdating, setIsUpdating] = useState(false)
  const [updateMessage, setUpdateMessage] = useState('')

  useEffect(() => {
    fetchAppointments()
  }, [])

  const handleBulkComplete = async () => {
    // Validar que haya fechas seleccionadas
    if (!filterFechaDesde || !filterFechaHasta) {
      setUpdateMessage('⚠️ Por favor selecciona un rango de fechas')
      setTimeout(() => setUpdateMessage(''), 3000)
      return
    }

    // Confirmar acción
    const confirmacion = window.confirm(
      '¿Estás seguro de actualizar todas las citas agendadas que ya pasaron su horario en el rango seleccionado?'
    )

    if (!confirmacion) return

    setIsUpdating(true)
    setUpdateMessage('')

    try {
      const response = await fetch('/api/appointments/bulk-complete', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          date_from: filterFechaDesde,
          date_to: filterFechaHasta,
        }),
      })

      const data = await response.json()

      if (response.ok) {
        setUpdateMessage(`✅ ${data.message}`)
        // Recargar la lista de citas
        await fetchAppointments()
      } else {
        setUpdateMessage(`❌ Error: ${data.error}`)
      }
    } catch (error) {
      console.error('Error updating appointments:', error)
      setUpdateMessage('❌ Error al actualizar las citas')
    } finally {
      setIsUpdating(false)
      // Limpiar mensaje después de 5 segundos
      setTimeout(() => setUpdateMessage(''), 5000)
    }
  }

  const fetchAppointments = async () => {
    try {
      const response = await fetch('/api/appointments')
      const data = await response.json()
      
      if (response.ok) {
        setAppointments(data.appointments || [])
      }
    } catch (error) {
      console.error('Error fetching appointments:', error)
    } finally {
      setLoading(false)
    }
  }

  const filteredAppointments = appointments.filter(apt => {
    // Verificar que existan los objetos relacionados antes de acceder a sus propiedades
    const patientName = apt.patient?.nombre?.toLowerCase() || ''
    const patientLastName = apt.patient?.apellido?.toLowerCase() || ''
    const therapistName = apt.therapist?.nombre?.toLowerCase() || ''
    const therapistLastName = apt.therapist?.apellido?.toLowerCase() || ''
    const search = searchTerm.toLowerCase()

    const matchesSearch = 
      patientName.includes(search) ||
      patientLastName.includes(search) ||
      therapistName.includes(search) ||
      therapistLastName.includes(search)
    
    const matchesEstado = filterEstado === 'todos' || apt.estado === filterEstado

    // Filtro por rango de fechas - solo compara la parte de la fecha (YYYY-MM-DD)
    const aptFecha = apt.fecha_hora.split('T')[0]
    const matchesFechaDesde = !filterFechaDesde || aptFecha >= filterFechaDesde
    const matchesFechaHasta = !filterFechaHasta || aptFecha <= filterFechaHasta

    return matchesSearch && matchesEstado && matchesFechaDesde && matchesFechaHasta
  })

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
            {filteredAppointments.length} cita{filteredAppointments.length !== 1 ? 's' : ''} encontrada{filteredAppointments.length !== 1 ? 's' : ''}
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
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Nombre, apellido..."
                className="w-full px-4 py-2 rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 focus:ring-2 focus:ring-indigo-500"
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
                className="w-full px-4 py-2 rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 focus:ring-2 focus:ring-indigo-500"
              >
                <option value="todos">Todos los estados</option>
                <option value="agendada">Agendada</option>
                <option value="completada">Completada</option>
                <option value="cancelada">Cancelada</option>
                <option value="pendiente_reagendar">Pendiente Reagendar</option>
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
                    onClick={() => setFilterFechaDesde('')}
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
                    onClick={() => setFilterFechaHasta('')}
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
        {filteredAppointments.length === 0 ? (
          <div className="bg-white dark:bg-zinc-800 rounded-lg shadow-sm p-12 text-center">
            <p className="text-zinc-600 dark:text-zinc-400">
              No se encontraron citas con los filtros aplicados
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredAppointments.map((apt) => (
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
      </div>
    </div>
  )
}