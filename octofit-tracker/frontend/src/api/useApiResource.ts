import { useEffect, useState } from 'react';
import { getJson } from './client.js';

export type ApiResource<T> = { status: 'loading' } | { status: 'error' } | { status: 'success'; data: T };

export function useApiResource<T>(path: string): ApiResource<T> {
  const [resource, setResource] = useState<ApiResource<T>>({ status: 'loading' });

  useEffect(() => {
    let cancelled = false;
    setResource({ status: 'loading' });
    getJson<T>(path)
      .then((data) => { if (!cancelled) setResource({ status: 'success', data }); })
      .catch(() => { if (!cancelled) setResource({ status: 'error' }); });
    return () => { cancelled = true; };
  }, [path]);

  return resource;
}
