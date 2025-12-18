'use client'

import { Suspense, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'

interface ServiceFormData {
  nombre: string
  tipo: string
  cantidad_sesiones: string
  valor_default: string
  comision_default: string
}

// Componente interno que usa useSearchParams
function CreateServiceForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const serviceId = searchParams.get('id')
  const isEditing = !!serviceId

  const [loading, setLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [formData, setFormData] = useState<ServiceFormData>({
    nombre: '',
    tipo: '',
    cantidad_sesiones: '1',
    valor_default: '',
    comision_default: ''
  })

  useEffect(() => {
    if (isEditing) {
      fetchService()
    }
  }, [serviceId])

  const fetchService = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/services/${serviceId}`)
      
      if (!response.ok) {
        throw new Error('Error al cargar servicio')
      }

      const data = await response.json()
      setFormData({
        nombre: data.service.nombre,
        tipo: data.service.tipo,
        cantidad_sesiones: data.service.cantidad_sesiones.toString(),
        valor_default: data.service.valor_default.toString(),
        comision_default: data.service.comision_default.toString()
      })
    } catch (err) {
      console.error(err)
      alert('Error al cargar el servicio')
      router.push('/services')
    } finally {
      setLoading(false)
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  const handleTipoChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const tipo = e.target.value
    setFormData(prev => ({
      ...prev,
      tipo,
      // Ajustar cantidad de sesiones según el tipo
      cantidad_sesiones: tipo === 'paquete' ? prev.cantidad_sesiones : '1'
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Validaciones
    if (!formData.nombre || !formData.tipo || !formData.cantidad_sesiones || 
        !formData.valor_default || !formData.comision_default) {
      alert('Por favor completa todos los campos')
      return
    }

    if (parseInt(formData.cantidad_sesiones) < 1) {
      alert('La cantidad de sesiones debe ser mayor a 0')
      return
    }

    if (parseFloat(formData.valor_default) < 0 || parseFloat(formData.comision_default) < 0) {
      alert('El valor y la comisión deben ser mayores o iguales a 0')
      return
    }

    setSubmitting(true)

    try {
      const url = isEditing ? `/api/services/${serviceId}` : '/api/services'
      const method = isEditing ? 'PUT' : 'POST'

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          nombre: formData.nombre,
          tipo: formData.tipo,
          cantidad_sesiones: parseInt(formData.cantidad_sesiones),
          valor_default: parseFloat(formData.valor_default),
          comision_default: parseFloat(formData.comision_default)
        })
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Error al guardar el servicio')
      }

      alert(isEditing ? 'Servicio actualizado exitosamente' : 'Servicio creado exitosamente')
      router.push('/services')
    } catch (error: any) {
      console.error('Error:', error)
      alert(error.message || 'Error al guardar el servicio')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-50 dark:bg-zinc-900">
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-orange-600 border-r-transparent"></div>
          <p className="mt-4 text-zinc-600 dark:text-zinc-400">Cargando...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-900 py-12 px-6">
      <div className="max-w-2xl mx-auto">
        <div className="mb-8">
          <Link
            href="/services"
            className="inline-flex items-center text-orange-600 hover:text-orange-700 dark:text-orange-400 dark:hover:text-orange-300 mb-4"
          >
            ← Volver a servicios
          </Link>
          <h1 className="text-3xl font-bold text-zinc-900 dark:text-zinc-50 mb-2">
            {isEditing ? 'Editar Servicio' : 'Crear Nuevo Servicio'}
          </h1>
          <p className="text-zinc-600 dark:text-zinc-400">
            {isEditing ? 'Modifica la información del servicio' : 'Completa la información del nuevo servicio'}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="bg-white dark:bg-zinc-800 rounded-lg shadow-md p-6 space-y-6">
          <div>
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
              Nombre del Servicio *
            </label>
            <input
              type="text"
              name="nombre"
              value={formData.nombre}
              onChange={handleInputChange}
              placeholder="Ej: Valoración, Sesión Individual, Paquete X5"
              className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-600 rounded-lg bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-50 focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
              Tipo de Servicio *
            </label>
            <select
              name="tipo"
              value={formData.tipo}
              onChange={handleTipoChange}
              className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-600 rounded-lg bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-50 focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              required
            >
              <option value="">Seleccionar tipo</option>
              <option value="valoracion">Valoración</option>
              <option value="individual">Individual</option>
              <option value="paquete">Paquete</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
              Cantidad de Sesiones *
            </label>
            <input
              type="number"
              name="cantidad_sesiones"
              value={formData.cantidad_sesiones}
              onChange={handleInputChange}
              min="1"
              disabled={formData.tipo !== 'paquete'}
              className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-600 rounded-lg bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-50 focus:ring-2 focus:ring-orange-500 focus:border-transparent disabled:bg-zinc-100 dark:disabled:bg-zinc-800 disabled:cursor-not-allowed"
              required
            />
            <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
              {formData.tipo === 'paquete' 
                ? 'Ingresa el número de sesiones del paquete (Ej: 5, 10, 15)' 
                : 'Para valoración e individual siempre es 1 sesión'}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                Valor por {formData.tipo === 'paquete' ? 'Sesión' : 'Servicio'} *
              </label>
              <input
                type="number"
                name="valor_default"
                value={formData.valor_default}
                onChange={handleInputChange}
                min="0"
                step="1000"
                placeholder="70000"
                className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-600 rounded-lg bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-50 focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                required
              />
              <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                {formData.tipo === 'paquete' 
                  ? 'Valor por cada sesión individual del paquete' 
                  : 'Valor total del servicio'}
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                Comisión por {formData.tipo === 'paquete' ? 'Sesión' : 'Servicio'} *
              </label>
              <input
                type="number"
                name="comision_default"
                value={formData.comision_default}
                onChange={handleInputChange}
                min="0"
                step="1000"
                placeholder="35000"
                className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-600 rounded-lg bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-50 focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                required
              />
              <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                {formData.tipo === 'paquete' 
                  ? 'Comisión por cada sesión individual del paquete' 
                  : 'Comisión total del servicio'}
              </p>
            </div>
          </div>

          {formData.tipo === 'paquete' && formData.cantidad_sesiones && formData.valor_default && formData.comision_default && (
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
              <h3 className="text-sm font-semibold text-blue-900 dark:text-blue-100 mb-2">
                💡 Resumen del Paquete
              </h3>
              <div className="space-y-1 text-sm text-blue-800 dark:text-blue-200">
                <p>
                  • Total sesiones: <span className="font-semibold">{formData.cantidad_sesiones}</span>
                </p>
                <p>
                  • Valor total: <span className="font-semibold">
                    ${(parseInt(formData.cantidad_sesiones) * parseFloat(formData.valor_default)).toLocaleString('es-CO')}
                  </span>
                </p>
                <p>
                  • Comisión total: <span className="font-semibold">
                    ${(parseInt(formData.cantidad_sesiones) * parseFloat(formData.comision_default)).toLocaleString('es-CO')}
                  </span>
                </p>
              </div>
            </div>
          )}

          <div className="flex justify-end space-x-4 pt-6">
            <Link
              href="/services"
              className="px-6 py-3 bg-zinc-200 dark:bg-zinc-700 text-zinc-900 dark:text-zinc-50 rounded-lg hover:bg-zinc-300 dark:hover:bg-zinc-600 font-medium transition-colors"
            >
              Cancelar
            </Link>
            <button
              type="submit"
              disabled={submitting}
              className="px-6 py-3 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:bg-zinc-400 disabled:cursor-not-allowed font-medium transition-colors"
            >
              {submitting ? 'Guardando...' : isEditing ? 'Actualizar Servicio' : 'Crear Servicio'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// Componente de fallback para Suspense
function CreateServiceLoading() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 dark:bg-zinc-900">
      <div className="text-center">
        <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-orange-600 border-r-transparent"></div>
        <p className="mt-4 text-zinc-600 dark:text-zinc-400">Cargando formulario...</p>
      </div>
    </div>
  )
}

// Componente principal exportado con Suspense
export default function CreateServicePage() {
  return (
    <Suspense fallback={<CreateServiceLoading />}>
      <CreateServiceForm />
    </Suspense>
  )
}