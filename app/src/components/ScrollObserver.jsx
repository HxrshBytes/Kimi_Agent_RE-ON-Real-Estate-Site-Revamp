import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'

function observeElements() {
  const elements = document.querySelectorAll('.reveal-on-scroll:not(.revealed)')
  if (elements.length === 0) return null

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('revealed')
          observer.unobserve(entry.target)
        }
      })
    },
    { threshold: 0.01, rootMargin: '120px 0px 120px 0px' }
  )

  const vHeight = window.innerHeight || document.documentElement.clientHeight || 800

  elements.forEach((el) => {
    // If mobile or already in viewport, immediately reveal
    if (window.innerWidth <= 768) {
      el.classList.add('revealed')
      return
    }

    const rect = el.getBoundingClientRect()
    if (rect.top < vHeight + 120 && rect.bottom > -100) {
      el.classList.add('revealed')
    } else {
      observer.observe(el)
    }
  })
  return observer
}

export default function ScrollObserver() {
  const { pathname } = useLocation()

  useEffect(() => {
    let observer = observeElements()

    const timer = setTimeout(() => {
      observer?.disconnect()
      observer = observeElements()
    }, 150)

    // MutationObserver: re-run when new DOM nodes appear (e.g. after login state change)
    const mutation = new MutationObserver(() => {
      const unrevealed = document.querySelectorAll('.reveal-on-scroll:not(.revealed)').length
      if (unrevealed > 0) {
        observer?.disconnect()
        observer = observeElements()
      }
    })
    mutation.observe(document.body, { childList: true, subtree: true })

    return () => {
      clearTimeout(timer)
      observer?.disconnect()
      mutation.disconnect()
    }
  }, [pathname])

  return null
}
