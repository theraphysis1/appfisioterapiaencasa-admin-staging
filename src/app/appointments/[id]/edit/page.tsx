'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'

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

  const fetchAppointment = async () => {
    try {
      const response = await fetch(`/api/appointments/${appointmentId}`)
      const data = await response.json()

      if (response.ok && data.appointment) {
        const apt = data.appointment
        setAppointment(apt)

        // Separar fecha y hora
        const fechaHora = new Date(apt.fecha_hora)
        const fechaStr = fechaHora.toISOString().split('T')[0]
        const horaStr = fechaHora.toTimeString().slice(0, 5)

        setTherapistId(apt.therapist_id)
        setFecha(fechaStr)
        setHora(horaStr)
        setPatologia(apt.patologia)
        setValor(apt.valor.toString())
        setComision(apt.comision.toString())
        setObservacion(apt.observacion || '')
        setEstado(apt.estado)

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!therapistId || !fecha || !hora || !patologia || !valor || !comision) {
      alert('Por favor completa todos los campos requeridos')
      return
    }

    setSaving(true)

    try {
      // Combinar fecha y hora
      const fechaHora = new Date(`${fecha}T${hora}:00`)

      const response = await fetch(`/api/appointments/${appointmentId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          therapist_id: therapistId,
          fecha_hora: fechaHora.toISOString(),
          patologia,
          valor: parseFloat(valor),
          comision: parseFloat(comision),
          observacion: observacion || null,
          estado
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

              {/* Fecha */}
              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                  Fecha *
                </label>
                <input
                  type="date"
                  value={fecha}
                  onChange={(e) => setFecha(e.target.value)}
                  required
                  className="w-full px-4 py-2 rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              {/* Hora */}
              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                  Hora *
                </label>
                <input
                  type="time"
                  value={hora}
                  onChange={(e) => setHora(e.target.value)}
                  required
                  className="w-full px-4 py-2 rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 focus:ring-2 focus:ring-indigo-500"
                />
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