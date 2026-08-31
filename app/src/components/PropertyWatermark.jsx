import React from 'react'
import './PropertyWatermark.css'

/**
 * REON-GO Property Watermark Overlay
 * Provides clean, unclipped, perfectly centered brand protection across all property photos.
 */
export default React.memo(function PropertyWatermark({
  variant = 'card',
  className = ''
}) {
  return (
    <div
      className={`property-watermark-overlay property-watermark-overlay--${variant} ${className}`}
      aria-hidden="true"
    >
      <img
        src="/images/reon-watermark.png?v=5"
        alt="RE-ON"
        className="property-watermark__img"
        loading="lazy"
      />
    </div>
  )
})
