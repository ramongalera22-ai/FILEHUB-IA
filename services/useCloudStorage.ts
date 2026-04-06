/**
 * useCloudStorage — Hook that reads from localStorage AND refreshes when cloud sync completes
 * Use instead of direct localStorage.getItem for any filehub_* key
 */
import { useState, useEffect, useCallback } from 'react';

export function useCloudStorage<T>(key: string, defaultValue: T): [T, (val: T) => void] {
  const read = useCallback((): T => {
    try {
      const stored = localStorage.getItem(key);
      return stored ? JSON.parse(stored) : defaultValue;
    } catch {
      return defaultValue;
    }
  }, [key, defaultValue]);

  const [value, setValue] = useState<T>(read);

  // Re-read when cloud sync finishes loading
  useEffect(() => {
    const handler = () => {
      const fresh = read();
      setValue(fresh);
    };
    window.addEventListener('filehub_cloud_ready', handler);
    // Also listen for storage events from other tabs
    const storageHandler = (e: StorageEvent) => {
      if (e.key === key) setValue(read());
    };
    window.addEventListener('storage', storageHandler);
    return () => {
      window.removeEventListener('filehub_cloud_ready', handler);
      window.removeEventListener('storage', storageHandler);
    };
  }, [key, read]);

  const set = useCallback((val: T) => {
    setValue(val);
    localStorage.setItem(key, JSON.stringify(val));
  }, [key]);

  return [value, set];
}
