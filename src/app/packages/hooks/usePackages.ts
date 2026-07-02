import { useState, useEffect, useCallback } from 'react'

// ─── Interfaces ───────────────────────────────────────────────────────────────

export interface Patient {
  id: string
  nombre: string
  apellido: string
  telefono: string
  direccion?: string
  barrio?: string
  referencia?: string
}

export interface Service {
  id: string
  nombre: string
  tipo: string
  cantidad_sesiones: number
  valor_default: number
  comision_default: number
}

export interface ValoracionCita {
  id: string
  fecha_hora: string
  therapist: {
    nombre: string
    apellido: string
  }
}

export interface Appointment {
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
  direccion_final: string
  barrio_final: string
  referencia_final: string | null
  tiene_direccion_temporal: boolean
}

export interface Package {
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
  // Fecha calculada en tiempo real desde appointments (Archivo 1)
  fecha_ultima_sesion_pagada_real?: string | null
  patient: Patient
  service: Service
  valoracion_cita?: ValoracionCita | null
  appointments?: Appointment[]
}

export interface Pagination {
  page: number
  limit: number
  total: number
  totalPages: number
  hasMore: boolean
}

export interface PaymentForm {
  monto: string
  metodo_pago: string
  notas: string
}

export interface CancelForm {
  razon_cancelacion: string
  cancelado_por: string
}

// ─── Hook principal ────────────────────────────────────────────────────────────

export function usePackages() {
  const [packages, setPackages] = useState<Package[]>([])
  const [loading, setLoading] = useState(true)
  const [filterEstado, setFilterEstado] = useState('todos')

  // searchTerm: lo que el admin va escribiendo (no dispara fetch)
  // activeSearchTerm: el valor confirmado (Buscar / Enter) que sí dispara fetch
  const [searchTerm, setSearchTerm] = useState('')
  const [activeSearchTerm, setActiveSearchTerm] = useState('')
  const [expandedPackages, setExpandedPackages] = useState<Set<string>>(new Set())
  const [currentPage, setCurrentPage] = useState(1)
  const [pagination, setPagination] = useState<Pagination | null>(null)

  // Estados del modal de pago
  const [showPaymentModal, setShowPaymentModal] = useState(false)
  const [selectedPackage, setSelectedPackage] = useState<Package | null>(null)
  const [paymentForm, setPaymentForm] = useState<PaymentForm>({
    monto: '',
    metodo_pago: '',
    notas: ''
  })
  const [processingPayment, setProcessingPayment] = useState(false)

  // Estados del modal de cancelación
  const [showCancelModal, setShowCancelModal] = useState(false)
  const [packageToCancel, setPackageToCancel] = useState<Package | null>(null)
  const [cancelForm, setCancelForm] = useState<CancelForm>({
    razon_cancelacion: '',
    cancelado_por: 'Admin'
  })
  const [processingCancel, setProcessingCancel] = useState(false)

  // ─── Fetch principal ─────────────────────────────────────────────────────────

  const fetchPackages = useCallback(async () => {
    try {
      setLoading(true)

      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: '20'
      })

      if (filterEstado !== 'todos') {
        params.append('estado', filterEstado)
      }

      if (activeSearchTerm.trim()) {
        params.append('search', activeSearchTerm.trim())
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
  }, [currentPage, filterEstado, activeSearchTerm])

  useEffect(() => {
    fetchPackages()
  }, [fetchPackages])

  // ─── Búsqueda manual (botón / Enter) ─────────────────────────────────────────

  const handleSearch = () => {
    setCurrentPage(1)
    setActiveSearchTerm(searchTerm)
  }

  const handleClearSearch = () => {
    setSearchTerm('')
    setCurrentPage(1)
    setActiveSearchTerm('')
  }

  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      handleSearch()
    }
  }

  // ─── Citas del paquete (lazy load) ───────────────────────────────────────────

  const fetchPackageAppointments = async (packageId: string) => {
    try {
      const response = await fetch(`/api/packages/${packageId}`)
      const data = await response.json()

      if (response.ok && data.package) {
        setPackages(prev =>
          prev.map(pkg =>
            pkg.id === packageId
              ? { ...pkg, appointments: data.package.appointments }
              : pkg
          )
        )
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
      const pkg = packages.find(p => p.id === packageId)
      if (pkg && !pkg.appointments) {
        await fetchPackageAppointments(packageId)
      }
    }

    setExpandedPackages(newExpanded)
  }

  // ─── Paginación ───────────────────────────────────────────────────────────────

  const handlePageChange = (newPage: number) => {
    setCurrentPage(newPage)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  // ─── Paquetes (ya vienen filtrados desde el backend) ──────────────────────────

  const filteredPackages = packages

  // ─── Modal de pago ────────────────────────────────────────────────────────────

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
    setPaymentForm({ monto: '', metodo_pago: '', notas: '' })
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

      const response = await fetch(
        `/api/packages/${selectedPackage.id}/registrar-pago`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            numero_pago: 2,
            monto: parseFloat(paymentForm.monto),
            metodo_pago: paymentForm.metodo_pago,
            notas: paymentForm.notas || null,
            registrado_por: 'admin'
          })
        }
      )

      const data = await response.json()

      if (response.ok) {
        alert('✅ Segundo pago registrado exitosamente')
        handleClosePaymentModal()
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

  // ─── Modal de cancelación ─────────────────────────────────────────────────────

  const handleOpenCancelModal = (pkg: Package) => {
    setPackageToCancel(pkg)
    setCancelForm({ razon_cancelacion: '', cancelado_por: 'Admin' })
    setShowCancelModal(true)
  }

  const handleCloseCancelModal = () => {
    setShowCancelModal(false)
    setPackageToCancel(null)
    setCancelForm({ razon_cancelacion: '', cancelado_por: 'Admin' })
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
        headers: { 'Content-Type': 'application/json' },
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

  // ─── Helpers para agendar sesiones restantes ──────────────────────────────────

  const handleAgendarSesionesRestantes = (pkg: Package) => {
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
        precio_final:
          pkg.service.valor_default * pkg.total_sesiones - (pkg.valoracion_monto || 0),
        monto_primer_pago: pkg.monto_primer_pago || 0,
        monto_segundo_pago: pkg.monto_segundo_pago || 0,
        sesiones_primer_pago: 0,
        sesiones_segundo_pago: pkg.sesiones_pendientes_agendar
      }
    }

    const completePackageData = {
      mode: 'complete',
      package_id: pkg.id,
      patient: pkg.patient,
      service: pkg.service,
      sesiones_restantes: pkg.sesiones_pendientes_agendar,
      tiene_valoracion_previa: pkg.tiene_valoracion_previa,
      valor: pkg.service.valor_default,
      comision: pkg.service.comision_default,
      observacion: null
    }

    sessionStorage.removeItem('packageAppointments')
    sessionStorage.removeItem('isSchedulingPackage')
    sessionStorage.setItem('completePackageData', JSON.stringify(completePackageData))
    sessionStorage.setItem('packageData', JSON.stringify(packageDataForConfirm))
    sessionStorage.setItem('isCompletingPackage', 'true')

    window.location.href = '/patients/schedule/dummy/confirm'
  }

  // ─── Helpers de visualización ─────────────────────────────────────────────────

  const getFechaVencimiento = (pkg: Package): string | null => {
    // Usar la fecha calculada en tiempo real si existe
    if (pkg.fecha_ultima_sesion_pagada_real !== undefined) {
      return pkg.fecha_ultima_sesion_pagada_real
    }
    return null
  }

  const needsSecondPaymentButton = (pkg: Package) =>
    pkg.forma_pago === 'fraccionado' &&
    pkg.primer_pago_completado &&
    !pkg.segundo_pago_completado

  const needsScheduleRemainingButton = (pkg: Package) =>
    pkg.forma_pago === 'fraccionado' &&
    pkg.segundo_pago_completado &&
    pkg.sesiones_pendientes_agendar > 0

  const getProgressPercentage = (pkg: Package) =>
    (pkg.sesiones_completadas / pkg.total_sesiones) * 100

  const getSesionesDisponibles = (pkg: Package) =>
    pkg.sesiones_pendientes_agendar

  // ─── Return ───────────────────────────────────────────────────────────────────

  return {
    // Estado
    packages,
    loading,
    filterEstado,
    setFilterEstado,
    searchTerm,
    setSearchTerm,
    expandedPackages,
    currentPage,
    pagination,
    filteredPackages,
    activeSearchTerm,
    handleSearch,
    handleClearSearch,
    handleSearchKeyDown,

    // Modal pago
    showPaymentModal,
    selectedPackage,
    paymentForm,
    setPaymentForm,
    processingPayment,
    handleOpenPaymentModal,
    handleClosePaymentModal,
    handleRegistrarPago,

    // Modal cancelación
    showCancelModal,
    packageToCancel,
    cancelForm,
    setCancelForm,
    processingCancel,
    handleOpenCancelModal,
    handleCloseCancelModal,
    handleCancelarPaquete,

    // Acciones
    toggleExpand,
    handlePageChange,
    handleAgendarSesionesRestantes,
    fetchPackages,

    // Helpers
    getFechaVencimiento,
    needsSecondPaymentButton,
    needsScheduleRemainingButton,
    getProgressPercentage,
    getSesionesDisponibles
  }
}