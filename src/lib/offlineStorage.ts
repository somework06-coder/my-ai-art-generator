
export interface CachedShader {
    id: string; // Map to jobId or database ID
    title: string;
    fragmentCode: string;
    aspectRatio: string;
    prompt: string;
    createdAt: number;
    metadata?: import('@/types').StockMetadata;
}

const DB_NAME = 'motion-studio-offline';
const STORE_NAME = 'shaders';
const DB_VERSION = 1;

class OfflineStorage {
    private dbPromise: Promise<IDBDatabase>;

    constructor() {
        this.dbPromise = new Promise((resolve, reject) => {
            if (typeof window === 'undefined') {
                return; // SSR check
            }

            const request = indexedDB.open(DB_NAME, DB_VERSION);

            request.onerror = () => reject(request.error);
            request.onsuccess = () => resolve(request.result);

            request.onupgradeneeded = (event) => {
                const db = (event.target as IDBOpenDBRequest).result;
                if (!db.objectStoreNames.contains(STORE_NAME)) {
                    // Create object store with 'id' as the keyPath
                    const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
                    // Index by creation time to sort easily
                    store.createIndex('createdAt', 'createdAt', { unique: false });
                }
            };
        });
    }

    async saveShader(shader: CachedShader): Promise<void> {
        const db = await this.dbPromise;
        return new Promise((resolve, reject) => {
            const transaction = db.transaction(STORE_NAME, 'readwrite');
            const store = transaction.objectStore(STORE_NAME);
            const request = store.put(shader); // put adds or updates

            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    }

    async getAllShaders(): Promise<CachedShader[]> {
        const db = await this.dbPromise;
        return new Promise((resolve, reject) => {
            const transaction = db.transaction(STORE_NAME, 'readonly');
            const store = transaction.objectStore(STORE_NAME);
            const index = store.index('createdAt');

            // Get all records, sorted by createdAt (ascending by default via cursor)
            const request = index.getAll();

            request.onsuccess = () => {
                // Reverse to get newest first
                const results = (request.result as CachedShader[]).reverse();
                resolve(results);
            };
            request.onerror = () => reject(request.error);
        });
    }

    async deleteShader(id: string): Promise<void> {
        const db = await this.dbPromise;
        return new Promise((resolve, reject) => {
            const transaction = db.transaction(STORE_NAME, 'readwrite');
            const store = transaction.objectStore(STORE_NAME);
            const request = store.delete(id);

            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    }
}

// Export a singleton instance
export const offlineStorage = new OfflineStorage();
