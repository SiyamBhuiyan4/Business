'use client';

import React, { useState, useEffect } from 'react';
import { confirmMutation } from '@/lib/confirmMutation';
import {
  ShoppingBag,
  Filter,
  Plus,
  Calendar,
  User,
  MapPin,
  Phone,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Truck,
  Eye,
  FileText,
  Search,
  Upload,
} from 'lucide-react';
import { formatCurrency, formatDate, formatDateWithTime } from '@/lib/utils';
import { format } from 'date-fns';
import BulkImportModal from '@/components/BulkImportModal';

interface PendingOrdersProps {
  businessId: string;
  permissions: Record<string, boolean>;
  onOrderChange?: () => void;
}

export default function PendingOrders({ businessId, permissions, onOrderChange }: PendingOrdersProps) {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [statusFilter, setStatusFilter] = useState<string>('PENDING');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [createdByFilter, setCreatedByFilter] = useState('ALL');

  // Modals
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showBulkModal, setShowBulkModal] = useState(false);

  // Create Form State
  const [products, setProducts] = useState<any[]>([]);
  const [customerName, setCustomerName] = useState('');
  const [customerContact, setCustomerContact] = useState('');
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [expectedDeliveryDate, setExpectedDeliveryDate] = useState(
    format(new Date(Date.now() + 86400000), 'yyyy-MM-dd')
  );
  const [orderItems, setOrderItems] = useState<Array<{ productId: string; productName?: string; priceAtOrder?: number; quantity: number }>>([
    { productId: '', productName: '', priceAtOrder: 0, quantity: 1 },
  ]);
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const query = new URLSearchParams({ status: statusFilter });
      if (createdByFilter !== 'ALL') query.set('createdBy', createdByFilter);
      const res = await fetch(`/api/businesses/${businessId}/orders?${query}`);
      const json = await res.json();
      if (res.ok) {
        setOrders(json.orders);
      }
    } catch (err) {
      console.error('Failed to load orders:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchProducts = async () => {
    try {
      const res = await fetch(`/api/businesses/${businessId}/products`);
      const json = await res.json();
      if (res.ok && json.products) {
        setProducts(json.products);
      }
    } catch (err) {
      console.error('Failed to fetch products:', err);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, [businessId, statusFilter, createdByFilter]);

  useEffect(() => {
    if (showCreateModal) {
      fetchProducts();
    }
  }, [showCreateModal, businessId]);

  const handleUpdateStatus = async (orderId: string, newStatus: string) => {
    const approval = await confirmMutation(`You are about to update order status to ${newStatus}.`); if (!approval) return;
    try {
      const res = await fetch(`/api/businesses/${businessId}/orders`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId, status: newStatus, ...approval }),
      });
      if (res.ok) {
        fetchOrders();
        if (onOrderChange) onOrderChange();
        if (selectedOrder && selectedOrder.id === orderId) {
          setSelectedOrder((prev: any) => ({ ...prev, status: newStatus }));
        }
      }
    } catch (err) {
      console.error('Failed to update order status:', err);
    }
  };

  const handleEditOrder = async (order: any) => {
    const customerName = window.prompt('Customer name', order.customerName);
    if (!customerName?.trim()) return;
    const customerContact = window.prompt('Customer contact', order.customerContact);
    const deliveryAddress = window.prompt('Delivery address', order.deliveryAddress);
    const expectedDeliveryDate = window.prompt('Delivery date and time (YYYY-MM-DDTHH:mm)', new Date(order.expectedDeliveryDate).toISOString().slice(0, 16));
    if (!customerContact || !deliveryAddress || !expectedDeliveryDate) return;
    const approval = await confirmMutation(`You are about to update order ${order.id}.`); if (!approval) return;
    const res = await fetch(`/api/businesses/${businessId}/orders`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ orderId: order.id, customerName, customerContact, deliveryAddress, expectedDeliveryDate, ...approval }) });
    if (res.ok) { fetchOrders(); if (onOrderChange) onOrderChange(); }
    else alert((await res.json()).error || 'Failed to edit order');
  };

  const handleDeleteOrder = async (order: any) => {
    const approval = await confirmMutation(`You are about to delete order for ${order.customerName}. This cannot be undone.`); if (!approval) return;
    const res = await fetch(`/api/businesses/${businessId}/orders?orderId=${encodeURIComponent(order.id)}`, { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(approval) });
    if (res.ok) { setSelectedOrder(null); fetchOrders(); if (onOrderChange) onOrderChange(); }
    else alert((await res.json()).error || 'Failed to delete order');
  };

  const handleAddItemRow = () => {
    if (products.length > 0) {
      setOrderItems([...orderItems, { productId: products[0].id, quantity: 1 }]);
    }
  };

  const handleRemoveItemRow = (index: number) => {
    if (orderItems.length > 1) {
      setOrderItems(orderItems.filter((_, i) => i !== index));
    }
  };

  const handleCreateOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerName || !customerContact || !deliveryAddress || orderItems.length === 0 || orderItems.some((item) => (!item.productId && !item.productName?.trim()) || (!item.productId && (!item.priceAtOrder || item.priceAtOrder <= 0)))) {
      alert('Please fill in all required customer and product details');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch(`/api/businesses/${businessId}/orders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerName,
          customerContact,
          deliveryAddress,
          expectedDeliveryDate,
          items: orderItems,
          notes,
        }),
      });

      if (res.ok) {
        setShowCreateModal(false);
        setCustomerName('');
        setCustomerContact('');
        setDeliveryAddress('');
        setNotes('');
        fetchOrders();
        if (onOrderChange) onOrderChange();
      } else {
        const json = await res.json();
        alert(json.error || 'Failed to create order');
      }
    } catch (err) {
      console.error('Create order error:', err);
    } finally {
      setSubmitting(false);
    }
  };

  const filteredOrders = orders.filter((ord) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      ord.customerName.toLowerCase().includes(q) ||
      ord.customerContact.includes(q) ||
      ord.deliveryAddress.toLowerCase().includes(q) ||
      ord.id.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6">
      {/* Header & Control Bar */}
      <div className="analytics-glass p-5 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <ShoppingBag className="w-5 h-5 text-emerald-400" />
            <h2 className="text-lg font-bold text-slate-100">Order Management</h2>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Orders automatically sorted by <span className="text-emerald-400 font-semibold">Expected Delivery Date (Soonest First)</span>
          </p>
        </div>

        {permissions['orders:manage'] && (
          <div className="flex flex-wrap gap-2">
          <button type="button" onClick={() => setShowBulkModal(true)} className="order-action order-action-edit"><Upload className="mr-1 h-4 w-4"/> Import CSV</button>
          <button
            onClick={() => setShowCreateModal(true)}
            className="order-primary flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-xs"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            Create New Order
          </button>
          </div>
        )}
      </div>

      {/* Filter Toolbar */}
      <div className="order-toolbar flex flex-wrap items-center justify-between gap-4 p-4 rounded-2xl">
        {/* Search */}
        <div className="relative flex-1 min-w-[220px]">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by customer, contact, or ID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="order-search w-full rounded-xl pl-9 pr-4 py-2 text-xs focus:outline-none"
          />
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Status Tabs */}
          <div className="order-tabs flex p-1 rounded-xl">
            {['PENDING', 'IN_PROGRESS', 'DELIVERED', 'CANCELLED', 'ALL'].map((st) => (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  statusFilter === st
                    ? 'order-tab-active text-white shadow-md'
                    : 'text-[#475569] hover:bg-slate-900/5'
                }`}
              >
                {st.replace('_', ' ')}
              </button>
            ))}
          </div>

          <select value={createdByFilter} onChange={(e) => setCreatedByFilter(e.target.value)} className="order-search text-[#0F172A] text-xs rounded-xl px-3 py-2">
            <option value="ALL">All creators</option>
            {Array.from(new Map(orders.filter((o) => o.createdByUser).map((o) => [o.createdByUser.id, o.createdByUser])).values()).map((creator: any) => <option key={creator.id} value={creator.id}>{creator.name}</option>)}
          </select>
        </div>
      </div>
      {showBulkModal && <BulkImportModal businessId={businessId} onClose={() => setShowBulkModal(false)} onComplete={() => { setShowBulkModal(false); fetchOrders(); onOrderChange?.(); }} />}

      {/* Orders List Table */}
      <div className="analytics-glass rounded-2xl overflow-hidden">
        {loading ? (
          <div className="py-16 text-center text-slate-500 text-sm">Loading orders...</div>
        ) : filteredOrders.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[980px] text-left text-xs">
              <thead className="order-table-head uppercase tracking-wider font-bold border-b border-slate-200">
                <tr>
                  <th className="px-5 py-3.5">Customer / Contact</th>
                  <th className="px-5 py-3.5">Expected Delivery</th>
                  <th className="px-5 py-3.5">Items Summary</th>
                  <th className="px-5 py-3.5">Total (BDT)</th>
                  <th className="px-5 py-3.5">Status</th>
                  <th className="px-5 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {filteredOrders.map((ord) => (
                  <tr
                    key={ord.id}
                    className="order-row transition-colors group cursor-pointer"
                    onClick={() => setSelectedOrder(ord)}
                  >
                    <td className="px-5 py-4">
                      <div className="font-bold text-[#0F172A] text-sm">{ord.customerName}</div>
                      <div className="text-slate-400 flex items-center gap-1.5 mt-0.5">
                        <Phone className="w-3 h-3 text-slate-500" />
                        {ord.customerContact}
                      </div>
                      <div className="text-slate-500 flex items-center gap-1.5 mt-0.5 truncate max-w-[200px]">
                        <MapPin className="w-3 h-3 text-slate-600" />
                        {ord.deliveryAddress}
                      </div>
                    </td>

                    <td className="px-5 py-4">
                      <div className="flex items-center gap-1.5 text-slate-200 font-medium">
                        <Calendar className="w-3.5 h-3.5 text-emerald-400" />
                        {formatDate(ord.expectedDeliveryDate)}
                      </div>
                      <div className="text-[10px] text-slate-500 mt-0.5">
                        Created: {formatDate(ord.createdAt)} · {new Date(ord.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} by {ord.createdByUser?.name || 'Unknown'}
                      </div>
                    </td>

                    <td className="px-5 py-4">
                      <div className="text-slate-300 font-medium max-w-[240px] truncate">
                        {ord.items
                          .map((i: any) => `${i.product.name} (x${i.quantity})`)
                          .join(', ')}
                      </div>
                      <div className="text-[10px] text-slate-500">
                        {ord.items.length} item line(s)
                      </div>
                    </td>

                    <td className="px-5 py-4">
                      <div className="font-extrabold text-sm text-[#0F172A]">
                        {formatCurrency(ord.totalAmount)}
                      </div>
                    </td>

                    <td className="px-5 py-4" onClick={(e) => e.stopPropagation()}>
                      {permissions['orders:status'] ? (
                        <select
                          value={ord.status}
                          onChange={(e) => handleUpdateStatus(ord.id, e.target.value)}
                          className={`text-xs font-bold rounded-lg px-2.5 py-1 border focus:outline-none cursor-pointer ${
                            ord.status === 'DELIVERED'
                              ? 'order-status-delivered'
                              : ord.status === 'CANCELLED'
                              ? 'order-status-cancelled'
                              : ord.status === 'IN_PROGRESS'
                              ? 'order-status-progress'
                              : 'order-status-pending'
                          }`}
                        >
                          <option value="PENDING" className="bg-slate-900 text-amber-300">PENDING</option>
                          <option value="IN_PROGRESS" className="bg-slate-900 text-sky-300">IN PROGRESS</option>
                          <option value="DELIVERED" className="bg-slate-900 text-emerald-300">DELIVERED</option>
                          <option value="CANCELLED" className="bg-slate-900 text-rose-300">CANCELLED</option>
                        </select>
                      ) : (
                        <span
                          className={`text-[11px] font-bold px-2.5 py-1 rounded-lg border ${
                            ord.status === 'DELIVERED'
                              ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                              : ord.status === 'CANCELLED'
                              ? 'bg-rose-500/20 text-rose-400 border-rose-500/30'
                              : 'bg-amber-500/20 text-amber-400 border-amber-500/30'
                          }`}
                        >
                          {ord.status}
                        </span>
                      )}
                    </td>

                    <td className="px-5 py-4 text-right" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => setSelectedOrder(ord)}
                        className="order-action order-action-view"
                        title="View details"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      {permissions['orders:manage'] && <>
                        <button onClick={() => handleEditOrder(ord)} className="order-action order-action-edit ml-1" title="Edit order">Edit</button>
                        <button onClick={() => handleDeleteOrder(ord)} className="order-action order-action-delete ml-1" title="Delete order">Delete</button>
                      </>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="py-16 text-center">
            <ShoppingBag className="w-12 h-12 text-slate-600 mx-auto mb-3" />
            <h3 className="text-slate-300 font-bold text-sm">No Pending Orders Found</h3>
            <p className="text-slate-500 text-xs mt-1">Try resetting search filters or create a new order</p>
          </div>
        )}
      </div>

      {/* View Order Detail Modal */}
      {selectedOrder && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-xl max-h-[90vh] overflow-hidden shadow-2xl animate-in zoom-in-95 duration-150 flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/60">
              <div>
                <span className="text-xs text-slate-500 uppercase tracking-wider font-mono">
                  Order #{selectedOrder.id.slice(0, 8)}
                </span>
                <h3 className="text-base font-bold text-slate-100">{selectedOrder.customerName}</h3>
              </div>
              <button
                onClick={() => setSelectedOrder(null)}
                className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 overflow-y-auto">
              <div className="grid grid-cols-2 gap-4 bg-slate-950/60 p-4 rounded-xl border border-slate-800/80">
                <div>
                  <span className="text-[10px] text-slate-500 uppercase font-semibold">Contact</span>
                  <div className="text-xs font-bold text-slate-200 mt-0.5">{selectedOrder.customerContact}</div>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 uppercase font-semibold">Expected Delivery</span>
                  <div className="text-xs font-bold text-emerald-400 mt-0.5">
                    {formatDate(selectedOrder.expectedDeliveryDate)}
                  </div>
                </div>
                <div className="col-span-2">
                  <span className="text-[10px] text-slate-500 uppercase font-semibold">Delivery Address</span>
                  <div className="text-xs text-slate-300 mt-0.5">{selectedOrder.deliveryAddress}</div>
                </div>
              </div>

              {/* Items Breakdown */}
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Ordered Items</h4>
                <div className="divide-y divide-slate-800 border border-slate-800 rounded-xl overflow-hidden">
                  {selectedOrder.items.map((item: any) => (
                    <div key={item.id} className="p-3 bg-slate-950/40 flex items-center justify-between text-xs">
                      <div>
                        <div className="font-semibold text-slate-200">{item.product.name}</div>
                        <div className="text-[10px] text-slate-500">
                          {formatCurrency(item.priceAtOrder)} × {item.quantity} units
                        </div>
                      </div>
                      <div className="font-bold text-slate-100">
                        {formatCurrency(item.priceAtOrder * item.quantity)}
                      </div>
                    </div>
                  ))}
                  <div className="p-3 bg-slate-900 flex items-center justify-between text-xs font-bold">
                    <span className="text-slate-300">Grand Total</span>
                    <span className="text-emerald-400 text-sm">{formatCurrency(selectedOrder.totalAmount)}</span>
                  </div>
                </div>
              </div>

              {selectedOrder.notes && (
                <div className="bg-amber-500/10 border border-amber-500/20 p-3 rounded-xl text-xs text-amber-300">
                  <span className="font-bold">Driver Notes:</span> {selectedOrder.notes}
                </div>
              )}
            </div>

            <div className="px-6 py-3 border-t border-slate-800 bg-slate-900/60 flex items-center justify-between">
              <span className="text-[11px] text-slate-500">
                Created by: {selectedOrder.createdByUser?.name || 'Super Admin'}
              </span>
              <button
                onClick={() => setSelectedOrder(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs"
              >
                Close
              </button>
              {permissions['orders:manage'] && <button onClick={() => handleDeleteOrder(selectedOrder)} className="px-4 py-2 rounded-xl bg-rose-500/15 text-rose-300 font-semibold text-xs">Delete</button>}
            </div>
          </div>
        </div>
      )}

      {/* Create Order Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-xl overflow-hidden shadow-2xl animate-in zoom-in-95 duration-150 max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/60">
              <h3 className="text-base font-bold text-slate-100">Create New Business Order</h3>
              <button
                onClick={() => setShowCreateModal(false)}
                className="p-1.5 rounded-lg bg-slate-800 text-slate-400 hover:text-white"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateOrder} className="p-6 space-y-4 overflow-y-auto flex-1">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Customer Name *</label>
                  <input
                    type="text"
                    required
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    placeholder="e.g. Gulshan Super Shop"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Contact Phone *</label>
                  <input
                    type="text"
                    required
                    value={customerContact}
                    onChange={(e) => setCustomerContact(e.target.value)}
                    placeholder="017xxxxxxxx"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Delivery Address *</label>
                <input
                  type="text"
                  required
                  value={deliveryAddress}
                  onChange={(e) => setDeliveryAddress(e.target.value)}
                  placeholder="Full street address..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Expected Delivery Date *</label>
                <input
                  type="date"
                  required
                  value={expectedDeliveryDate}
                  onChange={(e) => setExpectedDeliveryDate(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
                />
              </div>

              {/* Items Section */}
              <div className="space-y-2 pt-2 border-t border-slate-800">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold text-slate-300">Order Items</label>
                  <button
                    type="button"
                    onClick={handleAddItemRow}
                    className="text-xs text-emerald-400 font-bold hover:underline flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" /> Add Item Line
                  </button>
                </div>

                {orderItems.map((item, idx) => (
                  <div key={idx} className="flex items-center gap-3">
                    <input required value={item.productName || ''} onChange={(e) => { const updated = [...orderItems]; updated[idx].productId = ''; updated[idx].productName = e.target.value; setOrderItems(updated); }} placeholder="Item Name" className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200" />
                    <input required type="number" min="0.01" step="0.01" value={item.priceAtOrder || ''} onChange={(e) => { const updated = [...orderItems]; updated[idx].priceAtOrder = parseFloat(e.target.value) || 0; setOrderItems(updated); }} placeholder="Unit Price (৳)" className="w-32 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200" />

                    <input
                      type="number"
                      min="1"
                      value={item.quantity}
                      onChange={(e) => {
                        const updated = [...orderItems];
                        updated[idx].quantity = parseInt(e.target.value) || 1;
                        setOrderItems(updated);
                      }}
                      className="w-20 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 text-center focus:outline-none"
                    />

                    {orderItems.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveItemRow(idx)}
                        className="text-rose-400 hover:text-rose-300 text-xs p-1"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                ))}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Driver / Special Notes</label>
                <textarea
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Optional notes for delivery team..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="pt-4 flex items-center justify-end gap-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs shadow-lg shadow-emerald-500/20"
                >
                  {submitting ? 'Creating Order...' : 'Submit Order'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
