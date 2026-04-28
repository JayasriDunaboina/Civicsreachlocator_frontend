import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { loginUser, signupUser } from "../api";

const STORAGE_KEY = "civicreach_user";

export interface User {
  name: string;
  email: string;
}

interface AuthContextValue {
  user: User | null;
  isLoggedIn: boolean;
  login: (email: string, password: string, name?: string) => Promise<void>;
  signUp: (email: string, password: string, name: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function loadUser(): User | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw) as User;
    if (data?.name && data?.email) return data;
  } catch {
    // ignore
  }
  return null;
}

function saveUser(user: User | null) {
  if (user) localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
  else localStorage.removeItem(STORAGE_KEY);
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(loadUser);

  useEffect(() => {
    setUser(loadUser());
  }, []);

  const login = useCallback(
    async (email: string, password: string, name?: string) => {
      await loginUser(email, password); // throws on error
      const u: User = {
        name:
          name ??
          (email.split("@")[0].replace(/[._]/g, " ") || "User"),
        email,
      };
      setUser(u);
      saveUser(u);
    },
    []
  );

  const signUp = useCallback(
    async (email: string, password: string, name: string) => {
      await signupUser(name, email, password); // throws on error
      const u: User = { name: name.trim() || email.split("@")[0], email };
      setUser(u);
      saveUser(u);
    },
    []
  );

  const logout = useCallback(() => {
    setUser(null);
    saveUser(null);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoggedIn: !!user,
        login,
        signUp,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
