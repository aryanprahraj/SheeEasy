import { SpreadsheetData } from '@/types/spreadsheet'

const STORAGE_PREFIX = 'sheeeasy_spreadsheet_'

// Save spreadsheet data to localStorage
export function saveToLocalStorage(spreadsheetId: string, data: SpreadsheetData): void {
  try {
    const key = `${STORAGE_PREFIX}${spreadsheetId}`
    const serialized = JSON.stringify(data)
    localStorage.setItem(key, serialized)
    localStorage.setItem(`${key}_timestamp`, Date.now().toString())
  } catch (error) {
    console.error('Error saving to localStorage:', error)
  }
}

// Load spreadsheet data from localStorage
export function loadFromLocalStorage(spreadsheetId: string): SpreadsheetData | null {
  try {
    const key = `${STORAGE_PREFIX}${spreadsheetId}`
    const serialized = localStorage.getItem(key)
    
    if (!serialized) return null
    
    return JSON.parse(serialized)
  } catch (error) {
    console.error('Error loading from localStorage:', error)
    return null
  }
}

// Clear spreadsheet data from localStorage
export function clearFromLocalStorage(spreadsheetId: string): void {
  try {
    const key = `${STORAGE_PREFIX}${spreadsheetId}`
    localStorage.removeItem(key)
    localStorage.removeItem(`${key}_timestamp`)
  } catch (error) {
    console.error('Error clearing from localStorage:', error)
  }
}

// Get all spreadsheet IDs stored locally
export function getLocalSpreadsheetIds(): string[] {
  try {
    const ids: string[] = []
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key?.startsWith(STORAGE_PREFIX) && !key.endsWith('_timestamp')) {
        const id = key.replace(STORAGE_PREFIX, '')
        ids.push(id)
      }
    }
    return ids
  } catch (error) {
    console.error('Error getting local spreadsheet IDs:', error)
    return []
  }
}

// Get timestamp of last save
export function getLastSaveTimestamp(spreadsheetId: string): number | null {
  try {
    const key = `${STORAGE_PREFIX}${spreadsheetId}_timestamp`
    const timestamp = localStorage.getItem(key)
    return timestamp ? parseInt(timestamp, 10) : null
  } catch (error) {
    console.error('Error getting timestamp:', error)
    return null
  }
}

// Check if localStorage is available
export function isLocalStorageAvailable(): boolean {
  try {
    const test = '__localStorage_test__'
    localStorage.setItem(test, test)
    localStorage.removeItem(test)
    return true
  } catch (error) {
    return false
  }
}

// Get storage usage
export function getStorageUsage(): { used: number; available: number } {
  try {
    let used = 0
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key) {
        const value = localStorage.getItem(key)
        used += key.length + (value?.length || 0)
      }
    }

    // Most browsers provide ~5-10MB for localStorage
    const available = 10 * 1024 * 1024 // 10MB estimate

    return { used, available }
  } catch (error) {
    console.error('Error getting storage usage:', error)
    return { used: 0, available: 0 }
  }
}

// Clear old cached spreadsheets (older than 30 days)
export function clearOldCache(days: number = 30): void {
  try {
    const now = Date.now()
    const maxAge = days * 24 * 60 * 60 * 1000

    const ids = getLocalSpreadsheetIds()
    ids.forEach((id) => {
      const timestamp = getLastSaveTimestamp(id)
      if (timestamp && now - timestamp > maxAge) {
        clearFromLocalStorage(id)
      }
    })
  } catch (error) {
    console.error('Error clearing old cache:', error)
  }
}
