'use client'

import { CheckCircle, X } from 'lucide-react'

interface AIResultModalProps {
  result: string
  cellLocation: string
  onClose: () => void
}

export function AIResultModal({ result, cellLocation, onClose }: AIResultModalProps) {
  return (
    <>
      <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center" onClick={onClose}>
        <div 
          className="bg-white rounded-xl shadow-2xl p-6 max-w-md w-full mx-4 animate-scale-in"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <CheckCircle className="text-emerald-500" size={24} />
              <h3 className="text-lg font-semibold text-gray-900">AI Calculation Complete</h3>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X size={20} />
            </button>
          </div>

          {/* Result Display */}
          <div className="bg-emerald-50 border-2 border-emerald-200 rounded-lg p-4 mb-4">
            <div className="text-sm text-emerald-700 font-medium mb-1">Result:</div>
            <div className="text-2xl font-bold text-emerald-900">{result}</div>
          </div>

          {/* Cell Location */}
          <div className="text-sm text-gray-600 mb-4">
            This result will be placed in cell <span className="font-mono font-semibold text-gray-900">{cellLocation}</span>
          </div>

          {/* Action Button */}
          <button
            onClick={onClose}
            className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-medium py-2.5 px-4 rounded-lg transition-colors"
          >
            Got it!
          </button>
        </div>
      </div>

      <style jsx>{`
        @keyframes scale-in {
          from {
            opacity: 0;
            transform: scale(0.9);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }
        .animate-scale-in {
          animation: scale-in 0.2s ease-out;
        }
      `}</style>
    </>
  )
}
