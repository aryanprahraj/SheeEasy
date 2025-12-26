'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Spreadsheet } from '@/types/spreadsheet'

interface DashboardClientProps {
  spreadsheets: any[]
  user: any
}

export default function DashboardClient({ spreadsheets: initialSpreadsheets, user }: DashboardClientProps) {
  const [spreadsheets, setSpreadsheets] = useState(initialSpreadsheets)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [newTitle, setNewTitle] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push('/')
    router.refresh()
  }

  const handleCreateSpreadsheet = async () => {
    if (!newTitle.trim()) return

    setLoading(true)
    try {
      const { data, error } = await (supabase
        .from('spreadsheets')
        .insert({
          title: newTitle.trim(),
          user_id: user.id,
          sheet_data: {
            sheets: [
              {
                id: 'sheet1',
                name: 'Sheet 1',
                data: {
                  cells: {},
                  rows: 100,
                  columns: 26,
                  mergedCells: [],
                  rowHeights: {},
                  columnWidths: {},
                },
              },
            ],
            activeSheetId: 'sheet1',
          },
        }) as any)
        .select()
        .single()

      if (error) throw error

      setSpreadsheets([data, ...spreadsheets])
      setShowCreateModal(false)
      setNewTitle('')
      router.push(`/spreadsheet/${data.id}`)
    } catch (error) {
      console.error('Error creating spreadsheet:', error)
      alert('Failed to create spreadsheet')
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteSpreadsheet = async (id: string) => {
    if (!confirm('Are you sure you want to delete this spreadsheet?')) return

    setLoading(true)
    try {
      const { error } = await supabase.from('spreadsheets').delete().eq('id', id)

      if (error) throw error

      setSpreadsheets(spreadsheets.filter((s) => s.id !== id))
    } catch (error) {
      console.error('Error deleting spreadsheet:', error)
      alert('Failed to delete spreadsheet')
    } finally {
      setLoading(false)
    }
  }

  const handleDuplicateSpreadsheet = async (id: string) => {
    setLoading(true)
    try {
      const original = spreadsheets.find((s) => s.id === id)
      if (!original) return

      const { data, error } = await supabase
        .from('spreadsheets')
        .insert({
          title: `${original.title} (Copy)`,
          user_id: user.id,
          sheet_data: original.sheet_data,
        })
        .select()
        .single()

      if (error) throw error

      setSpreadsheets([data, ...spreadsheets])
    } catch (error) {
      console.error('Error duplicating spreadsheet:', error)
      alert('Failed to duplicate spreadsheet')
    } finally {
      setLoading(false)
    }
  }

  const handleRenameSpreadsheet = async (id: string, newTitle: string) => {
    if (!newTitle.trim()) return

    setLoading(true)
    try {
      const { error } = await supabase
        .from('spreadsheets')
        .update({ title: newTitle.trim() })
        .eq('id', id)

      if (error) throw error

      setSpreadsheets(
        spreadsheets.map((s) => (s.id === id ? { ...s, title: newTitle.trim() } : s))
      )
    } catch (error) {
      console.error('Error renaming spreadsheet:', error)
      alert('Failed to rename spreadsheet')
    } finally {
      setLoading(false)
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toISOString()
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-green-50 to-teal-50">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-sm border-b border-emerald-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-emerald-500 to-green-600 rounded-lg flex items-center justify-center shadow-md">
              <span className="text-xl">📊</span>
            </div>
            <div>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-emerald-600 to-green-700 bg-clip-text text-transparent">SheeEasy</h1>
              <p className="text-sm text-gray-600">{user.email}</p>
            </div>
          </div>
          <button onClick={handleSignOut} className="px-4 py-2 bg-white hover:bg-gray-50 text-gray-700 font-medium rounded-lg border-2 border-gray-200 hover:border-emerald-500 shadow-sm hover:shadow-md transition-all">
            Sign Out
          </button>
        </div>
      </header>

      {/* Main content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-emerald-900">My Spreadsheets</h2>
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-5 py-2.5 bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700 text-white font-semibold rounded-lg shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
            disabled={loading}
          >
            + New Spreadsheet
          </button>
        </div>

        {/* Spreadsheet grid */}
        {spreadsheets.length === 0 ? (
          <div className="text-center py-12 bg-white/50 backdrop-blur-sm rounded-2xl border-2 border-emerald-100">
            <div className="text-6xl mb-4">📊</div>
            <p className="text-gray-600 mb-4 font-medium">No spreadsheets yet</p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="px-6 py-3 bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700 text-white font-semibold rounded-lg shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200"
            >
              Create your first spreadsheet
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {spreadsheets.map((spreadsheet) => (
              <SpreadsheetCard
                key={spreadsheet.id}
                spreadsheet={spreadsheet}
                onOpen={() => router.push(`/spreadsheet/${spreadsheet.id}`)}
                onDelete={() => handleDeleteSpreadsheet(spreadsheet.id)}
                onDuplicate={() => handleDuplicateSpreadsheet(spreadsheet.id)}
                onRename={(newTitle) => handleRenameSpreadsheet(spreadsheet.id, newTitle)}
                formatDate={formatDate}
              />
            ))}
          </div>
        )}
      </main>

      {/* Create modal */}
      {showCreateModal && (
        <div className="modal-overlay" onClick={() => setShowCreateModal(false)}>
          <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 bg-gradient-to-br from-emerald-500 to-green-600 rounded-xl flex items-center justify-center">
                <span className="text-2xl">📊</span>
              </div>
              <h3 className="text-xl font-bold text-emerald-900">Create New Spreadsheet</h3>
            </div>
            <input
              type="text"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder="Spreadsheet title"
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100 outline-none transition-all mb-6 text-gray-900 bg-white"
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleCreateSpreadsheet()
                if (e.key === 'Escape') setShowCreateModal(false)
              }}
              autoFocus
            />
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setShowCreateModal(false)}
                className="px-5 py-2.5 bg-white hover:bg-gray-50 text-gray-700 font-medium rounded-lg border-2 border-gray-200 hover:border-emerald-500 transition-all"
                disabled={loading}
              >
                Cancel
              </button>
              <button
                onClick={handleCreateSpreadsheet}
                className="px-5 py-2.5 bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700 text-white font-semibold rounded-lg shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                disabled={loading || !newTitle.trim()}
              >
                {loading ? 'Creating...' : 'Create'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

interface SpreadsheetCardProps {
  spreadsheet: any
  onOpen: () => void
  onDelete: () => void
  onDuplicate: () => void
  onRename: (newTitle: string) => void
  formatDate: (date: string) => string
}

function SpreadsheetCard({
  spreadsheet,
  onOpen,
  onDelete,
  onDuplicate,
  onRename,
  formatDate,
}: SpreadsheetCardProps) {
  const [isRenaming, setIsRenaming] = useState(false)
  const [newTitle, setNewTitle] = useState(spreadsheet.title)
  const [showMenu, setShowMenu] = useState(false)

  const handleRename = () => {
    if (newTitle.trim() && newTitle !== spreadsheet.title) {
      onRename(newTitle.trim())
    }
    setIsRenaming(false)
  }

  return (
    <div className="bg-white rounded-xl shadow-md hover:shadow-xl transition-all cursor-pointer group relative border-2 border-transparent hover:border-emerald-200 p-6">
      <div onClick={onOpen}>
        {isRenaming ? (
          <input
            type="text"
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            onBlur={handleRename}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleRename()
              if (e.key === 'Escape') setIsRenaming(false)
            }}
            className="input w-full mb-2"
            autoFocus
            onClick={(e) => e.stopPropagation()}
          />
        ) : (
          <h3 className="font-semibold text-lg mb-2 text-gray-900">{spreadsheet.title}</h3>
        )}
        <p className="text-sm text-gray-500">
          Updated: {formatDate(spreadsheet.updated_at)}
        </p>
        <p className="text-sm text-gray-500">
          Created: {formatDate(spreadsheet.created_at)}
        </p>
      </div>

      {/* Menu button */}
      <div className="absolute top-2 right-2">
        <button
          onClick={(e) => {
            e.stopPropagation()
            setShowMenu(!showMenu)
          }}
          className="px-2 py-1 hover:bg-gray-200 rounded opacity-0 group-hover:opacity-100 transition-opacity"
        >
          ⋮
        </button>

        {showMenu && (
          <div
            className="absolute right-0 mt-1 bg-white border border-gray-300 rounded shadow-lg z-10"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => {
                setShowMenu(false)
                onOpen()
              }}
              className="block w-full text-left px-4 py-2 hover:bg-gray-100 text-sm"
            >
              Open
            </button>
            <button
              onClick={() => {
                setShowMenu(false)
                setIsRenaming(true)
              }}
              className="block w-full text-left px-4 py-2 hover:bg-gray-100 text-sm"
            >
              Rename
            </button>
            <button
              onClick={() => {
                setShowMenu(false)
                onDuplicate()
              }}
              className="block w-full text-left px-4 py-2 hover:bg-gray-100 text-sm"
            >
              Duplicate
            </button>
            <button
              onClick={() => {
                setShowMenu(false)
                onDelete()
              }}
              className="block w-full text-left px-4 py-2 hover:bg-red-100 text-red-600 text-sm"
            >
              Delete
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
