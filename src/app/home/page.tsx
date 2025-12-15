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

        <div className="flex justify-center">
          <Link
            href="/therapists"
            className="flex h-14 items-center justify-center rounded-lg bg-blue-600 px-8 text-base font-semibold text-white transition-colors hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            Lista de Terapeutas
          </Link>
        </div>
      </div>
    </div>
  )
}