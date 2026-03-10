import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from 'react';
import { User, AuthTokens } from '@/types';
import {
  setTokens,
  clearTokens,
  getAccessToken,
  setOnAuthError,
  prefetchAll,
  invalidateCache,
  post,
  get,
} from '@/api/client';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, username: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const logout = useCallback(() => {
    clearTokens();
    invalidateCache();
    setUser(null);
  }, []);

  useEffect(() => {
    setOnAuthError(logout);

    const token = getAccessToken();
    if (token) {
      get<User>('/auth/me')
        .then((u) => { setUser(u); prefetchAll(); })
        .catch(() => clearTokens())
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, [logout]);

  const login = async (email: string, password: string) => {
    const data = await post<AuthTokens & { user: User }>('/auth/login', {
      email,
      password,
    });
    setTokens(data);
    setUser(data.user);
    prefetchAll();
  };

  const register = async (
    email: string,
    username: string,
    password: string
  ) => {
    const data = await post<AuthTokens & { user: User }>('/auth/register', {
      email,
      username,
      password,
    });
    setTokens(data);
    setUser(data.user);
    prefetchAll();
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
