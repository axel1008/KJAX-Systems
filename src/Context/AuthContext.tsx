import React, { createContext, useState, useEffect, useContext, ReactNode } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '../supabaseClient';

interface AuthContextType {
  session: Session | null;
  user: User | null;
  role: string | null;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    console.log("AuthProvider: useEffect ha iniciado.");

    const fetchInitialData = async () => {
      console.log("AuthProvider: 1. Iniciando la carga de datos inicial.");
      try {
        console.log("AuthProvider: 2. Intentando obtener la sesión desde Supabase...");
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        console.log("AuthProvider: 3. Llamada a getSession() completada.");

        if (sessionError) throw sessionError;

        setSession(session);
        const currentUser = session?.user;
        setUser(currentUser ?? null);

        if (currentUser) {
          console.log(`AuthProvider: 4. Sesión encontrada para ${currentUser.email}. Obteniendo perfil...`);
          const { data: profile, error: profileError } = await supabase
            .from('usuarios')
            .select('rol')
            .eq('id', currentUser.id)
            .single();
          
          console.log("AuthProvider: 5. Llamada para obtener perfil completada.");

          if (profileError) {
            console.error("Error al obtener el perfil inicial:", profileError.message);
            setRole(null);
          } else {
            console.log("AuthProvider: Rol obtenido ->", profile?.rol);
            setRole(profile?.rol || null);
          }
        } else {
          console.log("AuthProvider: 4. No se encontró una sesión activa.");
          setRole(null);
        }
      } catch (error) {
        console.error("AuthProvider: Ocurrió un error en el bloque try/catch de fetchInitialData:", error);
      } finally {
        console.log("AuthProvider: 6. Bloque 'finally' alcanzado. Estableciendo loading = false.");
        setLoading(false);
      }
    };

    fetchInitialData();

    // Se mantiene el listener para futuros cambios (login/logout)
    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (_event, newSession) => {
        console.log(`AuthProvider: onAuthStateChange se activó con el evento: ${_event}`);
        setSession(newSession);
        setUser(newSession?.user ?? null);
      }
    );

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  const value = { session, user, role, loading };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth debe ser usado dentro de un AuthProvider');
  }
  return context;
};