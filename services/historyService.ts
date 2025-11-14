import type { Presentation } from '../types';

const DB_NAME = 'aina-notebook-db';
const STORE_NAME = 'presentations';
const DB_VERSION = 1;

let dbPromise: Promise<IDBDatabase> | null = null;

const getDb = (): Promise<IDBDatabase> => {
  if (dbPromise) {
    return dbPromise;
  }

  dbPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => {
      console.error("Error opening IndexedDB:", request.error);
      reject(new Error("Could not open database."));
    };

    request.onsuccess = () => {
      resolve(request.result);
    };

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };
  });

  return dbPromise;
};

/**
 * Retrieves the list of presentations from IndexedDB.
 * @returns {Promise<Presentation[]>} A promise that resolves to an array of presentations.
 */
export const getHistory = async (): Promise<Presentation[]> => {
  try {
    const db = await getDb();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.getAll();

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        // Sort by ID (timestamp) descending to get newest first
        const sorted = request.result.sort((a, b) => b.id.localeCompare(a.id));
        resolve(sorted);
      };
    });
  } catch (error) {
    console.error("Error reading history from IndexedDB:", error);
    return []; // Return empty array on failure
  }
};

/**
 * Adds a new presentation to the history in IndexedDB.
 * @param {Presentation} presentation The new presentation to add.
 * @returns {Promise<Presentation[]>} A promise resolving to the updated list of presentations.
 */
export const addPresentation = async (presentation: Presentation): Promise<Presentation[]> => {
  try {
    const db = await getDb();
    await new Promise<void>((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.put(presentation);
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  } catch (error) {
    console.error("Error adding presentation to IndexedDB:", error);
  }
  return getHistory(); // Return the full updated history
};

/**
 * Finds a presentation in the history by its ID and updates it.
 * @param {Presentation} updatedPresentation The presentation with updated data.
 * @returns {Promise<Presentation[]>} A promise resolving to the updated list of presentations.
 */
export const updatePresentation = async (updatedPresentation: Presentation): Promise<Presentation[]> => {
    try {
        const db = await getDb();
        await new Promise<void>((resolve, reject) => {
            const transaction = db.transaction(STORE_NAME, 'readwrite');
            const store = transaction.objectStore(STORE_NAME);
            const request = store.put(updatedPresentation);
            request.onerror = () => reject(request.error);
            request.onsuccess = () => resolve();
        });
    } catch (error) {
        console.error("Error updating presentation in IndexedDB:", error);
    }
    return getHistory();
};


/**
 * Clears the entire presentation history from IndexedDB.
 */
export const clearHistory = async (): Promise<void> => {
  try {
    const db = await getDb();
    await new Promise<void>((resolve, reject) => {
        const transaction = db.transaction(STORE_NAME, 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.clear();
        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve();
    });
  } catch (error) {
    console.error("Error clearing history from IndexedDB:", error);
  }
};