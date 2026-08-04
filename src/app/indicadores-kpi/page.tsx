'use client'

import Link from 'next/link'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts'
import {
  useIndicadoresKPI,
  CATEGORIAS_TERAPIA,
  CATEGORIA_LABELS,
  CATEGORIA_COLORS,
  PAQUETE_COLORS
} from './hooks/useIndicadoresKPI'

const MESES_CORTOS = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']

function formatMesLabel(mes: unknown): string {
  // mes viene como "YYYY-MM"; recharts tipa esto como ReactNode, por eso el unknown + guard
  if (typeof mes !== 'string') return ''
  const [year, month] = mes.split('-')
  const monthIndex = parseInt(month, 10) - 1
  return `${MESES_CORTOS[monthIndex]} ${year}`
}

export default function IndicadoresKPIPage() {
  const {
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
  } = useIndicadoresKPI()

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-900 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <Link
            href="/home"
            className="inline-flex items-center text-slate-600 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300 mb-4"
          >
            ← Volver al inicio
          </Link>
          <h1 className="text-3xl font-bold text-zinc-900 dark:text-zinc-50 mb-2">
            📊 Indicadores KPI
          </h1>
          <p className="text-zinc-600 dark:text-zinc-400">
            Ventas por tipo de terapia y por tamaño de paquete, mes a mes
          </p>
        </div>

        {/* Selector de periodo */}
        <div className="bg-white dark:bg-zinc-800 rounded-lg shadow-md p-6 mb-8">
          <h2 className="text-sm font-semibold text-zinc-700 dark:text-zinc-300 mb-4">
            Periodo
          </h2>
          <div className="flex flex-col sm:flex-row items-end gap-4">
            <div className="flex-1 w-full">
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                Desde
              </label>
              <input
                type="date"
                value={draftDesde}
                onChange={(e) => setDraftDesde(e.target.value)}
                className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-600 rounded-lg bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-50 focus:ring-2 focus:ring-slate-500 focus:border-transparent"
              />
            </div>
            <div className="flex-1 w-full">
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                Hasta
              </label>
              <input
                type="date"
                value={draftHasta}
                onChange={(e) => setDraftHasta(e.target.value)}
                className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-600 rounded-lg bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-50 focus:ring-2 focus:ring-slate-500 focus:border-transparent"
              />
            </div>
            <button
              onClick={aplicarRango}
              className="w-full sm:w-auto px-6 py-2 bg-slate-600 text-white rounded-lg hover:bg-slate-700 transition-colors font-medium"
            >
              Aplicar
            </button>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 mb-8 text-red-800 dark:text-red-200">
            {error}
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-24">
            <div className="text-center">
              <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-slate-600 border-r-transparent"></div>
              <p className="mt-4 text-zinc-600 dark:text-zinc-400">Cargando indicadores...</p>
            </div>
          </div>
        ) : (
          <div className="space-y-8">
            {/* Gráfico 1: Tipo de terapia por mes */}
            <div className="bg-white dark:bg-zinc-800 rounded-lg shadow-md p-6">
              <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50 mb-4">
                Tipo de Terapia por Mes
              </h2>
              {tipoTerapiaChartData.length === 0 ? (
                <p className="text-center py-12 text-zinc-500 dark:text-zinc-400">
                  No hay datos en el periodo seleccionado
                </p>
              ) : (
                <ResponsiveContainer width="100%" height={350}>
                  <BarChart data={tipoTerapiaChartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis dataKey="mes" tickFormatter={formatMesLabel} />
                    <YAxis allowDecimals={false} />
                    <Tooltip labelFormatter={formatMesLabel} />
                    <Legend formatter={(value) => CATEGORIA_LABELS[value] || value} />
                    <Legend />
                    {CATEGORIAS_TERAPIA.map((categoria) => (
                      <Bar
                        key={categoria}
                        dataKey={categoria}
                        name={CATEGORIA_LABELS[categoria]}
                        fill={CATEGORIA_COLORS[categoria]}
                      />
                    ))}
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>

            {/* Gráfico 2: Tamaño de paquete por mes */}
            <div className="bg-white dark:bg-zinc-800 rounded-lg shadow-md p-6">
              <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50 mb-4">
                Tamaño de Paquete por Mes
              </h2>
              {tamanoPaqueteChartData.length === 0 ? (
                <p className="text-center py-12 text-zinc-500 dark:text-zinc-400">
                  No hay datos en el periodo seleccionado
                </p>
              ) : (
                <ResponsiveContainer width="100%" height={350}>
                  <BarChart data={tamanoPaqueteChartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis dataKey="mes" tickFormatter={formatMesLabel} />
                    <YAxis allowDecimals={false} />
                    <Tooltip labelFormatter={formatMesLabel} />
                    <Legend />
                    {tamanosPresentes.map((tamano, index) => (
                      <Bar
                        key={tamano}
                        dataKey={`sesiones_${tamano}`}
                        name={`Paquete de ${tamano}`}
                        fill={PAQUETE_COLORS[index % PAQUETE_COLORS.length]}
                      />
                    ))}
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}