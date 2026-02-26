import { createContext, useContext, useEffect, useState } from "react";

type User = {
  user_id: number;
  username: string;
  email: string;
  is_admin?: boolean;
};

type AuthContextType = {
  user: User | null;
  setUser: (u: User | null) => void;
};

const AuthContext = createContext<AuthContextType>({
  user: null,
  setUser: () => {},
});

function parseJwt(token: string): User | null {
  try {
    const payload = JSON.parse(atob(token.split(".")[1]));
    return payload;
  } catch {
    return null;
  }
}

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) return;

    const decoded = parseJwt(token);
    if (decoded) setUser(decoded);
  }, []);

  return (
    <AuthContext.Provider value={{ user, setUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
