import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const { address } = await request.json()

    if (!address) {
      return NextResponse.json(
        { error: 'La dirección es requerida' },
        { status: 400 }
      )
    }

    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY

    if (!apiKey) {
      return NextResponse.json(
        { error: 'API Key de Google Maps no configurada' },
        { status: 500 }
      )
    }

    // Llamar a Google Geocoding API
    const encodedAddress = encodeURIComponent(address)
    const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodedAddress}&key=${apiKey}`

    const response = await fetch(url)
    const data = await response.json()

    if (data.status === 'OK' && data.results && data.results.length > 0) {
      const location = data.results[0].geometry.location
      
      return NextResponse.json({
        success: true,
        lat: location.lat,
        lng: location.lng,
        formatted_address: data.results[0].formatted_address
      })
    } else if (data.status === 'ZERO_RESULTS') {
      return NextResponse.json(
        { error: 'No se encontraron coordenadas para esta dirección' },
        { status: 404 }
      )
    } else {
      return NextResponse.json(
        { error: `Error de geocodificación: ${data.status}` },
        { status: 400 }
      )
    }
  } catch (error) {
    console.error('Error en geocoding:', error)
    return NextResponse.json(
      { error: 'Error al obtener coordenadas' },
      { status: 500 }
    )
  }
}
