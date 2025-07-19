import React from "react";
import { Button, Modal, ModalBody, ModalContent, ModalFooter, ModalHeader } from "@heroui/react";
import { Icon } from "@iconify/react";

interface FilterModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApplyFilters: () => void;
  title?: string;
  children: React.ReactNode;
}

export const FilterModal: React.FC<FilterModalProps> = ({
  isOpen,
  onClose,
  onApplyFilters,
  title = "Aplicar Filtros",
  children
}) => {
  return (
    <Modal isOpen={isOpen} onOpenChange={onClose}>
      <ModalContent>
        {(onModalClose) => (
          <>
            <ModalHeader className="flex flex-col gap-1">{title}</ModalHeader>
            <ModalBody>
              {children}
            </ModalBody>
            <ModalFooter>
              <Button 
                color="default" 
                variant="light" 
                onPress={onModalClose}
              >
                Cancelar
              </Button>
              <Button 
                color="primary" 
                onPress={() => {
                  onApplyFilters();
                  onModalClose();
                }}
              >
                Aplicar Filtros
              </Button>
            </ModalFooter>
          </>
        )}
      </ModalContent>
    </Modal>
  );
};