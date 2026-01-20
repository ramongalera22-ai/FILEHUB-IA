import { StoredFile } from '../types';

const API_URL = import.meta.env.VITE_API_URL || '';

// Helper to get headers with token
const getHeaders = () => {
    const token = localStorage.getItem('nash_token');
    return {
        'Content-Type': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {})
    };
};

export const nashService = {
    auth: {
        async login(email: string, password: string) {
            const response = await fetch(`${API_URL}/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password })
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.error);
            localStorage.setItem('nash_token', data.token);
            return { user: data.user, session: { access_token: data.token, user: data.user } };
        },

        async signUp(email: string, password: string, name: string) {
            const response = await fetch(`${API_URL}/auth/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password, name })
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.error);
            localStorage.setItem('nash_token', data.token);
            return { user: data.user, session: { access_token: data.token, user: data.user } };
        },

        async getSession() {
            const token = localStorage.getItem('nash_token');
            if (!token) return { data: { session: null } };

            try {
                const response = await fetch(`${API_URL}/auth/me`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                if (!response.ok) {
                    localStorage.removeItem('nash_token');
                    return { data: { session: null } };
                }
                const data = await response.json();
                return { data: { session: { access_token: token, user: data.user } } };
            } catch (e) {
                return { data: { session: null } };
            }
        },

        async signOut() {
            localStorage.removeItem('nash_token');
            return { error: null };
        }
    },

    db: {
        async getAll(collection: string) {
            const response = await fetch(`${API_URL}/api/data/${collection}`, {
                headers: getHeaders()
            });
            if (!response.ok) throw new Error('Failed to fetch data');
            const data = await response.json();
            // Wrap in object to simpler Supabase-like response { data: [...] }
            return { data };
        },

        async upsert(collection: string, item: any) {
            const response = await fetch(`${API_URL}/api/data/${collection}/${item.id}`, {
                method: 'POST',
                headers: getHeaders(),
                body: JSON.stringify(item)
            });
            if (!response.ok) throw new Error('Failed to save data');
            return { error: null };
        },

        async delete(collection: string, id: string) {
            const response = await fetch(`${API_URL}/api/data/${collection}/${id}`, {
                method: 'DELETE',
                headers: getHeaders()
            });
            if (!response.ok) throw new Error('Failed to delete data');
            return { error: null };
        }
    },

    storage: {
        async upload(file: File) {
            const formData = new FormData();
            formData.append('file', file);

            const token = localStorage.getItem('nash_token');
            const response = await fetch(`${API_URL}/api/upload`, {
                method: 'POST',
                headers: {
                    ...(token ? { 'Authorization': `Bearer ${token}` } : {})
                },
                body: formData
            });

            if (!response.ok) throw new Error('Upload failed');
            const data = await response.json();
            return { data }; // Returns { id, url, ... }
        },

        async delete(filename: string) {
            // Backend doesn't support deleting files by name directly via API for security/simplicity yet,
            // but data deletion handles metadata. 
            // For now, we assume simple file management.
            return { error: null };
        }
    }
};
