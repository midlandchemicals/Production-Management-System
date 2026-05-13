import { useState, useEffect } from 'react';
import { Plus, Pencil, Trash2, Save, X, ChevronDown, ChevronUp } from 'lucide-react';

interface RawMaterial {
  id: string;
  name: string;
  unit: string;
  pricePerUnit: number;
}

interface FormulationMaterial {
  materialId: string;
  quantity: number;
}

interface Formulation {
  id: string;
  productName: string;
  batchSize: number;
  batchUnit: string;
  materials: FormulationMaterial[];
  createdAt: string;
}

export function FormulationModule() {
  const [formulations, setFormulations] = useState<Formulation[]>([]);
  const [rawMaterials, setRawMaterials] = useState<RawMaterial[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    productName: '',
    batchSize: '',
    batchUnit: 'Litre',
  });
  const [formulationMaterials, setFormulationMaterials] = useState<FormulationMaterial[]>([]);

  useEffect(() => {
    const storedMaterials = localStorage.getItem('rawMaterials');
    if (storedMaterials) {
      setRawMaterials(JSON.parse(storedMaterials));
    }

    const storedFormulations = localStorage.getItem('formulations');
    if (storedFormulations) {
      setFormulations(JSON.parse(storedFormulations));
    }
  }, []);

  const saveFormulations = (updatedFormulations: Formulation[]) => {
    setFormulations(updatedFormulations);
    localStorage.setItem('formulations', JSON.stringify(updatedFormulations));
  };

  const handleAddMaterial = () => {
    setFormulationMaterials([
      ...formulationMaterials,
      { materialId: '', quantity: 0 },
    ]);
  };

  const handleRemoveMaterial = (index: number) => {
    setFormulationMaterials(formulationMaterials.filter((_, i) => i !== index));
  };

  const handleMaterialChange = (index: number, field: string, value: string | number) => {
    const updated = [...formulationMaterials];
    updated[index] = { ...updated[index], [field]: value };
    setFormulationMaterials(updated);
  };

  const handleSave = () => {
    if (!formData.productName || !formData.batchSize) {
      alert('Please fill in product name and batch size');
      return;
    }

    if (formulationMaterials.length === 0 || formulationMaterials.some(m => !m.materialId || m.quantity <= 0)) {
      alert('Please add at least one material with valid quantity');
      return;
    }

    const newFormulation: Formulation = {
      id: Date.now().toString(),
      productName: formData.productName,
      batchSize: parseFloat(formData.batchSize),
      batchUnit: formData.batchUnit,
      materials: formulationMaterials,
      createdAt: new Date().toISOString(),
    };

    saveFormulations([...formulations, newFormulation]);
    resetForm();
  };

  const handleUpdate = () => {
    if (!formData.productName || !formData.batchSize || !editingId) {
      alert('Please fill in all required fields');
      return;
    }

    if (formulationMaterials.length === 0 || formulationMaterials.some(m => !m.materialId || m.quantity <= 0)) {
      alert('Please add at least one material with valid quantity');
      return;
    }

    const updatedFormulations = formulations.map((f) =>
      f.id === editingId
        ? {
            ...f,
            productName: formData.productName,
            batchSize: parseFloat(formData.batchSize),
            batchUnit: formData.batchUnit,
            materials: formulationMaterials,
          }
        : f
    );

    saveFormulations(updatedFormulations);
    resetForm();
  };

  const handleEdit = (id: string) => {
    const formulation = formulations.find((f) => f.id === id);
    if (formulation) {
      setFormData({
        productName: formulation.productName,
        batchSize: formulation.batchSize.toString(),
        batchUnit: formulation.batchUnit,
      });
      setFormulationMaterials(formulation.materials);
      setEditingId(id);
    }
  };

  const handleDelete = (id: string) => {
    if (confirm('Are you sure you want to delete this formulation?')) {
      saveFormulations(formulations.filter((f) => f.id !== id));
    }
  };

  const resetForm = () => {
    setFormData({ productName: '', batchSize: '', batchUnit: 'Litre' });
    setFormulationMaterials([]);
    setIsAdding(false);
    setEditingId(null);
  };

  const getMaterialName = (materialId: string) => {
    return rawMaterials.find((m) => m.id === materialId)?.name || 'Unknown';
  };

  const getMaterialUnit = (materialId: string) => {
    return rawMaterials.find((m) => m.id === materialId)?.unit || '';
  };

  const calculateFormulationCost = (formulation: Formulation) => {
    return formulation.materials.reduce((total, fm) => {
      const material = rawMaterials.find((m) => m.id === fm.materialId);
      return total + (material ? material.pricePerUnit * fm.quantity : 0);
    }, 0);
  };

  return (
    <div className="max-w-6xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Product Formulations</h2>
          <p className="text-sm text-slate-600 mt-1">
            Create and manage your product recipes
          </p>
        </div>
        {!isAdding && !editingId && (
          <button
            onClick={() => setIsAdding(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            New Formulation
          </button>
        )}
      </div>

      {(isAdding || editingId) && (
        <div className="mb-6 p-6 bg-white rounded-xl border border-slate-200 shadow-sm">
          <h3 className="text-lg font-semibold text-slate-900 mb-4">
            {isAdding ? 'Create New Formulation' : 'Edit Formulation'}
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
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
                step="0.01"
                value={formData.batchSize}
                onChange={(e) => setFormData({ ...formData, batchSize: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                placeholder="1000"
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
                    <select
                      value={fm.materialId}
                      onChange={(e) => handleMaterialChange(index, 'materialId', e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                    >
                      <option value="">Select material</option>
                      {rawMaterials.map((material) => (
                        <option key={material.id} value={material.id}>
                          {material.name} ({material.unit})
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="w-40">
                    <input
                      type="number"
                      step="0.01"
                      value={fm.quantity}
                      onChange={(e) => handleMaterialChange(index, 'quantity', parseFloat(e.target.value) || 0)}
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
                <p className="text-sm text-slate-500 text-center py-4 bg-slate-50 rounded-lg">
                  No materials added yet. Click "Add Material" to begin.
                </p>
              )}
            </div>
          </div>

          <div className="flex gap-3">
            <button
              onClick={isAdding ? handleSave : handleUpdate}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
            >
              <Save className="w-4 h-4" />
              {isAdding ? 'Create Formulation' : 'Update Formulation'}
            </button>
            <button
              onClick={resetForm}
              className="px-4 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition-colors flex items-center gap-2"
            >
              <X className="w-4 h-4" />
              Cancel
            </button>
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
                    {formulation.productName}
                  </h3>
                  <p className="text-sm text-slate-600 mt-1">
                    Batch: {formulation.batchSize} {formulation.batchUnit} •{' '}
                    {formulation.materials.length} materials • Cost per batch: £
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
                      {formulation.materials.map((fm, index) => {
                        const material = rawMaterials.find((m) => m.id === fm.materialId);
                        const lineCost = material ? material.pricePerUnit * fm.quantity : 0;
                        return (
                          <tr key={index} className="border-t border-slate-200">
                            <td className="py-2 text-slate-900">{getMaterialName(fm.materialId)}</td>
                            <td className="py-2 text-right text-slate-600">
                              {fm.quantity} {getMaterialUnit(fm.materialId)}
                            </td>
                            <td className="py-2 text-right text-slate-600">
                              £{material?.pricePerUnit.toFixed(2) || '0.00'}
                            </td>
                            <td className="py-2 text-right text-slate-900 font-medium">
                              £{lineCost.toFixed(2)}
                            </td>
                          </tr>
                        );
                      })}
                      <tr className="border-t-2 border-slate-300 font-semibold">
                        <td colSpan={3} className="py-2 text-slate-900">
                          Total per {formulation.batchSize} {formulation.batchUnit}
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
          <strong>Total Formulations:</strong> {formulations.length} • Formulations reference
          materials from the Raw Materials Database
        </p>
      </div>
    </div>
  );
}
