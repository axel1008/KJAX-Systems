import React from "react";
import { Modal, ModalBody, ModalContent, ModalFooter, ModalHeader } from "@heroui/react";
import { Icon } from "@iconify/react";

export interface FormModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  onFormSubmit: () => Promise<void>;
  submitButtonText?: string;
  submitLoadingText?: string;
  isSubmitting?: boolean;
  cancelButtonClassName?: string;
  submitButtonClassName?: string;
  // --- INICIO: NUEVA PROPIEDAD ---
  hideCancelButton?: boolean;
  // --- FIN: NUEVA PROPIEDAD ---
}

export const FormModal: React.FC<FormModalProps> = ({
  isOpen,
  onClose,
  title,
  children,
  onFormSubmit,
  submitButtonText = "Guardar",
  submitLoadingText = "Guardando...",
  isSubmitting,
  cancelButtonClassName,
  submitButtonClassName,
  // --- INICIO: Se recibe la nueva prop ---
  hideCancelButton = false,
  // --- FIN: Se recibe la nueva prop ---
}) => {
  const showLoading = isSubmitting !== undefined ? isSubmitting : false;

  const handleActualSubmit = async () => {
    if (showLoading) return;
    try {
      await onFormSubmit();
    } catch (error) {
      console.error("FormModal submission error:", error);
    }
  };

  const defaultCancelClasses = "px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded-lg text-gray-700 text-sm disabled:opacity-50";
  const defaultSubmitClasses = "px-4 py-2 bg-blue-500 hover:bg-blue-600 rounded-lg text-white text-sm flex items-center justify-center disabled:bg-blue-400 disabled:cursor-not-allowed";

  return (
    <Modal isOpen={isOpen} onOpenChange={onClose} scrollBehavior="inside">
      <ModalContent>
        {(onModalClose) => (
          <>
            <ModalHeader className="flex flex-col gap-1">{title}</ModalHeader>
            <ModalBody>{children}</ModalBody>
            <ModalFooter>
              {/* --- INICIO: CAMBIO PARA OCULTAR BOTÓN --- */}
              {!hideCancelButton && (
                <button
                  type="button"
                  onClick={onModalClose}
                  disabled={showLoading}
                  className={cancelButtonClassName || defaultCancelClasses}
                >
                  Cancelar
                </button>
              )}
              {/* --- FIN: CAMBIO --- */}
              <button
                type="button"
                onClick={handleActualSubmit}
                disabled={showLoading}
                className={submitButtonClassName || defaultSubmitClasses}
              >
                {showLoading ? (
                  <>
                    <Icon icon="line-md:loading-twotone-loop" className="w-5 h-5 mr-2" />
                    {submitLoadingText}
                  </>
                ) : (
                  submitButtonText
                )}
              </button>
            </ModalFooter>
          </>
        )}
      </ModalContent>
    </Modal>
  );
};