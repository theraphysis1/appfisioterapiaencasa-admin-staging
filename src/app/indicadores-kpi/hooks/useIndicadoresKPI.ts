'use client'

import { useEffect, useState, useCallback, useMemo } from 'react'

export interface TipoTerapiaRow {
  mes: string
  categoria: string
  cantidad: number
}

export interface TamanoPaqueteRow {
  mes: string
  cantidad_sesiones: number
  cantidad: number
}

// Categorías fijas del negocio (definidas en el dropdown del formulario)
export const CATEGORIAS_TERAPIA = ['neurologico', 'ortopedico', 'deportivo', 'sin_clasificar'] as const

export const CATEGORIA_LABELS: Record<string, string> = {
  neurologico: 'Neurológico',
  ortopedico: 'Ortopédico',
  deportivo: 'Deportivo',
  sin_clasificar: 'Sin clasificar'
}

export const CATEGORIA_COLORS: Record<string, string> = {
  neurologico: '#4f46e5',   // indigo-600
  ortopedico: '#0d9488',    // teal-600
  deportivo: '#ea580c',     // orange-600
  sin_clasificar: '#9ca3af' // gray-400
}

const PAQUETE_COLORS = ['#2563eb', '#7c3aed', '#059669', '#dc2626', '#d97706']

// Calcula el rango del mes actual en hora Bogotá (no depende de la hora local del navegador)
function getCurrentMonthRangeBogota(): { desde: string; hasta: string } {
  const now = new Date()
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Bogota',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).formatToParts(now)

  const year = parseInt(parts.find(p => p.type === 'year')!.value)
  const month = parseInt(parts.find(p => p.type === 'month')!.value)

  const desde = `${year}-${String(month).padStart(2, '0')}-01`
  const lastDay = new Date(year, month, 0).getDate()
  const hasta = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`

  return { desde, hasta }
}

export function useIndicadoresKPI() {
  const defaultRange = getCurrentMonthRangeBogota()

  // Estado "borrador" - inputs de fecha, se actualizan libremente
  const [draftDesde, setDraftDesde] = useState(defaultRange.desde)
  const [draftHasta, setDraftHasta] = useState(defaultRange.hasta)

  // Estado "activo" - solo cambia al presionar Aplicar, dispara el fetch
  const [activeDesde, setActiveDesde] = useState(defaultRange.desde)
  const [activeHasta, setActiveHasta] = useState(defaultRange.hasta)

  const [tipoTerapiaData, setTipoTerapiaData] = useState<TipoTerapiaRow[]>([])
  const [tamanoPaqueteData, setTamanoPaqueteData] = useState<TamanoPaqueteRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const cargarDatos = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [tipoRes, tamanoRes] = await Promise.all([
        fetch(`/api/kpi/tipo-terapia?fecha_desde=${activeDesde}&fecha_hasta=${activeHasta}`),
        fetch(`/api/kpi/tamano-paquete?fecha_desde=${activeDesde}&fecha_hasta=${activeHasta}`)
      ])

      if (!tipoRes.ok || !tamanoRes.ok) {
        throw new Error('Error al cargar los indicadores')
      }

      const tipoJson = await tipoRes.json()
      const tamanoJson = await tamanoRes.json()

      setTipoTerapiaData(tipoJson.data || [])
      setTamanoPaqueteData(tamanoJson.data || [])
    } catch (err) {
      console.error('Error cargando KPI:', err)
      setError('Error al cargar los indicadores. Intenta nuevamente.')
    } finally {
      setLoading(false)
    }
  }, [activeDesde, activeHasta])

  useEffect(() => {
    cargarDatos()
  }, [cargarDatos])

  const aplicarRango = () => {
    setActiveDesde(draftDesde)
    setActiveHasta(draftHasta)
  }

  // Pivotea las filas [{mes, categoria, cantidad}] a [{mes, neurologico: N, ortopedico: N, ...}]
  // para que Recharts pueda dibujar las barras agrupadas por mes.
  const tipoTerapiaChartData = useMemo(() => {
    const porMes = new Map<string, Record<string, number>>()

    for (const row of tipoTerapiaData) {
      if (!porMes.has(row.mes)) {
        const base: Record<string, number> = {}
        CATEGORIAS_TERAPIA.forEach(cat => { base[cat] = 0 })
        porMes.set(row.mes, base)
      }
      porMes.get(row.mes)![row.categoria] = row.cantidad
    }

    return Array.from(porMes.entries())
      .sort(([mesA], [mesB]) => mesA.localeCompare(mesB))
      .map(([mes, categorias]) => ({ mes, ...categorias }))
  }, [tipoTerapiaData])

  // Pivotea [{mes, cantidad_sesiones, cantidad}] a [{mes, '5_sesiones': N, '10_sesiones': N, ...}]
  // Los tamaños de paquete son dinámicos (no hardcodeados a 5/10) por si en el futuro hay otros.
  const { tamanoPaqueteChartData, tamanosPresentes } = useMemo(() => {
    const tamanosSet = new Set<number>()
    tamanoPaqueteData.forEach(row => tamanosSet.add(row.cantidad_sesiones))
    const tamanos = Array.from(tamanosSet).sort((a, b) => a - b)

    const porMes = new Map<string, Record<string, number>>()
    for (const row of tamanoPaqueteData) {
      if (!porMes.has(row.mes)) {
        const base: Record<string, number> = {}
        tamanos.forEach(t => { base[`sesiones_${t}`] = 0 })
        porMes.set(row.mes, base)
      }
      porMes.get(row.mes)![`sesiones_${row.cantidad_sesiones}`] = row.cantidad
    }

    const chartData = Array.from(porMes.entries())
      .sort(([mesA], [mesB]) => mesA.localeCompare(mesB))
      .map(([mes, tamanosData]) => ({ mes, ...tamanosData }))

    return { tamanoPaqueteChartData: chartData, tamanosPresentes: tamanos }
  }, [tamanoPaqueteData])

  return {
    draftDesde,
    draftHasta,
    setDraftDesde,
    setDraftHasta,
    aplicarRango,
    tipoTerapiaChartData,
    tamanoPaqueteChartData,
    tamanosPresentes,
    loading,
    error
  }
}

export { PAQUETE_COLORS }