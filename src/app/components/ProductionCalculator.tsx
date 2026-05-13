import { useState, useEffect } from 'react';
import { Calculator, Save } from 'lucide-react';

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
}

interface ScaledMaterial {
  materialId: string;
  name: string;
  unit: string;
  scaledQuantity: number;
  pricePerUnit: number;
  lineCost: number;
}

interface CalculationResult {
  formulation: Formulation;
  containerQuantity: number;
  containerSize: number;
  containerUnit: string;
  totalVolume: number;
  scaleFactor: number;
  scaledMaterials: ScaledMaterial[];
  totalCost: number;
}

export function ProductionCalculator() {
  const [formulations, setFormulations] = useState<Formulation[]>([]);
  const [rawMaterials, setRawMaterials] = useState<RawMaterial[]>([]);
  const [selectedFormulationId, setSelectedFormulationId] = useState('');
  const [containerQuantity, setContainerQuantity] = useState('');
  const [containerSize, setContainerSize] = useState('');
  const [containerUnit, setContainerUnit] = useState('Litre');
  const [calculationResult, setCalculationResult] = useState<CalculationResult | null>(null);
  const [customerName, setCustomerName] = useState('');

  useEffect(() => {
    const storedFormulations = localStorage.getItem('formulations');
    if (storedFormulations) {
      setFormulations(JSON.parse(storedFormulations));
    }

    const storedMaterials = localStorage.getItem('rawMaterials');
    if (storedMaterials) {
      setRawMaterials(JSON.parse(storedMaterials));
    }
  }, []);

  const handleCalculate = () => {
    if (!selectedFormulationId || !containerQuantity || !containerSize) {
      alert('Please fill in all fields');
      return;
    }

    const formulation = formulations.find((f) => f.id === selectedFormulationId);
    if (!formulation) {
      alert('Formulation not found');
      return;
    }

    const qty = parseInt(containerQuantity);
    const size = parseFloat(containerSize);
    const totalVolume = qty * size;
    const scaleFactor = totalVolume / formulation.batchSize;

    const scaledMaterials: ScaledMaterial[] = formulation.materials.map((fm) => {
      const material = rawMaterials.find((m) => m.id === fm.materialId);
      const scaledQty = fm.quantity * scaleFactor;
      const lineCost = material ? material.pricePerUnit * scaledQty : 0;

      return {
        materialId: fm.materialId,
        name: material?.name || 'Unknown',
        unit: material?.unit || '',
        scaledQuantity: scaledQty,
        pricePerUnit: material?.pricePerUnit || 0,
        lineCost,
      };
    });

    const totalCost = scaledMaterials.reduce((sum, m) => sum + m.lineCost, 0);

    setCalculationResult({
      formulation,
      containerQuantity: qty,
      containerSize: size,
      containerUnit,
      totalVolume,
      scaleFactor,
      scaledMaterials,
      totalCost,
    });
  };

  const handleSaveToOrderBook = () => {
    if (!calculationResult || !customerName) {
      alert('Please enter customer name');
      return;
    }

    const orders = JSON.parse(localStorage.getItem('orders') || '[]');
    const newOrder = {
      id: Date.now().toString(),
      date: new Date().toISOString(),
      customer: customerName,
      product: calculationResult.formulation.productName,
      containerQuantity: calculationResult.containerQuantity,
      containerSize: calculationResult.containerSize,
      containerUnit: calculationResult.containerUnit,
      totalVolume: calculationResult.totalVolume,
      rawMaterialCost: calculationResult.totalCost,
      materials: calculationResult.scaledMaterials,
    };

    orders.push(newOrder);
    localStorage.setItem('orders', JSON.stringify(orders));

    alert('Order saved to Order Book successfully!');
    setCustomerName('');
    setCalculationResult(null);
    setSelectedFormulationId('');
    setContainerQuantity('');
    setContainerSize('');
  };

  const handleReset = () => {
    setCalculationResult(null);
    setSelectedFormulationId('');
    setContainerQuantity('');
    setContainerSize('');
    setCustomerName('');
  };

  return (
    <div className="max-w-6xl">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-slate-900">Production Calculator</h2>
        <p className="text-sm text-slate-600 mt-1">
          Calculate exact material quantities and costs for production orders
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Input Section */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
          <h3 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
            <Calculator className="w-5 h-5 text-blue-600" />
            Order Details
          </h3>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Select Product
              </label>
              <select
                value={selectedFormulationId}
                onChange={(e) => setSelectedFormulationId(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              >
                <option value="">Choose a product...</option>
                {formulations.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.productName} ({f.batchSize} {f.batchUnit})
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Number of Containers
                </label>
                <input
                  type="number"
                  value={containerQuantity}
                  onChange={(e) => setContainerQuantity(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  placeholder="e.g. 7"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Container Size
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={containerSize}
                  onChange={(e) => setContainerSize(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  placeholder="e.g. 1000"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Container Unit
              </label>
              <select
                value={containerUnit}
                onChange={(e) => setContainerUnit(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              >
                <option value="Litre">Litre (IBC)</option>
                <option value="Kilogram">Kilogram</option>
              </select>
            </div>

            <button
              onClick={handleCalculate}
              className="w-full py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium flex items-center justify-center gap-2"
            >
              <Calculator className="w-4 h-4" />
              Calculate Production
            </button>

            {calculationResult && (
              <button
                onClick={handleReset}
                className="w-full py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition-colors"
              >
                Reset Calculator
              </button>
            )}
          </div>
        </div>

        {/* Results Section */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
          <h3 className="text-lg font-semibold text-slate-900 mb-4">
            Calculation Results
          </h3>

          {!calculationResult ? (
            <div className="flex items-center justify-center h-64 text-slate-400">
              <div className="text-center">
                <Calculator className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>Enter order details and click Calculate</p>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="text-slate-600">Product</p>
                    <p className="font-semibold text-slate-900">
                      {calculationResult.formulation.productName}
                    </p>
                  </div>
                  <div>
                    <p className="text-slate-600">Total Volume</p>
                    <p className="font-semibold text-slate-900">
                      {calculationResult.totalVolume.toFixed(2)} {calculationResult.containerUnit}
                    </p>
                  </div>
                  <div>
                    <p className="text-slate-600">Containers</p>
                    <p className="font-semibold text-slate-900">
                      {calculationResult.containerQuantity} x{' '}
                      {calculationResult.containerSize} {calculationResult.containerUnit}
                    </p>
                  </div>
                  <div>
                    <p className="text-slate-600">Scale Factor</p>
                    <p className="font-semibold text-slate-900">
                      {calculationResult.scaleFactor.toFixed(2)}x
                    </p>
                  </div>
                </div>
              </div>

              <div className="border border-slate-200 rounded-lg overflow-hidden">
                <div className="bg-slate-50 px-4 py-2 border-b border-slate-200">
                  <p className="text-sm font-medium text-slate-700">
                    Scaled Material Requirements
                  </p>
                </div>
                <div className="p-4 space-y-2">
                  {calculationResult.scaledMaterials.map((material, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between py-2 border-b border-slate-100 last:border-0"
                    >
                      <div className="flex-1">
                        <p className="font-medium text-slate-900">{material.name}</p>
                        <p className="text-xs text-slate-600">
                          {material.scaledQuantity.toFixed(2)} {material.unit} @ £
                          {material.pricePerUnit.toFixed(2)}/{material.unit}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-slate-900">
                          £{material.lineCost.toFixed(2)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                <div className="flex items-center justify-between">
                  <p className="font-semibold text-slate-900">Total Raw Material Cost</p>
                  <p className="text-2xl font-bold text-green-700">
                    £{calculationResult.totalCost.toFixed(2)}
                  </p>
                </div>
                <p className="text-xs text-slate-600 mt-2">
                  Excludes production, labour, packaging, and delivery costs
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Save to Order Book */}
      {calculationResult && (
        <div className="mt-6 bg-white rounded-xl border border-slate-200 shadow-sm p-6">
          <h3 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
            <Save className="w-5 h-5 text-blue-600" />
            Save to Order Book
          </h3>
          <div className="flex gap-4">
            <div className="flex-1">
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Customer Name
              </label>
              <input
                type="text"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                placeholder="Enter customer name"
              />
            </div>
            <div className="flex items-end">
              <button
                onClick={handleSaveToOrderBook}
                className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium flex items-center gap-2"
              >
                <Save className="w-4 h-4" />
                Save Order
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="mt-4 p-4 bg-amber-50 rounded-lg border border-amber-200">
        <p className="text-sm text-amber-800">
          <strong>Note:</strong> Cost calculations use current raw material prices. Saved orders
          capture a snapshot of costs at time of order.
        </p>
      </div>
    </div>
  );
}
