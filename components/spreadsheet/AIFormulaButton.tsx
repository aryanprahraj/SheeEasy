'use client'

import { useState, useRef, useEffect } from 'react'
import { Sparkles, X, Loader2 } from 'lucide-react'

interface AIFormulaButtonProps {
  onFormulaGenerated: (formula: string) => void
}

export function AIFormulaButton({ onFormulaGenerated }: AIFormulaButtonProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const savedQueryRef = useRef<string>('')

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus()
    }
  }, [isOpen])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!query.trim() || isLoading) return

    console.log('AI Button: Submitting query:', query)
    savedQueryRef.current = query
    setIsLoading(true)
    setError(null)
    
    // Close modal first to restore focus to spreadsheet
    setIsOpen(false)
    setQuery('')

    try {
      // Use saved query after modal closes
      await onFormulaGenerated(savedQueryRef.current)
      console.log('AI Button: Success!')
    } catch (err) {
      console.error('AI Button: Error:', err)
      setError(err instanceof Error ? err.message : 'Failed to generate formula')
      // Reopen modal on error
      setIsOpen(true)
      setQuery(savedQueryRef.current)
    } finally {
      setIsLoading(false)
    }
  }

  const handleClose = () => {
    setIsOpen(false)
    setQuery('')
    setError(null)
  }

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="ai-formula-button"
        title="Your AI Buddy"
        type="button"
      >
        <Sparkles size={16} />
        <span>Your AI Buddy</span>
      </button>

      {isOpen && (
        <>
          <div className="ai-formula-backdrop" onClick={handleClose} />
          <div className="ai-formula-modal">
            <div className="ai-formula-header">
              <div className="ai-formula-title">
                <Sparkles size={18} />
                <span>Your AI Buddy</span>
              </div>
              <button
                onClick={handleClose}
                className="ai-formula-close"
                type="button"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmit}>
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => {
                  console.log('Input changed:', e.target.value)
                  setQuery(e.target.value)
                }}
                onKeyDown={(e) => {
                  console.log('Key pressed:', e.key)
                  if (e.key === 'Enter') {
                    console.log('Enter key detected!')
                  }
                }}
                placeholder="Describe what you want to calculate..."
                className="ai-formula-input"
                disabled={isLoading}
              />

              {error && (
                <div className="ai-formula-error">
                  {error}
                </div>
              )}

              <div className="ai-formula-footer">
                <div className="ai-formula-hint">
                  Press Enter to generate formula
                </div>
                <button
                  type="submit"
                  className="ai-formula-submit"
                  disabled={!query.trim() || isLoading}
                >
                  {isLoading ? (
                    <>
                      <Loader2 size={16} className="ai-formula-spinner" />
                      Generating...
                    </>
                  ) : (
                    'Generate'
                  )}
                </button>
              </div>
            </form>
          </div>
        </>
      )}
    </div>
  )
}
