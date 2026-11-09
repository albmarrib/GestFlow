import React, { useState, useRef, useMemo, useEffect } from 'react';
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
  DollarSign,
  UploadCloud,
  File,
  Loader2,
  X,
  Paperclip,
  Check,
  Printer,
  Mail,
  Send,
  Download,
  Share2
} from 'lucide-react';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from '../firebase';

export default function ExpedienteBillingTab({ 
  formData, 
  setFormData, 
  currentUser,
  clientes = [],
  logAction
}) {
  const [showAddPayment, setShowAddPayment] = useState(false);
  const [showAddExpense, setShowAddExpense] = useState(false);

  // Estados para subida de archivos de suplidos
  const [isUploadingExpenseFile, setIsUploadingExpenseFile] = useState(false);
  const [isDraggingExpense, setIsDraggingExpense] = useState(false);
  const expenseFileInputRef = useRef(null);

  // Estados para subida de archivos de anticipos
  const [isUploadingPaymentFile, setIsUploadingPaymentFile] = useState(false);
  const [isDraggingPayment, setIsDraggingPayment] = useState(false);
  const paymentFileInputRef = useRef(null);

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

  // Función genérica de subida a Firebase Storage
  const uploadToStorage = async (file, folder) => {
    if (!file) return null;
    const cleanName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
    const storagePath = `${folder}/${Date.now()}_${cleanName}`;
    const storageRef = ref(storage, storagePath);
    await uploadBytes(storageRef, file);
    const downloadUrl = await getDownloadURL(storageRef);
    return { url: downloadUrl, name: file.name };
  };

  // Manejo de subida para Suplidos
  const handleExpenseFileUpload = async (file) => {
    if (!file) return;
    setIsUploadingExpenseFile(true);
    try {
      const res = await uploadToStorage(file, 'suplidos');
      if (res) {
        setExpenseForm(prev => ({
          ...prev,
          receiptUrl: res.url,
          receiptName: res.name
        }));
      }
    } catch (err) {
      console.error("Error subiendo justificante de suplido:", err);
      alert("Error al subir el archivo a Firebase Storage: " + (err.message || "Error desconocido"));
    } finally {
      setIsUploadingExpenseFile(false);
    }
  };

  // Manejo de subida para Anticipos
  const handlePaymentFileUpload = async (file) => {
    if (!file) return;
    setIsUploadingPaymentFile(true);
    try {
      const res = await uploadToStorage(file, 'anticipos');
      if (res) {
        setPaymentForm(prev => ({
          ...prev,
          receiptUrl: res.url,
          receiptName: res.name
        }));
      }
    } catch (err) {
      console.error("Error subiendo justificante de anticipo:", err);
      alert("Error al subir el archivo: " + (err.message || "Error desconocido"));
    } finally {
      setIsUploadingPaymentFile(false);
    }
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

  // Búsqueda inteligente del cliente en el censo de clientes
  const selectedClient = useMemo(() => {
    if (!clientes || clientes.length === 0) return null;
    const formNif = (formData.clientNif || '').toUpperCase().trim();
    const formClient = (formData.client || '').toLowerCase().trim();
    
    return clientes.find(c => {
      const cNif = (c.nif || '').toUpperCase().trim();
      const cRazon = (c.razonSocial || '').toLowerCase().trim();
      if (formNif && formNif === cNif) return true;
      if (cNif && formClient.includes(cNif.toLowerCase())) return true;
      if (cRazon && formClient === cRazon) return true;
      if (`${cRazon} (${cNif.toLowerCase()})` === formClient) return true;
      return false;
    }) || null;
  }, [clientes, formData.client, formData.clientNif]);

  const [recipientEmail, setRecipientEmail] = useState('');

  useEffect(() => {
    if (selectedClient?.email) {
      setRecipientEmail(selectedClient.email);
    } else if (formData.clientEmail) {
      setRecipientEmail(formData.clientEmail);
    }
  }, [selectedClient, formData.clientEmail]);

  // Generar e Imprimir / Guardar en PDF la liquidación económica
  const handleGenerateLiquidationPdf = () => {
    const clientName = selectedClient?.razonSocial || selectedClient?.nombreComercial || formData.client || 'Cliente';
    const clientNif = selectedClient?.nif || formData.clientNif || 'No especificado';
    const clientEmail = recipientEmail || selectedClient?.email || 'No indicado';
    const clientPhone = selectedClient?.telefono || '-';
    const expCode = formData.id ? `EXP-${String(formData.id).slice(-6).toUpperCase()}` : 'EXP-NUEVO';
    const today = new Date().toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' });

    const htmlContent = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <title>Liquidación Económica - ${expCode} - ${clientName}</title>
  <style>
    @page { size: A4; margin: 15mm; }
    * { box-sizing: border-box; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; }
    body { color: #1e293b; background: #ffffff; margin: 0; padding: 24px; font-size: 13px; line-height: 1.5; }
    .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #0f172a; padding-bottom: 16px; margin-bottom: 20px; }
    .brand-title { font-size: 22px; font-weight: 800; color: #0f172a; margin: 0 0 4px 0; }
    .brand-sub { font-size: 11px; color: #64748b; font-weight: 600; text-transform: uppercase; letter-spacing: 0.8px; }
    .doc-badge { background: #f8fafc; border: 1px solid #cbd5e1; padding: 8px 14px; border-radius: 8px; text-align: right; }
    .doc-badge h2 { margin: 0; font-size: 14px; font-weight: 700; color: #0f172a; }
    .doc-badge p { margin: 2px 0 0 0; font-size: 11px; color: #64748b; }
    .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 20px; }
    .info-box { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px 14px; }
    .info-title { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; color: #475569; margin-bottom: 6px; border-bottom: 1px solid #e2e8f0; padding-bottom: 4px; }
    .info-box p { margin: 2px 0; font-size: 12px; }
    table { width: 100%; border-collapse: collapse; font-size: 12px; margin-bottom: 20px; }
    th { background: #0f172a; color: #ffffff; font-weight: 600; text-align: left; padding: 8px 10px; font-size: 11px; text-transform: uppercase; }
    th.text-right, td.text-right { text-align: right; }
    td { padding: 8px 10px; border-bottom: 1px solid #e2e8f0; }
    tr:nth-child(even) td { background-color: #f8fafc; }
    .summary-card { background: #0f172a; color: #ffffff; border-radius: 8px; padding: 14px 18px; display: flex; justify-content: space-between; align-items: center; margin-top: 16px; }
    .summary-label { font-size: 12px; font-weight: 600; text-transform: uppercase; color: #94a3b8; }
    .summary-amount { font-size: 22px; font-weight: 800; color: #38bdf8; }
    .bank-notice { margin-top: 20px; background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 8px; padding: 12px 16px; font-size: 11px; color: #1e40af; }
    .footer { margin-top: 30px; text-align: center; font-size: 10px; color: #94a3b8; border-top: 1px solid #e2e8f0; padding-top: 10px; }
    .no-print { position: fixed; top: 16px; right: 16px; z-index: 9999; }
    .btn { background: #2563eb; color: white; border: none; padding: 10px 16px; border-radius: 6px; font-weight: 600; font-size: 13px; cursor: pointer; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1); }
    .btn:hover { background: #1d4ed8; }
    @media print { .no-print { display: none !important; } body { padding: 0; } }
  </style>
</head>
<body>
  <div class="no-print">
    <button class="btn" onclick="window.print()">🖨️ Imprimir / Guardar como PDF</button>
  </div>

  <div class="header">
    <div>
      <div class="brand-title">GESTORÍA ADMINISTRATIVA</div>
      <div class="brand-sub">Servicios Profesionales de Asesoría y Tramitación</div>
    </div>
    <div class="doc-badge">
      <h2>LIQUIDACIÓN ECONÓMICA</h2>
      <p><strong>Ref:</strong> ${expCode} | <strong>Fecha:</strong> ${today}</p>
    </div>
  </div>

  <div class="info-grid">
    <div class="info-box">
      <div class="info-title">Datos del Cliente</div>
      <p><strong>Razón Social:</strong> ${clientName}</p>
      <p><strong>NIF / CIF:</strong> ${clientNif}</p>
      <p><strong>Email:</strong> ${clientEmail}</p>
      <p><strong>Teléfono:</strong> ${clientPhone}</p>
    </div>
    <div class="info-box">
      <div class="info-title">Expediente de Referencia</div>
      <p><strong>Título:</strong> ${formData.title || 'Expediente de Gestión'}</p>
      <p><strong>Área:</strong> ${formData.department || formData.area || 'General'}</p>
      <p><strong>Trámite:</strong> ${formData.type || formData.tramo || '-'}</p>
      <p><strong>Estado Facturación:</strong> ${formData.billingStatus === 'paid' ? 'Cobrado' : (formData.billingStatus === 'invoiced' ? 'Facturado' : 'Liquidación Pendiente')}</p>
    </div>
  </div>

  <table>
    <thead>
      <tr>
        <th>Concepto</th>
        <th>Detalle / Factura Origen</th>
        <th>Fecha</th>
        <th class="text-right">Importe (€)</th>
      </tr>
    </thead>
    <tbody>
      ${feeAmount > 0 ? `
        <tr>
          <td><strong>Honorarios de Gestión Profesional</strong></td>
          <td>${formData.invoiceNumber ? 'Factura Nº: ' + formData.invoiceNumber : 'Servicios de tramitación'}</td>
          <td>${today}</td>
          <td class="text-right"><strong>${feeAmount.toFixed(2)} €</strong></td>
        </tr>
      ` : ''}
      ${externalExpenses.map(e => `
        <tr>
          <td>${e.concept || 'Gasto suplido'} (${e.provider || 'Tercero'})</td>
          <td>${e.invoiceNumber ? 'Factura/Tasa: ' + e.invoiceNumber : 'Justificante aportado'}</td>
          <td>${e.date || '-'}</td>
          <td class="text-right">+${Number(e.amount).toFixed(2)} €</td>
        </tr>
      `).join('')}
      ${feeAmount === 0 && externalExpenses.length === 0 ? `
        <tr><td colspan="4" style="text-align:center; color:#94a3b8; padding:14px;">Sin honorarios ni suplidos devengados.</td></tr>
      ` : ''}
      <tr style="background-color: #f1f5f9; font-weight: 700;">
        <td colspan="3">SUBTOTAL BRUTO (Honorarios + Suplidos)</td>
        <td class="text-right">${totalGross.toFixed(2)} €</td>
      </tr>
    </tbody>
  </table>

  ${downPayments.length > 0 ? `
    <table>
      <thead>
        <tr>
          <th>Entrega a Cuenta / Anticipo</th>
          <th>Método de Pago</th>
          <th>Fecha</th>
          <th class="text-right">Importe Recibido (€)</th>
        </tr>
      </thead>
      <tbody>
        ${downPayments.map(p => `
          <tr>
            <td>${p.concept || 'Provisión recibida'}</td>
            <td style="text-transform: capitalize;">${p.paymentMethod || 'Transferencia'}</td>
            <td>${p.date || '-'}</td>
            <td class="text-right" style="color: #15803d; font-weight: 600;">-${Number(p.amount).toFixed(2)} €</td>
          </tr>
        `).join('')}
        <tr style="background-color: #f0fdf4; font-weight: 700;">
          <td colspan="3" style="color: #166534;">TOTAL ANTICIPOS DEDUCIDOS</td>
          <td class="text-right" style="color: #166534;">-${totalDownPayments.toFixed(2)} €</td>
        </tr>
      </tbody>
    </table>
  ` : ''}

  <div class="summary-card">
    <div>
      <div class="summary-label">
        ${pendingBalance > 0 ? 'Saldo Neto Pendiente de Cobro' : pendingBalance === 0 ? 'Liquidación Saldada' : 'Saldo a Favor del Cliente (Devolución)'}
      </div>
      <div style="font-size: 11px; color: #cbd5e1; margin-top: 2px;">
        ${pendingBalance > 0 ? 'Total a transferir por el cliente' : pendingBalance === 0 ? 'No existe saldo pendiente' : 'Importe sobrante a reintegrar'}
      </div>
    </div>
    <div class="summary-amount" style="color: ${pendingBalance > 0 ? '#38bdf8' : (pendingBalance === 0 ? '#4ade80' : '#fbbf24')};">
      ${Math.abs(pendingBalance).toFixed(2)} €
    </div>
  </div>

  ${pendingBalance > 0 ? `
    <div class="bank-notice">
      <p style="margin: 0 0 4px 0;"><strong>Instrucciones para el Abono / Transferencia:</strong></p>
      <p style="margin: 0 0 2px 0;">Rogamos realicen el ingreso del importe en la siguiente cuenta:</p>
      <p style="margin: 4px 0; font-family: monospace; font-size: 13px; font-weight: 700; color: #0f172a;">
        IBAN: ES91 2100 0418 4502 0005 1332 (CaixaBank)
      </p>
      <p style="margin: 0; font-size: 10px; color: #475569;">
        Concepto bancario obligatorio: <strong>${expCode} - ${clientName}</strong>
      </p>
    </div>
  ` : ''}

  <div class="footer">
    Documento informativo de liquidación económica emitido el ${today}. Para consultas o aclaraciones contacte con su asesor.
  </div>
</body>
</html>`;

    const printWin = window.open('', '_blank');
    if (printWin) {
      printWin.document.open();
      printWin.document.write(htmlContent);
      printWin.document.close();
    } else {
      alert("Por favor habilita las ventanas emergentes del navegador para ver la liquidación.");
    }
  };

  // Enviar liquidación por correo electrónico directamente al cliente
  const handleSendBillingEmail = () => {
    const emailToUse = (recipientEmail || selectedClient?.email || '').trim();
    if (!emailToUse) {
      alert("Por favor introduce el email del cliente para poder remitir la liquidación.");
      return;
    }

    const clientName = selectedClient?.razonSocial || selectedClient?.nombreComercial || formData.client || 'Cliente';
    const expCode = formData.id ? `EXP-${String(formData.id).slice(-6).toUpperCase()}` : 'EXP';
    const subject = `Liquidación Económica - ${formData.title || 'Expediente'} (${expCode})`;

    let bodyText = `Estimado/a ${clientName},\n\n`;
    bodyText += `Le remitimos el desglose de liquidación económica correspondiente al trámite "${formData.title || 'de gestión'}".\n\n`;
    bodyText += `DETALLE DE LA LIQUIDACIÓN:\n`;
    bodyText += `--------------------------------------------------\n`;
    if (feeAmount > 0) {
      bodyText += `• Honorarios profesionales de gestión: ${feeAmount.toFixed(2)} €\n`;
    }
    if (externalExpenses.length > 0) {
      bodyText += `• Suplidos y gastos de terceros: ${totalExternalExpenses.toFixed(2)} €\n`;
      externalExpenses.forEach(e => {
        bodyText += `   - ${e.concept || 'Suplido'} (${e.provider || 'Organismo'}${e.invoiceNumber ? ' - Fact/Tasa: ' + e.invoiceNumber : ''}): ${Number(e.amount).toFixed(2)} €\n`;
      });
    }
    bodyText += `• Total Bruto de la operación: ${totalGross.toFixed(2)} €\n`;
    if (downPayments.length > 0) {
      bodyText += `• Anticipos / Entregas a cuenta recibidas: -${totalDownPayments.toFixed(2)} €\n`;
    }
    bodyText += `--------------------------------------------------\n`;
    if (pendingBalance > 0) {
      bodyText += `SALDO NETO A ABONAR: ${pendingBalance.toFixed(2)} €\n`;
      bodyText += `--------------------------------------------------\n\n`;
      bodyText += `Pueden realizar la transferencia bancaria con los siguientes datos:\n`;
      bodyText += `IBAN: ES91 2100 0418 4502 0005 1332 (CaixaBank)\n`;
      bodyText += `Concepto: ${expCode} - ${clientName}\n\n`;
      bodyText += `Adjuntamos a este envío el documento de liquidación detallado en PDF emitido por la gestoría.\n\n`;
    } else if (pendingBalance === 0) {
      bodyText += `SALDO PENDIENTE: 0.00 € (Totalmente liquidado y pagado)\n`;
      bodyText += `--------------------------------------------------\n\n`;
    } else {
      bodyText += `SALDO A FAVOR DEL CLIENTE: ${Math.abs(pendingBalance).toFixed(2)} €\n`;
      bodyText += `--------------------------------------------------\n\n`;
      bodyText += `Procederemos al reembolso de la provisión sobrante conforme a lo pactado.\n\n`;
    }
    bodyText += `Quedamos a su entera disposición para cualquier aclaración o duda.\n\n`;
    bodyText += `Atentamente,\nEl equipo de su Gestoría Administrativa`;

    const mailtoUrl = `mailto:${encodeURIComponent(emailToUse)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(bodyText)}`;
    window.location.href = mailtoUrl;

    if (logAction) {
      logAction('email_sent', `Liquidación enviada por email a ${emailToUse} (Saldo: ${pendingBalance.toFixed(2)} €)`);
    }
  };

  return (
    <div className="flex-1 overflow-y-auto p-3.5 space-y-3 bg-slate-50/70 text-slate-800">
      
      {/* TARJETA 1: CONFIGURACIÓN GENERAL DE HONORARIOS & FACTURACIÓN (COMPACTA) */}
      <div className="bg-white p-3 rounded-xl border border-slate-200/80 shadow-2xs space-y-2.5">
        <div className="flex justify-between items-center pb-1.5 border-b border-slate-100">
          <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wide flex items-center gap-1.5">
            <Coins className="w-3.5 h-3.5 text-indigo-600" />
            Condición de Facturación & Honorarios
          </span>
          <span className="text-[11px] font-semibold text-slate-500">
            {billingType === 'billable' ? `${feeAmount.toFixed(2)} € Honorarios` : (billingType === 'included' ? 'En Cuota Mensual' : 'Sin Cargo')}
          </span>
        </div>

        {/* Botonera de tipo de facturación compacta */}
        <div className="grid grid-cols-3 gap-2">
          <button
            type="button"
            onClick={() => handleBillingTypeChange('billable')}
            className={`py-1.5 px-2.5 rounded-lg border text-left text-xs transition-all flex items-center justify-between ${
              billingType === 'billable'
                ? 'bg-emerald-50 border-emerald-300 text-emerald-800 font-bold shadow-2xs ring-1 ring-emerald-200'
                : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50 font-medium'
            }`}
          >
            <span className="truncate">A Cobrar / Facturable</span>
            <Coins className={`w-3.5 h-3.5 shrink-0 ${billingType === 'billable' ? 'text-emerald-600' : 'text-slate-400'}`} />
          </button>

          <button
            type="button"
            onClick={() => handleBillingTypeChange('included')}
            className={`py-1.5 px-2.5 rounded-lg border text-left text-xs transition-all flex items-center justify-between ${
              billingType === 'included'
                ? 'bg-blue-50 border-blue-300 text-blue-800 font-bold shadow-2xs ring-1 ring-blue-200'
                : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50 font-medium'
            }`}
          >
            <span className="truncate">Incluido en Cuota</span>
            <Building className={`w-3.5 h-3.5 shrink-0 ${billingType === 'included' ? 'text-blue-600' : 'text-slate-400'}`} />
          </button>

          <button
            type="button"
            onClick={() => handleBillingTypeChange('non_billable')}
            className={`py-1.5 px-2.5 rounded-lg border text-left text-xs transition-all flex items-center justify-between ${
              billingType === 'non_billable'
                ? 'bg-slate-100 border-slate-300 text-slate-800 font-bold shadow-2xs ring-1 ring-slate-300'
                : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50 font-medium'
            }`}
          >
            <span className="truncate">No Facturable</span>
            <FileText className={`w-3.5 h-3.5 shrink-0 ${billingType === 'non_billable' ? 'text-slate-600' : 'text-slate-400'}`} />
          </button>
        </div>

        {/* Inputs de Importe y Estado de Facturación (Compactos en una sola fila) */}
        {billingType === 'billable' && (
          <div className="pt-1.5 grid grid-cols-1 sm:grid-cols-3 gap-2 border-t border-slate-100">
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
                  className="w-full pl-2.5 pr-6 py-1.5 border border-slate-300 rounded-lg text-xs font-bold text-slate-800 outline-none focus:ring-1 focus:ring-indigo-500"
                />
                <span className="absolute right-2 top-1.5 text-xs font-bold text-slate-400">€</span>
              </div>
            </div>

            <div>
              <label className="text-[10px] font-bold text-slate-600 uppercase block mb-1">Estado de Facturación</label>
              <select
                value={formData.billingStatus || 'pending'}
                onChange={(e) => setFormData({ ...formData, billingStatus: e.target.value })}
                className="w-full py-1.5 px-2 border border-slate-300 rounded-lg text-xs font-semibold bg-white text-slate-800 outline-none focus:ring-1 focus:ring-indigo-500"
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
                className="w-full px-2 py-1.5 border border-slate-300 rounded-lg text-xs font-medium text-slate-800 outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>
          </div>
        )}
      </div>

      {/* TARJETA 2: CARGOS EXTERNOS Y SUPLIDOS (CON SUBIDA DIRECTA ARRASTRAR / ORDENADOR) */}
      <div className="bg-white p-3 rounded-xl border border-slate-200/80 shadow-2xs space-y-2.5">
        <div className="flex justify-between items-center pb-1.5 border-b border-slate-100">
          <div>
            <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wide flex items-center gap-1.5">
              <Receipt className="w-3.5 h-3.5 text-amber-500" />
              Suplidos y Cargos Externos (Terceros)
            </span>
            <p className="text-[10px] text-slate-400">Notarías, Registros Mercantiles, Tasas DGT, Colegios Oficiales</p>
          </div>
          <button
            type="button"
            onClick={() => setShowAddExpense(!showAddExpense)}
            className="bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200/80 px-2 py-1 rounded-lg text-[11px] font-bold flex items-center gap-1 transition-all"
          >
            <Plus className="w-3 h-3 text-amber-600" />
            <span>{showAddExpense ? 'Cerrar' : '+ Añadir Suplido'}</span>
          </button>
        </div>

        {/* Formulario desplegable para añadir Suplido */}
        {showAddExpense && (
          <div className="p-3 bg-amber-50/40 rounded-xl border border-amber-200/70 space-y-2.5 animate-in fade-in duration-150">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <div>
                <label className="text-[10px] font-bold text-slate-600 block mb-0.5">Organismo / Proveedor *</label>
                <input
                  type="text"
                  placeholder="Ej: DGT / Notaría"
                  value={expenseForm.provider}
                  onChange={(e) => setExpenseForm({ ...expenseForm, provider: e.target.value })}
                  className="w-full px-2 py-1.5 border border-slate-300 rounded-lg text-xs bg-white text-slate-800 outline-none focus:ring-1 focus:ring-amber-500"
                />
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-600 block mb-0.5">Concepto / Tasa *</label>
                <input
                  type="text"
                  placeholder="Ej: Tasa 1.5 DGT"
                  value={expenseForm.concept}
                  onChange={(e) => setExpenseForm({ ...expenseForm, concept: e.target.value })}
                  className="w-full px-2 py-1.5 border border-slate-300 rounded-lg text-xs bg-white text-slate-800 outline-none focus:ring-1 focus:ring-amber-500"
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
                  className="w-full px-2 py-1.5 border border-slate-300 rounded-lg text-xs bg-white font-bold text-slate-800 outline-none focus:ring-1 focus:ring-amber-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <div>
                <label className="text-[10px] font-bold text-slate-600 block mb-0.5">Nº Factura / Justificante</label>
                <input
                  type="text"
                  placeholder="Ej: FAC-8930 / Mod 790"
                  value={expenseForm.invoiceNumber}
                  onChange={(e) => setExpenseForm({ ...expenseForm, invoiceNumber: e.target.value })}
                  className="w-full px-2 py-1.5 border border-slate-300 rounded-lg text-xs bg-white text-slate-800 outline-none"
                />
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-600 block mb-0.5">Fecha del Gasto</label>
                <input
                  type="date"
                  value={expenseForm.date}
                  onChange={(e) => setExpenseForm({ ...expenseForm, date: e.target.value })}
                  className="w-full px-2 py-1.5 border border-slate-300 rounded-lg text-xs bg-white text-slate-800 outline-none"
                />
              </div>
            </div>

            {/* ZONA DE CARGA DE ARCHIVO: ARRASTRAR O EXAMINAR (DRAG & DROP) */}
            <div>
              <label className="text-[10px] font-bold text-slate-600 block mb-1">
                Adjuntar Justificante / Factura (Arrastra aquí o examina desde tu equipo)
              </label>

              <input 
                type="file"
                ref={expenseFileInputRef}
                className="hidden"
                accept=".pdf,.jpg,.jpeg,.png,.webp,.doc,.docx"
                onChange={(e) => {
                  if (e.target.files && e.target.files[0]) {
                    handleExpenseFileUpload(e.target.files[0]);
                  }
                }}
              />

              {expenseForm.receiptUrl ? (
                <div className="flex items-center justify-between p-2 rounded-lg bg-emerald-50 border border-emerald-200 text-xs">
                  <div className="flex items-center gap-2 truncate">
                    <FileCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span className="font-semibold text-emerald-800 truncate">
                      {expenseForm.receiptName || 'Archivo subido correctamente'}
                    </span>
                    <a
                      href={expenseForm.receiptUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="text-emerald-700 hover:text-emerald-900 underline text-[10px] shrink-0 font-medium"
                    >
                      Ver archivo
                    </a>
                  </div>
                  <button
                    type="button"
                    onClick={() => setExpenseForm(prev => ({ ...prev, receiptUrl: '', receiptName: '' }))}
                    className="text-slate-400 hover:text-rose-600 p-1 rounded"
                    title="Quitar archivo"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ) : (
                <div
                  onDragOver={(e) => { e.preventDefault(); setIsDraggingExpense(true); }}
                  onDragLeave={() => setIsDraggingExpense(false)}
                  onDrop={(e) => {
                    e.preventDefault();
                    setIsDraggingExpense(false);
                    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                      handleExpenseFileUpload(e.dataTransfer.files[0]);
                    }
                  }}
                  onClick={() => expenseFileInputRef.current?.click()}
                  className={`border-2 border-dashed rounded-lg p-3 text-center cursor-pointer transition-all ${
                    isDraggingExpense 
                      ? 'border-amber-500 bg-amber-100/60' 
                      : 'border-slate-300 hover:border-amber-400 bg-white hover:bg-amber-50/30'
                  }`}
                >
                  {isUploadingExpenseFile ? (
                    <div className="flex items-center justify-center gap-2 text-xs font-semibold text-amber-700 py-1">
                      <Loader2 className="w-4 h-4 animate-spin text-amber-600" />
                      <span>Subiendo archivo a la nube...</span>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center gap-1">
                      <UploadCloud className="w-5 h-5 text-amber-500" />
                      <p className="text-xs font-semibold text-slate-700">
                        Arrastra y suelta el justificante aquí, o <span className="text-amber-700 underline">haz clic para examinar</span>
                      </p>
                      <p className="text-[10px] text-slate-400">PDF, JPG, PNG, Word (se guardará seguro en la nube)</p>
                    </div>
                  )}
                </div>
              )}

              {/* Opción alternativa opcional: Enlace URL */}
              <div className="mt-1.5 flex items-center gap-1.5">
                <span className="text-[10px] text-slate-400 shrink-0">O pegar enlace web:</span>
                <input
                  type="url"
                  placeholder="https://drive.google.com/..."
                  value={expenseForm.receiptUrl}
                  onChange={(e) => setExpenseForm({ ...expenseForm, receiptUrl: e.target.value, receiptName: 'Enlace externo' })}
                  className="flex-1 px-2 py-0.5 border border-slate-200 rounded text-[11px] bg-white text-slate-700 outline-none"
                />
              </div>
            </div>

            <div className="flex justify-end pt-1">
              <button
                type="button"
                onClick={handleAddExpense}
                disabled={!expenseForm.amount || !expenseForm.provider || isUploadingExpenseFile}
                className="bg-amber-600 hover:bg-amber-700 disabled:bg-slate-300 text-white px-3 py-1.5 rounded-lg text-xs font-bold transition-all shadow-xs"
              >
                Guardar Suplido
              </button>
            </div>
          </div>
        )}

        {/* Listado de Suplidos */}
        {externalExpenses.length === 0 ? (
          <p className="text-center text-slate-400 py-2.5 text-xs italic">
            No se han registrado suplidos ni gastos externos para este expediente.
          </p>
        ) : (
          <div className="space-y-1">
            {externalExpenses.map((expense) => (
              <div 
                key={expense.id}
                className="flex items-center justify-between p-2 rounded-lg bg-slate-50 border border-slate-200 text-xs hover:bg-slate-100/70 transition-colors"
              >
                <div className="flex items-center gap-2 truncate">
                  <div className="w-6 h-6 rounded-md bg-amber-100 text-amber-800 flex items-center justify-center font-bold text-xs shrink-0">
                    <Receipt className="w-3.5 h-3.5" />
                  </div>
                  <div className="truncate">
                    <div className="font-bold text-slate-800 flex items-center gap-1.5 truncate">
                      <span className="truncate">{expense.concept || 'Gasto suplido'}</span>
                      <span className="text-[10px] bg-white border border-slate-200 px-1 rounded text-slate-500 shrink-0">
                        {expense.provider}
                      </span>
                    </div>
                    <div className="text-[10px] text-slate-400 flex items-center gap-2 truncate">
                      <span>{expense.date}</span>
                      {expense.invoiceNumber && <span>Doc: {expense.invoiceNumber}</span>}
                      {expense.receiptUrl && (
                        <a 
                          href={expense.receiptUrl} 
                          target="_blank" 
                          rel="noreferrer" 
                          className="text-indigo-600 hover:underline flex items-center gap-0.5 shrink-0 font-medium"
                        >
                          <Paperclip className="w-2.5 h-2.5" />
                          <span>{expense.receiptName || 'Ver justificante'}</span>
                        </a>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2.5 shrink-0 pl-2">
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

      {/* TARJETA 3: PAGOS A CUENTA Y PROVISIONES DE FONDOS DEL CLIENTE (CON SUBIDA DIRECTA ARRASTRAR / ORDENADOR) */}
      <div className="bg-white p-3 rounded-xl border border-slate-200/80 shadow-2xs space-y-2.5">
        <div className="flex justify-between items-center pb-1.5 border-b border-slate-100">
          <div>
            <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wide flex items-center gap-1.5">
              <CreditCard className="w-3.5 h-3.5 text-emerald-600" />
              Entregas a Cuenta y Provisiones Recibidas
            </span>
            <p className="text-[10px] text-slate-400">Anticipos abonados por el cliente para honorarios o suplidos</p>
          </div>
          <button
            type="button"
            onClick={() => setShowAddPayment(!showAddPayment)}
            className="bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200/80 px-2 py-1 rounded-lg text-[11px] font-bold flex items-center gap-1 transition-all"
          >
            <Plus className="w-3 h-3 text-emerald-600" />
            <span>{showAddPayment ? 'Cerrar' : '+ Añadir Anticipo'}</span>
          </button>
        </div>

        {/* Formulario desplegable para añadir Entrega a Cuenta */}
        {showAddPayment && (
          <div className="p-3 bg-emerald-50/40 rounded-xl border border-emerald-200/70 space-y-2.5 animate-in fade-in duration-150">
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
                  className="w-full px-2 py-1.5 border border-slate-300 rounded-lg text-xs bg-white font-bold text-slate-800 outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-600 block mb-0.5">Concepto *</label>
                <input
                  type="text"
                  placeholder="Ej: Provisión notaría"
                  value={paymentForm.concept}
                  onChange={(e) => setPaymentForm({ ...paymentForm, concept: e.target.value })}
                  className="w-full px-2 py-1.5 border border-slate-300 rounded-lg text-xs bg-white text-slate-800 outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-600 block mb-0.5">Forma de Pago</label>
                <select
                  value={paymentForm.paymentMethod}
                  onChange={(e) => setPaymentForm({ ...paymentForm, paymentMethod: e.target.value })}
                  className="w-full px-2 py-1.5 border border-slate-300 rounded-lg text-xs bg-white text-slate-800 outline-none focus:ring-1 focus:ring-emerald-500"
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
                  className="w-full px-2 py-1.5 border border-slate-300 rounded-lg text-xs bg-white text-slate-800 outline-none"
                />
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-600 block mb-0.5">Enlace Externo (Opcional)</label>
                <input
                  type="url"
                  placeholder="https://drive.google.com/..."
                  value={paymentForm.receiptUrl}
                  onChange={(e) => setPaymentForm({ ...paymentForm, receiptUrl: e.target.value, receiptName: 'Enlace externo' })}
                  className="w-full px-2 py-1.5 border border-slate-300 rounded-lg text-xs bg-white text-slate-800 outline-none"
                />
              </div>
            </div>

            {/* Zona Drop/Upload para Justificante Bancario */}
            <div>
              <label className="text-[10px] font-bold text-slate-600 block mb-1">
                Subir Resguardo Bancario (Arrastrar o examinar desde el equipo)
              </label>

              <input 
                type="file"
                ref={paymentFileInputRef}
                className="hidden"
                accept=".pdf,.jpg,.jpeg,.png,.webp"
                onChange={(e) => {
                  if (e.target.files && e.target.files[0]) {
                    handlePaymentFileUpload(e.target.files[0]);
                  }
                }}
              />

              {paymentForm.receiptUrl && !paymentForm.receiptUrl.startsWith('http') ? null : paymentForm.receiptUrl ? (
                <div className="flex items-center justify-between p-2 rounded-lg bg-emerald-50 border border-emerald-200 text-xs">
                  <div className="flex items-center gap-2 truncate">
                    <FileCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span className="font-semibold text-emerald-800 truncate">
                      {paymentForm.receiptName || 'Resguardo bancario cargado'}
                    </span>
                    <a
                      href={paymentForm.receiptUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="text-emerald-700 hover:text-emerald-900 underline text-[10px] shrink-0 font-medium"
                    >
                      Ver justificante
                    </a>
                  </div>
                  <button
                    type="button"
                    onClick={() => setPaymentForm(prev => ({ ...prev, receiptUrl: '', receiptName: '' }))}
                    className="text-slate-400 hover:text-rose-600 p-1 rounded"
                    title="Quitar archivo"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ) : (
                <div
                  onDragOver={(e) => { e.preventDefault(); setIsDraggingPayment(true); }}
                  onDragLeave={() => setIsDraggingPayment(false)}
                  onDrop={(e) => {
                    e.preventDefault();
                    setIsDraggingPayment(false);
                    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                      handlePaymentFileUpload(e.dataTransfer.files[0]);
                    }
                  }}
                  onClick={() => paymentFileInputRef.current?.click()}
                  className={`border-2 border-dashed rounded-lg p-2.5 text-center cursor-pointer transition-all ${
                    isDraggingPayment 
                      ? 'border-emerald-500 bg-emerald-100/60' 
                      : 'border-slate-300 hover:border-emerald-400 bg-white hover:bg-emerald-50/30'
                  }`}
                >
                  {isUploadingPaymentFile ? (
                    <div className="flex items-center justify-center gap-2 text-xs font-semibold text-emerald-700 py-1">
                      <Loader2 className="w-4 h-4 animate-spin text-emerald-600" />
                      <span>Subiendo resguardo bancario...</span>
                    </div>
                  ) : (
                    <div className="flex items-center justify-center gap-2 text-xs text-slate-600">
                      <UploadCloud className="w-4 h-4 text-emerald-600" />
                      <span className="font-medium">Arrastra resguardo bancario aquí o <span className="text-emerald-700 underline font-semibold">examinar</span></span>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="flex justify-end pt-1">
              <button
                type="button"
                onClick={handleAddPayment}
                disabled={!paymentForm.amount || isUploadingPaymentFile}
                className="bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 text-white px-3 py-1.5 rounded-lg text-xs font-bold transition-all shadow-xs"
              >
                Guardar Anticipo
              </button>
            </div>
          </div>
        )}

        {/* Listado de Entregas a Cuenta */}
        {downPayments.length === 0 ? (
          <p className="text-center text-slate-400 py-2.5 text-xs italic">
            El cliente no ha realizado pagos a cuenta ni entregas de provisión todavía.
          </p>
        ) : (
          <div className="space-y-1">
            {downPayments.map((payment) => (
              <div 
                key={payment.id}
                className="flex items-center justify-between p-2 rounded-lg bg-slate-50 border border-slate-200 text-xs hover:bg-slate-100/70 transition-colors"
              >
                <div className="flex items-center gap-2 truncate">
                  <div className="w-6 h-6 rounded-md bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold text-xs shrink-0">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                  </div>
                  <div className="truncate">
                    <div className="font-bold text-slate-800 flex items-center gap-1.5 truncate">
                      <span className="truncate">{payment.concept || 'Entrega a cuenta'}</span>
                      <span className="text-[10px] bg-white border border-slate-200 px-1 rounded text-slate-500 capitalize shrink-0">
                        {payment.paymentMethod}
                      </span>
                    </div>
                    <div className="text-[10px] text-slate-400 flex items-center gap-2 truncate">
                      <span>{payment.date}</span>
                      {payment.receiptUrl && (
                        <a 
                          href={payment.receiptUrl} 
                          target="_blank" 
                          rel="noreferrer" 
                          className="text-indigo-600 hover:underline flex items-center gap-0.5 shrink-0 font-medium"
                        >
                          <Paperclip className="w-2.5 h-2.5" />
                          <span>{payment.receiptName || 'Ver justificante'}</span>
                        </a>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2.5 shrink-0 pl-2">
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

      {/* TARJETA 4: LIQUIDACIÓN ECONÓMICA EN VIVO DEL EXPEDIENTE (COMPACTA) */}
      <div className="bg-gradient-to-br from-slate-900 to-indigo-950 text-white p-3.5 rounded-xl shadow-premium border border-slate-800 space-y-2.5">
        <div className="flex justify-between items-center pb-1.5 border-b border-white/10">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
            <Coins className="w-3.5 h-3.5 text-amber-400" />
            Liquidación Económica del Expediente
          </span>
          <span className="text-[10px] bg-white/10 text-slate-200 px-2 py-0.5 rounded-full border border-white/10 font-semibold">
            {billingType === 'billable' ? 'Facturación Adicional' : (billingType === 'included' ? 'Cuota Mensual' : 'Gestión Interna')}
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
          <div className="bg-white/5 p-2 rounded-lg border border-white/10">
            <span className="text-[9px] uppercase tracking-wide text-slate-400 block font-semibold mb-0.5">Honorarios</span>
            <span className="text-xs font-bold text-white">{feeAmount.toFixed(2)} €</span>
          </div>

          <div className="bg-white/5 p-2 rounded-lg border border-white/10">
            <span className="text-[9px] uppercase tracking-wide text-slate-400 block font-semibold mb-0.5">(+) Suplidos</span>
            <span className="text-xs font-bold text-amber-300">+{totalExternalExpenses.toFixed(2)} €</span>
          </div>

          <div className="bg-white/5 p-2 rounded-lg border border-white/10">
            <span className="text-[9px] uppercase tracking-wide text-slate-400 block font-semibold mb-0.5">(-) Anticipos</span>
            <span className="text-xs font-bold text-emerald-400">-{totalDownPayments.toFixed(2)} €</span>
          </div>

          <div className={`p-2 rounded-lg border ${
            pendingBalance > 0
              ? 'bg-rose-500/20 border-rose-500/40 text-rose-300'
              : pendingBalance === 0
              ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300'
              : 'bg-blue-500/20 border-blue-500/40 text-blue-300'
          }`}>
            <span className="text-[9px] uppercase tracking-wide block font-bold mb-0.5">
              {pendingBalance > 0 ? 'Saldo a Cobrar' : (pendingBalance === 0 ? 'Liquidado' : 'A Devolver')}
            </span>
            <span className="text-xs font-extrabold">{Math.abs(pendingBalance).toFixed(2)} €</span>
          </div>
        </div>

        {pendingBalance > 0 && (
          <p className="text-[10px] text-amber-200/90 bg-amber-500/10 p-1.5 rounded-md border border-amber-500/20 flex items-center gap-1.5">
            <AlertCircle className="w-3 h-3 text-amber-400 shrink-0" />
            <span>Saldo pendiente: <strong>{pendingBalance.toFixed(2)} €</strong> (honorarios pactados + suplidos adelantados).</span>
          </p>
        )}
      </div>

      {/* TARJETA 5: ACCIONES DE COBRO & ENVÍO DE LIQUIDACIÓN AL CLIENTE (SIN N8N) */}
      <div className="bg-white p-3 rounded-xl border border-slate-200/80 shadow-2xs space-y-2.5">
        <div className="flex justify-between items-center pb-1.5 border-b border-slate-100">
          <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wide flex items-center gap-1.5">
            <Send className="w-3.5 h-3.5 text-blue-600" />
            Emisión de Liquidación & Comunicación al Cliente
          </span>
          <span className="text-[10px] text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Envío Directo (Sin n8n)
          </span>
        </div>

        {/* Destinatario de correo del cliente */}
        <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200 space-y-1.5 text-xs">
          <div className="flex items-center justify-between text-[11px]">
            <span className="text-slate-500 font-medium">Cliente Asignado:</span>
            <span className="font-bold text-slate-800 truncate max-w-[280px]">
              {selectedClient?.razonSocial || formData.client || 'Sin cliente asignado'}
              {selectedClient?.nif && ` (${selectedClient.nif})`}
            </span>
          </div>

          <div className="flex items-center gap-2 pt-1">
            <Mail className="w-4 h-4 text-slate-400 shrink-0" />
            <input
              type="email"
              placeholder="correo@cliente.com"
              value={recipientEmail}
              onChange={(e) => setRecipientEmail(e.target.value)}
              className="flex-1 px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs bg-white text-slate-800 font-medium outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
          {selectedClient?.email ? (
            <p className="text-[10px] text-emerald-700 flex items-center gap-1">
              <Check className="w-3 h-3 text-emerald-600" /> Correo detectado automáticamente de la ficha del cliente.
            </p>
          ) : (
            <p className="text-[10px] text-amber-600 flex items-center gap-1">
              <AlertCircle className="w-3 h-3 text-amber-500" /> El cliente no tiene email registrado en su ficha. Puedes introducirlo arriba para este envío.
            </p>
          )}
        </div>

        {/* Botonera de acción */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
          <button
            type="button"
            onClick={handleGenerateLiquidationPdf}
            className="flex items-center justify-center gap-2 bg-slate-800 hover:bg-slate-900 text-white py-2 px-3 rounded-lg text-xs font-bold transition-all shadow-xs cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5 text-blue-400" />
            <span>Generar / Descargar PDF</span>
          </button>

          <button
            type="button"
            onClick={handleSendBillingEmail}
            className="flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white py-2 px-3 rounded-lg text-xs font-bold transition-all shadow-xs cursor-pointer"
          >
            <Mail className="w-3.5 h-3.5" />
            <span>Enviar Liquidación por Email</span>
          </button>
        </div>

        <p className="text-[10px] text-slate-400 text-center pt-0.5">
          El botón de PDF genera el documento formal con membrete listo para imprimir o guardar. El botón de email redacta el correo con desglose completo y cuenta bancaria.
        </p>
      </div>

    </div>
  );
}
