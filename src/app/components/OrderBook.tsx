import { useState, useEffect } from 'react';
import { Search, Filter, Download, ChevronDown, ChevronUp, Calendar } from 'lucide-react';

interface ScaledMaterial {
  materialId: string;
  name: string;
  unit: string;
  scaledQuantity: number;
  pricePerUnit: number;
  lineCost: number;
}

interface Order {
  id: string;
  date: string;
  customer: string;
  product: string;
  containerQuantity: number;
  containerSize: number;
  containerUnit: string;
  totalVolume: number;
  rawMaterialCost: number;
  materials: ScaledMaterial[];
}

export function OrderBook() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterProduct, setFilterProduct] = useState('');
  const [filterCustomer, setFilterCustomer] = useState('');
  const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState({ from: '', to: '' });

  useEffect(() => {
    const storedOrders = localStorage.getItem('orders');
    if (storedOrders) {
      setOrders(JSON.parse(storedOrders));
    }
  }, []);

  const uniqueProducts = Array.from(new Set(orders.map((o) => o.product)));
  const uniqueCustomers = Array.from(new Set(orders.map((o) => o.customer)));

  const filteredOrders = orders.filter((order) => {
    const matchesSearch =
      searchTerm === '' ||
      order.customer.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.product.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesProduct = filterProduct === '' || order.product === filterProduct;
    const matchesCustomer = filterCustomer === '' || order.customer === filterCustomer;

    const orderDate = new Date(order.date);
    const matchesDateFrom = dateRange.from === '' || orderDate >= new Date(dateRange.from);
    const matchesDateTo = dateRange.to === '' || orderDate <= new Date(dateRange.to);

    return matchesSearch && matchesProduct && matchesCustomer && matchesDateFrom && matchesDateTo;
  });

  const totalOrdersValue = filteredOrders.reduce((sum, order) => sum + order.rawMaterialCost, 0);

  const handleExport = () => {
    const csvContent = [
      ['Date', 'Customer', 'Product', 'Quantity', 'Total Volume', 'Raw Material Cost'],
      ...filteredOrders.map((order) => [
        new Date(order.date).toLocaleDateString('en-GB'),
        order.customer,
        order.product,
        `${order.containerQuantity} x ${order.containerSize} ${order.containerUnit}`,
        `${order.totalVolume} ${order.containerUnit}`,
        `£${order.rawMaterialCost.toFixed(2)}`,
      ]),
    ]
      .map((row) => row.join(','))
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `order-book-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleClearFilters = () => {
    setSearchTerm('');
    setFilterProduct('');
    setFilterCustomer('');
    setDateRange({ from: '', to: '' });
  };

  return (
    <div className="max-w-7xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Order Book</h2>
          <p className="text-sm text-slate-600 mt-1">
            Historical record of all production orders and costs
          </p>
        </div>
        <button
          onClick={handleExport}
          disabled={filteredOrders.length === 0}
          className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Download className="w-4 h-4" />
          Export CSV
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 mb-6">
        <div className="flex items-center gap-2 mb-4">
          <Filter className="w-4 h-4 text-slate-600" />
          <h3 className="font-medium text-slate-900">Filters</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3">
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Search</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm"
                placeholder="Customer or product..."
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Product</label>
            <select
              value={filterProduct}
              onChange={(e) => setFilterProduct(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm"
            >
              <option value="">All products</option>
              {uniqueProducts.map((product) => (
                <option key={product} value={product}>
                  {product}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Customer</label>
            <select
              value={filterCustomer}
              onChange={(e) => setFilterCustomer(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm"
            >
              <option value="">All customers</option>
              {uniqueCustomers.map((customer) => (
                <option key={customer} value={customer}>
                  {customer}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Date From</label>
            <input
              type="date"
              value={dateRange.from}
              onChange={(e) => setDateRange({ ...dateRange, from: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Date To</label>
            <input
              type="date"
              value={dateRange.to}
              onChange={(e) => setDateRange({ ...dateRange, to: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm"
            />
          </div>
        </div>

        {(searchTerm || filterProduct || filterCustomer || dateRange.from || dateRange.to) && (
          <div className="mt-3 flex justify-end">
            <button
              onClick={handleClearFilters}
              className="text-sm text-slate-600 hover:text-slate-900 underline"
            >
              Clear all filters
            </button>
          </div>
        )}
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
          <p className="text-sm text-slate-600 mb-1">Total Orders</p>
          <p className="text-2xl font-bold text-slate-900">{filteredOrders.length}</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
          <p className="text-sm text-slate-600 mb-1">Total Raw Material Cost</p>
          <p className="text-2xl font-bold text-green-700">£{totalOrdersValue.toFixed(2)}</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
          <p className="text-sm text-slate-600 mb-1">Unique Customers</p>
          <p className="text-2xl font-bold text-slate-900">
            {uniqueCustomers.filter((c) =>
              filterCustomer ? c === filterCustomer : true
            ).length}
          </p>
        </div>
      </div>

      {/* Orders List */}
      <div className="space-y-3">
        {filteredOrders.length === 0 ? (
          <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
            <Calendar className="w-12 h-12 mx-auto mb-3 text-slate-300" />
            <p className="text-slate-500">
              {orders.length === 0
                ? 'No orders recorded yet. Use the Production Calculator to create and save orders.'
                : 'No orders match your current filters.'}
            </p>
          </div>
        ) : (
          filteredOrders
            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
            .map((order) => (
              <div
                key={order.id}
                className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden"
              >
                <div className="p-4 flex items-center justify-between hover:bg-slate-50 transition-colors">
                  <div className="flex-1 grid grid-cols-1 md:grid-cols-5 gap-4">
                    <div>
                      <p className="text-xs text-slate-600">Date</p>
                      <p className="font-medium text-slate-900">
                        {new Date(order.date).toLocaleDateString('en-GB', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-600">Customer</p>
                      <p className="font-medium text-slate-900">{order.customer}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-600">Product</p>
                      <p className="font-medium text-slate-900">{order.product}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-600">Quantity</p>
                      <p className="font-medium text-slate-900">
                        {order.containerQuantity} x {order.containerSize} {order.containerUnit}
                      </p>
                      <p className="text-xs text-slate-600">
                        Total: {order.totalVolume} {order.containerUnit}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-600">Raw Material Cost</p>
                      <p className="text-lg font-bold text-green-700">
                        £{order.rawMaterialCost.toFixed(2)}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() =>
                      setExpandedOrderId(expandedOrderId === order.id ? null : order.id)
                    }
                    className="ml-4 p-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                  >
                    {expandedOrderId === order.id ? (
                      <ChevronUp className="w-5 h-5" />
                    ) : (
                      <ChevronDown className="w-5 h-5" />
                    )}
                  </button>
                </div>

                {expandedOrderId === order.id && (
                  <div className="border-t border-slate-200 bg-slate-50 p-4">
                    <h4 className="font-semibold text-slate-900 mb-3">Material Breakdown</h4>
                    <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
                      <table className="w-full text-sm">
                        <thead className="bg-slate-50 border-b border-slate-200">
                          <tr>
                            <th className="px-4 py-2 text-left text-xs font-medium text-slate-700 uppercase">
                              Material
                            </th>
                            <th className="px-4 py-2 text-right text-xs font-medium text-slate-700 uppercase">
                              Quantity
                            </th>
                            <th className="px-4 py-2 text-right text-xs font-medium text-slate-700 uppercase">
                              Unit Price
                            </th>
                            <th className="px-4 py-2 text-right text-xs font-medium text-slate-700 uppercase">
                              Line Cost
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200">
                          {order.materials.map((material, index) => (
                            <tr key={index}>
                              <td className="px-4 py-2 text-slate-900">{material.name}</td>
                              <td className="px-4 py-2 text-right text-slate-600">
                                {material.scaledQuantity.toFixed(2)} {material.unit}
                              </td>
                              <td className="px-4 py-2 text-right text-slate-600">
                                £{material.pricePerUnit.toFixed(2)}
                              </td>
                              <td className="px-4 py-2 text-right font-medium text-slate-900">
                                £{material.lineCost.toFixed(2)}
                              </td>
                            </tr>
                          ))}
                          <tr className="bg-slate-50 font-semibold">
                            <td colSpan={3} className="px-4 py-2 text-slate-900">
                              Total
                            </td>
                            <td className="px-4 py-2 text-right text-slate-900">
                              £{order.rawMaterialCost.toFixed(2)}
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                    <p className="text-xs text-slate-500 mt-2">
                      Cost snapshot taken at time of order. Excludes production, labour, packaging,
                      and delivery costs.
                    </p>
                  </div>
                )}
              </div>
            ))
        )}
      </div>

      <div className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
        <p className="text-sm text-blue-800">
          <strong>Data Integrity:</strong> Order records contain a snapshot of raw material costs
          at the time of order creation. Historical data is preserved even if prices are updated.
        </p>
      </div>
    </div>
  );
}
