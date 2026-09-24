'use client'

import { useState, useEffect, useRef } from 'react'

export const useIntersectionObserver = (options = {}) => {
  const [isVisible, setIsVisible] = useState(false)
  const [hasBeenVisible, setHasBeenVisible] = useState(false)
  const elementRef = useRef(null)

  useEffect(() => {
    const element = elementRef.current
    if (!element) return

    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsVisible(entry.isIntersecting)
        
        // Once visible, keep it rendered
        if (entry.isIntersecting && !hasBeenVisible) {
          setHasBeenVisible(true)
        }
      },
      {
        threshold: options.threshold || 0.1,
        rootMargin: options.rootMargin || '50px',
        ...options,
      }
    )

    observer.observe(element)

    return () => {
      observer.disconnect()
    }
  }, [options.threshold, options.rootMargin, hasBeenVisible])

  return { elementRef, isVisible, hasBeenVisible }
}

export default useIntersectionObserver
