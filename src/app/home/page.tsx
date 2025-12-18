import Link from 'next/link'

export default function HomePage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 dark:bg-zinc-900">
      <div className="w-full max-w-4xl px-6 py-12">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-zinc-900 dark:text-zinc-50 mb-4">
            Panel de Administración
          </h1>
          <p className="text-lg text-zinc-600 dark:text-zinc-400">
            Fisioterapia en Casa
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            href="/therapists/create"
            className="flex h-14 items-center justify-center rounded-lg bg-green-600 px-8 text-base font-semibold text-white transition-colors hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2"
          >
            Crear Terapeuta
          </Link>
          <Link
            href="/therapists"
            className="flex h-14 items-center justify-center rounded-lg bg-blue-600 px-8 text-base font-semibold text-white transition-colors hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            Lista de Terapeutas
          </Link>
          <Link
            href="/services"
            className="flex h-14 items-center justify-center rounded-lg bg-orange-600 px-8 text-base font-semibold text-white transition-colors hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2"
          >
            Gestionar Servicios
          </Link>
          <Link
            href="/patients/create"
            className="flex h-14 items-center justify-center rounded-lg bg-purple-600 px-8 text-base font-semibold text-white transition-colors hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2"
          >
            Agendar Pacientes
          </Link>
          <Link
            href="/appointments"
            className="flex h-14 items-center justify-center rounded-lg bg-indigo-600 px-8 text-base font-semibold text-white transition-colors hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
          >
            Gestionar Citas
          </Link>
          <Link
            href="/packages"
            className="flex h-14 items-center justify-center rounded-lg bg-pink-600 px-8 text-base font-semibold text-white transition-colors hover:bg-pink-700 focus:outline-none focus:ring-2 focus:ring-pink-500 focus:ring-offset-2"
          >
            Gestionar Paquetes
          </Link>
          <Link
            href="/dashboard"
            className="flex h-14 items-center justify-center rounded-lg bg-teal-600 px-8 text-base font-semibold text-white transition-colors hover:bg-teal-700 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2"
          >
            Dashboard
          </Link>
          <Link
            href="/holidays"
            className="flex h-14 items-center justify-center rounded-lg bg-red-600 px-8 text-base font-semibold text-white transition-colors hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
          >
            Días Festivos
          </Link>
        </div>
      </div>
    </div>
  )
}