'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

interface Therapist {
  id: string
  nombre: string
  apellido: string
  email: string
  contacto: string
  cedula: string
  placa_moto: string | null
  created_at: string
}

export default function TherapistsPage() {
  const [therapists, setTherapists] = useState<Therapist[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    fetchTherapists()
  }, [])

  const fetchTherapists = async () => {
    try {
      const response = await fetch('/api/therapists')
      const data = await response.json()

      if (!response.ok) {
        setError(data.error || 'Error al cargar terapeutas')
        setLoading(false)
        return
      }

      setTherapists(data.therapists || [])
      setLoading(false)
    } catch (err) {
      console.error('Fetch error:', err)
      setError('Error de conexión')
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-50 dark:bg-zinc-900 flex items-center justify-center">
        <div className="text-lg text-zinc-600 dark:text-zinc-400">Cargando terapeutas...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-zinc-50 dark:bg-zinc-900 flex items-center justify-center">
        <div className="text-lg text-red-600 dark:text-red-400">{error}</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-900 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8 flex justify-between items-center">
          <div>
            <Link
              href="/home"
              className="text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 font-medium mb-4 inline-block"
            >
              ← Volver al Home
            </Link>
            <h1 className="text-3xl font-bold text-zinc-900 dark:text-zinc-50">
              Lista de Terapeutas
            </h1>
          </div>
          <Link
            href="/therapists/create"
            className="bg-green-600 hover:bg-green-700 text-white font-semibold px-6 py-3 rounded-lg transition-colors"
          >
            + Crear Terapeuta
          </Link>
        </div>

        {therapists.length === 0 ? (
          <div className="bg-white dark:bg-zinc-800 rounded-lg shadow p-8 text-center">
            <p className="text-zinc-600 dark:text-zinc-400">No hay terapeutas registrados</p>
            <Link
              href="/therapists/create"
              className="inline-block mt-4 text-blue-600 hover:text-blue-700 dark:text-blue-400 font-medium"
            >
              Crear el primer terapeuta
            </Link>
          </div>
        ) : (
          <div className="bg-white dark:bg-zinc-800 rounded-lg shadow overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-zinc-200 dark:divide-zinc-700">
                <thead className="bg-zinc-50 dark:bg-zinc-900">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                      Nombre
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                      Email
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                      Contacto
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                      Cédula
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                      Placa Moto
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-zinc-800 divide-y divide-zinc-200 dark:divide-zinc-700">
                  {therapists.map((therapist) => (
                    <tr key={therapist.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-700/50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-zinc-900 dark:text-zinc-50">
                          {therapist.nombre} {therapist.apellido}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-zinc-600 dark:text-zinc-400">{therapist.email}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-zinc-600 dark:text-zinc-400">{therapist.contacto}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-zinc-600 dark:text-zinc-400">{therapist.cedula}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-zinc-600 dark:text-zinc-400">
                          {therapist.placa_moto || '-'}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}