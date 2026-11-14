import React, { useState, useMemo, useEffect } from 'react';
import {
  Bell,
  Plus,
  Check,
  Calendar,
  Repeat,
  Pencil,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Clock,
  RotateCcw,
  X,
  AlertCircle
} from 'lucide-react';
import {
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  serverTimestamp
} from 'firebase/firestore';
import { db } from '../firebase';
import {
  RECURRENCE_OPTIONS,
  getLocalTodayStr,
  getEndOfCurrentWeekStr,
  formatReminderDateShort,
  formatWeekdayAndDate,
  classifyReminder,
  computeNextRecurrenceDates,
  getRecurrenceLabel
} from '../utils/reminderUtils';

export default function RemindersSidebar({
  reminders = [],
  currentUser,
  lang = 'ca',
  isCollapsed = false,
  onToggleCollapse,
  mobileOpen = false,
  onCloseMobile
}) {
  const isCa = lang === 'ca';
  const [todayStr, setTodayStr] = useState(() => getLocalTodayStr());
  const [activeTab, setActiveTab] = useState('active'); // 'active' | 'future' | 'done'

  // Mantener la fecha actual sincronizada si la pestaña queda abierta de un día para otro
  useEffect(() => {
    const timer = setInterval(() => {
      const next = getLocalTodayStr();
      setTodayStr(prev => (prev !== next ? next : prev));
    }, 60000);
    return () => clearInterval(timer);
  }, []);

  // Al expandir la barra lateral o abrir el cajón, abrir siempre en "Actius"
  useEffect(() => {
    if (!isCollapsed || mobileOpen) {
      setActiveTab('active');
      setEditingId(null);
    }
  }, [isCollapsed, mobileOpen]);

  const endOfWeekStr = useMemo(() => getEndOfCurrentWeekStr(todayStr), [todayStr]);

  // Estado de entrada rápida inline
  const [quickTitle, setQuickTitle] = useState('');
  const [showQuickOptions, setShowQuickOptions] = useState(false);
  const [quickStartDate, setQuickStartDate] = useState(todayStr);
  const [quickEndDate, setQuickEndDate] = useState(todayStr);
  const [quickRecurrence, setQuickRecurrence] = useState('none');
  const [quickRecurrenceDays, setQuickRecurrenceDays] = useState(7);
  const [isSavingNew, setIsSavingNew] = useState(false);
  const [feedbackToast, setFeedbackToast] = useState('');

  // Sincronizar fechas por defecto si cambia el día mientras el input está limpio
  useEffect(() => {
    if (!quickTitle && !showQuickOptions) {
      setQuickStartDate(todayStr);
      setQuickEndDate(todayStr);
    }
  }, [todayStr, quickTitle, showQuickOptions]);

  // Estado de edición inline de un recordatorio existente
  const [editingId, setEditingId] = useState(null);
  const [editDraft, setEditDraft] = useState({
    title: '',
    startDate: '',
    endDate: '',
    recurrence: 'none',
    recurrenceDays: 7
  });
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  const showToast = (msg) => {
    setFeedbackToast(msg);
    setTimeout(() => {
      setFeedbackToast(prev => (prev === msg ? '' : prev));
    }, 3500);
  };

  // Clasificar todos los recordatorios del usuario
  const { activeItems, futureItems, doneItems, overdueCount } = useMemo(() => {
    const active = [];
    const future = [];
    const done = [];
    let overdue = 0;

    reminders.forEach(item => {
      const meta = classifyReminder(item, todayStr, endOfWeekStr);
      const enriched = { ...item, _meta: meta };
      if (meta.visibility === 'done') {
        done.push(enriched);
      } else if (meta.visibility === 'future') {
        future.push(enriched);
      } else {
        active.push(enriched);
        if (meta.state === 'overdue') overdue++;
      }
    });

    const stateOrder = { overdue: 0, due_today: 1, in_progress: 2, this_week: 3 };
    active.sort((a, b) => {
      const oA = stateOrder[a._meta.state] ?? 9;
      const oB = stateOrder[b._meta.state] ?? 9;
      if (oA !== oB) return oA - oB;
      const endCmp = (a.endDate || '').localeCompare(b.endDate || '');
      if (endCmp !== 0) return endCmp;
      return (a.startDate || '').localeCompare(b.startDate || '');
    });

    future.sort((a, b) => (a.startDate || '').localeCompare(b.startDate || ''));
    done.sort((a, b) => String(b.completedAt || '').localeCompare(String(a.completedAt || '')));

    return {
      activeItems: active,
      futureItems: future,
      doneItems: done.slice(0, 30),
      overdueCount: overdue
    };
  }, [reminders, todayStr, endOfWeekStr]);

  const userEmail = (currentUser?.email || '').toLowerCase().trim();

  const handleQuickCreate = async (e) => {
    if (e) e.preventDefault();
    const title = quickTitle.trim();
    if (!title || !userEmail) return;

    const start = quickStartDate || todayStr;
    const end = quickEndDate && quickEndDate >= start ? quickEndDate : start;
    const recurrence = quickRecurrence || 'none';
    const recDays = recurrence === 'custom_days' ? Math.max(1, parseInt(quickRecurrenceDays || 7, 10) || 7) : null;

    setIsSavingNew(true);
    try {
      await addDoc(collection(db, 'reminders'), {
        userEmail,
        title,
        startDate: start,
        endDate: end,
        recurrence,
        recurrenceDays: recDays,
        isDone: false,
        completedAt: null,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });

      setQuickTitle('');
      setQuickStartDate(todayStr);
      setQuickEndDate(todayStr);
      setQuickRecurrence('none');
      setShowQuickOptions(false);

      if (start > endOfWeekStr) {
        showToast(
          isCa
            ? `Programat per al ${formatReminderDateShort(start, lang, todayStr)} (pestanya Futurs)`
            : `Programado para el ${formatReminderDateShort(start, lang, todayStr)} (pestaña Futuros)`
        );
      }
    } catch (err) {
      alert((isCa ? 'Error en desar el recordatori: ' : 'Error al guardar recordatorio: ') + err.message);
    } finally {
      setIsSavingNew(false);
    }
  };

  const handleToggleDone = async (item) => {
    if (!item?.id) return;
    try {
      const nextDone = !item.isDone;
      await updateDoc(doc(db, 'reminders', item.id), {
        isDone: nextDone,
        completedAt: nextDone ? new Date().toISOString() : null,
        updatedAt: serverTimestamp()
      });

      if (nextDone && item.recurrence && item.recurrence !== 'none') {
        const nextDates = computeNextRecurrenceDates(item);
        if (nextDates) {
          await addDoc(collection(db, 'reminders'), {
            userEmail: item.userEmail || userEmail,
            title: item.title,
            startDate: nextDates.startDate,
            endDate: nextDates.endDate,
            recurrence: item.recurrence,
            recurrenceDays: item.recurrenceDays || null,
            isDone: false,
            completedAt: null,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp()
          });
          showToast(
            isCa
              ? `↻ Proper avís programat: ${formatReminderDateShort(nextDates.startDate, lang, todayStr)}`
              : `↻ Próximo aviso programado: ${formatReminderDateShort(nextDates.startDate, lang, todayStr)}`
          );
        }
      }
    } catch (err) {
      alert((isCa ? 'Error en actualitzar recordatori: ' : 'Error al actualizar recordatorio: ') + err.message);
    }
  };

  const startEditing = (item) => {
    setEditingId(item.id);
    setEditDraft({
      title: item.title || '',
      startDate: item.startDate || todayStr,
      endDate: item.endDate || item.startDate || todayStr,
      recurrence: item.recurrence || 'none',
      recurrenceDays: item.recurrenceDays || 7
    });
  };

  const handleSaveEdit = async (e) => {
    if (e) e.preventDefault();
    if (!editingId || !editDraft.title.trim()) return;
    const start = editDraft.startDate || todayStr;
    const end = editDraft.endDate && editDraft.endDate >= start ? editDraft.endDate : start;
    const rec = editDraft.recurrence || 'none';
    const recDays = rec === 'custom_days' ? Math.max(1, parseInt(editDraft.recurrenceDays || 7, 10) || 7) : null;

    setIsSavingEdit(true);
    try {
      await updateDoc(doc(db, 'reminders', editingId), {
        title: editDraft.title.trim(),
        startDate: start,
        endDate: end,
        recurrence: rec,
        recurrenceDays: recDays,
        updatedAt: serverTimestamp()
      });
      setEditingId(null);
    } catch (err) {
      alert((isCa ? 'Error en editar recordatori: ' : 'Error al editar recordatorio: ') + err.message);
    } finally {
      setIsSavingEdit(false);
    }
  };

  const handleDeleteReminder = async (itemOrId, askConfirm = false) => {
    const id = typeof itemOrId === 'string' ? itemOrId : itemOrId?.id;
    const title = typeof itemOrId === 'object' ? itemOrId?.title : '';
    if (!id) return;
    if (askConfirm) {
      const msg = isCa
        ? `Voleu eliminar el recordatori "${title}"?`
        : `¿Deseas eliminar el recordatorio "${title}"?`;
      if (!window.confirm(msg)) return;
    }
    try {
      await deleteDoc(doc(db, 'reminders', id));
      if (editingId === id) setEditingId(null);
    } catch (err) {
      alert((isCa ? 'Error en eliminar recordatori: ' : 'Error al eliminar recordatorio: ') + err.message);
    }
  };

  const displayedItems = activeTab === 'active' ? activeItems : activeTab === 'future' ? futureItems : doneItems;

  // Versión colapsada por defecto en escritorio: muestra campana evidente si hay activos
  const renderCollapsedDesktopStrip = () => (
    <aside className="hidden lg:flex flex-col items-center py-3 px-1.5 bg-white border border-slate-200/90 rounded-2xl shadow-xs w-11 shrink-0 sticky top-[64px] gap-2.5">
      <button
        type="button"
        onClick={onToggleCollapse}
        className="w-8 h-8 rounded-xl bg-slate-100 hover:bg-indigo-50 text-slate-600 hover:text-indigo-700 flex items-center justify-center transition-colors cursor-pointer"
        title={isCa ? 'Obrir recordatoris' : 'Abrir recordatorios'}
      >
        <ChevronRight className="w-4 h-4" />
      </button>

      <button
        type="button"
        onClick={onToggleCollapse}
        className={`w-8 h-8 rounded-xl flex items-center justify-center relative transition-colors cursor-pointer ${
          overdueCount > 0
            ? 'bg-rose-50 text-rose-600 border border-rose-300 ring-2 ring-rose-400/50 animate-pulse'
            : activeItems.length > 0
            ? 'bg-amber-50 text-amber-600 border border-amber-300 ring-2 ring-amber-400/40'
            : 'bg-slate-50 text-slate-400 border border-slate-200 hover:text-slate-600'
        }`}
        title={
          activeItems.length > 0
            ? (isCa ? `Recordatoris actius: ${activeItems.length}${overdueCount > 0 ? ` (${overdueCount} vençuts)` : ''}` : `Recordatorios activos: ${activeItems.length}${overdueCount > 0 ? ` (${overdueCount} vencidos)` : ''}`)
            : (isCa ? 'Sense recordatoris actius' : 'Sin recordatorios activos')
        }
      >
        <Bell className="w-4 h-4" />
        {activeItems.length > 0 && (
          <span className={`absolute -top-1.5 -right-1.5 min-w-[16px] h-4 px-1 rounded-full text-[9px] font-extrabold text-white flex items-center justify-center shadow-xs ${
            overdueCount > 0 ? 'bg-rose-600' : 'bg-indigo-600'
          }`}>
            {activeItems.length}
          </span>
        )}
      </button>

      <span className="text-[9px] font-bold uppercase tracking-widest text-slate-400 [writing-mode:vertical-rl] rotate-180 select-none py-1">
        {isCa ? 'Recordatoris' : 'Recordatorios'}
      </span>
    </aside>
  );

  const panelContent = (
    <div className="bg-white border border-slate-200/90 rounded-2xl shadow-sm flex flex-col overflow-hidden">
      {/* Cabecera del panel */}
      <div className="px-3 py-2.5 bg-gradient-to-r from-[#152427] to-[#1e3539] text-white flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <div className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 ${
            overdueCount > 0 ? 'bg-rose-500 text-white animate-pulse' : 'bg-[#7dc2b8]/20 text-[#7dc2b8]'
          }`}>
            <Bell className="w-3.5 h-3.5" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-extrabold tracking-tight truncate">
                {isCa ? 'Recordatoris' : 'Recordatorios'}
              </span>
              {activeItems.length > 0 && (
                <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-extrabold ${
                  overdueCount > 0 ? 'bg-rose-500 text-white' : 'bg-white/15 text-teal-200'
                }`}>
                  {activeItems.length}
                </span>
              )}
            </div>
            {overdueCount > 0 && (
              <p className="text-[9px] text-rose-200 font-semibold leading-tight">
                {overdueCount} {overdueCount === 1 ? (isCa ? 'vençut' : 'vencido') : (isCa ? 'vençuts' : 'vencidos')}
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          {onToggleCollapse && !mobileOpen && (
            <button
              type="button"
              onClick={onToggleCollapse}
              className="hidden lg:flex w-6 h-6 rounded-lg hover:bg-white/10 text-slate-300 hover:text-white items-center justify-center transition-colors cursor-pointer"
              title={isCa ? 'Replegar lateral' : 'Replegar lateral'}
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
          )}
          {mobileOpen && onCloseMobile && (
            <button
              type="button"
              onClick={onCloseMobile}
              className="lg:hidden w-6 h-6 rounded-lg hover:bg-white/10 text-slate-300 hover:text-white flex items-center justify-center cursor-pointer"
              title={isCa ? 'Tancar' : 'Cerrar'}
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Entrada rápida inline (1 línea + Enter o +Opciones de fecha/recurrencia) */}
      <form onSubmit={handleQuickCreate} className="p-2.5 bg-slate-50/90 border-b border-slate-200/80 space-y-2">
        <div className="flex items-center gap-1">
          <input
            type="text"
            value={quickTitle}
            onChange={(e) => setQuickTitle(e.target.value)}
            placeholder={isCa ? '+ Nou recordatori (Enter)...' : '+ Nuevo recordatorio (Enter)...'}
            className="flex-1 min-w-0 px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs text-slate-800 placeholder:text-slate-400 outline-none focus:ring-1 focus:ring-teal-500 focus:border-teal-500"
          />
          <button
            type="button"
            onClick={() => setShowQuickOptions(prev => !prev)}
            className={`p-1.5 rounded-lg border text-xs transition-colors cursor-pointer shrink-0 ${
              showQuickOptions || quickStartDate !== todayStr || quickEndDate !== todayStr || quickRecurrence !== 'none'
                ? 'bg-teal-50 text-teal-700 border-teal-300'
                : 'bg-white text-slate-500 border-slate-300 hover:text-slate-800'
            }`}
            title={isCa ? 'Dates i recurrència' : 'Fechas y recurrencia'}
          >
            <Calendar className="w-3.5 h-3.5" />
          </button>
          <button
            type="submit"
            disabled={!quickTitle.trim() || isSavingNew}
            className="p-1.5 rounded-lg bg-[#152427] hover:bg-[#1f363a] disabled:bg-slate-300 text-white transition-colors cursor-pointer shrink-0"
            title={isCa ? 'Afegir recordatori' : 'Añadir recordatorio'}
          >
            <Plus className="w-3.5 h-3.5" />
          </button>
        </div>

        {(showQuickOptions || quickStartDate !== todayStr || quickEndDate !== todayStr || quickRecurrence !== 'none') && (
          <div className="bg-white border border-slate-200 rounded-xl p-2 space-y-2 text-[11px] animate-in fade-in duration-150">
            {/* Fechas inicio y fin */}
            <div className="grid grid-cols-2 gap-1.5">
              <div>
                <label className="text-[9px] font-bold uppercase text-slate-500 block mb-0.5">
                  {isCa ? 'Inici' : 'Inicio'}
                </label>
                <input
                  type="date"
                  value={quickStartDate}
                  onChange={(e) => {
                    const val = e.target.value;
                    setQuickStartDate(val);
                    if (val && quickEndDate < val) setQuickEndDate(val);
                  }}
                  className="w-full px-1.5 py-1 border border-slate-200 rounded text-[11px] text-slate-800 outline-none focus:border-teal-500"
                />
              </div>
              <div>
                <label className="text-[9px] font-bold uppercase text-slate-500 block mb-0.5">
                  {isCa ? 'Fi / Límit' : 'Fin / Límite'}
                </label>
                <input
                  type="date"
                  value={quickEndDate}
                  min={quickStartDate}
                  onChange={(e) => setQuickEndDate(e.target.value)}
                  className="w-full px-1.5 py-1 border border-slate-200 rounded text-[11px] text-slate-800 outline-none focus:border-teal-500"
                />
              </div>
            </div>

            {/* Recurrencia estilo Outlook */}
            <div className="flex items-center gap-1.5">
              <div className="flex-1">
                <label className="text-[9px] font-bold uppercase text-slate-500 block mb-0.5 flex items-center gap-1">
                  <Repeat className="w-2.5 h-2.5 text-teal-600" />
                  <span>{isCa ? 'Repetició' : 'Recurrencia'}</span>
                </label>
                <select
                  value={quickRecurrence}
                  onChange={(e) => setQuickRecurrence(e.target.value)}
                  className="w-full px-1.5 py-1 border border-slate-200 rounded text-[11px] bg-white text-slate-800 outline-none focus:border-teal-500"
                >
                  {RECURRENCE_OPTIONS.map(opt => (
                    <option key={opt.value} value={opt.value}>
                      {isCa ? opt.labelCa : opt.labelEs}
                    </option>
                  ))}
                </select>
              </div>
              {quickRecurrence === 'custom_days' && (
                <div className="w-14">
                  <label className="text-[9px] font-bold uppercase text-slate-500 block mb-0.5">
                    {isCa ? 'Dies' : 'Días'}
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={quickRecurrenceDays}
                    onChange={(e) => setQuickRecurrenceDays(e.target.value)}
                    className="w-full px-1.5 py-1 border border-slate-200 rounded text-[11px] text-slate-800 outline-none focus:border-teal-500"
                  />
                </div>
              )}
            </div>
          </div>
        )}

        {feedbackToast && (
          <div className="text-[10px] font-semibold text-teal-800 bg-teal-50 border border-teal-200 rounded-lg px-2 py-1 flex items-center gap-1">
            <Repeat className="w-3 h-3 text-teal-600 shrink-0" />
            <span className="truncate">{feedbackToast}</span>
          </div>
        )}
      </form>

      {/* Subpestañas compactas: Actius (setmana actual + vençuts) | Futurs | Fets */}
      <div className="px-2 py-1.5 bg-white border-b border-slate-100 flex items-center gap-1 text-[10px]">
        <button
          type="button"
          onClick={() => setActiveTab('active')}
          className={`flex-1 py-1 px-1.5 rounded-lg font-bold transition-colors cursor-pointer ${
            activeTab === 'active' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          {isCa ? 'Actius' : 'Activos'} ({activeItems.length})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('future')}
          className={`py-1 px-1.5 rounded-lg font-semibold transition-colors cursor-pointer ${
            activeTab === 'future' ? 'bg-indigo-600 text-white' : 'text-slate-500 hover:bg-slate-100'
          }`}
          title={isCa ? 'Recordatoris amb inici posterior a aquesta setmana' : 'Recordatorios con inicio posterior a esta semana'}
        >
          {isCa ? 'Futurs' : 'Futuros'} ({futureItems.length})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('done')}
          className={`py-1 px-1.5 rounded-lg font-semibold transition-colors cursor-pointer ${
            activeTab === 'done' ? 'bg-emerald-600 text-white' : 'text-slate-500 hover:bg-slate-100'
          }`}
        >
          {isCa ? 'Fets' : 'Hechos'} ({doneItems.length})
        </button>
      </div>

      {/* Lista de Recordatorios estilo líneas Outlook To-Do */}
      <div className="p-2 space-y-1.5 overflow-y-auto max-h-[calc(100vh-270px)] min-h-[140px]">
        {displayedItems.length === 0 ? (
          <div className="py-7 px-3 text-center text-slate-400 text-[11px] space-y-1">
            <Clock className="w-5 h-5 mx-auto text-slate-300" />
            <p className="font-medium">
              {activeTab === 'active'
                ? (isCa ? 'Cap recordatori pendent per aquesta setmana.' : 'Sin recordatorios pendientes para esta semana.')
                : activeTab === 'future'
                ? (isCa ? 'Cap recordatori programat per a properes setmanes.' : 'Sin recordatorios programados para próximas semanas.')
                : (isCa ? 'Encara no hi ha recordatoris completats.' : 'Aún no hay recordatorios completados.')}
            </p>
          </div>
        ) : (
          displayedItems.map(item => {
            const { state, daysOverdue } = item._meta;
            const isOverdue = state === 'overdue';
            const isDueToday = state === 'due_today';
            const isThisWeek = state === 'this_week';
            const isEditing = editingId === item.id;
            const recLabel = getRecurrenceLabel(item.recurrence, item.recurrenceDays, lang);

            if (isEditing) {
              return (
                <form
                  key={item.id}
                  onSubmit={handleSaveEdit}
                  className="p-2 rounded-xl border border-indigo-300 bg-indigo-50/40 space-y-1.5 text-[11px]"
                >
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => {
                        setEditingId(null);
                        handleToggleDone(item);
                      }}
                      className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-all cursor-pointer ${
                        item.isDone
                          ? 'bg-emerald-600 border-emerald-600 text-white'
                          : isOverdue
                          ? 'bg-white border-rose-400 hover:bg-rose-600 hover:border-rose-600 hover:text-white text-transparent'
                          : 'bg-white border-slate-300 hover:bg-emerald-600 hover:border-emerald-600 hover:text-white text-transparent'
                      }`}
                      title={
                        item.isDone
                          ? (isCa ? 'Reactivar recordatori' : 'Reactivar recordatorio')
                          : (isCa ? 'Marcar com a realitzat' : 'Marcar como realizado')
                      }
                    >
                      {item.isDone ? <RotateCcw className="w-2.5 h-2.5" /> : <Check className="w-2.5 h-2.5" />}
                    </button>

                    <input
                      type="text"
                      value={editDraft.title}
                      onChange={(e) => setEditDraft(prev => ({ ...prev, title: e.target.value }))}
                      className="flex-1 min-w-0 px-2 py-1 bg-white border border-slate-300 rounded text-xs font-semibold text-slate-800 outline-none focus:border-indigo-500"
                      autoFocus
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-1">
                    <div>
                      <span className="text-[9px] font-bold text-slate-500 uppercase block">{isCa ? 'Inici' : 'Inicio'}</span>
                      <input
                        type="date"
                        value={editDraft.startDate}
                        onChange={(e) => {
                          const v = e.target.value;
                          setEditDraft(prev => ({
                            ...prev,
                            startDate: v,
                            endDate: v && prev.endDate < v ? v : prev.endDate
                          }));
                        }}
                        className="w-full px-1 py-0.5 bg-white border border-slate-200 rounded text-[10px]"
                      />
                    </div>
                    <div>
                      <span className="text-[9px] font-bold text-slate-500 uppercase block">{isCa ? 'Fi / Límit' : 'Fin / Límite'}</span>
                      <input
                        type="date"
                        value={editDraft.endDate}
                        min={editDraft.startDate}
                        onChange={(e) => setEditDraft(prev => ({ ...prev, endDate: e.target.value }))}
                        className="w-full px-1 py-0.5 bg-white border border-slate-200 rounded text-[10px]"
                      />
                    </div>
                  </div>

                  <div className="flex items-center gap-1">
                    <select
                      value={editDraft.recurrence}
                      onChange={(e) => setEditDraft(prev => ({ ...prev, recurrence: e.target.value }))}
                      className="flex-1 px-1.5 py-0.5 bg-white border border-slate-200 rounded text-[10px]"
                    >
                      {RECURRENCE_OPTIONS.map(opt => (
                        <option key={opt.value} value={opt.value}>{isCa ? opt.labelCa : opt.labelEs}</option>
                      ))}
                    </select>
                    {editDraft.recurrence === 'custom_days' && (
                      <input
                        type="number"
                        min="1"
                        value={editDraft.recurrenceDays}
                        onChange={(e) => setEditDraft(prev => ({ ...prev, recurrenceDays: e.target.value }))}
                        className="w-12 px-1 py-0.5 bg-white border border-slate-200 rounded text-[10px]"
                      />
                    )}
                  </div>

                  <div className="flex items-center justify-between pt-1">
                    <button
                      type="button"
                      onClick={() => handleDeleteReminder(item, true)}
                      className="text-rose-600 hover:bg-rose-50 px-1.5 py-1 rounded text-[10px] font-bold flex items-center gap-0.5 cursor-pointer"
                    >
                      <Trash2 className="w-3 h-3" />
                      <span>{isCa ? 'Eliminar' : 'Eliminar'}</span>
                    </button>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => setEditingId(null)}
                        className="px-2 py-1 text-[10px] font-semibold text-slate-600 hover:bg-slate-200 rounded cursor-pointer"
                      >
                        {isCa ? 'Cancel·lar' : 'Cancelar'}
                      </button>
                      <button
                        type="submit"
                        disabled={isSavingEdit}
                        className="px-2 py-1 text-[10px] font-bold bg-indigo-600 hover:bg-indigo-700 text-white rounded cursor-pointer"
                      >
                        {isCa ? 'Desar' : 'Guardar'}
                      </button>
                    </div>
                  </div>
                </form>
              );
            }

            return (
              <div
                key={item.id}
                className={`group rounded-xl border px-2 py-1.5 transition-all flex items-start gap-2 ${
                  item.isDone
                    ? 'bg-slate-50/70 border-slate-200/70 opacity-75'
                    : isOverdue
                    ? 'bg-rose-50 border-rose-300 shadow-2xs'
                    : isDueToday
                    ? 'bg-amber-50/60 border-amber-200/90'
                    : isThisWeek
                    ? 'bg-slate-50/90 border-slate-200/90'
                    : 'bg-white border-slate-200 hover:border-slate-300'
                }`}
              >
                {/* Checkbox Realizar */}
                <button
                  type="button"
                  onClick={() => handleToggleDone(item)}
                  className={`mt-0.5 w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-all cursor-pointer ${
                    item.isDone
                      ? 'bg-emerald-600 border-emerald-600 text-white'
                      : isOverdue
                      ? 'bg-white border-rose-400 hover:bg-rose-600 hover:border-rose-600 hover:text-white text-transparent'
                      : 'bg-white border-slate-300 hover:bg-emerald-600 hover:border-emerald-600 hover:text-white text-transparent'
                  }`}
                  title={
                    item.isDone
                      ? (isCa ? 'Reactivar recordatori' : 'Reactivar recordatorio')
                      : (isCa ? 'Marcar com a realitzat' : 'Marcar como realizado')
                  }
                >
                  {item.isDone ? <RotateCcw className="w-2.5 h-2.5" /> : <Check className="w-2.5 h-2.5" />}
                </button>

                {/* Contenido en línea estrecha */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-1">
                    <button
                      type="button"
                      onClick={() => startEditing(item)}
                      className={`text-left text-[11.5px] leading-snug font-semibold break-words cursor-pointer hover:underline ${
                        item.isDone
                          ? 'line-through text-slate-400'
                          : isOverdue
                          ? 'text-rose-900'
                          : isThisWeek
                          ? 'text-slate-700'
                          : 'text-slate-800'
                      }`}
                      title={item.title}
                    >
                      {item.title}
                    </button>

                    <div className="flex items-center gap-0.5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        type="button"
                        onClick={() => startEditing(item)}
                        className="text-slate-400 hover:text-indigo-600 p-0.5 cursor-pointer"
                        title={isCa ? 'Editar' : 'Editar'}
                      >
                        <Pencil className="w-3 h-3" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteReminder(item, true)}
                        className="text-slate-400 hover:text-rose-600 p-0.5 cursor-pointer"
                        title={isCa ? 'Eliminar' : 'Eliminar'}
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>

                  {/* Línea sutil de fechas + estado + recurrencia */}
                  <div className="flex flex-wrap items-center gap-1 mt-0.5 text-[9.5px]">
                    {isOverdue ? (
                      <span className="inline-flex items-center gap-0.5 font-extrabold text-rose-700 bg-rose-100 px-1.5 py-0.2 rounded">
                        <AlertCircle className="w-2.5 h-2.5" />
                        +{daysOverdue}d {isCa ? 'vençut' : 'vencido'} ({formatReminderDateShort(item.endDate, lang, todayStr)})
                      </span>
                    ) : isThisWeek ? (
                      <span className="inline-flex items-center gap-0.5 font-semibold text-indigo-700 bg-indigo-50 px-1.5 py-0.2 rounded border border-indigo-200/70">
                        {formatWeekdayAndDate(item.startDate, lang)}
                        {item.endDate && item.endDate !== item.startDate ? ` → ${formatReminderDateShort(item.endDate, lang, todayStr)}` : ''}
                      </span>
                    ) : activeTab === 'future' ? (
                      <span className="inline-flex items-center gap-0.5 font-semibold text-slate-600 bg-slate-100 px-1.5 py-0.2 rounded">
                        {formatReminderDateShort(item.startDate, lang, todayStr)}
                        {item.endDate && item.endDate !== item.startDate ? ` → ${formatReminderDateShort(item.endDate, lang, todayStr)}` : ''}
                      </span>
                    ) : (
                      <span className={`font-semibold ${isDueToday ? 'text-amber-700' : 'text-slate-500'}`}>
                        {item.startDate === item.endDate
                          ? formatReminderDateShort(item.endDate, lang, todayStr)
                          : `${formatReminderDateShort(item.startDate, lang, todayStr)} → ${formatReminderDateShort(item.endDate, lang, todayStr)}`}
                      </span>
                    )}

                    {recLabel && (
                      <span
                        className={`inline-flex items-center gap-0.5 px-1 py-0.2 rounded font-semibold ${
                          isOverdue ? 'bg-rose-100/80 text-rose-700' : 'bg-teal-50 text-teal-700 border border-teal-200/70'
                        }`}
                        title={recLabel}
                      >
                        <Repeat className="w-2.5 h-2.5" />
                        <span>{recLabel}</span>
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );

  return (
    <>
      {/* Lateral izquierdo fijo en escritorio */}
      {isCollapsed ? (
        renderCollapsedDesktopStrip()
      ) : (
        <aside className="hidden lg:block w-[265px] xl:w-[275px] shrink-0 sticky top-[64px]">
          {panelContent}
        </aside>
      )}

      {/* Drawer móvil / tablet (< lg) */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div className="fixed inset-0 bg-slate-950/50 backdrop-blur-xs" onClick={onCloseMobile} />
          <div className="relative z-10 w-[300px] max-w-[88vw] h-full p-2.5 bg-slate-100 overflow-y-auto shadow-2xl animate-in slide-in-from-left duration-150">
            {panelContent}
          </div>
        </div>
      )}
    </>
  );
}
