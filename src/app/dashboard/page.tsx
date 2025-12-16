'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'

interface AppointmentsByStatus {
  agendada?: number
  completada?: number
  cancelada?: number
  pendiente_reagendar?: number
}

interface TherapistStat {
  therapist_id: string
  nombre: string
  apellido: string
  citas_completadas: number
  ingresos_generados: number
  comisiones_ganadas: number
}

interface DailyIngresos {
  date: string
  ingresos: number
}

interface StatsData {
  date_range: {
    from: string
    to: string
  }
  appointments_by_status: AppointmentsByStatus
  financial_summary: {
    total_ingresos: number
    total_comisiones: number
  }
  therapist_stats: TherapistStat[]
  daily_ingresos_last_7_days: DailyIngresos[]
}

export default function DashboardPage() {
  const [stats, setStats] = useState<StatsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [sortColumn, setSortColumn] = useState<'nombre' | 'citas_completadas' | 'ingresos_generados' | 'comisiones_ganadas'>('citas_completadas')
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc')

  // Inicializar con el mes actual
  useEffect(() => {
    const now = new Date()
    // Usar la zona horaria de Colombia
    const colombiaOffset = -5 * 60 // UTC-5
    const localDate = new Date(now.getTime() + (colombiaOffset * 60 * 1000))
    
    const firstDay = new Date(localDate.getFullYear(), localDate.getMonth(), 1)
    const lastDay = new Date(localDate.getFullYear(), localDate.getMonth() + 1, 0)
    
    const fromStr = firstDay.toISOString().split('T')[0]
    const toStr = lastDay.toISOString().split('T')[0]
    
    console.log('Fecha actual (Colombia):', localDate.toISOString())
    console.log('Fechas iniciales:', { fromStr, toStr })
    
    setDateFrom(fromStr)
    setDateTo(toStr)
  }, [])

  // Cargar estadísticas cuando cambien las fechas
  useEffect(() => {
    if (dateFrom && dateTo) {
      fetchStats()
    }
  }, [dateFrom, dateTo])

  const fetchStats = async () => {
    setLoading(true)
    try {
      const url = `/api/stats?date_from=${dateFrom}&date_to=${dateTo}`
      console.log('Llamando API:', url)
      
      const response = await fetch(url)
      const data = await response.json()
      
      console.log('Respuesta API:', data)
      
      if (response.ok) {
        setStats(data)
      } else {
        console.error('Error al cargar estadísticas:', data.error)
        alert(`Error: ${data.error}`)
      }
    } catch (error) {
      console.error('Error al cargar estadísticas:', error)
      alert('Error de conexión con el servidor')
    } finally {
      setLoading(false)
    }
  }

  const handleSort = (column: typeof sortColumn) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortColumn(column)
      setSortDirection('desc')
    }
  }

  const sortedTherapists = stats?.therapist_stats.sort((a, b) => {
    if (sortColumn === 'nombre') {
      const aValue = `${a.nombre} ${a.apellido}`
      const bValue = `${b.nombre} ${b.apellido}`
      return sortDirection === 'asc' 
        ? aValue.localeCompare(bValue)
        : bValue.localeCompare(aValue)
    }
    
    const aValue = a[sortColumn] as number
    const bValue = b[sortColumn] as number
    return sortDirection === 'asc' ? aValue - bValue : bValue - aValue
  })

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0
    }).format(value)
  }

  const totalCitas = stats ? 
    Number(stats.appointments_by_status.agendada || 0) +
    Number(stats.appointments_by_status.completada || 0) +
    Number(stats.appointments_by_status.cancelada || 0) +
    Number(stats.appointments_by_status.pendiente_reagendar || 0)
    : 0

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-50 dark:bg-zinc-900">
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-teal-600 border-r-transparent"></div>
          <p className="mt-4 text-zinc-600 dark:text-zinc-400">Cargando estadísticas...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-900 py-8 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <Link 
            href="/home"
            className="inline-flex items-center text-teal-600 hover:text-teal-700 mb-4"
          >
            ← Volver al inicio
          </Link>
          <h1 className="text-4xl font-bold text-zinc-900 dark:text-zinc-50">
            Dashboard de Estadísticas
          </h1>
          <p className="text-zinc-600 dark:text-zinc-400 mt-2">
            Análisis y métricas del negocio
          </p>
        </div>

        {/* Filtros de fecha */}
        <div className="bg-white dark:bg-zinc-800 rounded-lg shadow-sm p-6 mb-6">
          <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50 mb-4">
            Rango de Fechas
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                Desde
              </label>
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="w-full px-4 py-2 border border-zinc-300 dark:border-zinc-600 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent bg-white dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                Hasta
              </label>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="w-full px-4 py-2 border border-zinc-300 dark:border-zinc-600 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent bg-white dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100"
              />
            </div>
          </div>
        </div>

        {/* Cards de resumen */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
          <div className="bg-white dark:bg-zinc-800 rounded-lg shadow-sm p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-1">Total Citas</p>
                <p className="text-3xl font-bold text-zinc-900 dark:text-zinc-50">
                  {totalCitas}
                </p>
              </div>
              <div className="h-12 w-12 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center">
                <span className="text-2xl">📅</span>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-zinc-800 rounded-lg shadow-sm p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-1">Completadas</p>
                <p className="text-3xl font-bold text-green-600">
                  {stats?.appointments_by_status.completada || 0}
                </p>
              </div>
              <div className="h-12 w-12 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center">
                <span className="text-2xl">✓</span>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-zinc-800 rounded-lg shadow-sm p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-1">Ingresos Totales</p>
                <p className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">
                  {formatCurrency(stats?.financial_summary.total_ingresos || 0)}
                </p>
              </div>
              <div className="h-12 w-12 bg-teal-100 dark:bg-teal-900 rounded-full flex items-center justify-center">
                <span className="text-2xl">💰</span>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-zinc-800 rounded-lg shadow-sm p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-1">Comisiones Totales</p>
                <p className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">
                  {formatCurrency(stats?.financial_summary.total_comisiones || 0)}
                </p>
              </div>
              <div className="h-12 w-12 bg-purple-100 dark:bg-purple-900 rounded-full flex items-center justify-center">
                <span className="text-2xl">💵</span>
              </div>
            </div>
          </div>
        </div>

        {/* Tabla de terapeutas */}
        <div className="bg-white dark:bg-zinc-800 rounded-lg shadow-sm p-6">
          <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50 mb-4">
            Estadísticas por Terapeuta
          </h2>

          {sortedTherapists && sortedTherapists.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-zinc-200 dark:border-zinc-700">
                    <th 
                      onClick={() => handleSort('nombre')}
                      className="text-left py-3 px-4 text-sm font-medium text-zinc-700 dark:text-zinc-300 cursor-pointer hover:bg-zinc-50 dark:hover:bg-zinc-700"
                    >
                      Terapeuta {sortColumn === 'nombre' && (sortDirection === 'asc' ? '↑' : '↓')}
                    </th>
                    <th 
                      onClick={() => handleSort('citas_completadas')}
                      className="text-right py-3 px-4 text-sm font-medium text-zinc-700 dark:text-zinc-300 cursor-pointer hover:bg-zinc-50 dark:hover:bg-zinc-700"
                    >
                      Citas {sortColumn === 'citas_completadas' && (sortDirection === 'asc' ? '↑' : '↓')}
                    </th>
                    <th 
                      onClick={() => handleSort('ingresos_generados')}
                      className="text-right py-3 px-4 text-sm font-medium text-zinc-700 dark:text-zinc-300 cursor-pointer hover:bg-zinc-50 dark:hover:bg-zinc-700"
                    >
                      Ingresos {sortColumn === 'ingresos_generados' && (sortDirection === 'asc' ? '↑' : '↓')}
                    </th>
                    <th 
                      onClick={() => handleSort('comisiones_ganadas')}
                      className="text-right py-3 px-4 text-sm font-medium text-zinc-700 dark:text-zinc-300 cursor-pointer hover:bg-zinc-50 dark:hover:bg-zinc-700"
                    >
                      Comisiones {sortColumn === 'comisiones_ganadas' && (sortDirection === 'asc' ? '↑' : '↓')}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {sortedTherapists.map((therapist) => (
                    <tr 
                      key={therapist.therapist_id}
                      className="border-b border-zinc-100 dark:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-700"
                    >
                      <td className="py-3 px-4 text-zinc-900 dark:text-zinc-100">
                        {therapist.nombre} {therapist.apellido}
                      </td>
                      <td className="py-3 px-4 text-right text-zinc-900 dark:text-zinc-100">
                        {therapist.citas_completadas}
                      </td>
                      <td className="py-3 px-4 text-right text-zinc-900 dark:text-zinc-100">
                        {formatCurrency(therapist.ingresos_generados)}
                      </td>
                      <td className="py-3 px-4 text-right text-zinc-900 dark:text-zinc-100">
                        {formatCurrency(therapist.comisiones_ganadas)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-center text-zinc-500 dark:text-zinc-400 py-8">
              No hay datos disponibles para el rango seleccionado
            </p>
          )}
        </div>
      </div>
    </div>
  )
}