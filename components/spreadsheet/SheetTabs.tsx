'use client'

import React, { useState } from 'react'
import { useSpreadsheetStore } from '@/lib/store/spreadsheetStore'

export default function SheetTabs() {
  const [renamingSheet, setRenamingSheet] = useState<string | null>(null)
  const [newName, setNewName] = useState('')

  const {
    sheets,
    activeSheetId,
    setActiveSheet,
    addSheet,
    deleteSheet,
    renameSheet,
    duplicateSheet,
  } = useSpreadsheetStore()

  const handleAddSheet = () => {
    addSheet()
  }

  const handleDeleteSheet = (sheetId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    if (sheets.length === 1) {
      alert("Can't delete the last sheet")
      return
    }
    if (confirm('Are you sure you want to delete this sheet?')) {
      deleteSheet(sheetId)
    }
  }

  const handleStartRename = (sheetId: string, currentName: string, e: React.MouseEvent) => {
    e.stopPropagation()
    setRenamingSheet(sheetId)
    setNewName(currentName)
  }

  const handleFinishRename = (sheetId: string) => {
    if (newName.trim()) {
      renameSheet(sheetId, newName.trim())
    }
    setRenamingSheet(null)
  }

  const handleDuplicate = (sheetId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    duplicateSheet(sheetId)
  }

  return (
    <div className="sheet-tabs">
      {sheets.map((sheet) => (
        <div
          key={sheet.id}
          className={`sheet-tab group ${sheet.id === activeSheetId ? 'active' : ''}`}
          onClick={() => setActiveSheet(sheet.id)}
        >
          {renamingSheet === sheet.id ? (
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onBlur={() => handleFinishRename(sheet.id)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleFinishRename(sheet.id)
                if (e.key === 'Escape') setRenamingSheet(null)
              }}
              className="px-2 py-0 border border-blue-500 rounded outline-none"
              autoFocus
              onClick={(e) => e.stopPropagation()}
            />
          ) : (
            <>
              <span>{sheet.name}</span>
              <div className="hidden group-hover:flex items-center gap-1 ml-2">
                <button
                  onClick={(e) => handleStartRename(sheet.id, sheet.name, e)}
                  className="text-xs px-1 hover:bg-gray-200 rounded"
                  title="Rename"
                >
                  ✎
                </button>
                <button
                  onClick={(e) => handleDuplicate(sheet.id, e)}
                  className="text-xs px-1 hover:bg-gray-200 rounded"
                  title="Duplicate"
                >
                  ⎘
                </button>
                {sheets.length > 1 && (
                  <button
                    onClick={(e) => handleDeleteSheet(sheet.id, e)}
                    className="text-xs px-1 hover:bg-red-200 rounded"
                    title="Delete"
                  >
                    ×
                  </button>
                )}
              </div>
            </>
          )}
        </div>
      ))}
      <button
        onClick={handleAddSheet}
        className="px-3 py-1 border border-gray-300 rounded hover:bg-gray-100 text-sm"
      >
        + Add Sheet
      </button>
    </div>
  )
}
