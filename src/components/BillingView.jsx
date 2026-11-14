import React, { useState, useMemo, useEffect, useRef } from 'react';
import * as XLSX from 'xlsx';
import { 
  Coins, 
  Receipt, 
  CreditCard, 
  FileSpreadsheet, 
  Download, 
  Search, 
  Filter, 
  AlertTriangle, 
  CheckCircle2, 
  Clock, 
  Building2, 
  ExternalLink, 
  ArrowUpDown,
  FileCheck2,
  Calendar,
  User,
  Scale,
  Printer,
  Mail,
  Send,
  Zap,
  CheckSquare,
  Square,
  Check
} from 'lucide-react';
import { doc, updateDoc, writeBatch, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';
import {
  findClientForTask,
  openLiquidationPdf,
  openBillingEmail,
  openConsolidatedClientPdf,
  openConsolidatedBillingEmail,
  getTaskTotalHours,
  formatBudgetSentDate,
  buildBudgetSentPayload,
  buildBudgetUnsentPayload
} from '../utils/billingUtils';
import { translations } from '../i18n/translations';

export default function BillingView({ 
  tasks = [], 
  currentUser, 
  onEditTask, 
  logAction,
  clientes = [],
  billingSettings = {},
  lang = 'ca'
}) {
  const t = translations[lang] || translations.ca;
  const isCa = lang === 'ca';
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all'); // 'all', 'pending', 'invoiced', 'unbilled_closed', 'with_expenses'
  const [kindFilter, setKindFilter] = useState('all'); // 'all', 'expediente', 'variable'
  const [clientFilter, setClientFilter] = useState('');
  const [selectedTaskIds, setSelectedTaskIds] = useState([]);
  const [batchEmailOverride, setBatchEmailOverride] = useState('');
  const [isBatchUpdating, setIsBatchUpdating] = useState(false);
  const [sortField, setSortField] = useState('dueDate');
  const [sortAsc, setSortAsc] = useState(false);

  // Lista única de clientes presentes en los expedientes
  const clientsList = useMemo(() => {
    const set = new Set();
    tasks.forEach(t => {
      if (t.client) set.add(t.client);
    });
    return Array.from(set).sort();
  }, [tasks]);

  // Cálculos económicos para cada tarea
  const enrichedTasks = useMemo(() => {
    return tasks.map(task => {
      const billingType = task.billingType || (task.esFacturable === false ? 'included' : 'billable');
      const feeAmount = billingType === 'billable' ? (Number(task.feeAmount) || Number(task.precioHonorarios) || 0) : 0;
      
      const downPayments = Array.isArray(task.downPayments) ? task.downPayments : [];
      const externalExpenses = Array.isArray(task.externalExpenses) ? task.externalExpenses : [];

      const totalDownPayments = downPayments.reduce((acc, p) => acc + (Number(p.amount) || 0), 0);
      const totalExternalExpenses = externalExpenses.reduce((acc, e) => acc + (Number(e.amount) || 0), 0);

      const totalGross = feeAmount + totalExternalExpenses;
      const pendingBalance = totalGross - totalDownPayments;

      const isClosedOrProcessed = ['presentado / tramitado', 'cerrado', 'completed', 'closed'].includes((task.status || '').toLowerCase().trim());
      const rawBillingStatus = task.billingStatus || 'pending';
      const billingStatus = rawBillingStatus === 'paid' ? 'invoiced' : rawBillingStatus;

      return {
        ...task,
        billingType,
        feeAmount,
        totalDownPayments,
        totalExternalExpenses,
        totalGross,
        pendingBalance,
        isClosedOrProcessed,
        billingStatus
      };
    });
  }, [tasks]);

  // KPIs Globales del Despacho
  const kpis = useMemo(() => {
    let totalPendingFees = 0;
    let totalExpensesAdelantados = 0;
    let totalAnticipos = 0;
    let totalPendingBalance = 0;
    let unbilledClosedCount = 0;

    enrichedTasks.forEach(t => {
      if (t.billingType === 'billable') {
        if (t.billingStatus === 'pending') {
          totalPendingFees += t.feeAmount;
        }
      }
      totalExpensesAdelantados += t.totalExternalExpenses;
      totalAnticipos += t.totalDownPayments;
      
      if (t.pendingBalance > 0 && t.billingStatus !== 'invoiced') {
        totalPendingBalance += t.pendingBalance;
      }

      if (t.isClosedOrProcessed && t.billingType === 'billable' && t.billingStatus === 'pending') {
        unbilledClosedCount++;
      }
    });

    return {
      totalPendingFees,
      totalExpensesAdelantados,
      totalAnticipos,
      totalPendingBalance,
      unbilledClosedCount
    };
  }, [enrichedTasks]);

  // Filtrado de expedientes
  const filteredTasks = useMemo(() => {
    return enrichedTasks.filter(task => {
      // Filtro de estado
      if (statusFilter === 'pending' && task.billingStatus !== 'pending') return false;
      if (statusFilter === 'invoiced' && task.billingStatus !== 'invoiced') return false;
      if (statusFilter === 'not_sent' && (task.budgetSentAt || task.billingStatus !== 'pending')) return false;
      if (statusFilter === 'with_expenses' && task.totalExternalExpenses <= 0) return false;
      if (statusFilter === 'unbilled_closed') {
        if (!(task.isClosedOrProcessed && task.billingType === 'billable' && task.billingStatus === 'pending')) return false;
      }

      // Filtro de tipus (expedient / variable)
      const taskKind = task.recordType === 'variable' ? 'variable' : 'expediente';
      if (kindFilter !== 'all' && taskKind !== kindFilter) return false;

      // Filtro de cliente
      if (clientFilter && task.client !== clientFilter) return false;

      // Búsqueda
      if (searchTerm) {
        const term = searchTerm.toLowerCase();
        const matchTitle = (task.title || '').toLowerCase().includes(term);
        const matchClient = (task.client || '').toLowerCase().includes(term);
        const matchNif = (task.clientNif || '').toLowerCase().includes(term);
        const matchInvoice = (task.invoiceNumber || '').toLowerCase().includes(term);
        if (!matchTitle && !matchClient && !matchNif && !matchInvoice) return false;
      }

      return true;
    }).sort((a, b) => {
      if (sortField === 'pendingBalance') {
        return sortAsc ? a.pendingBalance - b.pendingBalance : b.pendingBalance - a.pendingBalance;
      }
      if (sortField === 'feeAmount') {
        return sortAsc ? a.feeAmount - b.feeAmount : b.feeAmount - a.feeAmount;
      }
      if (sortField === 'dueDate') {
        return sortAsc ? (a.dueDate || '').localeCompare(b.dueDate || '') : (b.dueDate || '').localeCompare(a.dueDate || '');
      }
      return 0;
    });
  }, [enrichedTasks, statusFilter, kindFilter, clientFilter, searchTerm, sortField, sortAsc]);

  // Datos y selección por defecto al cambiar el filtro de cliente concreto
  const filteredClientData = useMemo(() => {
    if (!clientFilter || filteredTasks.length === 0) return null;
    return findClientForTask(filteredTasks[0], clientes);
  }, [clientFilter, filteredTasks, clientes]);

  const prevClientFilterRef = useRef('');

  useEffect(() => {
    if (!clientFilter) {
      prevClientFilterRef.current = '';
      setSelectedTaskIds([]);
      setBatchEmailOverride('');
      return;
    }

    if (prevClientFilterRef.current !== clientFilter) {
      prevClientFilterRef.current = clientFilter;
      const clientItems = enrichedTasks.filter(t => t.client === clientFilter);
      const pendingUnsentIds = clientItems.filter(t => t.billingStatus === 'pending' && !t.budgetSentAt).map(t => t.id);
      const pendingIds = clientItems.filter(t => t.billingStatus === 'pending').map(t => t.id);
      setSelectedTaskIds(
        pendingUnsentIds.length > 0
          ? pendingUnsentIds
          : (pendingIds.length > 0 ? pendingIds : clientItems.map(t => t.id))
      );
      const matchedClient = clientItems[0] ? findClientForTask(clientItems[0], clientes) : null;
      setBatchEmailOverride(matchedClient?.email || clientItems[0]?.clientEmail || '');
    }
  }, [clientFilter, clientes, enrichedTasks]);

  const selectedBatchTasks = useMemo(() => {
    const idSet = new Set(selectedTaskIds);
    return filteredTasks.filter(t => idSet.has(t.id));
  }, [filteredTasks, selectedTaskIds]);

  const selectedBatchTotal = useMemo(() => {
    return selectedBatchTasks.reduce((acc, item) => acc + item.pendingBalance, 0);
  }, [selectedBatchTasks]);

  const selectedBatchStats = useMemo(() => {
    let expCount = 0;
    let varCount = 0;
    let alreadySentCount = 0;
    selectedBatchTasks.forEach(item => {
      if (item.recordType === 'variable') varCount++;
      else expCount++;
      if (item.budgetSentAt) alreadySentCount++;
    });
    return { expCount, varCount, alreadySentCount };
  }, [selectedBatchTasks]);

  const toggleSelectTask = (taskId) => {
    setSelectedTaskIds(prev =>
      prev.includes(taskId) ? prev.filter(id => id !== taskId) : [...prev, taskId]
    );
  };

  const persistBudgetSentBatch = async (targetTasks = [], sentTo = '', mode = 'individual') => {
    if (!targetTasks || targetTasks.length === 0) return;
    const sentBy = currentUser?.email || 'gestor';
    const batch = writeBatch(db);
    targetTasks.forEach(item => {
      batch.update(doc(db, 'expedientes', item.id), {
        ...buildBudgetSentPayload(item, { sentTo, sentBy, mode }),
        lastUpdated: serverTimestamp()
      });
    });
    await batch.commit().catch(async () => {
      await Promise.all(
        targetTasks.map(item => {
          const payload = {
            ...buildBudgetSentPayload(item, { sentTo, sentBy, mode }),
            lastUpdated: serverTimestamp()
          };
          return updateDoc(doc(db, 'expedientes', item.id), payload).catch(() =>
            updateDoc(doc(db, 'tasks', item.id), payload)
          );
        })
      );
    });
  };

  const handleToggleSentCheck = async (task) => {
    if (!task?.id) return;
    try {
      let payload;
      if (task.budgetSentAt) {
        const sentDate = formatBudgetSentDate(task.budgetSentAt, lang);
        const confirmUnmark = window.confirm(
          isCa
            ? `Vols desmarcar el check de pressupost enviat (${sentDate}) per a "${task.title}"?`
            : `¿Deseas desmarcar el check de presupuesto enviado (${sentDate}) para "${task.title}"?`
        );
        if (!confirmUnmark) return;
        payload = { ...buildBudgetUnsentPayload(), lastUpdated: serverTimestamp() };
      } else {
        const clientData = findClientForTask(task, clientes);
        payload = {
          ...buildBudgetSentPayload(task, {
            sentTo: clientData?.email || task.clientEmail || '',
            sentBy: currentUser?.email || 'gestor',
            mode: 'manual'
          }),
          lastUpdated: serverTimestamp()
        };
      }

      await updateDoc(doc(db, 'expedientes', task.id), payload).catch(async () => {
        await updateDoc(doc(db, 'tasks', task.id), payload);
      });
    } catch (e) {
      alert((isCa ? 'Error en actualitzar estat d\'enviament: ' : 'Error al actualizar estado de envío: ') + e.message);
    }
  };

  const handleSendIndividualEmail = async (task) => {
    const clientData = findClientForTask(task, clientes);
    if (task.budgetSentAt) {
      const sentDate = formatBudgetSentDate(task.budgetSentAt, lang);
      const confirmResend = window.confirm(
        isCa
          ? `Aquest pressupost ja consta com enviat el ${sentDate}${task.budgetSentTo ? ` (${task.budgetSentTo})` : ''}. Voleu tornar a enviar-lo per email i generar el PDF?`
          : `Este presupuesto ya consta como enviado el ${sentDate}${task.budgetSentTo ? ` (${task.budgetSentTo})` : ''}. ¿Deseas volver a enviarlo por email y generar el PDF?`
      );
      if (!confirmResend) return;
    }

    let recipient = (clientData?.email || task.clientEmail || '').trim();
    if (!recipient) {
      const entered = window.prompt(
        isCa
          ? `Introdueix el correu electrònic del client (${task.client || task.title}):`
          : `Introduce el correo electrónico del cliente (${task.client || task.title}):`,
        ''
      );
      if (!entered || !entered.trim()) return;
      recipient = entered.trim();
    }

    const res = openBillingEmail(task, clientData, billingSettings, recipient, logAction, lang, { withPdf: true });
    if (res?.sent) {
      try {
        await persistBudgetSentBatch([task], res.recipient, 'individual');
      } catch (e) {
        console.error('Error registering budgetSentAt:', e);
      }
    }
  };

  const handleSendConsolidatedEmail = async () => {
    if (selectedBatchTasks.length === 0) return;

    if (selectedBatchStats.alreadySentCount > 0) {
      const confirmResend = window.confirm(
        isCa
          ? `${selectedBatchStats.alreadySentCount} de ${selectedBatchTasks.length} pressupost(os) seleccionats ja consten com enviats. Voleu enviar-los igualment per email amb PDF conjunt?`
          : `${selectedBatchStats.alreadySentCount} de ${selectedBatchTasks.length} presupuesto(s) seleccionados ya constan como enviados. ¿Deseas enviarlos igualmente por email con PDF conjunto?`
      );
      if (!confirmResend) return;
    }

    let recipient = (batchEmailOverride || filteredClientData?.email || selectedBatchTasks[0]?.clientEmail || '').trim();
    if (!recipient) {
      const entered = window.prompt(
        isCa
          ? `Introdueix el correu electrònic per enviar el pressupost conjunt a ${clientFilter}:`
          : `Introduce el correo electrónico para enviar el presupuesto conjunto a ${clientFilter}:`,
        ''
      );
      if (!entered || !entered.trim()) return;
      recipient = entered.trim();
      setBatchEmailOverride(recipient);
    }

    const res = openConsolidatedBillingEmail(
      selectedBatchTasks,
      filteredClientData,
      clientFilter,
      billingSettings,
      recipient,
      logAction,
      lang,
      { withPdf: true }
    );
    if (res?.sent) {
      try {
        await persistBudgetSentBatch(selectedBatchTasks, res.recipient, 'consolidated');
      } catch (e) {
        console.error('Error registering consolidated budgetSentAt:', e);
      }
    }
  };

  const handleBatchMarkInvoiced = async () => {
    if (selectedBatchTasks.length === 0) return;
    const confirmMsg = isCa
      ? `Voleu passar ${selectedBatchTasks.length} pressupost(os) de "${clientFilter}" a estat FACTURAT de cop?`
      : `¿Deseas pasar ${selectedBatchTasks.length} presupuesto(s) de "${clientFilter}" a estado FACTURADO de golpe?`;
    if (!window.confirm(confirmMsg)) return;

    const invoicePrompt = window.prompt(
      isCa
        ? "Número de factura comú (opcional, deixa-ho en blanc si no cal):"
        : "Número de factura común (opcional, déjalo en blanco si no aplica):",
      ''
    );
    if (invoicePrompt === null) return;

    setIsBatchUpdating(true);
    try {
      const payload = {
        billingStatus: 'invoiced',
        lastUpdated: serverTimestamp()
      };
      if (invoicePrompt.trim()) {
        payload.invoiceNumber = invoicePrompt.trim();
      }

      const batch = writeBatch(db);
      selectedBatchTasks.forEach(item => {
        batch.update(doc(db, 'expedientes', item.id), payload);
      });
      await batch.commit().catch(async () => {
        await Promise.all(
          selectedBatchTasks.map(item =>
            updateDoc(doc(db, 'expedientes', item.id), payload).catch(() =>
              updateDoc(doc(db, 'tasks', item.id), payload)
            )
          )
        );
      });

      if (logAction) {
        logAction(
          'Facturación en Lote por Cliente',
          `Cliente: ${clientFilter} - ${selectedBatchTasks.length} ítems pasados a Facturado`
        );
      }
      alert(isCa
        ? `✅ ${selectedBatchTasks.length} registres passats a Facturat.`
        : `✅ ${selectedBatchTasks.length} registros pasados a Facturado.`);
    } catch (e) {
      alert((isCa ? 'Error en actualitzar en bloc: ' : 'Error al actualizar en lote: ') + e.message);
    } finally {
      setIsBatchUpdating(false);
    }
  };

  // Cambio rápido de estado de facturación
  const handleQuickStatusChange = async (taskId, newStatus) => {
    try {
      let invoiceNumberPrompt = null;
      if (newStatus === 'invoiced') {
        const currentInv = tasks.find(t => t.id === taskId)?.invoiceNumber || '';
        invoiceNumberPrompt = window.prompt("Introduce el número de factura emitida:", currentInv);
        if (invoiceNumberPrompt === null) return;
      }

      const payload = {
        billingStatus: newStatus,
        lastUpdated: serverTimestamp()
      };
      if (invoiceNumberPrompt !== null) {
        payload.invoiceNumber = invoiceNumberPrompt.trim();
      }

      await updateDoc(doc(db, 'expedientes', taskId), payload).catch(async () => {
        await updateDoc(doc(db, 'tasks', taskId), payload);
      });

      if (logAction) {
        logAction('Actualizado Estado Facturación', `ID: ${taskId} -> ${newStatus}`);
      }
    } catch (e) {
      alert("Error al actualizar estado de facturación: " + e.message);
    }
  };

  // Exportar a Excel para Contabilidad (Sage, Contasol, A3)
  const handleExportExcel = () => {
    const data = filteredTasks.map(t => ({
      'Tipo': t.recordType === 'variable' ? 'Variable' : 'Expediente',
      'Expediente': t.title,
      'Cliente': t.clientRazonSocial || t.client || 'N/A',
      'NIF / CIF': t.clientNif || '',
      'Área': t.department || '',
      'Trámite': t.type || '',
      'Estado Tramitación': t.status || '',
      'Fecha Vencimiento': t.dueDate || '',
      'Horas Dedicadas (Info)': getTaskTotalHours(t).toFixed(2),
      'Régimen Facturación': t.billingType === 'billable' ? 'Facturable' : (t.billingType === 'included' ? 'Cuota Mensual' : 'No Facturable'),
      'Honorarios (€)': t.feeAmount.toFixed(2),
      'Suplidos (€)': t.totalExternalExpenses.toFixed(2),
      'Total Bruto (€)': t.totalGross.toFixed(2),
      'Anticipos Recibidos (€)': t.totalDownPayments.toFixed(2),
      'Saldo Pendiente (€)': t.pendingBalance.toFixed(2),
      'Estado Factura': t.billingStatus === 'invoiced' ? 'Facturado' : 'Pendiente de facturar',
      'Presupuesto Enviado': t.budgetSentAt ? `${formatBudgetSentDate(t.budgetSentAt, lang)}${t.budgetSentTo ? ` (${t.budgetSentTo})` : ''}` : 'No',
      'Nº Factura': t.invoiceNumber || '',
      'Gestores Asignados': (t.assignees || []).join(', ')
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Presupuestos_Gestoria");
    XLSX.writeFile(wb, `Presupuestos_Gestoria_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  // Exportar a CSV (delimitado por ;)
  const handleExportCSV = () => {
    const headers = [
      'Expediente',
      'Cliente',
      'NIF_CIF',
      'Area',
      'Tramite',
      'Estado_Tramitacion',
      'Fecha_Vencimiento',
      'Regimen_Facturacion',
      'Honorarios',
      'Suplidos',
      'Total_Bruto',
      'Anticipos_Recibidos',
      'Saldo_Pendiente',
      'Estado_Factura',
      'Numero_Factura'
    ];

    const rows = filteredTasks.map(t => [
      `"${(t.title || '').replace(/"/g, '""')}"`,
      `"${(t.clientRazonSocial || t.client || '').replace(/"/g, '""')}"`,
      `"${t.clientNif || ''}"`,
      `"${t.department || ''}"`,
      `"${t.type || ''}"`,
      `"${t.status || ''}"`,
      `"${t.dueDate || ''}"`,
      `"${t.billingType || ''}"`,
      t.feeAmount.toFixed(2),
      t.totalExternalExpenses.toFixed(2),
      t.totalGross.toFixed(2),
      t.totalDownPayments.toFixed(2),
      t.pendingBalance.toFixed(2),
      `"${t.billingStatus || ''}"`,
      `"${t.invoiceNumber || ''}"`
    ]);

    const csvContent = '\uFEFF' + [headers.join(';'), ...rows.map(r => r.join(';'))].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `Presupuestos_Contabilidad_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-3.5 animate-in fade-in duration-200">
      
      {/* CABECERA & CONTADOR DE EXPEDIENTES CERRADOS SIN FACTURAR */}
      {kpis.unbilledClosedCount > 0 && (
        <div className="bg-amber-500/15 border border-amber-500/30 rounded-xl p-3 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2.5">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-xs">
              <AlertTriangle className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-xs font-bold text-amber-900">
                {isCa ? `¡Atenció! Hi ha ${kpis.unbilledClosedCount} ${kpis.unbilledClosedCount === 1 ? 'expedient tramitat' : 'expedients tramitats/tancats'} pendents de facturar` : `¡Atención! Hay ${kpis.unbilledClosedCount} ${kpis.unbilledClosedCount === 1 ? 'expediente tramitado' : 'expedientes tramitados/cerrados'} pendientes de facturar`}
              </h3>
              <p className="text-[11px] text-amber-800/80">
                {isCa ? "Tràmits completats pels assessors amb honoraris que encara no s'han facturat al client." : "Trámites completados por los asesores con honorarios que aún no se han facturado al cliente."}
              </p>
            </div>
          </div>
          <button
            onClick={() => setStatusFilter('unbilled_closed')}
            className="bg-amber-600 hover:bg-amber-700 text-white px-3 py-1 rounded-lg text-xs font-bold shadow-xs transition-all shrink-0"
          >
            {isCa ? "Veure Expedients sense Facturar" : "Ver Expedientes sin Facturar"}
          </button>
        </div>
      )}

      {/* TARJETAS KPI DE FACTURACIÓN Y SALDOS (COMPACTAS) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
        
        <div className="bg-white p-3.5 rounded-xl border border-slate-200/80 shadow-2xs">
          <div className="flex justify-between items-start">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
                {isCa ? "Honoraris Pendents" : "Honorarios Pendientes"}
              </span>
              <h3 className="text-xl font-bold text-slate-900 mt-0.5">
                {kpis.totalPendingFees.toLocaleString('es-ES', { minimumFractionDigits: 2 })} €
              </h3>
            </div>
            <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <Coins className="w-4 h-4" />
            </div>
          </div>
          <p className="text-[10px] text-slate-400 mt-1 flex items-center gap-1">
            <Clock className="w-2.5 h-2.5 text-indigo-500" /> {isCa ? "Treballs en curs o a punt per emetre" : "Trabajos en curso o listos para emitir"}
          </p>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-slate-200/80 shadow-2xs">
          <div className="flex justify-between items-start">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
                {isCa ? "Suplerts Avançats" : "Suplidos Adelantados"}
              </span>
              <h3 className="text-xl font-bold text-amber-600 mt-0.5">
                {kpis.totalExpensesAdelantados.toLocaleString('es-ES', { minimumFractionDigits: 2 })} €
              </h3>
            </div>
            <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
              <Receipt className="w-4 h-4" />
            </div>
          </div>
          <p className="text-[10px] text-slate-400 mt-1 flex items-center gap-1">
            <Building2 className="w-2.5 h-2.5 text-amber-500" /> {isCa ? "Taxes, notaries i registres pagats" : "Tasas, notarías y registros pagados"}
          </p>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-slate-200/80 shadow-2xs">
          <div className="flex justify-between items-start">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
                {isCa ? "Bestretes / Provisions" : "Anticipos / Provisiones"}
              </span>
              <h3 className="text-xl font-bold text-emerald-600 mt-0.5">
                {kpis.totalAnticipos.toLocaleString('es-ES', { minimumFractionDigits: 2 })} €
              </h3>
            </div>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <CreditCard className="w-4 h-4" />
            </div>
          </div>
          <p className="text-[10px] text-slate-400 mt-1 flex items-center gap-1">
            <CheckCircle2 className="w-2.5 h-2.5 text-emerald-500" /> {isCa ? "Fons ja cobrats a compte" : "Fondos ya cobrados a cuenta"}
          </p>
        </div>

        <div className="bg-gradient-to-br from-slate-900 to-indigo-950 text-white p-3.5 rounded-xl shadow-premium border border-slate-800">
          <div className="flex justify-between items-start">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                {isCa ? "Pressupost Pendent" : "Presupuesto Pendiente"}
              </span>
              <h3 className="text-xl font-bold text-white mt-0.5">
                {kpis.totalPendingBalance.toLocaleString('es-ES', { minimumFractionDigits: 2 })} €
              </h3>
            </div>
            <div className="w-8 h-8 rounded-lg bg-white/10 text-emerald-400 flex items-center justify-center">
              <Scale className="w-4 h-4" />
            </div>
          </div>
          <p className="text-[10px] text-slate-300 mt-1">
            {isCa ? "Honoraris + Suplerts - Provisions" : "Honorarios + Suplidos - Provisiones"}
          </p>
        </div>

      </div>

      {/* BARRA DE FILTROS Y BOTONES DE EXPORTACIÓN (COMPACTA) */}
      <div className="bg-white p-2.5 rounded-xl border border-slate-200/80 shadow-2xs flex flex-col lg:flex-row justify-between items-center gap-2">
        
        {/* Filtros de Pestaña */}
        <div className="flex flex-wrap items-center gap-1 w-full lg:w-auto">
          <button
            onClick={() => setStatusFilter('all')}
            className={`px-2 py-1 text-xs font-semibold rounded-lg transition-all ${
              statusFilter === 'all' ? 'bg-indigo-600 text-white shadow-2xs' : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            {isCa ? 'Tots' : 'Todos'} ({enrichedTasks.length})
          </button>
          <button
            onClick={() => setStatusFilter('pending')}
            className={`px-2 py-1 text-xs font-semibold rounded-lg transition-all ${
              statusFilter === 'pending' ? 'bg-indigo-600 text-white shadow-2xs' : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            {isCa ? '⏳ Pendents' : '⏳ Pendientes'}
          </button>
          <button
            onClick={() => setStatusFilter('not_sent')}
            className={`px-2 py-1 text-xs font-semibold rounded-lg transition-all ${
              statusFilter === 'not_sent' ? 'bg-blue-600 text-white shadow-2xs' : 'text-blue-700 bg-blue-50/70 hover:bg-blue-100'
            }`}
            title={isCa ? "Pressupostos pendents que encara no s'han enviat al client" : 'Presupuestos pendientes que aún no se han enviado al cliente'}
          >
            {isCa ? '📩 No enviats' : '📩 No enviados'}
          </button>
          <button
            onClick={() => setStatusFilter('unbilled_closed')}
            className={`px-2 py-1 text-xs font-semibold rounded-lg transition-all ${
              statusFilter === 'unbilled_closed' ? 'bg-amber-600 text-white shadow-2xs' : 'text-amber-800 bg-amber-50 hover:bg-amber-100'
            }`}
          >
            {isCa ? '⚠️ Tramitats s/Fact.' : '⚠️ Tramitados s/Fact.'}
          </button>
          <button
            onClick={() => setStatusFilter('with_expenses')}
            className={`px-2 py-1 text-xs font-semibold rounded-lg transition-all ${
              statusFilter === 'with_expenses' ? 'bg-indigo-600 text-white shadow-2xs' : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            {isCa ? '🧾 Suplerts' : '🧾 Suplidos'}
          </button>
          <button
            onClick={() => setStatusFilter('invoiced')}
            className={`px-2 py-1 text-xs font-semibold rounded-lg transition-all ${
              statusFilter === 'invoiced' ? 'bg-indigo-600 text-white shadow-2xs' : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            {isCa ? '📑 Facturats' : '📑 Facturados'}
          </button>
        </div>

        {/* Búsqueda, Filtro Cliente y Botones de Exportar */}
        <div className="flex flex-wrap items-center gap-1.5 w-full lg:w-auto">
          
          <div className="relative flex-1 sm:w-44">
            <Search className="absolute left-2.5 top-2 w-3 h-3 text-slate-400" />
            <input
              type="text"
              placeholder={isCa ? "Cercar..." : "Buscar..."}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-7 pr-2.5 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs outline-none focus:bg-white focus:ring-1 focus:ring-indigo-500 text-slate-800"
            />
          </div>

          <select
            value={kindFilter}
            onChange={(e) => setKindFilter(e.target.value)}
            className="px-2 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 outline-none cursor-pointer"
          >
            <option value="all">{isCa ? 'Tipus (Tots)' : 'Tipo (Todos)'}</option>
            <option value="expediente">{isCa ? '📁 Expedients' : '📁 Expedientes'}</option>
            <option value="variable">{isCa ? '⚡ Variables' : '⚡ Variables'}</option>
          </select>

          <select
            value={clientFilter}
            onChange={(e) => setClientFilter(e.target.value)}
            className={`px-2 py-1 border rounded-lg text-xs font-semibold outline-none max-w-[165px] cursor-pointer ${
              clientFilter
                ? 'bg-indigo-50 border-indigo-300 text-indigo-800'
                : 'bg-slate-50 border-slate-200 text-slate-700'
            }`}
            title={isCa ? 'Filtrar per client per generar PDF / Email / Facturació conjunta' : 'Filtrar por cliente para generar PDF / Email / Facturación conjunta'}
          >
            <option value="">{isCa ? "Client (tots)" : "Cliente (todos)"}</option>
            {clientsList.map(c => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>

          {/* Botones Exportación */}
          <button
            onClick={handleExportExcel}
            className="bg-white hover:bg-emerald-50 text-emerald-700 border border-emerald-200 px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1 transition-all shadow-2xs"
            title="Exportar a Microsoft Excel"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
            <span className="hidden sm:inline">Excel</span>
          </button>

          <button
            onClick={handleExportCSV}
            className="bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1 transition-all shadow-2xs"
            title="Exportar a CSV para A3 / Contasol / Sage"
          >
            <Download className="w-3.5 h-3.5 text-slate-600" />
            <span className="hidden sm:inline">CSV</span>
          </button>
        </div>

      </div>

      {/* BARRA DE ACCIONES CONJUNTAS POR CLIENTE (PDF CONJUNTO / EMAIL EN BLOC / FACTURAR TODOS) */}
      {clientFilter && (
        <div className="bg-gradient-to-r from-indigo-50 via-white to-teal-50/70 p-3 rounded-xl border border-indigo-200/80 shadow-xs space-y-2.5 animate-in fade-in duration-150">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-2.5">
            <div className="flex flex-wrap items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-indigo-600 text-white flex items-center justify-center shrink-0">
                <Building2 className="w-4 h-4" />
              </div>
              <div>
                <div className="text-xs font-extrabold text-slate-900 flex flex-wrap items-center gap-1.5">
                  <span>{clientFilter}</span>
                  <span className="bg-indigo-100 text-indigo-800 px-2 py-0.5 rounded-full text-[10px] font-bold">
                    {selectedBatchTasks.length} / {filteredTasks.length} {isCa ? 'seleccionats' : 'seleccionados'}
                  </span>
                  {selectedBatchTasks.length > 0 && (
                    <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded-full text-[10px] font-semibold">
                      {selectedBatchStats.expCount} Exp · {selectedBatchStats.varCount} Var
                    </span>
                  )}
                  <span className="bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full text-[10px] font-extrabold">
                    {selectedBatchTotal.toFixed(2)} €
                  </span>
                  {selectedBatchStats.alreadySentCount > 0 && (
                    <span className="bg-blue-50 text-blue-700 border border-blue-200 px-2 py-0.5 rounded-full text-[10px] font-bold">
                      ✓ {selectedBatchStats.alreadySentCount} {isCa ? 'ja enviat(s)' : 'ya enviado(s)'}
                    </span>
                  )}
                </div>
                <div className="flex flex-wrap items-center gap-2 mt-1 text-[10px]">
                  <button
                    type="button"
                    onClick={() => setSelectedTaskIds(filteredTasks.filter(t => t.billingStatus === 'pending' && !t.budgetSentAt).map(t => t.id))}
                    className="text-blue-700 font-bold hover:underline cursor-pointer"
                  >
                    {isCa ? 'Només no enviats' : 'Solo no enviados'}
                  </button>
                  <span className="text-slate-300">|</span>
                  <button
                    type="button"
                    onClick={() => setSelectedTaskIds(filteredTasks.filter(t => t.billingStatus === 'pending').map(t => t.id))}
                    className="text-indigo-700 font-bold hover:underline cursor-pointer"
                  >
                    {isCa ? 'Marcar pendents' : 'Marcar pendientes'}
                  </button>
                  <span className="text-slate-300">|</span>
                  <button
                    type="button"
                    onClick={() => setSelectedTaskIds(filteredTasks.map(t => t.id))}
                    className="text-slate-600 font-semibold hover:underline cursor-pointer"
                  >
                    {isCa ? 'Seleccionar tots' : 'Seleccionar todos'}
                  </button>
                  <span className="text-slate-300">|</span>
                  <button
                    type="button"
                    onClick={() => setSelectedTaskIds([])}
                    className="text-slate-500 hover:underline cursor-pointer"
                  >
                    {isCa ? 'Cap' : 'Ninguno'}
                  </button>
                  <span className="text-slate-300">|</span>
                  <button
                    type="button"
                    onClick={() => setClientFilter('')}
                    className="text-rose-600 font-semibold hover:underline cursor-pointer"
                  >
                    {isCa ? 'Tancar filtre client' : 'Cerrar filtro cliente'}
                  </button>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-1.5">
              <div className="flex items-center gap-1 bg-white px-2 py-1 rounded-lg border border-slate-200">
                <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <input
                  type="email"
                  value={batchEmailOverride}
                  onChange={(e) => setBatchEmailOverride(e.target.value)}
                  placeholder="email@client.com"
                  className="text-xs text-slate-800 font-medium outline-none w-40 sm:w-48 bg-transparent"
                />
              </div>

              <button
                type="button"
                disabled={selectedBatchTasks.length === 0}
                onClick={() => openConsolidatedClientPdf(selectedBatchTasks, filteredClientData, clientFilter, billingSettings, lang)}
                className="bg-slate-800 disabled:bg-slate-300 hover:bg-slate-900 text-white px-2.5 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs"
              >
                <Printer className="w-3.5 h-3.5 text-blue-300" />
                <span>{isCa ? `PDF Conjunt (${selectedBatchTasks.length})` : `PDF Conjunto (${selectedBatchTasks.length})`}</span>
              </button>

              <button
                type="button"
                disabled={selectedBatchTasks.length === 0}
                onClick={handleSendConsolidatedEmail}
                className="bg-blue-600 disabled:bg-slate-300 hover:bg-blue-700 text-white px-2.5 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs"
                title={isCa ? 'Obre el PDF conjunt + redacta l\'email i marca els seleccionats com enviats' : 'Abre el PDF conjunto + redacta el email y marca los seleccionados como enviados'}
              >
                <Send className="w-3.5 h-3.5" />
                <span>{isCa ? `Email + PDF Conjunt (${selectedBatchTasks.length})` : `Email + PDF Conjunto (${selectedBatchTasks.length})`}</span>
              </button>

              <button
                type="button"
                disabled={selectedBatchTasks.length === 0 || isBatchUpdating}
                onClick={handleBatchMarkInvoiced}
                className="bg-emerald-600 disabled:bg-slate-300 hover:bg-emerald-700 text-white px-2.5 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs"
              >
                <FileCheck2 className="w-3.5 h-3.5" />
                <span>{isCa ? `Passar a Facturat (${selectedBatchTasks.length})` : `Pasar a Facturado (${selectedBatchTasks.length})`}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TABLA DE EXPEDIENTES Y LIQUIDACIONES ECONÓMICAS (COMPACTA) */}
      <div className="bg-white rounded-xl border border-slate-200/80 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider text-[10px] font-bold border-b border-slate-200/80">
              <tr>
                {clientFilter && (
                  <th className="py-2 pl-3 pr-1 w-8 text-center">
                    <button
                      type="button"
                      onClick={() =>
                        setSelectedTaskIds(prev =>
                          prev.length === filteredTasks.length ? [] : filteredTasks.map(t => t.id)
                        )
                      }
                      className="text-slate-500 hover:text-indigo-600 cursor-pointer"
                      title={isCa ? 'Seleccionar tots / cap' : 'Seleccionar todos / ninguno'}
                    >
                      {selectedTaskIds.length === filteredTasks.length && filteredTasks.length > 0
                        ? <CheckSquare className="w-4 h-4 text-indigo-600" />
                        : <Square className="w-4 h-4" />}
                    </button>
                  </th>
                )}
                <th className="py-2 px-3">{t.billing.tableHeaders.expedienteClient}</th>
                <th className="py-2 px-2.5">{t.billing.tableHeaders.status}</th>
                <th className="py-2 px-2.5 text-right">{t.billing.tableHeaders.fees}</th>
                <th className="py-2 px-2.5 text-right">{t.billing.tableHeaders.expenses}</th>
                <th className="py-2 px-2.5 text-right">{t.billing.tableHeaders.downPayments}</th>
                <th 
                  className="py-2 px-2.5 text-right cursor-pointer hover:bg-slate-100 select-none"
                  onClick={() => {
                    setSortField('pendingBalance');
                    setSortAsc(!sortAsc);
                  }}
                >
                  <div className="flex items-center justify-end gap-1">
                    <span>{t.billing.tableHeaders.balance}</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>
                <th className="py-2 px-2.5">{t.billing.tableHeaders.billingStatus}</th>
                <th className="py-2 px-2.5 text-center">{t.billing.tableHeaders.actions}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredTasks.length === 0 ? (
                <tr>
                  <td colSpan={clientFilter ? "9" : "8"} className="text-center py-8 text-slate-400">
                    {lang === 'ca' ? 'No hi ha expedients que coincideixin amb els filtres seleccionats.' : 'No hay expedientes que coincidan con los filtros seleccionados.'}
                  </td>
                </tr>
              ) : (
                filteredTasks.map((t) => {
                  const hasPendingBalance = t.pendingBalance > 0;
                  const isClosedUnbilled = t.isClosedOrProcessed && t.billingType === 'billable' && t.billingStatus === 'pending';
                  const isSelected = selectedTaskIds.includes(t.id);
                  const totalHours = getTaskTotalHours(t);
                  const sentDateLabel = formatBudgetSentDate(t.budgetSentAt, lang);

                  return (
                    <tr 
                      key={t.id} 
                      className={`hover:bg-slate-50/80 transition-colors ${
                        isSelected && clientFilter ? 'bg-indigo-50/40' : (isClosedUnbilled ? 'bg-amber-50/30' : '')
                      }`}
                    >
                      {clientFilter && (
                        <td className="py-2 pl-3 pr-1 text-center align-middle">
                          <button
                            type="button"
                            onClick={() => toggleSelectTask(t.id)}
                            className="text-slate-400 hover:text-indigo-600 cursor-pointer"
                          >
                            {isSelected
                              ? <CheckSquare className="w-4 h-4 text-indigo-600" />
                              : <Square className="w-4 h-4" />}
                          </button>
                        </td>
                      )}
                      {/* Expediente y Cliente */}
                      <td className="py-2 px-3 max-w-xs">
                        <div className="flex items-center gap-1.5 min-w-0">
                          {t.recordType === 'variable' && (
                            <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-teal-50 text-teal-800 border border-teal-200 text-[9px] font-extrabold uppercase shrink-0">
                              <Zap className="w-2.5 h-2.5 text-teal-600" />
                              Var
                            </span>
                          )}
                          <div 
                            className="font-bold text-slate-900 hover:text-indigo-600 cursor-pointer truncate"
                            onClick={() => onEditTask(t)}
                          >
                            {t.title}
                          </div>
                        </div>
                        <div className="text-[11px] text-slate-500 truncate flex items-center gap-1.5 mt-0.5">
                          {t.client ? (
                            <button
                              type="button"
                              onClick={() => setClientFilter(prev => (prev === t.client ? '' : t.client))}
                              className="hover:text-indigo-700 hover:underline text-left truncate cursor-pointer flex items-center gap-1"
                              title={isCa ? 'Filtrar per aquest client per veure/enviar conjuntament' : 'Filtrar por este cliente para ver/enviar conjuntamente'}
                            >
                              <span className="truncate">{t.clientRazonSocial || t.client}</span>
                            </button>
                          ) : (
                            <span>Sin cliente</span>
                          )}
                          {t.clientNif && (
                            <span className="text-[10px] bg-slate-100 px-1 py-0.2 rounded text-slate-600 font-mono shrink-0">
                              {t.clientNif}
                            </span>
                          )}
                          {totalHours > 0 && (
                            <span className="text-[9px] bg-teal-50 text-teal-700 border border-teal-200 px-1 py-0.2 rounded font-bold shrink-0">
                              {totalHours.toFixed(1)}h
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Estado del Trámite */}
                      <td className="py-2 px-2.5 whitespace-nowrap">
                        <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                          t.status === 'Cerrado' ? 'bg-blue-50 text-blue-800 border-blue-200' :
                          t.status === 'Con Retraso' ? 'bg-rose-50 text-rose-800 border-rose-200' :
                          t.status === 'En Riesgo' ? 'bg-amber-50 text-amber-800 border-amber-200' :
                          'bg-emerald-50 text-emerald-800 border-emerald-200'
                        }`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${
                            t.status === 'Cerrado' ? 'bg-blue-500' :
                            t.status === 'Con Retraso' ? 'bg-rose-500 animate-pulse' :
                            t.status === 'En Riesgo' ? 'bg-amber-500' :
                            'bg-emerald-500'
                          }`}></span>
                          {t.status || 'Abierto'}
                        </span>
                        {isClosedUnbilled && (
                          <span className="block text-[9px] text-amber-700 font-bold mt-0.5">
                            {isCa ? "⚠️ Tràmit tancat" : "⚠️ Trámite cerrado"}
                          </span>
                        )}
                      </td>

                      {/* Honorarios */}
                      <td className="py-2 px-2.5 text-right whitespace-nowrap">
                        {t.billingType === 'billable' ? (
                          <span className="font-bold text-slate-800">
                            {t.feeAmount.toFixed(2)} €
                          </span>
                        ) : (
                          <span className="text-[10px] text-slate-400 italic">
                            {t.billingType === 'included' ? 'Cuota' : 'No fact.'}
                          </span>
                        )}
                      </td>

                      {/* Suplidos */}
                      <td className="py-2 px-2.5 text-right whitespace-nowrap">
                        {t.totalExternalExpenses > 0 ? (
                          <span className="font-bold text-amber-700">
                            +{t.totalExternalExpenses.toFixed(2)} €
                          </span>
                        ) : (
                          <span className="text-slate-300">-</span>
                        )}
                      </td>

                      {/* Anticipos */}
                      <td className="py-2 px-2.5 text-right whitespace-nowrap">
                        {t.totalDownPayments > 0 ? (
                          <span className="font-bold text-emerald-700">
                            -{t.totalDownPayments.toFixed(2)} €
                          </span>
                        ) : (
                          <span className="text-slate-300">-</span>
                        )}
                      </td>

                      {/* Saldo Pendiente */}
                      <td className="py-2 px-2.5 text-right whitespace-nowrap">
                        <span className={`font-bold ${
                          hasPendingBalance 
                            ? 'text-rose-600' 
                            : t.pendingBalance === 0 
                            ? 'text-emerald-600' 
                            : 'text-blue-600'
                        }`}>
                          {t.pendingBalance.toFixed(2)} €
                        </span>
                      </td>

                      {/* Estado Facturación con Selector Rápido */}
                      <td className="py-2 px-2.5 whitespace-nowrap">
                        <select
                          value={t.billingStatus}
                          onChange={(e) => handleQuickStatusChange(t.id, e.target.value)}
                          className={`text-[11px] font-semibold py-0.5 px-1.5 rounded-lg border outline-none cursor-pointer transition-colors ${
                            t.billingStatus === 'invoiced'
                              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                              : 'bg-amber-50 text-amber-800 border-amber-200'
                          }`}
                        >
                          <option value="pending">{isCa ? "⏳ Pendent" : "⏳ Pendiente"}</option>
                          <option value="invoiced">{isCa ? "📑 Facturat" : "📑 Facturado"}</option>
                        </select>
                        {t.invoiceNumber && (
                          <span className="block text-[9px] text-slate-400 mt-0.5">
                            Fact: {t.invoiceNumber}
                          </span>
                        )}
                      </td>

                      {/* Acciones */}
                      <td className="py-2 px-2.5 text-center whitespace-nowrap">
                        <div className="inline-flex items-center gap-1.5">
                          <div className="w-[52px] shrink-0 flex items-center justify-end">
                            <button
                              type="button"
                              onClick={() => handleToggleSentCheck(t)}
                              className={`h-6 rounded-md transition-all cursor-pointer inline-flex items-center justify-center gap-0.5 ${
                                t.budgetSentAt
                                  ? 'px-1.5 bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100'
                                  : 'w-6 text-slate-300/70 hover:text-emerald-600 hover:bg-emerald-50/50 border border-transparent hover:border-emerald-200'
                              }`}
                              title={
                                t.budgetSentAt
                                  ? `${isCa ? 'Pressupost enviat el' : 'Presupuesto enviado el'} ${sentDateLabel}${t.budgetSentTo ? ` · ${t.budgetSentTo}` : ''}${t.budgetSentMode === 'consolidated' ? (isCa ? ' (conjunt)' : ' (conjunto)') : ''} · ${isCa ? 'Clic per desmarcar' : 'Clic para desmarcar'}`
                                  : (isCa ? 'Marcar manualment com enviat' : 'Marcar manualmente como enviado')
                              }
                            >
                              <Check className="w-3 h-3 shrink-0" />
                              {t.budgetSentAt && (
                                <span className="text-[9px] font-bold leading-none">{sentDateLabel.slice(0, 5)}</span>
                              )}
                            </button>
                          </div>

                          <button
                            type="button"
                            onClick={() => {
                              const clientData = findClientForTask(t, clientes);
                              openLiquidationPdf(t, clientData, billingSettings, lang);
                            }}
                            className="bg-slate-800 hover:bg-slate-900 text-white px-2 py-1 rounded-md text-[11px] font-bold flex items-center gap-1 transition-all shadow-2xs cursor-pointer"
                            title={lang === 'ca' ? "Generar i Imprimir / Desar en PDF el pressupost" : "Generar e Imprimir / Guardar en PDF el presupuesto"}
                          >
                            <Printer className="w-3 h-3 text-blue-400" />
                            <span>PDF</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => handleSendIndividualEmail(t)}
                            className="bg-blue-600 hover:bg-blue-700 text-white px-2 py-1 rounded-md text-[11px] font-bold flex items-center gap-1 transition-all shadow-2xs cursor-pointer"
                            title={lang === 'ca' ? "Obrir PDF i enviar pressupost per email" : "Abrir PDF y enviar presupuesto por email"}
                          >
                            <Mail className="w-3 h-3" />
                            <span>Email</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => onEditTask(t)}
                            className="bg-slate-100 hover:bg-indigo-50 text-slate-700 hover:text-indigo-700 border border-slate-200 hover:border-indigo-200 px-2 py-1 rounded-md text-[11px] font-semibold transition-all cursor-pointer"
                            title="Abrir ficha"
                          >
                            {isCa ? "Fitxa" : "Ficha"}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}
