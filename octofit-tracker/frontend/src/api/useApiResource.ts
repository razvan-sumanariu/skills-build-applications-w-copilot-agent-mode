import { useEffect, useState } from 'react';

export type ApiResource<T> = { status: 'loading' } | { status: 'error' } | { status: 'success'; data: T };

// Runs the caller's request (made through the shared API client) and tracks loading, error, and success.
export function useApiResource<T>(load: () => Promise<T>, deps: readonly unknown[]): ApiResource<T> {
  const [resource, setResource] = useState<ApiResource<T>>({ status: 'loading' });

  useEffect(() => {
    let cancelled = false;
    setResource({ status: 'loading' });
    load()
      .then((data) => { if (!cancelled) setResource({ status: 'success', data }); })
      .catch(() => { if (!cancelled) setResource({ status: 'error' }); });
    return () => { cancelled = true; };
  }, deps);

  return resource;
}
