// src/Context/WelcomeContext.tsx
import React, { createContext, useContext, useState, useCallback } from "react";

type WelcomeContextType = {
  show: boolean;
  nombre: string;
  showWelcome: (nombre: string, onNavigate: () => void) => void;
  hideWelcome: () => void;
  onNavigate?: () => void;
};

const WelcomeContext = createContext<WelcomeContextType>({
  show: false,
  nombre: "",
  showWelcome: () => {},
  hideWelcome: () => {},
  onNavigate: undefined,
});

export function WelcomeProvider({ children }: { children: React.ReactNode }) {
  const [show, setShow] = useState(false);
  const [nombre, setNombre] = useState<string>("");
  const [onNavigate, setOnNavigate] = useState<(() => void) | undefined>(undefined);

  const showWelcome = useCallback(
    (nombreValue: string, navigateCallback: () => void) => {
      setNombre(nombreValue);
      setOnNavigate(() => navigateCallback);
      setShow(true);
    },
    []
  );

  const hideWelcome = useCallback(() => {
    setShow(false);
    setOnNavigate(undefined);  // <- limpiamos el callback
  }, []);

  return (
    <WelcomeContext.Provider value={{ show, nombre, showWelcome, hideWelcome, onNavigate }}>
      {children}
    </WelcomeContext.Provider>
  );
}

export const useWelcome = () => useContext(WelcomeContext);
