import { useState, useEffect, useCallback } from 'react';
import { Plus, Pencil, Trash2, Save, X, ChevronDown, ChevronUp, Loader2, AlertCircle } from 'lucide-react';
import { supabase } from '../../../utils/supabase';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";

interface RawMaterial {
  id: number;
  "material-name": string | null;
  unit: string | null;
  "price-per-unit": number | null;
}

interface FormulationMaterial {
  id?: number;
  material_name: string;
  quantity: number | '';
  formulation_id?: number;
}

interface Formulation {
  id: number;
  product_name: string;
  batch_size: number;
  unit: string;
  formulation_materials: FormulationMaterial[];
}

export function FormulationModule() {
  const [formulations, setFormulations] = useState<Formulation[]>([]);
  const [rawMaterials, setRawMaterials] = useState<RawMaterial[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [expandedId, setExpandedId] = useState<number | null>(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    productName: '',
    batchSize: '100',
    batchUnit: 'Litre',
  });
  const [formulationMaterials, setFormulationMaterials] = useState<FormulationMaterial[]>([]);

  const fetchData = useCallback(async () => {
    try {
      setError(null);

      const [rawMaterialsResponse, formulationsResponse] = await Promise.all([
        supabase.from('rawMaterial').select('*').order('material-name', { ascending: true }),
        supabase.from('formulations').select(`
          *,
          formulation_materials (*)
        `).order('product_name', { ascending: true })
      ]);

      if (rawMaterialsResponse.error) throw rawMaterialsResponse.error;
      if (formulationsResponse.error) throw formulationsResponse.error;

      setRawMaterials(rawMaterialsResponse.data || []);
      setFormulations(formulationsResponse.data || []);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to fetch data';
      setError(message);
      console.error('Error fetching data:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleAddMaterial = () => {
    setFormulationMaterials([
      ...formulationMaterials,
      { material_name: '', quantity: 1 },
    ]);
  };

  const handleRemoveMaterial = (index: number) => {
    setFormulationMaterials(formulationMaterials.filter((_, i) => i !== index));
  };

  const handleMaterialChange = (index: number, field: keyof FormulationMaterial, value: string | number) => {
    const updated = [...formulationMaterials];
    updated[index] = { ...updated[index], [field]: value };
    setFormulationMaterials(updated);
  };

  const handleSave = async () => {
    if (!formData.productName || !formData.batchSize) {
      alert('Please fill in product name and batch size');
      return;
    }

    if (formulationMaterials.length === 0 || formulationMaterials.some(m => !m.material_name || m.quantity <= 0)) {
      alert('Please add at least one material with valid quantity');
      return;
    }

    setSaving(true);
    try {
      const { data: newFormulation, error: formulationError } = await supabase
        .from('formulations')
        .insert({
          product_name: formData.productName,
          batch_size: parseFloat(formData.batchSize),
          unit: formData.batchUnit,
        })
        .select()
        .single();

      if (formulationError) throw formulationError;

      const materialsToInsert = formulationMaterials.map(fm => ({
        material_name: fm.material_name,
        quantity: fm.quantity,
        formulation_id: newFormulation.id
      }));

      const { data: insertedMaterials, error: materialsError } =
        await supabase
          .from('formulation_materials')
          .insert(materialsToInsert)
          .select();

      if (materialsError) throw materialsError;

      setFormulations(prev => [
        ...prev,
        {
          ...newFormulation,
          formulation_materials: insertedMaterials || []
        }
      ]);
      resetForm();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to save formulation';
      alert(`Error saving formulation: ${message}`);
    } finally {
      setSaving(false);
    }
  };

  const handleUpdate = async () => {
    if (!formData.productName || !formData.batchSize || editingId === null) {
      alert('Please fill in all required fields');
      return;
    }

    if (formulationMaterials.length === 0 || formulationMaterials.some(m => !m.material_name || m.quantity <= 0)) {
      alert('Please add at least one material with valid quantity');
      return;
    }

    setSaving(true);
    try {
      const { error: formulationError } = await supabase
        .from('formulations')
        .update({
          product_name: formData.productName,
          batch_size: parseFloat(formData.batchSize),
          unit: formData.batchUnit,
        })
        .eq('id', editingId);

      if (formulationError) throw formulationError;

      const { error: deleteError } = await supabase
        .from('formulation_materials')
        .delete()
        .eq('formulation_id', editingId);

      if (deleteError) throw deleteError;

      const materialsToInsert = formulationMaterials.map(fm => ({
        material_name: fm.material_name,
        quantity: fm.quantity,
        formulation_id: editingId
      }));

      const { error: insertError } = await supabase
        .from('formulation_materials')
        .insert(materialsToInsert);

      if (insertError) throw insertError;

      setFormulations(prev =>
        prev.map(f =>
          f.id === editingId
            ? {
              ...f,
              product_name: formData.productName,
              batch_size: parseFloat(formData.batchSize),
              unit: formData.batchUnit,
              formulation_materials: formulationMaterials
            }
            : f
        )
      );

      resetForm();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to update formulation';
      alert(`Error updating formulation: ${message}`);
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (id: number) => {
    const formulation = formulations.find((f) => f.id === id);
    if (formulation) {
      setFormData({
        productName: formulation.product_name,
        batchSize: formulation.batch_size.toString(),
        batchUnit: formulation.unit || 'Litre',
      });
      setFormulationMaterials(formulation.formulation_materials.map(fm => ({
        material_name: fm.material_name,
        quantity: fm.quantity
      })));
      setEditingId(id);
      setIsAdding(true);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Delete formulation?")) return;

    try {
      await supabase
        .from("formulation_materials")
        .delete()
        .eq("formulation_id", id);

      const { error } = await supabase
        .from("formulations")
        .delete()
        .eq("id", id);

      if (error) throw error;

      // remove locally
      setFormulations(prev =>
        prev.filter(f => f.id !== id)
      );

    } catch (err) {
      console.error(err);
    }
  };

  const resetForm = () => {
    setFormData({ productName: '', batchSize: '100', batchUnit: 'Litre' });
    setFormulationMaterials([]);
    setIsAdding(false);
    setEditingId(null);
  };

  const getMaterialByName = (name: string) => {
    return rawMaterials.find((m) => m["material-name"] === name);
  };

  const calculateFormulationCost = (formulation: Formulation) => {
    return formulation.formulation_materials.reduce((total, fm) => {
      const material = getMaterialByName(fm.material_name);
      return total + (material?.["price-per-unit"] || 0) * fm.quantity;
    }, 0);
  };

  if (loading) {
    return (
      <div className="max-w-6xl flex items-center justify-center py-20">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
          <p className="text-slate-600">Loading formulations from database...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl">
      <div className="sticky top-0 z-10 bg-slate-50 -mx-6 px-6 -mt-6 pt-6 pb-4 mb-12 flex items-center justify-between border-b border-slate-200 shadow-sm">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Product Formulations</h2>
          <p className="text-sm text-slate-600 mt-1">
            Create and manage your product recipes
          </p>
        </div>
        <div className="flex items-center gap-2">
          {!isAdding && editingId === null && (
            <button
              onClick={() => setIsAdding(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 shadow-sm"
            >
              <Plus className="w-4 h-4" />
              New Formulation
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 rounded-xl border border-red-200 flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
          <p className="text-sm text-red-800">{error}</p>
          <button
            onClick={fetchData}
            className="ml-auto px-3 py-1 text-sm bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors"
          >
            Retry
          </button>
        </div>
      )}

      {(isAdding || editingId !== null) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
          <div className="w-full max-w-4xl max-h-[90vh] bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden flex flex-col">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <h3 className="text-lg font-semibold text-slate-900">
                {editingId !== null ? 'Edit Formulation' : 'Create New Formulation'}
              </h3>
              <button
                onClick={resetForm}
                className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Product Name
                  </label>
                  <input
                    type="text"
                    value={formData.productName}
                    onChange={(e) => setFormData({ ...formData, productName: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                    placeholder="e.g. Hand Sanitizer Pro"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Batch Size
                  </label>
                  <input
                    type="number"
                    value={formData.batchSize}
                    onChange={(e) => setFormData({ ...formData, batchSize: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                    placeholder="e.g. 1000"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Batch Unit
                  </label>
                  <select
                    value={formData.batchUnit}
                    onChange={(e) => setFormData({ ...formData, batchUnit: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  >
                    <option value="Litre">Litre</option>
                    <option value="Kilogram">Kilogram</option>
                    <option value="Tonne">Tonne</option>
                  </select>
                </div>
              </div>

              <div className="mb-4">
                <div className="flex items-center justify-between mb-3">
                  <label className="block text-sm font-medium text-slate-700">
                    Materials & Quantities
                  </label>
                  <button
                    onClick={handleAddMaterial}
                    className="text-sm px-3 py-1.5 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition-colors flex items-center gap-1"
                  >
                    <Plus className="w-3 h-3" />
                    Add Material
                  </button>
                </div>

                <div className="space-y-3">
                  {formulationMaterials.map((fm, index) => (
                    <div key={index} className="flex gap-3 items-start">
                      <div className="flex-1">
                        <Select
                          value={fm.material_name}
                          onValueChange={(val) => handleMaterialChange(index, 'material_name', val)}
                        >
                          <SelectTrigger className="w-full h-[42px] border-slate-300">
                            <SelectValue placeholder="Select material" />
                          </SelectTrigger>
                          <SelectContent className="max-h-[300px]">
                            {rawMaterials.map((material) => (
                              <SelectItem key={material.id} value={material["material-name"] || `unknown-${material.id}`}>
                                {material["material-name"]} ({material.unit})
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="w-40">
                        <input
                          type="number"
                          min="1"
                          value={fm.quantity}
                          onChange={(e) => handleMaterialChange(index, 'quantity', e.target.value === ''
                            ? ''
                            : parseInt(e.target.value, 10))}
                          className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                          placeholder="Quantity"
                        />
                      </div>
                      <button
                        onClick={() => handleRemoveMaterial(index)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ))}

                  {formulationMaterials.length === 0 && (
                    <p className="text-sm text-slate-500 text-center py-4 bg-slate-50 rounded-lg border border-dashed border-slate-200">
                      No materials added yet. Click "Add Material" to begin.
                    </p>
                  )}
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-6 border-t border-slate-100 mt-6">
                <button
                  onClick={resetForm}
                  disabled={saving}
                  className="px-4 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition-colors flex items-center gap-2 disabled:opacity-50 font-medium"
                >
                  Cancel
                </button>
                <button
                  onClick={editingId !== null ? handleUpdate : handleSave}
                  disabled={saving}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed font-medium shadow-sm"
                >
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  {editingId !== null ? 'Update Formulation' : 'Create Formulation'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="space-y-4">
        {formulations.length === 0 ? (
          <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
            <p className="text-slate-500">
              No formulations created yet. Click "New Formulation" to get started.
            </p>
          </div>
        ) : (
          formulations.map((formulation) => (
            <div
              key={formulation.id}
              className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden"
            >
              <div className="p-4 flex items-center justify-between">
                <div className="flex-1">
                  <h3 className="font-semibold text-slate-900 text-lg">
                    {formulation.product_name}
                  </h3>
                  <p className="text-sm text-slate-600 mt-1">
                    Batch: {formulation.batch_size} {formulation.unit} •{' '}
                    {formulation.formulation_materials.length} materials • Cost per batch: £
                    {calculateFormulationCost(formulation).toFixed(2)}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleEdit(formulation.id)}
                    className="p-2 text-slate-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(formulation.id)}
                    className="p-2 text-slate-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setExpandedId(expandedId === formulation.id ? null : formulation.id)}
                    className="p-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                  >
                    {expandedId === formulation.id ? (
                      <ChevronUp className="w-4 h-4" />
                    ) : (
                      <ChevronDown className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>

              {expandedId === formulation.id && (
                <div className="border-t border-slate-200 bg-slate-50 p-4">
                  <table className="w-full">
                    <thead>
                      <tr className="text-left text-xs font-medium text-slate-700 uppercase">
                        <th className="pb-2">Material</th>
                        <th className="pb-2 text-right">Quantity</th>
                        <th className="pb-2 text-right">Unit Cost</th>
                        <th className="pb-2 text-right">Line Cost</th>
                      </tr>
                    </thead>
                    <tbody className="text-sm">
                      {formulation.formulation_materials.map((fm, index) => {
                        const material = getMaterialByName(fm.material_name);
                        const lineCost = material ? (material["price-per-unit"] || 0) * fm.quantity : 0;
                        return (
                          <tr key={index} className="border-t border-slate-200">
                            <td className="py-2 text-slate-900">{fm.material_name}</td>
                            <td className="py-2 text-right text-slate-600">
                              {fm.quantity} {material?.unit || ''}
                            </td>
                            <td className="py-2 text-right text-slate-600">
                              £{material?.["price-per-unit"]?.toFixed(2) || '0.00'}
                            </td>
                            <td className="py-2 text-right text-slate-900 font-medium">
                              £{lineCost.toFixed(2)}
                            </td>
                          </tr>
                        );
                      })}
                      <tr className="border-t-2 border-slate-300 font-semibold">
                        <td colSpan={3} className="py-2 text-slate-900">
                          Total per {formulation.batch_size} {formulation.unit}
                        </td>
                        <td className="py-2 text-right text-slate-900">
                          £{calculateFormulationCost(formulation).toFixed(2)}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      <div className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
        <p className="text-sm text-blue-800">
          <strong>Total Formulations:</strong> {formulations.length} • Synced with Supabase
        </p>
      </div>
    </div>
  );
}

