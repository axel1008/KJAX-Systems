import React from "react";
import { Button, Modal, ModalBody, ModalContent, ModalFooter, ModalHeader } from "@heroui/react";
import { Icon } from "@iconify/react";

interface ConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  isConfirming?: boolean;
  confirmButtonClass?: string;
}

export const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = "Eliminar",
  cancelText = "Cancelar",
  isConfirming = false,
  confirmButtonClass = "bg-red-500 hover:bg-red-600 focus:ring-red-400",
}) => {
  return (
    <Modal isOpen={isOpen} onOpenChange={onClose}>
      <ModalContent>
        {(onModalClose) => (
          <>
            <ModalHeader className="flex flex-col gap-1">{title}</ModalHeader>
            <ModalBody>
              <div className="flex items-start">
                <div className="mr-4 flex-shrink-0 mt-1">
                  <Icon 
                    icon="lucide:alert-triangle" 
                    width={24} 
                    height={24} 
                    className="text-yellow-500" 
                  />
                </div>
                <p className="text-sm text-slate-600">{message}</p>
              </div>
            </ModalBody>
            <ModalFooter>
              <Button 
                onPress={onModalClose}
                disabled={isConfirming}
                className="px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded-lg text-black text-sm"
                style={{ color: 'black' }}
                onMouseEnter={e => (e.currentTarget.style.color = 'black')}
                onMouseLeave={e => (e.currentTarget.style.color = 'black')}
              >
                {cancelText}
              </Button>
              <Button 
                color="danger" 
                onPress={onConfirm}
                isLoading={isConfirming}
              >
                {confirmText}
              </Button>
            </ModalFooter>
          </>
        )}
      </ModalContent>
    </Modal>
  );
};