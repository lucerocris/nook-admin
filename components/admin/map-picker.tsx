"use client"

import * as React from "react"
import mapboxgl from "mapbox-gl"
import { useTheme } from "next-themes"
import "mapbox-gl/dist/mapbox-gl.css"

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN ?? ""

const MAP_STYLE_LIGHT = "mapbox://styles/mapbox/streets-v12"
const MAP_STYLE_DARK = "mapbox://styles/mapbox/dark-v11"

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

  const { resolvedTheme } = useTheme()
  const mapStyle = resolvedTheme === "dark" ? MAP_STYLE_DARK : MAP_STYLE_LIGHT
  const mapStyleRef = React.useRef(mapStyle)

  // Restyle the live map on a theme change instead of rebuilding it, so the
  // zoom and marker position survive the toggle.
  React.useEffect(() => {
    if (mapStyleRef.current === mapStyle) return
    mapStyleRef.current = mapStyle
    map.current?.setStyle(mapStyle)
  }, [mapStyle])

  // Default center — Cebu City
  const defaultLat = lat || 10.3157
  const defaultLng = lng || 123.8854

  React.useEffect(() => {
    if (!MAPBOX_TOKEN) return
    if (!mapContainer.current || map.current) return

    mapboxgl.accessToken = MAPBOX_TOKEN

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: mapStyleRef.current,
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

  if (!MAPBOX_TOKEN) {
    return (
      <div className="flex h-64 w-full flex-col items-center justify-center gap-1 rounded-lg border border-dashed bg-muted/40 p-4 text-center">
        <p className="text-sm font-medium">Map unavailable</p>
        <p className="text-xs text-muted-foreground">
          Set <code>NEXT_PUBLIC_MAPBOX_TOKEN</code> in <code>.env.local</code> to
          enable the map. You can still set coordinates manually below.
        </p>
      </div>
    )
  }

  return (
    <div
      ref={mapContainer}
      className="h-64 w-full overflow-hidden rounded-lg border"
    />
  )
}
