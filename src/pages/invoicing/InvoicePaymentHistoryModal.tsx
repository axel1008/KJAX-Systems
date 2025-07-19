import React, { useEffect, useState } from "react";
import { supabase } from "../../supabaseClient";
import { FormModal } from "../../components/ui/form-modal";
import { Factura } from "./types";

interface PagoCliente {
  id: number;
  fecha_pago: string;
  monto_pagado: number;
  metodo_pago: string;
  moneda_id: number;
  referencia_pago?: string;
  created_at?: string;
  monedas?: { codigo: string };
}

interface InvoicePaymentHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  invoice: Factura | null;
}

const InvoicePaymentHistoryModal: React.FC<InvoicePaymentHistoryModalProps> = ({ isOpen, onClose, invoice }) => {
  const [historial, setHistorial] = useState<PagoCliente[]>([]);
  const formatCurrency = (value: number, moneda?: string) =>
    new Intl.NumberFormat("es-CR", {
      style: "currency",
      currency: moneda || "CRC",
    }).format(value);

  useEffect(() => {
    if (isOpen && invoice?.id) {
      supabase
        .from("pagos_cliente")
        .select("*, monedas(codigo)")
        .eq("factura_id", invoice.id)
        .order("fecha_pago", { ascending: false })
        .then(({ data }) => setHistorial(data || []));
    }
  }, [isOpen, invoice]);

  return (
    <FormModal
      isOpen={isOpen}
      onClose={onClose}
      title={`Historial de Pagos - Factura ${invoice?.id?.substring(0, 8)}...`}
      submitButtonText="Cerrar"
      onFormSubmit={async () => { onClose(); }}  // <--- Así lo arreglas
      isSubmitting={false}
      
    >
      <div>
        {historial.length === 0 ? (
          <div className="text-sm text-gray-500">No hay pagos registrados para esta factura.</div>
        ) : (
          <table className="w-full text-sm border rounded bg-slate-50">
            <thead>
              <tr>
                <th className="px-2 py-1 text-left">Fecha</th>
                <th className="px-2 py-1 text-right">Monto</th>
                <th className="px-2 py-1 text-center">Moneda</th>
                <th className="px-2 py-1 text-center">Método</th>
                <th className="px-2 py-1 text-left">Referencia</th>
              </tr>
            </thead>
            <tbody>
              {historial.map((pago) => (
                <tr key={pago.id}>
                  <td className="px-2 py-1">{pago.fecha_pago}</td>
                  <td className="px-2 py-1 text-right">
                    {formatCurrency(pago.monto_pagado, pago.monedas?.codigo)}
                  </td>
                  <td className="px-2 py-1 text-center">{pago.monedas?.codigo || ""}</td>
                  <td className="px-2 py-1 text-center">{pago.metodo_pago}</td>
                  <td className="px-2 py-1">{pago.referencia_pago || "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </FormModal>
  );
};

export default InvoicePaymentHistoryModal;


