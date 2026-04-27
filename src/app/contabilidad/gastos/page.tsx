'use client'

import Link from 'next/link'
import { useGastos, LABELS_GASTO, TIPOS_GASTO } from './hooks/useGastos'

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

export default function GastosPage() {
  const {
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
  } = useGastos()

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-900 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-5xl mx-auto">

        {/* Encabezado */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <Link href="/home" className="text-sm text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 mb-2 inline-block">
              ← Volver al inicio
            </Link>
            <h1 className="text-2xl font-bold text-zinc-800 dark:text-zinc-100">
              Gastos de la Empresa
            </h1>
            <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
              Registro de gastos operativos del mes
            </p>
          </div>
          <button
            onClick={handleNuevo}
            className="rounded-lg bg-emerald-700 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-800 transition-colors"
          >
            + Nuevo Gasto
          </button>
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

        {/* Formulario */}
        {mostrarFormulario && (
          <div className="bg-white dark:bg-zinc-800 rounded-lg shadow-sm p-6 mb-6 border-l-4 border-emerald-500">
            <h2 className="text-lg font-semibold text-zinc-800 dark:text-zinc-100 mb-4">
              {editandoId ? 'Editar Gasto' : 'Nuevo Gasto'}
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                  Tipo de Gasto <span className="text-red-500">*</span>
                </label>
                <select
                  value={form.tipo}
                  onChange={e => setForm(f => ({ ...f, tipo: e.target.value }))}
                  className="w-full rounded-md border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-700 text-zinc-800 dark:text-zinc-100 px-3 py-2 text-sm"
                >
                  <option value="">Seleccionar tipo...</option>
                  {TIPOS_GASTO.map(tipo => (
                    <option key={tipo} value={tipo}>
                      {LABELS_GASTO[tipo]}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                  Monto ($) <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  min="0"
                  value={form.monto}
                  onChange={e => setForm(f => ({ ...f, monto: e.target.value }))}
                  placeholder="Ej: 53000"
                  className="w-full rounded-md border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-700 text-zinc-800 dark:text-zinc-100 px-3 py-2 text-sm"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                  Descripción {form.tipo === 'varios' && <span className="text-red-500">*</span>}
                </label>
                <input
                  type="text"
                  value={form.descripcion}
                  onChange={e => setForm(f => ({ ...f, descripcion: e.target.value }))}
                  placeholder={form.tipo === 'varios' ? 'Ej: Pago Guantes' : 'Opcional'}
                  className="w-full rounded-md border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-700 text-zinc-800 dark:text-zinc-100 px-3 py-2 text-sm"
                />
              </div>
            </div>
            <div className="flex gap-3 mt-4">
              <button
                onClick={handleSubmit}
                disabled={guardando}
                className="rounded-lg bg-emerald-700 px-5 py-2 text-sm font-semibold text-white hover:bg-emerald-800 disabled:opacity-50 transition-colors"
              >
                {guardando ? 'Guardando...' : editandoId ? 'Actualizar' : 'Guardar'}
              </button>
              <button
                onClick={handleCancelar}
                className="rounded-lg bg-zinc-200 dark:bg-zinc-700 px-5 py-2 text-sm font-semibold text-zinc-700 dark:text-zinc-300 hover:bg-zinc-300 dark:hover:bg-zinc-600 transition-colors"
              >
                Cancelar
              </button>
            </div>
          </div>
        )}

        {/* Resumen por tipo */}
        {Object.keys(porTipo).length > 0 && (
          <div className="bg-white dark:bg-zinc-800 rounded-lg shadow-sm p-6 mb-6">
            <h2 className="text-base font-semibold text-zinc-800 dark:text-zinc-100 mb-4">
              Resumen por Categoría
            </h2>
            <div className="space-y-2">
              {Object.entries(porTipo).map(([tipo, monto]) => (
                <div key={tipo} className="flex items-center justify-between py-1.5 border-b border-zinc-100 dark:border-zinc-700 last:border-0">
                  <span className="text-sm text-zinc-600 dark:text-zinc-400">
                    {LABELS_GASTO[tipo] || tipo}
                  </span>
                  <span className="text-sm font-semibold text-red-600 dark:text-red-400">
                    {formatCOP(monto)}
                  </span>
                </div>
              ))}
              <div className="flex items-center justify-between py-2 mt-2">
                <span className="text-sm font-bold text-zinc-800 dark:text-zinc-100">
                  Total Gastos
                </span>
                <span className="text-base font-bold text-red-600 dark:text-red-400">
                  {formatCOP(total)}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Total card */}
        <div className="bg-white dark:bg-zinc-800 rounded-lg shadow-sm p-4 mb-6 text-center">
          <div className="text-2xl font-bold text-red-600 dark:text-red-400">
            {formatCOP(total)}
          </div>
          <div className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
            💸 Total Gastos {MESES[mes - 1]} {anio}
          </div>
        </div>

        {/* Tabla de gastos */}
        <div className="bg-white dark:bg-zinc-800 rounded-lg shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-zinc-200 dark:border-zinc-700">
            <h2 className="text-base font-semibold text-zinc-800 dark:text-zinc-100">
              Detalle de Gastos — {MESES[mes - 1]} {anio}
            </h2>
          </div>

          {loading ? (
            <div className="px-6 py-12 text-center text-zinc-500 dark:text-zinc-400">
              Cargando gastos...
            </div>
          ) : gastos.length === 0 ? (
            <div className="px-6 py-12 text-center text-zinc-500 dark:text-zinc-400">
              No hay gastos registrados para {MESES[mes - 1]} {anio}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-zinc-50 dark:bg-zinc-700/50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase">Tipo</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase">Descripción</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase">Monto</th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100 dark:divide-zinc-700">
                  {gastos.map(gasto => (
                    <tr key={gasto.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-700/30">
                      <td className="px-4 py-3 text-zinc-700 dark:text-zinc-300">
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-zinc-100 dark:bg-zinc-700 text-zinc-700 dark:text-zinc-300">
                          {LABELS_GASTO[gasto.tipo] || gasto.tipo}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-zinc-500 dark:text-zinc-400">
                        {gasto.descripcion || '-'}
                      </td>
                      <td className="px-4 py-3 text-right font-semibold text-red-600 dark:text-red-400">
                        {formatCOP(gasto.monto)}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => handleEditar(gasto)}
                            className="text-xs px-3 py-1 rounded bg-zinc-100 dark:bg-zinc-700 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-600 transition-colors"
                          >
                            Editar
                          </button>
                          <button
                            onClick={() => handleEliminar(gasto.id)}
                            disabled={eliminando === gasto.id}
                            className="text-xs px-3 py-1 rounded bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/50 disabled:opacity-50 transition-colors"
                          >
                            {eliminando === gasto.id ? '...' : 'Eliminar'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-zinc-50 dark:bg-zinc-700/50">
                  <tr>
                    <td colSpan={2} className="px-4 py-3 text-sm font-semibold text-zinc-700 dark:text-zinc-300">
                      Total
                    </td>
                    <td className="px-4 py-3 text-right text-sm font-bold text-red-600 dark:text-red-400">
                      {formatCOP(total)}
                    </td>
                    <td></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}