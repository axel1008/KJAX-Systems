import React from 'react';
import type { Cliente } from './types';
import { ConfirmationModal } from '../../components/ui/confirmation-modal';

interface DeleteClientModalProps {
  isOpen: boolean;
  onClose: () => void;
  client: Cliente;
  // --- CORRECCIÓN: La función ahora espera una Promesa ---
  onDeleted: (id: number) => Promise<void>;
}

// --- CORRECCIÓN: Se cambia a una exportación nombrada (named export) ---
export const DeleteClientModal: React.FC<DeleteClientModalProps> = ({
  isOpen,
  onClose,
  client,
  onDeleted,
}) => {
  const handleConfirm = async () => {
    await onDeleted(client.id);
    onClose();
  };

  return (
    <ConfirmationModal
      isOpen={isOpen}
      onClose={onClose}
      onConfirm={handleConfirm}
      title="Confirmar Desactivación"
      message={`¿Estás seguro de que quieres desactivar al cliente "${client.nombre}"? Su historial se conservará.`}
      isConfirming={false} // Puedes conectar esto a un estado de carga si lo deseas
    />
  );
};