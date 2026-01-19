'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'

interface Stats {
  total_citas: number
  registros_completos: number
  solo_llegada: number
  sin_registro: number
  porcentaje_cumplimiento: number
  dispositivos: {
    principal: string
    usos_dispositivo_principal: number
    dispositivos_diferentes: Array<{
      modelo: string
      usos: number
      fechas: string[]
    }>
  }
  puntualidad: {
    promedio_minutos_tarde: number
    llegadas_tarde: number
    llegadas_puntuales: number
    total_analizadas: number
  }
}

export default function ComparacionMensualPage() {
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // Filtros
  const [selectedMonth, setSelectedMonth] = useState('')
  const [therapistId, setTherapistId] = useState('')
  const [therapists, setTherapists] = useState<Array<{ id: string; nombre: string; apellido: string }>>([])

  // Inicializar mes actual
  useEffect(() => {
    const now = new Date()
    const year = now.getFullYear()
    const month = String(now.getMonth() + 1).padStart(2, '0')
    setSelectedMonth(`${year}-${month}`)
  }, [])

  // Cargar terapeutas
  useEffect(() => {
    const fetchTherapists = async () => {
      try {
        const response = await fetch('/api/therapists')
        if (!response.ok) throw new Error('Error al cargar terapeutas')
        const data = await response.json()
        setTherapists(data.therapists || [])
      } catch (err) {
        console.error('Error loading therapists:', err)
      }
    }

    fetchTherapists()
  }, [])

  // Generar reporte
  const handleGenerateReport = async () => {
    if (!therapistId || !selectedMonth) {
      setError('Debes seleccionar un terapeuta y un mes')
      return
    }

    setLoading(true)
    setError('')
    setStats(null)

    try {
      // Calcular primer y último día del mes
      const [year, month] = selectedMonth.split('-')
      const firstDay = `${year}-${month}-01`
      const lastDay = new Date(parseInt(year), parseInt(month), 0).getDate()
      const lastDayFormatted = `${year}-${month}-${String(lastDay).padStart(2, '0')}`

      const params = new URLSearchParams({
        therapist_id: therapistId,
        fecha_desde: firstDay,
        fecha_hasta: lastDayFormatted
      })

      const response = await fetch(`/api/attendance/stats?${params}`)
      
      if (!response.ok) {
        throw new Error('Error al generar el reporte')
      }

      const data = await response.json()
      setStats(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido')
    } finally {
      setLoading(false)
    }
  }

  // Formatear nombre del mes
  const formatMonth = (monthStr: string) => {
    if (!monthStr) return ''
    const [year, month] = monthStr.split('-')
    const date = new Date(parseInt(year), parseInt(month) - 1)
    return date.toLocaleDateString('es-CO', { month: 'long', year: 'numeric' })
  }

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-900 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <Link
            href="/home"
            className="inline-flex items-center text-sm text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 mb-4"
          >
            ← Volver al menú
          </Link>
          <h1 className="text-3xl font-bold text-zinc-900 dark:text-white">
            Comparación Sistema vs GPS
          </h1>
          <p className="text-zinc-600 dark:text-zinc-400 mt-2">
            Análisis mensual del cumplimiento de registros GPS
          </p>
        </div>

        {/* Filtros */}
        <div className="bg-white dark:bg-zinc-800 rounded-lg shadow-md p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Filtro de mes */}
            <div>
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                Mes
              </label>
              <input
                type="month"
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="w-full px-4 py-2 border border-zinc-300 dark:border-zinc-600 rounded-lg bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              />
            </div>

            {/* Filtro de terapeuta */}
            <div>
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                Terapeuta
              </label>
              <select
                value={therapistId}
                onChange={(e) => setTherapistId(e.target.value)}
                className="w-full px-4 py-2 border border-zinc-300 dark:border-zinc-600 rounded-lg bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              >
                <option value="">Seleccionar terapeuta</option>
                {therapists.map(t => (
                  <option key={t.id} value={t.id}>
                    {t.nombre} {t.apellido}
                  </option>
                ))}
              </select>
            </div>

            {/* Botón generar */}
            <div className="flex items-end">
              <button
                onClick={handleGenerateReport}
                disabled={loading || !therapistId || !selectedMonth}
                className="w-full px-6 py-2 bg-emerald-600 text-white rounded-lg font-semibold hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {loading ? 'Generando...' : 'Generar Reporte'}
              </button>
            </div>
          </div>

          {error && (
            <div className="mt-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
              <p className="text-red-800 dark:text-red-200">{error}</p>
            </div>
          )}
        </div>

        {/* Loading */}
        {loading && (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-emerald-500 border-t-transparent"></div>
            <p className="text-zinc-600 dark:text-zinc-400 mt-4">Generando reporte...</p>
          </div>
        )}

        {/* Resultados */}
        {!loading && stats && (
          <div className="space-y-6">
            {/* Título del reporte */}
            <div className="bg-gradient-to-r from-emerald-500 to-emerald-600 rounded-lg shadow-md p-6 text-white">
              <h2 className="text-2xl font-bold">
                Reporte de {formatMonth(selectedMonth)}
              </h2>
              <p className="text-emerald-100 mt-1">
                {therapists.find(t => t.id === therapistId)?.nombre} {therapists.find(t => t.id === therapistId)?.apellido}
              </p>
            </div>

            {/* Resumen General */}
            <div className="bg-white dark:bg-zinc-800 rounded-lg shadow-md p-6">
              <h3 className="text-xl font-bold text-zinc-900 dark:text-white mb-4">
                📊 RESUMEN DEL MES
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Columna 1: Métricas principales */}
                <div className="space-y-3">
                  <div className="flex justify-between items-center p-3 bg-zinc-50 dark:bg-zinc-700 rounded-lg">
                    <span className="text-zinc-700 dark:text-zinc-300">Total de citas:</span>
                    <span className="text-xl font-bold text-zinc-900 dark:text-white">{stats.total_citas}</span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                    <span className="text-green-700 dark:text-green-300">Registros completos:</span>
                    <span className="text-xl font-bold text-green-600 dark:text-green-400">
                      {stats.registros_completos} ({stats.porcentaje_cumplimiento}%)
                    </span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
                    <span className="text-yellow-700 dark:text-yellow-300">Solo llegada:</span>
                    <span className="text-xl font-bold text-yellow-600 dark:text-yellow-400">{stats.solo_llegada}</span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
                    <span className="text-red-700 dark:text-red-300">Sin registro:</span>
                    <span className="text-xl font-bold text-red-600 dark:text-red-400">{stats.sin_registro}</span>
                  </div>
                </div>

                {/* Columna 2: Gráfico visual de porcentaje */}
                <div className="flex flex-col justify-center">
                  <div className="text-center mb-4">
                    <div className="text-6xl font-bold text-emerald-600 dark:text-emerald-400">
                      {stats.porcentaje_cumplimiento}%
                    </div>
                    <div className="text-sm text-zinc-600 dark:text-zinc-400 mt-2">
                      Cumplimiento GPS
                    </div>
                  </div>
                  <div className="w-full bg-zinc-200 dark:bg-zinc-700 rounded-full h-4">
                    <div
                      className="bg-emerald-600 h-4 rounded-full transition-all duration-500"
                      style={{ width: `${stats.porcentaje_cumplimiento}%` }}
                    ></div>
                  </div>
                </div>
              </div>

              {/* Alerta de inconsistencias */}
              {(stats.solo_llegada > 0 || stats.sin_registro > 0) && (
                <div className="mt-6 p-4 bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-lg">
                  <p className="text-orange-800 dark:text-orange-200 font-semibold">
                    🚨 INCONSISTENCIAS DETECTADAS:
                  </p>
                  <p className="text-orange-700 dark:text-orange-300 mt-2">
                    {stats.solo_llegada + stats.sin_registro} cita(s) sin registro GPS completo
                  </p>
                </div>
              )}
            </div>

            {/* Análisis de Dispositivos */}
            <div className="bg-white dark:bg-zinc-800 rounded-lg shadow-md p-6">
              <h3 className="text-xl font-bold text-zinc-900 dark:text-white mb-4">
                📱 ANÁLISIS DE DISPOSITIVOS
              </h3>

              <div className="space-y-4">
                {/* Dispositivo principal */}
                <div className="p-4 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg">
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="text-sm text-emerald-700 dark:text-emerald-300">Dispositivo principal:</p>
                      <p className="text-lg font-bold text-emerald-900 dark:text-emerald-100 mt-1">
                        {stats.dispositivos.principal}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                        {stats.dispositivos.usos_dispositivo_principal}
                      </p>
                      <p className="text-xs text-emerald-600 dark:text-emerald-400">usos</p>
                    </div>
                  </div>
                </div>

                {/* Dispositivos diferentes */}
                {stats.dispositivos.dispositivos_diferentes.length > 0 && (
                  <div>
                    <p className="text-sm font-semibold text-red-700 dark:text-red-300 mb-3">
                      🚨 DISPOSITIVOS DIFERENTES DETECTADOS:
                    </p>
                    <div className="space-y-2">
                      {stats.dispositivos.dispositivos_diferentes.map((device, index) => (
                        <div
                          key={index}
                          className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg"
                        >
                          <div className="flex justify-between items-start">
                            <div className="flex-1">
                              <p className="font-semibold text-red-900 dark:text-red-100">{device.modelo}</p>
                              <p className="text-xs text-red-700 dark:text-red-300 mt-1">
                                Usado {device.usos} {device.usos === 1 ? 'vez' : 'veces'}
                              </p>
                              <p className="text-xs text-red-600 dark:text-red-400 mt-1">
                                Fechas: {device.fechas.slice(0, 3).join(', ')}
                                {device.fechas.length > 3 && ` +${device.fechas.length - 3} más`}
                              </p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {stats.dispositivos.dispositivos_diferentes.length === 0 && (
                  <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                    <p className="text-green-700 dark:text-green-300">
                      ✓ No se detectaron dispositivos diferentes. Uso consistente del mismo dispositivo.
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Análisis de Puntualidad */}
            {stats.puntualidad.total_analizadas > 0 && (
              <div className="bg-white dark:bg-zinc-800 rounded-lg shadow-md p-6">
                <h3 className="text-xl font-bold text-zinc-900 dark:text-white mb-4">
                  ⏱️ ANÁLISIS DE PUNTUALIDAD
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="p-4 bg-zinc-50 dark:bg-zinc-700 rounded-lg text-center">
                    <p className="text-3xl font-bold text-zinc-900 dark:text-white">
                      {stats.puntualidad.promedio_minutos_tarde}
                    </p>
                    <p className="text-sm text-zinc-600 dark:text-zinc-400 mt-2">
                      Minutos de retraso promedio
                    </p>
                  </div>
                  <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-lg text-center">
                    <p className="text-3xl font-bold text-red-600 dark:text-red-400">
                      {stats.puntualidad.llegadas_tarde}
                    </p>
                    <p className="text-sm text-red-700 dark:text-red-300 mt-2">
                      Llegadas tarde
                    </p>
                  </div>
                  <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg text-center">
                    <p className="text-3xl font-bold text-green-600 dark:text-green-400">
                      {stats.puntualidad.llegadas_puntuales}
                    </p>
                    <p className="text-sm text-green-700 dark:text-green-300 mt-2">
                      Llegadas puntuales
                    </p>
                  </div>
                </div>

                <p className="text-sm text-zinc-600 dark:text-zinc-400 mt-4 text-center">
                  De {stats.puntualidad.total_analizadas} citas con información de puntualidad
                </p>
              </div>
            )}
          </div>
        )}

        {/* Estado inicial */}
        {!loading && !stats && !error && (
          <div className="bg-white dark:bg-zinc-800 rounded-lg shadow-md p-12 text-center">
            <p className="text-zinc-600 dark:text-zinc-400 text-lg">
              Selecciona un terapeuta y un mes, luego haz clic en "Generar Reporte"
            </p>
          </div>
        )}
      </div>
    </div>
  )
}