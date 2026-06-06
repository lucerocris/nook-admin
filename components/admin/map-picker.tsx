"use client"

import * as React from "react"
import mapboxgl from "mapbox-gl"
import "mapbox-gl/dist/mapbox-gl.css"

mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN!

type Props = {
  lat: number
  lng: number
  onChange: (lat: number, lng: number) => void
  disabled?: boolean
}

export function MapPicker({ lat, lng, onChange, disabled }: Props) {
  const mapContainer = React.useRef<HTMLDivElement>(null)
  const map = React.useRef<mapboxgl.Map | null>(null)
  const marker = React.useRef<mapboxgl.Marker | null>(null)

  // Default center — Cebu City
  const defaultLat = lat || 10.3157
  const defaultLng = lng || 123.8854

  React.useEffect(() => {
    if (!mapContainer.current || map.current) return

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: "mapbox://styles/mapbox/streets-v12",
      center: [defaultLng, defaultLat],
      zoom: 15,
    })

    // Add navigation controls (zoom in/out)
    map.current.addControl(new mapboxgl.NavigationControl(), "top-right")

    // Add draggable marker at current position
    marker.current = new mapboxgl.Marker({ draggable: !disabled })
      .setLngLat([defaultLng, defaultLat])
      .addTo(map.current)

    // On marker drag end — update lat/lng
    marker.current.on("dragend", () => {
      if (!marker.current) return
      const lngLat = marker.current.getLngLat()
      onChange(lngLat.lat, lngLat.lng)
    })

    // On map click — move marker to clicked position
    if (!disabled) {
      map.current.on("click", (e) => {
        if (!marker.current) return
        marker.current.setLngLat(e.lngLat)
        onChange(e.lngLat.lat, e.lngLat.lng)
      })
    }

    return () => {
      map.current?.remove()
      map.current = null
    }
  }, [defaultLat, defaultLng, disabled, onChange])

  // When lat/lng props change externally (e.g. from geocoding),
  // move the marker and re-center the map.
  React.useEffect(() => {
    if (!map.current || !marker.current) return
    if (!lat || !lng) return
    marker.current.setLngLat([lng, lat])
    map.current.flyTo({
      center: [lng, lat],
      zoom: 16,
      duration: 1000,
    })
  }, [lat, lng])

  return (
    <div
      ref={mapContainer}
      className="h-64 w-full overflow-hidden rounded-lg border"
    />
  )
}
