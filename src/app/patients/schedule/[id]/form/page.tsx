'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'

interface Therapist {
  id: string
  nombre: string
  apellido: string
}

interface Service {
  id: string
  nombre: string
  tipo: string
  cantidad_sesiones: number
  valor_default: number
  comision_default: number
  activo: boolean
}

interface PatientFormData {
  nombre: string
  apellido: string
  telefono: string
  direccion: string
  barrio: string
  referencia: string
  patologia: string
}

export default function PatientFormPage() {
  const params = useParams()
  const router = useRouter()
  const searchParams = useSearchParams()
  
  const therapistId = params.id as string
  const dateParam = searchParams.get('date')

  const [therapist, setTherapist] = useState<Therapist | null>(null)
  const [services, setServices] = useState<Service[]>([])
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)

  // Form state
  const [formData, setFormData] = useState<PatientFormData>({
    nombre: '',
    apellido: '',
    telefono: '',
    direccion: '',
    barrio: '',
    referencia: '',
    patologia: ''
  })

  const [selectedServiceId, setSelectedServiceId] = useState<string>('')
  const [valor, setValor] = useState<string>('')
  const [comision, setComision] = useState<string>('')
  const [observacion, setObservacion] = useState<string>('')
  const [showSearchModal, setShowSearchModal] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<any[]>([])
  const [searching, setSearching] = useState(false)

  useEffect(() => {
    if (dateParam) {
      setSelectedDate(new Date(dateParam))
    }
    fetchData()
  }, [therapistId, dateParam])

  const fetchData = async () => {
    try {
      setLoading(true)
      
      // Fetch therapist
      const therapistResponse = await fetch('/api/therapists')
      if (!therapistResponse.ok) throw new Error('Error al cargar terapeuta')
      const therapistData = await therapistResponse.json()
      const foundTherapist = therapistData.therapists.find((t: Therapist) => t.id === therapistId)
      if (!foundTherapist) throw new Error('Terapeuta no encontrado')
      setTherapist(foundTherapist)

      // Fetch services
      const servicesResponse = await fetch('/api/services')
      if (!servicesResponse.ok) throw new Error('Error al cargar servicios')
      const servicesData = await servicesResponse.json()
      setServices(servicesData.services.filter((s: Service) => s.activo))
      
    } catch (err) {
      console.error(err)
      router.push('/patients/create')
    } finally {
      setLoading(false)
    }
  }

  const formatDate = (date: Date) => {
    const days = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado']
    const months = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre']
    return `${days[date.getDay()]}, ${date.getDate()} de ${months[date.getMonth()]} de ${date.getFullYear()}`
  }

  const formatTime = (date: Date) => {
    const hours = date.getHours()
    const minutes = date.getMinutes()
    const period = hours >= 12 ? 'PM' : 'AM'
    const displayHour = hours > 12 ? hours - 12 : hours === 0 ? 12 : hours
    const displayMinute = minutes.toString().padStart(2, '0')
    return `${displayHour}:${displayMinute} ${period}`
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  const handleSearchPatients = async () => {
    if (!searchQuery.trim()) {
      alert('Por favor ingresa un nombre o apellido para buscar')
      return
    }

    setSearching(true)
    try {
      const response = await fetch(`/api/patients/search?q=${encodeURIComponent(searchQuery)}`)
      
      if (!response.ok) {
        throw new Error('Error al buscar pacientes')
      }

      const data = await response.json()
      
      // Eliminar duplicados basándose en el ID
      const uniquePatients = data.patients.filter((patient: any, index: number, self: any[]) => 
        index === self.findIndex((p: any) => p.id === patient.id)
      )
      
      setSearchResults(uniquePatients)
      
      if (uniquePatients.length === 0) {
        alert('No se encontraron pacientes con ese nombre')
      }
    } catch (error) {
      console.error('Error:', error)
      alert('Error al buscar pacientes')
    } finally {
      setSearching(false)
    }
  }

  const handleSelectPatient = async (patient: any) => {
    try {
      // Buscar la última cita del paciente para obtener la patología
      const appointmentsResponse = await fetch(`/api/appointments?patient_id=${patient.id}`)
      
      let lastPatologia = ''
      if (appointmentsResponse.ok) {
        const appointmentsData = await appointmentsResponse.json()
        if (appointmentsData.appointments && appointmentsData.appointments.length > 0) {
          // Obtener la patología de la última cita
          lastPatologia = appointmentsData.appointments[0].patologia || ''
        }
      }

      // Autocompletar formulario con datos del paciente
      setFormData({
        nombre: patient.nombre,
        apellido: patient.apellido,
        telefono: patient.telefono,
        direccion: patient.direccion,
        barrio: patient.barrio,
        referencia: patient.referencia || '',
        patologia: lastPatologia // Autocompleta con la última patología
      })
      
      // Cerrar modal
      setShowSearchModal(false)
      setSearchQuery('')
      setSearchResults([])
      
      const message = lastPatologia 
        ? `✅ Datos del paciente ${patient.nombre} ${patient.apellido} cargados correctamente\n\n📋 Patología anterior: ${lastPatologia}`
        : `✅ Datos del paciente ${patient.nombre} ${patient.apellido} cargados correctamente`
      
      alert(message)
    } catch (error) {
      console.error('Error al cargar datos del paciente:', error)
      
      // Si hay error, al menos cargar los datos básicos sin la patología
      setFormData({
        nombre: patient.nombre,
        apellido: patient.apellido,
        telefono: patient.telefono,
        direccion: patient.direccion,
        barrio: patient.barrio,
        referencia: patient.referencia || '',
        patologia: ''
      })
      
      setShowSearchModal(false)
      setSearchQuery('')
      setSearchResults([])
      
      alert(`✅ Datos del paciente ${patient.nombre} ${patient.apellido} cargados correctamente`)
    }
  }

  const handleServiceChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const serviceId = e.target.value
    setSelectedServiceId(serviceId)

    if (serviceId) {
      const service = services.find(s => s.id === serviceId)
      if (service) {
        setValor(service.valor_default.toString())
        setComision(service.comision_default.toString())
      }
    } else {
      setValor('')
      setComision('')
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Validaciones básicas
    if (!formData.nombre || !formData.apellido || !formData.telefono || 
        !formData.direccion || !formData.barrio || !formData.patologia || 
        !selectedServiceId || !valor || !comision) {
      alert('Por favor completa todos los campos requeridos')
      return
    }

    if (!selectedDate) {
      alert('Error: No se ha seleccionado fecha y hora')
      return
    }

    setSubmitting(true)

    try {
      // 1. Crear o buscar paciente
      const patientResponse = await fetch('/api/patients', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          nombre: formData.nombre,
          apellido: formData.apellido,
          telefono: formData.telefono,
          direccion: formData.direccion,
          barrio: formData.barrio,
          referencia: formData.referencia || null
        })
      })

      if (!patientResponse.ok) {
        throw new Error('Error al crear el paciente')
      }

      const patientData = await patientResponse.json()
      const patientId = patientData.patient.id

      // 2. Obtener información del servicio seleccionado
      const selectedService = services.find(s => s.id === selectedServiceId)
      if (!selectedService) {
        throw new Error('Servicio no encontrado')
      }

      // 3. Verificar si es paquete o cita individual
      if (selectedService.tipo === 'paquete') {
        // LIMPIAR sessionStorage de datos anteriores
        sessionStorage.removeItem('packageAppointments')
        sessionStorage.removeItem('isSchedulingPackage')
        sessionStorage.removeItem('selectedPackageTherapist')
        
        // Guardar datos en sessionStorage para el flujo de paquetes
        const packageData = {
          patient: {
            id: patientId,
            ...formData
          },
          service: selectedService,
          valor: parseFloat(valor),
          comision: parseFloat(comision),
          observacion: observacion || null
        }
        
        sessionStorage.setItem('packageData', JSON.stringify(packageData))
        
        // Redirigir al flujo de agendamiento múltiple
        router.push(`/patients/schedule/${therapistId}/confirm`)
        return
      }

      // 4. Crear cita individual (valoración o sesión individual)
      const appointmentResponse = await fetch('/api/appointments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          patient_id: patientId,
          therapist_id: therapistId,
          service_id: selectedServiceId,
          package_id: null,
          fecha_hora: selectedDate.toISOString(),
          patologia: formData.patologia,
          valor: parseFloat(valor),
          comision: parseFloat(comision),
          observacion: observacion || null
        })
      })

      if (!appointmentResponse.ok) {
        const errorData = await appointmentResponse.json()
        throw new Error(errorData.error || 'Error al crear la cita')
      }

      const appointmentData = await appointmentResponse.json()

      // 5. Éxito - Mostrar confirmación y redirigir
      alert(`✅ Cita agendada exitosamente!\n\nPaciente: ${formData.nombre} ${formData.apellido}\nServicio: ${selectedService.nombre}\nFecha: ${formatDate(selectedDate)}\nHora: ${formatTime(selectedDate)}`)
      
      router.push('/home')
    } catch (error: any) {
      console.error('Error:', error)
      alert(error.message || 'Error al procesar el formulario')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading || !selectedDate) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-50 dark:bg-zinc-900">
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-purple-600 border-r-transparent"></div>
          <p className="mt-4 text-zinc-600 dark:text-zinc-400">Cargando...</p>
        </div>
      </div>
    )
  }

  if (!therapist) {
    return null
  }

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-900 py-12 px-6">
      <div className="max-w-3xl mx-auto">
        <div className="mb-8">
          <Link
            href={`/patients/schedule/${therapistId}/time?date=${selectedDate.getFullYear()}-${String(selectedDate.getMonth() + 1).padStart(2, '0')}-${String(selectedDate.getDate()).padStart(2, '0')}`}
            className="inline-flex items-center text-purple-600 hover:text-purple-700 dark:text-purple-400 dark:hover:text-purple-300 mb-4"
          >
            ← Volver a horarios
          </Link>
          <h1 className="text-3xl font-bold text-zinc-900 dark:text-zinc-50 mb-2">
            Datos del Paciente
          </h1>
          <p className="text-zinc-600 dark:text-zinc-400">
            Terapeuta: <span className="font-semibold">{therapist.nombre} {therapist.apellido}</span>
          </p>
          <p className="text-zinc-600 dark:text-zinc-400">
            Fecha: <span className="font-semibold">{formatDate(selectedDate)}</span> - {formatTime(selectedDate)}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="bg-white dark:bg-zinc-800 rounded-lg shadow-md p-6 space-y-6">
          {/* Botón buscar paciente - TODO: implementar en siguiente paso */}
          <div className="flex justify-end">
            <button
              type="button"
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              onClick={() => setShowSearchModal(true)}
            >
              🔍 Buscar Paciente Existente
            </button>
          </div>

          {/* Información del paciente */}
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
              Información del Paciente
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                  Nombre *
                </label>
                <input
                  type="text"
                  name="nombre"
                  value={formData.nombre}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-600 rounded-lg bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-50 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                  Apellido *
                </label>
                <input
                  type="text"
                  name="apellido"
                  value={formData.apellido}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-600 rounded-lg bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-50 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                Teléfono *
              </label>
              <input
                type="tel"
                name="telefono"
                value={formData.telefono}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-600 rounded-lg bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-50 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                Dirección *
              </label>
              <input
                type="text"
                name="direccion"
                value={formData.direccion}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-600 rounded-lg bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-50 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                required
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                  Barrio *
                </label>
                <input
                  type="text"
                  name="barrio"
                  value={formData.barrio}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-600 rounded-lg bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-50 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                  Referencia
                </label>
                <input
                  type="text"
                  name="referencia"
                  value={formData.referencia}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-600 rounded-lg bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-50 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                Patología *
              </label>
              <input
                type="text"
                name="patologia"
                value={formData.patologia}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-600 rounded-lg bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-50 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                required
              />
            </div>
          </div>

          {/* Información del servicio */}
          <div className="space-y-4 border-t border-zinc-200 dark:border-zinc-700 pt-6">
            <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
              Información del Servicio
            </h2>

            <div>
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                Servicio *
              </label>
              <select
                value={selectedServiceId}
                onChange={handleServiceChange}
                className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-600 rounded-lg bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-50 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                required
              >
                <option value="">Seleccionar servicio</option>
                {services.map(service => (
                  <option key={service.id} value={service.id}>
                    {service.nombre} {service.tipo === 'paquete' && `(${service.cantidad_sesiones} sesiones)`}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                  Valor *
                </label>
                <input
                  type="number"
                  value={valor}
                  onChange={(e) => setValor(e.target.value)}
                  className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-600 rounded-lg bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-50 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                  Comisión *
                </label>
                <input
                  type="number"
                  value={comision}
                  onChange={(e) => setComision(e.target.value)}
                  className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-600 rounded-lg bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-50 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                Observación
              </label>
              <textarea
                value={observacion}
                onChange={(e) => setObservacion(e.target.value)}
                rows={3}
                className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-600 rounded-lg bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-50 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* Botón de envío */}
          <div className="flex justify-end space-x-4 pt-6">
            <button
              type="submit"
              disabled={submitting}
              className="px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:bg-zinc-400 disabled:cursor-not-allowed font-medium transition-colors"
            >
              {submitting ? 'Guardando...' : 'Guardar Cita'}
            </button>
          </div>
        </form>

        {/* Modal de búsqueda de pacientes */}
        {showSearchModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-zinc-800 rounded-lg shadow-xl max-w-2xl w-full max-h-[80vh] overflow-hidden">
              <div className="p-6 border-b border-zinc-200 dark:border-zinc-700">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">
                    Buscar Paciente
                  </h2>
                  <button
                    onClick={() => {
                      setShowSearchModal(false)
                      setSearchQuery('')
                      setSearchResults([])
                    }}
                    className="text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200"
                  >
                    ✕
                  </button>
                </div>
                
                <div className="flex flex-col sm:flex-row gap-2">
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleSearchPatients()}
                    placeholder="Escribe nombre o apellido..."
                    className="flex-1 px-4 py-2 border border-zinc-300 dark:border-zinc-600 rounded-lg bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-50 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  <button
                    onClick={handleSearchPatients}
                    disabled={searching}
                    className="w-full sm:w-auto px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-zinc-400 disabled:cursor-not-allowed transition-colors font-medium"
                  >
                    {searching ? 'Buscando...' : 'Buscar'}
                  </button>
                </div>
              </div>

              <div className="p-6 overflow-y-auto max-h-[60vh]">
                {searchResults.length === 0 ? (
                  <div className="text-center py-12 text-zinc-500 dark:text-zinc-400">
                    {searching ? 'Buscando pacientes...' : 'Ingresa un nombre o apellido para buscar'}
                  </div>
                ) : (
                  <div className="space-y-3">
                    {searchResults.map((patient) => (
                      <div
                        key={patient.id}
                        className="border border-zinc-200 dark:border-zinc-700 rounded-lg p-4 hover:bg-zinc-50 dark:hover:bg-zinc-700 cursor-pointer transition-colors"
                        onClick={() => handleSelectPatient(patient)}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
                              {patient.nombre} {patient.apellido}
                            </h3>
                            <div className="mt-2 space-y-1 text-sm text-zinc-600 dark:text-zinc-400">
                              <p>📱 {patient.telefono}</p>
                              <p>📍 {patient.direccion}</p>
                              <p>🏘️ {patient.barrio}</p>
                              {patient.referencia && (
                                <p>📌 {patient.referencia}</p>
                              )}
                            </div>
                          </div>
                          <button
                            className="ml-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
                          >
                            Seleccionar
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}