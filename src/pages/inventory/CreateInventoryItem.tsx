
import React, { useEffect, useState } from "react";
import { supabase } from "../../supabaseClient";
import {
  Button,
  Input,
  Select,
  SelectItem,
} from "@heroui/react";

type HeroUISelection = Set<React.Key> | "all";

interface CreateInventoryItemProps {
  onClose: () => void;
  onCreated: () => void;
}

interface CategoriaSupabase {
  id: number;
  nombre: string;
}

interface ProviderSupabase {
  id: number;
  nombre: string;
}

interface SelectableItem {
  key: string;
  label: string;
}

export default function CreateInventoryItem({
  onClose,
  onCreated,
}: CreateInventoryItemProps): JSX.Element {
  const [nombre, setNombre] = useState<string>("");
  const [categoria, setCategoria] = useState<string>("");
  const [stockInicial, setStockInicial] = useState<number>(0);
  const [stockMinimo, setStockMinimo] = useState<number>(0);
  const [stockAlert, setStockAlert] = useState<number>(0);
  const [stockMaximo, setStockMaximo] = useState<number>(0);
  const [precioCompra, setPrecioCompra] = useState<number>(0);
  const [precioVenta, setPrecioVenta] = useState<number | null>(null);
  const [unidad, setUnidad] = useState<string>("unidad");

  const [categoriasDisponibles, setCategoriasDisponibles] = useState<CategoriaSupabase[]>([]);
  const [loadingCategorias, setLoadingCategorias] = useState<boolean>(false);

  const [providers, setProviders] = useState<ProviderSupabase[]>([]);
  const [proveedorId, setProveedorId] = useState<number | null>(null);
  const [loadingProviders, setLoadingProviders] = useState<boolean>(false);

  const [loading, setLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      setLoadingCategorias(true);
      setLoadingProviders(true);

      const { data: catData, error: catError } = await supabase
        .from("categorias")
        .select("id, nombre")
        .order("nombre", { ascending: true });

      if (catError) {
        console.error("Error al cargar categorías:", catError.message);
        setErrorMessage(prev => prev ? `${prev} Error categorías.` : "Error categorías.");
        setCategoriasDisponibles([]);
      } else {
        setCategoriasDisponibles(catData || []);
      }
      setLoadingCategorias(false);

      const { data: provData, error: provError } = await supabase
        .from("providers")
        .select("id, nombre")
        .order("nombre", { ascending: true });

      if (provError) {
        console.error("Error al cargar proveedores:", provError.message);
        setErrorMessage(prev => prev ? `${prev} Error proveedores.` : "Error proveedores.");
        setProviders([]);
      } else {
        setProviders(provData || []);
      }
      setLoadingProviders(false);
    };

    fetchData();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!nombre.trim()) {
      setErrorMessage("El nombre es obligatorio.");
      return;
    }
    if (!categoria) {
      setErrorMessage("Debes seleccionar una categoría.");
      return;
    }
    if (stockInicial < 0 || stockMinimo < 0 || stockAlert < 0 || stockMaximo < 0) {
      setErrorMessage("Los valores de stock no pueden ser negativos.");
      return;
    }
    if (precioCompra < 0 || (precioVenta !== null && precioVenta < 0)) {
      setErrorMessage("Los precios no pueden ser negativos.");
      return;
    }

    setLoading(true);
    const { error } = await supabase.from("productos").insert([
      {
        nombre: nombre.trim(),
        categoria: categoria,
        stock: stockInicial,
        stock_minimo: stockMinimo,
        stock_alert: stockAlert,
        stock_maximo: stockMaximo,
        unidad: unidad.trim() || 'unidad',
        precio_compra: precioCompra,
        precio_venta: precioVenta,
        proveedor_id: proveedorId,
        status: stockInicial > 0,
      },
    ]);

    if (error) {
      console.error("Error al crear producto:", error);
      setErrorMessage(error.message || "No se pudo crear el producto. Revisa la consola.");
    } else {
      onCreated();
      onClose();
    }
    setLoading(false);
  };

  const handleCategorySelectionChange = (keys: HeroUISelection) => {
    if (keys instanceof Set) {
      const selectedKey = Array.from(keys)[0];
      setCategoria(selectedKey !== undefined ? String(selectedKey) : "");
    } else {
      setCategoria("");
    }
  };

  const handleProviderSelectionChange = (keys: HeroUISelection) => {
    if (keys instanceof Set) {
      const selectedKey = Array.from(keys)[0];
      if (selectedKey !== undefined) {
        const keyString = String(selectedKey);
        if (keyString === "") {
          setProveedorId(null);
        } else {
          setProveedorId(Number(keyString));
        }
      } else {
        setProveedorId(null);
      }
    } else {
      setProveedorId(null);
    }
  };

  const providerSelectItems: SelectableItem[] = [
    { key: "", label: "Sin proveedor" },
    ...providers.map(p => ({ key: p.id.toString(), label: p.nombre }))
  ];

  const categorySelectItems: SelectableItem[] = categoriasDisponibles.map(cat => ({
    key: cat.nombre,
    label: cat.nombre,
  }));

  return (
    <form onSubmit={handleCreate} className="space-y-4">
      {errorMessage && (
        <div className="p-3 bg-red-100 text-red-700 border border-red-300 rounded-md text-sm">
          {errorMessage}
        </div>
      )}

      <div>
        <label htmlFor="nombreProducto" className="block text-sm font-medium text-gray-700 mb-1">Nombre del Producto *</label>
        <Input
          id="nombreProducto"
          type="text"
          value={nombre}
          onValueChange={setNombre}
          placeholder="Ej: Pan Baguette, Harina de Trigo"
          isRequired
        />
      </div>

      <div>
        <label htmlFor="categoriaProducto" className="block text-sm font-medium text-gray-700 mb-1">Categoría *</label>
        <Select
          id="categoriaProducto"
          aria-label="Seleccionar categoría"
          placeholder={loadingCategorias ? "Cargando categorías..." : "Selecciona una categoría"}
          selectedKeys={categoria ? new Set([categoria]) : new Set()}
          onSelectionChange={handleCategorySelectionChange}
          isDisabled={loadingCategorias}
          isRequired
          items={categorySelectItems}
        >
          {(item) => <SelectItem key={item.key} textValue={item.label}>{item.label}</SelectItem>}
        </Select>
         {categoriasDisponibles.length === 0 && !loadingCategorias && (
            <p className="text-xs text-gray-500 mt-1">No hay categorías disponibles. Puedes añadir nuevas desde "Gestionar Categorías".</p>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
        <div>
          <label htmlFor="stockInicial" className="block text-sm font-medium text-gray-700 mb-1">Stock inicial</label>
          <Input id="stockInicial" type="number" min="0" value={stockInicial.toString()} onValueChange={(val) => setStockInicial(Number(val))}/>
        </div>
        <div>
          <label htmlFor="stockMinimo" className="block text-sm font-medium text-gray-700 mb-1">Stock mínimo</label>
          <Input id="stockMinimo" type="number" min="0" value={stockMinimo.toString()} onValueChange={(val) => setStockMinimo(Number(val))}/>
        </div>
        <div>
          <label htmlFor="stockAlert" className="block text-sm font-medium text-gray-700 mb-1">Stock alerta</label>
          <Input id="stockAlert" type="number" min="0" value={stockAlert.toString()} onValueChange={(val) => setStockAlert(Number(val))}/>
        </div>
        <div>
          <label htmlFor="stockMaximo" className="block text-sm font-medium text-gray-700 mb-1">Stock máximo</label>
          <Input id="stockMaximo" type="number" min="0" value={stockMaximo.toString()} onValueChange={(val) => setStockMaximo(Number(val))}/>
        </div>
      </div>
      
      <div>
        <label htmlFor="unidadProducto" className="block text-sm font-medium text-gray-700 mb-1">Unidad de Medida</label>
        <Input
            id="unidadProducto"
            type="text"
            value={unidad}
            onValueChange={setUnidad}
            placeholder="Ej: kg, lt, unidad"
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label htmlFor="precioCompra" className="block text-sm font-medium text-gray-700 mb-1">Precio compra (CRC)</label>
          <Input id="precioCompra" type="number" min="0" step="any" value={precioCompra.toString()} onValueChange={(val) => setPrecioCompra(Number(val))}/>
        </div>
        <div>
          <label htmlFor="precioVenta" className="block text-sm font-medium text-gray-700 mb-1">Precio venta (CRC)</label>
          <Input id="precioVenta" type="number" min="0" step="any" value={precioVenta === null ? "" : precioVenta.toString()} onValueChange={(val) => setPrecioVenta(val === "" ? null : Number(val))} placeholder="Opcional"/>
        </div>
      </div>

      <div>
        <label htmlFor="proveedorProducto" className="block text-sm font-medium text-gray-700 mb-1">Proveedor (Opcional)</label>
        <Select
          id="proveedorProducto"
          aria-label="Seleccionar proveedor"
          placeholder={loadingProviders ? "Cargando proveedores..." : "Selecciona un proveedor"}
          selectedKeys={proveedorId !== null ? new Set([proveedorId.toString()]) : new Set([""])}
          onSelectionChange={handleProviderSelectionChange}
          isDisabled={loadingProviders}
          items={providerSelectItems}
        >
          {(item) => <SelectItem key={item.key} textValue={item.label}>{item.label}</SelectItem>}
        </Select>
      </div>

      <div className="flex justify-end space-x-2 pt-4">
        <Button
          onPress={onClose}
          disabled={loading}
          className="px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded-lg text-gray-700 text-sm"
        >
          Cancelar
        </Button>
        <Button
          type="submit"
          color="primary"
          isLoading={loading}
          disabled={loading}
        >
          {loading ? "Creando..." : "Crear Producto"}
        </Button>
      </div>
    </form>
  );
}