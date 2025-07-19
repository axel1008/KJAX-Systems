// src/pages/inventory/CreateCategoryModal.tsx
import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../../supabaseClient'; // Ajusta la ruta si es necesario
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Button,
  Input,
} from '@heroui/react'; // Asegúrate de que estos componentes existan en tu librería HeroUI
// import { Icon } from '@iconify/react'; // Eliminado ya que no se usa

interface CreateCategoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCategoryCreated: () => void; // Callback para refrescar la lista de categorías o realizar otra acción
}

export default function CreateCategoryModal({
  isOpen,
  onClose,
  onCategoryCreated,
}: CreateCategoryModalProps): JSX.Element | null {
  const [categoryName, setCategoryName] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const nameInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setCategoryName('');
      setErrorMessage(null);
      setIsLoading(false);
      // Enfocar el input cuando el modal se abre
      setTimeout(() => {
        nameInputRef.current?.focus();
      }, 100);
    }
  }, [isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!categoryName.trim()) {
      setErrorMessage('El nombre de la categoría no puede estar vacío.');
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);

    try {
      const { error } = await supabase
        .from('categorias') // Asegúrate que tu tabla se llame 'categorias'
        .insert([{ nombre: categoryName.trim() }]);

      if (error) {
        if (error.code === '23505') { // Código de error para violación de unicidad
          setErrorMessage(`La categoría "${categoryName.trim()}" ya existe.`);
        } else {
          setErrorMessage(error.message || 'Ocurrió un error al crear la categoría.');
        }
        console.error('Error creating category:', error);
      } else {
        onCategoryCreated(); // Llama al callback
        onClose(); // Cierra el modal
      }
    } catch (err) {
      console.error('Unexpected error:', err);
      setErrorMessage('Ocurrió un error inesperado.');
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) {
    return null;
  }

  return (
    <Modal isOpen={isOpen} onOpenChange={onClose} size="md">
      <ModalContent>
        {(modalOnClose) => ( // Asegurarse que modalOnClose provisto por HeroUI se use si es necesario para el cierre interno
          <form onSubmit={handleSubmit}>
            <ModalHeader className="flex flex-col gap-1 text-lg font-semibold">
              Agregar Nueva Categoría
            </ModalHeader>
            <ModalBody>
              {errorMessage && (
                <div className="mb-4 p-3 bg-red-100 text-red-700 border border-red-300 rounded-md text-sm">
                  {errorMessage}
                </div>
              )}
              <div>
                <label
                  htmlFor="categoryName"
                  className="block text-sm font-medium text-slate-700 mb-1"
                >
                  Nombre de la Categoría
                </label>
                <Input
                  // @ts-ignore HeroUI puede no tener una prop 'ref' estándar así, o puede tener un nombre diferente.
                  // Si Input es un componente envuelto sobre un input HTML, esto podría funcionar.
                  // Si es un componente completamente personalizado, consulta su documentación para el enfoque.
                  ref={nameInputRef} 
                  type="text"
                  id="categoryName"
                  value={categoryName}
                  onValueChange={setCategoryName} // Algunas librerías UI usan onValueChange para controlled components
                  // onChange={(e: React.ChangeEvent<HTMLInputElement>) => setCategoryName(e.target.value)} // Alternativa si onValueChange no aplica
                  placeholder="Ej: Panadería Dulce, Ingredientes Secos"
                  // className="w-full" // HeroUI puede manejar el width automáticamente o a través de props
                />
              </div>
            </ModalBody>
            <ModalFooter>
              <Button
                onPress={onClose} 
            className="px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded-lg text-gray-700 text-sm"
            disabled={loading}>
              
                Cancelar
              </Button>
              <Button
                type="submit"
                color="primary"
                isLoading={isLoading}
                disabled={isLoading || !categoryName.trim()}
              >
                {isLoading ? 'Guardando...' : 'Guardar Categoría'}
              </Button>
            </ModalFooter>
          </form>
        )}
      </ModalContent>
    </Modal>
  );
}
