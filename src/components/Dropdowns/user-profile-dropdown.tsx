// src/components/Dropdowns/user-profile-dropdown.tsx
import React, { useState, useEffect } from "react";
import {
  Dropdown,
  DropdownTrigger,
  DropdownMenu,
  DropdownItem,
  Button,
} from "@heroui/react";
import { Icon } from "@iconify/react";
import { supabase } from "../../supabaseClient";
import type { User as SupabaseUser } from "@supabase/supabase-js";
import { EditProfileModal } from "../Modals/EditProfileModal"; // Ajusta la ruta de tu modal si fuera distinto

interface UserProfileDropdownProps {
  onLogout: () => void;
}

export const UserProfileDropdown: React.FC<UserProfileDropdownProps> = ({
  onLogout,
}) => {
  const [currentUser, setCurrentUser] = useState<SupabaseUser | null>(null);
  const [loadingUser, setLoadingUser] = useState(true);
  const [isEditProfileModalOpen, setIsEditProfileModalOpen] = useState(false);

  // Función para obtener y refrescar datos del usuario
  const fetchAndSetUser = async () => {
    setLoadingUser(true);
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error) {
      console.error("Error fetching user:", error.message);
      setCurrentUser(null);
    } else {
      setCurrentUser(user);
    }
    setLoadingUser(false);
  };

  useEffect(() => {
    fetchAndSetUser(); // Cargar usuario al montar

    // Escucha cambios en el estado de autenticación
    const { data: authListener } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setCurrentUser(session?.user ?? null);
        // Si el usuario fue actualizado, refrescamos la info
        if (_event === "USER_UPDATED") {
          fetchAndSetUser();
        }
      }
    );

    return () => {
      authListener?.subscription.unsubscribe();
    };
  }, []);

  const userDisplayName =
    currentUser?.user_metadata?.full_name ||
    currentUser?.email?.split("@")[0] ||
    "Usuario";

  // Cuando el modal de edición de perfil cierre con éxito, refrescamos datos
  const handleProfileUpdate = () => {
    fetchAndSetUser();
  };

  return (
    <>
      <Dropdown placement="bottom-end">
        <DropdownTrigger>
          <Button
            isIconOnly
            variant="light"
            className="p-1.5 rounded-full hover:bg-slate-200/70 focus-visible:ring-2 focus-visible:ring-sky-500 focus-visible:ring-offset-2 transition-colors"
            aria-label="Menú de usuario"
          >
            <Icon icon="lucide:user-circle" className="w-7 h-7 text-slate-600" />
          </Button>
        </DropdownTrigger>

        <DropdownMenu
          aria-label="Acciones de usuario"
          className="w-60 shadow-lg rounded-xl border border-slate-200/80"
        >
          {loadingUser ? (
            <DropdownItem
              key="loading"
              isReadOnly
              className="p-3 text-center text-slate-500"
              textValue="Cargando..."
            >
              Cargando...
            </DropdownItem>
          ) : currentUser ? (
            <DropdownItem
              key="profile_info"
              className="p-3 border-b border-slate-200/80"
              isReadOnly
              // --- CORRECCIÓN APLICADA AQUÍ ---
              textValue={`${userDisplayName} ${currentUser.email}`}
            >
              <p className="text-sm font-semibold text-slate-800 truncate">
                {userDisplayName}
              </p>
              <p className="text-xs text-slate-500 truncate">
                {currentUser.email}
              </p>
            </DropdownItem>
          ) : (
            <DropdownItem
              key="no_user"
              isReadOnly
              className="p-3 text-center text-slate-500"
              textValue="No hay usuario activo."
            >
              No hay usuario activo.
            </DropdownItem>
          )}

          <DropdownItem
            key="profile"
            startContent={
              <Icon
                icon="lucide:user-circle"
                width={16}
                height={16}
                className="text-slate-500"
              />
            }
            className="text-slate-700 hover:bg-slate-100/80"
            onPress={() => setIsEditProfileModalOpen(true)}
            textValue="Perfil"
          >
            Perfil
          </DropdownItem>

          <DropdownItem
            key="logout"
            className="text-red-600 hover:bg-red-50/80 rounded-b-lg"
            startContent={
              <Icon icon="lucide:log-out" width={16} height={16} />
            }
            onPress={onLogout}
            color="danger"
            textValue="Cerrar Sesión"
          >
            Cerrar Sesión
          </DropdownItem>
        </DropdownMenu>
      </Dropdown>

      {currentUser && (
        <EditProfileModal
          isOpen={isEditProfileModalOpen}
          onClose={() => setIsEditProfileModalOpen(false)}
          currentUser={currentUser}
          onProfileUpdate={handleProfileUpdate}
        />
      )}
    </>
  );
};