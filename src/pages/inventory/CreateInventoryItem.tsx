import React, { useEffect, useState } from "react";
import { supabase } from "../../supabaseClient";
import { Search, CheckCircle, AlertCircle } from 'lucide-react';
import {
  Button,
  Input,
  Select,
  SelectItem,
  Autocomplete,
  AutocompleteItem,
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

interface CodigoCABYS {
  codigo: string;
  descripcion: string;
  impuesto_iva: boolean;
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

  // *** NUEVOS ESTADOS PARA CABYS ***
  const [codigoCABYS, setCodigoCABYS] = useState<string>("");
  const [descripcionCABYS, setDescripcionCABYS] = useState<string>("");
  const [buscandoCABYS, setBuscandoCABYS] = useState<boolean>(false);
  const [codigosCABYS, setCodigosCABYS] = useState<CodigoCABYS[]>([]);
  const [codigoVerificado, setCodigoVerificado] = useState<boolean>(false);
  const [errorCABYS, setErrorCABYS] = useState<string>("");

  const [categoriasDisponibles, setCategoriasDisponibles] = useState<CategoriaSupabase[]>([]);
  const [loadingCategorias, setLoadingCategorias] = useState<boolean>(false);

  const [providers, setProviders] = useState<ProviderSupabase[]>([]);
  const [proveedorId, setProveedorId] = useState<number | null>(null);
  const [loadingProviders, setLoadingProviders] = useState<boolean>(false);

  const [loading, setLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // *** FUNCIÓN PARA BUSCAR CÓDIGOS CABYS MEJORADA ***
  const buscarCodigosCABYS = async (termino: string) => {
    if (termino.length < 3) {
      setCodigosCABYS([]);
      return;
    }

    setBuscandoCABYS(true);
    setErrorCABYS("");

    try {
      // Limpiar y preparar término de búsqueda
      const terminoLimpio = termino.toLowerCase().trim();
      
      // Si parece un código (solo números), buscar por código
      if (/^\d+$/.test(terminoLimpio)) {
        const { data, error } = await supabase
          .from("cabys_codes")
          .select("codigo, descripcion, impuesto_iva")
          .ilike("codigo", `%${terminoLimpio}%`)
          .order('codigo', { ascending: true })
          .limit(15);

        if (error) throw error;
        setCodigosCABYS(data || []);
      } else {
        // Buscar por palabras en la descripción
        const palabras = terminoLimpio.split(' ').filter(p => p.length > 2);
        
        if (palabras.length === 1) {
          // Búsqueda simple por una palabra
          const { data, error } = await supabase
            .from("cabys_codes")
            .select("codigo, descripcion, impuesto_iva")
            .ilike("descripcion", `%${palabras[0]}%`)
            .order('descripcion', { ascending: true })
            .limit(15);

          if (error) throw error;
          setCodigosCABYS(data || []);
        } else {
          // Búsqueda por múltiples palabras
          let query = supabase
            .from("cabys_codes")
            .select("codigo, descripcion, impuesto_iva");

          // Crear condiciones para cada palabra
          palabras.forEach((palabra, index) => {
            if (index === 0) {
              query = query.ilike("descripcion", `%${palabra}%`);
            } else {
              query = query.ilike("descripcion", `%${palabra}%`);
            }
          });

          const { data, error } = await query
            .order('descripcion', { ascending: true })
            .limit(15);

          if (error) throw error;
          setCodigosCABYS(data || []);
        }
      }
    } catch (error) {
      console.error("Error buscando códigos CABYS:", error);
      setErrorCABYS("Error al buscar códigos CABYS");
      setCodigosCABYS([]);
    } finally {
      setBuscandoCABYS(false);
    }
  };

  // *** VERIFICAR CÓDIGO CABYS ESPECÍFICO ***
  const verificarCodigoCABYS = async (codigo: string) => {
    if (!codigo || codigo.length !== 13) {
      setCodigoVerificado(false);
      setDescripcionCABYS("");
      setErrorCABYS("");
      return;
    }

    setBuscandoCABYS(true);
    setErrorCABYS("");

    try {
      const { data, error } = await supabase
        .from("cabys_codes")
        .select("codigo, descripcion, impuesto_iva")
        .eq("codigo", codigo)
        .single();

      if (error || !data) {
        setCodigoVerificado(false);
        setDescripcionCABYS("");
        setErrorCABYS("Código CABYS no encontrado en la base de datos oficial");
      } else {
        setCodigoVerificado(true);
        setDescripcionCABYS(data.descripcion);
        setErrorCABYS("");
      }
    } catch (error) {
      console.error("Error verificando código CABYS:", error);
      setCodigoVerificado(false);
      setDescripcionCABYS("");
      setErrorCABYS("Error al verificar código CABYS");
    } finally {
      setBuscandoCABYS(false);
    }
  };

  // *** MANEJAR SELECCIÓN DE CÓDIGO CABYS ***
  const handleSeleccionarCABYS = (codigo: CodigoCABYS) => {
    setCodigoCABYS(codigo.codigo);
    setDescripcionCABYS(codigo.descripcion);
    setCodigoVerificado(true);
    setErrorCABYS("");
    setCodigosCABYS([]);

    // NO auto-llenar el nombre - el usuario pondrá su propio nombre comercial
  };

  // *** EFFECT PARA BÚSQUEDA EN TIEMPO REAL ***
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (codigoCABYS.length >= 3) {
        if (codigoCABYS.length === 13) {
          // Es un código completo, verificar
          verificarCodigoCABYS(codigoCABYS);
        } else {
          // Buscar códigos que coincidan
          buscarCodigosCABYS(codigoCABYS);
        }
      } else {
        setCodigosCABYS([]);
        setCodigoVerificado(false);
        setDescripcionCABYS("");
        setErrorCABYS("");
      }
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [codigoCABYS]);

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
    // *** VALIDACIÓN CÓDIGO CABYS ***
    if (!codigoCABYS || !codigoVerificado) {
      setErrorMessage("Debes ingresar un código CABYS válido (obligatorio por Hacienda).");
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
        cabys_code: codigoCABYS, // *** AGREGAR CÓDIGO CABYS ***
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

      {/* *** NUEVO: CAMPO CÓDIGO CABYS *** */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="text-md font-semibold text-blue-800 mb-3 flex items-center">
          <Search className="h-4 w-4 mr-2" />
          Código CABYS (Obligatorio por Hacienda)
        </h3>
        
        <div className="space-y-3">
          <div>
            <label htmlFor="codigoCABYS" className="block text-sm font-medium text-gray-700 mb-1">
              Código CABYS *
            </label>
            <div className="relative">
              <Input
                id="codigoCABYS"
                type="text"
                value={codigoCABYS}
                onValueChange={setCodigoCABYS}
                placeholder="Ej: 'pan', 'harina trigo', 'servicio consultoría', '1234567890123'"
                className="w-full"
                isRequired
              />
              {buscandoCABYS && (
                <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500"></div>
                </div>
              )}
            </div>
            
            {/* Indicador de verificación */}
            {codigoVerificado && (
              <div className="mt-2 flex items-center text-green-600 text-sm">
                <CheckCircle className="h-4 w-4 mr-1" />
                Código CABYS verificado oficialmente
              </div>
            )}
            
            {/* Error de código */}
            {errorCABYS && (
              <div className="mt-2 flex items-center text-yellow-600 text-sm">
                <AlertCircle className="h-4 w-4 mr-1" />
                {errorCABYS}
              </div>
            )}
            
            {/* Descripción del código */}
            {descripcionCABYS && (
              <div className="mt-2 p-2 bg-green-50 border border-green-200 rounded text-sm">
                <strong>Descripción oficial (Hacienda):</strong> {descripcionCABYS}
                <br />
                <span className="text-gray-600 text-xs">
                  Esta descripción se usará en facturas oficiales para cumplir con Hacienda
                </span>
              </div>
            )}
          </div>
          
          {/* Lista de sugerencias */}
          {codigosCABYS.length > 0 && (
            <div className="max-h-40 overflow-y-auto border border-gray-200 rounded-md">
              {codigosCABYS.map((codigo) => (
                <div
                  key={codigo.codigo}
                  onClick={() => handleSeleccionarCABYS(codigo)}
                  className="p-2 hover:bg-gray-100 cursor-pointer border-b border-gray-100 last:border-b-0"
                >
                  <div className="font-medium text-sm">{codigo.codigo}</div>
                  <div className="text-xs text-gray-600 truncate">{codigo.descripcion}</div>
                </div>
              ))}
            </div>
          )}
          
          <p className="text-xs text-blue-600">
            <strong>Ejemplos de búsqueda:</strong><br/>
            • Por palabra: "pan", "harina", "consultoría"<br/>
            • Por categoría: "alimentos", "servicios", "tecnología"<br/>
            • Por código completo: "1234567890123"<br/>
            • Múltiples palabras: "harina de trigo", "servicio consultoría"
          </p>
        </div>
      </div>

      <div>
        <label htmlFor="nombreProducto" className="block text-sm font-medium text-gray-700 mb-1">
          Nombre Comercial del Producto *
        </label>
        <Input
          id="nombreProducto"
          type="text"
          value={nombre}
          onValueChange={setNombre}
          placeholder="Ej: Pan Artesanal Casa Blanca, Harina Premium Golden"
          isRequired
        />
        <p className="text-xs text-gray-500 mt-1">
          Este es el nombre que aparecerá en tu inventario y podrás usar comercialmente
        </p>
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
        <Select
          id="unidadProducto"
          aria-label="Seleccionar unidad"
          placeholder="Selecciona una unidad"
          selectedKeys={unidad ? new Set([unidad]) : new Set()}
          onSelectionChange={(keys) => {
            const selectedKey = Array.from(keys)[0];
            setUnidad(selectedKey ? String(selectedKey) : "unidad");
          }}
        >
          <SelectItem key="unidad" textValue="Unidad">Unidad (und)</SelectItem>
          <SelectItem key="kilogramo" textValue="Kilogramo">Kilogramo (kg)</SelectItem>
          <SelectItem key="gramo" textValue="Gramo">Gramo (g)</SelectItem>
          <SelectItem key="litro" textValue="Litro">Litro (lt)</SelectItem>
          <SelectItem key="mililitro" textValue="Mililitro">Mililitro (ml)</SelectItem>
          <SelectItem key="metro" textValue="Metro">Metro (m)</SelectItem>
          <SelectItem key="centimetro" textValue="Centímetro">Centímetro (cm)</SelectItem>
          <SelectItem key="caja" textValue="Caja">Caja</SelectItem>
          <SelectItem key="paquete" textValue="Paquete">Paquete</SelectItem>
          <SelectItem key="docena" textValue="Docena">Docena</SelectItem>
        </Select>
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
          disabled={loading || !codigoVerificado}
        >
          {loading ? "Creando..." : "Crear Producto"}
        </Button>
      </div>
    </form>
  );
}