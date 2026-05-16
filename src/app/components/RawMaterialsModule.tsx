import { useState, useEffect, useCallback } from "react";
import {
  Plus,
  Pencil,
  Trash2,
  Save,
  X,
  Loader2,
  RefreshCw,
  AlertCircle,
} from "lucide-react";
import { supabase } from "../../../utils/supabase";

interface RawMaterial {
  id: number;
  "material-name": string | null;
  unit: string | null;
  "price-per-unit": number | null;
  created_at: string;
}

export function RawMaterialsModule() {
  const [materials, setMaterials] = useState<RawMaterial[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    unit: "",
    pricePerUnit: "",
  });

  // Fetch all materials from Supabase
  const fetchMaterials = useCallback(async () => {
    try {
      setError(null);
      const { data, error: fetchError } = await supabase
        .from("rawMaterial")
        .select("*")
        .order("material-name", { ascending: true });

      if (fetchError) {
        throw fetchError;
      }

      setMaterials(data || []);
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Failed to fetch materials";
      setError(message);
      console.error("Error fetching materials:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial fetch + real-time subscription
  useEffect(() => {
    fetchMaterials();

    // Subscribe to real-time changes on the rawMaterial table
    const channel = supabase
      .channel("rawMaterial-changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "rawMaterial",
        },
        (payload) => {
          if (payload.eventType === "INSERT") {
            setMaterials((prev) => {
              const newMaterial = payload.new as RawMaterial;
              // Avoid duplicates
              if (prev.some((m) => m.id === newMaterial.id)) return prev;
              return [...prev, newMaterial].sort((a, b) =>
                (a["material-name"] || "").localeCompare(
                  b["material-name"] || "",
                ),
              );
            });
          } else if (payload.eventType === "UPDATE") {
            setMaterials((prev) =>
              prev.map((m) =>
                m.id === (payload.new as RawMaterial).id
                  ? (payload.new as RawMaterial)
                  : m,
              ),
            );
          } else if (payload.eventType === "DELETE") {
            setMaterials((prev) =>
              prev.filter((m) => m.id !== (payload.old as { id: number }).id),
            );
          }
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchMaterials]);

  // Add a new material to Supabase
  const handleAdd = async () => {
    if (!formData.name || !formData.unit || !formData.pricePerUnit) {
      alert("Please fill in all fields");
      return;
    }

    setSaving(true);
    try {
      const { error: insertError } = await supabase.from("rawMaterial").insert({
        "material-name": formData.name,
        unit: formData.unit,
        "price-per-unit": parseFloat(formData.pricePerUnit),
      });

      if (insertError) throw insertError;

      setFormData({ name: "", unit: "", pricePerUnit: "" });
      setIsAdding(false);
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Failed to add material";
      alert(`Error adding material: ${message}`);
      console.error("Error adding material:", err);
    } finally {
      setSaving(false);
    }
  };

  // Start editing a material
  const handleEdit = (id: number) => {
    const material = materials.find((m) => m.id === id);
    if (material) {
      setFormData({
        name: material["material-name"] || "",
        unit: material.unit || "",
        pricePerUnit: material["price-per-unit"]?.toString() || "",
      });
      setEditingId(id);
    }
  };

  // Update an existing material in Supabase
  const handleUpdate = async () => {
    if (
      !formData.name ||
      !formData.unit ||
      !formData.pricePerUnit ||
      editingId === null
    ) {
      alert("Please fill in all fields");
      return;
    }

    setSaving(true);
    try {
      const { error: updateError } = await supabase
        .from("rawMaterial")
        .update({
          "material-name": formData.name,
          unit: formData.unit,
          "price-per-unit": parseFloat(formData.pricePerUnit),
        })
        .eq("id", editingId);

      if (updateError) throw updateError;

      setFormData({ name: "", unit: "", pricePerUnit: "" });
      setEditingId(null);
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Failed to update material";
      alert(`Error updating material: ${message}`);
      console.error("Error updating material:", err);
    } finally {
      setSaving(false);
    }
  };

  // Delete a material from Supabase
  const handleDelete = async (id: number) => {
    if (!confirm("Are you sure you want to delete this material?")) return;

    try {
      const { error: deleteError } = await supabase
        .from("rawMaterial")
        .delete()
        .eq("id", id);

      if (deleteError) throw deleteError;
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Failed to delete material";
      alert(`Error deleting material: ${message}`);
      console.error("Error deleting material:", err);
    }
  };

  const handleCancel = () => {
    setFormData({ name: "", unit: "", pricePerUnit: "" });
    setIsAdding(false);
    setEditingId(null);
  };

  // Loading state
  if (loading) {
    return (
      <div className="max-w-6xl flex items-center justify-center py-20">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
          <p className="text-slate-600">Loading materials from database...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl">
      <div className="sticky top-0 z-10 bg-slate-50 -mx-6 px-6 -mt-6 pt-6 pb-4 mb-6 flex items-center justify-between border-b border-slate-200 shadow-sm">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">
            Raw Materials Database
          </h2>
          <p className="text-sm text-slate-600 mt-1">
            Manage your raw material inventory and pricing
          </p>
        </div>
        <div className="flex items-center gap-2">
          {!isAdding && editingId === null && (
            <button
              onClick={() => setIsAdding(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 shadow-sm"
            >
              <Plus className="w-4 h-4" />
              Add Material
            </button>
          )}
        </div>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="mb-6 p-4 bg-red-50 rounded-xl border border-red-200 flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
          <p className="text-sm text-red-800">{error}</p>
          <button
            onClick={fetchMaterials}
            className="ml-auto px-3 py-1 text-sm bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors"
          >
            Retry
          </button>
        </div>
      )}

      {/* Add / Edit Form Modal */}
      {(isAdding || editingId !== null) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
          <div className="w-full max-w-3xl bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden flex flex-col">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <h3 className="text-lg font-semibold text-slate-900">
                {isAdding ? "Add New Material" : "Edit Material"}
              </h3>
              <button
                onClick={handleCancel}
                className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Material Name
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) =>
                      setFormData({ ...formData, name: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                    placeholder="e.g. Ethanol"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Unit of Measurement
                  </label>
                  <select
                    value={formData.unit}
                    onChange={(e) =>
                      setFormData({ ...formData, unit: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  >
                    <option value="">Select unit</option>
                    <option value="LTR">LTR</option>
                    <option value="KG">KG</option>
                    <option value="G">G</option>
                    <option value="each">Each</option>
                    <option value="BUCKET">Bucket</option>
                    <option value="SACK">Sack</option>
                    <option value="10kg">10kg</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Price per Unit (£)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.pricePerUnit}
                    onChange={(e) =>
                      setFormData({ ...formData, pricePerUnit: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                    placeholder="0.00"
                  />
                </div>
              </div>
              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  onClick={handleCancel}
                  disabled={saving}
                  className="px-4 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition-colors flex items-center gap-2 disabled:opacity-50 font-medium"
                >
                  Cancel
                </button>
                <button
                  onClick={isAdding ? handleAdd : handleUpdate}
                  disabled={saving}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed font-medium shadow-sm"
                >
                  {saving ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Save className="w-4 h-4" />
                  )}
                  {isAdding ? "Add Material" : "Update Material"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Materials Table */}
      <div className="bg-white rounded-xl border border-slate-200 pt-5 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-700 uppercase tracking-wider">
                  Material Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-700 uppercase tracking-wider">
                  Unit
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-700 uppercase tracking-wider">
                  Price per Unit
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-700 uppercase tracking-wider">
                  Added On
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-slate-700 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {materials.length === 0 ? (
                <tr>
                  <td
                    colSpan={5}
                    className="px-6 py-12 text-center text-slate-500"
                  >
                    No materials found in the database. Click "Add Material" to
                    get started.
                  </td>
                </tr>
              ) : (
                materials.map((material) => (
                  <tr
                    key={material.id}
                    className="hover:bg-slate-50 transition-colors"
                  >
                    <td className="px-6 py-4 font-medium text-slate-900">
                      {material["material-name"] || "—"}
                    </td>
                    <td className="px-6 py-4 text-slate-600">
                      {material.unit || "—"}
                    </td>
                    <td className="px-6 py-4 text-slate-900">
                      £{(material["price-per-unit"] ?? 0).toFixed(2)}
                    </td>
                    <td className="px-6 py-4 text-slate-600">
                      {new Date(material.created_at).toLocaleDateString(
                        "en-GB",
                        {
                          day: "2-digit",
                          month: "short",
                          year: "numeric",
                        },
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleEdit(material.id)}
                          className="p-2 text-slate-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(material.id)}
                          className="p-2 text-slate-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
        <p className="text-sm text-blue-800">
          <strong>Total Materials:</strong> {materials.length} • Synced with
          Supabase in real-time
        </p>
      </div>
    </div>
  );
}
