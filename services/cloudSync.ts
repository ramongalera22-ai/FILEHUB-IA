/**
 * CloudSync — Universal localStorage → Supabase sync
 * 
 * Uses a single Supabase table `user_data` with key-value pairs.
 * Every localStorage key starting with 'filehub_' is synced to cloud.
 * 
 * On load: pull from Supabase → merge with localStorage
 * On save: write to localStorage + push to Supabase
 */

import { supabase } from './supabaseClient';

let _userId: string | null = null;
let _syncing = false;
let _initialized = false;
const _pendingWrites: Map<string, string> = new Map();
let _writeTimer: any = null;

/** Initialize sync with user session */
export async function initCloudSync(userId: string) {
  _userId = userId;
  if (_initialized) return;
  _initialized = true;

  // Pull all cloud data and merge with localStorage
  try {
    const { data, error } = await supabase
      .from('user_data')
      .select('key, value, updated_at')
      .eq('user_id', userId);

    if (!error && data?.length) {
      console.log(`☁️ CloudSync: loaded ${data.length} keys from Supabase`);
      for (const row of data) {
        const cloudVal = row.value;
        if (cloudVal) {
          // Cloud always wins — this ensures cross-device sync
          localStorage.setItem(row.key, cloudVal);
        }
      }
    }
  } catch (e) {
    console.warn('☁️ CloudSync: initial load failed', e);
  }

  // Push any localStorage keys that aren't in cloud yet
  try {
    const localKeys: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith('filehub_')) localKeys.push(key);
    }

    if (localKeys.length > 0) {
      const rows = localKeys.map(key => ({
        user_id: userId,
        key,
        value: localStorage.getItem(key) || '',
        updated_at: new Date().toISOString(),
      }));

      await supabase.from('user_data').upsert(rows, { onConflict: 'user_id,key' });
      console.log(`☁️ CloudSync: pushed ${rows.length} keys to Supabase`);
    }
  } catch (e) {
    console.warn('☁️ CloudSync: initial push failed', e);
  }
}

/** Save a key to both localStorage and Supabase (debounced) */
export function cloudSet(key: string, value: string) {
  localStorage.setItem(key, value);

  if (!_userId || !key.startsWith('filehub_')) return;

  _pendingWrites.set(key, value);

  // Debounce writes to Supabase (batch every 2 seconds)
  if (_writeTimer) clearTimeout(_writeTimer);
  _writeTimer = setTimeout(flushWrites, 2000);
}

/** Get a key from localStorage (cloud data was already merged on init) */
export function cloudGet(key: string): string | null {
  return localStorage.getItem(key);
}

/** Flush pending writes to Supabase */
async function flushWrites() {
  if (!_userId || _pendingWrites.size === 0 || _syncing) return;
  _syncing = true;

  const rows = Array.from(_pendingWrites.entries()).map(([key, value]) => ({
    user_id: _userId!,
    key,
    value,
    updated_at: new Date().toISOString(),
  }));

  _pendingWrites.clear();

  try {
    await supabase.from('user_data').upsert(rows, { onConflict: 'user_id,key' });
  } catch (e) {
    console.warn('☁️ CloudSync: write failed', e);
  }

  _syncing = false;
}

/** Force sync all filehub_ keys now */
export async function forceSyncAll() {
  if (!_userId) return;

  const rows: { user_id: string; key: string; value: string; updated_at: string }[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key?.startsWith('filehub_')) {
      rows.push({
        user_id: _userId,
        key,
        value: localStorage.getItem(key) || '',
        updated_at: new Date().toISOString(),
      });
    }
  }

  if (rows.length > 0) {
    try {
      await supabase.from('user_data').upsert(rows, { onConflict: 'user_id,key' });
      console.log(`☁️ CloudSync: force synced ${rows.length} keys`);
    } catch (e) {
      console.warn('☁️ CloudSync: force sync failed', e);
    }
  }
}

/** Monkey-patch localStorage to auto-sync filehub_ keys */
export function enableAutoSync() {
  const originalSetItem = localStorage.setItem.bind(localStorage);
  localStorage.setItem = (key: string, value: string) => {
    originalSetItem(key, value);
    if (key.startsWith('filehub_') && _userId) {
      _pendingWrites.set(key, value);
      if (_writeTimer) clearTimeout(_writeTimer);
      _writeTimer = setTimeout(flushWrites, 2000);
    }
  };
}
