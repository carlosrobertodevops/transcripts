'use client'

import { useEffect, useRef, useState, type RefObject } from 'react'

interface UseProximityOptions {
  radius?: number
}

interface UseProximityReturn<T extends HTMLElement> {
  ref: RefObject<T | null>
  proximity: number
}

export const useProximity = <T extends HTMLElement = HTMLDivElement>(
  options: UseProximityOptions = {},
): UseProximityReturn<T> => {
  const { radius = 220 } = options
  const ref = useRef<T>(null)
  const [proximity, setProximity] = useState(0)

  useEffect(() => {
    if (typeof window === 'undefined') return
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (reduced) return

    let rafId = 0
    let lastX = 0
    let lastY = 0
    let pending = false

    const compute = () => {
      rafId = 0
      pending = false
      const el = ref.current
      if (!el) return
      const rect = el.getBoundingClientRect()
      const dx = Math.max(rect.left - lastX, 0, lastX - rect.right)
      const dy = Math.max(rect.top - lastY, 0, lastY - rect.bottom)
      const dist = Math.hypot(dx, dy)
      const next = dist >= radius ? 0 : 1 - dist / radius
      setProximity((prev) => (Math.abs(prev - next) < 0.01 ? prev : next))
    }

    const onMove = (ev: PointerEvent) => {
      lastX = ev.clientX
      lastY = ev.clientY
      if (pending) return
      pending = true
      rafId = requestAnimationFrame(compute)
    }

    const onLeave = () => setProximity(0)

    window.addEventListener('pointermove', onMove, { passive: true })
    window.addEventListener('pointerleave', onLeave, { passive: true })
    return () => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerleave', onLeave)
      if (rafId) cancelAnimationFrame(rafId)
    }
  }, [radius])

  return { ref, proximity }
}
