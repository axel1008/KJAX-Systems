import { useEffect, useState } from "react";
import { supabase } from "../../supabaseClient";
import { Trash2 } from "lucide-react";

interface CategoryModalProps {
  onClose: () => void;
}

export default function CategoryModal({ onClose }: CategoryModalProps) {
  const [categories, setCategories] = useState<{ id: number; nombre: string }[]>(
    []
  );
  const [newCategoryName, setNewCategoryName] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>("");

  const fetchCategories = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("categorias")
      .select("*")
      .order("nombre", { ascending: true });

    if (error) {
      console.error("Error al obtener categorías:", error.message);
      setCategories([]);
    } else if (data) {
      setCategories(data as { id: number; nombre: string }[]);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  const handleCreateCategory = async () => {
    const trimmed = newCategoryName.trim();
    if (!trimmed) {
      setError("El nombre de la categoría no puede estar vacío.");
      return;
    }

    setLoading(true);
    const { error: supaErr } = await supabase
      .from("categorias")
      .insert([{ nombre: trimmed }]);
    if (supaErr) {
      setError(supaErr.message);
    } else {
      setNewCategoryName("");
      setError("");
      await fetchCategories();
    }
    setLoading(false);
  };

  const handleDeleteCategory = async (id: number) => {
    if (!window.confirm("¿Seguro que deseas eliminar esta categoría?")) {
      return;
    }
    setLoading(true);
    const { error: supaErr } = await supabase
      .from("categorias")
      .delete()
      .eq("id", id);
    if (supaErr) {
      setError(supaErr.message);
    } else {
      await fetchCategories();
    }
    setLoading(false);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-lg p-6">
        <h2 className="text-xl font-semibold mb-4">Gestionar Categorías</h2>

        {error && (
          <p className="text-red-600 text-sm mb-2 whitespace-pre-wrap">{error}</p>
        )}

        <div className="mb-4 max-h-60 overflow-y-auto border border-gray-200 rounded p-2">
          {loading ? (
            <p className="text-gray-500 text-center">Cargando...</p>
          ) : categories.length === 0 ? (
            <p className="text-gray-500 text-center">No hay categorías</p>
          ) : (
            categories.map((cat) => (
              <div
                key={cat.id}
                className="flex items-center justify-between py-2 px-2 hover:bg-gray-100 rounded"
              >
                <span className="text-gray-700">{cat.nombre}</span>
                <button
                  onClick={() => handleDeleteCategory(cat.id)}
                  title="Eliminar categoría"
                  className="p-1 rounded"
                >
                  <Trash2
                    size={22}
                    className="text-gray-600 hover:text-red-600 transition-colors"
                  />
                </button>
              </div>
            ))
          )}
        </div>

        <div className="flex items-center space-x-2 mb-4">
          <input
            type="text"
            className="flex-1 border rounded px-3 py-2 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
            placeholder="Nueva categoría..."
            value={newCategoryName}
            onChange={(e) => setNewCategoryName(e.target.value)}
            disabled={loading}
          />
          <button
            onClick={handleCreateCategory}
            className="bg-blue-600 hover:bg-blue-500 text-white font-medium px-4 py-2 rounded disabled:opacity-50"
            disabled={loading}
          >
            {loading ? "Guardando..." : "Añadir"}
          </button>
        </div>

        <div className="flex justify-end">
          <button
            onClick={onClose} 
            className="px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded-lg text-gray-700 text-sm"
            disabled={loading}>
          
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}