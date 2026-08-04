'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'

interface TherapistData {
  nombre: string
  apellido: string
  email: string
  contacto: string
  cedula: string
  placa_moto: string
}

export default function EditTherapistPage() {
  const router = useRouter()
  const params = useParams()
  const therapistId = params.id as string

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [formData, setFormData] = useState<TherapistData>({
    nombre: '',
    apellido: '',
    email: '',
    contacto: '',
    cedula: '',
    placa_moto: '',
  })

  useEffect(() => {
    fetchTherapist()
  }, [])

  const fetchTherapist = async () => {
    try {
      const response = await fetch(`/api/therapists/${therapistId}`)
      const data = await response.json()

      if (!response.ok) {
        setError(data.error || 'Error al cargar el terapeuta')
        setLoading(false)
        return
      }

      setFormData({
        nombre: data.therapist.nombre,
        apellido: data.therapist.apellido,
        email: data.therapist.email,
        contacto: data.therapist.contacto,
        cedula: data.therapist.cedula,
        placa_moto: data.therapist.placa_moto || '',
      })
      setLoading(false)
    } catch (err) {
      console.error('Fetch error:', err)
      setError('Error de conexión')
      setLoading(false)
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSaving(true)

    try {
      const response = await fetch(`/api/therapists/${therapistId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error || 'Error al actualizar el terapeuta')
        setSaving(false)
        return
      }

      router.push('/therapists')
    } catch (err) {
      console.error('Update error:', err)
      setError('Error de conexión')
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-50 dark:bg-zinc-900 flex items-center justify-center">
        <div className="text-lg text-zinc-600 dark:text-zinc-400">Cargando...</div>
      </div>
    )
  }

  if (error && !formData.nombre) {
    return (
      <div className="min-h-screen bg-zinc-50 dark:bg-zinc-900 flex items-center justify-center">
        <div className="text-lg text-red-600 dark:text-red-400">{error}</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-900 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-2xl mx-auto">
        <div className="mb-8">
          <Link
            href="/therapists"
            className="text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 font-medium"
          >
            ← Volver a la lista
          </Link>
        </div>

        <div className="bg-white dark:bg-zinc-800 rounded-lg shadow-lg p-8">
          <h1 className="text-3xl font-bold text-zinc-900 dark:text-zinc-50 mb-8">
            Editar Terapeuta
          </h1>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label htmlFor="nombre" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                  Nombre *
                </label>
                <input
                  id="nombre"
                  name="nombre"
                  type="text"
                  value={formData.nombre}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-2 border border-zinc-300 dark:border-zinc-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-zinc-700 text-zinc-900 dark:text-zinc-50"
                />
              </div>

              <div>
                <label htmlFor="apellido" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                  Apellido *
                </label>
                <input
                  id="apellido"
                  name="apellido"
                  type="text"
                  value={formData.apellido}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-2 border border-zinc-300 dark:border-zinc-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-zinc-700 text-zinc-900 dark:text-zinc-50"
                />
              </div>
            </div>

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                Email *
              </label>
              <input
                id="email"
                name="email"
                type="email"
                value={formData.email}
                onChange={handleChange}
                required
                className="w-full px-4 py-2 border border-zinc-300 dark:border-zinc-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-zinc-700 text-zinc-900 dark:text-zinc-50"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label htmlFor="contacto" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                  Contacto (Celular) *
                </label>
                <input
                  id="contacto"
                  name="contacto"
                  type="tel"
                  value={formData.contacto}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-2 border border-zinc-300 dark:border-zinc-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-zinc-700 text-zinc-900 dark:text-zinc-50"
                  placeholder="3001234567"
                />
              </div>

              <div>
                <label htmlFor="cedula" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                  Cédula *
                </label>
                <input
                  id="cedula"
                  name="cedula"
                  type="text"
                  value={formData.cedula}
                  onChange={handleChange}
                  required
                  disabled
                  className="w-full px-4 py-2 border border-zinc-300 dark:border-zinc-600 rounded-lg bg-zinc-100 dark:bg-zinc-700 text-zinc-500 dark:text-zinc-400 cursor-not-allowed"
                />
                <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                  La cédula no se puede modificar
                </p>
              </div>
            </div>

            <div>
              <label htmlFor="placa_moto" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                Placa Moto
              </label>
              <input
                id="placa_moto"
                name="placa_moto"
                type="text"
                value={formData.placa_moto}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-zinc-300 dark:border-zinc-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-zinc-700 text-zinc-900 dark:text-zinc-50"
                placeholder="ABC123"
              />
            </div>

            {error && (
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 px-4 py-3 rounded-lg text-sm">
                {error}
              </div>
            )}

            <div className="flex gap-4">
              <button
                type="submit"
                disabled={saving}
                className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-semibold py-3 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              >
                {saving ? 'Guardando...' : 'Guardar Cambios'}
              </button>
              
              <Link
                href="/therapists"
                className="flex-1 bg-zinc-200 hover:bg-zinc-300 dark:bg-zinc-700 dark:hover:bg-zinc-600 text-zinc-900 dark:text-zinc-50 font-semibold py-3 rounded-lg transition-colors text-center"
              >
                Cancelar
              </Link>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}