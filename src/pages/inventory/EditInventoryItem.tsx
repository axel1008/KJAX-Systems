// src/pages/inventory/EditInventoryItem.tsx

import React, { useState, useEffect, FormEvent } from "react";
import { supabase } from "../../supabaseClient";
import type { InventoryItem } from "./types";

interface EditInventoryItemProps {
  isOpen: boolean;
  item: InventoryItem | null;
  onClose: () => void;
  onSaved: () => void;
}

interface Categoria {
  id: number;
  nombre: string;
}

interface Proveedor {
  id: number;
  nombre: string;
}

interface EditableInventoryItemData {
  nombre: string;
  categoria: string;
  stock: number;
  stock_minimo: number;
  stock_alert: number;
  stock_maximo: number;
  unidad: string;
  precio_compra: number;
  precio_venta: number | null;
  proveedor_id: number | null;
  status: boolean;
}

export default function EditInventoryItem({
  isOpen,
  item,
  onClose,
  onSaved,
}: EditInventoryItemProps): JSX.Element | null {
  const [formData, setFormData] = useState<EditableInventoryItemData>({
    nombre: "",
    categoria: "",
    stock: 0,
    stock_minimo: 0,
    stock_alert: 0,
    stock_maximo: 100,
    unidad: "unidad",
    precio_compra: 0,
    precio_venta: null,
    proveedor_id: null,
    status: true,
  });
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [proveedores, setProveedores] = useState<Proveedor[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Cargar categorías y proveedores al montar
  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      const { data: categoriasData } = await supabase
        .from("categorias")
        .select("id, nombre")
        .order("nombre", { ascending: true });
      setCategorias(categoriasData || []);

      const { data: proveedoresData } = await supabase
        .from("providers")
        .select("id, nombre")
        .order("nombre", { ascending: true });
      setProveedores(proveedoresData || []);

      setIsLoading(false);
    };
    fetchData();
  }, []);

  // Cuando cambia `item`, precargar el formulario
  useEffect(() => {
    if (item) {
      setFormData({
        nombre: item.nombre || "",
        categoria: item.categoria || "",
        stock: item.stock || 0,
        stock_minimo: item.stock_minimo || 0,
        stock_alert: item.stock_alert || 0,
        stock_maximo: item.stock_maximo || 100,
        unidad: item.unidad || "unidad",
        precio_compra: item.precio_compra || 0,
        precio_venta: item.precio_venta ?? null,
        proveedor_id: item.proveedor_id ?? null,
        status: typeof item.status === "boolean" ? item.status : true,
      });
      setError(null);
    }
  }, [item]);

  // Manejar cambios en inputs
  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value, type } = e.target;
    if (type === "checkbox") {
      const { checked } = e.target as HTMLInputElement;
      setFormData((prev) => ({ ...prev, [name]: checked }));
    } else {
      setFormData((prev) => ({
        ...prev,
        [name]:
          type === "number" || name.includes("precio_")
            ? value === ""
              ? null
              : parseFloat(value)
            : value,
      }));
    }
  };

  // Guardar cambios
  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!item) return null;

    // Validaciones básicas
    if (!formData.nombre || !formData.categoria) {
      setError("El nombre y la categoría son obligatorios.");
      return;
    }

    setIsLoading(true);
    setError(null);

    const updateData = {
      ...formData,
      precio_venta:
        formData.precio_venta !== null ? Number(formData.precio_venta) : null,
      proveedor_id: formData.proveedor_id ?? null,
    };

    const { error: updateError } = await supabase
      .from("productos")
      .update(updateData)
      .eq("id", item.id);

    setIsLoading(false);

    if (updateError) {
      setError(`Error al actualizar: ${updateError.message}`);
    } else {
      onSaved();
    }
  };

  if (!isOpen || !item) return null;

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50 flex justify-center items-center">
      <div className="relative mx-auto p-5 border w-full max-w-2xl shadow-lg rounded-md bg-white">
        {/* Encabezado sin “X” */}
        <div className="mb-4">
          <h3 className="text-xl font-semibold text-gray-900">
            Editar Producto: {item.nombre}
          </h3>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-100 text-red-700 border border-red-400 rounded">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Nombre y Categoría */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="nombre" className="block text-sm font-medium text-gray-700">
                Nombre <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="nombre"
                id="nombre"
                value={formData.nombre}
                onChange={handleChange}
                required
                className="mt-1 block w-full px-3 py-2 rounded-md border border-gray-300"
              />
            </div>
            <div>
              <label htmlFor="categoria" className="block text-sm font-medium text-gray-700">
                Categoría <span className="text-red-500">*</span>
              </label>
              <select
                name="categoria"
                id="categoria"
                value={formData.categoria}
                onChange={handleChange}
                required
                className="mt-1 block w-full px-3 py-2 rounded-md border border-gray-300"
              >
                {categorias.map((cat) => (
                  <option key={cat.id} value={cat.nombre}>
                    {cat.nombre}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Stock y umbrales */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label htmlFor="stock" className="block text-sm font-medium text-gray-700">
                Stock Actual
              </label>
              <input
                type="number"
                name="stock"
                id="stock"
                value={formData.stock}
                onChange={handleChange}
                min={0}
                className="mt-1 block w-full px-3 py-2 rounded-md border border-gray-300"
              />
            </div>
            <div>
              <label htmlFor="stock_minimo" className="block text-sm font-medium text-gray-700">
                Stock Mínimo
              </label>
              <input
                type="number"
                name="stock_minimo"
                id="stock_minimo"
                value={formData.stock_minimo}
                onChange={handleChange}
                min={0}
                className="mt-1 block w-full px-3 py-2 rounded-md border border-gray-300"
              />
            </div>
            <div>
              <label htmlFor="stock_alert" className="block text-sm font-medium text-gray-700">
                Alerta Stock
              </label>
              <input
                type="number"
                name="stock_alert"
                id="stock_alert"
                value={formData.stock_alert}
                onChange={handleChange}
                min={0}
                className="mt-1 block w-full px-3 py-2 rounded-md border border-gray-300"
              />
            </div>
            <div>
              <label htmlFor="stock_maximo" className="block text-sm font-medium text-gray-700">
                Stock Máximo
              </label>
              <input
                type="number"
                name="stock_maximo"
                id="stock_maximo"
                value={formData.stock_maximo}
                onChange={handleChange}
                min={0}
                className="mt-1 block w-full px-3 py-2 rounded-md border border-gray-300"
              />
            </div>
          </div>

          {/* Unidad, Precio de compra y venta */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label htmlFor="unidad" className="block text-sm font-medium text-gray-700">
                Unidad
              </label>
              <input
                type="text"
                name="unidad"
                id="unidad"
                value={formData.unidad}
                onChange={handleChange}
                className="mt-1 block w-full px-3 py-2 rounded-md border border-gray-300"
              />
            </div>
            <div>
              <label htmlFor="precio_compra" className="block text-sm font-medium text-gray-700">
                Precio Compra (CRC)
              </label>
              <input
                type="number"
                name="precio_compra"
                id="precio_compra"
                value={formData.precio_compra}
                onChange={handleChange}
                min={0}
                step="any"
                className="mt-1 block w-full px-3 py-2 rounded-md border border-gray-300"
              />
            </div>
            <div>
              <label htmlFor="precio_venta" className="block text-sm font-medium text-gray-700">
                Precio Venta (CRC)
              </label>
              <input
                type="number"
                name="precio_venta"
                id="precio_venta"
                value={formData.precio_venta ?? ""}
                onChange={handleChange}
                min={0}
                step="any"
                placeholder="Opcional"
                className="mt-1 block w-full px-3 py-2 rounded-md border border-gray-300"
              />
            </div>
          </div>

          {/* Proveedor y estado */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
            <div>
              <label htmlFor="proveedor_id" className="block text-sm font-medium text-gray-700">
                Proveedor
              </label>
              <select
                name="proveedor_id"
                id="proveedor_id"
                value={formData.proveedor_id ?? ""}
                onChange={handleChange}
                className="mt-1 block w-full px-3 py-2 rounded-md border border-gray-300"
              >
                <option value="">Sin proveedor</option>
                {proveedores.map((prov) => (
                  <option key={prov.id} value={prov.id}>
                    {prov.nombre}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex items-center mt-4 md:mt-0">
              <input
                id="status"
                name="status"
                type="checkbox"
                checked={formData.status}
                onChange={handleChange}
                className="h-4 w-4 text-blue-600 border-gray-300 rounded"
              />
              <label htmlFor="status" className="ml-2 text-sm text-gray-900">
                Producto Activo
              </label>
            </div>
          </div>

          {/* Acciones */}
          <div className="pt-4 flex justify-end space-x-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isLoading}
              className="px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded-lg text-gray-700"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="px-4 py-2 bg-blue-500 hover:bg-blue-600 rounded-lg text-white"
            >
              {isLoading ? "Guardando Cambios..." : "Guardar Cambios"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
