import { useState, useEffect, useCallback } from 'react'

export interface TerapeutaNomina {
  therapist_id: string
  nombre: string
  apellido: string
  subsidio_base: number
  dias_descontados: number
  subsidio_a_pagar: number
  sesiones_completadas: number
  comision_completadas: number
  sesiones_pendientes: number
  comision_pendientes: number
  total_nomina: number
  tiene_config: boolean
  config_id: string | null
}

export interface NominaResumen {
  terapeutas: TerapeutaNomina[]
  total_nomina_general: number
  total_dinero_guardar: number
  mes: number
  anio: number
}

export interface ConfigForm {
  subsidio_base: string
  dias_descontados: string
}

const FORM_INICIAL: ConfigForm = {
  subsidio_base: '',
  dias_descontados: '0'
}

export function useNomina() {
  const mesActual = new Date().getMonth() + 1
  const anioActual = new Date().getFullYear()

  const [mes, setMes] = useState(mesActual)
  const [anio, setAnio] = useState(anioActual)
  const [nomina, setNomina] = useState<NominaResumen | null>(null)
  const [loading, setLoading] = useState(true)
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [exito, setExito] = useState<string | null>(null)
  const [editandoTerapeuta, setEditandoTerapeuta] = useState<string | null>(null)
  const [form, setForm] = useState<ConfigForm>(FORM_INICIAL)

  const cargarNomina = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const response = await fetch(`/api/contabilidad/nomina?mes=${mes}&anio=${anio}`)
      if (!response.ok) throw new Error('Error al cargar nómina')
      const data = await response.json()
      setNomina(data)
    } catch {
      setError('Error al cargar la nómina del mes')
    } finally {
      setLoading(false)
    }
  }, [mes, anio])

  useEffect(() => {
    cargarNomina()
  }, [cargarNomina])

  const mostrarExito = (mensaje: string) => {
    setExito(mensaje)
    setTimeout(() => setExito(null), 3000)
  }

  const handleEditarConfig = (terapeuta: TerapeutaNomina) => {
    setForm({
      subsidio_base: terapeuta.subsidio_base > 0 ? String(terapeuta.subsidio_base) : '',
      dias_descontados: String(terapeuta.dias_descontados)
    })
    setEditandoTerapeuta(terapeuta.therapist_id)
    setError(null)
  }

  const handleGuardarConfig = async (therapist_id: string) => {
    if (!form.subsidio_base || Number(form.subsidio_base) < 0) {
      setError('El subsidio base debe ser mayor o igual a 0')
      return
    }

    const diasDesc = Number(form.dias_descontados)
    if (isNaN(diasDesc) || diasDesc < 0 || diasDesc > 30) {
      setError('Los días descontados deben estar entre 0 y 30')
      return
    }

    try {
      setGuardando(true)
      setError(null)

      const response = await fetch('/api/contabilidad/nomina', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          therapist_id,
          mes,
          anio,
          subsidio_base: Number(form.subsidio_base),
          dias_descontados: diasDesc
        })
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Error al guardar')
      }

      await cargarNomina()
      setEditandoTerapeuta(null)
      setForm(FORM_INICIAL)
      mostrarExito('Configuración guardada correctamente')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al guardar la configuración')
    } finally {
      setGuardando(false)
    }
  }

  const handleCancelarConfig = () => {
    setEditandoTerapeuta(null)
    setForm(FORM_INICIAL)
    setError(null)
  }

  return {
    mes, setMes,
    anio, setAnio,
    nomina,
    loading,
    guardando,
    error,
    exito,
    form, setForm,
    editandoTerapeuta,
    handleEditarConfig,
    handleGuardarConfig,
    handleCancelarConfig
  }
}