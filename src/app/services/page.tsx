'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

interface Service {
  id: string
  nombre: string
  tipo: string
  cantidad_sesiones: number
  valor_default: number
  comision_default: number
  activo: boolean
  created_at: string
}

export default function ServicesPage() {
  const router = useRouter()
  const [services, setServices] = useState<Service[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchServices()
  }, [])

  const fetchServices = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/services')
      
      if (!response.ok) {
        throw new Error('Error al cargar servicios')
      }

      const data = await response.json()
      setServices(data.services)
    } catch (err) {
      console.error(err)
      alert('Error al cargar los servicios')
    } finally {
      setLoading(false)
    }
  }

  const getTipoLabel = (tipo: string) => {
    const labels: { [key: string]: string } = {
      'valoracion': 'Valoración',
      'individual': 'Individual',
      'paquete': 'Paquete'
    }
    return labels[tipo] || tipo
  }

  const getTipoBadgeColor = (tipo: string) => {
    const colors: { [key: string]: string } = {
      'valoracion': 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
      'individual': 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
      'paquete': 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200'
    }
    return colors[tipo] || 'bg-zinc-100 text-zinc-800'
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0
    }).format(value)
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-50 dark:bg-zinc-900">
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-orange-600 border-r-transparent"></div>
          <p className="mt-4 text-zinc-600 dark:text-zinc-400">Cargando servicios...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-900 py-12 px-6">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <Link
            href="/home"
            className="inline-flex items-center text-orange-600 hover:text-orange-700 dark:text-orange-400 dark:hover:text-orange-300 mb-4"
          >
            ← Volver al inicio
          </Link>
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-zinc-900 dark:text-zinc-50">
                Gestión de Servicios
              </h1>
              <p className="text-zinc-600 dark:text-zinc-400 mt-2">
                Administra los servicios disponibles para las citas
              </p>
            </div>
            <Link
              href="/services/create"
              className="w-full sm:w-auto px-4 sm:px-6 py-2.5 sm:py-3 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors font-medium text-center text-sm sm:text-base whitespace-nowrap"
            >
              + Crear Servicio
            </Link>
          </div>
        </div>

        {services.length === 0 ? (
          <div className="bg-white dark:bg-zinc-800 rounded-lg shadow-md p-12 text-center">
            <div className="text-6xl mb-4">📋</div>
            <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50 mb-2">
              No hay servicios registrados
            </h2>
            <p className="text-zinc-600 dark:text-zinc-400 mb-6">
              Crea tu primer servicio para comenzar a agendar citas
            </p>
            <Link
              href="/services/create"
              className="inline-block px-6 py-3 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors font-medium"
            >
              Crear Primer Servicio
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {services.map((service) => (
              <div
                key={service.id}
                className="bg-white dark:bg-zinc-800 rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50 mb-2">
                      {service.nombre}
                    </h3>
                    <span className={`inline-block px-3 py-1 rounded-full text-xs font-medium ${getTipoBadgeColor(service.tipo)}`}>
                      {getTipoLabel(service.tipo)}
                    </span>
                  </div>
                  <div className={`w-3 h-3 rounded-full ${service.activo ? 'bg-green-500' : 'bg-red-500'}`} title={service.activo ? 'Activo' : 'Inactivo'} />
                </div>

                <div className="space-y-3 mb-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-zinc-600 dark:text-zinc-400">Sesiones:</span>
                    <span className="text-sm font-medium text-zinc-900 dark:text-zinc-50">
                      {service.cantidad_sesiones}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-zinc-600 dark:text-zinc-400">Valor:</span>
                    <span className="text-sm font-semibold text-green-600 dark:text-green-400">
                      {formatCurrency(service.valor_default)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-zinc-600 dark:text-zinc-400">Comisión:</span>
                    <span className="text-sm font-semibold text-blue-600 dark:text-blue-400">
                      {formatCurrency(service.comision_default)}
                    </span>
                  </div>
                </div>

                <div className="pt-4 border-t border-zinc-200 dark:border-zinc-700">
                  <button
                    onClick={() => router.push(`/services/create?id=${service.id}`)}
                    className="w-full px-4 py-2 bg-zinc-100 dark:bg-zinc-700 text-zinc-900 dark:text-zinc-50 rounded-lg hover:bg-zinc-200 dark:hover:bg-zinc-600 transition-colors font-medium"
                  >
                    Editar
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}