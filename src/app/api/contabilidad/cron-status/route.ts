// src/app/api/contabilidad/cron-status/route.ts

import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('system_cron_status')
      .select('*')
      .eq('id', 1)
      .maybeSingle()

    if (error) throw error

    return NextResponse.json({
      ultima_ejecucion: data?.ultima_ejecucion || null,
      mes_procesado: data?.mes_procesado || null,
      anio_procesado: data?.anio_procesado || null
    })

  } catch (error) {
    console.error('Error GET cron-status:', error)
    return NextResponse.json(
      { error: 'Error al obtener el estado del cron' },
      { status: 500 }
    )
  }
}