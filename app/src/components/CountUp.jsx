import { useEffect, useState } from 'react'
import { useInView } from '../hooks/useInView'

function parseValue(str) {
  const match = String(str).match(/^([\d,]+(?:\.\d+)?)(.*)$/)
  if (!match) return { target: 0, suffix: str }
  return { target: parseFloat(match[1].replace(/,/g, '')), suffix: match[2] }
}

function easeOutExpo(t) {
  return t === 1 ? 1 : 1 - Math.pow(2, -10 * t)
}

export default function CountUp({ value, duration = 1800, className }) {
  const [ref, inView] = useInView({ threshold: 0.3 })
  const { target, suffix } = parseValue(value)
  const [display, setDisplay] = useState(0)

  useEffect(() => {
    if (!inView) return
    let start = null
    let frame

    const step = (ts) => {
      if (!start) start = ts
      const progress = Math.min((ts - start) / duration, 1)
      setDisplay(Math.round(easeOutExpo(progress) * target))
      if (progress < 1) frame = requestAnimationFrame(step)
    }

    frame = requestAnimationFrame(step)
    return () => cancelAnimationFrame(frame)
  }, [inView, target, duration])

  return (
    <span ref={ref} className={className}>
      {display}{suffix}
    </span>
  )
}
