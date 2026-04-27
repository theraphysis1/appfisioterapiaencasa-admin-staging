'use client'

import Link from 'next/link'
import { useIngresos } from './hooks/useIngresos'

const MESES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
]

const ANIOS = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i)

function formatCOP(valor: number) {
  return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(valor)
}

export default function IngresosPage() {
  const {
    mes, setMes,
    anio, setAnio,
    ingresos,
    total,
    totalTerapias,
    terapeutas,
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
  } = useIngresos()

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
              Registro de Ingresos
            </h1>
            <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
              Pagos recibidos en Bancolombia
            </p>
          </div>
          <button
            onClick={handleNuevo}
            className="rounded-lg bg-emerald-700 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-800 transition-colors"
          >
            + Nuevo Ingreso
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
              {editandoId ? 'Editar Ingreso' : 'Nuevo Ingreso'}
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                  Fecha <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  value={form.fecha}
                  onChange={e => setForm(f => ({ ...f, fecha: e.target.value }))}
                  className="w-full rounded-md border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-700 text-zinc-800 dark:text-zinc-100 px-3 py-2 text-sm"
                />
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
                  placeholder="Ej: 850000"
                  className="w-full rounded-md border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-700 text-zinc-800 dark:text-zinc-100 px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                  Cantidad de Terapias <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  min="1"
                  value={form.cantidad_terapias}
                  onChange={e => setForm(f => ({ ...f, cantidad_terapias: e.target.value }))}
                  placeholder="Ej: 5"
                  className="w-full rounded-md border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-700 text-zinc-800 dark:text-zinc-100 px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                  Terapeuta <span className="text-red-500">*</span>
                </label>
                <select
                  value={form.therapist_id}
                  onChange={e => setForm(f => ({ ...f, therapist_id: e.target.value }))}
                  className="w-full rounded-md border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-700 text-zinc-800 dark:text-zinc-100 px-3 py-2 text-sm"
                >
                  <option value="">Seleccionar terapeuta...</option>
                  {terapeutas.map(t => (
                    <option key={t.id} value={t.id}>
                      {t.nombre} {t.apellido}
                    </option>
                  ))}
                </select>
              </div>
              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                  Observación
                </label>
                <input
                  type="text"
                  value={form.observacion}
                  onChange={e => setForm(f => ({ ...f, observacion: e.target.value }))}
                  placeholder="Ej: Paquete 5 sesiones - Juan Pérez"
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

        {/* Resumen del mes */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          <div className="bg-white dark:bg-zinc-800 rounded-lg shadow-sm p-4 text-center">
            <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
              {formatCOP(total)}
            </div>
            <div className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
              💰 Total Bancolombia
            </div>
          </div>
          <div className="bg-white dark:bg-zinc-800 rounded-lg shadow-sm p-4 text-center">
            <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
              {totalTerapias}
            </div>
            <div className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
              🩺 Total Terapias
            </div>
          </div>
          <div className="bg-white dark:bg-zinc-800 rounded-lg shadow-sm p-4 text-center">
            <div className="text-2xl font-bold text-zinc-700 dark:text-zinc-300">
              {ingresos.length}
            </div>
            <div className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
              📋 Registros
            </div>
          </div>
        </div>

        {/* Tabla de ingresos */}
        <div className="bg-white dark:bg-zinc-800 rounded-lg shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-zinc-200 dark:border-zinc-700">
            <h2 className="text-base font-semibold text-zinc-800 dark:text-zinc-100">
              {MESES[mes - 1]} {anio}
            </h2>
          </div>

          {loading ? (
            <div className="px-6 py-12 text-center text-zinc-500 dark:text-zinc-400">
              Cargando ingresos...
            </div>
          ) : ingresos.length === 0 ? (
            <div className="px-6 py-12 text-center text-zinc-500 dark:text-zinc-400">
              No hay ingresos registrados para {MESES[mes - 1]} {anio}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-zinc-50 dark:bg-zinc-700/50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase">Fecha</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase">Terapeuta</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase">Terapias</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase">Monto</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase">Observación</th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100 dark:divide-zinc-700">
                  {ingresos.map(ingreso => {
                    const [year, month, day] = ingreso.fecha.split('-').map(Number)
                    const fechaDisplay = new Date(year, month - 1, day).toLocaleDateString('es-CO', {
                      day: '2-digit', month: 'short', year: 'numeric'
                    })
                    return (
                      <tr key={ingreso.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-700/30">
                        <td className="px-4 py-3 text-zinc-700 dark:text-zinc-300 whitespace-nowrap">
                          {fechaDisplay}
                        </td>
                        <td className="px-4 py-3 text-zinc-700 dark:text-zinc-300">
                          {ingreso.therapists?.nombre} {ingreso.therapists?.apellido}
                        </td>
                        <td className="px-4 py-3 text-right text-zinc-700 dark:text-zinc-300">
                          {ingreso.cantidad_terapias}
                        </td>
                        <td className="px-4 py-3 text-right font-semibold text-emerald-600 dark:text-emerald-400">
                          {formatCOP(ingreso.monto)}
                        </td>
                        <td className="px-4 py-3 text-zinc-500 dark:text-zinc-400 max-w-xs truncate">
                          {ingreso.observacion || '-'}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <div className="flex items-center justify-center gap-2">
                            <button
                              onClick={() => handleEditar(ingreso)}
                              className="text-xs px-3 py-1 rounded bg-zinc-100 dark:bg-zinc-700 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-600 transition-colors"
                            >
                              Editar
                            </button>
                            <button
                              onClick={() => handleEliminar(ingreso.id)}
                              disabled={eliminando === ingreso.id}
                              className="text-xs px-3 py-1 rounded bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/50 disabled:opacity-50 transition-colors"
                            >
                              {eliminando === ingreso.id ? '...' : 'Eliminar'}
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
                <tfoot className="bg-zinc-50 dark:bg-zinc-700/50">
                  <tr>
                    <td colSpan={2} className="px-4 py-3 text-sm font-semibold text-zinc-700 dark:text-zinc-300">
                      Total
                    </td>
                    <td className="px-4 py-3 text-right text-sm font-semibold text-zinc-700 dark:text-zinc-300">
                      {totalTerapias}
                    </td>
                    <td className="px-4 py-3 text-right text-sm font-bold text-emerald-600 dark:text-emerald-400">
                      {formatCOP(total)}
                    </td>
                    <td colSpan={2}></td>
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