// src/pages/login/LoginPage.tsx
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../supabaseClient";
import { Eye, EyeOff, LogIn } from "lucide-react";
import { useWelcome } from "../../Context/WelcomeContext";
import { useAuth } from "../../Context/AuthContext";

const Logo = () => (
  <div className="flex items-center justify-center w-16 h-16 rounded-2xl bg-blue-500 shadow-lg mx-auto mb-6 mt-2">
    <svg width="34" height="34" fill="none" viewBox="0 0 40 40">
      <rect x="7" y="7" width="26" height="26" rx="6" fill="#fff" />
      <path
        d="M20 12l7 4v8l-7 4-7-4v-8l7-4z"
        stroke="#3b82f6"
        strokeWidth="2.2"
        fill="none"
      />
      <circle cx="20" cy="20" r="19" stroke="#3b82f6" strokeWidth="2" fill="none" />
    </svg>
  </div>
);

export default function LoginPage(): JSX.Element {
  const { session } = useAuth();
  const { showWelcome, onNavigate } = useWelcome();
  const navigate = useNavigate();

  // 🔄 Sólo navegamos cuando hay sesión y ya NO hay callback pendiente
  useEffect(() => {
    if (session && !onNavigate) {
      navigate("/", { replace: true });
    }
  }, [session, onNavigate, navigate]);

  const [email, setEmail] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [error, setError] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    const { data, error: loginError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (loginError) {
      setError("Correo o contraseña incorrectos.");
      setIsLoading(false);
      return;
    }

    const nombreMostrar = data?.user?.user_metadata?.full_name || email;
    // lanzamos la bienvenida con callback de navegación
    showWelcome(nombreMostrar, () => navigate("/", { replace: true }));

    setIsLoading(false);
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-gradient-to-br from-sky-500 to-indigo-600 relative">
      <div className="relative w-full max-w-md mx-auto">
        <div className="bg-white/90 backdrop-blur-xl shadow-2xl rounded-2xl px-7 pt-7 pb-8 flex flex-col gap-5 items-center transition-all duration-500">
          <Logo />
          <h2 className="text-2xl font-bold text-center text-indigo-700 mb-1">
            KodaXel Invoice
          </h2>
          <p className="text-slate-700 text-center font-medium mb-4 mt-[-8px] text-sm">
            Inventory & Billing Management System
          </p>
          {error && <div className="w-full text-center text-red-600 mb-2">{error}</div>}
          <form onSubmit={handleSubmit} className="w-full flex flex-col gap-4">
            <div>
              <label
                htmlFor="email"
                className="block text-xs font-semibold text-slate-700 mb-1"
              >
                Correo electrónico
              </label>
              <input
                id="email"
                type="email"
                className="w-full border border-slate-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-sky-400"
                placeholder="Tu correo electrónico"
                value={email}
                autoComplete="email"
                required
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div className="relative">
              <label
                htmlFor="password"
                className="block text-xs font-semibold text-slate-700 mb-1"
              >
                Contraseña
              </label>
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                className="w-full border border-slate-300 rounded-lg px-4 py-2 pr-10 focus:outline-none focus:ring-2 focus:ring-sky-400"
                placeholder="Tu contraseña"
                value={password}
                autoComplete="current-password"
                required
                onChange={(e) => setPassword(e.target.value)}
              />
              <button
                type="button"
                tabIndex={-1}
                className="absolute top-8 right-3 text-slate-400"
                onClick={() => setShowPassword((v) => !v)}
              >
                {showPassword ? (
                  <EyeOff className="w-5 h-5" />
                ) : (
                  <Eye className="w-5 h-5" />
                )}
              </button>
            </div>
            <button
              type="submit"
              disabled={isLoading}
              className="w-full flex items-center justify-center gap-2 bg-blue-500 hover:bg-blue-600 text-white font-bold py-2.5 rounded-lg shadow-md transition-all duration-200 text-base active:scale-98 disabled:opacity-60 mt-3"
            >
              {isLoading ? (
                <svg className="animate-spin w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24">
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8v8H4z"
                  />
                </svg>
              ) : (
                <>
                  <LogIn className="w-5 h-5" />
                  Ingresar
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
