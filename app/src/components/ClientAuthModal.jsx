import { useState, useEffect } from 'react'
import { useClientAuth } from '../contexts/ClientAuthContext'
import { User, X, ArrowRight, ShieldCheck, Sparkles, CheckCircle2, PhoneCall } from 'lucide-react'
import './ClientAuthModal.css'

export default function ClientAuthModal() {
  const {
    isModalOpen,
    closeAuthModal,
    loginWithPhone,
    loading,
    error,
    setError
  } = useClientAuth()

  const [phone, setPhone] = useState('')
  const [name, setName] = useState('')
  const [successAnim, setSuccessAnim] = useState(false)

  // Reset modal state whenever opened
  useEffect(() => {
    if (isModalOpen) {
      setSuccessAnim(false)
      if (setError) setError('')
    }
  }, [isModalOpen, setError])

  if (!isModalOpen) return null

  // Submit Phone & Name directly for instant access & CRM lead sync
  const handleSubmit = async (e) => {
    e.preventDefault()
    const cleanPhone = phone.replace(/\D/g, '').slice(0, 10)
    if (cleanPhone.length < 10) {
      if (setError) setError('Please enter a valid 10-digit mobile phone number.')
      return
    }

    try {
      await loginWithPhone({ phone: cleanPhone, name: name.trim() })
      setSuccessAnim(true)
    } catch {
      // Error handled in context
    }
  }

  return (
    <div className="client-modal-overlay" onClick={closeAuthModal}>
      <div className="client-modal-card" onClick={(e) => e.stopPropagation()}>
        {/* Close Button */}
        <button
          type="button"
          className="client-modal-close"
          onClick={(e) => {
            e.stopPropagation()
            closeAuthModal()
          }}
          aria-label="Close modal"
        >
          <X size={18} />
        </button>

        <div className="client-modal-step">
          {/* Header */}
          <div className="client-modal-header">
            <div className="client-modal-badge">
              <Sparkles size={14} /> RE-ON Member Access
            </div>
            <h2>Sign in with Mobile</h2>
            <p>
              Enter your mobile number to get instant access to exclusive properties, save shortlists, and connect with advisors.
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="client-modal-form">
            {error && <div className="client-modal-error">{error}</div>}

            {/* Full Name */}
            <div className="client-input-group">
              <label htmlFor="client-name">Your Full Name</label>
              <div className="client-input-wrap">
                <User size={16} className="client-input-icon" />
                <input
                  id="client-name"
                  type="text"
                  placeholder="e.g. Sameer Sharma"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  autoFocus
                />
              </div>
            </div>

            {/* Phone Field */}
            <div className="client-input-group">
              <label htmlFor="client-phone">Mobile Phone Number *</label>
              <div className="client-input-wrap">
                <span className="client-input-prefix">+91</span>
                <input
                  id="client-phone"
                  type="tel"
                  placeholder="Enter 10-digit mobile number"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                  required
                />
              </div>
              <span className="client-input-hint">
                ✨ Instant login — No SMS OTP verification required.
              </span>
            </div>

            {/* Action Submit */}
            <button
              type="submit"
              className="client-modal-submit"
              disabled={loading || phone.replace(/\D/g, '').length < 10}
            >
              {loading ? (
                'Connecting to Portal...'
              ) : successAnim ? (
                <>
                  <CheckCircle2 size={16} /> Welcome to RE-ON!
                </>
              ) : (
                <>
                  <PhoneCall size={16} /> Get Instant Access <ArrowRight size={16} />
                </>
              )}
            </button>

            {/* Security Guarantee Footer */}
            <div className="client-modal-footer">
              <ShieldCheck size={14} /> Instant Access &bull; User information is securely stored and synced to CRM.
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}


