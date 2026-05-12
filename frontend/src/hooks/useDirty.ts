import { useEffect, useRef, useState } from 'react'

export function useDirty(value: string) {
  const original = useRef(value)
  const [dirty, setDirty] = useState(false)

  useEffect(() => {
    setDirty(value !== original.current)
  }, [value])

  const markClean = (newValue: string) => {
    original.current = newValue
    setDirty(false)
  }

  return { dirty, markClean }
}
