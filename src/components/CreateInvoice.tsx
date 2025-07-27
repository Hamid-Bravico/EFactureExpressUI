import React, { useState } from 'react';
import { NewInvoice, NewLine, Customer } from '../types';
import { API_ENDPOINTS, getAuthHeaders } from '../config/api';

interface CreateInvoiceProps {
  onSubmit: (invoice: NewInvoice, customerName?: string) => Promise<void>;
  disabled?: boolean;
}

const CreateInvoice: React.FC<CreateInvoiceProps> = ({ onSubmit, disabled = false }) => {
  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [date, setDate] = useState("");
  const [customerId, setCustomerId] = useState<number | null>(null);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [vatRate, setVatRate] = useState(20); // Default VAT rate of 20%
  const [lines, setLines] = useState<NewLine[]>([
    { description: '', quantity: 1, unitPrice: 0, taxRate: vatRate },
  ]);

  const updateLine = (index: number, field: keyof NewLine, value: string) => {
    setLines((prev) =>
      prev.map((ln, i) =>
        i === index
          ? { ...ln, [field]: field === "description" ? value : Number(value) }
          : ln
      )
    );
  };

  const addLine = () =>
    setLines((prev) => [
      ...prev,
      { description: '', quantity: 1, unitPrice: 0, taxRate: vatRate },
    ]);

  const removeLine = (index: number) =>
    setLines((prev) => prev.filter((_, i) => i !== index));

  const computeTotals = () => {
    const sub = lines.reduce(
      (sum, ln) => sum + ln.quantity * ln.unitPrice,
      0
    );
    const vat = +(sub * (vatRate / 100)).toFixed(2);
    return { subTotal: +sub.toFixed(2), vat, total: +(sub + vat).toFixed(2) };
  };

  // Fetch customers for dropdown
  React.useEffect(() => {
    const token = localStorage.getItem('token');
    fetch(API_ENDPOINTS.CUSTOMERS.LIST, {
      headers: getAuthHeaders(token),
    })
      .then(res => res.json())
      .then(setCustomers)
      .catch(() => setCustomers([]));
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (disabled) return;
    
    const { subTotal, vat, total } = computeTotals();
    if (!customerId) return;

    const selectedCustomer = customers.find(c => c.id === customerId);
    const newInvoice: NewInvoice = {
      invoiceNumber,
      date,
      customerId,
      subTotal,
      vat,
      total,
      status: 0, // 0 = Ready
      lines: lines.map((ln) => ({
        description: ln.description,
        quantity: ln.quantity,
        unitPrice: ln.unitPrice,
        taxRate: ln.taxRate,
      })),
    };

    await onSubmit(newInvoice, selectedCustomer?.name);
    
    // Reset form
    setInvoiceNumber("");
    setDate("");
    setCustomerId(null);
    setVatRate(20);
    setLines([{ description: '', quantity: 1, unitPrice: 0, taxRate: 20 }]);
  };

  return (
    <div className="bg-white rounded-lg shadow-sm p-6">
      <h2 className="text-xl font-bold text-gray-800 mb-4">Create New Invoice</h2>
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-4 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Invoice Number</label>
            <input
              type="text"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              value={invoiceNumber}
              onChange={(e) => setInvoiceNumber(e.target.value)}
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
            <input
              type="date"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Customer</label>
            <select
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              value={customerId ?? ''}
              onChange={e => setCustomerId(Number(e.target.value))}
              required
            >
              <option value="">Select Customer</option>
              {customers.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">VAT Rate (%)</label>
            <input
              type="number"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              value={vatRate}
              onChange={(e) => setVatRate(Number(e.target.value))}
              min="0"
              max="100"
              step="0.1"
              required
            />
          </div>
        </div>

        <div className="bg-gray-50 p-4 rounded-lg">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-medium text-gray-800">Invoice Lines</h3>
            <button
              type="button"
              onClick={addLine}
              className="text-blue-600 hover:text-blue-700 font-medium"
            >
              + Add Line
            </button>
          </div>
          {lines.map((ln, idx) => (
            <div key={idx} className="grid grid-cols-12 gap-4 mb-4 items-end">
              <div className="col-span-6">
                <label className="block text-sm text-gray-600 mb-1">Description</label>
                <input
                  type="text"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  value={ln.description}
                  onChange={(e) => updateLine(idx, "description", e.target.value)}
                  required
                />
              </div>
              <div className="col-span-2">
                <label className="block text-sm text-gray-600 mb-1">Quantity</label>
                <input
                  type="number"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  min="0.01"
                  step="0.01"
                  value={ln.quantity}
                  onChange={(e) => updateLine(idx, "quantity", e.target.value)}
                  required
                />
              </div>
              <div className="col-span-3">
                <label className="block text-sm text-gray-600 mb-1">Unit Price</label>
                <input
                  type="number"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  step="0.01"
                  value={ln.unitPrice}
                  onChange={(e) => updateLine(idx, "unitPrice", e.target.value)}
                  required
                />
              </div>
              <div className="col-span-1">
                <button
                  type="button"
                  onClick={() => removeLine(idx)}
                  className="w-full px-4 py-2 text-sm font-medium text-red-600 bg-red-50 rounded-lg hover:bg-red-100 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
                  disabled={lines.length === 1}
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
            </div>
          ))}
        </div>

        <div className="flex justify-end">
          <button
            type="submit"
            className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Create Invoice
          </button>
        </div>
      </form>
    </div>
  );
};

export default CreateInvoice; 