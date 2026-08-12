'use client'

import { useEffect, useState, useRef } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import { isoToBogotaParts, bogotaPartsToISO } from '@/lib/utils/dateRangeBogota'

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
}

interface Service {
  id: string
  nombre: string
  tipo: string
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
  patient: Patient
  therapist: Therapist
  service: Service
  // Campos de override
  direccion_override: string | null
  barrio_override: string | null
  referencia_override: string | null
  direccion_lat_override: number | null
  direccion_lng_override: number | null
  // Campos calculados
  direccion_final: string
  barrio_final: string
  referencia_final: string | null
  direccion_lat_final: number | null
  direccion_lng_final: number | null
  tiene_direccion_temporal: boolean
}

export default function EditAppointmentPage() {
  const router = useRouter()
  const params = useParams()
  const appointmentId = params.id as string

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [appointment, setAppointment] = useState<Appointment | null>(null)
  const [therapists, setTherapists] = useState<Therapist[]>([])
  
  // Campos del formulario
  const [therapistId, setTherapistId] = useState('')
  const [fecha, setFecha] = useState('')
  const [hora, setHora] = useState('')
  const [patologia, setPatologia] = useState('')
  const [valor, setValor] = useState('')
  const [comision, setComision] = useState('')
  const [observacion, setObservacion] = useState('')
  const [estado, setEstado] = useState('agendada')  
  // Estados para dirección override
  const [usarDireccionTemporal, setUsarDireccionTemporal] = useState(false)
  const [direccionOverride, setDireccionOverride] = useState('')
  const [barrioOverride, setBarrioOverride] = useState('')
  const [referenciaOverride, setReferenciaOverride] = useState('')
  const [direccionLatOverride, setDireccionLatOverride] = useState<number | null>(null)
  const [direccionLngOverride, setDireccionLngOverride] = useState<number | null>(null)
  const [geocodingLoading, setGeocodingLoading] = useState(false)
  // Estados para modo edición con calendario
  const [showCalendarButton, setShowCalendarButton] = useState(true)
  const hasProcessedEdit = useRef(false)

  // Datos del paciente (solo lectura)
  const [patientData, setPatientData] = useState({
    nombre: '',
    apellido: '',
    telefono: '',
    direccion: '',
    barrio: '',
    referencia: ''
  })

  useEffect(() => {
    fetchAppointment()
    fetchTherapists()
  }, [appointmentId])

  useEffect(() => {
    // Detectar si venimos de vuelta del calendario (después de que la cita cargue)
    if (!loading && appointment && !hasProcessedEdit.current) {
      const editedDateTimeStr = sessionStorage.getItem('editedDateTime')
      
      if (editedDateTimeStr) {
        hasProcessedEdit.current = true // Marcar como procesado
        
        try {
          const editedData = JSON.parse(editedDateTimeStr)          
          // Construir fecha y hora en formato correcto
          const year = editedData.year
          const month = String(editedData.month + 1).padStart(2, '0')
          const day = String(editedData.day).padStart(2, '0')
          const fechaStr = `${year}-${month}-${day}`
          
          const hour = String(editedData.hour).padStart(2, '0')
          const minute = String(editedData.minute).padStart(2, '0')
          const horaStr = `${hour}:${minute}`
                    
          setFecha(fechaStr)
          setHora(horaStr)
          
          // Limpiar sessionStorage DESPUÉS de que el componente haya renderizado completamente
          // Esto evita que fetchAppointment se ejecute de nuevo con shouldPreserveDatetime = false
          setTimeout(() => {
            sessionStorage.removeItem('editedDateTime')
            sessionStorage.removeItem('editingAppointmentId')
            sessionStorage.removeItem('editingAppointmentData')
            sessionStorage.removeItem('returnToEdit')
            
            alert('✅ Fecha y hora actualizadas desde el calendario')
          }, 500) // Aumentado a 500ms para asegurar que todo esté renderizado
        } catch (error) {
          console.error('❌ Error parseando editedDateTime:', error)
        }
      }
    }
  }, [loading, appointment])

  const fetchAppointment = async () => {
    try {
      const response = await fetch(`/api/appointments/${appointmentId}`)
      const data = await response.json()

      if (response.ok && data.appointment) {
        const apt = data.appointment
        setAppointment(apt)

        // Verificar si venimos del calendario (NO sobrescribir fecha/hora en ese caso)
        const editedDateTime = sessionStorage.getItem('editedDateTime')
        const shouldPreserveDatetime = editedDateTime !== null

        // Separar fecha y hora — SIEMPRE en hora Bogotá explícita (evita bug de día siguiente)
        const { fecha: fechaStr, hora: horaStr } = isoToBogotaParts(apt.fecha_hora)

        setTherapistId(apt.therapist_id)
        
        // Solo setear fecha/hora si NO venimos del calendario
        if (!shouldPreserveDatetime) {
          setFecha(fechaStr)
          setHora(horaStr)
        } else {

        }
        
        setPatologia(apt.patologia)
        setValor(apt.valor.toString())
        setComision(apt.comision.toString())
        setObservacion(apt.observacion || '')
        setEstado(apt.estado)

        // Cargar datos de override si existen
        const tieneOverride = apt.direccion_override !== null
        setUsarDireccionTemporal(tieneOverride)
        if (tieneOverride) {
          setDireccionOverride(apt.direccion_override || '')
          setBarrioOverride(apt.barrio_override || '')
          setReferenciaOverride(apt.referencia_override || '')
          setDireccionLatOverride(apt.direccion_lat_override)
          setDireccionLngOverride(apt.direccion_lng_override)
        }

        // Datos del paciente
        setPatientData({
          nombre: apt.patient.nombre,
          apellido: apt.patient.apellido,
          telefono: apt.patient.telefono,
          direccion: apt.patient.direccion,
          barrio: apt.patient.barrio,
          referencia: apt.patient.referencia || ''
        })
      }
    } catch (error) {
      console.error('Error fetching appointment:', error)
      alert('Error al cargar la cita')
    } finally {
      setLoading(false)
    }
  }

  const fetchTherapists = async () => {
    try {
      const response = await fetch('/api/therapists')
      const data = await response.json()

      if (response.ok) {
        setTherapists(data.therapists || [])
      }
    } catch (error) {
      console.error('Error fetching therapists:', error)
    }
  }

  const handleGeocodeOverride = async () => {
    if (!direccionOverride.trim() || !barrioOverride.trim()) {
      alert('⚠️ Ingresa dirección y barrio antes de geocodificar')
      return
    }

    setGeocodingLoading(true)
    try {
      const fullAddress = `${direccionOverride}, ${barrioOverride}, Medellín, Colombia`
      const response = await fetch(`/api/geocoding?address=${encodeURIComponent(fullAddress)}`)
      const data = await response.json()

      if (response.ok && data.lat && data.lng) {
        setDireccionLatOverride(data.lat)
        setDireccionLngOverride(data.lng)
        alert(`✅ Coordenadas obtenidas: ${data.lat}, ${data.lng}`)
      } else {
        alert('❌ No se pudieron obtener las coordenadas. Verifica la dirección.')
      }
    } catch (error) {
      console.error('Error geocoding:', error)
      alert('❌ Error al geocodificar la dirección')
    } finally {
      setGeocodingLoading(false)
    }
  }

  const handleToggleDireccionTemporal = (checked: boolean) => {
    setUsarDireccionTemporal(checked)
    
    if (!checked) {
      // Limpiar campos de override cuando se desactiva
      setDireccionOverride('')
      setBarrioOverride('')
      setReferenciaOverride('')
      setDireccionLatOverride(null)
      setDireccionLngOverride(null)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!therapistId || !fecha || !hora || !patologia || !valor || !comision) {
      alert('Por favor completa todos los campos requeridos')
      return
    }

    setSaving(true)

    try {
      // Combinar fecha y hora — SIEMPRE interpretando fecha/hora como hora Bogotá explícita
      const fechaHoraISO = bogotaPartsToISO(fecha, hora)

      const response = await fetch(`/api/appointments/${appointmentId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          therapist_id: therapistId,
          fecha_hora: fechaHoraISO,
          patologia,
          valor: parseFloat(valor),
          comision: parseFloat(comision),
          observacion: observacion || null,
          estado,
          // Campos de override - null limpia el override
          direccion_override: usarDireccionTemporal ? direccionOverride : null,
          barrio_override: usarDireccionTemporal ? barrioOverride : null,
          referencia_override: usarDireccionTemporal ? (referenciaOverride || null) : null,
          direccion_lat_override: usarDireccionTemporal ? direccionLatOverride : null,
          direccion_lng_override: usarDireccionTemporal ? direccionLngOverride : null
        })
      })

      const data = await response.json()

      if (response.ok) {
        alert('✅ Cita actualizada exitosamente')
        router.push('/appointments')
      } else {
        alert(`❌ Error: ${data.error}`)
      }
    } catch (error) {
      console.error('Error updating appointment:', error)
      alert('❌ Error al actualizar la cita')
    } finally {
      setSaving(false)
    }
  }

  const handleGoToCalendar = () => {
    // Guardar datos de la cita que se está editando en sessionStorage
    sessionStorage.setItem('editingAppointmentId', appointmentId)
    sessionStorage.setItem('editingAppointmentData', JSON.stringify({
      therapist_id: therapistId,
      fecha: fecha,
      hora: hora,
      patologia: patologia,
      valor: valor,
      comision: comision,
      observacion: observacion,
      estado: estado
    }))
    sessionStorage.setItem('returnToEdit', 'true')
    
    // Redirigir a selección de calendario (con terapeuta preseleccionado)
    router.push(`/patients/schedule/${therapistId}`)
  }

  const handleCancel = async () => {
    if (!confirm('¿Estás seguro de cancelar esta cita?')) {
      return
    }

    try {
      const response = await fetch(`/api/appointments/${appointmentId}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        alert('✅ Cita cancelada exitosamente')
        router.push('/appointments')
      } else {
        const data = await response.json()
        alert(`❌ Error: ${data.error}`)
      }
    } catch (error) {
      console.error('Error canceling appointment:', error)
      alert('❌ Error al cancelar la cita')
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-50 dark:bg-zinc-900">
        <div className="text-zinc-600 dark:text-zinc-400">Cargando...</div>
      </div>
    )
  }

  if (!appointment) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-50 dark:bg-zinc-900">
        <div className="text-center">
          <p className="text-zinc-600 dark:text-zinc-400 mb-4">Cita no encontrada</p>
          <Link
            href="/appointments"
            className="text-indigo-600 hover:text-indigo-700"
          >
            ← Volver a gestión de citas
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-900 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <Link
            href="/appointments"
            className="inline-flex items-center text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 mb-4"
          >
            ← Volver a gestión de citas
          </Link>
          <h1 className="text-3xl font-bold text-zinc-900 dark:text-zinc-50">
            Editar Cita
          </h1>
          {appointment.package_id && (
            <div className="mt-2 inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200">
              ⚠️ Esta cita es parte de un paquete
            </div>
          )}
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Datos del paciente (solo lectura) */}
          <div className="bg-white dark:bg-zinc-800 rounded-lg shadow-sm p-6">
            <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50 mb-4">
              Datos del Paciente (solo lectura)
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                  Nombre
                </label>
                <input
                  type="text"
                  value={patientData.nombre}
                  disabled
                  className="w-full px-4 py-2 rounded-lg border border-zinc-300 dark:border-zinc-600 bg-zinc-100 dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                  Apellido
                </label>
                <input
                  type="text"
                  value={patientData.apellido}
                  disabled
                  className="w-full px-4 py-2 rounded-lg border border-zinc-300 dark:border-zinc-600 bg-zinc-100 dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                  Teléfono
                </label>
                <input
                  type="text"
                  value={patientData.telefono}
                  disabled
                  className="w-full px-4 py-2 rounded-lg border border-zinc-300 dark:border-zinc-600 bg-zinc-100 dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                  Barrio
                </label>
                <input
                  type="text"
                  value={patientData.barrio}
                  disabled
                  className="w-full px-4 py-2 rounded-lg border border-zinc-300 dark:border-zinc-600 bg-zinc-100 dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                  Dirección
                </label>
                <input
                  type="text"
                  value={patientData.direccion}
                  disabled
                  className="w-full px-4 py-2 rounded-lg border border-zinc-300 dark:border-zinc-600 bg-zinc-100 dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100"
                />
              </div>
            </div>
          </div>

           {/* Dirección temporal override */}
          <div className="bg-white dark:bg-zinc-800 rounded-lg shadow-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">
                  Dirección de la Cita
                </h2>
                <p className="text-sm text-zinc-600 dark:text-zinc-400 mt-1">
                  {usarDireccionTemporal 
                    ? '🏢 Usando dirección temporal diferente' 
                    : '🏠 Usando dirección registrada del paciente'}
                </p>
              </div>
              
              {/* Checkbox para activar dirección temporal */}
              <label className="flex items-center gap-3 cursor-pointer">
                <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                  Usar dirección diferente
                </span>
                <input
                  type="checkbox"
                  checked={usarDireccionTemporal}
                  onChange={(e) => handleToggleDireccionTemporal(e.target.checked)}
                  className="w-5 h-5 rounded border-zinc-300 text-indigo-600 focus:ring-indigo-500"
                />
              </label>
            </div>

            {/* Campos de dirección override (solo si está activado) */}
            {usarDireccionTemporal && (
              <div className="space-y-4 pt-4 border-t border-zinc-200 dark:border-zinc-700">
                <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
                  <p className="text-amber-800 dark:text-amber-200 text-sm">
                    ⚠️ Esta cita se realizará en una dirección diferente a la registrada del paciente.
                    Las coordenadas GPS se validarán contra esta dirección temporal.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Dirección override */}
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                      Dirección temporal *
                    </label>
                    <input
                      type="text"
                      value={direccionOverride}
                      onChange={(e) => setDireccionOverride(e.target.value)}
                      required={usarDireccionTemporal}
                      placeholder="Ej: Calle 45 # 23-10"
                      className="w-full px-4 py-2 rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>

                  {/* Barrio override */}
                  <div>
                    <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                      Barrio *
                    </label>
                    <input
                      type="text"
                      value={barrioOverride}
                      onChange={(e) => setBarrioOverride(e.target.value)}
                      required={usarDireccionTemporal}
                      placeholder="Ej: El Poblado"
                      className="w-full px-4 py-2 rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>

                  {/* Referencia override */}
                  <div>
                    <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                      Referencia (opcional)
                    </label>
                    <input
                      type="text"
                      value={referenciaOverride}
                      onChange={(e) => setReferenciaOverride(e.target.value)}
                      placeholder="Ej: Torre 2, Apto 501"
                      className="w-full px-4 py-2 rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>

                  {/* Botón de geocodificación */}
                  <div className="md:col-span-2">
                    <button
                      type="button"
                      onClick={handleGeocodeOverride}
                      disabled={geocodingLoading || !direccionOverride || !barrioOverride}
                      className="w-full px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:bg-emerald-400 disabled:cursor-not-allowed transition-colors font-medium"
                    >
                      {geocodingLoading ? '🔄 Obteniendo coordenadas...' : '🌍 Geocodificar Dirección'}
                    </button>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-2">
                      💡 Presiona este botón después de ingresar dirección y barrio para obtener las coordenadas GPS
                    </p>
                  </div>

                  {/* Coordenadas (solo lectura) */}
                  <div>
                    <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                      Latitud
                    </label>
                    <input
                      type="text"
                      value={direccionLatOverride !== null ? direccionLatOverride.toFixed(6) : 'Sin geocodificar'}
                      disabled
                      className="w-full px-4 py-2 rounded-lg border border-zinc-300 dark:border-zinc-600 bg-zinc-100 dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                      Longitud
                    </label>
                    <input
                      type="text"
                      value={direccionLngOverride !== null ? direccionLngOverride.toFixed(6) : 'Sin geocodificar'}
                      disabled
                      className="w-full px-4 py-2 rounded-lg border border-zinc-300 dark:border-zinc-600 bg-zinc-100 dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>


          {/* Datos de la cita (editables) */}
          <div className="bg-white dark:bg-zinc-800 rounded-lg shadow-sm p-6">
            <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50 mb-4">
              Datos de la Cita
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Terapeuta */}
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                  Terapeuta *
                </label>
                <select
                  value={therapistId}
                  onChange={(e) => setTherapistId(e.target.value)}
                  required
                  className="w-full px-4 py-2 rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">Seleccionar terapeuta</option>
                  {therapists.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.nombre} {t.apellido}
                    </option>
                  ))}
                </select>
              </div>

              {/* Fecha y Hora con botón para ver disponibilidad */}
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                  Fecha y Hora *
                </label>
                <div className="flex flex-col sm:flex-row gap-3">
                  <div className="flex gap-3 flex-1">
                    <input
                      type="date"
                      value={fecha}
                      readOnly
                      required
                      className="flex-1 px-4 py-2 rounded-lg border border-zinc-300 dark:border-zinc-600 bg-zinc-100 dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100 cursor-not-allowed"
                    />
                    <input
                      type="time"
                      value={hora}
                      readOnly
                      required
                      className="flex-1 px-4 py-2 rounded-lg border border-zinc-300 dark:border-zinc-600 bg-zinc-100 dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100 cursor-not-allowed"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={handleGoToCalendar}
                    className="w-full sm:w-auto px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-medium whitespace-nowrap flex items-center justify-center gap-2"
                  >
                    📅 Ver disponibilidad
                  </button>
                </div>
                <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-400">
                  💡 Usa el botón "Ver disponibilidad" para cambiar la fecha/hora viendo los horarios del terapeuta
                </p>
              </div>

              {/* Patología */}
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                  Patología *
                </label>
                <input
                  type="text"
                  value={patologia}
                  onChange={(e) => setPatologia(e.target.value)}
                  required
                  placeholder="Ej: Dolor lumbar"
                  className="w-full px-4 py-2 rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              {/* Valor */}
              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                  Valor *
                </label>
                <input
                  type="number"
                  value={valor}
                  onChange={(e) => setValor(e.target.value)}
                  required
                  min="0"
                  step="1000"
                  placeholder="70000"
                  className="w-full px-4 py-2 rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              {/* Comisión */}
              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                  Comisión *
                </label>
                <input
                  type="number"
                  value={comision}
                  onChange={(e) => setComision(e.target.value)}
                  required
                  min="0"
                  step="1000"
                  placeholder="35000"
                  className="w-full px-4 py-2 rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              {/* Estado */}
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                  Estado *
                </label>
                <select
                  value={estado}
                  onChange={(e) => setEstado(e.target.value)}
                  required
                  className="w-full px-4 py-2 rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="agendada">Agendada</option>
                  <option value="completada">Completada</option>
                  <option value="cancelada">Cancelada</option>
                  <option value="pendiente_reagendar">Pendiente Reagendar</option>
                </select>
              </div>

              {/* Observación */}
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                  Observación
                </label>
                <textarea
                  value={observacion}
                  onChange={(e) => setObservacion(e.target.value)}
                  rows={3}
                  placeholder="Observaciones adicionales..."
                  className="w-full px-4 py-2 rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>
          </div>

          {/* Botones de acción */}
          <div className="flex flex-col sm:flex-row gap-4">
            <button
              type="submit"
              disabled={saving}
              className="flex-1 px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:bg-indigo-400 transition-colors font-medium"
            >
              {saving ? 'Guardando...' : '💾 Guardar Cambios'}
            </button>
            <button
              type="button"
              onClick={handleCancel}
              disabled={saving}
              className="px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:bg-red-400 transition-colors font-medium"
            >
              🗑️ Cancelar Cita
            </button>
            <Link
              href="/appointments"
              className="px-6 py-3 bg-zinc-200 dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100 rounded-lg hover:bg-zinc-300 dark:hover:bg-zinc-600 transition-colors font-medium text-center"
            >
              Volver
            </Link>
          </div>
        </form>
      </div>
    </div>
  )
}