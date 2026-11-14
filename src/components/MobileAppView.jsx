import React, { useState, useMemo } from 'react';
import {
  Briefcase,
  Target,
  Bell,
  Search,
  Plus,
  Zap,
  Phone,
  MessageCircle,
  Mail,
  Mic,
  Camera,
  Check,
  CheckCircle2,
  Circle,
  Pencil,
  Trash2,
  Monitor,
  LogOut,
  X,
  Calendar,
  Repeat,
  Clock,
  ChevronRight,
  Building2,
  FileText,
  Save,
  Loader2,
  Eye,
  EyeOff,
  User,
  Users
} from 'lucide-react';
import { signOut } from 'firebase/auth';
import {
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  serverTimestamp
} from 'firebase/firestore';
import { db, auth } from '../firebase';
import ClientAutocomplete from './ClientAutocomplete';
import MobileExpedienteDetail from './MobileExpedienteDetail';
import { buildTelHref, buildWhatsAppHref } from '../utils/contactUtils';
import { findClientForTask } from '../utils/billingUtils';
import { translateClassificationName } from '../utils/classificationI18n';
import {
  RECURRENCE_OPTIONS,
  getLocalTodayStr,
  getEndOfCurrentWeekStr,
  classifyReminder,
  computeNextRecurrenceDates,
  formatReminderDateShort,
  formatWeekdayAndDate,
  getRecurrenceLabel
} from '../utils/reminderUtils';

const STATUS_BADGE_MAP = {
  Abierto: 'bg-sky-50 text-sky-700 border-sky-200',
  'En Curso': 'bg-indigo-50 text-indigo-700 border-indigo-200',
  Pendiente: 'bg-amber-50 text-amber-700 border-amber-200',
  Cerrado: 'bg-emerald-50 text-emerald-700 border-emerald-200'
};

function getNormalizedStatus(task) {
  const raw = String(task?.status || 'Abierto').trim();
  const lower = raw.toLowerCase();
  if (lower.includes('cerrad') || lower.includes('tancat') || lower.includes('complet') || lower.includes('fet')) return 'Cerrado';
  if (lower.includes('pend')) return 'Pendiente';
  if (lower.includes('curs') || lower.includes('progr')) return 'En Curso';
  return 'Abierto';
}

function getEffectiveStatusMobile(task) {
  const st = getNormalizedStatus(task);
  if (st !== 'Cerrado' && task?.dueDate && task.dueDate < getLocalTodayStr()) {
    return 'Vencido';
  }
  return st;
}

function isUserAssigned(task, userEmail) {
  if (!userEmail) return false;
  const email = userEmail.toLowerCase();
  const assignees = Array.isArray(task?.assignees) ? task.assignees : [];
  if (assignees.some(a => String(a || '').toLowerCase() === email)) return true;
  if (String(task?.assigneeEmail || '').toLowerCase() === email) return true;
  if (String(task?.createdBy || '').toLowerCase() === email) return true;
  const actions = Array.isArray(task?.actions) ? task.actions : [];
  return actions.some(a => String(a?.assignee || '').toLowerCase() === email);
}

export default function MobileAppView({
  tasks = [],
  clientes = [],
  areas = [],
  tramos = [],
  usersList = [],
  reminders = [],
  currentUser,
  isAdmin = false,
  lang = 'ca',
  setLang,
  logAction,
  onOpenNewVariable,
  onSwitchToDesktop
}) {
  const isCa = lang === 'ca';
  const [activeTab, setActiveTab] = useState('expedients'); // 'expedients' | 'gtd' | 'reminders'
  const [searchTerm, setSearchTerm] = useState('');
  const [scopeFilter, setScopeFilter] = useState('mine'); // 'mine' | 'all'
  const [typeFilter, setTypeFilter] = useState('all'); // 'all' | 'expediente' | 'variable'
  const [hideClosed, setHideClosed] = useState(true);

  const [selectedTaskId, setSelectedTaskId] = useState(null);
  const [detailInitialTab, setDetailInitialTab] = useState('resum');
  const [focusedStepId, setFocusedStepId] = useState(null);

  // Nuevo expediente rápido
  const [showNewExpSheet, setShowNewExpSheet] = useState(false);
  const [savingNewExp, setSavingNewExp] = useState(false);
  const [newExpForm, setNewExpForm] = useState(() => ({
    title: '',
    client: '',
    clientNif: '',
    clientRazonSocial: '',
    isProvisionalClient: false,
    department: areas[0]?.nombre || 'Fiscal',
    type: tramos[0]?.nombre || 'Puntual',
    dueDate: '',
    description: ''
  }));

  // GTD states
  const [gtdScope, setGtdScope] = useState('mine'); // 'mine' | 'all'
  const [togglingStepKey, setTogglingStepKey] = useState(null);

  // Recordatorios states
  const [reminderSubTab, setReminderSubTab] = useState('active'); // 'active' | 'future' | 'done'
  const [showReminderSheet, setShowReminderSheet] = useState(false);
  const [editingReminder, setEditingReminder] = useState(null);
  const [savingReminder, setSavingReminder] = useState(false);
  const [remForm, setRemForm] = useState({
    title: '',
    startDate: getLocalTodayStr(),
    endDate: getLocalTodayStr(),
    recurrence: 'none',
    recurrenceDays: 7
  });

  const liveSelectedTask = useMemo(
    () => tasks.find(t => t.id === selectedTaskId) || null,
    [tasks, selectedTaskId]
  );

  // --- EXPEDIENTES Y VARIABLES FILTRADOS ---
  const filteredTasks = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    return tasks
      .filter(task => {
        if (scopeFilter === 'mine' && !isUserAssigned(task, currentUser?.email)) {
          return false;
        }
        const isVar = task?.recordType === 'variable';
        if (typeFilter === 'variable' && !isVar) return false;
        if (typeFilter === 'expediente' && isVar) return false;

        const normSt = getNormalizedStatus(task);
        if (hideClosed && normSt === 'Cerrado') return false;

        if (term) {
          const hay = `${task.title || ''} ${task.client || ''} ${task.clientNif || ''} ${task.clientRazonSocial || ''} ${task.department || ''}`.toLowerCase();
          if (!hay.includes(term)) return false;
        }
        return true;
      })
      .sort((a, b) => {
        const aClosed = getNormalizedStatus(a) === 'Cerrado' ? 1 : 0;
        const bClosed = getNormalizedStatus(b) === 'Cerrado' ? 1 : 0;
        if (aClosed !== bClosed) return aClosed - bClosed;
        const aDate = a.dueDate || '9999-12-31';
        const bDate = b.dueDate || '9999-12-31';
        return aDate.localeCompare(bDate);
      });
  }, [tasks, scopeFilter, typeFilter, hideClosed, searchTerm, currentUser?.email]);

  // --- PASOS GTD PENDIENTES ---
  const gtdItems = useMemo(() => {
    const emailLower = String(currentUser?.email || '').toLowerCase();
    const list = [];
    tasks.forEach(task => {
      if (getNormalizedStatus(task) === 'Cerrado') return;
      const actions = Array.isArray(task.actions) ? task.actions : [];
      actions.forEach(step => {
        if (step.isCompleted) return;
        const stepAssignee = String(step.assignee || '').toLowerCase();
        if (gtdScope === 'mine' || !isAdmin) {
          if (stepAssignee && stepAssignee !== emailLower) return;
          if (!stepAssignee && !isUserAssigned(task, currentUser?.email)) return;
        }
        list.push({
          key: `${task.id}_${step.id}`,
          task,
          step
        });
      });
    });

    return list.sort((a, b) => {
      const aDate = a.task.dueDate || '9999-12-31';
      const bDate = b.task.dueDate || '9999-12-31';
      return aDate.localeCompare(bDate);
    });
  }, [tasks, currentUser?.email, gtdScope, isAdmin]);

  // --- RECORDATORIOS CLASIFICADOS ---
  const todayStr = getLocalTodayStr();
  const endOfWeekStr = getEndOfCurrentWeekStr(todayStr);

  const classifiedReminders = useMemo(() => {
    const groups = { active: [], future: [], done: [], overdueCount: 0 };
    reminders.forEach(rem => {
      const meta = classifyReminder(rem, todayStr, endOfWeekStr);
      const item = { ...rem, _meta: meta };
      if (meta.visibility === 'active') {
        groups.active.push(item);
        if (meta.state === 'overdue') groups.overdueCount += 1;
      } else if (meta.visibility === 'future') {
        groups.future.push(item);
      } else {
        groups.done.push(item);
      }
    });

    groups.active.sort((a, b) => {
      const aOv = a._meta.state === 'overdue' ? 0 : 1;
      const bOv = b._meta.state === 'overdue' ? 0 : 1;
      if (aOv !== bOv) return aOv - bOv;
      return (a.endDate || a.startDate || '').localeCompare(b.endDate || b.startDate || '');
    });
    groups.future.sort((a, b) => (a.startDate || '').localeCompare(b.startDate || ''));
    groups.done.sort((a, b) => (b.completedAt || '').localeCompare(a.completedAt || ''));

    return groups;
  }, [reminders, todayStr, endOfWeekStr]);

  const openTaskDetail = (task, initialTab = 'resum', stepId = null) => {
    setDetailInitialTab(initialTab);
    setFocusedStepId(stepId);
    setSelectedTaskId(task.id);
  };

  // --- CREAR EXPEDIENTE RÁPIDO MÓVIL ---
  const handleOpenNewExp = () => {
    setNewExpForm({
      title: '',
      client: '',
      clientNif: '',
      clientRazonSocial: '',
      isProvisionalClient: false,
      department: areas[0]?.nombre || 'Fiscal',
      type: tramos[0]?.nombre || 'Puntual',
      dueDate: '',
      description: ''
    });
    setShowNewExpSheet(true);
  };

  const handleSaveNewExpediente = async (e) => {
    e.preventDefault();
    if (!newExpForm.title.trim() || !newExpForm.client.trim()) {
      alert(isCa ? 'Introdueix títol i client.' : 'Introduce título y cliente.');
      return;
    }

    const clientExists = clientes.some(c => {
      const cNif = (c.nif || '').toUpperCase().trim();
      const cRazon = (c.razonSocial || '').toLowerCase().trim();
      const formClient = (newExpForm.client || '').toLowerCase().trim();
      const formNif = (newExpForm.clientNif || '').toUpperCase().trim();
      if (formNif && formNif === cNif) return true;
      if (cNif && formClient.includes(cNif.toLowerCase())) return true;
      if (cRazon && formClient === cRazon) return true;
      return false;
    });

    setSavingNewExp(true);
    try {
      const payload = {
        recordType: 'expediente',
        title: newExpForm.title.trim(),
        client: newExpForm.client.trim(),
        clientNif: newExpForm.clientNif || '',
        clientRazonSocial: newExpForm.clientRazonSocial || newExpForm.client.trim(),
        isProvisionalClient: Boolean(newExpForm.isProvisionalClient || !clientExists),
        department: newExpForm.department,
        area: newExpForm.department,
        type: newExpForm.type,
        tramo: newExpForm.type,
        status: 'Abierto',
        dueDate: newExpForm.dueDate || '',
        originalDueDate: newExpForm.dueDate || '',
        description: newExpForm.description.trim(),
        assignees: currentUser?.email ? [currentUser.email] : [],
        actions: [],
        updates: [],
        attachments: [],
        billingType: 'billable',
        esFacturable: true,
        feeAmount: 0,
        precioHonorarios: 0,
        billingStatus: 'pending',
        createdBy: currentUser?.email || '',
        updatedBy: currentUser?.email || '',
        createdAt: serverTimestamp(),
        lastUpdated: serverTimestamp()
      };
      await addDoc(collection(db, 'expedientes'), payload);
      logAction?.('Creado Expediente (Mòbil)', `${payload.title} · ${payload.client}`);
      setShowNewExpSheet(false);
    } catch (err) {
      console.error('Error creating expediente from mobile:', err);
      alert(isCa ? "No s'ha pogut crear l'expedient." : 'No se pudo crear el expediente.');
    } finally {
      setSavingNewExp(false);
    }
  };

  // --- COMPLETAR PASO GTD ---
  const handleToggleGtdStep = async (task, step) => {
    const key = `${task.id}_${step.id}`;
    setTogglingStepKey(key);
    try {
      const nextCompleted = !step.isCompleted;
      const updatedActions = (task.actions || []).map(a =>
        a.id === step.id
          ? {
              ...a,
              isCompleted: nextCompleted,
              completedAt: nextCompleted ? new Date().toISOString() : null
            }
          : a
      );
      const payload = {
        actions: updatedActions,
        lastUpdated: serverTimestamp(),
        updatedBy: currentUser?.email || ''
      };
      if (task.recordType === 'variable') {
        payload.status = nextCompleted ? 'Cerrado' : 'Abierto';
      }
      await updateDoc(doc(db, 'expedientes', task.id), payload).catch(async () => {
        await updateDoc(doc(db, 'tasks', task.id), payload);
      });
      logAction?.(nextCompleted ? 'GTD Completado (Mòbil)' : 'GTD Reabierto (Mòbil)', `${task.title}: ${step.text}`);
    } catch (err) {
      console.error('Error toggling GTD step:', err);
    } finally {
      setTogglingStepKey(null);
    }
  };

  // --- RECORDATORIOS CRUD ---
  const handleOpenNewReminder = () => {
    const today = getLocalTodayStr();
    setEditingReminder(null);
    setRemForm({
      title: '',
      startDate: today,
      endDate: today,
      recurrence: 'none',
      recurrenceDays: 7
    });
    setShowReminderSheet(true);
  };

  const handleOpenEditReminder = (rem) => {
    setEditingReminder(rem);
    setRemForm({
      title: rem.title || '',
      startDate: rem.startDate || getLocalTodayStr(),
      endDate: rem.endDate || rem.startDate || getLocalTodayStr(),
      recurrence: rem.recurrence || 'none',
      recurrenceDays: rem.recurrenceDays || 7
    });
    setShowReminderSheet(true);
  };

  const handleSaveReminder = async (e) => {
    e.preventDefault();
    if (!remForm.title.trim()) return;
    setSavingReminder(true);
    try {
      const safeStart = remForm.startDate || getLocalTodayStr();
      const safeEnd = remForm.endDate && remForm.endDate >= safeStart ? remForm.endDate : safeStart;
      const payload = {
        title: remForm.title.trim(),
        startDate: safeStart,
        endDate: safeEnd,
        recurrence: remForm.recurrence || 'none',
        recurrenceDays: remForm.recurrence === 'custom_days' ? Math.max(1, parseInt(remForm.recurrenceDays || 7, 10) || 7) : null,
        updatedAt: serverTimestamp()
      };

      if (editingReminder) {
        await updateDoc(doc(db, 'reminders', editingReminder.id), payload);
      } else {
        await addDoc(collection(db, 'reminders'), {
          ...payload,
          isDone: false,
          completedAt: null,
          userEmail: (currentUser?.email || '').toLowerCase(),
          createdAt: serverTimestamp()
        });
      }
      setShowReminderSheet(false);
      setEditingReminder(null);
    } catch (err) {
      console.error('Error saving reminder from mobile:', err);
      alert(isCa ? "Error en desar el recordatori." : 'Error al guardar el recordatorio.');
    } finally {
      setSavingReminder(false);
    }
  };

  const handleToggleReminderDone = async (rem) => {
    const nextDone = !rem.isDone;
    try {
      await updateDoc(doc(db, 'reminders', rem.id), {
        isDone: nextDone,
        completedAt: nextDone ? new Date().toISOString() : null,
        updatedAt: serverTimestamp()
      });

      if (nextDone && rem.recurrence && rem.recurrence !== 'none') {
        const nextDates = computeNextRecurrenceDates(rem);
        if (nextDates) {
          await addDoc(collection(db, 'reminders'), {
            title: rem.title,
            startDate: nextDates.startDate,
            endDate: nextDates.endDate,
            recurrence: rem.recurrence,
            recurrenceDays: rem.recurrence === 'custom_days' ? (rem.recurrenceDays || 7) : null,
            isDone: false,
            completedAt: null,
            userEmail: rem.userEmail || (currentUser?.email || '').toLowerCase(),
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp()
          });
        }
      }
    } catch (err) {
      console.error('Error toggling reminder:', err);
    }
  };

  const handleDeleteReminder = async (rem) => {
    const msg = isCa ? `Eliminar "${rem.title}"?` : `¿Eliminar "${rem.title}"?`;
    if (!window.confirm(msg)) return;
    try {
      await deleteDoc(doc(db, 'reminders', rem.id));
    } catch (err) {
      console.error('Error deleting reminder:', err);
    }
  };

  const visibleReminders =
    reminderSubTab === 'active'
      ? classifiedReminders.active
      : reminderSubTab === 'future'
        ? classifiedReminders.future
        : classifiedReminders.done;

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 flex flex-col pb-24 antialiased">
      {/* HEADER MÓVIL COMPACTO */}
      <header className="sticky top-0 z-30 bg-[#152427] text-white border-b border-[#233b3f] shadow-sm">
        <div className="px-3.5 py-2.5 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <img src="/logo-ferrer-blanc.svg" alt="Ferrer Assessoria" className="h-6 w-auto object-contain shrink-0" />
            <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-300 border-l border-white/15 pl-2 truncate">
              {isCa ? 'Mòbil' : 'Móvil'}
            </span>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <div className="flex items-center bg-[#0f1b1d] rounded-lg p-0.5 border border-white/10">
              <button
                type="button"
                onClick={() => setLang('ca')}
                className={`px-2 py-0.5 rounded text-[11px] font-bold cursor-pointer ${isCa ? 'bg-indigo-600 text-white' : 'text-slate-300'}`}
              >
                CA
              </button>
              <button
                type="button"
                onClick={() => setLang('es')}
                className={`px-2 py-0.5 rounded text-[11px] font-bold cursor-pointer ${!isCa ? 'bg-indigo-600 text-white' : 'text-slate-300'}`}
              >
                ES
              </button>
            </div>

            {onSwitchToDesktop && (
              <button
                type="button"
                onClick={onSwitchToDesktop}
                className="hidden md:inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-[11px] font-bold text-slate-100 cursor-pointer"
                title={isCa ? 'Canviar a versió escriptori' : 'Cambiar a versión escritorio'}
              >
                <Monitor className="w-3.5 h-3.5" />
                <span>{isCa ? 'Escriptori' : 'Escritorio'}</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => signOut(auth)}
              className="p-1.5 rounded-lg bg-[#0f1b1d] border border-white/10 text-slate-300 hover:text-rose-200 cursor-pointer"
              title={isCa ? 'Tancar sessió' : 'Cerrar sesión'}
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </header>

      {/* CUERPO PRINCIPAL */}
      <main className="flex-1 px-3 py-3 space-y-3 max-w-2xl w-full mx-auto">
        {/* ================= TAB 1: EXPEDIENTS & VARIABLES ================= */}
        {activeTab === 'expedients' && (
          <>
            {/* Barra de búsqueda + botones de creación */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    placeholder={isCa ? 'Cercar client, expedient o NIF...' : 'Buscar cliente, expediente o NIF...'}
                    className="w-full bg-white border border-slate-200 rounded-xl pl-9 pr-8 py-2.5 text-xs font-medium text-slate-800 shadow-xs outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                  {searchTerm && (
                    <button
                      type="button"
                      onClick={() => setSearchTerm('')}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleOpenNewExp}
                  className="flex-1 inline-flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl bg-indigo-600 text-white text-xs font-bold shadow-xs active:scale-[0.99] cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>{isCa ? 'Nou Expedient' : 'Nuevo Expediente'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => onOpenNewVariable?.()}
                  className="flex-1 inline-flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl bg-amber-500 text-white text-xs font-bold shadow-xs active:scale-[0.99] cursor-pointer"
                >
                  <Zap className="w-4 h-4" />
                  <span>{isCa ? 'Nova Variable' : 'Nueva Variable'}</span>
                </button>
              </div>

              {/* Filtros compactos sin duplicar etiquetas */}
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setScopeFilter(scopeFilter === 'mine' ? 'all' : 'mine')}
                  className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-bold border whitespace-nowrap shrink-0 cursor-pointer transition-colors ${
                    scopeFilter === 'mine'
                      ? 'bg-indigo-600 text-white border-indigo-600'
                      : 'bg-white text-slate-700 border-slate-200'
                  }`}
                  title={
                    scopeFilter === 'mine'
                      ? (isCa ? 'Mostrant només els meus · Toca per veure tot el despatx' : 'Mostrando solo los míos · Toca para ver todo el equipo')
                      : (isCa ? 'Mostrant tot el despatx · Toca per veure només els meus' : 'Mostrando todo el equipo · Toca para ver solo los míos')
                  }
                >
                  {scopeFilter === 'mine' ? <User className="w-3.5 h-3.5" /> : <Users className="w-3.5 h-3.5" />}
                  <span>
                    {scopeFilter === 'mine'
                      ? (isCa ? 'Meus' : 'Míos')
                      : (isCa ? 'Equip' : 'Equipo')}
                  </span>
                </button>

                <div className="flex items-center bg-white border border-slate-200 rounded-lg p-0.5 flex-1 min-w-0">
                  {[
                    { id: 'all', label: isCa ? 'Tots' : 'Todos' },
                    { id: 'expediente', label: 'Exp' },
                    { id: 'variable', label: 'Var' }
                  ].map(chip => (
                    <button
                      key={chip.id}
                      type="button"
                      onClick={() => setTypeFilter(chip.id)}
                      className={`flex-1 py-1 px-1.5 rounded-md text-[11px] font-bold whitespace-nowrap cursor-pointer transition-colors ${
                        typeFilter === chip.id
                          ? 'bg-slate-900 text-white'
                          : 'text-slate-600'
                      }`}
                    >
                      {chip.label}
                    </button>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={() => setHideClosed(v => !v)}
                  className={`p-1.5 rounded-lg border shrink-0 cursor-pointer transition-colors ${
                    !hideClosed
                      ? 'bg-emerald-600 text-white border-emerald-600'
                      : 'bg-white text-slate-500 border-slate-200'
                  }`}
                  title={
                    hideClosed
                      ? (isCa ? 'Veure tancats i arxivats' : 'Ver cerrados y archivados')
                      : (isCa ? 'Ocultar tancats i arxivats' : 'Ocultar cerrados y archivados')
                  }
                  aria-label={
                    hideClosed
                      ? (isCa ? 'Veure tancats i arxivats' : 'Ver cerrados y archivados')
                      : (isCa ? 'Ocultar tancats i arxivats' : 'Ocultar cerrados y archivados')
                  }
                >
                  {hideClosed ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Contador */}
            <div className="flex items-center justify-between text-[11px] font-semibold text-slate-500 px-1">
              <span>
                {filteredTasks.length} {isCa ? 'registres' : 'registros'}
              </span>
              {scopeFilter === 'mine' && (
                <span>{currentUser?.email}</span>
              )}
            </div>

            {/* Lista de tarjetas */}
            {filteredTasks.length === 0 ? (
              <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center text-slate-400 text-xs">
                {isCa ? 'Cap expedient o variable amb aquests filtres.' : 'No hay expedientes ni variables con estos filtros.'}
              </div>
            ) : (
              <div className="space-y-2.5">
                {filteredTasks.map(task => {
                  const isVar = task.recordType === 'variable';
                  const matchedClient = findClientForTask(task, clientes);
                  const clientPhone = matchedClient?.telefono || task.clientPhone || '';
                  const clientEmail = matchedClient?.email || task.clientEmail || '';
                  const telHref = buildTelHref(clientPhone);
                  const waHref = buildWhatsAppHref(clientPhone);
                  const effStatus = getEffectiveStatusMobile(task);
                  const normSt = getNormalizedStatus(task);
                  const isOverdue = effStatus === 'Vencido';
                  const updatesCount = Array.isArray(task.updates) ? task.updates.length : 0;
                  const attachCount = Array.isArray(task.attachments) ? task.attachments.length : 0;

                  return (
                    <div
                      key={task.id}
                      className={`bg-white rounded-2xl border shadow-xs overflow-hidden ${
                        isOverdue ? 'border-rose-300' : 'border-slate-200'
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() => openTaskDetail(task, 'resum')}
                        className="w-full text-left p-3.5 pb-2.5 active:bg-slate-50 cursor-pointer"
                      >
                        <div className="flex items-center justify-between gap-2 mb-1.5">
                          <div className="flex items-center gap-1.5 min-w-0">
                            {isVar ? (
                              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 text-[10px] font-extrabold uppercase shrink-0">
                                <Zap className="w-3 h-3" /> Var
                              </span>
                            ) : (
                              <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 text-[10px] font-extrabold uppercase shrink-0">
                                Exp
                              </span>
                            )}
                            <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold border ${
                              isOverdue
                                ? 'bg-rose-50 text-rose-700 border-rose-200'
                                : (STATUS_BADGE_MAP[normSt] || STATUS_BADGE_MAP.Abierto)
                            }`}>
                              {isOverdue ? (isCa ? 'Vençut' : 'Vencido') : normSt}
                            </span>
                            {task.department && (
                              <span className="text-[10px] font-semibold text-slate-400 truncate">
                                {translateClassificationName(task.department, lang)}
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-1 shrink-0">
                            {task.dueDate && (
                              <span className={`text-[10px] font-bold ${isOverdue ? 'text-rose-600' : 'text-slate-500'}`}>
                                {formatReminderDateShort(task.dueDate, lang, todayStr)}
                              </span>
                            )}
                            <ChevronRight className="w-4 h-4 text-slate-400" />
                          </div>
                        </div>

                        <h3 className="text-sm font-bold text-slate-900 leading-snug line-clamp-2">
                          {task.title}
                        </h3>
                        <p className="text-xs font-medium text-slate-500 mt-1 flex items-center gap-1 truncate">
                          <Building2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span className="truncate">{task.client || matchedClient?.razonSocial || '—'}</span>
                        </p>
                      </button>

                      {/* Barra inferior de contacto directo + acceso rápido a Dictado / Cámara */}
                      <div className="px-3 pb-2.5 pt-2 border-t border-slate-100 flex items-center justify-between gap-1.5 bg-slate-50/70">
                        <div className="flex items-center gap-1.5 min-w-0">
                          {telHref ? (
                            <a
                              href={telHref}
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-indigo-600 text-white text-[11px] font-bold"
                              title={clientPhone}
                            >
                              <Phone className="w-3.5 h-3.5" />
                              <span>{isCa ? 'Trucar' : 'Llamar'}</span>
                            </a>
                          ) : (
                            <span className="text-[10px] text-slate-400 px-1.5">
                              {isCa ? 'Sense tel.' : 'Sin tel.'}
                            </span>
                          )}

                          {waHref && (
                            <a
                              href={waHref}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-emerald-600 text-white text-[11px] font-bold"
                            >
                              <MessageCircle className="w-3.5 h-3.5" />
                              <span>WA</span>
                            </a>
                          )}

                          {clientEmail && (
                            <a
                              href={`mailto:${clientEmail}?subject=${encodeURIComponent(task.title || '')}`}
                              className="inline-flex items-center justify-center p-1.5 rounded-lg bg-slate-800 text-white"
                              title={clientEmail}
                            >
                              <Mail className="w-3.5 h-3.5" />
                            </a>
                          )}
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          <button
                            type="button"
                            onClick={() => openTaskDetail(task, 'bitacora')}
                            className="inline-flex items-center gap-1 px-2 py-1.5 rounded-lg bg-white border border-slate-200 text-slate-700 text-[11px] font-semibold cursor-pointer"
                            title={isCa ? 'Dictat a Bitàcola' : 'Dictado en Bitácora'}
                          >
                            <Mic className="w-3.5 h-3.5 text-indigo-600" />
                            <span>{updatesCount}</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => openTaskDetail(task, 'adjunts')}
                            className="inline-flex items-center gap-1 px-2 py-1.5 rounded-lg bg-white border border-slate-200 text-slate-700 text-[11px] font-semibold cursor-pointer"
                            title={isCa ? 'Foto / Adjunts' : 'Foto / Adjuntos'}
                          >
                            <Camera className="w-3.5 h-3.5 text-amber-600" />
                            <span>{attachCount}</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}

        {/* ================= TAB 2: GTD ================= */}
        {activeTab === 'gtd' && (
          <>
            <div className="bg-white rounded-2xl border border-slate-200 p-3 shadow-xs flex items-center justify-between gap-2">
              <div>
                <h2 className="text-sm font-extrabold text-slate-900">
                  {isCa ? 'Properes accions GTD' : 'Próximas acciones GTD'}
                </h2>
                <p className="text-[11px] text-slate-500">
                  {gtdItems.length} {isCa ? 'tasques pendents' : 'tareas pendientes'}
                </p>
              </div>
              {isAdmin && (
                <div className="flex items-center bg-slate-100 rounded-lg p-0.5">
                  <button
                    type="button"
                    onClick={() => setGtdScope('mine')}
                    className={`px-2.5 py-1 rounded-md text-[11px] font-bold cursor-pointer ${
                      gtdScope === 'mine' ? 'bg-indigo-600 text-white' : 'text-slate-600'
                    }`}
                  >
                    {isCa ? 'Meves' : 'Mías'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setGtdScope('all')}
                    className={`px-2.5 py-1 rounded-md text-[11px] font-bold cursor-pointer ${
                      gtdScope === 'all' ? 'bg-indigo-600 text-white' : 'text-slate-600'
                    }`}
                  >
                    {isCa ? 'Totes' : 'Todas'}
                  </button>
                </div>
              )}
            </div>

            {gtdItems.length === 0 ? (
              <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center text-slate-400 text-xs">
                {isCa ? 'Safata GTD buida! Tot fet.' : '¡Bandeja GTD vacía! Todo al día.'}
              </div>
            ) : (
              <div className="space-y-2">
                {gtdItems.map(({ key, task, step }) => {
                  const busy = togglingStepKey === key;
                  const isVar = task.recordType === 'variable';
                  return (
                    <div
                      key={key}
                      className="bg-white rounded-2xl border border-slate-200 p-3 shadow-xs flex items-start gap-3"
                    >
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => handleToggleGtdStep(task, step)}
                        className="mt-0.5 text-slate-400 hover:text-emerald-600 shrink-0 cursor-pointer"
                        aria-label="Completar"
                      >
                        {busy ? (
                          <Loader2 className="w-5 h-5 animate-spin text-indigo-600" />
                        ) : (
                          <Circle className="w-5 h-5" />
                        )}
                      </button>

                      <button
                        type="button"
                        onClick={() => openTaskDetail(task, 'resum', step.id)}
                        className="flex-1 text-left min-w-0 cursor-pointer"
                      >
                        <p className="text-xs font-bold text-slate-900 leading-snug">{step.text}</p>
                        <div className="flex flex-wrap items-center gap-1.5 mt-1.5 text-[10px]">
                          {isVar && (
                            <span className="px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 font-bold">
                              Var
                            </span>
                          )}
                          <span className="font-semibold text-indigo-700 truncate max-w-[180px]">
                            {task.title}
                          </span>
                          <span className="text-slate-400">·</span>
                          <span className="text-slate-500 truncate max-w-[140px]">
                            {task.client || '—'}
                          </span>
                        </div>
                        {step.assignee && (
                          <p className="text-[10px] text-slate-400 mt-0.5 truncate">{step.assignee}</p>
                        )}
                      </button>

                      <ChevronRight className="w-4 h-4 text-slate-300 mt-1 shrink-0" />
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}

        {/* ================= TAB 3: RECORDATORIS ================= */}
        {activeTab === 'reminders' && (
          <>
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center bg-white border border-slate-200 rounded-xl p-1 flex-1 shadow-xs">
                {[
                  { id: 'active', labelCa: 'Actius', labelEs: 'Activos', count: classifiedReminders.active.length },
                  { id: 'future', labelCa: 'Futurs', labelEs: 'Futuros', count: classifiedReminders.future.length },
                  { id: 'done', labelCa: 'Fets', labelEs: 'Hechos', count: classifiedReminders.done.length }
                ].map(st => (
                  <button
                    key={st.id}
                    type="button"
                    onClick={() => setReminderSubTab(st.id)}
                    className={`flex-1 py-1.5 px-2 rounded-lg text-[11px] font-bold transition-all cursor-pointer flex items-center justify-center gap-1 ${
                      reminderSubTab === st.id
                        ? 'bg-indigo-600 text-white shadow-xs'
                        : 'text-slate-600'
                    }`}
                  >
                    <span>{isCa ? st.labelCa : st.labelEs}</span>
                    <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                      reminderSubTab === st.id ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500'
                    }`}>
                      {st.count}
                    </span>
                  </button>
                ))}
              </div>

              <button
                type="button"
                onClick={handleOpenNewReminder}
                className="p-2.5 rounded-xl bg-indigo-600 text-white shadow-xs shrink-0 cursor-pointer"
                title={isCa ? 'Nou recordatori' : 'Nuevo recordatorio'}
              >
                <Plus className="w-5 h-5" />
              </button>
            </div>

            {visibleReminders.length === 0 ? (
              <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center text-slate-400 text-xs">
                {isCa ? 'No hi ha recordatoris en aquesta pestanya.' : 'No hay recordatorios en esta pestaña.'}
              </div>
            ) : (
              <div className="space-y-2">
                {visibleReminders.map(rem => {
                  const isOverdue = rem._meta.state === 'overdue';
                  const recLabel = getRecurrenceLabel(rem.recurrence, rem.recurrenceDays, lang);

                  return (
                    <div
                      key={rem.id}
                      className={`rounded-2xl border p-3 shadow-xs flex items-start gap-2.5 ${
                        isOverdue
                          ? 'bg-rose-50 border-rose-300'
                          : rem.isDone
                            ? 'bg-slate-50 border-slate-200 opacity-75'
                            : 'bg-white border-slate-200'
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() => handleToggleReminderDone(rem)}
                        className={`mt-0.5 shrink-0 cursor-pointer ${
                          rem.isDone
                            ? 'text-emerald-600'
                            : isOverdue
                              ? 'text-rose-600'
                              : 'text-slate-400 hover:text-emerald-600'
                        }`}
                      >
                        {rem.isDone ? <CheckCircle2 className="w-5 h-5" /> : <Circle className="w-5 h-5" />}
                      </button>

                      <div className="flex-1 min-w-0">
                        <p className={`text-xs font-bold leading-snug ${
                          rem.isDone
                            ? 'line-through text-slate-400'
                            : isOverdue
                              ? 'text-rose-900'
                              : 'text-slate-900'
                        }`}>
                          {rem.title}
                        </p>

                        <div className="flex flex-wrap items-center gap-2 mt-1 text-[10px] font-semibold">
                          <span className={`inline-flex items-center gap-1 ${isOverdue ? 'text-rose-700 font-bold' : 'text-slate-500'}`}>
                            <Clock className="w-3 h-3" />
                            {formatReminderDateShort(rem.startDate, lang, todayStr)} → {formatWeekdayAndDate(rem.endDate || rem.startDate, lang)}
                          </span>

                          {isOverdue && (
                            <span className="px-1.5 py-0.5 rounded bg-rose-600 text-white font-extrabold">
                              +{rem._meta.daysOverdue}d
                            </span>
                          )}

                          {recLabel && (
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-700">
                              <Repeat className="w-2.5 h-2.5" />
                              {recLabel}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={() => handleOpenEditReminder(rem)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 cursor-pointer"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteReminder(rem)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}
      </main>

      {/* NAVEGACIÓN INFERIOR FIJA */}
      <nav className="fixed bottom-0 inset-x-0 z-30 bg-white/95 backdrop-blur-lg border-t border-slate-200 px-2 pt-1.5 pb-[max(0.5rem,env(safe-area-inset-bottom))] shadow-[0_-4px_16px_rgba(15,23,42,0.06)]">
        <div className="max-w-2xl mx-auto grid grid-cols-3 gap-1">
          <button
            type="button"
            onClick={() => setActiveTab('expedients')}
            className={`flex flex-col items-center justify-center py-1.5 rounded-xl transition-all cursor-pointer ${
              activeTab === 'expedients'
                ? 'bg-indigo-50 text-indigo-700 font-extrabold'
                : 'text-slate-500 font-semibold'
            }`}
          >
            <Briefcase className="w-5 h-5" />
            <span className="text-[10px] mt-0.5">{isCa ? 'Expedients' : 'Expedientes'}</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('gtd')}
            className={`relative flex flex-col items-center justify-center py-1.5 rounded-xl transition-all cursor-pointer ${
              activeTab === 'gtd'
                ? 'bg-indigo-50 text-indigo-700 font-extrabold'
                : 'text-slate-500 font-semibold'
            }`}
          >
            <Target className="w-5 h-5" />
            <span className="text-[10px] mt-0.5">GTD</span>
            {gtdItems.length > 0 && (
              <span className="absolute top-1 right-1/4 px-1.5 min-w-[16px] h-4 rounded-full bg-indigo-600 text-white text-[9px] font-extrabold flex items-center justify-center">
                {gtdItems.length}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('reminders')}
            className={`relative flex flex-col items-center justify-center py-1.5 rounded-xl transition-all cursor-pointer ${
              activeTab === 'reminders'
                ? 'bg-indigo-50 text-indigo-700 font-extrabold'
                : 'text-slate-500 font-semibold'
            }`}
          >
            <Bell className="w-5 h-5" />
            <span className="text-[10px] mt-0.5">{isCa ? 'Recordatoris' : 'Recordatorios'}</span>
            {classifiedReminders.active.length > 0 && (
              <span className={`absolute top-1 right-1/4 px-1.5 min-w-[16px] h-4 rounded-full text-white text-[9px] font-extrabold flex items-center justify-center ${
                classifiedReminders.overdueCount > 0 ? 'bg-rose-600' : 'bg-indigo-600'
              }`}>
                {classifiedReminders.active.length}
              </span>
            )}
          </button>
        </div>
      </nav>

      {/* SHEET: NUEVO EXPEDIENTE MÓVIL */}
      {showNewExpSheet && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 flex items-end sm:items-center justify-center">
          <div className="bg-white w-full sm:max-w-md rounded-t-3xl sm:rounded-2xl max-h-[92vh] flex flex-col overflow-hidden shadow-2xl">
            <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
                <FileText className="w-4 h-4 text-indigo-600" />
                {isCa ? 'Nou Expedient Ràpid' : 'Nuevo Expediente Rápido'}
              </h3>
              <button
                type="button"
                onClick={() => setShowNewExpSheet(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveNewExpediente} className="p-4 space-y-3 overflow-y-auto">
              <div>
                <label className="text-[10px] font-bold uppercase text-slate-500 block mb-1">
                  {isCa ? 'Títol / Assumpte *' : 'Título / Asunto *'}
                </label>
                <input
                  required
                  value={newExpForm.title}
                  onChange={e => setNewExpForm({ ...newExpForm, title: e.target.value })}
                  placeholder={isCa ? 'Ex: Renda 2025, Alta autònom...' : 'Ej: Renta 2025, Alta autónomo...'}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm font-semibold text-slate-800 outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold uppercase text-slate-500 block mb-1">
                  {isCa ? 'Client *' : 'Cliente *'}
                </label>
                <ClientAutocomplete
                  clientes={clientes}
                  tasks={tasks}
                  value={newExpForm.client}
                  selectedNif={newExpForm.clientNif}
                  isProvisional={newExpForm.isProvisionalClient}
                  lang={lang}
                  onChange={(selected) => {
                    if (selected) {
                      if (selected.isProvisional) {
                        setNewExpForm(prev => ({
                          ...prev,
                          client: selected.razonSocial,
                          clientNif: '',
                          clientRazonSocial: selected.razonSocial,
                          isProvisionalClient: true
                        }));
                      } else {
                        setNewExpForm(prev => ({
                          ...prev,
                          client: `${selected.razonSocial} (${selected.nif})`,
                          clientNif: selected.nif,
                          clientRazonSocial: selected.razonSocial,
                          isProvisionalClient: false
                        }));
                      }
                    } else {
                      setNewExpForm(prev => ({
                        ...prev,
                        client: '',
                        clientNif: '',
                        clientRazonSocial: '',
                        isProvisionalClient: false
                      }));
                    }
                  }}
                />
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="text-[10px] font-bold uppercase text-slate-500 block mb-1">
                    {isCa ? 'Àrea' : 'Área'}
                  </label>
                  <select
                    value={newExpForm.department}
                    onChange={e => setNewExpForm({ ...newExpForm, department: e.target.value })}
                    className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 bg-white outline-none"
                  >
                    {(areas.length > 0 ? areas.map(a => a.nombre) : ['Fiscal', 'Laboral', 'Contable', 'Mercantil', 'Gestoría']).map(name => (
                      <option key={name} value={name}>{translateClassificationName(name, lang)}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-[10px] font-bold uppercase text-slate-500 block mb-1">
                    {isCa ? 'Data límit' : 'Fecha límite'}
                  </label>
                  <input
                    type="date"
                    value={newExpForm.dueDate}
                    onChange={e => setNewExpForm({ ...newExpForm, dueDate: e.target.value })}
                    className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 bg-white outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] font-bold uppercase text-slate-500 block mb-1">
                  {isCa ? 'Notes' : 'Notas'}
                </label>
                <textarea
                  rows={2}
                  value={newExpForm.description}
                  onChange={e => setNewExpForm({ ...newExpForm, description: e.target.value })}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <button
                type="submit"
                disabled={savingNewExp}
                className="w-full py-3 rounded-xl bg-indigo-600 text-white text-xs font-bold flex items-center justify-center gap-2 cursor-pointer"
              >
                {savingNewExp ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                <span>{isCa ? 'Crear Expedient' : 'Crear Expediente'}</span>
              </button>
            </form>
          </div>
        </div>
      )}

      {/* SHEET: CREAR / EDITAR RECORDATORIO MÓVIL */}
      {showReminderSheet && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 flex items-end sm:items-center justify-center">
          <div className="bg-white w-full sm:max-w-md rounded-t-3xl sm:rounded-2xl max-h-[90vh] flex flex-col overflow-hidden shadow-2xl">
            <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
                <Bell className="w-4 h-4 text-indigo-600" />
                {editingReminder
                  ? (isCa ? 'Editar recordatori' : 'Editar recordatorio')
                  : (isCa ? 'Nou recordatori' : 'Nuevo recordatorio')}
              </h3>
              <button
                type="button"
                onClick={() => setShowReminderSheet(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveReminder} className="p-4 space-y-3 overflow-y-auto">
              <div>
                <label className="text-[10px] font-bold uppercase text-slate-500 block mb-1">
                  {isCa ? 'Acció / Recordatori *' : 'Acción / Recordatorio *'}
                </label>
                <input
                  required
                  value={remForm.title}
                  onChange={e => setRemForm({ ...remForm, title: e.target.value })}
                  placeholder={isCa ? 'Ex: Trucar notaria, presentar 303...' : 'Ej: Llamar notaría, presentar 303...'}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm font-semibold text-slate-800 outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="text-[10px] font-bold uppercase text-slate-500 flex items-center gap-1 mb-1">
                    <Calendar className="w-3 h-3" /> {isCa ? 'Data inici' : 'Fecha inicio'}
                  </label>
                  <input
                    type="date"
                    value={remForm.startDate}
                    onChange={e => setRemForm({ ...remForm, startDate: e.target.value })}
                    className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 outline-none"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold uppercase text-slate-500 flex items-center gap-1 mb-1">
                    <Calendar className="w-3 h-3" /> {isCa ? 'Data límit' : 'Fecha límite'}
                  </label>
                  <input
                    type="date"
                    value={remForm.endDate}
                    onChange={e => setRemForm({ ...remForm, endDate: e.target.value })}
                    className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div className={remForm.recurrence === 'custom_days' ? '' : 'col-span-2'}>
                  <label className="text-[10px] font-bold uppercase text-slate-500 flex items-center gap-1 mb-1">
                    <Repeat className="w-3 h-3" /> {isCa ? 'Recurrència' : 'Recurrencia'}
                  </label>
                  <select
                    value={remForm.recurrence}
                    onChange={e => setRemForm({ ...remForm, recurrence: e.target.value })}
                    className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 bg-white outline-none"
                  >
                    {RECURRENCE_OPTIONS.map(opt => (
                      <option key={opt.value} value={opt.value}>
                        {isCa ? opt.labelCa : opt.labelEs}
                      </option>
                    ))}
                  </select>
                </div>

                {remForm.recurrence === 'custom_days' && (
                  <div>
                    <label className="text-[10px] font-bold uppercase text-slate-500 block mb-1">
                      {isCa ? 'Cada quants dies' : 'Cada cuántos días'}
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={remForm.recurrenceDays}
                      onChange={e => setRemForm({ ...remForm, recurrenceDays: e.target.value })}
                      className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 outline-none"
                    />
                  </div>
                )}
              </div>

              {editingReminder && (
                <button
                  type="button"
                  onClick={() => {
                    handleToggleReminderDone(editingReminder);
                    setShowReminderSheet(false);
                  }}
                  className="w-full py-2.5 rounded-xl border border-emerald-200 bg-emerald-50 text-emerald-700 text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Check className="w-4 h-4" />
                  <span>
                    {editingReminder.isDone
                      ? (isCa ? 'Reobrir recordatori' : 'Reabrir recordatorio')
                      : (isCa ? 'Marcar com a fet' : 'Marcar como hecho')}
                  </span>
                </button>
              )}

              <button
                type="submit"
                disabled={savingReminder}
                className="w-full py-3 rounded-xl bg-indigo-600 text-white text-xs font-bold flex items-center justify-center gap-2 cursor-pointer"
              >
                {savingReminder ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                <span>{isCa ? 'Desar recordatori' : 'Guardar recordatorio'}</span>
              </button>
            </form>
          </div>
        </div>
      )}

      {/* DETALLE DE EXPEDIENTE / VARIABLE MÓVIL */}
      {liveSelectedTask && (
        <MobileExpedienteDetail
          key={`${liveSelectedTask.id}_${focusedStepId || 'all'}`}
          task={liveSelectedTask}
          onClose={() => {
            setSelectedTaskId(null);
            setFocusedStepId(null);
          }}
          clientes={clientes}
          areas={areas}
          tramos={tramos}
          usersList={usersList}
          currentUser={currentUser}
          logAction={logAction}
          lang={lang}
          initialTab={detailInitialTab}
          focusedStepId={focusedStepId}
        />
      )}
    </div>
  );
}
