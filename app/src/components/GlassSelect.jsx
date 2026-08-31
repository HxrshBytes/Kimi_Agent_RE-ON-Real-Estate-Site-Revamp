import { useState, useRef, useEffect, useCallback } from 'react'
import { ChevronDown, Check } from 'lucide-react'
import './GlassSelect.css'

/**
 * Universal Glassmorphism Select Dropdown
 * Renders identical frosted glass dropdown popover across ALL devices
 * (Android, iOS, macOS, Windows, Linux, Chrome, Safari, Firefox).
 */
export default function GlassSelect({
  value,
  onChange,
  options = [],
  icon: Icon,
  placeholder = 'Select option',
  className = '',
  ariaLabel,
  id
}) {
  const [isOpen, setIsOpen] = useState(false)
  const wrapperRef = useRef(null)
  const listRef = useRef(null)

  // Normalize options to [{ value, label }] format
  const normalizedOptions = options.map((opt) => {
    if (typeof opt === 'object' && opt !== null) {
      return { value: opt.value, label: opt.label ?? opt.value }
    }
    return { value: opt, label: opt }
  })

  // Find currently selected option
  const selectedOption = normalizedOptions.find((opt) => opt.value === value) || {
    value: value,
    label: value || placeholder
  }

  // Toggle open / close
  const toggleDropdown = useCallback(() => {
    setIsOpen((prev) => !prev)
  }, [])

  const handleSelect = useCallback(
    (optValue) => {
      onChange(optValue)
      setIsOpen(false)
    },
    [onChange]
  )

  // Close when clicking outside
  useEffect(() => {
    function handleClickOutside(e) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
        setIsOpen(false)
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside, true)
      document.addEventListener('touchstart', handleClickOutside, true)
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside, true)
      document.removeEventListener('touchstart', handleClickOutside, true)
    }
  }, [isOpen])

  // Keyboard navigation & accessibility
  const handleKeyDown = useCallback(
    (e) => {
      if (e.key === 'Escape') {
        setIsOpen(false)
      } else if (e.key === 'Enter' || e.key === ' ') {
        if (!isOpen) {
          e.preventDefault()
          setIsOpen(true)
        }
      } else if (e.key === 'ArrowDown') {
        e.preventDefault()
        if (!isOpen) {
          setIsOpen(true)
        } else {
          const currentIndex = normalizedOptions.findIndex((opt) => opt.value === value)
          const nextIndex = Math.min(currentIndex + 1, normalizedOptions.length - 1)
          if (normalizedOptions[nextIndex]) {
            onChange(normalizedOptions[nextIndex].value)
          }
        }
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        if (isOpen) {
          const currentIndex = normalizedOptions.findIndex((opt) => opt.value === value)
          const prevIndex = Math.max(currentIndex - 1, 0)
          if (normalizedOptions[prevIndex]) {
            onChange(normalizedOptions[prevIndex].value)
          }
        }
      }
    },
    [isOpen, normalizedOptions, value, onChange]
  )

  // Auto-scroll selected item into view when dropdown opens
  useEffect(() => {
    if (isOpen && listRef.current) {
      const activeEl = listRef.current.querySelector('.glass-select__option--selected')
      if (activeEl) {
        activeEl.scrollIntoView({ block: 'nearest' })
      }
    }
  }, [isOpen])

  const hasActiveValue = Boolean(value && value !== 'All' && value !== '' && value !== 'relevance')

  return (
    <div
      ref={wrapperRef}
      className={`glass-select-wrapper ${isOpen ? 'glass-select-wrapper--open' : ''} ${className}`}
      onKeyDown={handleKeyDown}
      id={id}
    >
      <button
        type="button"
        className={`glass-select__trigger ${isOpen ? 'glass-select__trigger--active' : ''} ${hasActiveValue ? 'glass-select__trigger--has-value' : ''}`}
        onClick={toggleDropdown}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-label={ariaLabel || selectedOption.label}
      >
        <div className="glass-select__trigger-left">
          {Icon && <Icon size={14} className="glass-select__icon" />}
          <span className="glass-select__label">{selectedOption.label}</span>
        </div>
        <ChevronDown size={13} className={`glass-select__chevron ${isOpen ? 'glass-select__chevron--open' : ''}`} />
      </button>

      {isOpen && (
        <div className="glass-select__dropdown" role="listbox" ref={listRef} data-lenis-prevent tabIndex={-1}>
          {normalizedOptions.map((opt) => {
            const isSelected = opt.value === value
            return (
              <div
                key={opt.value}
                className={`glass-select__option ${isSelected ? 'glass-select__option--selected' : ''}`}
                role="option"
                aria-selected={isSelected}
                onClick={() => handleSelect(opt.value)}
              >
                <div className="glass-select__option-content">
                  <span className={`glass-select__check ${isSelected ? 'glass-select__check--visible' : ''}`}>
                    <Check size={14} strokeWidth={2.8} />
                  </span>
                  <span className="glass-select__option-text">{opt.label}</span>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
