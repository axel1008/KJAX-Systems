// RUTA: src/Context/NotificationContext.tsx (CORREGIDO)
import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useRef,
  ReactNode,
  useCallback, // Importar useCallback
} from "react";
import toast from "react-hot-toast"; // Importar toast
import { supabase } from "../supabaseClient";
import { useAuth } from "./AuthContext";
import type { AppNotification } from "../types/notifications";
import type { RealtimeChannel } from "@supabase/supabase-js";

// Interfaz para el tipo de notificación que recibirá la función
interface NotificationPayload {
  type: 'success' | 'error' | 'info' | 'loading';
  title: string;
  message: string;
}

interface NotificationContextType {
  notifications: AppNotification[];
  unreadCount: number;
  isLoading: boolean;
  // --- INICIO: CORRECCIÓN ---
  addNotification: (notification: NotificationPayload) => void;
  // --- FIN: CORRECCIÓN ---
  markAsRead: (id: number) => void;
  markAllAsRead: () => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(
  undefined
);

export const NotificationProvider = ({ children }: { children: ReactNode }) => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const channelRef = useRef<RealtimeChannel | null>(null);

  useEffect(() => {
    // ... (el resto del useEffect se mantiene igual) ...
    if (!user) {
      if (channelRef.current) {
        void supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
      setNotifications([]);
      setIsLoading(false);
      return;
    }

    const topic = `public:notifications:user_id=eq.${user.id}`;
    let channel: RealtimeChannel;

    if (channelRef.current?.topic === topic) {
      channel = channelRef.current;
    } else {
      if (channelRef.current) void supabase.removeChannel(channelRef.current);

      channel = supabase
        .channel(topic)
        .on<AppNotification>(
          "postgres_changes",
          { event: "*", schema: "public", table: "notifications", filter: `user_id=eq.${user.id}` },
          (payload) => {
            if (payload.eventType === "INSERT") setNotifications((prev) => [payload.new, ...prev]);
            else if (payload.eventType === "UPDATE") setNotifications((prev) => prev.map((n) => (n.id === payload.new.id ? payload.new : n)));
          }
        );
      channelRef.current = channel;
    }

    const subscribeIfNeeded = async () => {
      if (channel.state !== "joined" && channel.state !== "joining") {
        try {
          await channel.subscribe();
        } catch (err) {
          console.error("Error en subscripción a notificaciones:", err);
        }
      }
    };

    (async () => {
      setIsLoading(true);
      const { data, error } = await supabase.from("notifications").select("*").eq("user_id", user.id).order("created_at", { ascending: false });
      if (error) console.error("Error cargando notificaciones:", error);
      else setNotifications(data ?? []);
      setIsLoading(false);
      await subscribeIfNeeded();
    })();
  }, [user?.id]);

  // --- INICIO: FUNCIÓN CORREGIDA ---
  // Se implementa la función que faltaba
  const addNotification = useCallback((notification: NotificationPayload) => {
    const { type, title, message } = notification;
    const content = (
      <div>
        <p className="font-bold">{title}</p>
        <p>{message}</p>
      </div>
    );

    switch (type) {
      case 'success':
        toast.success(content);
        break;
      case 'error':
        toast.error(content);
        break;
      case 'loading':
        toast.loading(content);
        break;
      default:
        toast(content);
        break;
    }
  }, []);
  // --- FIN: FUNCIÓN CORREGIDA ---

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  const markAsRead = async (id: number) => {
    // ... (sin cambios)
  };

  const markAllAsRead = async () => {
    // ... (sin cambios)
  };

  // --- INICIO: CORRECCIÓN EN EL VALUE ---
  // Se añade la nueva función al valor del contexto
  const value = {
    notifications,
    unreadCount,
    isLoading,
    addNotification, // <-- AÑADIDO
    markAsRead,
    markAllAsRead,
  };
  // --- FIN: CORRECCIÓN EN EL VALUE ---

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error(
      "useNotifications debe ser usado dentro de un NotificationProvider"
    );
  }
  return context;
};