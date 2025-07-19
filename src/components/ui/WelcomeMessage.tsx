// src/components/ui/WelcomeMessage.tsx
import React, { useEffect } from "react";
import { CheckCircle } from "lucide-react";
import { useWelcome } from "../../Context/WelcomeContext";

export default function WelcomeMessage() {
  const { show, nombre, hideWelcome, onNavigate } = useWelcome();

  useEffect(() => {
    if (show && onNavigate) {
      const navigateTimeout = setTimeout(() => {
        onNavigate();
      }, 2200);
      const hideTimeout = setTimeout(hideWelcome, 2300);
      return () => {
        clearTimeout(navigateTimeout);
        clearTimeout(hideTimeout);
      };
    }
  }, [show, onNavigate, hideWelcome]);

  if (!show) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#144b8a]/80 backdrop-blur-[1.5px]">
      <div className="bg-white rounded-2xl shadow-2xl p-9 flex flex-col items-center">
        <div className="bg-blue-100 rounded-full w-20 h-20 mb-6 flex items-center justify-center shadow-lg border-4 border-white animate-bounce-slow">
          <CheckCircle className="text-blue-500 w-14 h-14" strokeWidth={2.5} />
        </div>
        <h2 className="text-2xl font-bold text-center mb-2">¡Bienvenido!</h2>
        <div className="text-2xl font-extrabold text-blue-600 mb-2 text-center">
          {nombre}
        </div>
        <p className="text-base text-slate-600 text-center">
          Has ingresado exitosamente.<br />
          Redirigiendo al dashboard…
        </p>
      </div>
    </div>
  );
}
