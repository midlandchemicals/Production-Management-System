import { useState, useEffect, useRef, useCallback } from 'react';
import { Calculator, Save, Loader2, AlertCircle } from 'lucide-react';
import { supabase } from '../../../utils/supabase';

interface RawMaterial {
  id: number;
  "material-name": string | null;
  unit: string | null;
  "price-per-unit": number | null;
}

interface FormulationMaterial {
  id?: number;
  material_name: string;
  quantity: number;
  formulation_id?: number;
}

interface Formulation {
  id: number;
  product_name: string;
  batch_size: number;
  unit: string;
  formulation_materials: FormulationMaterial[];
}

interface ScaledMaterial {
  material_name: string;
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
  packagingCost: number;
  otherCost: number;
  finalCost: number;
}

export function ProductionCalculator() {
  const [formulations, setFormulations] = useState<Formulation[]>([]);
  const [rawMaterials, setRawMaterials] = useState<RawMaterial[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [selectedFormulation, setSelectedFormulation] = useState<Formulation | null>(null);
  const [productSearch, setProductSearch] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);

  const [containerQuantity, setContainerQuantity] = useState('');
  const [containerSize, setContainerSize] = useState('');
  const [packagingCost, setPackagingCost] = useState('');
  const [otherCost, setOtherCost] = useState('');
  const [containerUnit, setContainerUnit] = useState('Litre');
  const [calculationResult, setCalculationResult] = useState<CalculationResult | null>(null);
  const [customerName, setCustomerName] = useState('');
  const [salePrice, setSalePrice] = useState('');

  const dropdownRef = useRef<HTMLDivElement>(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const [rawMaterialsResponse, formulationsResponse] = await Promise.all([
        supabase.from('rawMaterial').select('*').order('material-name', { ascending: true }),
        supabase.from('formulations').select(`
          *,
          formulation_materials (*)
        `).order('product_name', { ascending: true }),
      ]);

      if (rawMaterialsResponse.error) throw rawMaterialsResponse.error;
      if (formulationsResponse.error) throw formulationsResponse.error;

      setRawMaterials(rawMaterialsResponse.data || []);
      setFormulations(formulationsResponse.data || []);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to fetch data';
      setError(message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filteredFormulations = formulations.filter((f) =>
    f.product_name.toLowerCase().includes(productSearch.toLowerCase())
  );

  const handleSelectFormulation = (f: Formulation) => {
    setSelectedFormulation(f);
    setProductSearch(f.product_name);
    setShowDropdown(false);
  };

  const getMaterialByName = (name: string) =>
    rawMaterials.find((m) => m["material-name"] === name);

  const handleCalculate = () => {
    if (!selectedFormulation || !containerQuantity || !containerSize) {
      alert('Please fill in all fields');
      return;
    }

    const qty = parseInt(containerQuantity);
    const size = parseFloat(containerSize);
    const totalVolume = qty * size;
    const scaleFactor = totalVolume / selectedFormulation.batch_size;

    const scaledMaterials: ScaledMaterial[] = selectedFormulation.formulation_materials.map((fm) => {
      const material = getMaterialByName(fm.material_name);
      const scaledQty = fm.quantity * scaleFactor;
      const pricePerUnit = material?.["price-per-unit"] || 0;
      const lineCost = pricePerUnit * scaledQty;

      return {
        material_name: fm.material_name,
        unit: material?.unit || '',
        scaledQuantity: scaledQty,
        pricePerUnit,
        lineCost,
      };
    });

    const totalCost = scaledMaterials.reduce((sum, m) => sum + m.lineCost, 0);
    const packCost = packagingCost ? parseFloat(packagingCost) : 0;
    const othCost = otherCost ? parseFloat(otherCost) : 0;
    const finalCost = totalCost + packCost + othCost;

    setCalculationResult({
      formulation: selectedFormulation,
      containerQuantity: qty,
      containerSize: size,
      containerUnit,
      totalVolume,
      scaleFactor,
      scaledMaterials,
      totalCost,
      packagingCost: packCost,
      otherCost: othCost,
      finalCost,
    });
  };

  const handleSaveToOrderBook = async () => {
    if (!calculationResult || !customerName) {
      alert('Please enter customer name');
      return;
    }

    try {
      const { error } = await supabase
        .from('order_book')
        .insert({
          date_received: new Date().toISOString(),
          customer_name: customerName,
          product_name: calculationResult.formulation.product_name,
          container_quantity: calculationResult.containerQuantity,
          container_size: calculationResult.containerSize,
          container_unit: calculationResult.containerUnit,
          total_volume: calculationResult.totalVolume,
          raw_material_cost: calculationResult.finalCost,
          materials: calculationResult.scaledMaterials
        });

      if (error) throw error;
      
      alert('Order saved to Order Book successfully!');
      handleReset();
    } catch (err: any) {
      alert(`Failed to save order: ${err.message}`);
    }
  };

  const handleReset = () => {
    setCalculationResult(null);
    setSelectedFormulation(null);
    setProductSearch('');
    setContainerQuantity('');
    setContainerSize('');
    setPackagingCost('');
    setOtherCost('');
    setCustomerName('');
    setSalePrice('');
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
      <div className="mb-6 mt-4">
        <h2 className="text-2xl font-bold text-slate-900">Production Calculator</h2>
        <p className="text-sm text-slate-600 mt-1">
          Calculate exact material quantities and costs for production orders
        </p>
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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Input Section */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
          <h3 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
            <Calculator className="w-5 h-5 text-blue-600" />
            Order Details
          </h3>

          <div className="space-y-4">
            {/* Searchable product autocomplete */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Select Product
              </label>
              <div className="relative" ref={dropdownRef}>
                <input
                  type="text"
                  value={productSearch}
                  onChange={(e) => {
                    setProductSearch(e.target.value);
                    setSelectedFormulation(null);
                    setShowDropdown(true);
                  }}
                  onFocus={() => setShowDropdown(true)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  placeholder="Type to search for a product..."
                />

                {showDropdown && productSearch.length > 0 && filteredFormulations.length > 0 && (
                  <div className="absolute z-10 w-full mt-1 bg-white border border-slate-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                    {filteredFormulations.map((f) => (
                      <button
                        key={f.id}
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => handleSelectFormulation(f)}
                        className="w-full text-left px-3 py-2 hover:bg-blue-50 text-sm text-slate-800 border-b border-slate-100 last:border-0"
                      >
                        <span className="font-medium">{f.product_name}</span>
                      </button>
                    ))}
                  </div>
                )}

                {showDropdown && productSearch && filteredFormulations.length === 0 && (
                  <div className="absolute z-10 w-full mt-1 bg-white border border-slate-200 rounded-lg shadow-lg px-3 py-2 text-sm text-slate-500">
                    No products found matching "{productSearch}"
                  </div>
                )}
              </div>
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
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Total Packaging Cost (£)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={packagingCost}
                  onChange={(e) => setPackagingCost(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  placeholder="e.g. 50"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Total Other Cost (£)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={otherCost}
                  onChange={(e) => setOtherCost(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  placeholder="e.g. 25"
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
                      {calculationResult.formulation.product_name}
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
                        <p className="font-medium text-slate-900">{material.material_name}</p>
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
                <div className="flex items-center justify-between mb-2">
                  <p className="font-semibold text-slate-900">Total Raw Material Cost</p>
                  <p className="text-xl font-bold text-green-700">
                    £{calculationResult.totalCost.toFixed(2)}
                  </p>
                </div>
                {(calculationResult.packagingCost > 0 || calculationResult.otherCost > 0) && (
                  <>
                    <div className="flex items-center justify-between mb-2 text-sm">
                      <p className="text-slate-700">Packaging Cost</p>
                      <p className="font-medium text-slate-900">£{calculationResult.packagingCost.toFixed(2)}</p>
                    </div>
                    <div className="flex items-center justify-between mb-2 text-sm">
                      <p className="text-slate-700">Other Cost</p>
                      <p className="font-medium text-slate-900">£{calculationResult.otherCost.toFixed(2)}</p>
                    </div>
                  </>
                )}
                <div className="flex items-center justify-between border-t border-green-200/60 pt-2 mb-2">
                  <p className="font-bold text-slate-900">Total Production Cost</p>
                  <p className="text-2xl font-bold text-green-800">
                    £{calculationResult.finalCost.toFixed(2)}
                  </p>
                </div>
                <div className="flex items-center justify-between border-t border-green-200/60 pt-2">
                  <p className="text-sm font-medium text-green-800">Cost per {calculationResult.containerUnit}</p>
                  <p className="text-sm font-bold text-green-800">
                    £{(calculationResult.finalCost / calculationResult.totalVolume).toFixed(2)}
                  </p>
                </div>
                <p className="text-xs text-slate-600 mt-2">
                  Includes production, packaging, and other specified costs.
                </p>
              </div>

              {/* Profitability Analysis Section */}
              <div className="mt-6 border-t border-slate-200 pt-6">
                <h4 className="text-md font-semibold text-slate-900 mb-4 flex items-center gap-2">
                  Profitability Analysis
                </h4>

                <div className="mb-4">
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Sale Price per {calculationResult.containerUnit} (£)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={salePrice}
                    onChange={(e) => setSalePrice(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none max-w-xs"
                    placeholder="e.g. 15.50"
                  />
                </div>

                {salePrice && parseFloat(salePrice) > 0 && (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="p-4 bg-white rounded-lg border border-slate-200 shadow-sm">
                      <p className="text-sm text-slate-600 mb-1">Profit per {calculationResult.containerUnit}</p>
                      <p className="text-xl font-bold text-slate-900">
                        £{((parseFloat(salePrice) - (calculationResult.finalCost / calculationResult.totalVolume))).toFixed(2)}
                      </p>
                    </div>
                    <div className="p-4 bg-white rounded-lg border border-slate-200 shadow-sm">
                      <p className="text-sm text-slate-600 mb-1">Margin</p>
                      <p className="text-xl font-bold text-slate-900">
                        {(((parseFloat(salePrice) - (calculationResult.finalCost / calculationResult.totalVolume)) / parseFloat(salePrice)) * 100).toFixed(2)}%
                      </p>
                    </div>
                    <div className="p-4 bg-indigo-50 rounded-lg border border-indigo-200 shadow-sm">
                      <p className="text-sm text-indigo-700 mb-1">Total Order Profit</p>
                      <p className="text-xl font-bold text-indigo-900">
                        £{((parseFloat(salePrice) - (calculationResult.finalCost / calculationResult.totalVolume)) * calculationResult.totalVolume).toFixed(2)}
                      </p>
                    </div>
                  </div>
                )}
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