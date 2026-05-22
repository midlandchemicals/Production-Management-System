import { useState, useEffect } from 'react';
import { Search, Filter, Download, ChevronDown, ChevronUp, Calendar, Loader2, AlertCircle, Trash2 } from 'lucide-react';
import { supabase } from '../../../utils/supabase';

interface ScaledMaterial {
  material_name: string;
  unit: string;
  scaledQuantity: number;
  pricePerUnit: number;
  lineCost: number;
}

interface Order {
  id: string;
  date_received: string;
  customer_name: string;
  product_name: string;
  container_quantity: number;
  container_size: number;
  container_unit: string;
  total_volume: number;
  raw_material_cost: number;
  materials: ScaledMaterial[];
}

export function OrderBook() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterProduct, setFilterProduct] = useState('');
  const [filterCustomer, setFilterCustomer] = useState('');
  const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState({ from: '', to: '' });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('order_book')
        .select('*')
        .order('date_received', { ascending: false });

      if (error) throw error;
      setOrders(data || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  const handleDeleteOrder = async (orderId: string) => {
    if (!window.confirm('Are you sure you want to delete this order?')) return;

    try {
      const { error } = await supabase
        .from('order_book')
        .delete()
        .eq('id', orderId);

      if (error) throw error;
      
      setOrders(orders.filter(order => order.id !== orderId));
      if (expandedOrderId === orderId) setExpandedOrderId(null);
    } catch (err: any) {
      alert(`Failed to delete order: ${err.message}`);
    }
  };

  const uniqueProducts = Array.from(new Set(orders.map((o) => o.product_name)));
  const uniqueCustomers = Array.from(new Set(orders.map((o) => o.customer_name)));

  const filteredOrders = orders.filter((order) => {
    const matchesSearch =
      searchTerm === '' ||
      order.customer_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.product_name.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesProduct = filterProduct === '' || order.product_name === filterProduct;
    const matchesCustomer = filterCustomer === '' || order.customer_name === filterCustomer;

    const orderDate = new Date(order.date_received);
    const matchesDateFrom = dateRange.from === '' || orderDate >= new Date(dateRange.from);
    const matchesDateTo = dateRange.to === '' || orderDate <= new Date(dateRange.to);

    return matchesSearch && matchesProduct && matchesCustomer && matchesDateFrom && matchesDateTo;
  });

  const totalOrdersValue = filteredOrders.reduce((sum, order) => sum + Number(order.raw_material_cost), 0);

  const handleExport = () => {
    const csvContent = [
      ['Date', 'Customer', 'Product', 'Quantity', 'Total Volume', 'Raw Material Cost'],
      ...filteredOrders.map((order) => [
        new Date(order.date_received).toLocaleDateString('en-GB'),
        order.customer_name,
        order.product_name,
        `${order.container_quantity} x ${order.container_size} ${order.container_unit}`,
        `${order.total_volume} ${order.container_unit}`,
        `£${Number(order.raw_material_cost).toFixed(2)}`,
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

  if (loading) {
    return (
      <div className="max-w-7xl flex items-center justify-center py-20">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
          <p className="text-slate-600">Loading order book...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-7xl">
        <div className="p-4 bg-red-50 rounded-xl border border-red-200 flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
          <p className="text-sm text-red-800">{error}</p>
          <button
            onClick={fetchOrders}
            className="ml-auto px-3 py-1 text-sm bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl">
      <div className="flex items-center justify-between mb-6 mt-4">
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
            <div className="relative">
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
            .sort((a, b) => new Date(b.date_received).getTime() - new Date(a.date_received).getTime())
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
                        {new Date(order.date_received).toLocaleDateString('en-GB', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-600">Customer</p>
                      <p className="font-medium text-slate-900">{order.customer_name}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-600">Product</p>
                      <p className="font-medium text-slate-900">{order.product_name}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-600">Quantity</p>
                      <p className="font-medium text-slate-900">
                        {order.container_quantity} x {order.container_size} {order.container_unit}
                      </p>
                      <p className="text-xs text-slate-600">
                        Total: {order.total_volume} {order.container_unit}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-600">Raw Material Cost</p>
                      <p className="text-lg font-bold text-green-700">
                        £{Number(order.raw_material_cost).toFixed(2)}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 ml-4">
                    <button
                      onClick={() => handleDeleteOrder(order.id)}
                      className="p-2 text-red-500 hover:bg-red-50 hover:text-red-600 rounded-lg transition-colors"
                      title="Delete Order"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() =>
                        setExpandedOrderId(expandedOrderId === order.id ? null : order.id)
                      }
                      className="p-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                    >
                      {expandedOrderId === order.id ? (
                        <ChevronUp className="w-5 h-5" />
                      ) : (
                        <ChevronDown className="w-5 h-5" />
                      )}
                    </button>
                  </div>
                </div>

                {expandedOrderId === order.id && order.materials && order.materials.length > 0 && (
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
                              <td className="px-4 py-2 text-slate-900">{material.material_name}</td>
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
                              £{Number(order.raw_material_cost).toFixed(2)}
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
