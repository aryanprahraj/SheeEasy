'use client'

import React, { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useSpreadsheetStore } from '@/lib/store/spreadsheetStore'
import { createClient } from '@/lib/supabase/client'
import Grid from './Grid'
import FormulaBar from './FormulaBar'
import Toolbar from './Toolbar'
import SheetTabs from './SheetTabs'
import { exportToCSV, exportToXLSX, exportToJSON, importFromCSV, importFromXLSX } from '@/lib/import-export'
import { saveToLocalStorage, loadFromLocalStorage } from '@/lib/offline'

interface SpreadsheetEditorProps {
  spreadsheet: any
}

export default function SpreadsheetEditor({ spreadsheet }: SpreadsheetEditorProps) {
  const router = useRouter()
  const supabase = createClient()
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [isOnline, setIsOnline] = useState(true)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const {
    title,
    setTitle,
    setSpreadsheetId,
    loadSpreadsheet,
    getSpreadsheetData,
    isDirty,
    markSaved,
  } = useSpreadsheetStore()

  // Load spreadsheet data on mount
  useEffect(() => {
    setSpreadsheetId(spreadsheet.id)
    setTitle(spreadsheet.title)
    
    // Try to load from localStorage first (offline support)
    const localData = loadFromLocalStorage(spreadsheet.id)
    if (localData) {
      loadSpreadsheet(localData)
    } else {
      loadSpreadsheet(spreadsheet.sheet_data)
    }
  }, [spreadsheet])

  // Monitor online/offline status
  useEffect(() => {
    const handleOnline = () => setIsOnline(true)
    const handleOffline = () => setIsOnline(false)

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  // Auto-save logic
  useEffect(() => {
    if (!isDirty) return

    // Save to localStorage immediately
    const data = getSpreadsheetData()
    saveToLocalStorage(spreadsheet.id, data)

    // Clear any existing timeout
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current)
    }

    // Save to Supabase after 3 seconds of inactivity
    saveTimeoutRef.current = setTimeout(async () => {
      if (isOnline) {
        await saveToSupabase()
      }
    }, 3000)

    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current)
      }
    }
  }, [isDirty, isOnline])

  // Sync when coming back online
  useEffect(() => {
    if (isOnline && isDirty) {
      saveToSupabase()
    }
  }, [isOnline])

  const saveToSupabase = async () => {
    setIsSaving(true)
    try {
      const data = getSpreadsheetData()
      const { error } = await ((supabase as any)
        .from('spreadsheets')
        .update({
          sheet_data: data,
          updated_at: new Date().toISOString(),
        })
        .eq('id', spreadsheet.id))

      if (error) throw error

      markSaved()
    } catch (error) {
      console.error('Error saving spreadsheet:', error)
    } finally {
      setIsSaving(false)
    }
  }

  const handleTitleChange = async (newTitle: string) => {
    setTitle(newTitle)
    
    try {
      await ((supabase as any)
        .from('spreadsheets')
        .update({ title: newTitle })
        .eq('id', spreadsheet.id))
    } catch (error) {
      console.error('Error updating title:', error)
    }
  }

  const handleExportCSV = () => {
    const data = getSpreadsheetData()
    exportToCSV(data, title)
  }

  const handleExportXLSX = () => {
    const data = getSpreadsheetData()
    exportToXLSX(data, title)
  }

  const handleExportJSON = () => {
    const data = getSpreadsheetData()
    exportToJSON(data, title)
  }

  const handleImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    try {
      let data
      if (file.name.endsWith('.csv')) {
        data = await importFromCSV(file)
      } else if (file.name.endsWith('.xlsx')) {
        data = await importFromXLSX(file)
      } else {
        alert('Unsupported file format')
        return
      }

      if (data) {
        loadSpreadsheet(data)
      }
    } catch (error) {
      console.error('Error importing file:', error)
      alert('Failed to import file')
    }

    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const handleBackToDashboard = () => {
    router.push('/dashboard')
  }

  return (
    <div className="h-screen flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-4 py-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={handleBackToDashboard}
              className="text-gray-600 hover:text-gray-900"
              title="Back to Dashboard"
            >
              ← Back
            </button>
            <input
              type="text"
              value={title}
              onChange={(e) => handleTitleChange(e.target.value)}
              className="text-xl font-semibold border-none outline-none bg-transparent hover:bg-gray-100 px-2 py-1 rounded"
            />
            <div className="flex items-center gap-2 text-sm text-gray-500">
              {isSaving && <span>Saving...</span>}
              {!isSaving && isDirty && <span>Unsaved changes</span>}
              {!isSaving && !isDirty && <span>All changes saved</span>}
              {!isOnline && (
                <span className="px-2 py-1 bg-yellow-100 text-yellow-800 rounded">
                  Offline
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,.xlsx"
              onChange={handleImport}
              className="hidden"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="btn btn-secondary text-sm"
            >
              Import
            </button>
            <div className="relative group">
              <button className="btn btn-secondary text-sm">
                Export ▾
              </button>
              <div className="hidden group-hover:block absolute right-0 mt-1 bg-white border border-gray-300 rounded shadow-lg z-50">
                <button
                  onClick={handleExportCSV}
                  className="block w-full text-left px-4 py-2 hover:bg-gray-100 text-sm whitespace-nowrap"
                >
                  Export as CSV
                </button>
                <button
                  onClick={handleExportXLSX}
                  className="block w-full text-left px-4 py-2 hover:bg-gray-100 text-sm whitespace-nowrap"
                >
                  Export as XLSX
                </button>
                <button
                  onClick={handleExportJSON}
                  className="block w-full text-left px-4 py-2 hover:bg-gray-100 text-sm whitespace-nowrap"
                >
                  Export as JSON
                </button>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Toolbar */}
      <Toolbar />

      {/* Formula Bar */}
      <FormulaBar />

      {/* Grid */}
      <Grid />

      {/* Sheet Tabs */}
      <SheetTabs />
    </div>
  )
}
