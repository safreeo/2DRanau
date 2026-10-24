import {
  createDefaultPatrols,
  createDemoState,
  DEFAULT_CHECKPOINTS,
} from '../constants';
import { TournamentState } from '../types';

const STORAGE_KEY = 'ktacr_hunting2d_ranau_2026_v1';
const IDB_NAME = 'ktacr_ranau_2026_db';
const IDB_STORE = 'state_store';

export function buildInitialState(withDemo = true): TournamentState {
  if (withDemo) {
    const demo = createDemoState();
    return {
      version: 2,
      isDemoData: true,
      activePatrol: 1,
      archers: demo.archers,
      checkpoints: DEFAULT_CHECKPOINTS.map((c) => ({ ...c })),
      patrols: demo.patrols,
    };
  }

  return {
    version: 2,
    isDemoData: false,
    activePatrol: 1,
    archers: [],
    checkpoints: DEFAULT_CHECKPOINTS.map((c) => ({ ...c })),
    patrols: createDefaultPatrols(),
  };
}

export function loadFromLocalStorage(): TournamentState | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as TournamentState;
    if (!parsed || !Array.isArray(parsed.archers) || !Array.isArray(parsed.checkpoints)) {
      return null;
    }
    // Auto-upgrade old demo data if it previously had mixed L/W in Kumpulan 1
    if (parsed.isDemoData && (parsed.version ?? 1) < 2) {
      return buildInitialState(true);
    }
    return parsed;
  } catch {
    return null;
  }
}

export function saveState(state: TournamentState): void {
  try {
    const serialized = JSON.stringify(state);
    localStorage.setItem(STORAGE_KEY, serialized);
    saveToIndexedDB(state).catch(() => {
      // Non-fatal fallback if IndexedDB restricted in private browsing
    });
  } catch (err) {
    console.error('Gagal menyimpan data tempatan:', err);
  }
}

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB unavailable'));
      return;
    }
    const req = indexedDB.open(IDB_NAME, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(IDB_STORE)) {
        db.createObjectStore(IDB_STORE);
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function saveToIndexedDB(state: TournamentState): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(IDB_STORE, 'readwrite');
    tx.objectStore(IDB_STORE).put(state, STORAGE_KEY);
    tx.oncomplete = () => {
      db.close();
      resolve();
    };
    tx.onerror = () => {
      db.close();
      reject(tx.error);
    };
  });
}

export async function loadFromIndexedDBFallback(): Promise<TournamentState | null> {
  try {
    const db = await openDB();
    return await new Promise((resolve) => {
      const tx = db.transaction(IDB_STORE, 'readonly');
      const req = tx.objectStore(IDB_STORE).get(STORAGE_KEY);
      req.onsuccess = () => {
        db.close();
        const res = req.result as TournamentState | undefined;
        if (res && Array.isArray(res.archers)) {
          resolve(res);
        } else {
          resolve(null);
        }
      };
      req.onerror = () => {
        db.close();
        resolve(null);
      };
    });
  } catch {
    return null;
  }
}
