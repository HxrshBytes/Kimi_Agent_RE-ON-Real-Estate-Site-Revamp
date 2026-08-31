import { useInView } from '../hooks/useInView'

export default function ScrollReveal({
  children,
  className = '',
  delay = 0,
  direction = 'up',
  as: Tag = 'div',
}) {
  const [ref, inView] = useInView()
  const delayClass = delay ? ` reveal-delay-${Math.min(delay, 6)}` : ''
  const dirClass = direction !== 'up' ? ` reveal--${direction}` : ''

  return (
    <Tag
      ref={ref}
      className={`reveal-on-scroll${dirClass}${delayClass}${inView ? ' revealed' : ''} ${className}`.trim()}
      style={delay > 6 ? { transitionDelay: `${delay * 0.1}s` } : undefined}
    >
      {children}
    </Tag>
  )
}
