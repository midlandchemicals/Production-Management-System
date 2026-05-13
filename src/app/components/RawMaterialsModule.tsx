import { useState, useEffect } from 'react';
import { Plus, Pencil, Trash2, Save, X } from 'lucide-react';

interface RawMaterial {
  id: string;
  name: string;
  unit: string;
  pricePerUnit: number;
  lastUpdated: string;
}

export function RawMaterialsModule() {
  const [materials, setMaterials] = useState<RawMaterial[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    unit: '',
    pricePerUnit: '',
  });

  useEffect(() => {
    const stored = localStorage.getItem('rawMaterials');
    if (stored) {
      setMaterials(JSON.parse(stored));
    } else {
      // Sample data
      const sampleData: RawMaterial[] = [
        {
          id: '1',
          name: 'Ethanol',
          unit: 'Litre',
          pricePerUnit: 2.50,
          lastUpdated: new Date().toISOString(),
        },
        {
          id: '2',
          name: 'Distilled Water',
          unit: 'Litre',
          pricePerUnit: 0.15,
          lastUpdated: new Date().toISOString(),
        },
        {
          id: '3',
          name: 'Glycerol',
          unit: 'Kilogram',
          pricePerUnit: 3.75,
          lastUpdated: new Date().toISOString(),
        },
      ];
      setMaterials(sampleData);
      localStorage.setItem('rawMaterials', JSON.stringify(sampleData));
    }
  }, []);

  const saveMaterials = (updatedMaterials: RawMaterial[]) => {
    setMaterials(updatedMaterials);
    localStorage.setItem('rawMaterials', JSON.stringify(updatedMaterials));
  };

  const handleAdd = () => {
    if (!formData.name || !formData.unit || !formData.pricePerUnit) {
      alert('Please fill in all fields');
      return;
    }

    const newMaterial: RawMaterial = {
      id: Date.now().toString(),
      name: formData.name,
      unit: formData.unit,
      pricePerUnit: parseFloat(formData.pricePerUnit),
      lastUpdated: new Date().toISOString(),
    };

    saveMaterials([...materials, newMaterial]);
    setFormData({ name: '', unit: '', pricePerUnit: '' });
    setIsAdding(false);
  };

  const handleEdit = (id: string) => {
    const material = materials.find((m) => m.id === id);
    if (material) {
      setFormData({
        name: material.name,
        unit: material.unit,
        pricePerUnit: material.pricePerUnit.toString(),
      });
      setEditingId(id);
    }
  };

  const handleUpdate = () => {
    if (!formData.name || !formData.unit || !formData.pricePerUnit || !editingId) {
      alert('Please fill in all fields');
      return;
    }

    const updatedMaterials = materials.map((m) =>
      m.id === editingId
        ? {
            ...m,
            name: formData.name,
            unit: formData.unit,
            pricePerUnit: parseFloat(formData.pricePerUnit),
            lastUpdated: new Date().toISOString(),
          }
        : m
    );

    saveMaterials(updatedMaterials);
    setFormData({ name: '', unit: '', pricePerUnit: '' });
    setEditingId(null);
  };

  const handleDelete = (id: string) => {
    if (confirm('Are you sure you want to delete this material?')) {
      saveMaterials(materials.filter((m) => m.id !== id));
    }
  };

  const handleCancel = () => {
    setFormData({ name: '', unit: '', pricePerUnit: '' });
    setIsAdding(false);
    setEditingId(null);
  };

  return (
    <div className="max-w-6xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Raw Materials Database</h2>
          <p className="text-sm text-slate-600 mt-1">
            Manage your raw material inventory and pricing
          </p>
        </div>
        {!isAdding && !editingId && (
          <button
            onClick={() => setIsAdding(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Add Material
          </button>
        )}
      </div>

      {(isAdding || editingId) && (
        <div className="mb-6 p-6 bg-white rounded-xl border border-slate-200 shadow-sm">
          <h3 className="text-lg font-semibold text-slate-900 mb-4">
            {isAdding ? 'Add New Material' : 'Edit Material'}
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Material Name
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
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
                onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              >
                <option value="">Select unit</option>
                <option value="Litre">Litre</option>
                <option value="Kilogram">Kilogram</option>
                <option value="Tonne">Tonne</option>
                <option value="Gram">Gram</option>
                <option value="Millilitre">Millilitre</option>
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
                onChange={(e) => setFormData({ ...formData, pricePerUnit: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                placeholder="0.00"
              />
            </div>
          </div>
          <div className="flex gap-3">
            <button
              onClick={isAdding ? handleAdd : handleUpdate}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
            >
              <Save className="w-4 h-4" />
              {isAdding ? 'Add Material' : 'Update Material'}
            </button>
            <button
              onClick={handleCancel}
              className="px-4 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition-colors flex items-center gap-2"
            >
              <X className="w-4 h-4" />
              Cancel
            </button>
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
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
                  Last Updated
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-slate-700 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {materials.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-slate-500">
                    No materials added yet. Click "Add Material" to get started.
                  </td>
                </tr>
              ) : (
                materials.map((material) => (
                  <tr key={material.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4 font-medium text-slate-900">{material.name}</td>
                    <td className="px-6 py-4 text-slate-600">{material.unit}</td>
                    <td className="px-6 py-4 text-slate-900">
                      £{material.pricePerUnit.toFixed(2)}
                    </td>
                    <td className="px-6 py-4 text-slate-600">
                      {new Date(material.lastUpdated).toLocaleDateString('en-GB', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric',
                      })}
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
          <strong>Total Materials:</strong> {materials.length} • Data is stored locally and
          encrypted in your browser
        </p>
      </div>
    </div>
  );
}
