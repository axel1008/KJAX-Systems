// src/pages/audit/AuditDetailView.tsx
import React from 'react';
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Button,
} from '@heroui/react';
import { X } from 'lucide-react';

interface AuditDetailProps {
  log: {
    id: number;
    table_name: string;
    action: string;
    timestamp: string;
    user_email?: string;
    old_values?: any;
    new_values?: any;
  };
  onClose: () => void;
}

export const AuditDetailView: React.FC<AuditDetailProps> = ({ log, onClose }) => {
  const oldData = log.old_values || {};
  const newData = log.new_values || {};
  const allKeys = Array.from(new Set([...Object.keys(oldData), ...Object.keys(newData)]));

  // solo mostrar campos que realmente cambiaron
  const changes = allKeys
    .map((key) => ({
      field: key,
      oldValue: oldData[key],
      newValue: newData[key],
    }))
    .filter(({ oldValue, newValue }) => JSON.stringify(oldValue) !== JSON.stringify(newValue))
    .filter(({ field }) => !['updated_at', 'created_at'].includes(field));

  return (
    <Modal isOpen={true} onOpenChange={onClose} size="2xl" scrollBehavior="inside">
      <ModalContent>
        {(modalOnClose) => (
          <>
            <ModalHeader className="flex justify-between items-center">
              <span className="text-xl font-bold text-slate-800">
                Auditoría #{log.id}
              </span>
              <button
                onClick={modalOnClose}
                className="p-1 text-gray-500 hover:text-red-600 rounded-full"
              >
                <X size={20} />
              </button>
            </ModalHeader>

            <ModalBody>
              <div className="space-y-6">
                {/* Encabezado estilo “Detalles de Factura” */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                  <div>
                    <p className="text-slate-500">Tabla</p>
                    <p className="font-semibold text-slate-800">{log.table_name}</p>
                  </div>
                  <div>
                    <p className="text-slate-500">Acción</p>
                    <p className="font-semibold text-slate-800">{log.action}</p>
                  </div>
                  <div>
                    <p className="text-slate-500">Usuario</p>
                    <p className="font-semibold text-slate-800">{log.user_email || 'Sistema'}</p>
                  </div>
                  <div>
                    <p className="text-slate-500">Fecha y hora</p>
                    <p className="font-semibold text-slate-800">
                      {new Date(log.timestamp).toLocaleString('es-CR')}
                    </p>
                  </div>
                </div>

                {/* Tabla de cambios estilo “Productos / Servicios” */}
                <div>
                  <h4 className="font-semibold text-slate-700 border-t pt-4 mb-2">
                    Cambios detectados
                  </h4>
                  {changes.length > 0 ? (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm border rounded bg-slate-50">
                        <thead className="bg-gray-100">
                          <tr>
                            <th className="px-2 py-1 text-left">Campo</th>
                            <th className="px-2 py-1 text-left">Valor Anterior</th>
                            <th className="px-2 py-1 text-left">Valor Nuevo</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                          {changes.map(({ field, oldValue, newValue }) => (
                            <tr key={field}>
                              <td className="px-2 py-1 font-mono text-xs bg-gray-50">{field}</td>
                              <td className="px-2 py-1 text-xs text-red-700">
                                {JSON.stringify(oldValue)}
                              </td>
                              <td className="px-2 py-1 text-xs text-green-700">
                                {JSON.stringify(newValue)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <p className="text-sm text-gray-500 italic">
                      No se detectaron cambios relevantes.
                    </p>
                  )}
                </div>
              </div>
            </ModalBody>

            <ModalFooter>
              <Button color="primary" onPress={modalOnClose}>
                Cerrar
              </Button>
            </ModalFooter>
          </>
        )}
      </ModalContent>
    </Modal>
  );
};