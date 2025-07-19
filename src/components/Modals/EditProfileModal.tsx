// src/components/Modals/EditProfileModal.tsx
import React, { useState, useEffect, useRef } from 'react';
import { Input } from '@heroui/react'; 
import { FormModal } from '../ui/form-modal'; 
import { supabase } from '../../supabaseClient'; 
import type { User as SupabaseUser } from '@supabase/supabase-js';

interface EditProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: SupabaseUser | null;
  onProfileUpdate: () => void; 
}

export const EditProfileModal: React.FC<EditProfileModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  onProfileUpdate,
}) => {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');

  const [isLoading, setIsLoading] = useState(false); // Este estado se usará
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const prevIsOpen = useRef(isOpen);

  useEffect(() => {
    if (currentUser) {
      setFullName(currentUser.user_metadata?.full_name || '');
      setEmail(currentUser.email || '');
      setPhone(currentUser.phone || currentUser.user_metadata?.phone || ''); 
    }

    if (isOpen && !prevIsOpen.current) { 
        setErrorMessage(null);
        setSuccessMessage(null);
    }
    prevIsOpen.current = isOpen; 
  }, [currentUser, isOpen]);

  const handleFormSubmit = async () => {
    if (!currentUser) {
      setErrorMessage('No hay usuario activo.');
      return;
    }

    setErrorMessage(null);
    setSuccessMessage(null);
    setIsLoading(true); // <-- Se establece isLoading

    const initialFullName = currentUser.user_metadata?.full_name || '';
    const initialEmail = currentUser.email || '';
    const initialUserPhone = currentUser.phone || currentUser.user_metadata?.phone || '';

    const hasFullNameChanged = fullName !== initialFullName;
    const hasEmailChanged = email && email !== initialEmail;
    const hasPhoneChanged = phone !== initialUserPhone;

    if (!hasFullNameChanged && !hasEmailChanged && !hasPhoneChanged) {
      setSuccessMessage('No hay cambios para guardar.');
      setIsLoading(false); // <-- Se resetea isLoading
      return;
    }

    let emailChanged = false;
    const updates: { email?: string; phone?: string; data?: { full_name?: string; phone?: string } } = {};

    if (hasEmailChanged) {
      updates.email = email;
      emailChanged = true;
    }
    if (hasFullNameChanged) {
      if (!updates.data) updates.data = {};
      updates.data.full_name = fullName;
    }
    if (hasPhoneChanged) {
      updates.phone = phone; 
      if (!updates.data) updates.data = {};
      updates.data.phone = phone; 
    }
    
    console.log("EditProfileModal: Objeto de actualizaciones:", updates);

    const { error } = await supabase.auth.updateUser(updates);

    setIsLoading(false); // <-- Se resetea isLoading

    if (error) {
      console.error('EditProfileModal: Error updating profile:', error);
      setErrorMessage(error.message || 'Error al actualizar el perfil.');
    } else {
      console.log('EditProfileModal: Perfil actualizado en Supabase.');
      let successMsg = 'Perfil actualizado exitosamente.';
      if (emailChanged) {
        successMsg += ' Se ha enviado un correo de confirmación a la nueva dirección de email.';
      }
      setSuccessMessage(successMsg); 
      onProfileUpdate(); 
      
      console.log("EditProfileModal: Guardado exitoso, intentando cerrar...");
      setTimeout(() => {
        console.log("EditProfileModal: Llamando a onClose desde setTimeout...");
        onClose(); 
      }, 1500); 
    }
  };

  return (
    <FormModal
      isOpen={isOpen}
      onClose={() => {
        console.log("EditProfileModal: FormModal onClose CALLED (X o Cancelar)");
        onClose(); 
      }}
      title="Editar Perfil"
      onFormSubmit={handleFormSubmit}
      submitButtonText="Guardar Cambios"
      submitLoadingText="Guardando..."
      // Pasar el estado isLoading al FormModal si este lo soporta para deshabilitar el botón, etc.
      // Si FormModal tiene una prop como `isSubmitting` o `isLoading`, úsala aquí:
      isSubmitting={isLoading} // Asumiendo que FormModal usa `isSubmitting` (como en tu FormModal original)
    >
      <div className="space-y-4">
        {errorMessage && <p className="text-sm text-red-600 bg-red-100 p-3 rounded-md animate-pulse">{errorMessage}</p>}
        {successMessage && <p className="text-sm text-green-600 bg-green-100 p-3 rounded-md">{successMessage}</p>}
        
        <div>
          <label htmlFor="fullName" className="block text-sm font-medium text-slate-700 mb-1">
            Nombre Completo
          </label>
          <Input
            type="text"
            id="fullName"
            name="fullName"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            className="w-full"
            placeholder="Tu nombre completo"
            autoComplete="name"
            disabled={isLoading} // Deshabilitar input mientras carga
          />
        </div>
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-slate-700 mb-1">
            Correo Electrónico
          </label>
          <Input
            type="email"
            id="email"
            name="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full"
            placeholder="tu@email.com"
            autoComplete="email"
            disabled={isLoading} // Deshabilitar input mientras carga
          />
          {currentUser && email !== currentUser.email && (
            <p className="text-xs text-amber-600 mt-1">Cambiar el email requerirá confirmación.</p>
          )}
        </div>
        <div>
          <label htmlFor="phone" className="block text-sm font-medium text-slate-700 mb-1">
            Teléfono (Opcional)
          </label>
          <Input
            type="tel"
            id="phone"
            name="phone"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="w-full"
            placeholder="Ej: 88887777"
            autoComplete="tel"
            disabled={isLoading} // Deshabilitar input mientras carga
          />
        </div>
      </div>
    </FormModal>
  );
};
