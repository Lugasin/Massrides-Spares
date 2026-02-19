import { logActivity } from './activityLogger';

// Advanced local storage caching with TTL and compression
class CacheStorage {
  private prefix = 'massrides_cache_';
  private defaultTTL = 24 * 60 * 60 * 1000; // 24 hours

  // Set item with TTL
  set(key: string, value: any, ttl?: number): void {
    try {
      const item = {
        value,
        timestamp: Date.now(),
        ttl: ttl || this.defaultTTL,
      };
      localStorage.setItem(this.prefix + key, JSON.stringify(item));
    } catch (error) {
      console.warn('CacheStorage: Failed to set item', key, error);
      logActivity('cache_error', 'set', { key, error: error.message });
    }
  }

  // Get item with TTL check
  get<T = any>(key: string): T | null {
    try {
      const item = localStorage.getItem(this.prefix + key);
      if (!item) return null;

      const parsed = JSON.parse(item);
      const now = Date.now();

      // Check if item has expired
      if (now - parsed.timestamp > parsed.ttl) {
        this.delete(key);
        return null;
      }

      return parsed.value;
    } catch (error) {
      console.warn('CacheStorage: Failed to get item', key, error);
      this.delete(key); // Clean up corrupted data
      return null;
    }
  }

  // Delete item
  delete(key: string): void {
    try {
      localStorage.removeItem(this.prefix + key);
    } catch (error) {
      console.warn('CacheStorage: Failed to delete item', key, error);
    }
  }

  // Clear all cached items
  clear(): void {
    try {
      const keys = Object.keys(localStorage);
      keys.forEach(key => {
        if (key.startsWith(this.prefix)) {
          localStorage.removeItem(key);
        }
      });
    } catch (error) {
      console.warn('CacheStorage: Failed to clear cache', error);
    }
  }

  // Get cache size in bytes
  getSize(): number {
    let size = 0;
    try {
      const keys = Object.keys(localStorage);
      keys.forEach(key => {
        if (key.startsWith(this.prefix)) {
          const item = localStorage.getItem(key);
          if (item) {
            size += item.length;
          }
        }
      });
    } catch (error) {
      console.warn('CacheStorage: Failed to calculate size', error);
    }
    return size;
  }

  // Clean expired items
  cleanExpired(): void {
    try {
      const keys = Object.keys(localStorage);
      const now = Date.now();

      keys.forEach(key => {
        if (key.startsWith(this.prefix)) {
          try {
            const item = localStorage.getItem(key);
            if (item) {
              const parsed = JSON.parse(item);
              if (now - parsed.timestamp > parsed.ttl) {
                localStorage.removeItem(key);
              }
            }
          } catch (error) {
            // Remove corrupted items
            localStorage.removeItem(key);
          }
        }
      });
    } catch (error) {
      console.warn('CacheStorage: Failed to clean expired items', error);
    }
  }
}

// IndexedDB for larger data storage
class IndexedDBStorage {
  private dbName = 'MassridesCache';
  private version = 1;
  private db: IDBDatabase | null = null;

  async init(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.version);

      request.onerror = () => {
        console.warn('IndexedDBStorage: Failed to open database');
        reject(request.error);
      };

      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains('cache')) {
          const store = db.createObjectStore('cache', { keyPath: 'key' });
          store.createIndex('timestamp', 'timestamp', { unique: false });
        }
      };
    });
  }

  async set(key: string, value: any, ttl?: number): Promise<void> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['cache'], 'readwrite');
      const store = transaction.objectStore('cache');

      const item = {
        key,
        value,
        timestamp: Date.now(),
        ttl: ttl || 24 * 60 * 60 * 1000, // 24 hours default
      };

      const request = store.put(item);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async get<T = any>(key: string): Promise<T | null> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['cache'], 'readonly');
      const store = transaction.objectStore('cache');

      const request = store.get(key);

      request.onsuccess = () => {
        const item = request.result;
        if (!item) {
          resolve(null);
          return;
        }

        const now = Date.now();
        if (now - item.timestamp > item.ttl) {
          this.delete(key); // Clean up expired item
          resolve(null);
          return;
        }

        resolve(item.value);
      };

      request.onerror = () => reject(request.error);
    });
  }

  async delete(key: string): Promise<void> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['cache'], 'readwrite');
      const store = transaction.objectStore('cache');

      const request = store.delete(key);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async clear(): Promise<void> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['cache'], 'readwrite');
      const store = transaction.objectStore('cache');

      const request = store.clear();

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async cleanExpired(): Promise<void> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['cache'], 'readwrite');
      const store = transaction.objectStore('cache');
      const now = Date.now();

      const request = store.openCursor();

      request.onsuccess = () => {
        const cursor = request.result;
        if (cursor) {
          const item = cursor.value;
          if (now - item.timestamp > item.ttl) {
            cursor.delete();
          }
          cursor.continue();
        }
      };

      request.onerror = () => reject(request.error);
    });
  }
}

// User preferences cache
class UserPreferencesCache {
  private cache = new CacheStorage();
  private key = 'user_preferences';

  set(preferences: Record<string, any>): void {
    this.cache.set(this.key, preferences, 7 * 24 * 60 * 60 * 1000); // 7 days
  }

  get(): Record<string, any> | null {
    return this.cache.get(this.key);
  }

  update(updates: Record<string, any>): void {
    const current = this.get() || {};
    this.set({ ...current, ...updates });
  }

  clear(): void {
    this.cache.delete(this.key);
  }
}

// Search cache for product searches
class SearchCache {
  private cache = new CacheStorage();
  private maxEntries = 50;

  set(query: string, results: any[]): void {
    const key = `search_${btoa(query).slice(0, 50)}`; // Base64 encode and limit length
    this.cache.set(key, results, 60 * 60 * 1000); // 1 hour TTL

    // Clean up old entries if we have too many
    this.cleanup();
  }

  get(query: string): any[] | null {
    const key = `search_${btoa(query).slice(0, 50)}`;
    return this.cache.get(key);
  }

  private cleanup(): void {
    // This is a simple cleanup - in a real implementation,
    // you might want to track and remove oldest entries
    const size = this.cache.getSize();
    if (size > 1024 * 1024) { // 1MB limit
      console.log('SearchCache: Cache size exceeded, clearing...');
      this.cache.clear();
    }
  }
}

// Export instances
export const cacheStorage = new CacheStorage();
export const indexedDBStorage = new IndexedDBStorage();
export const userPreferences = new UserPreferencesCache();
export const searchCache = new SearchCache();

// Initialize IndexedDB on first use
let indexedDBInitialized = false;
export const initIndexedDB = async () => {
  if (!indexedDBInitialized) {
    try {
      await indexedDBStorage.init();
      indexedDBInitialized = true;
    } catch (error) {
      console.warn('Failed to initialize IndexedDB:', error);
    }
  }
};

// Periodic cleanup
export const setupCacheCleanup = () => {
  // Clean expired items every hour
  setInterval(() => {
    cacheStorage.cleanExpired();
    if (indexedDBInitialized) {
      indexedDBStorage.cleanExpired();
    }
  }, 60 * 60 * 1000);

  // Clean on page load
  cacheStorage.cleanExpired();
  initIndexedDB().then(() => {
    indexedDBStorage.cleanExpired();
  });
};