import React from "react";
import { Button, Modal, ModalBody, ModalContent, ModalFooter, ModalHeader } from "@heroui/react";
import { Icon } from "@iconify/react";
import { StatusBadge } from "./status-badge";

interface DetalleProductoFactura {
  producto_id?: number;
  cantidad: number;
  nombre: string;
}

interface ViewItemModalProps {
  isOpen: boolean;
  onClose: () => void;
  item: any;
  title: string;
  loadingDetalle?: boolean;
  onPrint?: () => void;
}

export const ViewItemModal: React.FC<ViewItemModalProps> = ({
  isOpen,
  onClose,
  item,
  title,
  loadingDetalle = false,
  onPrint
}) => {
  if (!item) return null;

  return (
    <Modal isOpen={isOpen} onOpenChange={onClose}>
      <ModalContent>
        {(onModalClose) => (
          <>
            <ModalHeader className="flex flex-col gap-1">{title}</ModalHeader>
            <ModalBody>
              <div className="space-y-3">
                {Object.entries(item).map(([key, value]) => {
                  // Renderiza productos como bloque
                  if (key === "Productos" && Array.isArray(value)) {
                    return (
                      <div key={key} className="pt-2">
                        <span className="font-medium text-slate-600 block mb-1">Productos:</span>
                        {loadingDetalle
                          ? <div className="text-slate-400 text-sm">Cargando productos...</div>
                          : (
                            <div className="space-y-1 pl-3">
                              {value.length === 0 && <div className="text-slate-400 text-sm">No hay productos</div>}
                              {(value as DetalleProductoFactura[]).map((prod, idx) => (
                                <div key={prod.producto_id ?? idx} className="flex justify-between">
                                  <span>{prod.nombre}</span>
                                  <span className="font-mono font-semibold">x{prod.cantidad}</span>
                                </div>
                              ))}
                            </div>
                          )
                        }
                      </div>
                    );
                  }
                  if (["id", "actions", "Productos"].includes(key)) return null;
                  return (
                    <div key={key} className="flex justify-between border-b pb-2">
                      <span className="font-medium text-slate-600">
                        {key}:
                      </span>
                      <span>
                        {(typeof value === "string" &&
                          ["activo", "inactivo", "en stock", "bajo stock", "agotado", "pendiente", "pagado", "vencido"].includes(value.toLowerCase())) ? (
                            <StatusBadge text={value as string} type={(value as string).toLowerCase()} />
                        ) : (
                          typeof value === "string" || typeof value === "number"
                            ? value
                            : value !== undefined && value !== null
                              ? JSON.stringify(value)
                              : ""
                        )}
                      </span>
                    </div>
                  );
                })}
              </div>
            </ModalBody>
            <ModalFooter>
              <Button color="default" variant="light" onPress={onModalClose}>
                Cerrar
              </Button>
              {onPrint && (
                <Button color="primary" onPress={() => {
                  onModalClose();
                  onPrint();
                }}>
                  <Icon icon="lucide:printer" className="mr-1" width={16} height={16} />
                  Imprimir
                </Button>
              )}
            </ModalFooter>
          </>
        )}
      </ModalContent>
    </Modal>
  );
};

export default ViewItemModal;
