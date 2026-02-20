/**
 * API Client — thin fetch wrapper that auto-attaches the JWT token.
 * Replaces the Supabase JS client for all frontend API calls.
 */

const API_BASE = '';

function getToken(): string | null {
    return localStorage.getItem('auth_token');
}

export function setToken(token: string): void {
    localStorage.setItem('auth_token', token);
}

export function clearToken(): void {
    localStorage.removeItem('auth_token');
}

function buildHeaders(extra: Record<string, string> = {}): Record<string, string> {
    const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        ...extra,
    };
    const token = getToken();
    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }
    return headers;
}

async function handleResponse<T>(res: Response): Promise<T> {
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
        throw new Error((data as any).error || `Request failed with status ${res.status}`);
    }
    return data as T;
}

export const apiClient = {
    get: async <T = any>(path: string): Promise<T> => {
        const res = await fetch(`${API_BASE}${path}`, {
            method: 'GET',
            headers: buildHeaders(),
        });
        return handleResponse<T>(res);
    },

    post: async <T = any>(path: string, body?: any): Promise<T> => {
        const res = await fetch(`${API_BASE}${path}`, {
            method: 'POST',
            headers: buildHeaders(),
            body: body !== undefined ? JSON.stringify(body) : undefined,
        });
        return handleResponse<T>(res);
    },

    put: async <T = any>(path: string, body?: any): Promise<T> => {
        const res = await fetch(`${API_BASE}${path}`, {
            method: 'PUT',
            headers: buildHeaders(),
            body: body !== undefined ? JSON.stringify(body) : undefined,
        });
        return handleResponse<T>(res);
    },

    patch: async <T = any>(path: string, body?: any): Promise<T> => {
        const res = await fetch(`${API_BASE}${path}`, {
            method: 'PATCH',
            headers: buildHeaders(),
            body: body !== undefined ? JSON.stringify(body) : undefined,
        });
        return handleResponse<T>(res);
    },

    delete: async <T = any>(path: string): Promise<T> => {
        const res = await fetch(`${API_BASE}${path}`, {
            method: 'DELETE',
            headers: buildHeaders(),
        });
        return handleResponse<T>(res);
    },

    upload: async <T = any>(path: string, formData: FormData): Promise<T> => {
        const token = getToken();
        const headers: Record<string, string> = {};
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }
        // Don't set Content-Type — browser sets it with boundary for multipart
        const res = await fetch(`${API_BASE}${path}`, {
            method: 'POST',
            headers,
            body: formData,
        });
        return handleResponse<T>(res);
    },
};
