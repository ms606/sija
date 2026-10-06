import { del, get, set } from 'idb-keyval'
import type { StateStorage } from 'zustand/middleware'

const memory = new Map<string, string>()

function hasIndexedDb(): boolean {
  try {
    return typeof indexedDB !== 'undefined' && indexedDB !== null
  } catch {
    return false
  }
}

/**
 * Zustand storage on IndexedDB (idb-keyval). Falls back to memory when
 * IndexedDB is unavailable (private windows in some browsers, tests).
 */
export const idbStorage: StateStorage = {
  getItem: async (name) => {
    if (!hasIndexedDb()) return memory.get(name) ?? null
    try {
      return (await get<string>(name)) ?? null
    } catch {
      return memory.get(name) ?? null
    }
  },
  setItem: async (name, value) => {
    memory.set(name, value)
    if (!hasIndexedDb()) return
    try {
      await set(name, value)
    } catch {
      /* keep the in-memory copy */
    }
  },
  removeItem: async (name) => {
    memory.delete(name)
    if (!hasIndexedDb()) return
    try {
      await del(name)
    } catch {
      /* ignore */
    }
  },
}
