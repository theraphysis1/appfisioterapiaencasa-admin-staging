'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
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
  const router = useRouter()

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
          <div className="space-y-4">
            {therapists.map((therapist) => (
              <div
                key={therapist.id}
                className="bg-white dark:bg-zinc-800 rounded-lg shadow-sm p-4 flex items-start gap-4"
              >
                {/* Avatar */}
                <div className="flex-shrink-0">
                  <div className="w-16 h-16 bg-zinc-300 dark:bg-zinc-600 rounded-full flex items-center justify-center">
                    <svg className="w-8 h-8 text-zinc-600 dark:text-zinc-300" fill="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
                    </svg>
                  </div>
                </div>

                {/* Información */}
                <div className="flex-1 min-w-0">
                  <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50 mb-1">
                    {therapist.nombre} {therapist.apellido}
                  </h3>
                  <div className="space-y-0.5 text-sm text-zinc-600 dark:text-zinc-400">
                    <p>Contacto: {therapist.contacto}</p>
                    <p>Cédula: {therapist.cedula}</p>
                    <p>Placa: {therapist.placa_moto || 'No registrada'}</p>
                  </div>
                </div>

                {/* Botones de acción */}
                <div className="flex-shrink-0 flex gap-3">
                  <button
                    onClick={() => router.push(`/therapists/${therapist.id}/edit`)}
                    className="text-blue-500 hover:text-blue-600 dark:text-blue-400 dark:hover:text-blue-300 transition-colors"
                    title="Editar terapeuta"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                  </button>
                  <button
                    onClick={() => {/* Eliminar */}}
                    className="text-red-500 hover:text-red-600 dark:text-red-400 dark:hover:text-red-300 transition-colors"
                    title="Eliminar terapeuta"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
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