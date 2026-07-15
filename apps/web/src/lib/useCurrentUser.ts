import { useEffect, useState } from 'react';
import { api, type CurrentUser } from './api.js';

export function useCurrentUser() {
  const [user, setUser] = useState<CurrentUser | null | undefined>(undefined);

  useEffect(() => {
    api
      .me()
      .then(setUser)
      .catch(() => setUser(null));
  }, []);

  return { user, loading: user === undefined, refresh: () => api.me().then(setUser).catch(() => setUser(null)) };
}
