// src/app/contabilidad/resumen/hooks/useResumen.ts

import { useState, useEffect, useCallback } from 'react'

export interface ResumenCalculado {
  ingresos_bancolombia: number
  guardado_mes_anterior: number
  total_disponible: number
  nomina_total: number
  gastos_total: number
  dinero_a_guardar: number
  utilidad: number
  acumulado_historico: number
}

export interface ResumenGuardado extends ResumenCalculado {
  id: string
  mes: number
  anio: number
  created_at: string
  updated_at: string
}

export interface ResumenData {
  mes: number
  anio: number
  calculado: ResumenCalculado
  guardado: ResumenGuardado | null
  ya_guardado: boolean
}

export function useResumen() {
  const mesActual = new Date().getMonth() + 1
  const anioActual = new Date().getFullYear()

  const [mes, setMes] = useState(mesActual)
  const [anio, setAnio] = useState(anioActual)
  const [resumen, setResumen] = useState<ResumenData | null>(null)
  const [loading, setLoading] = useState(true)
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [exito, setExito] = useState<string | null>(null)

  const cargarResumen = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const response = await fetch(`/api/contabilidad/resumen?mes=${mes}&anio=${anio}`)
      if (!response.ok) throw new Error('Error al cargar resumen')
      const data = await response.json()
      setResumen(data)
    } catch {
      setError('Error al cargar el resumen financiero')
    } finally {
      setLoading(false)
    }
  }, [mes, anio])

  useEffect(() => {
    cargarResumen()
  }, [cargarResumen])

  const mostrarExito = (mensaje: string) => {
    setExito(mensaje)
    setTimeout(() => setExito(null), 4000)
  }

  const handleGuardarResumen = async () => {
    if (!resumen) return

    try {
      setGuardando(true)
      setError(null)

      const response = await fetch('/api/contabilidad/resumen', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mes,
          anio,
          ...resumen.calculado
        })
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Error al guardar')
      }

      await cargarResumen()
      mostrarExito(
        resumen.ya_guardado
          ? 'Resumen actualizado correctamente'
          : 'Resumen guardado correctamente'
      )
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al guardar el resumen')
    } finally {
      setGuardando(false)
    }
  }

  return {
    mes, setMes,
    anio, setAnio,
    resumen,
    loading,
    guardando,
    error,
    exito,
    handleGuardarResumen,
    recargar: cargarResumen
  }
}