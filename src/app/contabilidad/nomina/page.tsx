'use client'

import Link from 'next/link'
import { useNomina } from './hooks/useNomina'

const MESES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
]

const ANIOS = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i)

function formatCOP(valor: number) {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0
  }).format(valor)
}

export default function NominaPage() {
  const {
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
  } = useNomina()

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-900 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-5xl mx-auto">

        {/* Encabezado */}
        <div className="mb-8">
          <Link href="/home" className="text-sm text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 mb-2 inline-block">
            ← Volver al inicio
          </Link>
          <h1 className="text-2xl font-bold text-zinc-800 dark:text-zinc-100">
            Nómina de Terapeutas
          </h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
            Subsidio de transporte y comisiones por sesiones realizadas
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

        {/* Resumen general */}
        {nomina && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
            <div className="bg-white dark:bg-zinc-800 rounded-lg shadow-sm p-4 text-center">
              <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                {formatCOP(nomina.total_nomina_general)}
              </div>
              <div className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
                💰 Total Nómina a Pagar
              </div>
            </div>
            <div className="bg-white dark:bg-zinc-800 rounded-lg shadow-sm p-4 text-center">
              <div className="text-2xl font-bold text-amber-600 dark:text-amber-400">
                {formatCOP(nomina.total_dinero_guardar)}
              </div>
              <div className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
                🔒 Total a Guardar Próximo Mes
              </div>
            </div>
          </div>
        )}

        {/* Cards por terapeuta */}
        {loading ? (
          <div className="text-center py-12 text-zinc-500 dark:text-zinc-400">
            Cargando nómina...
          </div>
        ) : !nomina || nomina.terapeutas.length === 0 ? (
          <div className="text-center py-12 text-zinc-500 dark:text-zinc-400">
            No hay terapeutas registrados
          </div>
        ) : (
          <div className="space-y-4">
            {nomina.terapeutas.map(terapeuta => (
              <div
                key={terapeuta.therapist_id}
                className="bg-white dark:bg-zinc-800 rounded-lg shadow-sm overflow-hidden"
              >
                {/* Cabecera del terapeuta */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-100 dark:border-zinc-700">
                  <div>
                    <h3 className="text-base font-semibold text-zinc-800 dark:text-zinc-100">
                      {terapeuta.nombre} {terapeuta.apellido}
                    </h3>
                    {!terapeuta.tiene_config && (
                      <span className="text-xs text-amber-600 dark:text-amber-400">
                        ⚠️ Sin configuración de subsidio
                      </span>
                    )}
                  </div>
                  <div className="text-right">
                    <div className="text-xl font-bold text-emerald-600 dark:text-emerald-400">
                      {formatCOP(terapeuta.total_nomina)}
                    </div>
                    <div className="text-xs text-zinc-500 dark:text-zinc-400">Total a pagar</div>
                  </div>
                </div>

                {/* Detalle */}
                <div className="px-6 py-4 grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <div className="text-center">
                    <div className="text-lg font-semibold text-zinc-700 dark:text-zinc-300">
                      {formatCOP(terapeuta.subsidio_a_pagar)}
                    </div>
                    <div className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                      🚌 Subsidio Transporte
                    </div>
                    {terapeuta.dias_descontados > 0 && (
                      <div className="text-xs text-red-500 mt-0.5">
                        -{terapeuta.dias_descontados} días
                      </div>
                    )}
                  </div>
                  <div className="text-center">
                    <div className="text-lg font-semibold text-zinc-700 dark:text-zinc-300">
                      {terapeuta.sesiones_completadas}
                    </div>
                    <div className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                      ✅ Sesiones Completadas
                    </div>
                    <div className="text-xs text-emerald-600 dark:text-emerald-400 mt-0.5">
                      {formatCOP(terapeuta.comision_completadas)}
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="text-lg font-semibold text-zinc-700 dark:text-zinc-300">
                      {terapeuta.sesiones_pendientes}
                    </div>
                    <div className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                      🔒 Sesiones Pendientes
                    </div>
                    <div className="text-xs text-amber-600 dark:text-amber-400 mt-0.5">
                      {formatCOP(terapeuta.comision_pendientes)}
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="text-lg font-semibold text-zinc-700 dark:text-zinc-300">
                      {formatCOP(terapeuta.subsidio_base)}
                    </div>
                    <div className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                      📋 Subsidio Base
                    </div>
                  </div>
                </div>

                {/* Formulario de configuración */}
                {editandoTerapeuta === terapeuta.therapist_id ? (
                  <div className="px-6 py-4 bg-zinc-50 dark:bg-zinc-700/30 border-t border-zinc-100 dark:border-zinc-700">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                      <div>
                        <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                          Subsidio Base ($) <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="number"
                          min="0"
                          value={form.subsidio_base}
                          onChange={e => setForm(f => ({ ...f, subsidio_base: e.target.value }))}
                          placeholder="Ej: 150000"
                          className="w-full rounded-md border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-700 text-zinc-800 dark:text-zinc-100 px-3 py-2 text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                          Días Descontados (0-30)
                        </label>
                        <input
                          type="number"
                          min="0"
                          max="30"
                          value={form.dias_descontados}
                          onChange={e => setForm(f => ({ ...f, dias_descontados: e.target.value }))}
                          placeholder="0"
                          className="w-full rounded-md border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-700 text-zinc-800 dark:text-zinc-100 px-3 py-2 text-sm"
                        />
                      </div>
                    </div>
                    <div className="flex gap-3">
                      <button
                        onClick={() => handleGuardarConfig(terapeuta.therapist_id)}
                        disabled={guardando}
                        className="rounded-lg bg-emerald-700 px-5 py-2 text-sm font-semibold text-white hover:bg-emerald-800 disabled:opacity-50 transition-colors"
                      >
                        {guardando ? 'Guardando...' : 'Guardar'}
                      </button>
                      <button
                        onClick={handleCancelarConfig}
                        className="rounded-lg bg-zinc-200 dark:bg-zinc-700 px-5 py-2 text-sm font-semibold text-zinc-700 dark:text-zinc-300 hover:bg-zinc-300 dark:hover:bg-zinc-600 transition-colors"
                      >
                        Cancelar
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="px-6 py-3 border-t border-zinc-100 dark:border-zinc-700">
                    <button
                      onClick={() => handleEditarConfig(terapeuta)}
                      className="text-sm text-emerald-700 dark:text-emerald-400 hover:underline"
                    >
                      ✏️ Configurar subsidio y días descontados
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}