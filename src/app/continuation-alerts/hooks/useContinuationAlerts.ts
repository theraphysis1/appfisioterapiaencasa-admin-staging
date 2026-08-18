import { useState, useEffect, useCallback } from 'react'

export interface ContinuationAlert {
  id: string
  tipo_alerta: 'valoracion_completada' | 'paquete_completado'
  total_sesiones: number
  fecha_completado: string
  created_at: string
  contact_count: number
  proximo_seguimiento: string | null
  patologia: string | null
  patient: {
    id: string
    nombre: string
    apellido: string
    telefono: string
    barrio: string
    direccion: string
    referencia: string | null
  } | null
  package: {
    id: string
    total_sesiones: number
    valor_total: number
    service: { nombre: string } | null
  } | null
  appointment: {
    id: string
    fecha_hora: string
    therapist_id: string | null
    service: { nombre: string } | null
    therapist: { nombre: string; apellido: string } | null
  } | null
  ultima_cita_paquete: {
    id: string
    fecha_hora: string
    therapist: { nombre: string; apellido: string } | null
  } | null
}

export interface ContactLog {
  id: string
  notas: string | null
  proximo_seguimiento: string | null
  contactado_por: string | null
  created_at: string
}

export interface ContactFormData {
  notas: string
  proximo_seguimiento: string
  contactado_por: string
}

export interface AlertsState {
  alerts: ContinuationAlert[]
  total: number
  page: number
  total_pages: number
  loading: boolean
  error: string | null
}

export type FiltroTipo = 'todos' | 'valoracion_completada' | 'paquete_completado'

const CONTACT_FORM_INITIAL: ContactFormData = {
  notas: '',
  proximo_seguimiento: '',
  contactado_por: ''
}

export function useContinuationAlerts() {
  const [state, setState] = useState<AlertsState>({
    alerts: [],
    total: 0,
    page: 1,
    total_pages: 1,
    loading: true,
    error: null
  })

  const [filtroTipo, setFiltroTipo] = useState<FiltroTipo>('todos')
  const [deletingId, setDeletingId] = useState<string | null>(null)

  // Estados para eliminar
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)
  const [confirmPaidId, setConfirmPaidId] = useState<string | null>(null)

  // Estados para contacto
  const [contactModalId, setContactModalId] = useState<string | null>(null)
  const [contactForm, setContactForm] = useState<ContactFormData>(CONTACT_FORM_INITIAL)
  const [savingContact, setSavingContact] = useState(false)
  const [contactError, setContactError] = useState<string | null>(null)

  // Estados para historial
  const [historialId, setHistorialId] = useState<string | null>(null)
  const [historialData, setHistorialData] = useState<ContactLog[]>([])
  const [loadingHistorial, setLoadingHistorial] = useState(false)

  const fetchAlerts = useCallback(async (page = 1, tipo: FiltroTipo = 'todos') => {
    setState(prev => ({ ...prev, loading: true, error: null }))

    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: '20'
      })

      if (tipo !== 'todos') {
        params.set('tipo', tipo)
      }

      const response = await fetch(`/api/continuation-alerts?${params.toString()}`)

      if (!response.ok) {
        throw new Error('Error al cargar las alertas')
      }

      const data = await response.json()

      setState({
        alerts: data.alerts || [],
        total: data.total || 0,
        page: data.page || 1,
        total_pages: data.total_pages || 1,
        loading: false,
        error: null
      })
    } catch (error) {
      setState(prev => ({
        ...prev,
        loading: false,
        error: error instanceof Error ? error.message : 'Error desconocido'
      }))
    }
  }, [])

  useEffect(() => {
    fetchAlerts(1, filtroTipo)
  }, [filtroTipo, fetchAlerts])

  const handleFiltroChange = (tipo: FiltroTipo) => {
    setFiltroTipo(tipo)
  }

  const handlePageChange = (newPage: number) => {
    fetchAlerts(newPage, filtroTipo)
  }

  // --- Eliminar por "no quiere continuar" ---
  const handleConfirmDelete = (id: string) => {
    setConfirmDeleteId(id)
    setConfirmPaidId(null)
  }

  const handleCancelDelete = () => {
    setConfirmDeleteId(null)
  }

  const handleDelete = async (id: string) => {
    setDeletingId(id)
    setConfirmDeleteId(null)

    try {
      const response = await fetch(`/api/continuation-alerts/${id}`, {
        method: 'DELETE'
      })

      if (!response.ok) {
        throw new Error('Error al eliminar la alerta')
      }

      setState(prev => ({
        ...prev,
        alerts: prev.alerts.filter(a => a.id !== id),
        total: prev.total - 1
      }))
    } catch (error) {
      console.error('Error eliminando alerta:', error)
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Error al eliminar'
      }))
    } finally {
      setDeletingId(null)
    }
  }

  // --- Eliminar por "pagó y agendó" ---
  const handleConfirmPaid = (id: string) => {
    setConfirmPaidId(id)
    setConfirmDeleteId(null)
  }

  const handleCancelPaid = () => {
    setConfirmPaidId(null)
  }

  const handlePaid = async (id: string) => {
    setDeletingId(id)
    setConfirmPaidId(null)

    try {
      const response = await fetch(`/api/continuation-alerts/${id}`, {
        method: 'DELETE'
      })

      if (!response.ok) {
        throw new Error('Error al eliminar la alerta')
      }

      setState(prev => ({
        ...prev,
        alerts: prev.alerts.filter(a => a.id !== id),
        total: prev.total - 1
      }))
    } catch (error) {
      console.error('Error eliminando alerta:', error)
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Error al eliminar'
      }))
    } finally {
      setDeletingId(null)
    }
  }

  // --- Registrar contacto ---
  const handleOpenContactModal = (id: string) => {
    setContactModalId(id)
    setContactForm(CONTACT_FORM_INITIAL)
    setContactError(null)
  }

  const handleCloseContactModal = () => {
    setContactModalId(null)
    setContactForm(CONTACT_FORM_INITIAL)
    setContactError(null)
  }

  const handleContactFormChange = (field: keyof ContactFormData, value: string) => {
    setContactForm(prev => ({ ...prev, [field]: value }))
  }

  const handleSaveContact = async (alertId: string) => {
    if (!contactForm.notas.trim()) {
      setContactError('Las notas del contacto son obligatorias')
      return
    }

    setSavingContact(true)
    setContactError(null)

    try {
      const response = await fetch(`/api/continuation-alerts/${alertId}/contacts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          notas: contactForm.notas.trim(),
          proximo_seguimiento: contactForm.proximo_seguimiento || null,
          contactado_por: contactForm.contactado_por.trim() || null
        })
      })

      if (!response.ok) {
        throw new Error('Error al registrar el contacto')
      }

      // Actualizar contact_count en la alerta local
      setState(prev => ({
        ...prev,
        alerts: prev.alerts.map(a =>
          a.id === alertId
            ? {
                ...a,
                contact_count: (a.contact_count || 0) + 1,
                proximo_seguimiento: contactForm.proximo_seguimiento || a.proximo_seguimiento
              }
            : a
        )
      }))

      handleCloseContactModal()
    } catch (error) {
      setContactError(error instanceof Error ? error.message : 'Error al registrar')
    } finally {
      setSavingContact(false)
    }
  }

  // --- Historial de contactos ---
  const handleOpenHistorial = async (alertId: string) => {
    setHistorialId(alertId)
    setLoadingHistorial(true)
    setHistorialData([])

    try {
      const response = await fetch(`/api/continuation-alerts/${alertId}/contacts`)

      if (!response.ok) {
        throw new Error('Error al cargar historial')
      }

      const data = await response.json()
      setHistorialData(data.contacts || [])
    } catch (error) {
      console.error('Error cargando historial:', error)
    } finally {
      setLoadingHistorial(false)
    }
  }

  const handleCloseHistorial = () => {
    setHistorialId(null)
    setHistorialData([])
  }

  return {
    state,
    filtroTipo,
    deletingId,
    // Eliminar
    confirmDeleteId,
    confirmPaidId,
    handleConfirmDelete,
    handleCancelDelete,
    handleDelete,
    handleConfirmPaid,
    handleCancelPaid,
    handlePaid,
    // Contacto
    contactModalId,
    contactForm,
    savingContact,
    contactError,
    handleOpenContactModal,
    handleCloseContactModal,
    handleContactFormChange,
    handleSaveContact,
    // Historial
    historialId,
    historialData,
    loadingHistorial,
    handleOpenHistorial,
    handleCloseHistorial,
    // General
    handleFiltroChange,
    handlePageChange,
    refetch: () => fetchAlerts(state.page, filtroTipo)
  }
}