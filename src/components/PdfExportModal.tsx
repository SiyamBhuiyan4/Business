'use client';

import React, { useState } from 'react';
import { FileText, Download, Calendar, Filter, X, CheckCircle2 } from 'lucide-react';
import { formatCurrency, formatDate } from '@/lib/utils';
import { format, subDays, addDays } from 'date-fns';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface PdfExportModalProps {
  businessId: string;
  businessName: string;
  isOpen: boolean;
  onClose: () => void;
}

export default function PdfExportModal({
  businessId,
  businessName,
  isOpen,
  onClose,
}: PdfExportModalProps) {
  const [datePreset, setDatePreset] = useState<'today' | 'tomorrow' | '7days' | 'custom'>('today');
  const [startDate, setStartDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [orderType, setOrderType] = useState<'ALL' | 'SINGLE' | 'MIXED'>('ALL');
  const [exporting, setExporting] = useState(false);

  if (!isOpen) return null;

  const handlePresetChange = (preset: 'today' | 'tomorrow' | '7days' | 'custom') => {
    setDatePreset(preset);
    const today = new Date();
    if (preset === 'today') {
      const dStr = format(today, 'yyyy-MM-dd');
      setStartDate(dStr);
      setEndDate(dStr);
    } else if (preset === 'tomorrow') {
      const tomStr = format(addDays(today, 1), 'yyyy-MM-dd');
      setStartDate(tomStr);
      setEndDate(tomStr);
    } else if (preset === '7days') {
      setStartDate(format(today, 'yyyy-MM-dd'));
      setEndDate(format(addDays(today, 6), 'yyyy-MM-dd'));
    }
  };

  const handleGeneratePdf = async () => {
    setExporting(true);
    try {
      const res = await fetch(
        `/api/businesses/${businessId}/orders?startDate=${startDate}&endDate=${endDate}&orderType=${orderType}&status=PENDING&forExport=true`
      );
      const json = await res.json();

      if (!res.ok || !json.orders || json.orders.length === 0) {
        alert('No orders found for the selected date range and filter');
        setExporting(false);
        return;
      }

      const orders = json.orders;

      // Initialize jsPDF
      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
      });

      // Header Banner
      doc.setFillColor(15, 23, 42); // slate-900
      doc.rect(0, 0, 210, 28, 'F');

      doc.setTextColor(255, 255, 255);
      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      doc.text(`${businessName} — Delivery Sheet`, 14, 13);

      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(203, 213, 225); // slate-300
      doc.text(`Generated on: ${format(new Date(), 'dd MMM yyyy, hh:mm a')}`, 14, 20);
      doc.text(`Delivery Date Range: ${startDate} to ${endDate}`, 14, 24);

      let yPos = 34;

      orders.forEach((ord: any, index: number) => {
        // Page break if near bottom
        if (yPos > 240) {
          doc.addPage();
          yPos = 15;
        }

        // Order Block Box
        doc.setFillColor(248, 250, 252);
        doc.setDrawColor(226, 232, 240);
        doc.roundedRect(14, yPos, 182, 42, 2, 2, 'FD');

        // Order Header (Customer + Status)
        doc.setFontSize(11);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(15, 23, 42);
        doc.text(`${index + 1}. Customer: ${ord.customerName}`, 18, yPos + 7);

        doc.setFontSize(9);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(71, 85, 105);
        doc.text(`Phone: ${ord.customerContact}`, 18, yPos + 12);
        doc.text(`Address: ${ord.deliveryAddress}`, 18, yPos + 17);

        const delDate = format(new Date(ord.expectedDeliveryDate), 'dd MMM yyyy, hh:mm a');
        doc.text(`Order ID: ${ord.id.slice(0, 12)}`, 120, yPos + 7);
        doc.text(`Expected: ${delDate}`, 120, yPos + 12);

        // Item List String
        const itemsStr = ord.items
          .map((i: any) => `${i.product.name} (x${i.quantity}) @ ৳${i.priceAtOrder}`)
          .join(', ');
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(16, 185, 129); // emerald green
        doc.text(`Items: ${itemsStr}`, 18, yPos + 24);

        // Total Amount
        doc.setFontSize(10);
        doc.setTextColor(15, 23, 42);
        doc.text(`Total Amount: BDT ৳${ord.totalAmount.toLocaleString('en-US')}`, 120, yPos + 24);

        // Driver Notes
        if (ord.notes) {
          doc.setFontSize(8);
          doc.setFont('helvetica', 'italic');
          doc.setTextColor(100, 116, 139);
          doc.text(`Driver Note: ${ord.notes}`, 18, yPos + 30);
        }

        // Delivery Confirmation Signature Line Box
        doc.setDrawColor(203, 213, 225);
        doc.line(120, yPos + 37, 185, yPos + 37);
        doc.setFontSize(7);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(148, 163, 184);
        doc.text('Customer Signature / Received Line', 120, yPos + 40);

        yPos += 48;
      });

      // Download PDF
      doc.save(`${businessName.toLowerCase()}_delivery_sheet_${startDate}.pdf`);
      onClose();
    } catch (err) {
      console.error('PDF export error:', err);
      alert('Failed to generate PDF');
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl animate-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/60">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-purple-500/20 text-purple-400 flex items-center justify-center">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-100">Export Delivery Sheet PDF</h3>
              <p className="text-xs text-slate-400">Generate printable sheet for delivery personnel</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg bg-slate-800 text-slate-400 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-5">
          {/* Preset Buttons */}
          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-2">Delivery Date Window</label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => handlePresetChange('today')}
                className={`py-2 rounded-xl text-xs font-semibold border transition-all ${
                  datePreset === 'today'
                    ? 'bg-purple-500/20 text-purple-300 border-purple-500/50 shadow-md'
                    : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-slate-200'
                }`}
              >
                Today
              </button>
              <button
                type="button"
                onClick={() => handlePresetChange('tomorrow')}
                className={`py-2 rounded-xl text-xs font-semibold border transition-all ${
                  datePreset === 'tomorrow'
                    ? 'bg-purple-500/20 text-purple-300 border-purple-500/50 shadow-md'
                    : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-slate-200'
                }`}
              >
                Tomorrow
              </button>
              <button
                type="button"
                onClick={() => handlePresetChange('7days')}
                className={`py-2 rounded-xl text-xs font-semibold border transition-all ${
                  datePreset === '7days'
                    ? 'bg-purple-500/20 text-purple-300 border-purple-500/50 shadow-md'
                    : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-slate-200'
                }`}
              >
                Next 7 Days
              </button>
            </div>
          </div>

          {/* Custom Date Inputs */}
          <div className="grid grid-cols-2 gap-3 bg-slate-950 p-3 rounded-xl border border-slate-800">
            <div>
              <label className="block text-[10px] uppercase font-semibold text-slate-500 mb-1">From Date</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => {
                  setDatePreset('custom');
                  setStartDate(e.target.value);
                }}
                className="w-full bg-transparent text-xs text-slate-200 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-[10px] uppercase font-semibold text-slate-500 mb-1">To Date</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => {
                  setDatePreset('custom');
                  setEndDate(e.target.value);
                }}
                className="w-full bg-transparent text-xs text-slate-200 focus:outline-none"
              />
            </div>
          </div>

          {/* Order Type Filter */}
          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1.5">Filter Order Type</label>
            <select
              value={orderType}
              onChange={(e: any) => setOrderType(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 text-xs text-slate-200 rounded-xl px-3 py-2.5 focus:outline-none focus:border-purple-500"
            >
              <option value="ALL">All Order Types (Single & Mixed)</option>
              <option value="SINGLE">Single Product Orders Only</option>
              <option value="MIXED">Mixed Product Orders Only</option>
            </select>
          </div>
        </div>

        <div className="px-6 py-4 border-t border-slate-800 bg-slate-900/60 flex items-center justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 font-semibold text-xs"
          >
            Cancel
          </button>
          <button
            onClick={handleGeneratePdf}
            disabled={exporting}
            className="flex items-center gap-2 px-5 py-2 rounded-xl bg-purple-500 hover:bg-purple-400 text-slate-950 font-bold text-xs shadow-lg shadow-purple-500/20"
          >
            <Download className="w-4 h-4" />
            {exporting ? 'Generating PDF...' : 'Download PDF Delivery Sheet'}
          </button>
        </div>
      </div>
    </div>
  );
}
