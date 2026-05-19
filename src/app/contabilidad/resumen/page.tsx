// src/app/contabilidad/resumen/page.tsx

'use client'

import Link from 'next/link'
import { useResumen } from './hooks/useResumen'

const MESES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
]

const ANIO_ACTUAL = new Date().getFullYear()
const ANIOS = Array.from({ length: 7 }, (_, i) => ANIO_ACTUAL + 2 - i)

function formatCOP(valor: number) {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0
  }).format(valor)
}

function FilaResumen({
  label,
  valor,
  descripcion,
  colorValor = 'text-zinc-800 dark:text-zinc-100',
  esTotal = false,
  esSuma = false,
  esResta = false
}: {
  label: string
  valor: number
  descripcion?: string
  colorValor?: string
  esTotal?: boolean
  esSuma?: boolean
  esResta?: boolean
}) {
  return (
    <div className={`flex items-center justify-between py-3 px-4 rounded-lg ${esTotal ? 'bg-zinc-100 dark:bg-zinc-700/50' : ''}`}>
      <div>
        <div className={`text-sm font-medium text-zinc-700 dark:text-zinc-300 ${esTotal ? 'font-semibold' : ''}`}>
          {esSuma && <span className="text-emerald-500 mr-1">+</span>}
          {esResta && <span className="text-red-400 mr-1">−</span>}
          {label}
        </div>
        {descripcion && (
          <div className="text-xs text-zinc-400 dark:text-zinc-500 mt-0.5">{descripcion}</div>
        )}
      </div>
      <div className={`text-base font-semibold ${colorValor} ${esTotal ? 'text-lg' : ''}`}>
        {formatCOP(valor)}
      </div>
    </div>
  )
}

export default function ResumenPage() {
  const {
    mes, setMes,
    anio, setAnio,
    resumen,
    loading,
    guardando,
    error,
    exito,
    handleGuardarResumen
  } = useResumen()

  const c = resumen?.calculado

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-900 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">

        {/* Encabezado */}
        <div className="mb-8">
          <Link href="/home" className="text-sm text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 mb-2 inline-block">
            ← Volver al inicio
          </Link>
          <h1 className="text-2xl font-bold text-zinc-800 dark:text-zinc-100">
            Resumen Financiero
          </h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
            Cálculo completo de ingresos, nómina, gastos y utilidad del mes
          </p>
        </div>

        {/* Selector de mes y año */}
        <div className="bg-white dark:bg-zinc-800 rounded-lg shadow-sm p-4 mb-6 flex flex-wrap gap-4 items-center">
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Mes:</label>
            <select
              value={mes}
              onChange={e => setMes(Number(e.target.value))}
              className="rounded-md border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-700 text-zinc-800 dark:text-zinc-100 px-3 py-1.5 text-sm"
            >
              {MESES.map((nombre, i) => (
                <option key={i + 1} value={i + 1}>{nombre}</option>
              ))}
            </select>
          </div>
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Año:</label>
            <select
              value={anio}
              onChange={e => setAnio(Number(e.target.value))}
              className="rounded-md border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-700 text-zinc-800 dark:text-zinc-100 px-3 py-1.5 text-sm"
            >
              {ANIOS.map(a => (
                <option key={a} value={a}>{a}</option>
              ))}
            </select>
          </div>

          {/* Badge de estado */}
          {!loading && resumen && (
            <div className="ml-auto">
              {resumen.ya_guardado ? (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 dark:bg-emerald-900/30 px-3 py-1 text-xs font-medium text-emerald-700 dark:text-emerald-400">
                  ✅ Guardado
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-100 dark:bg-amber-900/30 px-3 py-1 text-xs font-medium text-amber-700 dark:text-amber-400">
                  ⚠️ Sin guardar
                </span>
              )}
            </div>
          )}
        </div>

        {/* Mensajes */}
        {error && (
          <div className="mb-4 rounded-lg bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 px-4 py-3 text-sm text-red-700 dark:text-red-400">
            {error}
          </div>
        )}
        {exito && (
          <div className="mb-4 rounded-lg bg-emerald-50 dark:bg-emerald-900/30 border border-emerald-200 dark:border-emerald-800 px-4 py-3 text-sm text-emerald-700 dark:text-emerald-400">
            {exito}
          </div>
        )}

        {loading ? (
          <div className="text-center py-16 text-zinc-500 dark:text-zinc-400">
            Calculando resumen financiero...
          </div>
        ) : !c ? (
          <div className="text-center py-16 text-zinc-500 dark:text-zinc-400">
            No se pudo cargar el resumen
          </div>
        ) : (
          <div className="space-y-6">

            {/* BLOQUE 1: Disponible */}
            <div className="bg-white dark:bg-zinc-800 rounded-lg shadow-sm overflow-hidden">
              <div className="px-4 py-3 border-b border-zinc-100 dark:border-zinc-700">
                <h2 className="text-sm font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wide">
                  💰 Total Disponible
                </h2>
              </div>
              <div className="p-2 space-y-1">
                <FilaResumen
                  label="Ingresos Bancolombia"
                  valor={c.ingresos_bancolombia}
                  descripcion="Suma de pagos registrados en el mes"
                  esSuma
                />
                <FilaResumen
                  label="Guardado mes anterior"
                  valor={c.guardado_mes_anterior}
                  descripcion="Dinero reservado del mes previo"
                  esSuma
                />
                <div className="border-t border-zinc-100 dark:border-zinc-700 mt-1 pt-1">
                  <FilaResumen
                    label="Total Disponible"
                    valor={c.total_disponible}
                    colorValor="text-emerald-600 dark:text-emerald-400"
                    esTotal
                  />
                </div>
              </div>
            </div>

            {/* BLOQUE 2: Egresos */}
            <div className="bg-white dark:bg-zinc-800 rounded-lg shadow-sm overflow-hidden">
              <div className="px-4 py-3 border-b border-zinc-100 dark:border-zinc-700">
                <h2 className="text-sm font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wide">
                  📤 Egresos del Mes
                </h2>
              </div>
              <div className="p-2 space-y-1">
                <FilaResumen
                  label="Nómina terapeutas"
                  valor={c.nomina_total}
                  descripcion="Subsidio + comisiones de sesiones completadas"
                  esResta
                />
                <FilaResumen
                  label="Gastos de la empresa"
                  valor={c.gastos_total}
                  descripcion="Operativos, publicidad, nómina oficina, etc."
                  esResta
                />
                <FilaResumen
                  label="Dinero a guardar"
                  valor={c.dinero_a_guardar}
                  descripcion="Comisiones de sesiones aún agendadas (no realizadas)"
                  esResta
                />
                <div className="border-t border-zinc-100 dark:border-zinc-700 mt-1 pt-1">
                  <FilaResumen
                    label="Total Egresos"
                    valor={c.nomina_total + c.gastos_total + c.dinero_a_guardar}
                    colorValor="text-red-600 dark:text-red-400"
                    esTotal
                  />
                </div>
              </div>
            </div>

            {/* BLOQUE 3: Resultado */}
            <div className="bg-white dark:bg-zinc-800 rounded-lg shadow-sm overflow-hidden">
              <div className="px-4 py-3 border-b border-zinc-100 dark:border-zinc-700">
                <h2 className="text-sm font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wide">
                  📊 Resultado del Mes
                </h2>
              </div>
              <div className="p-2 space-y-1">
                <FilaResumen
                  label="Utilidad del mes"
                  valor={c.utilidad}
                  descripcion="Total disponible − nómina − gastos − dinero a guardar"
                  colorValor={c.utilidad >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}
                  esTotal
                />
                <FilaResumen
                  label="Acumulado histórico"
                  valor={c.acumulado_historico}
                  descripcion="Suma de utilidades de todos los meses hasta este"
                  colorValor={c.acumulado_historico >= 0 ? 'text-blue-600 dark:text-blue-400' : 'text-red-600 dark:text-red-400'}
                  esTotal
                />
              </div>
            </div>

            {/* Info de última actualización */}
            {resumen.ya_guardado && resumen.guardado && (
              <p className="text-xs text-zinc-400 dark:text-zinc-500 text-center">
                Última vez guardado:{' '}
                {new Date(resumen.guardado.updated_at).toLocaleDateString('es-CO', {
                  day: '2-digit', month: 'long', year: 'numeric',
                  hour: '2-digit', minute: '2-digit'
                })}
              </p>
            )}

            {/* Botón guardar */}
            <button
              onClick={handleGuardarResumen}
              disabled={guardando}
              className="w-full rounded-lg bg-emerald-700 px-6 py-4 text-base font-semibold text-white shadow-md transition-all hover:bg-emerald-800 hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {guardando
                ? 'Guardando...'
                : resumen.ya_guardado
                  ? '🔄 Actualizar Resumen Guardado'
                  : '💾 Guardar Resumen del Mes'}
            </button>

            {/* Links rápidos */}
            <div className="grid grid-cols-3 gap-3 pt-2">
              <Link
                href="/contabilidad/ingresos"
                className="text-center rounded-lg border border-zinc-200 dark:border-zinc-700 px-3 py-2.5 text-sm font-medium text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
              >
                💵 Ingresos
              </Link>
              <Link
                href="/contabilidad/nomina"
                className="text-center rounded-lg border border-zinc-200 dark:border-zinc-700 px-3 py-2.5 text-sm font-medium text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
              >
                👥 Nómina
              </Link>
              <Link
                href="/contabilidad/gastos"
                className="text-center rounded-lg border border-zinc-200 dark:border-zinc-700 px-3 py-2.5 text-sm font-medium text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
              >
                📋 Gastos
              </Link>
            </div>

          </div>
        )}
      </div>
    </div>
  )
}