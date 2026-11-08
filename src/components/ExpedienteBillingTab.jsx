import React, { useState } from 'react';
import { 
  Coins, 
  Receipt, 
  CreditCard, 
  Plus, 
  Trash2, 
  FileCheck, 
  FileText, 
  AlertCircle, 
  CheckCircle2, 
  Clock, 
  ExternalLink,
  ChevronDown,
  Building,
  DollarSign
} from 'lucide-react';

export default function ExpedienteBillingTab({ 
  formData, 
  setFormData, 
  currentUser 
}) {
  const [showAddPayment, setShowAddPayment] = useState(false);
  const [showAddExpense, setShowAddExpense] = useState(false);

  // Estados locales para nuevos registros
  const [paymentForm, setPaymentForm] = useState({
    amount: '',
    concept: 'Entrega a cuenta / Provisión de fondos',
    paymentMethod: 'transferencia',
    date: new Date().toISOString().split('T')[0],
    receiptUrl: '',
    receiptName: ''
  });

  const [expenseForm, setExpenseForm] = useState({
    amount: '',
    provider: '',
    invoiceNumber: '',
    concept: '',
    date: new Date().toISOString().split('T')[0],
    receiptUrl: '',
    receiptName: ''
  });

  // Valores económicos calculados
  const billingType = formData.billingType || (formData.esFacturable === false ? 'included' : 'billable');
  const feeAmount = billingType === 'billable' ? (Number(formData.feeAmount) || 0) : 0;
  
  const downPayments = Array.isArray(formData.downPayments) ? formData.downPayments : [];
  const externalExpenses = Array.isArray(formData.externalExpenses) ? formData.externalExpenses : [];

  const totalDownPayments = downPayments.reduce((acc, p) => acc + (Number(p.amount) || 0), 0);
  const totalExternalExpenses = externalExpenses.reduce((acc, e) => acc + (Number(e.amount) || 0), 0);

  // Total bruto = Honorarios + Suplidos
  const totalGross = feeAmount + totalExternalExpenses;
  // Saldo pendiente = Total bruto - Entregas a cuenta recibidas
  const pendingBalance = totalGross - totalDownPayments;

  // Actualizar tipo de facturación
  const handleBillingTypeChange = (type) => {
    setFormData({
      ...formData,
      billingType: type,
      esFacturable: type === 'billable',
      feeAmount: type === 'billable' ? (formData.feeAmount || 0) : 0
    });
  };

  // Añadir pago a cuenta
  const handleAddPayment = (e) => {
    e.preventDefault();
    const amountNum = parseFloat(paymentForm.amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      alert("Introduce un importe válido para la entrega a cuenta.");
      return;
    }

    const newPayment = {
      id: 'pay_' + Date.now(),
      amount: amountNum,
      concept: paymentForm.concept.trim() || 'Entrega a cuenta',
      paymentMethod: paymentForm.paymentMethod,
      date: paymentForm.date || new Date().toISOString().split('T')[0],
      receiptUrl: paymentForm.receiptUrl.trim(),
      receiptName: paymentForm.receiptName.trim(),
      createdBy: currentUser?.email || 'gestor',
      createdAt: new Date().toISOString()
    };

    setFormData({
      ...formData,
      downPayments: [...downPayments, newPayment]
    });

    setPaymentForm({
      amount: '',
      concept: 'Entrega a cuenta / Provisión de fondos',
      paymentMethod: 'transferencia',
      date: new Date().toISOString().split('T')[0],
      receiptUrl: '',
      receiptName: ''
    });
    setShowAddPayment(false);
  };

  const handleRemovePayment = (id) => {
    if (!window.confirm("¿Eliminar este registro de pago a cuenta?")) return;
    setFormData({
      ...formData,
      downPayments: downPayments.filter(p => p.id !== id)
    });
  };

  // Añadir gasto externo / suplido
  const handleAddExpense = (e) => {
    e.preventDefault();
    const amountNum = parseFloat(expenseForm.amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      alert("Introduce un importe válido para el cargo externo / suplido.");
      return;
    }

    const newExpense = {
      id: 'exp_' + Date.now(),
      amount: amountNum,
      provider: expenseForm.provider.trim() || 'Tercero / Organismo',
      invoiceNumber: expenseForm.invoiceNumber.trim(),
      concept: expenseForm.concept.trim() || 'Gasto suplido / Tasa',
      date: expenseForm.date || new Date().toISOString().split('T')[0],
      receiptUrl: expenseForm.receiptUrl.trim(),
      receiptName: expenseForm.receiptName.trim(),
      createdBy: currentUser?.email || 'gestor',
      createdAt: new Date().toISOString()
    };

    setFormData({
      ...formData,
      externalExpenses: [...externalExpenses, newExpense]
    });

    setExpenseForm({
      amount: '',
      provider: '',
      invoiceNumber: '',
      concept: '',
      date: new Date().toISOString().split('T')[0],
      receiptUrl: '',
      receiptName: ''
    });
    setShowAddExpense(false);
  };

  const handleRemoveExpense = (id) => {
    if (!window.confirm("¿Eliminar este suplido o gasto de tercera parte?")) return;
    setFormData({
      ...formData,
      externalExpenses: externalExpenses.filter(e => e.id !== id)
    });
  };

  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50/70">
      
      {/* TARJETA 1: CONFIGURACIÓN GENERAL DE HONORARIOS & FACTURACIÓN */}
      <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-2xs space-y-3">
        <div className="flex justify-between items-center pb-2 border-b border-slate-100">
          <span className="text-xs font-bold text-slate-800 uppercase tracking-wide flex items-center gap-1.5">
            <Coins className="w-3.5 h-3.5 text-indigo-600" />
            Condición de Facturación
          </span>
          <span className="text-[11px] text-slate-500 font-medium">Honorarios Despacho</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          <button
            type="button"
            onClick={() => handleBillingTypeChange('billable')}
            className={`p-2.5 rounded-xl border text-left text-xs font-semibold transition-all ${
              billingType === 'billable'
                ? 'bg-emerald-50/80 border-emerald-300 text-emerald-800 shadow-2xs ring-1 ring-emerald-200'
                : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
          >
            <div className="flex items-center justify-between mb-1">
              <span className="font-bold">A Cobrar / Facturable</span>
              <Coins className={`w-3.5 h-3.5 ${billingType === 'billable' ? 'text-emerald-600' : 'text-slate-400'}`} />
            </div>
            <p className="text-[10px] text-slate-500 font-normal">Honorarios específicos por este trámite</p>
          </button>

          <button
            type="button"
            onClick={() => handleBillingTypeChange('included')}
            className={`p-2.5 rounded-xl border text-left text-xs font-semibold transition-all ${
              billingType === 'included'
                ? 'bg-blue-50/80 border-blue-300 text-blue-800 shadow-2xs ring-1 ring-blue-200'
                : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
          >
            <div className="flex items-center justify-between mb-1">
              <span className="font-bold">Incluido en Cuota</span>
              <Building className={`w-3.5 h-3.5 ${billingType === 'included' ? 'text-blue-600' : 'text-slate-400'}`} />
            </div>
            <p className="text-[10px] text-slate-500 font-normal">Cubierto por la iguala mensual del cliente</p>
          </button>

          <button
            type="button"
            onClick={() => handleBillingTypeChange('non_billable')}
            className={`p-2.5 rounded-xl border text-left text-xs font-semibold transition-all ${
              billingType === 'non_billable'
                ? 'bg-slate-100 border-slate-300 text-slate-800 shadow-2xs ring-1 ring-slate-300'
                : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
          >
            <div className="flex items-center justify-between mb-1">
              <span className="font-bold">No Facturable</span>
              <FileText className={`w-3.5 h-3.5 ${billingType === 'non_billable' ? 'text-slate-600' : 'text-slate-400'}`} />
            </div>
            <p className="text-[10px] text-slate-500 font-normal">Gestión interna de despacho o cortesía</p>
          </button>
        </div>

        {/* Inputs de Importe y Estado de Facturación */}
        {billingType === 'billable' && (
          <div className="pt-2 grid grid-cols-1 sm:grid-cols-3 gap-3 border-t border-slate-100 mt-2">
            <div>
              <label className="text-[10px] font-bold text-slate-600 uppercase block mb-1">Importe Honorarios (€)</label>
              <div className="relative">
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.feeAmount !== undefined ? formData.feeAmount : ''}
                  onChange={(e) => setFormData({ ...formData, feeAmount: parseFloat(e.target.value) || 0, precioHonorarios: parseFloat(e.target.value) || 0 })}
                  placeholder="0.00"
                  className="w-full pl-3 pr-7 py-1.5 border border-slate-300 rounded-lg text-xs font-bold text-slate-800 outline-none focus:ring-2 focus:ring-indigo-500/20"
                />
                <span className="absolute right-2.5 top-1.5 text-xs font-bold text-slate-400">€</span>
              </div>
            </div>

            <div>
              <label className="text-[10px] font-bold text-slate-600 uppercase block mb-1">Estado de Facturación</label>
              <select
                value={formData.billingStatus || 'pending'}
                onChange={(e) => setFormData({ ...formData, billingStatus: e.target.value })}
                className="w-full py-1.5 px-2.5 border border-slate-300 rounded-lg text-xs font-semibold bg-white text-slate-800 outline-none"
              >
                <option value="pending">⏳ Pendiente de Facturar</option>
                <option value="invoiced">📑 Facturado</option>
                <option value="paid">✅ Cobrado y Liquidado</option>
              </select>
            </div>

            <div>
              <label className="text-[10px] font-bold text-slate-600 uppercase block mb-1">Nº Factura Despacho</label>
              <input
                type="text"
                value={formData.invoiceNumber || ''}
                onChange={(e) => setFormData({ ...formData, invoiceNumber: e.target.value })}
                placeholder="Ej: F-2026/0142"
                className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs font-medium text-slate-800 outline-none focus:ring-2 focus:ring-indigo-500/20"
              />
            </div>
          </div>
        )}
      </div>

      {/* TARJETA 2: CARGOS EXTERNOS Y SUPLIDOS DE TERCERAS PARTES */}
      <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-2xs space-y-3">
        <div className="flex justify-between items-center pb-2 border-b border-slate-100">
          <div>
            <span className="text-xs font-bold text-slate-800 uppercase tracking-wide flex items-center gap-1.5">
              <Receipt className="w-3.5 h-3.5 text-amber-500" />
              Suplidos y Cargos Externos (Terceros)
            </span>
            <p className="text-[10px] text-slate-500">Notarías, Registros Mercantiles, Tasas DGT, Colegios Oficiales</p>
          </div>
          <button
            type="button"
            onClick={() => setShowAddExpense(!showAddExpense)}
            className="bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200/80 px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1 transition-all"
          >
            <Plus className="w-3 h-3 text-amber-600" />
            <span>{showAddExpense ? 'Cerrar' : '+ Añadir Suplido'}</span>
          </button>
        </div>

        {/* Formulario desplegable para añadir Suplido */}
        {showAddExpense && (
          <div className="p-3 bg-amber-50/40 rounded-xl border border-amber-200/70 space-y-2 animate-in fade-in duration-150">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <div>
                <label className="text-[10px] font-bold text-slate-600 block mb-0.5">Organismo / Proveedor *</label>
                <input
                  type="text"
                  placeholder="Ej: DGT / Notaría Martínez"
                  value={expenseForm.provider}
                  onChange={(e) => setExpenseForm({ ...expenseForm, provider: e.target.value })}
                  className="w-full p-1.5 border border-slate-300 rounded-lg text-xs bg-white text-slate-800 outline-none"
                />
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-600 block mb-0.5">Concepto / Tasa *</label>
                <input
                  type="text"
                  placeholder="Ej: Tasa 1.5 DGT Cambio Titular"
                  value={expenseForm.concept}
                  onChange={(e) => setExpenseForm({ ...expenseForm, concept: e.target.value })}
                  className="w-full p-1.5 border border-slate-300 rounded-lg text-xs bg-white text-slate-800 outline-none"
                />
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-600 block mb-0.5">Importe (€) *</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="55.70"
                  value={expenseForm.amount}
                  onChange={(e) => setExpenseForm({ ...expenseForm, amount: e.target.value })}
                  className="w-full p-1.5 border border-slate-300 rounded-lg text-xs bg-white font-bold text-slate-800 outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <div>
                <label className="text-[10px] font-bold text-slate-600 block mb-0.5">Nº Factura / Tasa</label>
                <input
                  type="text"
                  placeholder="Ej: FAC-8930 / Mod 790"
                  value={expenseForm.invoiceNumber}
                  onChange={(e) => setExpenseForm({ ...expenseForm, invoiceNumber: e.target.value })}
                  className="w-full p-1.5 border border-slate-300 rounded-lg text-xs bg-white text-slate-800 outline-none"
                />
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-600 block mb-0.5">Fecha</label>
                <input
                  type="date"
                  value={expenseForm.date}
                  onChange={(e) => setExpenseForm({ ...expenseForm, date: e.target.value })}
                  className="w-full p-1.5 border border-slate-300 rounded-lg text-xs bg-white text-slate-800 outline-none"
                />
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-600 block mb-0.5">Enlace a Justificante / PDF</label>
                <input
                  type="url"
                  placeholder="https://drive.google.com/..."
                  value={expenseForm.receiptUrl}
                  onChange={(e) => setExpenseForm({ ...expenseForm, receiptUrl: e.target.value })}
                  className="w-full p-1.5 border border-slate-300 rounded-lg text-xs bg-white text-slate-800 outline-none"
                />
              </div>
            </div>

            <div className="flex justify-end pt-1">
              <button
                type="button"
                onClick={handleAddExpense}
                disabled={!expenseForm.amount || !expenseForm.provider}
                className="bg-amber-600 hover:bg-amber-700 disabled:bg-slate-300 text-white px-3 py-1.5 rounded-lg text-xs font-bold transition-all shadow-xs"
              >
                Guardar Suplido
              </button>
            </div>
          </div>
        )}

        {/* Listado de Suplidos */}
        {externalExpenses.length === 0 ? (
          <p className="text-center text-slate-400 py-3 text-xs italic">
            No se han registrado suplidos ni gastos externos para este expediente.
          </p>
        ) : (
          <div className="space-y-1.5">
            {externalExpenses.map((expense) => (
              <div 
                key={expense.id}
                className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs hover:bg-slate-100/70 transition-colors"
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-lg bg-amber-100 text-amber-800 flex items-center justify-center font-bold text-xs shrink-0">
                    <Receipt className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <div className="font-bold text-slate-800 flex items-center gap-1.5">
                      <span>{expense.concept || 'Gasto suplido'}</span>
                      <span className="text-[10px] bg-white border border-slate-200 px-1.5 rounded text-slate-500">
                        {expense.provider}
                      </span>
                    </div>
                    <div className="text-[10px] text-slate-400 flex items-center gap-2">
                      <span>{expense.date}</span>
                      {expense.invoiceNumber && <span>Doc: {expense.invoiceNumber}</span>}
                      {expense.receiptUrl && (
                        <a 
                          href={expense.receiptUrl} 
                          target="_blank" 
                          rel="noreferrer" 
                          className="text-indigo-600 hover:underline flex items-center gap-0.5"
                        >
                          <ExternalLink className="w-2.5 h-2.5" /> Ver justificante
                        </a>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <span className="font-bold text-slate-800 text-xs">
                    +{Number(expense.amount).toFixed(2)} €
                  </span>
                  <button
                    type="button"
                    onClick={() => handleRemoveExpense(expense.id)}
                    className="text-slate-400 hover:text-rose-600 p-1 rounded transition-colors"
                    title="Eliminar suplido"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* TARJETA 3: PAGOS A CUENTA Y PROVISIONES DE FONDOS DEL CLIENTE */}
      <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-2xs space-y-3">
        <div className="flex justify-between items-center pb-2 border-b border-slate-100">
          <div>
            <span className="text-xs font-bold text-slate-800 uppercase tracking-wide flex items-center gap-1.5">
              <CreditCard className="w-3.5 h-3.5 text-emerald-600" />
              Entregas a Cuenta y Provisiones Recibidas
            </span>
            <p className="text-[10px] text-slate-500">Anticipos abonados por el cliente para honorarios o suplidos</p>
          </div>
          <button
            type="button"
            onClick={() => setShowAddPayment(!showAddPayment)}
            className="bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200/80 px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1 transition-all"
          >
            <Plus className="w-3 h-3 text-emerald-600" />
            <span>{showAddPayment ? 'Cerrar' : '+ Añadir Anticipo'}</span>
          </button>
        </div>

        {/* Formulario desplegable para añadir Entrega a Cuenta */}
        {showAddPayment && (
          <div className="p-3 bg-emerald-50/40 rounded-xl border border-emerald-200/70 space-y-2 animate-in fade-in duration-150">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <div>
                <label className="text-[10px] font-bold text-slate-600 block mb-0.5">Importe Recibido (€) *</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="200.00"
                  value={paymentForm.amount}
                  onChange={(e) => setPaymentForm({ ...paymentForm, amount: e.target.value })}
                  className="w-full p-1.5 border border-slate-300 rounded-lg text-xs bg-white font-bold text-slate-800 outline-none"
                />
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-600 block mb-0.5">Concepto *</label>
                <input
                  type="text"
                  placeholder="Ej: Provisión gastos notaría"
                  value={paymentForm.concept}
                  onChange={(e) => setPaymentForm({ ...paymentForm, concept: e.target.value })}
                  className="w-full p-1.5 border border-slate-300 rounded-lg text-xs bg-white text-slate-800 outline-none"
                />
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-600 block mb-0.5">Forma de Pago</label>
                <select
                  value={paymentForm.paymentMethod}
                  onChange={(e) => setPaymentForm({ ...paymentForm, paymentMethod: e.target.value })}
                  className="w-full p-1.5 border border-slate-300 rounded-lg text-xs bg-white text-slate-800 outline-none"
                >
                  <option value="transferencia">🏦 Transferencia Bancaria</option>
                  <option value="tarjeta">💳 Tarjeta (TPV)</option>
                  <option value="efectivo">💵 Metálico / Efectivo</option>
                  <option value="bizum">📱 Bizum</option>
                  <option value="domiciliacion">📑 Domiciliación SEPA</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <div>
                <label className="text-[10px] font-bold text-slate-600 block mb-0.5">Fecha de Ingreso</label>
                <input
                  type="date"
                  value={paymentForm.date}
                  onChange={(e) => setPaymentForm({ ...paymentForm, date: e.target.value })}
                  className="w-full p-1.5 border border-slate-300 rounded-lg text-xs bg-white text-slate-800 outline-none"
                />
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-600 block mb-0.5">Enlace Justificante Bancario</label>
                <input
                  type="url"
                  placeholder="https://drive.google.com/..."
                  value={paymentForm.receiptUrl}
                  onChange={(e) => setPaymentForm({ ...paymentForm, receiptUrl: e.target.value })}
                  className="w-full p-1.5 border border-slate-300 rounded-lg text-xs bg-white text-slate-800 outline-none"
                />
              </div>
            </div>

            <div className="flex justify-end pt-1">
              <button
                type="button"
                onClick={handleAddPayment}
                disabled={!paymentForm.amount}
                className="bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 text-white px-3 py-1.5 rounded-lg text-xs font-bold transition-all shadow-xs"
              >
                Guardar Anticipo
              </button>
            </div>
          </div>
        )}

        {/* Listado de Entregas a Cuenta */}
        {downPayments.length === 0 ? (
          <p className="text-center text-slate-400 py-3 text-xs italic">
            El cliente no ha realizado pagos a cuenta ni entregas de provisión de fondos todavía.
          </p>
        ) : (
          <div className="space-y-1.5">
            {downPayments.map((payment) => (
              <div 
                key={payment.id}
                className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs hover:bg-slate-100/70 transition-colors"
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold text-xs shrink-0">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <div className="font-bold text-slate-800 flex items-center gap-1.5">
                      <span>{payment.concept || 'Entrega a cuenta'}</span>
                      <span className="text-[10px] bg-white border border-slate-200 px-1.5 rounded text-slate-500 capitalize">
                        {payment.paymentMethod}
                      </span>
                    </div>
                    <div className="text-[10px] text-slate-400 flex items-center gap-2">
                      <span>{payment.date}</span>
                      {payment.receiptUrl && (
                        <a 
                          href={payment.receiptUrl} 
                          target="_blank" 
                          rel="noreferrer" 
                          className="text-indigo-600 hover:underline flex items-center gap-0.5"
                        >
                          <ExternalLink className="w-2.5 h-2.5" /> Ver justificante
                        </a>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <span className="font-bold text-emerald-700 text-xs">
                    -{Number(payment.amount).toFixed(2)} €
                  </span>
                  <button
                    type="button"
                    onClick={() => handleRemovePayment(payment.id)}
                    className="text-slate-400 hover:text-rose-600 p-1 rounded transition-colors"
                    title="Eliminar entrega a cuenta"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* TARJETA 4: LIQUIDACIÓN ECONÓMICA EN VIVO DEL EXPEDIENTE */}
      <div className="bg-gradient-to-br from-slate-900 to-indigo-950 text-white p-4.5 rounded-2xl shadow-premium border border-slate-800 space-y-3">
        <div className="flex justify-between items-center pb-2 border-b border-white/10">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
            <Coins className="w-4 h-4 text-amber-400" />
            Liquidación Económica del Expediente
          </span>
          <span className="text-[11px] bg-white/10 text-slate-200 px-2 py-0.5 rounded-full border border-white/10 font-semibold">
            {billingType === 'billable' ? 'Facturación Adicional' : (billingType === 'included' ? 'Cuota Mensual' : 'Gestión Interna')}
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
          <div className="bg-white/5 p-2.5 rounded-xl border border-white/10">
            <span className="text-[10px] uppercase tracking-wide text-slate-400 block font-semibold mb-0.5">Honorarios</span>
            <span className="text-sm font-bold text-white">{feeAmount.toFixed(2)} €</span>
          </div>

          <div className="bg-white/5 p-2.5 rounded-xl border border-white/10">
            <span className="text-[10px] uppercase tracking-wide text-slate-400 block font-semibold mb-0.5">(+) Suplidos</span>
            <span className="text-sm font-bold text-amber-300">+{totalExternalExpenses.toFixed(2)} €</span>
          </div>

          <div className="bg-white/5 p-2.5 rounded-xl border border-white/10">
            <span className="text-[10px] uppercase tracking-wide text-slate-400 block font-semibold mb-0.5">(-) Anticipos</span>
            <span className="text-sm font-bold text-emerald-400">-{totalDownPayments.toFixed(2)} €</span>
          </div>

          <div className={`p-2.5 rounded-xl border ${
            pendingBalance > 0
              ? 'bg-rose-500/20 border-rose-500/40 text-rose-300'
              : pendingBalance === 0
              ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300'
              : 'bg-blue-500/20 border-blue-500/40 text-blue-300'
          }`}>
            <span className="text-[10px] uppercase tracking-wide block font-bold mb-0.5">
              {pendingBalance > 0 ? 'Saldo a Cobrar' : (pendingBalance === 0 ? 'Liquidado' : 'A Devolver')}
            </span>
            <span className="text-sm font-extrabold">{Math.abs(pendingBalance).toFixed(2)} €</span>
          </div>
        </div>

        {pendingBalance > 0 && (
          <p className="text-[11px] text-amber-200/90 bg-amber-500/10 p-2 rounded-lg border border-amber-500/20 flex items-center gap-1.5">
            <AlertCircle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            <span>El cliente tiene un saldo pendiente de liquidar de <strong>{pendingBalance.toFixed(2)} €</strong> (incluye honorarios pactados y suplidos adelantados).</span>
          </p>
        )}
      </div>

    </div>
  );
}
