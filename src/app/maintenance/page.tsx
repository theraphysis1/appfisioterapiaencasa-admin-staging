'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function MaintenancePage() {
  const router = useRouter()

  // Estados para CITAS
  const [citasFechaDesde, setCitasFechaDesde] = useState('')
  const [citasFechaHasta, setCitasFechaHasta] = useState('')
  const [citasEstados, setCitasEstados] = useState({
    agendada: false,
    completada: false,
    cancelada: false,
    pendiente_reagendar: false
  })
  const [citasResultados, setCitasResultados] = useState<any>(null)
  const [citasBuscando, setCitasBuscando] = useState(false)
  const [citasEliminando, setCitasEliminando] = useState(false)

  // Estados para PAQUETES
  const [paquetesFechaDesde, setPaquetesFechaDesde] = useState('')
  const [paquetesFechaHasta, setPaquetesFechaHasta] = useState('')
  const [paquetesEstados, setPaquetesEstados] = useState({
    activo: false,
    completado: false,
    cancelado: false
  })
  const [paquetesResultados, setPaquetesResultados] = useState<any>(null)
  const [paquetesBuscando, setPaquetesBuscando] = useState(false)
  const [paquetesEliminando, setPaquetesEliminando] = useState(false)

  // Estados para PACIENTES
  const [pacientesFechaDesde, setPacientesFechaDesde] = useState('')
  const [pacientesFechaHasta, setPacientesFechaHasta] = useState('')
  const [pacientesResultados, setPacientesResultados] = useState<any>(null)
  const [pacientesBuscando, setPacientesBuscando] = useState(false)
  const [pacientesEliminando, setPacientesEliminando] = useState(false)

  // ============================================
  // FUNCIONES PARA CITAS
  // ============================================

  const buscarCitas = async () => {
    if (!citasFechaDesde || !citasFechaHasta) {
      alert('Por favor selecciona ambas fechas')
      return
    }

    const estadosSeleccionados = Object.entries(citasEstados)
      .filter(([_, value]) => value)
      .map(([key]) => key)

    if (estadosSeleccionados.length === 0) {
      alert('Por favor selecciona al menos un estado')
      return
    }

    setCitasBuscando(true)
    try {
      const params = new URLSearchParams({
        fecha_desde: citasFechaDesde,
        fecha_hasta: citasFechaHasta,
        estados: estadosSeleccionados.join(',')
      })

      const res = await fetch(`/api/maintenance/citas?${params}`)
      const data = await res.json()

      if (res.ok) {
        setCitasResultados(data)
      } else {
        alert(data.error || 'Error al buscar citas')
      }
    } catch (error) {
      console.error('Error:', error)
      alert('Error al buscar citas')
    } finally {
      setCitasBuscando(false)
    }
  }

  const eliminarCitasIndividuales = async () => {
    if (!citasResultados?.citas_individuales?.length) {
      alert('No hay citas individuales para eliminar')
      return
    }

    const confirmacion = confirm(
      `¿Estás seguro de eliminar ${citasResultados.resumen.individuales.total} citas individuales?\n\n` +
      `Esta acción es PERMANENTE y no se puede deshacer.`
    )

    if (!confirmacion) return

    setCitasEliminando(true)
    try {
      const citasIds = citasResultados.citas_individuales.map((c: any) => c.id)

      const res = await fetch('/api/maintenance/citas', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tipo: 'individuales',
          citas_ids: citasIds
        })
      })

      const data = await res.json()

      if (res.ok) {
        alert(`✅ Eliminadas ${data.resultado.citas_eliminadas} citas individuales`)
        setCitasResultados(null)
      } else {
        alert(data.error || 'Error al eliminar citas')
      }
    } catch (error) {
      console.error('Error:', error)
      alert('Error al eliminar citas')
    } finally {
      setCitasEliminando(false)
    }
  }

  const eliminarCitasDePaquetes = async (opcion: 'solo_filtro' | 'completos') => {
    if (!citasResultados?.citas_de_paquetes?.length) {
      alert('No hay citas de paquetes para eliminar')
      return
    }

    const citasIds = citasResultados.citas_de_paquetes.map((c: any) => c.id)
    const paquetesIds = citasResultados.resumen.de_paquetes.paquetes.map((p: any) => p.package_id)

    let mensaje = ''
    let tipo = ''

    if (opcion === 'solo_filtro') {
      mensaje = `⚠️ ADVERTENCIA: Eliminar solo estas citas DESBALANCEARÁ los paquetes.\n\n` +
        `Se eliminarán ${citasResultados.resumen.de_paquetes.total_citas} citas\n` +
        `Afectando ${citasResultados.resumen.de_paquetes.total_paquetes} paquetes\n\n` +
        `¿Continuar? (No recomendado)`
      tipo = 'paquetes_solo_filtro'
    } else {
      const totalCitasPaquetes = citasResultados.resumen.de_paquetes.paquetes.reduce(
        (sum: number, p: any) => sum + p.total_citas_del_paquete,
        0
      )
      const citasAdicionales = totalCitasPaquetes - citasResultados.resumen.de_paquetes.total_citas

      mensaje = `Se eliminarán ${citasResultados.resumen.de_paquetes.total_paquetes} PAQUETES COMPLETOS\n\n` +
        `Esto incluye:\n` +
        `• ${citasResultados.resumen.de_paquetes.total_citas} citas del filtro\n` +
        `• ${citasAdicionales} citas adicionales de esos paquetes\n` +
        `• Total: ${totalCitasPaquetes} citas eliminadas\n\n` +
        `⚠️ Esta acción es PERMANENTE\n\n` +
        `¿Continuar?`
      tipo = 'paquetes_completos'
    }

    const confirmacion = confirm(mensaje)
    if (!confirmacion) return

    setCitasEliminando(true)
    try {
      const body: any = {
        tipo,
        citas_ids: citasIds
      }

      if (opcion === 'completos') {
        body.paquetes_ids = paquetesIds
      }

      const res = await fetch('/api/maintenance/citas', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      })

      const data = await res.json()

      if (res.ok) {
        let mensaje = `✅ Eliminadas ${data.resultado.citas_eliminadas} citas`
        if (data.resultado.paquetes_eliminados) {
          mensaje += `\n✅ Eliminados ${data.resultado.paquetes_eliminados} paquetes`
        }
        if (data.resultado.citas_adicionales_eliminadas) {
          mensaje += `\n✅ ${data.resultado.citas_adicionales_eliminadas} citas adicionales`
        }
        alert(mensaje)
        setCitasResultados(null)
      } else {
        alert(data.error || 'Error al eliminar')
      }
    } catch (error) {
      console.error('Error:', error)
      alert('Error al eliminar')
    } finally {
      setCitasEliminando(false)
    }
  }

  const eliminarTodoCitas = async () => {
    if (!citasResultados) return

    const totalCitas = citasResultados.resumen.total_encontradas
    const totalPaquetes = citasResultados.resumen.de_paquetes.total_paquetes

    const mensaje = `🚨 ELIMINAR TODO\n\n` +
      `Se eliminará:\n` +
      `• ${citasResultados.resumen.individuales.total} citas individuales\n` +
      `• ${totalPaquetes} paquetes completos\n` +
      `• Todas las citas de esos paquetes\n\n` +
      `⚠️ Esta acción es PERMANENTE y eliminará más citas de las mostradas\n\n` +
      `¿Estás COMPLETAMENTE seguro?`

    const confirmacion = confirm(mensaje)
    if (!confirmacion) return

    setCitasEliminando(true)
    try {
      // Eliminar individuales
      if (citasResultados.citas_individuales?.length > 0) {
        const citasIndIds = citasResultados.citas_individuales.map((c: any) => c.id)
        await fetch('/api/maintenance/citas', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            tipo: 'individuales',
            citas_ids: citasIndIds
          })
        })
      }

      // Eliminar paquetes completos
      if (citasResultados.citas_de_paquetes?.length > 0) {
        const citasPkgIds = citasResultados.citas_de_paquetes.map((c: any) => c.id)
        const paquetesIds = citasResultados.resumen.de_paquetes.paquetes.map((p: any) => p.package_id)

        await fetch('/api/maintenance/citas', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            tipo: 'paquetes_completos',
            citas_ids: citasPkgIds,
            paquetes_ids: paquetesIds
          })
        })
      }

      alert('✅ Todas las citas y paquetes fueron eliminados')
      setCitasResultados(null)
    } catch (error) {
      console.error('Error:', error)
      alert('Error al eliminar')
    } finally {
      setCitasEliminando(false)
    }
  }

  // ============================================
  // FUNCIONES PARA PAQUETES
  // ============================================

  const buscarPaquetes = async () => {
    if (!paquetesFechaDesde || !paquetesFechaHasta) {
      alert('Por favor selecciona ambas fechas')
      return
    }

    const estadosSeleccionados = Object.entries(paquetesEstados)
      .filter(([_, value]) => value)
      .map(([key]) => key)

    if (estadosSeleccionados.length === 0) {
      alert('Por favor selecciona al menos un estado')
      return
    }

    setPaquetesBuscando(true)
    try {
      const params = new URLSearchParams({
        fecha_desde: paquetesFechaDesde,
        fecha_hasta: paquetesFechaHasta,
        estados: estadosSeleccionados.join(',')
      })

      const res = await fetch(`/api/maintenance/paquetes?${params}`)
      const data = await res.json()

      if (res.ok) {
        setPaquetesResultados(data)
      } else {
        alert(data.error || 'Error al buscar paquetes')
      }
    } catch (error) {
      console.error('Error:', error)
      alert('Error al buscar paquetes')
    } finally {
      setPaquetesBuscando(false)
    }
  }

  const eliminarPaquetes = async () => {
    if (!paquetesResultados?.paquetes?.length) {
      alert('No hay paquetes para eliminar')
      return
    }

    const mensaje = `Se eliminarán ${paquetesResultados.resumen.total_paquetes} PAQUETES\n\n` +
      `Esto eliminará también:\n` +
      `• ${paquetesResultados.resumen.total_citas_asociadas} citas asociadas\n\n` +
      `⚠️ Esta acción es PERMANENTE\n\n` +
      `¿Continuar?`

    const confirmacion = confirm(mensaje)
    if (!confirmacion) return

    setPaquetesEliminando(true)
    try {
      const paquetesIds = paquetesResultados.paquetes.map((p: any) => p.id)

      const res = await fetch('/api/maintenance/paquetes', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ paquetes_ids: paquetesIds })
      })

      const data = await res.json()

      if (res.ok) {
        alert(
          `✅ Eliminados ${data.resultado.paquetes_eliminados} paquetes\n` +
          `✅ Eliminadas ${data.resultado.citas_eliminadas} citas`
        )
        setPaquetesResultados(null)
      } else {
        alert(data.error || 'Error al eliminar paquetes')
      }
    } catch (error) {
      console.error('Error:', error)
      alert('Error al eliminar paquetes')
    } finally {
      setPaquetesEliminando(false)
    }
  }

  // ============================================
  // FUNCIONES PARA PACIENTES
  // ============================================

  const buscarPacientes = async () => {
    if (!pacientesFechaDesde || !pacientesFechaHasta) {
      alert('Por favor selecciona ambas fechas')
      return
    }

    setPacientesBuscando(true)
    try {
      const params = new URLSearchParams({
        fecha_desde: pacientesFechaDesde,
        fecha_hasta: pacientesFechaHasta
      })

      const res = await fetch(`/api/maintenance/pacientes?${params}`)
      const data = await res.json()

      if (res.ok) {
        setPacientesResultados(data)
      } else {
        alert(data.error || 'Error al buscar pacientes')
      }
    } catch (error) {
      console.error('Error:', error)
      alert('Error al buscar pacientes')
    } finally {
      setPacientesBuscando(false)
    }
  }

  const eliminarPacientesSinDatos = async () => {
    if (!pacientesResultados?.pacientes_sin_datos?.length) {
      alert('No hay pacientes sin datos para eliminar')
      return
    }

    const mensaje = `Se eliminarán ${pacientesResultados.resumen.sin_datos} pacientes SIN datos\n\n` +
      `Estos pacientes NO tienen citas ni paquetes asociados.\n\n` +
      `✅ Esta es una operación SEGURA\n\n` +
      `¿Continuar?`

    const confirmacion = confirm(mensaje)
    if (!confirmacion) return

    setPacientesEliminando(true)
    try {
      const pacientesIds = pacientesResultados.pacientes_sin_datos.map((p: any) => p.id)

      const res = await fetch('/api/maintenance/pacientes', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pacientes_ids: pacientesIds })
      })

      const data = await res.json()

      if (res.ok) {
        alert(`✅ Eliminados ${data.resultado.pacientes_eliminados} pacientes`)
        setPacientesResultados(null)
      } else {
        alert(data.error || 'Error al eliminar pacientes')
      }
    } catch (error) {
      console.error('Error:', error)
      alert('Error al eliminar pacientes')
    } finally {
      setPacientesEliminando(false)
    }
  }

  const eliminarPacientesConDatos = async () => {
    if (!pacientesResultados?.pacientes_con_datos?.length) {
      alert('No hay pacientes con datos para eliminar')
      return
    }

    const total = pacientesResultados.resumen.con_datos
    const totalPkg = pacientesResultados.resumen.total_paquetes_asociados
    const totalCitas = pacientesResultados.resumen.total_citas_asociadas

    const mensaje = `🚨 ADVERTENCIA CRÍTICA\n\n` +
      `Se eliminarán ${total} PACIENTES con todos sus datos:\n\n` +
      `• ${totalPkg} paquetes\n` +
      `• ${totalCitas} citas\n\n` +
      `⚠️ PERDERÁS TODO EL HISTORIAL de estos pacientes\n` +
      `⚠️ Esta acción es PERMANENTE y NO SE PUEDE DESHACER\n\n` +
      `Escribe "ELIMINAR" para confirmar:`

    const confirmacionTexto = prompt(mensaje)
    if (confirmacionTexto !== 'ELIMINAR') {
      alert('Cancelado')
      return
    }

    setPacientesEliminando(true)
    try {
      const pacientesIds = pacientesResultados.pacientes_con_datos.map((p: any) => p.id)

      const res = await fetch('/api/maintenance/pacientes', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pacientes_ids: pacientesIds })
      })

      const data = await res.json()

      if (res.ok) {
        alert(
          `✅ Eliminados ${data.resultado.pacientes_eliminados} pacientes\n` +
          `✅ Eliminados ${data.resultado.paquetes_eliminados} paquetes\n` +
          `✅ Eliminadas ${data.resultado.citas_eliminadas} citas`
        )
        setPacientesResultados(null)
      } else {
        alert(data.error || 'Error al eliminar pacientes')
      }
    } catch (error) {
      console.error('Error:', error)
      alert('Error al eliminar pacientes')
    } finally {
      setPacientesEliminando(false)
    }
  }

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-900 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => router.push('/home')}
            className="mb-4 text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-50"
          >
            ← Volver al inicio
          </button>
          <h1 className="text-3xl font-bold text-zinc-900 dark:text-zinc-50">
            🧹 Mantenimiento y Limpieza de Base de Datos
          </h1>
          <p className="text-zinc-600 dark:text-zinc-400 mt-2">
            Elimina registros antiguos para mantener la base de datos limpia
          </p>
        </div>

        {/* SECCIÓN 1: CITAS */}
        <div className="bg-white dark:bg-zinc-800 rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-50 mb-4">
            📅 ELIMINAR CITAS
          </h2>

          {/* Filtros */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                Desde:
              </label>
              <input
                type="date"
                value={citasFechaDesde}
                onChange={(e) => setCitasFechaDesde(e.target.value)}
                className="w-full rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-700 px-4 py-2 text-zinc-900 dark:text-zinc-50"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                Hasta:
              </label>
              <input
                type="date"
                value={citasFechaHasta}
                onChange={(e) => setCitasFechaHasta(e.target.value)}
                className="w-full rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-700 px-4 py-2 text-zinc-900 dark:text-zinc-50"
              />
            </div>
          </div>

          {/* Estados */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
              Estados a buscar:
            </label>
            <div className="flex flex-wrap gap-4">
              {Object.entries(citasEstados).map(([estado, checked]) => (
                <label key={estado} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={(e) => setCitasEstados({ ...citasEstados, [estado]: e.target.checked })}
                    className="w-4 h-4"
                  />
                  <span className="text-zinc-700 dark:text-zinc-300 capitalize">
                    {estado.replace('_', ' ')}
                  </span>
                </label>
              ))}
            </div>
          </div>

          <button
            onClick={buscarCitas}
            disabled={citasBuscando}
            className="w-full md:w-auto bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-medium disabled:opacity-50"
          >
            {citasBuscando ? 'Buscando...' : '🔍 Buscar Citas'}
          </button>

          {/* Resultados */}
          {citasResultados && (
            <div className="mt-6 space-y-4">
              <div className="bg-zinc-100 dark:bg-zinc-700 p-4 rounded-lg">
                <h3 className="font-bold text-zinc-900 dark:text-zinc-50 mb-2">
                  📊 Resultados: {citasResultados.resumen.total_encontradas} citas
                </h3>
                {citasResultados.resumen.limite_alcanzado && (
                  <div className="mt-2 px-3 py-2 bg-orange-100 dark:bg-orange-900/30 border border-orange-300 dark:border-orange-700 rounded text-sm text-orange-800 dark:text-orange-200">
                    ⚠️ Límite alcanzado: Se muestran las primeras 1000 citas. Usa un rango de fechas más específico o filtra por estados para ver otros resultados.
                  </div>
                )}
              </div>

              {/* Citas Individuales */}
              {citasResultados.resumen.individuales.total > 0 && (
                <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 p-4 rounded-lg">
                  <h4 className="font-bold text-green-900 dark:text-green-100 mb-2">
                    ✅ CITAS INDIVIDUALES ({citasResultados.resumen.individuales.total})
                  </h4>
                  <p className="text-sm text-green-800 dark:text-green-200 mb-3">
                    Estas citas se pueden eliminar sin afectar paquetes
                  </p>
                  <div className="flex flex-wrap gap-2 mb-3 text-sm">
                    {Object.entries(citasResultados.resumen.individuales.por_estado).map(([estado, cantidad]: any) => (
                      cantidad > 0 && (
                        <span key={estado} className="bg-white dark:bg-zinc-800 px-3 py-1 rounded">
                          {estado}: {cantidad}
                        </span>
                      )
                    ))}
                  </div>
                  <button
                    onClick={eliminarCitasIndividuales}
                    disabled={citasEliminando}
                    className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg disabled:opacity-50"
                  >
                    🗑️ Eliminar Individuales
                  </button>
                </div>
              )}

              {/* Citas de Paquetes */}
              {citasResultados.resumen.de_paquetes.total_citas > 0 && (
                <div className="bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 p-4 rounded-lg">
                  <h4 className="font-bold text-orange-900 dark:text-orange-100 mb-2">
                    ⚠️ CITAS DE PAQUETES ({citasResultados.resumen.de_paquetes.total_citas})
                  </h4>
                  <p className="text-sm text-orange-800 dark:text-orange-200 mb-3">
                    Pertenecen a {citasResultados.resumen.de_paquetes.total_paquetes} paquetes diferentes
                  </p>
                  
                  <div className="space-y-2 mb-4">
                    <button
                      onClick={() => eliminarCitasDePaquetes('solo_filtro')}
                      disabled={citasEliminando}
                      className="w-full bg-orange-600 hover:bg-orange-700 text-white px-4 py-2 rounded-lg disabled:opacity-50 text-left"
                    >
                      <div className="font-medium">⚠️ Eliminar solo estas citas</div>
                      <div className="text-sm opacity-90">Desbalanceará los paquetes (no recomendado)</div>
                    </button>
                    
                    <button
                      onClick={() => eliminarCitasDePaquetes('completos')}
                      disabled={citasEliminando}
                      className="w-full bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg disabled:opacity-50 text-left"
                    >
                      <div className="font-medium">🗑️ Eliminar los paquetes completos</div>
                      <div className="text-sm opacity-90">
                        Eliminará TODAS las citas de los {citasResultados.resumen.de_paquetes.total_paquetes} paquetes
                      </div>
                    </button>
                  </div>
                </div>
              )}

              {/* Botón eliminar todo */}
              {citasResultados.resumen.total_encontradas > 0 && (
                <button
                  onClick={eliminarTodoCitas}
                  disabled={citasEliminando}
                  className="w-full bg-red-700 hover:bg-red-800 text-white px-4 py-3 rounded-lg font-bold disabled:opacity-50"
                >
                  🚨 ELIMINAR TODO ({citasResultados.resumen.total_encontradas} citas + paquetes)
                </button>
              )}
            </div>
          )}
        </div>

        {/* SECCIÓN 2: PAQUETES */}
        <div className="bg-white dark:bg-zinc-800 rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-50 mb-4">
            📦 ELIMINAR PAQUETES
          </h2>

          {/* Filtros */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                Desde (fecha compra):
              </label>
              <input
                type="date"
                value={paquetesFechaDesde}
                onChange={(e) => setPaquetesFechaDesde(e.target.value)}
                className="w-full rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-700 px-4 py-2 text-zinc-900 dark:text-zinc-50"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                Hasta:
              </label>
              <input
                type="date"
                value={paquetesFechaHasta}
                onChange={(e) => setPaquetesFechaHasta(e.target.value)}
                className="w-full rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-700 px-4 py-2 text-zinc-900 dark:text-zinc-50"
              />
            </div>
          </div>

          {/* Estados */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
              Estados a buscar:
            </label>
            <div className="flex flex-wrap gap-4">
              {Object.entries(paquetesEstados).map(([estado, checked]) => (
                <label key={estado} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={(e) => setPaquetesEstados({ ...paquetesEstados, [estado]: e.target.checked })}
                    className="w-4 h-4"
                  />
                  <span className="text-zinc-700 dark:text-zinc-300 capitalize">
                    {estado}
                  </span>
                </label>
              ))}
            </div>
          </div>

          <button
            onClick={buscarPaquetes}
            disabled={paquetesBuscando}
            className="w-full md:w-auto bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-medium disabled:opacity-50"
          >
            {paquetesBuscando ? 'Buscando...' : '🔍 Buscar Paquetes'}
          </button>

          {/* Resultados */}
          {paquetesResultados && (
            <div className="mt-6 space-y-4">
              <div className="bg-zinc-100 dark:bg-zinc-700 p-4 rounded-lg">
                <h3 className="font-bold text-zinc-900 dark:text-zinc-50 mb-2">
                  📊 Resultados: {paquetesResultados.resumen.total_paquetes} paquetes
                </h3>
                <p className="text-zinc-700 dark:text-zinc-300">
                  Citas asociadas: {paquetesResultados.resumen.total_citas_asociadas}
                </p>
                {paquetesResultados.resumen.limite_alcanzado && (
                  <div className="mt-2 px-3 py-2 bg-orange-100 dark:bg-orange-900/30 border border-orange-300 dark:border-orange-700 rounded text-sm text-orange-800 dark:text-orange-200">
                    ⚠️ Límite alcanzado: Se muestran los primeros 500 paquetes. Usa un rango de fechas más específico para ver otros resultados.
                  </div>
                )}
              </div>

              {paquetesResultados.resumen.total_paquetes > 0 && (
                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-4 rounded-lg">
                  <h4 className="font-bold text-red-900 dark:text-red-100 mb-2">
                    ⚠️ ELIMINACIÓN EN CASCADA
                  </h4>
                  <p className="text-sm text-red-800 dark:text-red-200 mb-4">
                    Al eliminar estos paquetes, también se eliminarán TODAS sus {paquetesResultados.resumen.total_citas_asociadas} citas asociadas
                  </p>
                  <button
                    onClick={eliminarPaquetes}
                    disabled={paquetesEliminando}
                    className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg disabled:opacity-50"
                  >
                    🗑️ Eliminar Paquetes + Citas
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* SECCIÓN 3: PACIENTES */}
        <div className="bg-white dark:bg-zinc-800 rounded-lg shadow-md p-6">
          <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-50 mb-4">
            👤 ELIMINAR PACIENTES
          </h2>

          {/* Filtros */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                Desde (fecha creación):
              </label>
              <input
                type="date"
                value={pacientesFechaDesde}
                onChange={(e) => setPacientesFechaDesde(e.target.value)}
                className="w-full rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-700 px-4 py-2 text-zinc-900 dark:text-zinc-50"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                Hasta:
              </label>
              <input
                type="date"
                value={pacientesFechaHasta}
                onChange={(e) => setPacientesFechaHasta(e.target.value)}
                className="w-full rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-700 px-4 py-2 text-zinc-900 dark:text-zinc-50"
              />
            </div>
          </div>

          <button
            onClick={buscarPacientes}
            disabled={pacientesBuscando}
            className="w-full md:w-auto bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-medium disabled:opacity-50"
          >
            {pacientesBuscando ? 'Buscando...' : '🔍 Buscar Pacientes'}
          </button>

          {/* Resultados */}
          {pacientesResultados && (
            <div className="mt-6 space-y-4">
              <div className="bg-zinc-100 dark:bg-zinc-700 p-4 rounded-lg">
                <h3 className="font-bold text-zinc-900 dark:text-zinc-50 mb-2">
                  📊 Resultados: {pacientesResultados.resumen.total_pacientes} pacientes
                </h3>
                {pacientesResultados.resumen.limite_alcanzado && (
                  <div className="mt-2 px-3 py-2 bg-orange-100 dark:bg-orange-900/30 border border-orange-300 dark:border-orange-700 rounded text-sm text-orange-800 dark:text-orange-200">
                    ⚠️ Límite alcanzado: Se muestran los primeros 500 pacientes. Usa un rango de fechas más específico para ver otros resultados.
                  </div>
                )}
                <div className="grid grid-cols-2 gap-4 text-sm mt-2">
                  <div>
                    <span className="text-green-600 dark:text-green-400 font-medium">Sin datos:</span> {pacientesResultados.resumen.sin_datos}
                  </div>
                  <div>
                    <span className="text-orange-600 dark:text-orange-400 font-medium">Con datos:</span> {pacientesResultados.resumen.con_datos}
                  </div>
                </div>
              </div>

              {/* Pacientes sin datos */}
              {pacientesResultados.resumen.sin_datos > 0 && (
                <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 p-4 rounded-lg">
                  <h4 className="font-bold text-green-900 dark:text-green-100 mb-2">
                    ✅ PACIENTES SIN DATOS ({pacientesResultados.resumen.sin_datos})
                  </h4>
                  <p className="text-sm text-green-800 dark:text-green-200 mb-3">
                    Estos pacientes NO tienen citas ni paquetes. Es seguro eliminarlos.
                  </p>
                  <button
                    onClick={eliminarPacientesSinDatos}
                    disabled={pacientesEliminando}
                    className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg disabled:opacity-50"
                  >
                    🗑️ Eliminar Pacientes Sin Datos
                  </button>
                </div>
              )}

              {/* Pacientes con datos */}
              {pacientesResultados.resumen.con_datos > 0 && (
                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-4 rounded-lg">
                  <h4 className="font-bold text-red-900 dark:text-red-100 mb-2">
                    🚨 PACIENTES CON DATOS ({pacientesResultados.resumen.con_datos})
                  </h4>
                  <p className="text-sm text-red-800 dark:text-red-200 mb-3">
                    ⚠️ ELIMINACIÓN EN CASCADA TOTAL:
                  </p>
                  <ul className="text-sm text-red-800 dark:text-red-200 mb-4 ml-4 list-disc">
                    <li>{pacientesResultados.resumen.total_paquetes_asociados} paquetes serán eliminados</li>
                    <li>{pacientesResultados.resumen.total_citas_asociadas} citas serán eliminadas</li>
                    <li>TODO el historial de estos pacientes se perderá</li>
                  </ul>
                  <button
                    onClick={eliminarPacientesConDatos}
                    disabled={pacientesEliminando}
                    className="bg-red-700 hover:bg-red-800 text-white px-4 py-2 rounded-lg disabled:opacity-50 font-bold"
                  >
                    🚨 Eliminar Pacientes + Todo Asociado
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}