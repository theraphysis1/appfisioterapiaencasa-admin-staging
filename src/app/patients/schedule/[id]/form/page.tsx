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

interface ValoracionPrevia {
  tiene_valoracion: boolean
  cita_id: string | null
  fecha: string | null
  monto: number | null
  terapeuta: string | null
}

interface PrecioCalculado {
  precio_original: number
  descuento_valoracion: number
  precio_final: number
  monto_primer_pago: number
  monto_segundo_pago: number
  sesiones_primer_pago: number
  sesiones_segundo_pago: number
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

  const [direccionLat, setDireccionLat] = useState<string>('')
  const [direccionLng, setDireccionLng] = useState<string>('')
  const [gettingCoordinates, setGettingCoordinates] = useState(false)

  const [selectedServiceId, setSelectedServiceId] = useState<string>('')
  const [valor, setValor] = useState<string>('')
  const [comision, setComision] = useState<string>('')
  const [observacion, setObservacion] = useState<string>('')
  const [showSearchModal, setShowSearchModal] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<any[]>([])
  const [searching, setSearching] = useState(false)
  // Estados para valoración previa y pagos fraccionados
  const [valoracionPrevia, setValoracionPrevia] = useState<ValoracionPrevia | null>(null)
  const [loadingValoracion, setLoadingValoracion] = useState(false)
  const [formaPago, setFormaPago] = useState<'completo' | 'fraccionado'>('completo')
  const [sesionesprimerPago, setSesionesPrimerPago] = useState<number>(0)
  const [precioCalculado, setPrecioCalculado] = useState<PrecioCalculado | null>(null)
  const [calculatingPrice, setCalculatingPrice] = useState(false)

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

  const handleGetCoordinates = async () => {
  if (!formData.direccion.trim()) {
    alert('⚠️ Por favor ingresa una dirección antes de obtener coordenadas')
    return
  }

  setGettingCoordinates(true)

  try {
    // Construir dirección completa
    const fullAddress = `${formData.direccion}, ${formData.barrio || ''}, Medellín, Colombia`.trim()

    const response = await fetch('/api/geocoding', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ address: fullAddress })
    })

    const data = await response.json()

    if (response.ok && data.success) {
      setDireccionLat(data.lat.toString())
      setDireccionLng(data.lng.toString())
      alert(`✅ Coordenadas obtenidas correctamente\n\nLatitud: ${data.lat}\nLongitud: ${data.lng}\n\nDirección encontrada:\n${data.formatted_address}`)
    } else {
      alert(`❌ ${data.error || 'No se encontraron coordenadas para esta dirección'}\n\nPor favor verifica la dirección y el barrio, o ingresa las coordenadas manualmente.`)
    }
  } catch (error) {
    console.error('Error al obtener coordenadas:', error)
    alert('⚠️ Error al obtener coordenadas. Intenta nuevamente o ingrésalas manualmente.')
  } finally {
    setGettingCoordinates(false)
  }
}

const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0
    }).format(value)
  }

const checkValoracionPrevia = async (patientId: string) => {
    setLoadingValoracion(true)
    try {
      const response = await fetch(`/api/patients/${patientId}/valoracion-previa`)
      
      if (!response.ok) {
        throw new Error('Error al verificar valoración previa')
      }

      const data = await response.json()
      setValoracionPrevia(data)
      
      if (data.tiene_valoracion) {
        alert(`✅ Este paciente tiene una valoración previa completada\n\nFecha: ${new Date(data.fecha).toLocaleDateString('es-CO')}\nMonto: ${formatCurrency(data.monto)}\nTerapeuta: ${data.terapeuta}\n\nEl monto de la valoración se descontará automáticamente del paquete.`)
      }
    } catch (error) {
      console.error('Error al verificar valoración previa:', error)
      setValoracionPrevia(null)
    } finally {
      setLoadingValoracion(false)
    }
  }

  const calcularPrecio = async () => {
    if (!selectedServiceId) {
      alert('Por favor selecciona un servicio primero')
      return
    }

    const selectedService = services.find(s => s.id === selectedServiceId)
    if (!selectedService || selectedService.tipo !== 'paquete') {
      return
    }

    // ✅ Calcular sesiones a distribuir (sin contar valoración)
    const sesiones_a_distribuir = valoracionPrevia?.tiene_valoracion 
      ? selectedService.cantidad_sesiones - 1 
      : selectedService.cantidad_sesiones

    // Validar distribución de sesiones en modo fraccionado
    if (formaPago === 'fraccionado') {
      if (sesionesprimerPago <= 0 || sesionesprimerPago >= sesiones_a_distribuir) {
        alert('El número de sesiones del primer pago debe ser mayor a 0 y menor al total de sesiones a distribuir')
        return
      }
    }

    setCalculatingPrice(true)
    try {
      // ✅ Calcular precio original: SIEMPRE el paquete completo
      const precio_original = parseFloat(valor) * selectedService.cantidad_sesiones
      
      // ✅ Descuento de valoración
      const descuento_valoracion = valoracionPrevia?.tiene_valoracion ? (valoracionPrevia.monto || 0) : 0
      
      // ✅ Precio final: lo que falta por pagar
      const precio_final = precio_original - descuento_valoracion

      let calculado: PrecioCalculado

      if (formaPago === 'completo') {
        calculado = {
          precio_original,
          descuento_valoracion,
          precio_final,
          monto_primer_pago: precio_final,
          monto_segundo_pago: 0,
          sesiones_primer_pago: sesiones_a_distribuir,
          sesiones_segundo_pago: 0
        }
      } else {
        // ✅ Fraccionado: distribuir el precio_final (no el original) proporcionalmente
        const sesiones_segundo = sesiones_a_distribuir - sesionesprimerPago
        const valor_por_sesion = precio_final / sesiones_a_distribuir
        
        calculado = {
          precio_original,
          descuento_valoracion,
          precio_final,
          monto_primer_pago: Math.round(valor_por_sesion * sesionesprimerPago),
          monto_segundo_pago: Math.round(valor_por_sesion * sesiones_segundo),
          sesiones_primer_pago: sesionesprimerPago,
          sesiones_segundo_pago: sesiones_segundo
        }
      }

      setPrecioCalculado(calculado)

    } catch (error: any) {
      console.error('Error:', error)
      alert(error.message || 'Error al calcular el precio')
    } finally {
      setCalculatingPrice(false)
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

      // Cargar coordenadas si el paciente ya las tiene
      if (patient.direccion_lat && patient.direccion_lng) {
        setDireccionLat(patient.direccion_lat.toString())
        setDireccionLng(patient.direccion_lng.toString())
      } else {
        setDireccionLat('')
        setDireccionLng('')
      }
      
      // Cerrar modal
      setShowSearchModal(false)
      setSearchQuery('')
      setSearchResults([])
      
      const message = lastPatologia 
        ? `✅ Datos del paciente ${patient.nombre} ${patient.apellido} cargados correctamente\n\n📋 Patología anterior: ${lastPatologia}`
        : `✅ Datos del paciente ${patient.nombre} ${patient.apellido} cargados correctamente`

      // Verificar si tiene valoración previa
      await checkValoracionPrevia(patient.id)
      
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
        
        // Si es paquete, inicializar configuración de pagos
        if (service.tipo === 'paquete') {
          // ✅ AJUSTE: Si tiene valoración, restar 1 sesión del total
          const sesiones_a_distribuir = valoracionPrevia?.tiene_valoracion 
            ? service.cantidad_sesiones - 1 
            : service.cantidad_sesiones
          
          // Configurar valores por defecto para distribución
          const mitad = Math.floor(sesiones_a_distribuir / 2)
          setSesionesPrimerPago(mitad)
          
          // Resetear cálculo previo
          setPrecioCalculado(null)
        } else {
          // Si no es paquete, resetear todo
          setFormaPago('completo')
          setSesionesPrimerPago(0)
          setPrecioCalculado(null)
          setValoracionPrevia(null)
        }
      }
    } else {
      setValor('')
      setComision('')
      setFormaPago('completo')
      setSesionesPrimerPago(0)
      setPrecioCalculado(null)
      setValoracionPrevia(null)
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
        referencia: formData.referencia || null,
        direccion_lat: direccionLat ? parseFloat(direccionLat) : null,
        direccion_lng: direccionLng ? parseFloat(direccionLng) : null
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
        // Validar que se haya calculado el precio
        if (!precioCalculado) {
          alert('Por favor calcula el precio del paquete antes de continuar')
          return
        }

        // Validar distribución de sesiones en modo fraccionado
        if (formaPago === 'fraccionado') {
          const sesionesSegundo = selectedService.cantidad_sesiones - sesionesprimerPago
          if (sesionesprimerPago <= 0 || sesionesSegundo <= 0) {
            alert('La distribución de sesiones no es válida')
            return
          }
        }

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
          observacion: observacion || null,
          // NUEVOS DATOS DE PAGOS FRACCIONADOS
          tiene_valoracion_previa: valoracionPrevia?.tiene_valoracion || false,
          valoracion_cita_id: valoracionPrevia?.cita_id || null,
          valoracion_monto: valoracionPrevia?.monto || null,
          forma_pago: formaPago,
          numero_pagos: formaPago === 'fraccionado' ? 2 : 1,
          monto_primer_pago: precioCalculado.monto_primer_pago,
          monto_segundo_pago: formaPago === 'fraccionado' ? precioCalculado.monto_segundo_pago : 0,
          sesiones_primer_pago: formaPago === 'fraccionado' ? sesionesprimerPago : selectedService.cantidad_sesiones,
          sesiones_segundo_pago: formaPago === 'fraccionado' ? (selectedService.cantidad_sesiones - sesionesprimerPago) : 0,
          precio_calculado: precioCalculado
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
              
              {/* Botón obtener coordenadas GPS - justo debajo del campo Barrio */}
              <button
                type="button"
                onClick={handleGetCoordinates}
                disabled={gettingCoordinates || !formData.direccion.trim()}
                className="mt-3 w-full px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-zinc-400 disabled:cursor-not-allowed font-medium transition-colors flex items-center justify-center gap-2"
              >
                {gettingCoordinates ? (
                  <>
                    <div className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-solid border-white border-r-transparent"></div>
                    Obteniendo coordenadas...
                  </>
                ) : (
                  <>
                    📍 Obtener Coordenadas GPS
                  </>
                )}
              </button>
              
              {/* Campos de coordenadas - debajo del botón */}
              <div className="grid grid-cols-2 gap-3 mt-3">
                <div>
                  <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1">
                    Latitud (editable)
                  </label>
                  <input
                    type="number"
                    step="any"
                    value={direccionLat}
                    onChange={(e) => setDireccionLat(e.target.value)}
                    placeholder="6.244203"
                    className="w-full px-3 py-2 text-sm border border-zinc-300 dark:border-zinc-600 rounded-lg bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-50 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                
                <div>
                  <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1">
                    Longitud (editable)
                  </label>
                  <input
                    type="number"
                    step="any"
                    value={direccionLng}
                    onChange={(e) => setDireccionLng(e.target.value)}
                    placeholder="-75.589386"
                    className="w-full px-3 py-2 text-sm border border-zinc-300 dark:border-zinc-600 rounded-lg bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-50 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>
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

            {/* Sección de Valoración Previa - Solo si el servicio es paquete */}
            {selectedServiceId && services.find(s => s.id === selectedServiceId)?.tipo === 'paquete' && valoracionPrevia?.tiene_valoracion && (
              <div className="p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                <h3 className="text-sm font-semibold text-green-900 dark:text-green-100 mb-2 flex items-center gap-2">
                  ✅ Valoración Previa Encontrada
                </h3>
                <div className="space-y-1 text-sm text-green-800 dark:text-green-200">
                  <p><span className="font-medium">Fecha:</span> {valoracionPrevia.fecha ? new Date(valoracionPrevia.fecha).toLocaleDateString('es-CO', { year: 'numeric', month: 'long', day: 'numeric' }) : 'N/A'}</p>
                  <p><span className="font-medium">Monto:</span> {valoracionPrevia.monto ? formatCurrency(valoracionPrevia.monto) : 'N/A'}</p>
                  <p><span className="font-medium">Terapeuta:</span> {valoracionPrevia.terapeuta || 'N/A'}</p>
                  <p className="text-xs mt-2 italic">Este monto se descontará automáticamente del precio del paquete</p>
                </div>
              </div>
            )}

            {/* Configuración de Pagos - Solo si el servicio es paquete */}
            {selectedServiceId && services.find(s => s.id === selectedServiceId)?.tipo === 'paquete' && (
              <div className="space-y-4 p-4 bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-lg">
                <h3 className="text-sm font-semibold text-purple-900 dark:text-purple-100">
                  💳 Configuración de Pagos
                </h3>

                {/* Selector de forma de pago */}
                <div>
                  <label className="block text-sm font-medium text-purple-900 dark:text-purple-100 mb-2">
                    Forma de Pago *
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => {
                        setFormaPago('completo')
                        setPrecioCalculado(null)
                      }}
                      className={`px-4 py-3 rounded-lg border-2 font-medium transition-all ${
                        formaPago === 'completo'
                          ? 'border-purple-600 bg-purple-100 dark:bg-purple-900/50 text-purple-900 dark:text-purple-100'
                          : 'border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:border-purple-400'
                      }`}
                    >
                      💰 Pago Completo
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setFormaPago('fraccionado')
                        setPrecioCalculado(null)
                      }}
                      className={`px-4 py-3 rounded-lg border-2 font-medium transition-all ${
                        formaPago === 'fraccionado'
                          ? 'border-purple-600 bg-purple-100 dark:bg-purple-900/50 text-purple-900 dark:text-purple-100'
                          : 'border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:border-purple-400'
                      }`}
                    >
                      📊 Pago Fraccionado (2 pagos)
                    </button>
                  </div>
                </div>

                {/* Distribución de sesiones - Solo en modo fraccionado */}
                {formaPago === 'fraccionado' && (
                  <div>
                    <label className="block text-sm font-medium text-purple-900 dark:text-purple-100 mb-2">
                      Distribución de Sesiones *
                    </label>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs text-purple-800 dark:text-purple-200 mb-1">
                          Sesiones Primer Pago
                        </label>
                        <input
                          type="number"
                          min="1"
                          max={(() => {
                            const service = services.find(s => s.id === selectedServiceId)
                            if (!service) return 1
                            const sesiones_a_distribuir = valoracionPrevia?.tiene_valoracion 
                              ? service.cantidad_sesiones - 1 
                              : service.cantidad_sesiones
                            return sesiones_a_distribuir - 1
                          })()}
                          value={sesionesprimerPago}
                          onChange={(e) => {
                            setSesionesPrimerPago(parseInt(e.target.value) || 0)
                            setPrecioCalculado(null)
                          }}
                          className="w-full px-3 py-2 border border-purple-300 dark:border-purple-700 rounded-lg bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-50 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-purple-800 dark:text-purple-200 mb-1">
                          Sesiones Segundo Pago
                        </label>
                        <input
                          type="number"
                          value={(() => {
                            const service = services.find(s => s.id === selectedServiceId)
                            if (!service) return 0
                            const sesiones_a_distribuir = valoracionPrevia?.tiene_valoracion 
                              ? service.cantidad_sesiones - 1 
                              : service.cantidad_sesiones
                            return sesiones_a_distribuir - sesionesprimerPago
                          })()}
                          disabled
                          className="w-full px-3 py-2 border border-purple-300 dark:border-purple-700 rounded-lg bg-zinc-100 dark:bg-zinc-700 text-zinc-600 dark:text-zinc-400"
                        />
                      </div>
                    </div>
                    <p className="text-xs text-purple-800 dark:text-purple-200 mt-2">
                      Total a distribuir: {(() => {
                        const service = services.find(s => s.id === selectedServiceId)
                        if (!service) return 0
                        const sesiones_a_distribuir = valoracionPrevia?.tiene_valoracion 
                          ? service.cantidad_sesiones - 1 
                          : service.cantidad_sesiones
                        return sesiones_a_distribuir
                      })()} sesiones nuevas{valoracionPrevia?.tiene_valoracion ? ' (+ 1 valoración)' : ''}
                    </p>
                  </div>
                )}

                {/* Botón calcular precio */}
                <button
                  type="button"
                  onClick={calcularPrecio}
                  disabled={calculatingPrice || !selectedServiceId}
                  className="w-full px-4 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:bg-zinc-400 disabled:cursor-not-allowed font-medium transition-colors flex items-center justify-center gap-2"
                >
                  {calculatingPrice ? (
                    <>
                      <div className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-solid border-white border-r-transparent"></div>
                      Calculando...
                    </>
                  ) : (
                    <>
                      🧮 Calcular Precio del Paquete
                    </>
                  )}
                </button>

                {/* Resumen de precios calculados */}
                {precioCalculado && (
                  <div className="p-3 bg-white dark:bg-zinc-800 border border-purple-300 dark:border-purple-700 rounded-lg space-y-2">
                    <h4 className="text-sm font-semibold text-purple-900 dark:text-purple-100">
                      📋 Resumen de Precios
                    </h4>
                    <div className="space-y-1 text-sm">
                      <div className="flex justify-between text-zinc-700 dark:text-zinc-300">
                        <span>Precio original:</span>
                        <span className="font-medium">{formatCurrency(precioCalculado.precio_original)}</span>
                      </div>
                      {precioCalculado.descuento_valoracion > 0 && (
                        <div className="flex justify-between text-green-600 dark:text-green-400">
                          <span>Descuento valoración:</span>
                          <span className="font-medium">-{formatCurrency(precioCalculado.descuento_valoracion)}</span>
                        </div>
                      )}
                      <div className="flex justify-between text-lg font-bold text-purple-900 dark:text-purple-100 pt-2 border-t border-purple-200 dark:border-purple-700">
                        <span>Precio final:</span>
                        <span>{formatCurrency(precioCalculado.precio_final)}</span>
                      </div>
                      
                      {formaPago === 'fraccionado' && (
                        <>
                          <div className="pt-2 border-t border-purple-200 dark:border-purple-700 mt-2">
                            <div className="flex justify-between text-blue-600 dark:text-blue-400">
                              <span>Primer pago ({precioCalculado.sesiones_primer_pago} sesiones):</span>
                              <span className="font-bold">{formatCurrency(precioCalculado.monto_primer_pago)}</span>
                            </div>
                            <div className="flex justify-between text-orange-600 dark:text-orange-400 mt-1">
                              <span>Segundo pago ({precioCalculado.sesiones_segundo_pago} sesiones):</span>
                              <span className="font-bold">{formatCurrency(precioCalculado.monto_segundo_pago)}</span>
                            </div>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

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
            {selectedServiceId && services.find(s => s.id === selectedServiceId)?.tipo === 'paquete' && !precioCalculado && (
              <div className="flex-1 text-right">
                <p className="text-sm text-amber-600 dark:text-amber-400 font-medium">
                  ⚠️ Debes calcular el precio del paquete antes de continuar
                </p>
              </div>
            )}
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