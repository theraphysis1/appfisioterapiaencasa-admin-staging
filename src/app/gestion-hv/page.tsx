'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

// Icono de flecha para volver
const ArrowLeftIcon = ({ className = "w-5 h-5" }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" />
  </svg>
)

// Icono de check para éxito
const CheckCircleIcon = ({ className = "w-5 h-5" }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
  </svg>
)

// Icono de alerta para error
const ExclamationCircleIcon = ({ className = "w-5 h-5" }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z" />
  </svg>
)

export default function GestionHVPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const [formData, setFormData] = useState({
    nombre: '',
    contacto: '',
    cedula: '',
    direccion: '',
    barrio: '',
    municipio: '',
    ciudad: '',
    especialidad: '',
    fecha_graduado: '',
    fecha_enviada_hv: '',
  })

  // Función para formatear fecha graduado (YYYY-MM-DD)
  const formatFechaGraduado = (fecha: string) => {
    if (!fecha) return ''
    const [year, month, day] = fecha.split('-')
    const meses = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']
    return `${day} ${meses[parseInt(month) - 1]} ${year}`
  }

  // Función para formatear fecha enviada HV (YYYY-MM-DD)
  const formatFechaEnviada = (fecha: string) => {
    if (!fecha) return ''
    const [year, month, day] = fecha.split('-')
    const meses = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']
    return `${day} ${meses[parseInt(month) - 1]} ${year}`
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    
    // Convertir nombre a mayúsculas automáticamente
    const finalValue = name === 'nombre' ? value.toUpperCase() : value
    
    setFormData(prev => ({ ...prev, [name]: finalValue }))
    // Limpiar mensaje al editar
    if (message) setMessage(null)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setMessage(null)

    try {
      const response = await fetch('/api/applicants', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })

      const data = await response.json()

      if (response.ok) {
        setMessage({ 
          type: 'success', 
          text: `✓ Aspirante "${formData.nombre}" registrado exitosamente` 
        })
        // Limpiar formulario
        setFormData({
          nombre: '',
          contacto: '',
          cedula: '',
          direccion: '',
          barrio: '',
          municipio: '',
          ciudad: '',
          especialidad: '',
          fecha_graduado: '',
          fecha_enviada_hv: '',
        })
      } else {
        // Error 409 = aspirante ya existe
        if (response.status === 409) {
          setMessage({ 
            type: 'error', 
            text: `✗ Ya existe un aspirante con cédula ${formData.cedula}: ${data.existing}` 
          })
        } else {
          setMessage({ 
            type: 'error', 
            text: `✗ ${data.error || 'Error al guardar aspirante'}` 
          })
        }
      }
    } catch (error) {
      console.error('Error submitting form:', error)
      setMessage({ 
        type: 'error', 
        text: '✗ Error de conexión. Intenta nuevamente.' 
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-900 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <Link
            href="/home"
            className="inline-flex items-center gap-2 text-slate-600 hover:text-slate-800 transition-colors mb-4"
          >
            <ArrowLeftIcon />
            <span className="font-medium">Volver al menú</span>
          </Link>
          <h1 className="text-3xl font-bold text-zinc-800 dark:text-zinc-100">
            Formulario Hojas de Vida
          </h1>
          <p className="text-zinc-600 dark:text-zinc-400 mt-2">
            Registra la información de los aspirantes a terapeutas
          </p>
        </div>

        {/* Mensaje de éxito/error */}
        {message && (
          <div
            className={`mb-6 p-4 rounded-lg flex items-center gap-3 ${
              message.type === 'success'
                ? 'bg-green-50 text-green-800 border border-green-200'
                : 'bg-red-50 text-red-800 border border-red-200'
            }`}
          >
            {message.type === 'success' ? (
              <CheckCircleIcon className="w-5 h-5 flex-shrink-0" />
            ) : (
              <ExclamationCircleIcon className="w-5 h-5 flex-shrink-0" />
            )}
            <span className="font-medium">{message.text}</span>
          </div>
        )}

        {/* Formulario */}
        <form onSubmit={handleSubmit} className="bg-white dark:bg-zinc-800 rounded-lg shadow-md p-6 space-y-6">
          {/* Nombre */}
          <div>
            <label htmlFor="nombre" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
              Nombre Completo <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              id="nombre"
              name="nombre"
              value={formData.nombre}
              onChange={handleChange}
              required
              className="w-full px-4 py-2 border border-zinc-300 dark:border-zinc-600 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-transparent dark:bg-zinc-700 dark:text-white uppercase"
              placeholder="Ej: JUAN PÉREZ GARCÍA"
            />
          </div>

          {/* Contacto */}
          <div>
            <label htmlFor="contacto" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
              Contacto (Teléfono/Email) <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              id="contacto"
              name="contacto"
              value={formData.contacto}
              onChange={handleChange}
              required
              className="w-full px-4 py-2 border border-zinc-300 dark:border-zinc-600 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-transparent dark:bg-zinc-700 dark:text-white"
              placeholder="Ej: 3001234567 o correo@ejemplo.com"
            />
          </div>

          {/* Cédula - NO OBLIGATORIA */}
          <div>
            <label htmlFor="cedula" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
              Cédula <span className="text-zinc-400 text-xs">(Opcional)</span>
            </label>
            <input
              type="text"
              id="cedula"
              name="cedula"
              value={formData.cedula}
              onChange={handleChange}
              className="w-full px-4 py-2 border border-zinc-300 dark:border-zinc-600 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-transparent dark:bg-zinc-700 dark:text-white"
              placeholder="Ej: 1234567890"
            />
          </div>

          {/* Dirección */}
          <div>
            <label htmlFor="direccion" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
              Dirección <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              id="direccion"
              name="direccion"
              value={formData.direccion}
              onChange={handleChange}
              required
              className="w-full px-4 py-2 border border-zinc-300 dark:border-zinc-600 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-transparent dark:bg-zinc-700 dark:text-white"
              placeholder="Ej: Calle 10 # 20-30, Medellín"
            />
          </div>

          {/* Barrio */}
          <div>
            <label htmlFor="barrio" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
              Barrio <span className="text-zinc-400 text-xs">(Opcional)</span>
            </label>
            <input
              type="text"
              id="barrio"
              name="barrio"
              value={formData.barrio}
              onChange={handleChange}
              className="w-full px-4 py-2 border border-zinc-300 dark:border-zinc-600 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-transparent dark:bg-zinc-700 dark:text-white"
              placeholder="Ej: El Poblado, Laureles, Envigado"
            />
          </div>

          {/* Municipio */}
          <div>
            <label htmlFor="municipio" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
              Municipio <span className="text-zinc-400 text-xs">(Opcional)</span>
            </label>
            <input
              type="text"
              id="municipio"
              name="municipio"
              value={formData.municipio}
              onChange={handleChange}
              className="w-full px-4 py-2 border border-zinc-300 dark:border-zinc-600 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-transparent dark:bg-zinc-700 dark:text-white"
              placeholder="Ej: Medellín, Envigado, Bello"
            />
          </div>

          {/* Ciudad */}
          <div>
            <label htmlFor="ciudad" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
              Ciudad <span className="text-zinc-400 text-xs">(Opcional)</span>
            </label>
            <input
              type="text"
              id="ciudad"
              name="ciudad"
              value={formData.ciudad}
              onChange={handleChange}
              className="w-full px-4 py-2 border border-zinc-300 dark:border-zinc-600 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-transparent dark:bg-zinc-700 dark:text-white"
              placeholder="Ej: Medellín, Bogotá, Cali"
            />
          </div>

          {/* Especialidad */}
          <div>
            <label htmlFor="especialidad" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
              Especialidad <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              id="especialidad"
              name="especialidad"
              value={formData.especialidad}
              onChange={handleChange}
              required
              className="w-full px-4 py-2 border border-zinc-300 dark:border-zinc-600 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-transparent dark:bg-zinc-700 dark:text-white"
              placeholder="Ej: Fisioterapia Deportiva"
            />
          </div>

          {/* Fecha Graduado */}
          <div>
            <label htmlFor="fecha_graduado" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
              Fecha de Graduación <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              id="fecha_graduado"
              name="fecha_graduado"
              value={formData.fecha_graduado}
              onChange={handleChange}
              required
              className="w-full px-4 py-2 border border-zinc-300 dark:border-zinc-600 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-transparent dark:bg-zinc-700 dark:text-white"
            />
            {formData.fecha_graduado && (
              <p className="mt-2 text-sm text-slate-600 dark:text-slate-400 font-medium">
                📅 {formatFechaGraduado(formData.fecha_graduado)}
              </p>
            )}
          </div>

          {/* Fecha Enviada HV */}
          <div>
            <label htmlFor="fecha_enviada_hv" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
              Fecha de Envío de HV <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              id="fecha_enviada_hv"
              name="fecha_enviada_hv"
              value={formData.fecha_enviada_hv}
              onChange={handleChange}
              required
              className="w-full px-4 py-2 border border-zinc-300 dark:border-zinc-600 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-transparent dark:bg-zinc-700 dark:text-white"
            />
            {formData.fecha_enviada_hv && (
              <p className="mt-2 text-sm text-slate-600 dark:text-slate-400 font-medium">
                📅 {formatFechaEnviada(formData.fecha_enviada_hv)}
              </p>
            )}
          </div>

          {/* Botón Submit */}
          <div className="pt-4">
            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 bg-slate-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-500 focus:ring-offset-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <span>Guardando...</span>
                </>
              ) : (
                <>
                  <CheckCircleIcon className="w-5 h-5" />
                  <span>Guardar Aspirante</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}