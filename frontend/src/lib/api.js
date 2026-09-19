const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '');

export const apiUrl = (path) => /^https?:\/\//i.test(path) ? path : `${API_BASE_URL}${path}`;

export async function apiFetch(path, options = {}) {
  let response;
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), 15000);
  try {
    response = await fetch(apiUrl(path), {
      credentials: 'include',
      signal: controller.signal,
      ...options,
    });
  } catch (error) {
    const networkError = new Error(error.name === 'AbortError'
      ? 'LeakGuard API timed out. Check that the backend is running and reachable.'
      : 'LeakGuard API is unavailable. Check the backend URL and try again.');
    window.dispatchEvent(new CustomEvent('leakguard:api-error', { detail: networkError.message }));
    throw networkError;
  } finally {
    window.clearTimeout(timeout);
  }

  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    const message = Array.isArray(data.detail)
      ? data.detail.map((item) => item.msg).filter(Boolean).join('. ')
      : data.detail || `Request failed (${response.status})`;
    const apiError = new Error(message);
    window.dispatchEvent(new CustomEvent('leakguard:api-error', { detail: message }));
    throw apiError;
  }

  return response;
}