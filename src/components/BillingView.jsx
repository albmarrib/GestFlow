import React, { useState, useMemo } from 'react';
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
  Scale
} from 'lucide-react';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';

export default function BillingView({ 
  tasks = [], 
  currentUser, 
  onEditTask, 
  logAction 
}) {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all'); // 'all', 'pending', 'invoiced', 'paid', 'unbilled_closed', 'with_expenses'
  const [clientFilter, setClientFilter] = useState('');
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
      const billingStatus = task.billingStatus || 'pending';

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
      
      if (t.pendingBalance > 0 && t.billingStatus !== 'paid') {
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
      if (statusFilter === 'paid' && task.billingStatus !== 'paid') return false;
      if (statusFilter === 'with_expenses' && task.totalExternalExpenses <= 0) return false;
      if (statusFilter === 'unbilled_closed') {
        if (!(task.isClosedOrProcessed && task.billingType === 'billable' && task.billingStatus === 'pending')) return false;
      }

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
  }, [enrichedTasks, statusFilter, clientFilter, searchTerm, sortField, sortAsc]);

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
      'Expediente': t.title,
      'Cliente': t.clientRazonSocial || t.client || 'N/A',
      'NIF / CIF': t.clientNif || '',
      'Área': t.department || '',
      'Trámite': t.type || '',
      'Estado Tramitación': t.status || '',
      'Fecha Vencimiento': t.dueDate || '',
      'Régimen Facturación': t.billingType === 'billable' ? 'Facturable' : (t.billingType === 'included' ? 'Cuota Mensual' : 'No Facturable'),
      'Honorarios (€)': t.feeAmount.toFixed(2),
      'Suplidos (€)': t.totalExternalExpenses.toFixed(2),
      'Total Bruto (€)': t.totalGross.toFixed(2),
      'Anticipos Recibidos (€)': t.totalDownPayments.toFixed(2),
      'Saldo Pendiente (€)': t.pendingBalance.toFixed(2),
      'Estado Factura': t.billingStatus === 'paid' ? 'Cobrado' : (t.billingStatus === 'invoiced' ? 'Facturado' : 'Pendiente'),
      'Nº Factura': t.invoiceNumber || '',
      'Gestores Asignados': (t.assignees || []).join(', ')
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Facturacion_Gestoria");
    XLSX.writeFile(wb, `Facturacion_Gestoria_${new Date().toISOString().slice(0, 10)}.xlsx`);
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
    link.setAttribute('download', `Facturacion_Contabilidad_${new Date().toISOString().slice(0, 10)}.csv`);
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
                ¡Atención! Hay {kpis.unbilledClosedCount} {kpis.unbilledClosedCount === 1 ? 'expediente tramitado' : 'expedientes tramitados/cerrados'} pendientes de facturar
              </h3>
              <p className="text-[11px] text-amber-800/80">
                Trámites completados por los asesores con honorarios que aún no se han facturado al cliente.
              </p>
            </div>
          </div>
          <button
            onClick={() => setStatusFilter('unbilled_closed')}
            className="bg-amber-600 hover:bg-amber-700 text-white px-3 py-1 rounded-lg text-xs font-bold shadow-xs transition-all shrink-0"
          >
            Ver Expedientes sin Facturar
          </button>
        </div>
      )}

      {/* TARJETAS KPI DE FACTURACIÓN Y SALDOS (COMPACTAS) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
        
        <div className="bg-white p-3.5 rounded-xl border border-slate-200/80 shadow-2xs">
          <div className="flex justify-between items-start">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
                Honorarios Pendientes
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
            <Clock className="w-2.5 h-2.5 text-indigo-500" /> Trabajos en curso o listos para emitir
          </p>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-slate-200/80 shadow-2xs">
          <div className="flex justify-between items-start">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
                Suplidos Adelantados
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
            <Building2 className="w-2.5 h-2.5 text-amber-500" /> Tasas, notarías y registros pagados
          </p>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-slate-200/80 shadow-2xs">
          <div className="flex justify-between items-start">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
                Anticipos / Provisiones
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
            <CheckCircle2 className="w-2.5 h-2.5 text-emerald-500" /> Fondos ya cobrados a cuenta
          </p>
        </div>

        <div className="bg-gradient-to-br from-slate-900 to-indigo-950 text-white p-3.5 rounded-xl shadow-premium border border-slate-800">
          <div className="flex justify-between items-start">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                Saldo Neto a Cobrar
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
            Honorarios + Suplidos - Provisiones
          </p>
        </div>

      </div>

      {/* BARRA DE FILTROS Y BOTONES DE EXPORTACIÓN (COMPACTA) */}
      <div className="bg-white p-2.5 rounded-xl border border-slate-200/80 shadow-2xs flex flex-col lg:flex-row justify-between items-center gap-2">
        
        {/* Filtros de Pestaña */}
        <div className="flex flex-wrap items-center gap-1 w-full lg:w-auto">
          <button
            onClick={() => setStatusFilter('all')}
            className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition-all ${
              statusFilter === 'all' ? 'bg-indigo-600 text-white shadow-2xs' : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            Todos ({enrichedTasks.length})
          </button>
          <button
            onClick={() => setStatusFilter('pending')}
            className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition-all ${
              statusFilter === 'pending' ? 'bg-indigo-600 text-white shadow-2xs' : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            ⏳ Pendientes
          </button>
          <button
            onClick={() => setStatusFilter('unbilled_closed')}
            className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition-all ${
              statusFilter === 'unbilled_closed' ? 'bg-amber-600 text-white shadow-2xs' : 'text-amber-800 bg-amber-50 hover:bg-amber-100'
            }`}
          >
            ⚠️ Tramitados sin Facturar
          </button>
          <button
            onClick={() => setStatusFilter('with_expenses')}
            className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition-all ${
              statusFilter === 'with_expenses' ? 'bg-indigo-600 text-white shadow-2xs' : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            🧾 Con Suplidos
          </button>
          <button
            onClick={() => setStatusFilter('invoiced')}
            className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition-all ${
              statusFilter === 'invoiced' ? 'bg-indigo-600 text-white shadow-2xs' : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            📑 Facturados
          </button>
          <button
            onClick={() => setStatusFilter('paid')}
            className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition-all ${
              statusFilter === 'paid' ? 'bg-emerald-600 text-white shadow-2xs' : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            ✅ Cobrados
          </button>
        </div>

        {/* Búsqueda, Filtro Cliente y Botones de Exportar */}
        <div className="flex flex-wrap items-center gap-1.5 w-full lg:w-auto">
          
          <div className="relative flex-1 sm:w-48">
            <Search className="absolute left-2.5 top-2 w-3 h-3 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-7 pr-2.5 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs outline-none focus:bg-white focus:ring-1 focus:ring-indigo-500 text-slate-800"
            />
          </div>

          <select
            value={clientFilter}
            onChange={(e) => setClientFilter(e.target.value)}
            className="px-2 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 outline-none max-w-[150px]"
          >
            <option value="">Clientes (todos)</option>
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

      {/* TABLA DE EXPEDIENTES Y LIQUIDACIONES ECONÓMICAS (COMPACTA) */}
      <div className="bg-white rounded-xl border border-slate-200/80 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider text-[10px] font-bold border-b border-slate-200/80">
              <tr>
                <th className="py-2 px-3">Expediente & Cliente</th>
                <th className="py-2 px-2.5">Estado Trámite</th>
                <th className="py-2 px-2.5 text-right">Honorarios</th>
                <th className="py-2 px-2.5 text-right">Suplidos</th>
                <th className="py-2 px-2.5 text-right">Anticipos</th>
                <th 
                  className="py-2 px-2.5 text-right cursor-pointer hover:bg-slate-100 select-none"
                  onClick={() => {
                    setSortField('pendingBalance');
                    setSortAsc(!sortAsc);
                  }}
                >
                  <div className="flex items-center justify-end gap-1">
                    <span>Saldo Pendiente</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>
                <th className="py-2 px-2.5">Estado Facturación</th>
                <th className="py-2 px-2.5 text-center">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredTasks.length === 0 ? (
                <tr>
                  <td colSpan="8" className="text-center py-8 text-slate-400">
                    No hay expedientes que coincidan con los filtros seleccionados.
                  </td>
                </tr>
              ) : (
                filteredTasks.map((t) => {
                  const hasPendingBalance = t.pendingBalance > 0;
                  const isClosedUnbilled = t.isClosedOrProcessed && t.billingType === 'billable' && t.billingStatus === 'pending';

                  return (
                    <tr 
                      key={t.id} 
                      className={`hover:bg-slate-50/80 transition-colors ${
                        isClosedUnbilled ? 'bg-amber-50/30' : ''
                      }`}
                    >
                      {/* Expediente y Cliente */}
                      <td className="py-2 px-3 max-w-xs">
                        <div 
                          className="font-bold text-slate-900 hover:text-indigo-600 cursor-pointer truncate"
                          onClick={() => onEditTask(t)}
                        >
                          {t.title}
                        </div>
                        <div className="text-[11px] text-slate-500 truncate flex items-center gap-1.5 mt-0.5">
                          <span>{t.clientRazonSocial || t.client || 'Sin cliente'}</span>
                          {t.clientNif && (
                            <span className="text-[10px] bg-slate-100 px-1 py-0.2 rounded text-slate-600 font-mono">
                              {t.clientNif}
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
                            ⚠️ Trámite cerrado
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
                            t.billingStatus === 'paid' 
                              ? 'bg-emerald-50 text-emerald-800 border-emerald-200' 
                              : t.billingStatus === 'invoiced'
                              ? 'bg-blue-50 text-blue-800 border-blue-200'
                              : 'bg-amber-50 text-amber-800 border-amber-200'
                          }`}
                        >
                          <option value="pending">⏳ Pendiente</option>
                          <option value="invoiced">📑 Facturado</option>
                          <option value="paid">✅ Cobrado</option>
                        </select>
                        {t.invoiceNumber && (
                          <span className="block text-[9px] text-slate-400 mt-0.5">
                            Fact: {t.invoiceNumber}
                          </span>
                        )}
                      </td>

                      {/* Acciones */}
                      <td className="py-2 px-2.5 text-center whitespace-nowrap">
                        <button
                          onClick={() => onEditTask(t)}
                          className="bg-slate-50 hover:bg-indigo-50 text-slate-600 hover:text-indigo-600 border border-slate-200 hover:border-indigo-200 px-2 py-0.5 rounded-lg text-xs font-semibold transition-all"
                        >
                          Gestionar
                        </button>
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
