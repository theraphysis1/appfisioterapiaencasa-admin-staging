'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

// Función auxiliar para formatear números en pesos colombianos
const formatCurrency = (value: number): string => {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value)
}

// Función auxiliar para parsear input de moneda
const parseCurrency = (value: string): number => {
  return parseInt(value.replace(/\D/g, '')) || 0
}

export default function CalculadoraCostosPage() {
  // Estados para gastos fijos
  const [gastoComercial, setGastoComercial] = useState(8000000)
  const [gastoAgencia, setGastoAgencia] = useState(5000000)
  const [gastoPublicidad, setGastoPublicidad] = useState(6000000)

  // Estados para precios
  const [precioValoracion, setPrecioValoracion] = useState(110000)
  const [precioPaquete5, setPrecioPaquete5] = useState(105000)
  const [precioPaquete10, setPrecioPaquete10] = useState(100000)

  // Estados para costos fisio
  const [pagoTerapia, setPagoTerapia] = useState(32000)
  const [subsidioTransporte, setSubsidioTransporte] = useState(250000)

  // Estados para distribución de sesiones
  const [totalSesiones, setTotalSesiones] = useState(106)
  const [sesionesValoracion, setSesionesValoracion] = useState(20)
  const [sesionesPaquete5, setSesionesPaquete5] = useState(40)
  const [sesionesPaquete10, setSesionesPaquete10] = useState(46)

  // Estado para número de fisios
  const [numeroFisios, setNumeroFisios] = useState(1)

  // Validación de distribución de sesiones
  const [errorDistribucion, setErrorDistribucion] = useState('')

  useEffect(() => {
    const suma = sesionesValoracion + sesionesPaquete5 + sesionesPaquete10
    if (suma !== totalSesiones) {
      setErrorDistribucion(`La suma debe ser ${totalSesiones} (actual: ${suma})`)
    } else {
      setErrorDistribucion('')
    }
  }, [sesionesValoracion, sesionesPaquete5, sesionesPaquete10, totalSesiones])

  // CÁLCULOS
  const totalGastosFijos = gastoComercial + gastoAgencia + gastoPublicidad

  // Sesiones totales (todos los fisios)
  const totalSesionesTodas = totalSesiones * numeroFisios
  const totalValoraciones = sesionesValoracion * numeroFisios
  const totalPaquete5 = sesionesPaquete5 * numeroFisios
  const totalPaquete10 = sesionesPaquete10 * numeroFisios

  // Ingresos totales
  const ingresosValoraciones = totalValoraciones * precioValoracion
  const ingresosPaquete5 = totalPaquete5 * precioPaquete5
  const ingresosPaquete10 = totalPaquete10 * precioPaquete10
  const ingresosTotalesMes = ingresosValoraciones + ingresosPaquete5 + ingresosPaquete10

  // Costos fisios totales
  const costoTerapiasTotales = totalSesionesTodas * pagoTerapia
  const costoSubsidiosTotales = numeroFisios * subsidioTransporte
  const costosFisiosTotales = costoTerapiasTotales + costoSubsidiosTotales

  // Ganancia por fisio
  const gananciaPorFisio = (totalSesiones * pagoTerapia) + subsidioTransporte

  // Utilidad empresa
  const utilidadEmpresaMes = ingresosTotalesMes - costosFisiosTotales - totalGastosFijos
  const utilidadEmpresaAnual = utilidadEmpresaMes * 12

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-900 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <Link
            href="/home"
            className="inline-flex items-center text-slate-600 hover:text-slate-700 mb-4"
          >
            <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" />
            </svg>
            Volver al inicio
          </Link>
          <h1 className="text-3xl font-bold text-zinc-800 dark:text-zinc-100">
            Calculadora de Costos
          </h1>
          <p className="text-zinc-600 dark:text-zinc-400 mt-2">
            Calcula la utilidad del negocio modificando los valores según tus necesidades
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* COLUMNA IZQUIERDA: INPUTS */}
          <div className="space-y-6">
            {/* Gastos Fijos */}
            <div className="bg-white dark:bg-zinc-800 rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold text-zinc-800 dark:text-zinc-100 mb-4">
                Gastos Fijos Mensuales
              </h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                    Comercial
                  </label>
                  <input
                    type="text"
                    value={formatCurrency(gastoComercial)}
                    onChange={(e) => setGastoComercial(parseCurrency(e.target.value))}
                    className="w-full px-4 py-2 border border-zinc-300 dark:border-zinc-600 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-transparent dark:bg-zinc-700 dark:text-zinc-100"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                    Agencia Marketing
                  </label>
                  <input
                    type="text"
                    value={formatCurrency(gastoAgencia)}
                    onChange={(e) => setGastoAgencia(parseCurrency(e.target.value))}
                    className="w-full px-4 py-2 border border-zinc-300 dark:border-zinc-600 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-transparent dark:bg-zinc-700 dark:text-zinc-100"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                    Publicidad
                  </label>
                  <input
                    type="text"
                    value={formatCurrency(gastoPublicidad)}
                    onChange={(e) => setGastoPublicidad(parseCurrency(e.target.value))}
                    className="w-full px-4 py-2 border border-zinc-300 dark:border-zinc-600 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-transparent dark:bg-zinc-700 dark:text-zinc-100"
                  />
                </div>
                <div className="pt-2 border-t border-zinc-200 dark:border-zinc-700">
                  <div className="flex justify-between items-center">
                    <span className="font-semibold text-zinc-800 dark:text-zinc-100">Total Gastos Fijos:</span>
                    <span className="text-lg font-bold text-slate-600">{formatCurrency(totalGastosFijos)}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Precios por Sesión */}
            <div className="bg-white dark:bg-zinc-800 rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold text-zinc-800 dark:text-zinc-100 mb-4">
                Precios por Sesión
              </h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                    Valoración / Sesión Individual
                  </label>
                  <input
                    type="text"
                    value={formatCurrency(precioValoracion)}
                    onChange={(e) => setPrecioValoracion(parseCurrency(e.target.value))}
                    className="w-full px-4 py-2 border border-zinc-300 dark:border-zinc-600 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-transparent dark:bg-zinc-700 dark:text-zinc-100"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                    Paquete 5 Sesiones (precio por sesión)
                  </label>
                  <input
                    type="text"
                    value={formatCurrency(precioPaquete5)}
                    onChange={(e) => setPrecioPaquete5(parseCurrency(e.target.value))}
                    className="w-full px-4 py-2 border border-zinc-300 dark:border-zinc-600 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-transparent dark:bg-zinc-700 dark:text-zinc-100"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                    Paquete 10 Sesiones (precio por sesión)
                  </label>
                  <input
                    type="text"
                    value={formatCurrency(precioPaquete10)}
                    onChange={(e) => setPrecioPaquete10(parseCurrency(e.target.value))}
                    className="w-full px-4 py-2 border border-zinc-300 dark:border-zinc-600 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-transparent dark:bg-zinc-700 dark:text-zinc-100"
                  />
                </div>
              </div>
            </div>

            {/* Costos Fisioterapeuta */}
            <div className="bg-white dark:bg-zinc-800 rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold text-zinc-800 dark:text-zinc-100 mb-4">
                Costos por Fisioterapeuta
              </h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                    Pago por Terapia Realizada
                  </label>
                  <input
                    type="text"
                    value={formatCurrency(pagoTerapia)}
                    onChange={(e) => setPagoTerapia(parseCurrency(e.target.value))}
                    className="w-full px-4 py-2 border border-zinc-300 dark:border-zinc-600 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-transparent dark:bg-zinc-700 dark:text-zinc-100"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                    Subsidio de Transporte Mensual
                  </label>
                  <input
                    type="text"
                    value={formatCurrency(subsidioTransporte)}
                    onChange={(e) => setSubsidioTransporte(parseCurrency(e.target.value))}
                    className="w-full px-4 py-2 border border-zinc-300 dark:border-zinc-600 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-transparent dark:bg-zinc-700 dark:text-zinc-100"
                  />
                </div>
              </div>
            </div>

            {/* Distribución de Sesiones */}
            <div className="bg-white dark:bg-zinc-800 rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold text-zinc-800 dark:text-zinc-100 mb-4">
                Distribución de Sesiones Mensuales por Fisio
              </h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                    Total Sesiones por Fisio/Mes
                  </label>
                  <input
                    type="number"
                    value={totalSesiones}
                    onChange={(e) => setTotalSesiones(parseInt(e.target.value) || 0)}
                    className="w-full px-4 py-2 border border-zinc-300 dark:border-zinc-600 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-transparent dark:bg-zinc-700 dark:text-zinc-100"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                    Valoraciones
                  </label>
                  <input
                    type="number"
                    value={sesionesValoracion}
                    onChange={(e) => setSesionesValoracion(parseInt(e.target.value) || 0)}
                    className="w-full px-4 py-2 border border-zinc-300 dark:border-zinc-600 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-transparent dark:bg-zinc-700 dark:text-zinc-100"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                    Paquete 5
                  </label>
                  <input
                    type="number"
                    value={sesionesPaquete5}
                    onChange={(e) => setSesionesPaquete5(parseInt(e.target.value) || 0)}
                    className="w-full px-4 py-2 border border-zinc-300 dark:border-zinc-600 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-transparent dark:bg-zinc-700 dark:text-zinc-100"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                    Paquete 10
                  </label>
                  <input
                    type="number"
                    value={sesionesPaquete10}
                    onChange={(e) => setSesionesPaquete10(parseInt(e.target.value) || 0)}
                    className="w-full px-4 py-2 border border-zinc-300 dark:border-zinc-600 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-transparent dark:bg-zinc-700 dark:text-zinc-100"
                  />
                </div>
                {errorDistribucion && (
                  <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3">
                    <p className="text-sm text-red-600 dark:text-red-400">⚠️ {errorDistribucion}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Número de Fisioterapeutas */}
            <div className="bg-white dark:bg-zinc-800 rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold text-zinc-800 dark:text-zinc-100 mb-4">
                Número de Fisioterapeutas
              </h2>
              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                  Fisios Trabajando
                </label>
                <input
                  type="number"
                  min="1"
                  value={numeroFisios}
                  onChange={(e) => setNumeroFisios(parseInt(e.target.value) || 1)}
                  className="w-full px-4 py-2 border border-zinc-300 dark:border-zinc-600 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-transparent dark:bg-zinc-700 dark:text-zinc-100"
                />
              </div>
            </div>
          </div>

          {/* COLUMNA DERECHA: RESULTADOS */}
          <div className="space-y-6">
            {/* Resumen de Sesiones */}
            <div className="bg-white dark:bg-zinc-800 rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold text-zinc-800 dark:text-zinc-100 mb-4">
                Resumen de Sesiones Totales
              </h2>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-zinc-700 dark:text-zinc-300">Total Sesiones (todos los fisios):</span>
                  <span className="font-semibold">{totalSesionesTodas}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-700 dark:text-zinc-300">Valoraciones:</span>
                  <span className="font-semibold">{totalValoraciones}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-700 dark:text-zinc-300">Paquete 5:</span>
                  <span className="font-semibold">{totalPaquete5}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-700 dark:text-zinc-300">Paquete 10:</span>
                  <span className="font-semibold">{totalPaquete10}</span>
                </div>
              </div>
            </div>

            {/* Ingresos Totales */}
            <div className="bg-white dark:bg-zinc-800 rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold text-zinc-800 dark:text-zinc-100 mb-4">
                Ingresos Totales Mensuales
              </h2>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-zinc-700 dark:text-zinc-300">Valoraciones:</span>
                  <span className="font-semibold">{formatCurrency(ingresosValoraciones)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-700 dark:text-zinc-300">Paquete 5:</span>
                  <span className="font-semibold">{formatCurrency(ingresosPaquete5)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-700 dark:text-zinc-300">Paquete 10:</span>
                  <span className="font-semibold">{formatCurrency(ingresosPaquete10)}</span>
                </div>
                <div className="pt-3 border-t border-zinc-200 dark:border-zinc-700">
                  <div className="flex justify-between items-center">
                    <span className="text-lg font-bold text-zinc-800 dark:text-zinc-100">Total Ingresos:</span>
                    <span className="text-xl font-bold text-green-600">{formatCurrency(ingresosTotalesMes)}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Costos Fisioterapeutas */}
            <div className="bg-white dark:bg-zinc-800 rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold text-zinc-800 dark:text-zinc-100 mb-4">
                Costos Fisioterapeutas Totales
              </h2>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-zinc-700 dark:text-zinc-300">Pago por terapias:</span>
                  <span className="font-semibold">{formatCurrency(costoTerapiasTotales)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-700 dark:text-zinc-300">Subsidios transporte:</span>
                  <span className="font-semibold">{formatCurrency(costoSubsidiosTotales)}</span>
                </div>
                <div className="pt-3 border-t border-zinc-200 dark:border-zinc-700">
                  <div className="flex justify-between items-center">
                    <span className="text-lg font-bold text-zinc-800 dark:text-zinc-100">Total Costos Fisios:</span>
                    <span className="text-xl font-bold text-red-600">{formatCurrency(costosFisiosTotales)}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* RESULTADOS PRINCIPALES */}
            <div className="bg-gradient-to-br from-slate-600 to-slate-700 rounded-lg shadow-lg p-6 text-white">
              <h2 className="text-2xl font-bold mb-6">Resultados Principales</h2>
              
              <div className="space-y-4">
                <div className="bg-white/10 rounded-lg p-4">
                  <div className="text-sm opacity-90 mb-1">Ganancia por Fisio/Mes</div>
                  <div className="text-2xl font-bold">{formatCurrency(gananciaPorFisio)}</div>
                </div>

                <div className={`rounded-lg p-4 ${utilidadEmpresaMes >= 0 ? 'bg-green-500/20 border border-green-400/50' : 'bg-red-500/20 border border-red-400/50'}`}>
                  <div className="text-sm opacity-90 mb-1">Utilidad Empresa/Mes</div>
                  <div className="text-3xl font-bold">
                    {formatCurrency(utilidadEmpresaMes)}
                  </div>
                  {utilidadEmpresaMes < 0 && (
                    <div className="text-xs mt-2 opacity-75">⚠️ La empresa está en pérdida</div>
                  )}
                </div>

                <div className={`rounded-lg p-4 ${utilidadEmpresaAnual >= 0 ? 'bg-green-500/20 border border-green-400/50' : 'bg-red-500/20 border border-red-400/50'}`}>
                  <div className="text-sm opacity-90 mb-1">Utilidad Empresa/Año</div>
                  <div className="text-3xl font-bold">
                    {formatCurrency(utilidadEmpresaAnual)}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}