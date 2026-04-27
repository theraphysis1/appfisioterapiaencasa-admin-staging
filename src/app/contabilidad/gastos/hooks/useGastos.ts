import { useState, useEffect, useCallback } from 'react'

export const TIPOS_GASTO = [
  'nomina_marketing',
  'nomina_oficina',
  'nomina_comercial',
  'linea_celular',
  'cuota_manejo',
  'impuesto_4x1000',
  'software_facturacion',
  'publicidad_google',
  'publicidad_facebook',
  'varios'
]

export const LABELS_GASTO: Record<string, string> = {
  nomina_marketing: 'Nómina Marketing',
  nomina_oficina: 'Nómina Empleado Oficina',
  nomina_comercial: 'Nómina Comercial',
  linea_celular: 'Línea Celular',
  cuota_manejo: 'Cuota Manejo Tarjeta',
  impuesto_4x1000: 'Impuesto 4×1000',
  software_facturacion: 'Software Facturación',
  publicidad_google: 'Publicidad Google',
  publicidad_facebook: 'Publicidad Facebook',
  varios: 'Varios'
}

export interface Gasto {
  id: string
  mes: number
  anio: number
  tipo: string
  descripcion: string | null
  monto: number
  created_at: string
}

export interface GastoForm {
  tipo: string
  descripcion: string
  monto: string
}

const FORM_INICIAL: GastoForm = {
  tipo: '',
  descripcion: '',
  monto: ''
}

export function useGastos() {
  const mesActual = new Date().getMonth() + 1
  const anioActual = new Date().getFullYear()

  const [mes, setMes] = useState(mesActual)
  const [anio, setAnio] = useState(anioActual)
  const [gastos, setGastos] = useState<Gasto[]>([])
  const [total, setTotal] = useState(0)
  const [porTipo, setPorTipo] = useState<Record<string, number>>({})
  const [loading, setLoading] = useState(true)
  const [guardando, setGuardando] = useState(false)
  const [eliminando, setEliminando] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [exito, setExito] = useState<string | null>(null)
  const [form, setForm] = useState<GastoForm>(FORM_INICIAL)
  const [editandoId, setEditandoId] = useState<string | null>(null)
  const [mostrarFormulario, setMostrarFormulario] = useState(false)

  const cargarGastos = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const response = await fetch(`/api/contabilidad/gastos?mes=${mes}&anio=${anio}`)
      if (!response.ok) throw new Error('Error al cargar gastos')
      const data = await response.json()
      setGastos(data.gastos)
      setTotal(data.total)
      setPorTipo(data.por_tipo)
    } catch {
      setError('Error al cargar los gastos del mes')
    } finally {
      setLoading(false)
    }
  }, [mes, anio])

  useEffect(() => {
    cargarGastos()
  }, [cargarGastos])

  const mostrarExito = (mensaje: string) => {
    setExito(mensaje)
    setTimeout(() => setExito(null), 3000)
  }

  const handleSubmit = async () => {
    if (!form.tipo || !form.monto) {
      setError('Por favor completa todos los campos requeridos')
      return
    }

    if (Number(form.monto) <= 0) {
      setError('El monto debe ser mayor a 0')
      return
    }

    if (form.tipo === 'varios' && !form.descripcion.trim()) {
      setError('Los gastos de tipo "Varios" requieren una descripción')
      return
    }

    try {
      setGuardando(true)
      setError(null)

      const url = editandoId
        ? `/api/contabilidad/gastos/${editandoId}`
        : '/api/contabilidad/gastos'

      const method = editandoId ? 'PUT' : 'POST'

      const body = editandoId
        ? { tipo: form.tipo, descripcion: form.descripcion || null, monto: Number(form.monto) }
        : { mes, anio, tipo: form.tipo, descripcion: form.descripcion || null, monto: Number(form.monto) }

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Error al guardar')
      }

      await cargarGastos()
      setForm(FORM_INICIAL)
      setEditandoId(null)
      setMostrarFormulario(false)
      mostrarExito(editandoId ? 'Gasto actualizado correctamente' : 'Gasto registrado correctamente')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al guardar el gasto')
    } finally {
      setGuardando(false)
    }
  }

  const handleEditar = (gasto: Gasto) => {
    setForm({
      tipo: gasto.tipo,
      descripcion: gasto.descripcion || '',
      monto: String(gasto.monto)
    })
    setEditandoId(gasto.id)
    setMostrarFormulario(true)
    setError(null)
  }

  const handleEliminar = async (id: string) => {
    if (!confirm('¿Estás seguro de que deseas eliminar este gasto?')) return

    try {
      setEliminando(id)
      const response = await fetch(`/api/contabilidad/gastos/${id}`, {
        method: 'DELETE'
      })
      if (!response.ok) throw new Error('Error al eliminar')
      await cargarGastos()
      mostrarExito('Gasto eliminado correctamente')
    } catch {
      setError('Error al eliminar el gasto')
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
    gastos,
    total,
    porTipo,
    loading,
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