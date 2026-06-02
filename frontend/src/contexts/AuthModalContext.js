import { createContext, useContext, useState, useCallback } from "react";

const AuthModalContext = createContext(null);

export function AuthModalProvider({ children }) {
  const [isOpen, setIsOpen] = useState(false);
  const [mode, setMode] = useState("login");
  const [redirectTo, setRedirectTo] = useState(null);

  const openAuth = useCallback((m = "login", redirect = null) => {
    setMode(m);
    setRedirectTo(redirect);
    setIsOpen(true);
  }, []);

  const closeAuth = useCallback(() => {
    setIsOpen(false);
    setRedirectTo(null);
  }, []);

  return (
    <AuthModalContext.Provider value={{ isOpen, mode, redirectTo, openAuth, closeAuth }}>
      {children}
    </AuthModalContext.Provider>
  );
}

export function useAuthModal() {
  const ctx = useContext(AuthModalContext);
  if (!ctx) throw new Error("useAuthModal must be used within AuthModalProvider");
  return ctx;
}
