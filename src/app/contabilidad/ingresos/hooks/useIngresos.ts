import { useState, useEffect, useCallback } from 'react'

export interface Terapeuta {
  id: string
  nombre: string
  apellido: string
}

export interface Ingreso {
  id: string
  fecha: string
  monto: number
  cantidad_terapias: number
  therapist_id: string
  observacion: string | null
  mes: number
  anio: number
  therapists: Terapeuta
}

export interface IngresoForm {
  fecha: string
  monto: string
  cantidad_terapias: string
  therapist_id: string
  observacion: string
}

const FORM_INICIAL: IngresoForm = {
  fecha: new Date().toISOString().split('T')[0],
  monto: '',
  cantidad_terapias: '',
  therapist_id: '',
  observacion: ''
}

export function useIngresos() {
  const mesActual = new Date().getMonth() + 1
  const anioActual = new Date().getFullYear()

  const [mes, setMes] = useState(mesActual)
  const [anio, setAnio] = useState(anioActual)
  const [ingresos, setIngresos] = useState<Ingreso[]>([])
  const [total, setTotal] = useState(0)
  const [totalTerapias, setTotalTerapias] = useState(0)
  const [terapeutas, setTerapeutas] = useState<Terapeuta[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingTerapeutas, setLoadingTerapeutas] = useState(true)
  const [guardando, setGuardando] = useState(false)
  const [eliminando, setEliminando] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [exito, setExito] = useState<string | null>(null)
  const [form, setForm] = useState<IngresoForm>(FORM_INICIAL)
  const [editandoId, setEditandoId] = useState<string | null>(null)
  const [mostrarFormulario, setMostrarFormulario] = useState(false)

  const cargarTerapeutas = useCallback(async () => {
    try {
      setLoadingTerapeutas(true)
      const response = await fetch('/api/therapists?limit=200')
      if (!response.ok) throw new Error('Error al cargar terapeutas')
      const data = await response.json()
      setTerapeutas(data.therapists || [])
    } catch {
      setError('Error al cargar la lista de terapeutas')
    } finally {
      setLoadingTerapeutas(false)
    }
  }, [])

  const cargarIngresos = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const response = await fetch(`/api/contabilidad/ingresos?mes=${mes}&anio=${anio}`)
      if (!response.ok) throw new Error('Error al cargar ingresos')
      const data = await response.json()
      setIngresos(data.ingresos)
      setTotal(data.total)
      setTotalTerapias(data.total_terapias)
    } catch {
      setError('Error al cargar los ingresos del mes')
    } finally {
      setLoading(false)
    }
  }, [mes, anio])

  useEffect(() => {
    cargarTerapeutas()
  }, [cargarTerapeutas])

  useEffect(() => {
    cargarIngresos()
  }, [cargarIngresos])

  const mostrarExito = (mensaje: string) => {
    setExito(mensaje)
    setTimeout(() => setExito(null), 3000)
  }

  const handleSubmit = async () => {
    if (!form.fecha || !form.monto || !form.cantidad_terapias || !form.therapist_id) {
      setError('Por favor completa todos los campos requeridos')
      return
    }

    if (Number(form.monto) <= 0) {
      setError('El monto debe ser mayor a 0')
      return
    }

    if (Number(form.cantidad_terapias) <= 0) {
      setError('La cantidad de terapias debe ser mayor a 0')
      return
    }

    try {
      setGuardando(true)
      setError(null)

      const url = editandoId
        ? `/api/contabilidad/ingresos/${editandoId}`
        : '/api/contabilidad/ingresos'

      const method = editandoId ? 'PUT' : 'POST'

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fecha: form.fecha,
          monto: Number(form.monto),
          cantidad_terapias: Number(form.cantidad_terapias),
          therapist_id: form.therapist_id,
          observacion: form.observacion || null
        })
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Error al guardar')
      }

      await cargarIngresos()
      setForm(FORM_INICIAL)
      setEditandoId(null)
      setMostrarFormulario(false)
      mostrarExito(editandoId ? 'Ingreso actualizado correctamente' : 'Ingreso registrado correctamente')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al guardar el ingreso')
    } finally {
      setGuardando(false)
    }
  }

  const handleEditar = (ingreso: Ingreso) => {
    setForm({
      fecha: ingreso.fecha,
      monto: String(ingreso.monto),
      cantidad_terapias: String(ingreso.cantidad_terapias),
      therapist_id: ingreso.therapist_id,
      observacion: ingreso.observacion || ''
    })
    setEditandoId(ingreso.id)
    setMostrarFormulario(true)
    setError(null)
  }

  const handleEliminar = async (id: string) => {
    if (!confirm('¿Estás seguro de que deseas eliminar este ingreso?')) return

    try {
      setEliminando(id)
      const response = await fetch(`/api/contabilidad/ingresos/${id}`, {
        method: 'DELETE'
      })
      if (!response.ok) throw new Error('Error al eliminar')
      await cargarIngresos()
      mostrarExito('Ingreso eliminado correctamente')
    } catch {
      setError('Error al eliminar el ingreso')
    } finally {
      setEliminando(null)
    }
  }

  const handleCancelar = () => {
    setForm(FORM_INICIAL)
    setEditandoId(null)
    setMostrarFormulario(false)
    setError(null)
  }

  const handleNuevo = () => {
    setForm(FORM_INICIAL)
    setEditandoId(null)
    setMostrarFormulario(true)
    setError(null)
  }

  return {
    mes, setMes,
    anio, setAnio,
    ingresos,
    total,
    totalTerapias,
    terapeutas,
    loading,
    loadingTerapeutas,
    guardando,
    eliminando,
    error,
    exito,
    form, setForm,
    editandoId,
    mostrarFormulario,
    handleSubmit,
    handleEditar,
    handleEliminar,
    handleCancelar,
    handleNuevo
  }
}