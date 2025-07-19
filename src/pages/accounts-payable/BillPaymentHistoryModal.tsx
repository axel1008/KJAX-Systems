import React, { useEffect, useState } from "react";
import { supabase } from "../../supabaseClient";
import { FormModal } from "../../components/ui/form-modal";
import { ProcessedSupplierBill, Moneda } from "./types";

interface PagoProveedor {
  id: string;
  fecha_pago: string;
  monto_total: number;
  medio_pago: string;
  moneda_id: number;
  referencia_pago?: string | null;
  created_at?: string;
  monedas?: { codigo: string } | null;
}

interface BillPaymentHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  bill: ProcessedSupplierBill | null;
  monedasList: Moneda[];
}

const BillPaymentHistoryModal: React.FC<BillPaymentHistoryModalProps> = ({ isOpen, onClose, bill, monedasList }) => {
  const [historial, setHistorial] = useState<PagoProveedor[]>([]);
  const [loading, setLoading] = useState(true);

  const formatCurrency = (value: number, monedaCode?: string | null) =>
    new Intl.NumberFormat("es-CR", {
      style: "currency",
      currency: monedaCode || "CRC",
    }).format(value);

  useEffect(() => {
    if (isOpen && bill?.id) {
      setLoading(true);
      supabase
        .from("pagos_proveedor")
        .select("*, monedas(codigo)")
        .eq("factura_proveedor_id", bill.id)
        .order("fecha_pago", { ascending: false })
        .then(({ data, error }) => {
          if (error) {
            console.error("Error fetching payment history:", error);
            setHistorial([]);
          } else {
            setHistorial(data || []);
          }
          setLoading(false);
        });
    } else if (!isOpen) {
      setHistorial([]);
      setLoading(true);
    }
  }, [isOpen, bill]);

  if (!bill) return null;

  return (
    <FormModal
      isOpen={isOpen}
      onClose={onClose}
      title={`Historial de Pagos - Factura ${bill.numero_documento}`}
      submitButtonText="Cerrar"
      onFormSubmit={async () => { onClose(); }}
      isSubmitting={false}
      // --- INICIO: SE AÑADE LA PROPIEDAD PARA OCULTAR EL BOTÓN ---
      hideCancelButton={true}
      // --- FIN: SE AÑADE LA PROPIEDAD ---
    >
      <div>
        {loading ? (
          <div className="text-sm text-gray-500 text-center py-4">Cargando historial...</div>
        ) : historial.length === 0 ? (
          <div className="text-sm text-gray-500 text-center py-4">No hay pagos registrados para esta factura.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm border rounded bg-slate-50">
              <thead>
                <tr>
                  <th className="px-3 py-2 text-left">Fecha</th>
                  <th className="px-3 py-2 text-right">Monto</th>
                  <th className="px-3 py-2 text-center">Moneda</th>
                  <th className="px-3 py-2 text-center">Método</th>
                  <th className="px-3 py-2 text-left">Referencia</th>
                </tr>
              </thead>
              <tbody>
                {historial.map((pago) => (
                  <tr key={pago.id}>
                    <td className="px-3 py-2">{pago.fecha_pago}</td>
                    <td className="px-3 py-2 text-right">
                      {formatCurrency(pago.monto_total, pago.monedas?.codigo)}
                    </td>
                    <td className="px-3 py-2 text-center">{pago.monedas?.codigo || "N/A"}</td>
                    <td className="px-3 py-2 text-center">{pago.medio_pago}</td>
                    <td className="px-3 py-2">{pago.referencia_pago || "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </FormModal>
  );
};

export default BillPaymentHistoryModal;