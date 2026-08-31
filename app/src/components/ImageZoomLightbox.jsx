import { useState, useEffect, useRef, useCallback } from 'react'
import {
  X,
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Maximize2,
  Minimize2,
  Image as ImageIcon
} from 'lucide-react'
import { useMaskedImages } from '../utils/useMaskedImage.js'
import { formatDirectImageUrl } from '../utils/mediaUrlUtils.js'
import PropertyWatermark from './PropertyWatermark.jsx'
import './ImageZoomLightbox.css'

export default function ImageZoomLightbox({
  isOpen,
  onClose,
  images = [],
  initialIndex = 0,
  title = 'Property Gallery'
}) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex)
  const [scale, setScale] = useState(1)
  const [position, setPosition] = useState({ x: 0, y: 0 })
  const [isDragging, setIsDragging] = useState(false)
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 })
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [touchStartDist, setTouchStartDist] = useState(null)
  const [touchStartPos, setTouchStartPos] = useState(null)

  const modalRef = useRef(null)
  const imageRef = useRef(null)
  const thumbsRef = useRef(null)

  // Use masked blob object URLs to hide raw image URLs from DOM/Inspect Element
  const maskedImages = useMaskedImages(images)

  // Sync index when initialIndex changes or modal opens
  useEffect(() => {
    if (isOpen) {
      setCurrentIndex(initialIndex)
      setScale(1)
      setPosition({ x: 0, y: 0 })
    }
  }, [isOpen, initialIndex])

  // Reset zoom & pan when image changes
  const resetZoom = useCallback(() => {
    setScale(1)
    setPosition({ x: 0, y: 0 })
  }, [])

  const handleNext = useCallback(() => {
    if (images.length <= 1) return
    setCurrentIndex((prev) => (prev + 1) % images.length)
    resetZoom()
  }, [images.length, resetZoom])

  const handlePrev = useCallback(() => {
    if (images.length <= 1) return
    setCurrentIndex((prev) => (prev - 1 + images.length) % images.length)
    resetZoom()
  }, [images.length, resetZoom])

  const handleZoomIn = () => {
    setScale((prev) => Math.min(4, Number((prev + 0.5).toFixed(1))))
  }

  const handleZoomOut = () => {
    setScale((prev) => {
      const next = Math.max(1, Number((prev - 0.5).toFixed(1)))
      if (next === 1) setPosition({ x: 0, y: 0 })
      return next
    })
  }

  const handleDoubleTap = (e) => {
    e.preventDefault()
    e.stopPropagation()
    if (scale > 1) {
      resetZoom()
    } else {
      setScale(2.2)
      setPosition({ x: 0, y: 0 })
    }
  }

  // Scroll active thumbnail into view
  useEffect(() => {
    if (!isOpen || !thumbsRef.current) return
    const activeThumb = thumbsRef.current.children[currentIndex]
    if (activeThumb) {
      activeThumb.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' })
    }
  }, [currentIndex, isOpen])

  // Prevent background scrolling when open
  useEffect(() => {
    if (isOpen) {
      const originalOverflow = document.body.style.overflow
      document.body.style.overflow = 'hidden'
      return () => {
        document.body.style.overflow = originalOverflow
      }
    }
  }, [isOpen])

  // Fullscreen toggle
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      if (modalRef.current?.requestFullscreen) {
        modalRef.current.requestFullscreen().catch(() => {})
        setIsFullscreen(true)
      }
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen().catch(() => {})
        setIsFullscreen(false)
      }
    }
  }

  useEffect(() => {
    const handleFsChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement))
    }
    document.addEventListener('fullscreenchange', handleFsChange)
    return () => document.removeEventListener('fullscreenchange', handleFsChange)
  }, [])

  // Keyboard navigation
  useEffect(() => {
    if (!isOpen) return
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onClose()
      } else if (e.key === 'ArrowRight') {
        handleNext()
      } else if (e.key === 'ArrowLeft') {
        handlePrev()
      } else if (e.key === '+' || e.key === '=') {
        handleZoomIn()
      } else if (e.key === '-') {
        handleZoomOut()
      } else if (e.key === '0' || e.key.toLowerCase() === 'r') {
        resetZoom()
      } else if (e.key.toLowerCase() === 'f') {
        toggleFullscreen()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, handleNext, handlePrev, resetZoom, onClose])

  // Mouse wheel zoom
  const handleWheel = (e) => {
    e.preventDefault()
    if (e.deltaY < 0) {
      setScale((prev) => Math.min(4, Number((prev + 0.25).toFixed(2))))
    } else {
      setScale((prev) => {
        const next = Math.max(1, Number((prev - 0.25).toFixed(2)))
        if (next === 1) setPosition({ x: 0, y: 0 })
        return next
      })
    }
  }

  // Mouse Drag / Pan when zoomed
  const handleMouseDown = (e) => {
    if (scale <= 1) return
    e.preventDefault()
    setIsDragging(true)
    setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y })
  }

  const handleMouseMove = (e) => {
    if (!isDragging || scale <= 1) return
    e.preventDefault()
    const maxBound = (scale - 1) * 350
    const newX = e.clientX - dragStart.x
    const newY = e.clientY - dragStart.y
    setPosition({
      x: Math.max(-maxBound, Math.min(maxBound, newX)),
      y: Math.max(-maxBound, Math.min(maxBound, newY))
    })
  }

  const handleMouseUp = () => {
    setIsDragging(false)
  }

  // Touch handlers for mobile (Pinch zoom & Pan / Swipe)
  const handleTouchStart = (e) => {
    if (e.touches.length === 2) {
      // Pinch to zoom start
      const dist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      )
      setTouchStartDist(dist)
    } else if (e.touches.length === 1) {
      setTouchStartPos({
        x: e.touches[0].clientX - position.x,
        y: e.touches[0].clientY - position.y,
        rawX: e.touches[0].clientX,
        rawY: e.touches[0].clientY
      })
      setIsDragging(true)
    }
  }

  const handleTouchMove = (e) => {
    if (e.touches.length === 2 && touchStartDist) {
      // Pinch zooming
      const dist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      )
      const factor = dist / touchStartDist
      setScale((prev) => Math.min(4, Math.max(1, Number((prev * factor).toFixed(2)))))
      setTouchStartDist(dist)
    } else if (e.touches.length === 1 && isDragging && touchStartPos && scale > 1) {
      // Pan when zoomed
      const maxBound = (scale - 1) * 300
      const newX = e.touches[0].clientX - touchStartPos.x
      const newY = e.touches[0].clientY - touchStartPos.y
      setPosition({
        x: Math.max(-maxBound, Math.min(maxBound, newX)),
        y: Math.max(-maxBound, Math.min(maxBound, newY))
      })
    }
  }

  const handleTouchEnd = (e) => {
    if (scale === 1 && touchStartPos && e.changedTouches.length === 1) {
      const deltaX = e.changedTouches[0].clientX - touchStartPos.rawX
      const deltaY = e.changedTouches[0].clientY - touchStartPos.rawY
      if (Math.abs(deltaX) > 50 && Math.abs(deltaY) < 80) {
        if (deltaX < 0) handleNext()
        else handlePrev()
      }
    }
    setIsDragging(false)
    setTouchStartDist(null)
    setTouchStartPos(null)
  }

  if (!isOpen || !images || images.length === 0) return null

  const displayImages = maskedImages.length === images.length ? maskedImages : images
  const currentImage = displayImages[currentIndex] || displayImages[0] || images[currentIndex] || images[0]

  return (
    <div
      className="img-lightbox"
      ref={modalRef}
      role="dialog"
      aria-modal="true"
      aria-label="Image Zoom Lightbox"
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onContextMenu={(e) => e.preventDefault()}
    >
      {/* Background Overlay */}
      <div className="img-lightbox__backdrop" onClick={onClose} />

      {/* Header Bar */}
      <div className="img-lightbox__header">
        <div className="img-lightbox__meta">
          <span className="img-lightbox__title">
            <ImageIcon size={16} /> {title}
          </span>
          <span className="img-lightbox__counter">
            {currentIndex + 1} / {images.length}
          </span>
        </div>

        {/* Toolbar Controls */}
        <div className="img-lightbox__actions">
          <div className="img-lightbox__zoom-group">
            <button
              type="button"
              className="img-lightbox__btn"
              onClick={handleZoomOut}
              disabled={scale <= 1}
              title="Zoom Out (-)"
              aria-label="Zoom out"
            >
              <ZoomOut size={17} />
            </button>
            <span className={`img-lightbox__zoom-indicator ${scale > 1 ? 'is-active' : ''}`}>
              {Math.round(scale * 100)}%
            </span>
            <button
              type="button"
              className="img-lightbox__btn"
              onClick={handleZoomIn}
              disabled={scale >= 4}
              title="Zoom In (+)"
              aria-label="Zoom in"
            >
              <ZoomIn size={17} />
            </button>
            {scale > 1 && (
              <button
                type="button"
                className="img-lightbox__btn img-lightbox__btn--reset"
                onClick={resetZoom}
                title="Reset Zoom (0 / R)"
                aria-label="Reset zoom"
              >
                <RotateCcw size={15} />
              </button>
            )}
          </div>

          <div className="img-lightbox__divider" />

          <button
            type="button"
            className="img-lightbox__btn"
            onClick={toggleFullscreen}
            title="Toggle Fullscreen (F)"
            aria-label="Fullscreen"
          >
            {isFullscreen ? <Minimize2 size={17} /> : <Maximize2 size={17} />}
          </button>
          <button
            type="button"
            className="img-lightbox__btn img-lightbox__btn--close"
            onClick={onClose}
            title="Close (Esc)"
            aria-label="Close"
          >
            <X size={19} />
          </button>
        </div>
      </div>

      {/* Main Image Stage with Anti-Copy Shield */}
      <div
        className={`img-lightbox__stage ${scale > 1 ? 'is-zoomed' : ''} ${isDragging ? 'is-dragging' : ''}`}
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onDoubleClick={handleDoubleTap}
        onContextMenu={(e) => e.preventDefault()}
      >
        <img
          ref={imageRef}
          src={currentImage}
          alt={`${title} - view ${currentIndex + 1}`}
          className="img-lightbox__img"
          style={{
            transform: `translate3d(${position.x}px, ${position.y}px, 0) scale(${scale})`,
            cursor: scale > 1 ? (isDragging ? 'grabbing' : 'grab') : 'zoom-in'
          }}
          draggable={false}
          onDragStart={(e) => e.preventDefault()}
          onContextMenu={(e) => e.preventDefault()}
          onError={(e) => {
            const rawImg = images[currentIndex] || ''
            const direct = formatDirectImageUrl(rawImg)
            if (direct && e.currentTarget.src !== direct) {
              e.currentTarget.src = direct
            } else if (rawImg && e.currentTarget.src !== rawImg) {
              e.currentTarget.src = rawImg
            }
          }}
        />

        <PropertyWatermark variant="lightbox" />

        {/* Floating Prev/Next buttons */}
        {images.length > 1 && (
          <>
            <button
              type="button"
              className="img-lightbox__nav-arrow img-lightbox__nav-arrow--prev"
              onClick={(e) => {
                e.stopPropagation()
                handlePrev()
              }}
              onTouchStart={(e) => e.stopPropagation()}
              onTouchEnd={(e) => {
                e.stopPropagation()
                handlePrev()
              }}
              title="Previous (Left Arrow)"
              aria-label="Previous"
            >
              <ChevronLeft size={30} />
            </button>
            <button
              type="button"
              className="img-lightbox__nav-arrow img-lightbox__nav-arrow--next"
              onClick={(e) => {
                e.stopPropagation()
                handleNext()
              }}
              onTouchStart={(e) => e.stopPropagation()}
              onTouchEnd={(e) => {
                e.stopPropagation()
                handleNext()
              }}
              title="Next (Right Arrow)"
              aria-label="Next"
            >
              <ChevronRight size={30} />
            </button>
          </>
        )}

        {/* Mobile / Quick Hint */}
        <div className="img-lightbox__hint">
          {scale === 1 ? 'Double-click or scroll to zoom' : 'Drag to pan • Double-click to reset'}
        </div>
      </div>

      {/* Bottom Thumbnails Filmstrip */}
      {images.length > 1 && (
        <div
          className="img-lightbox__filmstrip"
          ref={thumbsRef}
          onContextMenu={(e) => e.preventDefault()}
        >
          {displayImages.map((imgUrl, idx) => (
            <button
              key={idx}
              type="button"
              className={`img-lightbox__thumb-btn ${idx === currentIndex ? 'active' : ''}`}
              onClick={() => {
                setCurrentIndex(idx)
                resetZoom()
              }}
              aria-label={`Go to image ${idx + 1}`}
              onContextMenu={(e) => e.preventDefault()}
              style={{ position: 'relative', overflow: 'hidden' }}
            >
              <img
                src={imgUrl}
                alt={`Thumbnail ${idx + 1}`}
                draggable={false}
                onDragStart={(e) => e.preventDefault()}
                onContextMenu={(e) => e.preventDefault()}
                onError={(e) => {
                  const rawImg = images[idx] || ''
                  const direct = formatDirectImageUrl(rawImg)
                  if (direct && e.currentTarget.src !== direct) {
                    e.currentTarget.src = direct
                  } else if (rawImg && e.currentTarget.src !== rawImg) {
                    e.currentTarget.src = rawImg
                  }
                }}
              />
              <PropertyWatermark variant="thumb" />
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
