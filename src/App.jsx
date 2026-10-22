import React, { useState, useEffect, useRef, useMemo } from 'react';
import Login from './Login';
import { auth, db, storage } from './firebase';
import { 
  onAuthStateChanged,
  signOut
} from 'firebase/auth';
import { 
  ref, 
  uploadBytes, 
  getDownloadURL, 
  deleteObject 
} from 'firebase/storage';
import * as XLSX from 'xlsx'; 
import { 
  collection, 
  addDoc, 
  updateDoc, 
  doc, 
  onSnapshot, 
  serverTimestamp, 
  setDoc, 
  writeBatch,
  arrayUnion,
  arrayRemove,
  query,
  orderBy,
  limit,
  getDocs
} from 'firebase/firestore';
import { 
  LogOut, Plus, Minus, Search, Filter, User, CheckCircle2, 
  Clock, MessageSquare, Send, Briefcase, Tag, Layers, 
  Settings, Globe, ChevronDown, Check, Users, Lock, ShieldAlert, 
  CalendarDays, FileSpreadsheet, BarChart3, Edit3, ChevronLeft, ChevronRight, 
  LayoutList, PieChart, Database, Trash2, AlertTriangle, Monitor, Bell, X, 
  Paperclip, FileText, Download, Loader2, XCircle, ExternalLink, Pencil, Save, Map, 
  Activity, PauseCircle, BookOpen, Link as LinkIcon, File, Menu, Copy, Target, Eye, EyeOff,
  Building2, Scale, UserCheck, CalendarCheck
} from 'lucide-react';

// --- MAESTROS DE DATOS PARA GESTORÍA Y ASESORÍA ---
const MASTERS = {
  departments: [
    'Fiscal / Tributario',
    'Contable',
    'Laboral y Seguridad Social',
    'Mercantil y Societario',
    'Jurídico / Legal',
    'Trámites DGT / Tráfico',
    'Extranjería y Residencias',
    'Facturación y Cobros',
    'Dirección / General'
  ],
  types: [
    'Vencimiento Fiscal',
    'Cierre Contable / Libros',
    'Nóminas y Seg. Social',
    'Alta / Constitución',
    'Requerimiento / Notificación AEAT',
    'Trámite Administrativo',
    'Declaración Renta (IRPF)',
    'Consultoría y Asesoramiento',
    'Otro Trámite'
  ],
  status: [
    'En Plazo',
    'Pendiente Documentación',
    'En Revisión',
    'Urgente / Próximo a Vencer',
    'Presentado / Tramitado',
    'Trámite Periódico',
    'En Pausa / Suspendido'
  ]
};

const DELAY_METRICS_TYPES = [
  'Vencimiento Fiscal',
  'Cierre Contable / Libros',
  'Requerimiento / Notificación AEAT',
  'Nóminas y Seg. Social',
  'Trámite Administrativo'
];

// Mapeador de compatibilidad para datos previos de transición
const normalizeStatus = (status) => {
  switch (status) {
    case 'On Track': return 'En Plazo';
    case 'Ongoing Task': return 'Trámite Periódico';
    case 'Behind': return 'Pendiente Documentación';
    case 'No Meet Goal': return 'Urgente / Próximo a Vencer';
    case 'Completed': return 'Presentado / Tramitado';
    case 'On Hold': return 'En Pausa / Suspendido';
    default: return status || 'En Plazo';
  }
};

const normalizeDepartment = (dept) => {
  if (!dept) return 'Fiscal / Tributario';
  if (dept.includes('General')) return 'Dirección / General';
  if (dept.includes('Systems') || dept.includes('CLEO') || dept.includes('Chemistry')) return 'Fiscal / Tributario';
  if (dept.includes('Financials') || dept.includes('Hematology')) return 'Contable';
  if (dept.includes('Employee') || dept.includes('Parasitology')) return 'Laboral y Seguridad Social';
  return MASTERS.departments.includes(dept) ? dept : 'Fiscal / Tributario';
};

const normalizeType = (type) => {
  if (!type) return 'Vencimiento Fiscal';
  if (type === 'Platform Installs') return 'Vencimiento Fiscal';
  if (type === 'Platform Focused') return 'Cierre Contable / Libros';
  if (type === 'Year Financials') return 'Cierre Contable / Libros';
  if (type === 'Employee Focused') return 'Nóminas y Seg. Social';
  if (type === 'Communication') return 'Consultoría y Asesoramiento';
  if (type === 'Other') return 'Trámite Administrativo';
  return MASTERS.types.includes(type) ? type : 'Vencimiento Fiscal';
};

// --- UTILIDADES ---
const TextWithLinks = ({ text }) => {
  if (!text) return null;
  const parts = text.split(/(\s+)/);
  return (
    <span className="break-all whitespace-pre-wrap"> 
      {parts.map((part, i) => {
        if (part.match(/^(https?:\/\/|www\.)/i)) {
          let href = part;
          if (!part.startsWith('http')) { href = 'http://' + part; }
          return (
            <a key={i} href={href} target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:underline font-medium cursor-pointer" onClick={(e) => e.stopPropagation()}>
              {part}
            </a>
          );
        }
        return <span key={i}>{part}</span>;
      })}
    </span>
  );
};

const getDelayDays = (task) => {
    if (!task || !task.originalDueDate || !task.dueDate) return 0;
    const currentStatus = normalizeStatus(task.status);
    if (currentStatus === 'Trámite Periódico' || currentStatus === 'Presentado / Tramitado') return 0; 
    if (task.originalDueDate === task.dueDate) return 0;
    const original = new Date(task.originalDueDate);
    const current = new Date(task.dueDate);
    const diffTime = current - original;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays > 0 ? diffDays : 0; 
};

// --- COMPONENTES UI ---
const Badge = ({ text, size = 'xs' }) => {
  const norm = normalizeStatus(text);
  let colorClass = 'bg-slate-100 text-slate-700 border-slate-200';
  switch (norm) {
    case 'En Plazo': colorClass = 'bg-emerald-100 text-emerald-800 border-emerald-200'; break;
    case 'Trámite Periódico': colorClass = 'bg-indigo-100 text-indigo-800 border-indigo-200'; break;
    case 'Pendiente Documentación': colorClass = 'bg-amber-100 text-amber-800 border-amber-200'; break;
    case 'En Revisión': colorClass = 'bg-purple-100 text-purple-800 border-purple-200'; break;
    case 'Urgente / Próximo a Vencer': colorClass = 'bg-rose-100 text-rose-800 border-rose-200'; break;
    case 'Presentado / Tramitado': colorClass = 'bg-blue-100 text-blue-800 border-blue-200'; break;
    case 'En Pausa / Suspendido': colorClass = 'bg-slate-200 text-slate-600 border-slate-300'; break;
  }
  return <span className={`px-2 py-0.5 rounded-full text-${size} font-semibold border ${colorClass} whitespace-nowrap`}>{norm}</span>;
};

const SvgDonutChart = ({ data }) => {
    const total = data.reduce((acc, curr) => acc + curr.value, 0);
    let cumulativePercent = 0;
    const getCoordinatesForPercent = (percent) => {
        const x = Math.cos(2 * Math.PI * percent);
        const y = Math.sin(2 * Math.PI * percent);
        return [x, y];
    };
    if (total === 0) return <div className="h-40 flex items-center justify-center text-slate-400 text-xs">Sin Datos</div>;
    return (
        <div className="flex flex-row items-center gap-6">
            <div className="relative w-32 h-32 shrink-0">
                <svg viewBox="-1 -1 2 2" className="transform -rotate-90 w-full h-full">
                    {data.map((slice, i) => {
                        if (slice.value === 0) return null;
                        const startPercent = cumulativePercent;
                        const slicePercent = slice.value / total;
                        cumulativePercent += slicePercent;
                        const endPercent = cumulativePercent;
                        const [startX, startY] = getCoordinatesForPercent(startPercent);
                        const [endX, endY] = getCoordinatesForPercent(endPercent);
                        const largeArcFlag = slicePercent > 0.5 ? 1 : 0;
                        if (slicePercent === 1) {
                            return <circle key={i} cx="0" cy="0" r="0.8" fill="transparent" strokeWidth="0.4" stroke={slice.hexColor} />
                        }
                        let hexColor = slice.hexColor || '#cbd5e1'; 
                        return <path key={i} d={`M 0 0 L ${startX} ${startY} A 1 1 0 ${largeArcFlag} 1 ${endX} ${endY} Z`} fill={hexColor} stroke="white" strokeWidth="0.05" />;
                    })}
                    <circle cx="0" cy="0" r="0.6" fill="white"/>
                </svg>
                <div className="absolute inset-0 flex items-center justify-center flex-col">
                    <span className="text-2xl font-bold text-slate-700">{total}</span>
                    <span className="text-[8px] text-slate-400 uppercase tracking-wider">Expedientes</span>
                </div>
            </div>
            <div className="flex-1 space-y-2">
                {data.map((item, idx) => (
                    <div key={idx} className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2">
                            <div className={`w-3 h-3 rounded-full ${item.color}`}></div>
                            <span className="text-slate-600">{item.name}</span>
                        </div>
                        <span className="font-bold text-slate-800">{item.value} ({Math.round(item.value/total*100)}%)</span>
                    </div>
                ))}
            </div>
        </div>
    );
};

const MultiSelectDropdown = ({ label, options, selected, onChange, icon: Icon, fullWidth = false }) => {
  const [isOpen, setIsOpen] = useState(false);
  const wrapperRef = useRef(null);
  useEffect(() => {
    function handleClickOutside(event) { if (wrapperRef.current && !wrapperRef.current.contains(event.target)) setIsOpen(false); }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [wrapperRef]);
  const toggleOption = (option) => { selected.includes(option) ? onChange(selected.filter(item => item !== option)) : onChange([...selected, option]); };
  return (
    <div className={`relative ${fullWidth ? 'w-full' : ''}`} ref={wrapperRef}>
      <button type="button" onClick={() => setIsOpen(!isOpen)} className={`flex items-center justify-between gap-2 px-3 py-2 rounded-lg border text-sm transition-colors ${fullWidth ? 'w-full bg-white border-slate-300' : ''} ${!fullWidth && selected.length > 0 ? 'bg-indigo-50 border-indigo-200 text-indigo-700 font-medium' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'}`}>
        <div className="flex items-center gap-2 overflow-hidden">{Icon && <Icon className="w-4 h-4 shrink-0" />}<span className="truncate">{selected.length === 0 ? label : `${label} (${selected.length})`}</span></div>
        <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>
      {isOpen && (
        <div className="absolute top-full mt-1 left-0 w-full min-w-[200px] bg-white rounded-xl shadow-xl border border-slate-100 z-50 animate-in fade-in zoom-in-95 duration-100 max-h-60 overflow-y-auto">
          <div className="p-2 space-y-1">
            {options.map(option => {
              const isSelected = selected.includes(option);
              return (
                <div key={option} onClick={() => toggleOption(option)} className={`flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer text-sm transition-colors ${isSelected ? 'bg-indigo-50 text-indigo-700 font-medium' : 'hover:bg-slate-50 text-slate-700'}`}>
                  <div className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 ${isSelected ? 'bg-indigo-600 border-indigo-600' : 'border-slate-300'}`}>{isSelected && <Check className="w-3 h-3 text-white" />}</div>
                  <span className="truncate">{option}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

const NotificationDropdown = ({ tasks, currentUser, onOpenTask }) => {
  const [isOpen, setIsOpen] = useState(false);
  const wrapperRef = useRef(null);
  useEffect(() => {
    function handleClickOutside(event) { if (wrapperRef.current && !wrapperRef.current.contains(event.target)) setIsOpen(false); }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [wrapperRef]);
  const notifications = useMemo(() => {
    if (!currentUser) return [];
    return tasks.filter(t => {
      const userEmail = (currentUser.email || '').toLowerCase();
      const isMainOwner = t.assigneeEmail && t.assigneeEmail.toLowerCase() === userEmail;
      const isInAssigneesList = t.assignees && t.assignees.some(email => email && email.toLowerCase() === userEmail);
      const isAssigned = isMainOwner || isInAssigneesList;
      if (!isAssigned) return false;
      const normStatus = normalizeStatus(t.status);
      if (normStatus === 'Presentado / Tramitado' || normStatus === 'En Pausa / Suspendido' || normStatus === 'Trámite Periódico') return false; 
      if (!t.dueDate) return false;
      const today = new Date();
      today.setHours(0,0,0,0);
      const due = new Date(t.dueDate);
      const diffTime = due - today;
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      const limitDays = normalizeType(t.type) === 'Vencimiento Fiscal' ? 30 : 10;
      return diffDays <= limitDays;
    }).map(t => {
        const today = new Date();
        today.setHours(0,0,0,0);
        const due = new Date(t.dueDate);
        const diffDays = Math.ceil((due - today) / (1000 * 60 * 60 * 24));
        let type = 'upcoming';
        if (diffDays < 0) type = 'overdue';
        else if (diffDays <= 3) type = 'urgent';
        return { ...t, alertType: type, daysLeft: diffDays };
    }).sort((a, b) => a.daysLeft - b.daysLeft);
  }, [tasks, currentUser]);
  return (
    <div className="relative" ref={wrapperRef}>
      <button onClick={() => setIsOpen(!isOpen)} className="relative p-2 text-slate-300 hover:text-white transition-colors rounded-full hover:bg-slate-800" title="Vencimientos Próximos">
        <Bell className="w-5 h-5" />
        {notifications.length > 0 && (
          <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-rose-500 rounded-full border-2 border-slate-900 flex items-center justify-center text-[8px] font-bold text-white">
            {notifications.length > 9 ? '9+' : notifications.length}
          </span>
        )}
      </button>
      {isOpen && (
        <div className="absolute top-full right-0 mt-2 w-84 bg-white rounded-xl shadow-2xl border border-slate-200 z-50 overflow-hidden animate-in fade-in zoom-in-95">
          <div className="bg-slate-50 p-3 border-b border-slate-200 flex justify-between items-center">
            <h3 className="font-bold text-slate-700 text-sm flex items-center gap-2"><Clock className="w-4 h-4 text-indigo-600"/> Vencimientos Próximos</h3>
            <span className="bg-indigo-100 text-indigo-700 text-xs px-2 py-0.5 rounded-full font-bold">{notifications.length}</span>
          </div>
          <div className="max-h-80 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-sm"><CheckCircle2 className="w-8 h-8 mx-auto mb-2 opacity-20 text-emerald-500"/>¡Todo al día! Sin vencimientos pendientes inmediatos.</div>
            ) : (
              <div className="divide-y divide-slate-100">
                {notifications.map(n => (
                  <div key={n.id} onClick={() => { onOpenTask(n); setIsOpen(false); }} className="p-3 hover:bg-indigo-50 cursor-pointer transition-colors group">
                    <div className="flex items-start gap-3">
                      <div className={`mt-1 w-2.5 h-2.5 rounded-full shrink-0 ${n.alertType === 'overdue' ? 'bg-rose-500' : n.alertType === 'urgent' ? 'bg-amber-500' : 'bg-blue-400'}`}></div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-slate-800 group-hover:text-indigo-700 truncate leading-tight">{n.title}</p>
                        {n.client && <p className="text-xs text-indigo-600 font-medium truncate mt-0.5">{n.client}</p>}
                        <div className="flex items-center gap-2 mt-1">
                            <span className={`text-[10px] font-bold ${n.alertType === 'overdue' ? 'text-rose-600' : n.alertType === 'urgent' ? 'text-amber-600' : 'text-slate-500'}`}>
                                {n.daysLeft < 0 ? `Vencido hace ${Math.abs(n.daysLeft)} d` : n.daysLeft === 0 ? 'Vence Hoy' : `Quedan ${n.daysLeft} días`}
                            </span>
                            <span className="text-[10px] text-slate-400 border-l border-slate-200 pl-2">{normalizeType(n.type)}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

const SimpleBarChart = ({ data, colorClass = "bg-indigo-500", labelKey = "name", valueKey = "value" }) => {
  const max = Math.max(...data.map(d => d[valueKey]), 1);
  return (
    <div className="space-y-3">
      {data.map((item, idx) => (
        <div key={idx} className="flex items-center gap-3 text-sm">
          <div className="w-48 font-medium text-slate-600 truncate text-right text-xs" title={item[labelKey]}>{item[labelKey]}</div>
          <div className="flex-1 h-3 bg-slate-100 rounded-full overflow-hidden">
            <div className={`h-full rounded-full ${colorClass} transition-all duration-1000 ease-out`} style={{ width: `${(item[valueKey] / max) * 100}%` }}></div>
          </div>
          <div className="w-8 font-bold text-slate-700 text-xs">{item[valueKey]}</div>
        </div>
      ))}
    </div>
  );
};

// --- VISTA GTD: CENTRO DE ACCIONES Y TRÁMITES ---
const GTDView = ({ tasks, currentUser, onEditParent }) => {
  const [activeTab, setActiveTab] = useState('overview'); 
  const [waitingViewMode, setWaitingViewMode] = useState('person'); 
  const [expandedGroups, setExpandedGroups] = useState({});
  const [localSearch, setLocalSearch] = useState(''); 

  const { myActionsGrouped, waitingByTask, waitingByPerson, totalMine, totalWaiting } = useMemo(() => {
    const mine = {};
    const wTask = {};
    const wPerson = {};
    let countMine = 0;
    let countWaiting = 0;
    const s = localSearch.toLowerCase();

    tasks.forEach(task => {
      const normStatus = normalizeStatus(task.status);
      if (!task.actions || task.actions.length === 0 || normStatus === 'Presentado / Tramitado') return;
      task.actions.forEach(action => {
        if (action.isCompleted) return;
        const matchesSearch = (task.title || '').toLowerCase().includes(s) || 
                              (task.client || '').toLowerCase().includes(s) || 
                              (action.text || '').toLowerCase().includes(s) || 
                              (action.assignee && action.assignee.toLowerCase().includes(s));
        if (!matchesSearch) return;

        const actionItem = { ...action, parentTask: task };
        if (action.assignee === currentUser.email) {
          if (!mine[task.id]) mine[task.id] = { title: task.title, client: task.client, actions: [], task: task };
          mine[task.id].actions.push(actionItem);
          countMine++;
        } else {
          const amIInvolved = task.createdBy === currentUser.email || (task.assignees && task.assignees.includes(currentUser.email));
          if (amIInvolved) {
            if (!wTask[task.id]) wTask[task.id] = { title: task.title, client: task.client, actions: [], task: task };
            wTask[task.id].actions.push(actionItem);
            const person = action.assignee || 'Sin Asignar';
            if (!wPerson[person]) wPerson[person] = { name: person, actions: [] };
            wPerson[person].actions.push(actionItem);
            countWaiting++;
          }
        }
      });
    });

    return { 
      myActionsGrouped: Object.values(mine), 
      waitingByTask: Object.values(wTask),
      waitingByPerson: Object.values(wPerson).sort((a, b) => a.name.localeCompare(b.name)),
      totalMine: countMine,
      totalWaiting: countWaiting
    };
  }, [tasks, currentUser, localSearch]);

  const toggleGroup = (groupId, context) => {
    const key = `${context}_${groupId}`;
    setExpandedGroups(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const handleToggleAll = (expand) => {
    const newState = { ...expandedGroups };
    myActionsGrouped.forEach(g => newState[`mine_${g.task.id}`] = !expand);
    waitingByTask.forEach(g => newState[`waiting_task_${g.task.id}`] = !expand);
    waitingByPerson.forEach(p => newState[`waiting_person_${p.name}`] = !expand);
    setExpandedGroups(newState);
  };

  const toggleActionQuick = async (actionItem) => {
    const taskRef = doc(db, 'expedientes', actionItem.parentTask.id);
    const updatedActions = actionItem.parentTask.actions.map(a => a.id === actionItem.id ? { ...a, isCompleted: true } : a);
    try {
      await updateDoc(taskRef, { 
          actions: updatedActions, 
          updatedBy: currentUser.email, 
          lastUpdated: serverTimestamp() 
      });
    } catch (e) {
      // Intento en tasks por compatibilidad
      await updateDoc(doc(db, 'tasks', actionItem.parentTask.id), { 
        actions: updatedActions, 
        updatedBy: currentUser.email, 
        lastUpdated: serverTimestamp() 
      });
    }
  };

  const exportChecklist = (person) => {
    const date = new Date().toLocaleDateString('es-ES');
    let content = `CHECKLIST DE TRÁMITES PENDIENTES - ${person.name.toUpperCase()}\n`;
    content += `Fecha: ${date}\n--------------------------------------------------\n\n`;
    person.actions.forEach((action) => {
      content += `[ ] ${action.text}\n    Expediente: ${action.parentTask.title} (Cliente: ${action.parentTask.client || 'N/A'})\n\n`;
    });
    const blob = new Blob([content], { type: 'application/msword;charset=utf-8' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `Checklist_Tramites_${person.name.split('@')[0]}_${date.replace(/\//g, '-')}.doc`;
    link.click();
  };

  const ActionCheckbox = ({ onClick }) => (
    <button onClick={onClick} className="w-6 h-6 rounded-md border-2 border-slate-300 bg-white flex items-center justify-center shrink-0 hover:border-emerald-500 hover:bg-emerald-50 transition-all shadow-sm group/check" title="Marcar como completado">
        <Check className="w-4 h-4 text-emerald-500 opacity-0 group-hover/check:opacity-100 transition-opacity" strokeWidth={3}/>
    </button>
  );

  const TaskLinkBadge = ({ task }) => (
    <button onClick={() => onEditParent(task)} className="flex items-center gap-1.5 px-2.5 py-1 bg-indigo-50 text-indigo-700 rounded-lg text-[10px] font-bold hover:bg-indigo-600 hover:text-white transition-all border border-indigo-100 shadow-sm uppercase tracking-tight shrink-0">
        <ExternalLink className="w-3 h-3"/> Abrir Expediente
    </button>
  );

  return (
    <div className="w-full space-y-6 animate-in fade-in duration-300">
      {/* HEADER */}
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col lg:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-4">
            <div className="bg-indigo-600 p-3 rounded-xl shadow-lg shadow-indigo-100"><Target className="text-white w-6 h-6"/></div>
            <div>
                <h2 className="text-2xl font-black text-slate-800 tracking-tight">Centro de Trámites y Pasos (GTD)</h2>
                <p className="text-xs text-slate-500 font-bold uppercase tracking-wider">Gestión ágil de pasos inmediatos por expediente</p>
            </div>
          </div>
          <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200">
            <button onClick={() => setActiveTab('overview')} className={`px-4 py-2 text-xs font-bold rounded-lg transition-all ${activeTab === 'overview' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500'}`}>Visión General</button>
            <button onClick={() => setActiveTab('actions')} className={`px-4 py-2 text-xs font-bold rounded-lg transition-all ${activeTab === 'actions' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500'}`}>Mis Trámites ({totalMine})</button>
            <button onClick={() => setActiveTab('waiting')} className={`px-4 py-2 text-xs font-bold rounded-lg transition-all ${activeTab === 'waiting' ? 'bg-white text-amber-600 shadow-sm' : 'text-slate-500'}`}>Esperando Respuesta ({totalWaiting})</button>
          </div>
      </div>

      {/* CONTROLES */}
      <div className="flex flex-col md:flex-row justify-between items-center gap-4 px-1">
          <div className="relative w-full md:w-96">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400"/>
              <input type="text" placeholder="Buscar por cliente, expediente o trámite..." value={localSearch} onChange={(e) => setLocalSearch(e.target.value)} className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all shadow-sm" />
          </div>
          <div className="flex items-center gap-4">
              <button onClick={() => handleToggleAll(true)} className="text-xs font-bold text-indigo-600 uppercase flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 rounded-lg hover:bg-indigo-100 transition-colors"><Plus className="w-3.5 h-3.5"/> Desplegar Todo</button>
              <button onClick={() => handleToggleAll(false)} className="text-xs font-bold text-slate-500 uppercase flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors"><Minus className="w-3.5 h-3.5"/> Plegar Todo</button>
          </div>
      </div>

      <div className={`grid gap-8 ${activeTab === 'overview' ? 'grid-cols-1 lg:grid-cols-2' : 'grid-cols-1'}`}>
          {/* COLUMNA: MIS ACCIONES */}
          {(activeTab === 'overview' || activeTab === 'actions') && (
            <div className="space-y-4">
                <div className="flex items-center gap-2 pb-2 border-b-2 border-emerald-500 w-fit pr-8">
                    <CheckCircle2 className="w-5 h-5 text-emerald-500"/>
                    <h3 className="font-bold text-slate-800 text-sm uppercase tracking-wide">Mis Próximos Trámites ({totalMine})</h3>
                </div>
                {myActionsGrouped.length === 0 ? (
                  <div className="p-8 bg-white border border-dashed border-slate-200 rounded-xl text-center text-slate-400 text-xs">Sin trámites asignados pendientes</div>
                ) : (
                  myActionsGrouped.map(group => (
                    <div key={group.task.id} className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-all">
                        <div onClick={() => toggleGroup(group.task.id, 'mine')} className="flex items-center justify-between p-4 bg-slate-50/50 cursor-pointer hover:bg-slate-50">
                            <div className="flex items-center gap-3">
                                {expandedGroups[`mine_${group.task.id}`] ? <ChevronRight className="w-4 h-4 text-slate-400"/> : <ChevronDown className="w-4 h-4 text-slate-400"/>}
                                <div>
                                  <span className="font-bold text-slate-800 text-sm block">{group.title}</span>
                                  {group.client && <span className="text-xs text-indigo-600 font-semibold">{group.client}</span>}
                                </div>
                                <span className="bg-white border border-slate-200 text-slate-600 text-[10px] px-2 py-0.5 rounded-full font-bold">{group.actions.length} pasos</span>
                            </div>
                            <TaskLinkBadge task={group.task}/>
                        </div>
                        {!expandedGroups[`mine_${group.task.id}`] && (
                            <div className="p-3 space-y-2 bg-white">
                                {group.actions.map((action, i) => (
                                    <div key={i} className="flex gap-4 items-center p-3 rounded-xl hover:bg-slate-50 border border-transparent hover:border-slate-100 transition-colors">
                                        <ActionCheckbox onClick={() => toggleActionQuick(action)} />
                                        <p className="text-sm text-slate-700 font-medium leading-relaxed">{action.text}</p>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                  ))
                )}
            </div>
          )}

          {/* COLUMNA: ESPERANDO POR OTROS */}
          {(activeTab === 'overview' || activeTab === 'waiting') && (
            <div className="space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b-2 border-amber-500 pb-2">
                    <div className="flex items-center gap-2">
                        <Users className="w-5 h-5 text-amber-500"/>
                        <h3 className="font-bold text-slate-800 text-sm uppercase tracking-wide">Esperando Documentación / Respuesta ({totalWaiting})</h3>
                    </div>
                    <div className="flex bg-slate-200/50 p-1 rounded-lg border border-slate-200">
                        <button onClick={() => setWaitingViewMode('task')} className={`px-3 py-1 text-[10px] font-bold uppercase rounded transition-all ${waitingViewMode === 'task' ? 'bg-white text-amber-700 shadow-sm' : 'text-slate-500'}`}>Por Expediente</button>
                        <button onClick={() => setWaitingViewMode('person')} className={`px-3 py-1 text-[10px] font-bold uppercase rounded transition-all ${waitingViewMode === 'person' ? 'bg-white text-amber-700 shadow-sm' : 'text-slate-500'}`}>Por Responsable</button>
                    </div>
                </div>

                {waitingViewMode === 'task' ? (
                    waitingByTask.map(group => (
                        <div key={group.task.id} className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                            <div onClick={() => toggleGroup(group.task.id, 'waiting_task')} className="flex items-center justify-between p-4 bg-slate-50/50 cursor-pointer hover:bg-slate-50">
                                <div className="flex items-center gap-3">
                                    {expandedGroups[`waiting_task_${group.task.id}`] ? <ChevronRight className="w-4 h-4 text-slate-400"/> : <ChevronDown className="w-4 h-4 text-slate-400"/>}
                                    <div>
                                      <span className="font-bold text-slate-800 text-sm block">{group.title}</span>
                                      {group.client && <span className="text-xs text-amber-600 font-semibold">{group.client}</span>}
                                    </div>
                                    <span className="bg-white border border-slate-200 text-slate-500 text-[10px] px-2 py-0.5 rounded-full font-bold">{group.actions.length} pasos</span>
                                </div>
                                <TaskLinkBadge task={group.task}/>
                            </div>
                            {!expandedGroups[`waiting_task_${group.task.id}`] && (
                                <div className="p-3 space-y-2 bg-white">
                                    {group.actions.map((action, i) => (
                                        <div key={i} className="flex justify-between items-center p-3 rounded-xl border border-slate-50 bg-slate-50/30">
                                            <div className="flex gap-4 items-center">
                                                <ActionCheckbox onClick={() => toggleActionQuick(action)} />
                                                <div>
                                                    <p className="text-sm text-slate-700 font-medium">{action.text}</p>
                                                    <span className="text-[10px] text-amber-700 font-bold uppercase mt-1 block tracking-wider">{action.assignee}</span>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    ))
                ) : (
                    waitingByPerson.map(person => (
                        <div key={person.name} className="bg-white border border-amber-100 rounded-xl overflow-hidden shadow-sm">
                            <div onClick={() => toggleGroup(person.name, 'waiting_person')} className="flex items-center justify-between p-4 bg-amber-50/30 cursor-pointer border-b border-amber-100 hover:bg-amber-50/50 transition-colors">
                                <div className="flex items-center gap-3 min-w-0">
                                    {expandedGroups[`waiting_person_${person.name}`] ? <ChevronRight className="w-4 h-4 text-amber-400"/> : <ChevronDown className="w-4 h-4 text-amber-400"/>}
                                    <span className="font-bold text-amber-950 text-sm truncate">{person.name}</span>
                                    <span className="bg-amber-500 text-white text-[10px] px-2 py-0.5 rounded-full font-bold shrink-0">{person.actions.length} pasos</span>
                                </div>
                                <button onClick={(e) => { e.stopPropagation(); exportChecklist(person); }} className="flex items-center gap-1.5 px-3 py-1.5 bg-white text-amber-700 border border-amber-200 rounded-lg text-[10px] font-bold hover:bg-amber-600 hover:text-white transition-all shadow-sm shrink-0">
                                    <FileText className="w-3.5 h-3.5"/> EXPORTAR
                                </button>
                            </div>
                            {!expandedGroups[`waiting_person_${person.name}`] && (
                                <div className="p-3 space-y-3 bg-white">
                                    {person.actions.map((action, i) => (
                                        <div key={i} className="p-4 rounded-xl border border-slate-100 bg-slate-50/30 flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all hover:bg-white hover:border-indigo-100">
                                            <div className="flex gap-4 items-center flex-1">
                                                <ActionCheckbox onClick={() => toggleActionQuick(action)} />
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-sm text-slate-800 font-semibold mb-1 break-words">{action.text}</p>
                                                    <p className="text-[11px] text-slate-500 font-medium italic flex items-center gap-1 truncate" title={action.parentTask.title}>
                                                       <Target className="w-3 h-3 shrink-0 text-slate-400"/> {action.parentTask.title} {action.parentTask.client ? `(${action.parentTask.client})` : ''}
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="shrink-0 flex justify-end">
                                              <TaskLinkBadge task={action.parentTask}/>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    ))
                )}
            </div>
          )}
      </div>
    </div>
  );
};

// --- VISTA ROADMAP: CRONOGRAMA DE VENCIMIENTOS ---
const RoadmapView = ({ tasks, onEdit }) => {
    const today = new Date();
    const startOfCurrentMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const startOfNextMonth = new Date(today.getFullYear(), today.getMonth() + 1, 1);
    const startOfFuture = new Date(today.getFullYear(), today.getMonth() + 2, 1);
    const monthNames = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
    const currentMonthName = monthNames[today.getMonth()];
    const nextMonthName = monthNames[(today.getMonth() + 1) % 12];
    
    const buckets = useMemo(() => {
        const acc = { overdue: [], current: [], next: [], future: [] };
        tasks.forEach(task => {
            const normStatus = normalizeStatus(task.status);
            if (normStatus === 'Trámite Periódico') return;
            if (!task.dueDate) return;
            const due = new Date(task.dueDate);
            const isCompleted = normStatus === 'Presentado / Tramitado';
            if (due < startOfCurrentMonth && !isCompleted) { acc.overdue.push(task); } 
            else if (due >= startOfCurrentMonth && due < startOfNextMonth) { acc.current.push(task); } 
            else if (due >= startOfNextMonth && due < startOfFuture) { acc.next.push(task); } 
            else if (due >= startOfFuture) { acc.future.push(task); }
        });
        Object.keys(acc).forEach(key => { acc[key].sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate)); });
        return acc;
    }, [tasks]);

    const RoadmapCard = ({ task }) => {
        const delay = getDelayDays(task);
        return (
            <div onClick={() => onEdit(task)} className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm hover:shadow-md hover:border-indigo-300 cursor-pointer group transition-all">
                <div className="flex justify-between items-start mb-1">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{normalizeDepartment(task.department)}</span>
                    <Badge text={task.status} size="[10px]"/>
                </div>
                <h4 className="font-bold text-sm text-slate-800 leading-tight mb-1 group-hover:text-indigo-700">{task.title}</h4>
                {task.client && <div className="text-xs text-indigo-600 font-semibold mb-2 flex items-center gap-1"><Building2 className="w-3 h-3"/> {task.client}</div>}
                <div className="flex items-center gap-2 text-xs text-slate-500">
                    <Clock className="w-3 h-3"/> 
                    <span className={delay > 0 ? "text-rose-600 font-bold" : ""}>
                        {new Date(task.dueDate).toLocaleDateString('es-ES', {month: 'short', day: 'numeric'})}
                        {delay > 0 && ` (+${delay}d demora)`}
                    </span>
                </div>
            </div>
        );
    };

    return (
        <div className="space-y-4 animate-in fade-in duration-300">
            <div className="flex items-center gap-2 mb-2">
                <CalendarCheck className="w-6 h-6 text-indigo-600"/>
                <div>
                  <h2 className="text-xl font-bold text-slate-800">Cronograma de Vencimientos</h2>
                  <p className="text-xs text-slate-500">Visualización de plazos fiscales y fechas límite de expedientes</p>
                </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 min-h-[500px]">
                <div className="flex flex-col bg-rose-50/50 rounded-xl border border-rose-100">
                    <div className="p-3 border-b border-rose-100 bg-rose-100/50 rounded-t-xl flex justify-between items-center"><h3 className="font-bold text-rose-800 text-sm flex items-center gap-2"><AlertTriangle className="w-4 h-4"/> Fuera de Plazo</h3><span className="bg-white text-rose-600 text-xs font-bold px-2 py-0.5 rounded-full">{buckets.overdue.length}</span></div>
                    <div className="flex-1 overflow-y-auto p-3 space-y-2">{buckets.overdue.map(t => <RoadmapCard key={t.id} task={t}/>)}</div>
                </div>
                <div className="flex flex-col bg-slate-100 rounded-xl border border-slate-200">
                    <div className="p-3 border-b border-slate-200 bg-slate-200 rounded-t-xl flex justify-between items-center"><h3 className="font-bold text-slate-700 text-sm flex items-center gap-2"><CalendarDays className="w-4 h-4"/> {currentMonthName} (Mes Actual)</h3><span className="bg-white text-slate-600 text-xs font-bold px-2 py-0.5 rounded-full">{buckets.current.length}</span></div>
                    <div className="flex-1 overflow-y-auto p-3 space-y-2">{buckets.current.map(t => <RoadmapCard key={t.id} task={t}/>)}</div>
                </div>
                <div className="flex flex-col bg-slate-50/50 rounded-xl border border-slate-200">
                    <div className="p-3 border-b border-slate-200 bg-slate-100/50 rounded-t-xl flex justify-between items-center"><h3 className="font-bold text-slate-600 text-sm">{nextMonthName} (Próximo)</h3><span className="bg-white text-slate-500 text-xs font-bold px-2 py-0.5 rounded-full">{buckets.next.length}</span></div>
                    <div className="flex-1 overflow-y-auto p-3 space-y-2">{buckets.next.map(t => <RoadmapCard key={t.id} task={t}/>)}</div>
                </div>
                <div className="flex flex-col bg-slate-50/30 rounded-xl border border-slate-100">
                    <div className="p-3 border-b border-slate-100 bg-slate-50 rounded-t-xl flex justify-between items-center"><h3 className="font-bold text-slate-400 text-sm">Horizonte Posterior</h3><span className="bg-slate-100 text-slate-400 text-xs font-bold px-2 py-0.5 rounded-full">{buckets.future.length}</span></div>
                    <div className="flex-1 overflow-y-auto p-3 space-y-2">{buckets.future.map(t => <RoadmapCard key={t.id} task={t}/>)}</div>
                </div>
            </div>
        </div>
    );
};

// --- VISTA ADMIN: GESTIÓN Y AUDITORÍA DEL DESPACHO ---
const AdminView = ({ tasks, currentAdmin, logAction }) => {
  const [selectedTasks, setSelectedTasks] = useState([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [newAdminEmail, setNewAdminEmail] = useState('');
  const [adminList, setAdminList] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [adminSearchTerm, setAdminSearchTerm] = useState('');

  useEffect(() => {
    const unsubAdmins = onSnapshot(doc(db, 'settings', 'config'), (docSnap) => { 
        if (docSnap.exists()) { setAdminList(docSnap.data().admins || []); } 
    });
    
    const q = query(collection(db, 'audit_logs'), orderBy('timestamp', 'desc'), limit(50));
    const unsubLogs = onSnapshot(q, (snapshot) => { 
        setAuditLogs(snapshot.docs.map(d => ({ id: d.id, ...d.data() }))); 
    });

    return () => { unsubAdmins(); unsubLogs(); };
  }, []);

  const toggleSelect = (id) => { selectedTasks.includes(id) ? setSelectedTasks(selectedTasks.filter(tid => tid !== id)) : setSelectedTasks([...selectedTasks, id]); };
  
  const deleteSelected = async () => {
    if (selectedTasks.length === 0) return;
    if (!window.confirm(`¿Eliminar permanentemente ${selectedTasks.length} expedientes? Esta acción es irreversible.`)) return;
    setIsProcessing(true);
    try {
      const batch = writeBatch(db);
      selectedTasks.forEach(id => { 
          const task = tasks.find(t => t.id === id);
          if (task) { logAction('Eliminado Expediente', `Título: ${task.title} - Cliente: ${task.client || 'N/A'}`); }
          // Intento borrar en expedientes y tasks
          batch.delete(doc(db, 'expedientes', id)); 
          batch.delete(doc(db, 'tasks', id));
      });
      await batch.commit();
      setSelectedTasks([]); alert("Expedientes eliminados correctamente.");
    } catch (e) { alert("Error al eliminar: " + e.message); }
    setIsProcessing(false);
  };

  const handleAddAdmin = async () => {
      if(!newAdminEmail.trim()) return;
      try { 
          await updateDoc(doc(db, 'settings', 'config'), { admins: arrayUnion(newAdminEmail.toLowerCase().trim()) }); 
          logAction('Añadido Administrador', newAdminEmail); 
          setNewAdminEmail(''); 
      } catch (e) { alert("Error al añadir administrador: " + e.message); }
  };

  const handleRemoveAdmin = async (email) => {
      if(email === currentAdmin) { alert("No puedes revocar tus propios permisos."); return; }
      if(!confirm(`¿Revocar permisos de administrador a ${email}?`)) return;
      try { 
          await updateDoc(doc(db, 'settings', 'config'), { admins: arrayRemove(email) }); 
          logAction('Revocado Administrador', email); 
      } catch (e) { alert("Error al revocar: " + e.message); }
  };

  const exportAuditLogs = async () => {
      if(!confirm("¿Descargar historial completo de auditoría?")) return;
      try {
          const q = query(collection(db, 'audit_logs'), orderBy('timestamp', 'desc'));
          const snapshot = await getDocs(q);
          const data = snapshot.docs.map(d => {
              const log = d.data();
              return {
                  Fecha: log.timestamp ? new Date(log.timestamp.seconds * 1000).toLocaleString('es-ES') : '',
                  Usuario: log.user,
                  Acción: log.action,
                  Detalles: log.details
              };
          });
          const worksheet = XLSX.utils.json_to_sheet(data);
          const workbook = XLSX.utils.book_new();
          XLSX.utils.book_append_sheet(workbook, worksheet, "Auditoría");
          XLSX.writeFile(workbook, `Registro_Auditoria_${new Date().toISOString().slice(0,10)}.xlsx`);
      } catch (e) { alert("Error al exportar auditoría: " + e.message); }
  };

  const filteredAdminTasks = tasks.filter(t => 
    (t.title || '').toLowerCase().includes(adminSearchTerm.toLowerCase()) || 
    (t.client || '').toLowerCase().includes(adminSearchTerm.toLowerCase())
  );

  return (
    <div className="max-w-5xl mx-auto space-y-6 animate-in fade-in duration-300">
      
      {/* SECCIÓN 1: GESTIÓN DE ADMINISTRADORES */}
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2 mb-4"><Lock className="text-indigo-600"/> Gestión del Equipo y Privilegios</h2>
          <div className="flex flex-col md:flex-row gap-6">
              <div className="flex-1">
                  <label className="text-xs font-bold text-slate-500 uppercase">Añadir Administrador del Despacho</label>
                  <div className="flex gap-2 mt-2">
                      <input type="email" value={newAdminEmail} onChange={e=>setNewAdminEmail(e.target.value)} placeholder="gestor@asesoria.com" className="flex-1 border border-slate-300 rounded-lg p-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500"/>
                      <button onClick={handleAddAdmin} className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700">Añadir</button>
                  </div>
              </div>
              <div className="flex-1 border-l border-slate-100 pl-0 md:pl-6">
                  <label className="text-xs font-bold text-slate-500 uppercase mb-2 block">Administradores Actuales</label>
                  <div className="space-y-2 max-h-32 overflow-y-auto">
                      {adminList.map(email => (
                          <div key={email} className="flex justify-between items-center bg-slate-50 p-2 rounded border border-slate-100 text-sm">
                              <span className="text-slate-700 font-medium">{email}</span>
                              {email !== currentAdmin && (<button onClick={() => handleRemoveAdmin(email)} className="text-rose-400 hover:text-rose-600 px-2" title="Eliminar">✕</button>)}
                          </div>
                      ))}
                  </div>
              </div>
          </div>
      </div>

      {/* SECCIÓN 2: REGISTRO DE ACTIVIDAD Y AUDITORÍA */}
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2"><FileText className="text-indigo-600"/> Registro de Auditoría de Expedientes</h2>
            <button onClick={exportAuditLogs} className="text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-1.5 rounded border border-slate-200 flex items-center gap-1 transition-colors"><Download className="w-3 h-3"/> Descargar Auditoría</button>
          </div>
          <div className="overflow-x-auto max-h-60 border border-slate-100 rounded-lg">
              <table className="w-full text-xs text-left">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase sticky top-0">
                      <tr><th className="p-3">Fecha y Hora</th><th className="p-3">Asesor / Usuario</th><th className="p-3">Acción</th><th className="p-3">Detalles</th></tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                      {auditLogs.map(log => (
                          <tr key={log.id} className="hover:bg-slate-50">
                              <td className="p-3 text-slate-400 whitespace-nowrap">{log.timestamp ? new Date(log.timestamp.seconds * 1000).toLocaleString('es-ES') : '-'}</td>
                              <td className="p-3 font-medium text-slate-700">{log.user}</td>
                              <td className="p-3"><span className={`px-2 py-0.5 rounded-full border ${log.action && log.action.includes('Eliminado') ? 'bg-rose-50 text-rose-700 border-rose-100' : 'bg-slate-100 text-slate-600 border-slate-200'}`}>{log.action || 'Desconocida'}</span></td>
                              <td className="p-3 text-slate-500 truncate max-w-xs" title={log.details}>{log.details}</td>
                          </tr>
                      ))}
                      {auditLogs.length === 0 && <tr><td colSpan="4" className="p-4 text-center text-slate-400">Sin actividad registrada todavía.</td></tr>}
                  </tbody>
              </table>
          </div>
      </div>

      {/* SECCIÓN 3: GESTIÓN Y LIMPIEZA DE EXPEDIENTES */}
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col gap-4">
        <div className="flex justify-between items-center">
            <div><h2 className="text-xl font-bold text-slate-800 flex items-center gap-2"><Database className="text-indigo-600"/> Gestión de Base de Datos</h2><p className="text-xs text-slate-500">Selecciona expedientes para su eliminación permanente.</p></div>
            <button onClick={deleteSelected} disabled={selectedTasks.length === 0 || isProcessing} className="bg-rose-50 text-rose-600 hover:bg-rose-600 hover:text-white border border-rose-200 px-4 py-2 rounded-lg font-bold text-sm transition-colors flex items-center gap-2 disabled:opacity-50"><Trash2 className="w-4 h-4"/> Eliminar Seleccionados ({selectedTasks.length})</button>
        </div>
        <div className="relative">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400"/>
            <input type="text" placeholder="Buscar expedientes o clientes para eliminar..." value={adminSearchTerm} onChange={e => setAdminSearchTerm(e.target.value)} className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none"/>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <table className="w-full text-sm text-left">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase text-xs">
                <tr><th className="p-4 w-10 text-center"><input type="checkbox" onChange={(e) => { if (e.target.checked) setSelectedTasks(filteredAdminTasks.map(t => t.id)); else setSelectedTasks([]); }} checked={filteredAdminTasks.length > 0 && selectedTasks.length === filteredAdminTasks.length} /></th><th className="p-4">Expediente</th><th className="p-4">Cliente</th><th className="p-4">Tipo</th><th className="p-4">Área</th><th className="p-4">Estado</th><th className="p-4">Creado por</th></tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
                {filteredAdminTasks.map(task => (
                    <tr key={task.id} className={`hover:bg-slate-50 transition-colors ${selectedTasks.includes(task.id) ? 'bg-indigo-50/50' : ''}`}>
                        <td className="p-4 text-center"><input type="checkbox" checked={selectedTasks.includes(task.id)} onChange={() => toggleSelect(task.id)} /></td>
                        <td className="p-4 font-semibold text-slate-800">{task.title}</td>
                        <td className="p-4 text-indigo-600 font-medium">{task.client || '-'}</td>
                        <td className="p-4 text-slate-500 text-xs">{normalizeType(task.type)}</td>
                        <td className="p-4 text-slate-500 text-xs">{normalizeDepartment(task.department)}</td>
                        <td className="p-4"><Badge text={task.status} /></td>
                        <td className="p-4 text-xs text-slate-400">{task.createdBy}</td>
                    </tr>
                ))}
            </tbody>
        </table>
      </div>
    </div>
  );
};

// --- VISTA ANALYTICS: CUADRO DE MANDO DEL DESPACHO ---
const AnalyticsView = ({ tasks }) => {
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  
  const annualTasks = useMemo(() => tasks.filter(t => {
    const norm = normalizeStatus(t.status);
    return norm === 'Trámite Periódico' || t.dueDate?.startsWith(selectedYear.toString());
  }), [tasks, selectedYear]);

  const stats = useMemo(() => {
    const totalCount = annualTasks.length;
    const periodicCount = annualTasks.filter(t => normalizeStatus(t.status) === 'Trámite Periódico').length;
    const projectTasks = annualTasks.filter(t => normalizeStatus(t.status) !== 'Trámite Periódico'); 
    const projectCount = projectTasks.length;
    const completed = projectTasks.filter(t => normalizeStatus(t.status) === 'Presentado / Tramitado').length;
    const onTrack = projectTasks.filter(t => normalizeStatus(t.status) === 'En Plazo').length;
    const behind = projectTasks.filter(t => normalizeStatus(t.status) === 'Pendiente Documentación').length;
    const urgent = projectTasks.filter(t => normalizeStatus(t.status) === 'Urgente / Próximo a Vencer').length;
    const inReview = projectTasks.filter(t => normalizeStatus(t.status) === 'En Revisión').length;
    const onHold = projectTasks.filter(t => normalizeStatus(t.status) === 'En Pausa / Suspendido').length;

    const byDept = MASTERS.departments.map(dept => ({
      name: dept, 
      value: projectTasks.filter(task => normalizeDepartment(task.department) === dept).length
    })).sort((a, b) => b.value - a.value);

    const byStatus = [
        { name: 'Presentado', value: completed, color: 'bg-blue-500', hexColor: '#3b82f6' },
        { name: 'En Plazo', value: onTrack, color: 'bg-emerald-500', hexColor: '#10b981' },
        { name: 'Pendiente Doc.', value: behind, color: 'bg-amber-400', hexColor: '#facc15' },
        { name: 'En Revisión', value: inReview, color: 'bg-purple-500', hexColor: '#a855f7' },
        { name: 'Urgente', value: urgent, color: 'bg-rose-500', hexColor: '#f43f5e' },
        { name: 'Suspendido', value: onHold, color: 'bg-slate-400', hexColor: '#94a3b8' }
    ].filter(i => i.value > 0);

    const uniqueUsers = [...new Set(annualTasks.flatMap(t => t.assignees || (t.assigneeEmail ? [t.assigneeEmail] : [])))];
    const byUser = uniqueUsers.map(email => {
      const userTasks = annualTasks.filter(t => (t.assignees && t.assignees.includes(email)) || t.assigneeEmail === email);
      const statusCounts = { 
          Completed: userTasks.filter(t => normalizeStatus(t.status) === 'Presentado / Tramitado').length, 
          OnTrack: userTasks.filter(t => normalizeStatus(t.status) === 'En Plazo').length, 
          Behind: userTasks.filter(t => normalizeStatus(t.status) === 'Pendiente Documentación').length, 
          Urgent: userTasks.filter(t => normalizeStatus(t.status) === 'Urgente / Próximo a Vencer').length, 
          OnHold: userTasks.filter(t => normalizeStatus(t.status) === 'En Pausa / Suspendido').length 
      };
      return { email, total: userTasks.length, statusCounts };
    }).sort((a, b) => b.total - a.total);

    const delayByType = DELAY_METRICS_TYPES.map(type => {
        const typeTasks = annualTasks.filter(t => normalizeType(t.type) === type && normalizeStatus(t.status) !== 'Trámite Periódico');
        const typeDelayed = typeTasks.filter(t => getDelayDays(t) > 0);
        const typeTotalDelay = typeDelayed.reduce((acc, t) => acc + getDelayDays(t), 0);
        return {
            type,
            reliability: typeTasks.length ? Math.round(((typeTasks.length - typeDelayed.length) / typeTasks.length) * 100) : 100,
            avgDelay: typeDelayed.length ? Math.round(typeTotalDelay / typeDelayed.length) : 0,
            count: typeTasks.length,
            delayedCount: typeDelayed.length
        };
    });

    return { totalCount, projectCount, periodicCount, completed, onTrack, behind, urgent, inReview, onHold, byDept, byStatus, byUser, delayByType };
  }, [annualTasks]);

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="flex flex-col md:flex-row justify-between items-center bg-white p-4 rounded-xl border border-slate-200 shadow-sm gap-4">
          <div>
            <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2"><PieChart className="text-indigo-600"/> Cuadro de Mando del Despacho</h2>
            <p className="text-xs text-slate-500">Métricas globales de tramitación, puntualidad fiscal y rendimiento</p>
          </div>
          <div className="flex items-center gap-4 bg-slate-50 p-1 rounded-lg border border-slate-200">
              <button onClick={() => setSelectedYear(y => y - 1)} className="p-1 hover:bg-white hover:shadow-sm rounded"><ChevronLeft className="w-5 h-5 text-slate-600"/></button>
              <span className="text-lg font-bold text-slate-800 min-w-[60px] text-center">{selectedYear}</span>
              <button onClick={() => setSelectedYear(y => y + 1)} className="p-1 hover:bg-white hover:shadow-sm rounded"><ChevronRight className="w-5 h-5 text-slate-600"/></button>
          </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
          <div className="bg-slate-800 text-white p-4 rounded-xl shadow-sm flex flex-col justify-between min-h-[100px]">
              <div className="text-slate-400 text-[10px] uppercase font-bold tracking-wider">Carga Total</div>
              <div className="text-3xl font-bold">{stats.totalCount}</div>
              <div className="text-[10px] text-slate-300 flex items-center gap-1 mt-1"><Activity className="w-3 h-3"/> {stats.projectCount} Plazos + {stats.periodicCount} Recurrentes</div>
          </div>
          <div className="bg-white p-4 rounded-xl border-l-4 border-l-blue-500 border border-slate-200 shadow-sm min-h-[100px]">
              <div className="text-slate-500 text-[10px] uppercase font-bold">Presentados</div>
              <div className="text-3xl font-bold text-blue-600">{stats.completed}</div>
              <div className="text-[10px] text-slate-400 mt-1">{Math.round((stats.completed/(stats.projectCount || 1))*100)}% de Éxito</div>
          </div>
          <div className="bg-white p-4 rounded-xl border-l-4 border-l-emerald-500 border border-slate-200 shadow-sm min-h-[100px]"><div className="text-slate-500 text-[10px] uppercase font-bold">En Plazo</div><div className="text-3xl font-bold text-emerald-600">{stats.onTrack}</div></div>
          <div className="bg-white p-4 rounded-xl border-l-4 border-l-amber-400 border border-slate-200 shadow-sm min-h-[100px]"><div className="text-slate-500 text-[10px] uppercase font-bold">Pendiente Doc.</div><div className="text-3xl font-bold text-amber-600">{stats.behind}</div></div>
          <div className="bg-white p-4 rounded-xl border-l-4 border-l-rose-500 border border-slate-200 shadow-sm min-h-[100px]"><div className="text-slate-500 text-[10px] uppercase font-bold">Urgentes / Vencidos</div><div className="text-3xl font-bold text-rose-600">{stats.urgent}</div></div>
          <div className="bg-white p-4 rounded-xl border-l-4 border-l-slate-400 border border-slate-200 shadow-sm min-h-[100px]"><div className="text-slate-500 text-[10px] uppercase font-bold">En Pausa</div><div className="text-3xl font-bold text-slate-500">{stats.onHold}</div></div>
      </div>

      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center gap-2 mb-4 border-b border-slate-100 pb-2"><Clock className="w-5 h-5 text-indigo-600"/><h3 className="font-bold text-slate-700">Puntualidad y Cumplimiento por Tipo de Trámite</h3></div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {stats.delayByType.map(t => (
                  <div key={t.type} className="bg-slate-50 rounded-xl p-4 border border-slate-100 flex flex-col justify-between">
                      <div className="flex justify-between items-start mb-2"><div className="font-bold text-slate-700 text-sm">{t.type}</div><span className="text-[10px] bg-white border border-slate-200 px-2 py-0.5 rounded-full text-slate-500">{t.count} Expedientes</span></div>
                      <div className="flex justify-between items-end">
                          <div><div className="text-[10px] uppercase text-slate-400 font-bold">Fiabilidad en Plazo</div><div className={`text-2xl font-bold ${t.reliability >= 80 ? 'text-emerald-600' : t.reliability >= 50 ? 'text-amber-600' : 'text-rose-600'}`}>{t.reliability}%</div></div>
                          <div className="text-right"><div className="text-[10px] uppercase text-slate-400 font-bold">Demora Media</div><div className="text-2xl font-bold text-slate-700">{t.avgDelay > 0 ? `${t.avgDelay}d` : '-'}</div></div>
                      </div>
                      <div className="mt-2 w-full bg-slate-200 h-1.5 rounded-full overflow-hidden"><div className={`h-full ${t.reliability >= 80 ? 'bg-emerald-500' : t.reliability >= 50 ? 'bg-amber-500' : 'bg-rose-500'}`} style={{width: `${t.reliability}%`}}></div></div>
                  </div>
              ))}
          </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm"><h3 className="font-bold text-slate-700 mb-4 flex items-center gap-2"><Briefcase className="w-4 h-4 text-indigo-600"/> Volumen de Expedientes por Área</h3><SimpleBarChart data={stats.byDept} /></div>
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm"><h3 className="font-bold text-slate-700 mb-4 flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-600"/> Distribución por Estado de Gestión</h3><SvgDonutChart data={stats.byStatus} /></div>
      </div>

      {stats.periodicCount > 0 && (
        <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-left">
          <div className="flex items-center gap-3">
            <div className="bg-indigo-100 p-2 rounded-full"><Activity className="w-5 h-5 text-indigo-600"/></div>
            <div>
              <h4 className="font-bold text-indigo-900 text-sm">Carga Periódica y Recurrente ({stats.periodicCount} trámites continuos)</h4>
              <p className="text-xs text-indigo-700">Asesorías recurrentes, conciliaciones y trámites continuos sin vencimiento fijo.</p>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <h3 className="font-bold text-slate-700 mb-4 flex items-center gap-2"><Users className="w-4 h-4 text-indigo-600"/> Carga de Trabajo por Asesor / Gestor</h3>
          <div className="space-y-4">
              {stats.byUser.map(u => (
                  <div key={u.email} className="flex items-center gap-3 text-sm">
                      <div className="w-28 sm:w-48 font-medium text-slate-600 truncate text-right text-xs" title={u.email}>{u.email.split('@')[0]}</div>
                      <div className="flex-1 h-4 bg-slate-100 rounded-full overflow-hidden flex">
                          <div className="bg-blue-500 h-full transition-all" style={{width: `${(u.statusCounts.Completed/u.total)*100}%`}}></div>
                          <div className="bg-emerald-500 h-full transition-all" style={{width: `${(u.statusCounts.OnTrack/u.total)*100}%`}}></div>
                          <div className="bg-amber-400 h-full transition-all" style={{width: `${(u.statusCounts.Behind/u.total)*100}%`}}></div>
                          <div className="bg-rose-500 h-full transition-all" style={{width: `${(u.statusCounts.Urgent/u.total)*100}%`}}></div>
                          <div className="bg-slate-400 h-full transition-all" style={{width: `${(u.statusCounts.OnHold/u.total)*100}%`}}></div>
                      </div>
                      <div className="w-8 font-bold text-slate-700 text-xs text-center">{u.total}</div>
                  </div>
              ))}
          </div>
      </div>
    </div>
  );
};

// --- VISTA PLAN: MATRIZ TRIMESTRAL DE VENCIMIENTOS FISCALES (1T, 2T, 3T, 4T) ---
const AnnualPlanView = ({ tasks, currentUser, onEdit }) => {
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedQuarter, setSelectedQuarter] = useState('Todos'); 
  const quarters = selectedQuarter === 'Todos' ? ['1T', '2T', '3T', '4T'] : [selectedQuarter];
  const [editingReview, setEditingReview] = useState(null); 
  const [reviewText, setReviewText] = useState('');
  
  const getQuarter = (dateStr) => { 
      if (!dateStr) return 'Desconocido'; 
      const month = new Date(dateStr).getMonth() + 1; 
      return Math.ceil(month / 3) + 'T'; 
  };

  const annualTasks = tasks.filter(t => normalizeStatus(t.status) === 'Trámite Periódico' || t.dueDate?.startsWith(selectedYear.toString()));

  const exportFiscalMatrix = () => {
    const fiscalTasks = tasks.filter(t => normalizeType(t.type) === 'Vencimiento Fiscal' && t.dueDate && t.dueDate.startsWith(selectedYear.toString()));
    const months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
    
    let finalData = [
        ["CALENDARIO FISCAL Y VENCIMIENTOS " + selectedYear],
        ["Área / Departamento", ...months]
    ];

    let merges = [
        { s: { r: 0, c: 0 }, e: { r: 0, c: 12 } }
    ];

    let currentRow = 2;

    MASTERS.departments.forEach(dept => {
        const deptTasks = fiscalTasks.filter(t => normalizeDepartment(t.department) === dept);
        if (deptTasks.length === 0) return;

        const tasksByMonth = Array.from({ length: 12 }, () => []);
        deptTasks.forEach(t => {
            const m = new Date(t.dueDate).getMonth();
            tasksByMonth[m].push(`${t.title}${t.client ? ` [${t.client}]` : ''}`);
        });

        const rowsNeeded = Math.max(...tasksByMonth.map(m => m.length), 1);
        const startRow = currentRow;

        for (let i = 0; i < rowsNeeded; i++) {
            const row = [i === 0 ? dept : ""];
            months.forEach((_, mIdx) => {
                row.push(tasksByMonth[mIdx][i] || "");
            });
            finalData.push(row);
            currentRow++;
        }

        if (rowsNeeded > 1) {
            merges.push({
                s: { r: startRow, c: 0 },
                e: { r: currentRow - 1, c: 0 }
            });
        }
    });

    const worksheet = XLSX.utils.aoa_to_sheet(finalData);
    worksheet['!merges'] = merges;
    worksheet['!cols'] = [{ wch: 25 }, ...Array(12).fill({ wch: 22 })];

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Calendario Fiscal");
    XLSX.writeFile(workbook, `Calendario_Fiscal_${selectedYear}.xlsx`);
  };

  const saveTaskReview = async () => {
    if (!editingReview) return;
    const reviewKey = `${selectedYear}-${editingReview.quarter}`;
    const task = tasks.find(t => t.id === editingReview.taskId);
    const currentReviews = task.quarterlyReviews || {};
    const updatedReviews = { ...currentReviews, [reviewKey]: { text: reviewText, author: currentUser.email, updatedAt: new Date().toISOString() } };
    
    try {
      await updateDoc(doc(db, 'expedientes', editingReview.taskId), { 
          quarterlyReviews: updatedReviews, 
          lastUpdated: serverTimestamp(), 
          updatedBy: currentUser.email 
      });
    } catch(e) {
      await updateDoc(doc(db, 'tasks', editingReview.taskId), { 
        quarterlyReviews: updatedReviews, 
        lastUpdated: serverTimestamp(), 
        updatedBy: currentUser.email 
      });
    }
    setEditingReview(null);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="flex flex-col md:flex-row justify-between items-center bg-white p-4 rounded-xl border border-slate-200 shadow-sm gap-4">
          <div>
            <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2"><BarChart3 className="text-indigo-600"/> Matriz Trimestral de Vencimientos</h2>
            <p className="text-xs text-slate-500">Planificación por trimestres (1T, 2T, 3T, 4T) de obligaciones tributarias y contables</p>
          </div>
          <div className="flex flex-wrap items-center justify-end gap-3">
              <button onClick={exportFiscalMatrix} className="bg-slate-800 text-white px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-slate-700 flex items-center gap-2 shadow-sm transition-colors"><FileSpreadsheet className="w-3.5 h-3.5"/> Exportar Calendario Fiscal</button>
              <div className="flex items-center bg-slate-50 p-1 rounded-lg border border-slate-200">
                {['Todos', '1T', '2T', '3T', '4T'].map(q => (
                  <button key={q} onClick={() => setSelectedQuarter(q)} className={`px-3 py-1 text-xs font-bold transition-all rounded-md ${selectedQuarter === q ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>{q}</button>
                ))}
              </div>
              <div className="flex items-center gap-2 bg-slate-50 p-1 rounded-lg border border-slate-200">
                  <button onClick={() => setSelectedYear(y => y - 1)} className="p-1 hover:bg-white rounded"><ChevronLeft className="w-4 h-4 text-slate-600"/></button>
                  <span className="text-sm font-bold text-slate-800 min-w-[50px] text-center">{selectedYear}</span>
                  <button onClick={() => setSelectedYear(y => y + 1)} className="p-1 hover:bg-white rounded"><ChevronRight className="w-4 h-4 text-slate-600"/></button>
              </div>
          </div>
      </div>

      <div className="space-y-8">
        {MASTERS.types.map(type => {
            const typeHasTasks = annualTasks.some(t => normalizeType(t.type) === type);
            if (!typeHasTasks) return null;
            return (
                <div key={type} className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                    <div className="bg-slate-50 px-4 py-2.5 border-b border-slate-200"><h3 className="font-bold text-slate-700 uppercase tracking-wide text-xs">{type}</h3></div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left border-collapse">
                            <thead>
                                <tr>
                                    <th className="p-3 w-44 font-bold text-slate-500 bg-slate-50/50 border-r border-b border-slate-100 text-xs">Área</th>
                                    {quarters.map(q => <th key={q} className="p-3 text-center w-64 border-l border-b border-slate-100 text-xs font-bold text-slate-500 bg-slate-50/50">{q}</th>)}
                                </tr>
                            </thead>
                            <tbody>
                                {MASTERS.departments.map((dept, idx) => {
                                    const rowHasTasks = annualTasks.some(t => normalizeType(t.type) === type && normalizeDepartment(t.department) === dept);
                                    if (!rowHasTasks) return null;
                                    return (
                                        <tr key={dept} className={`transition-colors ${idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'} hover:bg-slate-50`}>
                                            <td className="p-3 border-r border-slate-100 font-bold text-slate-700 text-xs">{dept}</td>
                                            {quarters.map(q => {
                                                const cellTasks = annualTasks.filter(t => normalizeType(t.type) === type && normalizeDepartment(t.department) === dept && (normalizeStatus(t.status) === 'Trámite Periódico' || getQuarter(t.dueDate) === q));
                                                const reviewKey = `${selectedYear}-${q}`;
                                                return (
                                                    <td key={q} className="p-2 border-l border-slate-100 align-top min-w-[200px]">
                                                        <div className="space-y-2">
                                                            {cellTasks.map(task => {
                                                                const review = task.quarterlyReviews?.[reviewKey];
                                                                return (
                                                                    <div key={task.id} className="bg-white border border-slate-200 rounded-lg p-2.5 shadow-sm hover:border-indigo-300 transition-all">
                                                                        <div className="flex justify-between items-start gap-1 mb-1">
                                                                            <span onClick={() => onEdit(task)} className="font-bold text-slate-800 text-xs leading-tight cursor-pointer hover:text-indigo-600 hover:underline truncate" title={task.title}>{task.title}</span>
                                                                            <Badge text={task.status} size="[10px]" />
                                                                        </div>
                                                                        {task.client && <div className="text-[11px] text-indigo-600 font-medium truncate mb-1">{task.client}</div>}
                                                                        <div onClick={() => { setEditingReview({ taskId: task.id, quarter: q, taskTitle: task.title }); setReviewText(review?.text || ''); }} className={`mt-1 text-[10px] p-1.5 rounded cursor-pointer transition-colors flex items-start gap-1 ${review ? 'bg-amber-50 text-amber-800 border border-amber-200' : 'text-slate-400 hover:text-indigo-600'}`}><Edit3 className="w-3 h-3 shrink-0 mt-0.5" /><span className="line-clamp-2">{review ? review.text : "Añadir nota trimestral..."}</span></div>
                                                                    </div>
                                                                );
                                                            })}
                                                        </div>
                                                    </td>
                                                );
                                            })}
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            );
        })}
      </div>

      {editingReview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6 animate-in zoom-in-95">
                <div className="flex justify-between items-center mb-4"><h3 className="font-bold text-lg text-slate-800">Nota Trimestral ({editingReview.quarter})</h3><button onClick={() => setEditingReview(null)} className="text-slate-400 hover:text-slate-600">✕</button></div>
                <div className="bg-slate-50 p-3 rounded-lg border border-slate-100 mb-4"><div className="text-xs text-slate-500 font-bold uppercase mb-1">Expediente</div><div className="font-medium text-slate-800 text-sm">{editingReview.taskTitle}</div></div>
                <textarea value={reviewText} onChange={(e) => setReviewText(e.target.value)} className="w-full border border-slate-300 rounded-lg p-3 text-sm focus:ring-2 focus:ring-indigo-500 outline-none" rows="4" placeholder="Escribe observaciones del trimestre..."></textarea>
                <div className="flex justify-end gap-3 mt-4"><button onClick={() => setEditingReview(null)} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg text-sm">Cancelar</button><button onClick={saveTaskReview} className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium text-sm shadow-sm">Guardar Nota</button></div>
            </div>
        </div>
      )}
    </div>
  );
};

// --- VISTA LISTA: LISTADO DE EXPEDIENTES ---
const ListView = ({ tasks, onEdit }) => {
  const [showEmpty, setShowEmpty] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setShowEmpty(true), 1200);
    return () => clearTimeout(timer);
  }, []);

  const formatDateLocal = (isoString) => isoString ? new Date(isoString).toLocaleDateString('es-ES', { dateStyle: 'medium' }) : '-';
  const formatCreationDate = (timestamp) => timestamp?.seconds ? new Date(timestamp.seconds * 1000).toLocaleDateString('es-ES') : '';
  
  if (tasks.length === 0) {
    if (!showEmpty) {
      return <div className="text-center py-20"><div className="text-slate-400 mb-2 animate-pulse">Cargando expedientes del despacho...</div></div>;
    }
    return <div className="text-center py-20 bg-white rounded-xl border border-dashed border-slate-300"><div className="text-slate-400 mb-2 font-medium">No se han encontrado expedientes con los filtros aplicados.</div></div>;
  }

  return (
    <div className="space-y-3 animate-in fade-in duration-300">
      {tasks.map(task => {
        const delay = getDelayDays(task);
        const normStatus = normalizeStatus(task.status);
        const normType = normalizeType(task.type);
        const normDept = normalizeDepartment(task.department);

        return (
        <div key={task.id} onClick={() => onEdit(task)} className="group bg-white rounded-xl p-4 border border-slate-200 shadow-sm hover:shadow-md hover:border-indigo-300 transition-all cursor-pointer relative overflow-hidden">
          <div className={`absolute left-0 top-0 bottom-0 w-1.5 ${
            normStatus === 'Presentado / Tramitado' ? 'bg-blue-500' : 
            normStatus === 'En Plazo' ? 'bg-emerald-500' : 
            normStatus === 'Trámite Periódico' ? 'bg-indigo-500' : 
            normStatus === 'Urgente / Próximo a Vencer' ? 'bg-rose-500' : 
            normStatus === 'Pendiente Documentación' ? 'bg-amber-500' : 
            normStatus === 'En Revisión' ? 'bg-purple-500' : 'bg-slate-300'
          }`}></div>
          <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between pl-3">
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2 mb-1.5">
                <h3 className="font-bold text-slate-800 text-base group-hover:text-indigo-700 transition-colors truncate">{task.title}</h3>
                <Badge text={normType} size="xs" />
              </div>
              
              {task.client && (
                <div className="flex items-center gap-1.5 text-xs text-indigo-700 font-semibold mb-2">
                  <Building2 className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                  <span className="truncate">Cliente: {task.client}</span>
                </div>
              )}

              <div className="flex flex-wrap gap-4 text-xs text-slate-500">
                <span className="flex items-center gap-1"><Briefcase className="w-3.5 h-3.5 text-slate-400"/> {normDept}</span>
                <div className="flex items-center gap-1 bg-slate-50 px-2 py-0.5 rounded-full border border-slate-100">
                  <Users className="w-3.5 h-3.5 text-slate-400"/>
                  {task.assignees && task.assignees.length > 0 ? (
                    <span className="truncate max-w-[200px]">{task.assignees.join(', ')}</span>
                  ) : (
                    <span>{task.assigneeEmail || 'Sin Asesor Asignado'}</span>
                  )}
                </div>
                {normStatus !== 'Trámite Periódico' && (
                  <span className="flex items-center gap-1 font-medium text-slate-600">
                    <Clock className="w-3.5 h-3.5 text-slate-400"/> Vencimiento: {formatDateLocal(task.dueDate)} 
                    {delay > 0 && <span className="text-rose-600 font-bold ml-1">(+{delay}d demora)</span>}
                  </span>
                )}
                {normStatus === 'Trámite Periódico' && <span className="flex items-center gap-1 text-indigo-600 font-medium"><Activity className="w-3.5 h-3.5"/> Trámite Continuo</span>}
                {task.attachments?.length > 0 && <span className="flex items-center gap-1 text-slate-500 font-medium"><Paperclip className="w-3.5 h-3.5"/> {task.attachments.length} archivos</span>}
                {task.actions?.length > 0 && <span className="flex items-center gap-1 text-emerald-600 font-medium"><Target className="w-3.5 h-3.5"/> {task.actions.filter(a => a.isCompleted).length}/{task.actions.length} pasos</span>}
              </div>
            </div>
            
            <div className="flex flex-col items-end gap-2 shrink-0">
              <Badge text={normStatus} />
              <span className="text-[10px] text-slate-400 flex items-center gap-1">
                <CalendarDays className="w-3 h-3"/> Alta: {formatCreationDate(task.createdAt)}
              </span>
            </div>
          </div>
        </div>
      )})}
    </div>
  );
};

// --- MODAL DE EXPEDIENTE / TRÁMITE ---
const ExpedienteModal = ({ tasks, show, onClose, task, formData, setFormData, onSave, usersList, currentUser, onAddUpdate, newUpdateText, setNewUpdateText, setEditingTask }) => {
  const suggestedAssignees = useMemo(() => {
    const result = [];
    const lowerSet = new Set();
    const myEmail = currentUser?.email?.toLowerCase().trim() || '';

    const addSafe = (val) => {
        if (!val || typeof val !== 'string' || val === 'Yo') return;
        const lower = val.toLowerCase().trim();
        if (lower === myEmail || lowerSet.has(lower)) return;
        lowerSet.add(lower);
        result.push(val.trim());
    };

    if (usersList) usersList.forEach(u => addSafe(u?.email));
    if (tasks) tasks.forEach(t => t?.actions?.forEach(a => addSafe(a?.assignee)));

    return result.sort((a, b) => a.toLowerCase().localeCompare(b.toLowerCase()));
  }, [tasks, usersList, currentUser]);

  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef(null);
  const [editingUpdateIndex, setEditingUpdateIndex] = useState(null);
  const [editedUpdateText, setEditedUpdateText] = useState('');
  const [rightTab, setRightTab] = useState('activity');
  const [newActionText, setNewActionText] = useState('');
  const [newActionAssignee, setNewActionAssignee] = useState(currentUser?.email || '');
  const [showSuggestions, setShowSuggestions] = useState(false);

  if (!show) return null;

  const formatDateLocal = (isoString) => isoString ? new Date(isoString).toLocaleString('es-ES', { dateStyle: 'medium', timeStyle: 'short' }) : '-';
  const isOngoing = normalizeStatus(formData.status) === 'Trámite Periódico';
  
  const calculateModalDelay = () => {
      if (isOngoing) return 0;
      const originalDateStr = task?.originalDueDate || formData.dueDate;
      if (!originalDateStr || !formData.dueDate) return 0;
      if (originalDateStr === formData.dueDate) return 0;
      const original = new Date(originalDateStr);
      const current = new Date(formData.dueDate);
      const diffTime = current - original;
      return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };
  const currentDelay = calculateModalDelay();
  
  const handleDuplicate = () => {
      if (!confirm("¿Crear una copia de este expediente?")) return;
      setEditingTask(null);
      setFormData({
          ...formData,
          title: `${formData.title} (Copia)`,
          client: formData.client || '',
          status: 'En Plazo', 
          dueDate: new Date().toISOString().split('T')[0],
          originalDueDate: new Date().toISOString().split('T')[0],
          description: formData.description,
          assignees: formData.assignees,
          department: formData.department,
          type: formData.type,
          actions: [] 
      });
  };

  const handleFileUpload = async (e) => {
    if (!e.target.files[0] || !task) return;
    const file = e.target.files[0];
    setIsUploading(true);
    try {
      const storageRef = ref(storage, `expedientes/${task.id}/${Date.now()}_${file.name}`);
      await uploadBytes(storageRef, file);
      const downloadURL = await getDownloadURL(storageRef);
      const newAttachment = { name: file.name, url: downloadURL, path: storageRef.fullPath, type: 'file', uploadedAt: new Date().toISOString(), uploadedBy: currentUser.email };
      const updatedAttachments = [...(task.attachments || []), newAttachment];
      
      const docRef = doc(db, 'expedientes', task.id);
      await updateDoc(docRef, { attachments: updatedAttachments, updatedBy: currentUser.email, lastUpdated: serverTimestamp() }).catch(async () => {
        await updateDoc(doc(db, 'tasks', task.id), { attachments: updatedAttachments, updatedBy: currentUser.email, lastUpdated: serverTimestamp() });
      });

      setEditingTask(prev => ({ ...prev, attachments: updatedAttachments }));
    } catch (error) { console.error(error); alert("Error al subir el archivo."); }
    setIsUploading(false);
    if(fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleAddLinkAttachment = async () => {
    const url = prompt("Enlace de interés (Sede Electrónica AEAT, Carpeta Cloud, DGT, Seguridad Social...):");
    if (!url) return;
    const name = prompt("Nombre o descripción del enlace:", "Expediente Sede Electrónica");
    if (!name) return;
    let cleanUrl = url.trim();
    if (!cleanUrl.startsWith('http://') && !cleanUrl.startsWith('https://')) {
      cleanUrl = 'https://' + cleanUrl;
    }
    const newAttachment = { name: name, url: cleanUrl, type: 'link', uploadedAt: new Date().toISOString(), uploadedBy: currentUser.email };
    const updatedAttachments = [...(task.attachments || []), newAttachment];
    
    await updateDoc(doc(db, 'expedientes', task.id), { attachments: updatedAttachments, updatedBy: currentUser.email, lastUpdated: serverTimestamp() }).catch(async () => {
      await updateDoc(doc(db, 'tasks', task.id), { attachments: updatedAttachments, updatedBy: currentUser.email, lastUpdated: serverTimestamp() });
    });

    setEditingTask(prev => ({ ...prev, attachments: updatedAttachments }));
  };

  const handleDeleteAttachment = async (attachment) => {
    if (!confirm(`¿Eliminar "${attachment.name}"?`)) return;
    try {
      if (attachment.type !== 'link' && attachment.path) {
          const fileRef = ref(storage, attachment.path);
          await deleteObject(fileRef).catch(console.warn);
      }
      const updatedAttachments = task.attachments.filter(a => a.url !== attachment.url);
      await updateDoc(doc(db, 'expedientes', task.id), { attachments: updatedAttachments, updatedBy: currentUser.email, lastUpdated: serverTimestamp() }).catch(async () => {
        await updateDoc(doc(db, 'tasks', task.id), { attachments: updatedAttachments, updatedBy: currentUser.email, lastUpdated: serverTimestamp() });
      });
      setEditingTask(prev => ({ ...prev, attachments: updatedAttachments }));
    } catch (e) { alert("Error al eliminar adjunto: " + e.message); }
  };

  const saveEditedUpdate = async () => {
    if (editingUpdateIndex === null || !task) return;
    const updatedUpdates = [...task.updates];
    updatedUpdates[editingUpdateIndex] = { ...updatedUpdates[editingUpdateIndex], text: editedUpdateText };
    try { 
        await updateDoc(doc(db, 'expedientes', task.id), { updates: updatedUpdates, lastUpdated: serverTimestamp(), updatedBy: currentUser.email }).catch(async () => {
          await updateDoc(doc(db, 'tasks', task.id), { updates: updatedUpdates, lastUpdated: serverTimestamp(), updatedBy: currentUser.email });
        }); 
        setEditingTask(prev => ({ ...prev, updates: updatedUpdates })); 
        setEditingUpdateIndex(null); 
        setEditedUpdateText(''); 
    } catch(e) { alert("Error al actualizar nota"); }
  };

  const startEditingUpdate = (index, text) => { setEditingUpdateIndex(index); setEditedUpdateText(text); };

  const handlePasteLinkInChat = () => { 
    const url = prompt("Pegar enlace web:"); 
    if(url) { 
      const cleanUrl = url.trim(); 
      setNewUpdateText(prev => (prev ? prev + " " : "") + cleanUrl); 
    } 
  };
  
  const handleAddAction = () => {
      if(!newActionText.trim()) return;
      let finalAssignee = newActionAssignee.trim();
      if (!finalAssignee || finalAssignee.toLowerCase() === 'yo' || finalAssignee.toLowerCase() === 'me') {
          finalAssignee = currentUser.email;
      }
      const newAction = {
          id: Date.now(),
          text: newActionText,
          assignee: finalAssignee, 
          isCompleted: false,
          createdAt: new Date().toISOString()
      };
      const currentActions = formData.actions || [];
      setFormData({ ...formData, actions: [...currentActions, newAction] });
      setNewActionText('');
  };
  
  const toggleAction = (actionId) => {
      const currentActions = formData.actions || [];
      const updated = currentActions.map(a => a.id === actionId ? { ...a, isCompleted: !a.isCompleted } : a);
      setFormData({ ...formData, actions: updated });
  };

  const deleteAction = (actionId) => {
      const currentActions = formData.actions || [];
      setFormData({ ...formData, actions: currentActions.filter(a => a.id !== actionId) });
  };

  const resourceLinks = task?.attachments?.filter(a => a.type === 'link') || [];
  const fileAttachments = task?.attachments?.filter(a => a.type === 'file') || [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl max-h-[92vh] flex flex-col md:flex-row overflow-hidden animate-in zoom-in-95 duration-200">
        
        {/* COLUMNA IZQUIERDA: FORMULARIO DEL EXPEDIENTE */}
        <div className="w-full md:w-1/2 p-6 border-r border-slate-100 overflow-y-auto bg-white">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2">
              {task ? <Scale className="w-5 h-5 text-indigo-600"/> : <Plus className="w-5 h-5 text-indigo-600"/>} 
              {task ? 'Ficha de Expediente' : 'Nuevo Expediente / Trámite'}
            </h3>
            <div className="flex gap-2">
                {task && (<button type="button" onClick={handleDuplicate} className="text-xs bg-slate-100 hover:bg-indigo-50 text-indigo-600 px-3 py-1 rounded-full font-bold flex items-center gap-1 transition-colors" title="Duplicar Expediente"><Copy className="w-3 h-3"/> Duplicar</button>)}
                <button type="button" onClick={onClose} className="text-slate-400 hover:text-slate-600 text-lg">✕</button>
            </div>
          </div>

          <form onSubmit={onSave} className="space-y-4">
            <div>
              <label className="text-xs font-bold text-slate-600 uppercase tracking-wide">Título del Expediente / Trámite</label>
              <input required value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} placeholder="Ej: Presentación Modelo 303 1T - IVA" className="w-full mt-1 border border-slate-300 p-2.5 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none font-medium text-slate-800" />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-600 uppercase tracking-wide">Cliente / Empresa / NIF</label>
              <div className="relative mt-1">
                <Building2 className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2"/>
                <input value={formData.client || ''} onChange={e => setFormData({...formData, client: e.target.value})} placeholder="Ej: Transportes García S.L. (B12345678)" className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none font-medium text-slate-800 text-sm" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
               <div>
                  <label className="text-xs font-bold text-slate-600 uppercase tracking-wide">Tipo de Trámite</label>
                  <select value={normalizeType(formData.type)} onChange={e => setFormData({...formData, type: e.target.value})} className="w-full mt-1 border border-slate-300 p-2.5 rounded-lg bg-white text-xs font-medium text-slate-700">
                    {MASTERS.types.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
               </div>
               <div>
                  <label className="text-xs font-bold text-slate-600 uppercase tracking-wide">Área / Departamento</label>
                  <select value={normalizeDepartment(formData.department)} onChange={e => setFormData({...formData, department: e.target.value})} className="w-full mt-1 border border-slate-300 p-2.5 rounded-lg bg-white text-xs font-medium text-slate-700">
                    {MASTERS.departments.map(d => <option key={d} value={d}>{d}</option>)}
                  </select>
               </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-bold text-slate-600 uppercase tracking-wide">Estado de Tramitación</label>
                <select value={normalizeStatus(formData.status)} onChange={e => setFormData({...formData, status: e.target.value, dueDate: e.target.value === 'Trámite Periódico' ? '' : formData.dueDate })} className="w-full mt-1 border border-slate-300 p-2.5 rounded-lg bg-white font-medium text-xs text-slate-700">
                  {MASTERS.status.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div>
                  <label className="text-xs font-bold text-slate-600 uppercase tracking-wide">Vencimiento Fiscal / Plazo</label>
                  <input type="date" disabled={isOngoing} value={isOngoing ? '' : formData.dueDate} onChange={e => setFormData({...formData, dueDate: e.target.value})} className={`w-full mt-1 border border-slate-300 p-2.5 rounded-lg text-sm ${isOngoing ? 'bg-slate-100 text-slate-400 cursor-not-allowed' : ''}`} />
                  {isOngoing && <div className="mt-1 text-[10px] text-indigo-600 flex items-center gap-1 font-medium"><PauseCircle className="w-3 h-3"/> No aplica para trámites continuos</div>}
                  {!isOngoing && currentDelay > 0 && (<div className="mt-1 text-[10px] text-rose-600 bg-rose-50 border border-rose-100 p-1 rounded font-bold flex items-center gap-1"><AlertTriangle className="w-3 h-3"/> Vencimiento aplazado {currentDelay} días</div>)}
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-600 uppercase tracking-wide mb-1 block">Gestores / Asesores Asignados</label>
              <MultiSelectDropdown label="Seleccionar gestores..." icon={UserCheck} options={usersList.map(u => u.email)} selected={formData.assignees} onChange={(newAssignees) => setFormData({...formData, assignees: newAssignees})} fullWidth={true} />
              <div className="flex flex-wrap gap-2 mt-2">{formData.assignees.map(email => (<span key={email} className="bg-indigo-50 text-indigo-700 border border-indigo-100 px-2 py-1 rounded text-xs flex items-center gap-1">{email}<button type="button" onClick={() => setFormData(prev => ({...prev, assignees: prev.assignees.filter(e => e !== email)}))} className="hover:text-red-500">✕</button></span>))}</div>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-600 uppercase tracking-wide">Observaciones y Antecedentes</label>
              <div className="w-full mt-1 border border-slate-300 p-2.5 rounded-lg focus-within:ring-2 focus-within:ring-indigo-500 bg-white min-h-[90px] text-sm whitespace-pre-wrap">
                 <textarea placeholder="Detalles del cliente, requerimientos o notas para la gestión..." value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} className="w-full h-full outline-none resize-none bg-transparent" rows="3"></textarea>
              </div>
            </div>
            
            {/* DOCUMENTACIÓN Y ENLACES OFICIALES */}
            <div className="pt-2">
                <div className="flex justify-between items-center mb-2 bg-indigo-50 p-2 rounded-t-lg border-b border-indigo-100">
                    <label className="text-xs font-bold text-indigo-900 uppercase tracking-wide flex items-center gap-2"><BookOpen className="w-4 h-4 text-indigo-600"/> Enlaces y Sedes Electrónicas</label>
                    {task ? (<button type="button" onClick={handleAddLinkAttachment} className="text-xs bg-white hover:bg-indigo-100 text-indigo-700 px-2 py-1 rounded border border-indigo-200 flex items-center gap-1 transition-colors"><Plus className="w-3 h-3"/> Añadir Enlace</button>) : <span className="text-[10px] text-slate-400">Guarda el expediente para añadir enlaces</span>}
                </div>
                <div className="space-y-2 mb-4 bg-indigo-50/30 p-2 rounded-b-lg min-h-[40px]">
                    {resourceLinks.length === 0 && <div className="text-xs text-slate-400 italic text-center py-1">Sin enlaces oficiales vinculados (AEAT, DGT, Cloud, etc.).</div>}
                    {resourceLinks.map((item, idx) => (
                        <div key={idx} className="flex justify-between items-center bg-white p-2 rounded border border-indigo-100 text-sm shadow-sm">
                            <a href={item.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-indigo-700 hover:underline truncate max-w-[300px] font-medium text-xs">
                                <Globe className="w-3.5 h-3.5 shrink-0 text-slate-400"/> {item.name}
                            </a>
                            <button type="button" onClick={() => handleDeleteAttachment(item)} className="text-slate-400 hover:text-rose-500"><XCircle className="w-4 h-4"/></button>
                        </div>
                    ))}
                </div>
            </div>

            {/* ARCHIVOS Y JUSTIFICANTES ADJUNTOS */}
            <div>
                <div className="flex justify-between items-center mb-2">
                    <label className="text-xs font-bold text-slate-600 uppercase tracking-wide flex items-center gap-2"><Paperclip className="w-3.5 h-3.5 text-slate-500"/> Documentación y Modelos Adjuntos</label>
                    {task && (<><input type="file" ref={fileInputRef} className="hidden" onChange={handleFileUpload} /><button type="button" onClick={() => fileInputRef.current.click()} disabled={isUploading} className="text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 px-2 py-1 rounded border border-slate-200 flex items-center gap-1 transition-colors">{isUploading ? <Loader2 className="w-3 h-3 animate-spin"/> : <Plus className="w-3 h-3"/>} Adjuntar Archivo</button></>)}
                </div>
                <div className="space-y-2">
                    {fileAttachments.length === 0 && <div className="text-xs text-slate-400 italic">No hay documentos adjuntos.</div>}
                    {fileAttachments.map((item, idx) => (
                        <div key={idx} className="flex justify-between items-center bg-slate-50 p-2 rounded border border-slate-200 text-xs">
                            <a href={item.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-slate-700 hover:underline truncate max-w-[200px] font-medium"><File className="w-4 h-4 shrink-0 text-indigo-500"/> {item.name}</a>
                            <div className="flex items-center gap-2"><span className="text-[10px] text-slate-400 hidden sm:inline">{new Date(item.uploadedAt).toLocaleDateString('es-ES')}</span><button type="button" onClick={() => handleDeleteAttachment(item)} className="text-slate-400 hover:text-rose-500"><XCircle className="w-4 h-4"/></button></div>
                        </div>
                    ))}
                </div>
            </div>

            <div className="pt-4 flex gap-3">
              <button type="button" onClick={onClose} className="flex-1 py-2.5 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 font-medium transition-colors text-sm">Cancelar</button>
              <button type="submit" className="flex-1 py-2.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-bold transition-colors shadow-sm text-sm">{task ? 'Guardar Cambios' : 'Crear Expediente'}</button>
            </div>
          </form>
        </div>

        {/* COLUMNA DERECHA: NOTAS DE SEGUIMIENTO / PASOS GTD */}
        {task ? (
          <div className="w-full md:w-1/2 bg-slate-50 flex flex-col h-[500px] md:h-auto border-t md:border-t-0">
            <div className="flex border-b border-slate-200 bg-white">
                <button 
                    type="button"
                    onClick={() => setRightTab('activity')}
                    className={`flex-1 py-3 text-xs font-bold flex items-center justify-center gap-2 transition-colors border-b-2 ${rightTab === 'activity' ? 'text-indigo-600 border-indigo-600 bg-indigo-50/50' : 'text-slate-500 border-transparent hover:bg-slate-50'}`}
                >
                    <MessageSquare className="w-4 h-4"/> Bitácora de Seguimiento
                </button>
                <button 
                    type="button"
                    onClick={() => setRightTab('gtd')}
                    className={`flex-1 py-3 text-xs font-bold flex items-center justify-center gap-2 transition-colors border-b-2 ${rightTab === 'gtd' ? 'text-emerald-600 border-emerald-600 bg-emerald-50/50' : 'text-slate-500 border-transparent hover:bg-slate-50'}`}
                >
                    <Target className="w-4 h-4"/> Pasos y Trámites <span className="bg-slate-100 text-slate-600 px-1.5 rounded-full text-[10px] border border-slate-200">{formData.actions?.length || 0}</span>
                </button>
            </div>

            {/* PESTAÑA: BITÁCORA */}
            {rightTab === 'activity' && (
                <>
                    <div className="flex-1 overflow-y-auto p-4 space-y-4">
                    {(!task.updates || task.updates.length === 0) && <div className="text-center text-slate-400 py-10 text-xs">Sin notas de seguimiento registradas.</div>}
                    {task.updates?.map((update, idx) => (
                        <div key={idx} className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm">
                        <div className="flex justify-between items-start mb-1">
                            <div><span className="text-xs font-bold text-indigo-950">{update.author}</span><div className="text-[10px] text-slate-400">{formatDateLocal(update.date)}</div></div>
                            {currentUser.email === update.author && editingUpdateIndex !== idx && (<button onClick={() => startEditingUpdate(idx, update.text)} className="text-slate-300 hover:text-indigo-600 transition-colors" title="Editar comentario"><Pencil className="w-3 h-3" /></button>)}
                        </div>
                        {editingUpdateIndex === idx ? (
                            <div className="mt-2">
                                <textarea className="w-full border border-indigo-300 rounded p-2 text-xs focus:ring-1 focus:ring-indigo-500 outline-none" rows="3" value={editedUpdateText} onChange={(e) => setEditedUpdateText(e.target.value)}></textarea>
                                <div className="flex gap-2 mt-2 justify-end"><button onClick={() => setEditingUpdateIndex(null)} className="text-xs px-2 py-1 text-slate-500 hover:bg-slate-100 rounded">Cancelar</button><button onClick={saveEditedUpdate} className="text-xs px-2 py-1 bg-indigo-600 text-white rounded hover:bg-indigo-700 flex items-center gap-1"><Save className="w-3 h-3"/> Guardar</button></div>
                            </div>
                        ) : (<p className="text-xs text-slate-700 whitespace-pre-wrap mt-1 overflow-hidden leading-relaxed"><TextWithLinks text={update.text} /></p>)}
                        </div>
                    ))}
                    </div>
                    <div className="p-4 bg-white border-t border-slate-200">
                        <label className="text-xs font-bold text-slate-600 uppercase tracking-wide">Añadir Nota de Seguimiento</label>
                        <div className="flex gap-2 mt-2 relative">
                            <textarea value={newUpdateText} onChange={(e) => setNewUpdateText(e.target.value)} placeholder="Escribe un avance, llamada con el cliente o estado de la presentación..." className="flex-1 border border-slate-300 rounded-lg p-2.5 text-xs focus:ring-2 focus:ring-indigo-500 outline-none resize-none pr-8" rows="2"></textarea>
                            <button type="button" onClick={handlePasteLinkInChat} className="absolute right-14 top-2 text-slate-400 hover:text-indigo-600 p-1 rounded transition-colors" title="Pegar enlace web"><LinkIcon className="w-4 h-4"/></button>
                            <button type="button" onClick={onAddUpdate} disabled={!newUpdateText.trim()} className="bg-indigo-600 disabled:bg-slate-300 text-white px-4 rounded-lg hover:bg-indigo-700 transition-colors flex items-center justify-center"><Send className="w-4 h-4" /></button>
                        </div>
                    </div>
                </>
            )}

            {/* PESTAÑA: PASOS GTD */}
            {rightTab === 'gtd' && (
                 <div className="flex-1 flex flex-col bg-slate-50">
                     <div className="p-3 bg-emerald-50/50 border-b border-emerald-100">
                         <p className="text-xs text-emerald-800 text-center font-medium">Divide este expediente en pasos claros (pedir documentación, validar borradores, presentar en sede).</p>
                     </div>
                     
                     <div className="flex-1 overflow-y-auto p-4 space-y-2">
                        {(formData.actions || []).map(action => (
                            <div key={action.id} className={`flex items-center gap-2 p-3 rounded-xl border shadow-sm transition-all ${action.isCompleted ? 'bg-slate-100 border-slate-200 opacity-60' : 'bg-white border-slate-200 hover:border-emerald-300'}`}>
                                <button type="button" onClick={() => toggleAction(action.id)} className={`w-6 h-6 rounded-full border flex items-center justify-center transition-colors shrink-0 ${action.isCompleted ? 'bg-emerald-500 border-emerald-500' : 'border-slate-300 hover:border-emerald-400 bg-slate-50'}`}>
                                    {action.isCompleted && <Check className="w-3.5 h-3.5 text-white"/>}
                                </button>
                                <div className="flex-1 text-xs">
                                    <span className={`block leading-tight font-medium ${action.isCompleted ? 'line-through text-slate-500' : 'text-slate-800'}`}>{action.text}</span>
                                    <div className="flex items-center gap-1 text-[10px] text-slate-400 mt-1">
                                        <User className="w-3 h-3"/> 
                                        <span className={action.assignee === currentUser.email ? 'text-indigo-600 font-bold' : ''}>
                                            {action.assignee === currentUser.email ? 'Yo' : action.assignee}
                                        </span>
                                    </div>
                                </div>
                                <button type="button" onClick={() => deleteAction(action.id)} className="text-slate-300 hover:text-rose-500 p-2"><Trash2 className="w-4 h-4"/></button>
                            </div>
                        ))}
                        {(!formData.actions || formData.actions.length === 0) && (
                            <div className="flex flex-col items-center justify-center h-40 text-slate-400">
                                <Target className="w-8 h-8 mb-2 opacity-20"/>
                                <span className="text-xs italic">Sin pasos definidos para este expediente.</span>
                            </div>
                        )}
                     </div>

                     <div className="p-4 bg-white border-t border-slate-200">
                        <label className="text-xs font-bold text-slate-600 uppercase tracking-wide">Añadir Paso o Trámite</label>
                        <div className="flex gap-2 mt-2 items-center">
                            <input 
                                type="text" 
                                placeholder="¿Cuál es el siguiente paso?" 
                                value={newActionText}
                                onChange={e => setNewActionText(e.target.value)}
                                onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), handleAddAction())}
                                className="flex-1 text-xs border border-slate-300 rounded-lg p-2.5 outline-none focus:ring-2 focus:ring-emerald-500"
                            />
                            
                            <div className="relative w-[150px] shrink-0">
                                <input 
                                    type="text" 
                                    placeholder="Asignar a..."
                                    autoComplete="off"
                                    value={newActionAssignee}
                                    onChange={(e) => {
                                        setNewActionAssignee(e.target.value);
                                        setShowSuggestions(true);
                                    }}
                                    onFocus={(e) => {
                                        if (e.target.value === 'Yo' || e.target.value === currentUser?.email) {
                                            setNewActionAssignee('');
                                        }
                                        setShowSuggestions(true);
                                    }}
                                    onBlur={() => {
                                        setTimeout(() => setShowSuggestions(false), 200);
                                        if (!newActionAssignee.trim()) setNewActionAssignee('Yo');
                                    }}
                                    className="w-full text-xs border border-slate-300 rounded-lg p-2.5 bg-white outline-none focus:ring-2 focus:ring-emerald-500"
                                />
                                
                                {showSuggestions && newActionAssignee && (
                                    (() => {
                                        const allOptions = ['Yo', ...(suggestedAssignees || [])];
                                        const matches = allOptions.filter(a => 
                                            a.toLowerCase().includes(newActionAssignee.toLowerCase())
                                        );
                                        
                                        if (matches.length === 0 || (matches.length === 1 && matches[0] === newActionAssignee)) return null;

                                        return (
                                            <div className="absolute bottom-full left-0 mb-1 w-full bg-white border border-slate-200 rounded-lg shadow-xl z-[9999] overflow-hidden">
                                                {matches.slice(0, 5).map(assignee => (
                                                    <div 
                                                        key={assignee}
                                                        className="px-3 py-2 text-xs hover:bg-emerald-50 cursor-pointer text-slate-700 font-medium border-b border-slate-50 last:border-0 truncate"
                                                        onClick={() => { 
                                                            setNewActionAssignee(assignee); 
                                                            setShowSuggestions(false); 
                                                        }}
                                                    >
                                                        {assignee}
                                                    </div>
                                                ))}
                                            </div>
                                        );
                                    })()
                                )}
                            </div>

                            <button type="button" onClick={handleAddAction} className="bg-slate-800 text-white p-2.5 rounded-lg hover:bg-emerald-600 transition-colors shadow-sm"><Plus className="w-4 h-4"/></button>
                        </div>
                    </div>
                 </div>
            )}
          </div>
        ) : (
          <div className="hidden md:flex w-1/2 bg-slate-50 items-center justify-center p-10 text-center">
            <div>
              <Layers className="w-16 h-16 text-slate-200 mx-auto mb-4"/>
              <h3 className="text-slate-600 font-bold">Alta de Nuevo Expediente</h3>
              <p className="text-xs text-slate-400 mt-2 max-w-xs">Guarda el expediente inicial para poder registrar notas de seguimiento, adjuntar modelos oficiales y añadir trámites.</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// --- GESTOR PRINCIPAL DE EXPEDIENTES (MAIN) ---
const ExpedienteManager = ({ currentUser }) => {
  const [currentView, setCurrentView] = useState('list');
  const [tasks, setTasks] = useState([]);
  const [usersList, setUsersList] = useState([]); 
  const [filterScope, setFilterScope] = useState('all'); 
  const [selectedDepts, setSelectedDepts] = useState([]);
  const [selectedTypes, setSelectedTypes] = useState([]);
  const [selectedStatus, setSelectedStatus] = useState([]); 
  const [searchTerm, setSearchTerm] = useState('');
  const [hideCompleted, setHideCompleted] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [newUpdateText, setNewUpdateText] = useState('');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false); 
  const [isAdmin, setIsAdmin] = useState(false);

  const initialFormState = {
    title: '', 
    client: '',
    description: '', 
    department: MASTERS.departments[0],
    type: MASTERS.types[0], 
    status: MASTERS.status[0], 
    assignees: [],
    dueDate: new Date().toISOString().split('T')[0],
    actions: [] 
  };
  const [formData, setFormData] = useState(initialFormState);

  useEffect(() => {
    const syncUser = async () => { 
      if (currentUser?.email) {
        await setDoc(doc(db, 'users', currentUser.email), { email: currentUser.email, lastSeen: serverTimestamp() }).catch(console.warn); 
      }
    };
    syncUser();

    const unsubUsers = onSnapshot(collection(db, 'users'), (snap) => {
      setUsersList(snap.docs.map(d => d.data()));
    }, (err) => console.warn("Error cargando usuarios:", err));

    // Escuchar expedientes (primaria) y tasks (compatibilidad)
    const unsubExpedientes = onSnapshot(collection(db, 'expedientes'), (snap) => {
      if (!snap.empty) {
        const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        data.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
        setTasks(data);
      } else {
        // Fallback a colección tasks si expedientes está vacía
        const unsubOld = onSnapshot(collection(db, 'tasks'), (oldSnap) => {
          const data = oldSnap.docs.map(d => ({ id: d.id, ...d.data() }));
          data.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
          setTasks(data);
        }, (err) => console.warn(err));
        return () => unsubOld();
      }
    }, (err) => console.warn(err));

    const unsubAdmin = onSnapshot(doc(db, 'settings', 'config'), (docSnap) => {
        if (docSnap.exists()) {
            const adminList = docSnap.data().admins || [];
            setIsAdmin(adminList.includes(currentUser.email));
        } else {
            setIsAdmin(true); // Default admin si no hay config
        }
    }, () => setIsAdmin(true));

    return () => { unsubUsers(); unsubExpedientes(); unsubAdmin(); };
  }, [currentUser]);

  const logAction = async (action, details) => { 
    try { 
      await addDoc(collection(db, 'audit_logs'), { action, details, user: currentUser.email, timestamp: serverTimestamp() }); 
    } catch (e) { 
      console.warn("Error auditoría:", e); 
    } 
  };
  
  const exportToExcel = (dataToExport) => {
    const rawData = dataToExport && dataToExport.length > 0 ? dataToExport : tasks;
    const formattedData = rawData.map(t => ({
      Expediente: t.title, 
      Cliente: t.client || 'No especificado',
      Tipo: normalizeType(t.type), 
      Área: normalizeDepartment(t.department), 
      Estado: normalizeStatus(t.status),
      'Vencimiento Fiscal': t.dueDate, 
      'Creado Por': t.createdBy, 
      'Gestores Asignados': (t.assignees || []).join(', '),
      'Última Nota': t.updates && t.updates.length > 0 ? `${t.updates[0].date}: ${t.updates[0].text}` : '',
      'Pasos GTD': (t.actions || []).map(a => `[${a.isCompleted ? 'X' : ' '}] ${a.text} (${a.assignee})`).join(' | ')
    }));
    const worksheet = XLSX.utils.json_to_sheet(formattedData);
    const wscols = [{wch: 32}, {wch: 25}, {wch: 20}, {wch: 22}, {wch: 18}, {wch: 16}, {wch: 25}, {wch: 30}, {wch: 40}, {wch: 40}];
    worksheet['!cols'] = wscols;
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Expedientes Gestoría");
    XLSX.writeFile(workbook, `Expedientes_Gestoria_${new Date().toISOString().slice(0,10)}.xlsx`);
  };

  const filteredTasks = tasks.filter(task => {
    if (!currentUser || !currentUser.email) return false;
    const myEmail = currentUser.email.toLowerCase().trim();
    let assignedList = [];
    if (Array.isArray(task.assignees)) { assignedList = task.assignees.map(e => e ? e.toLowerCase().trim() : ''); } 
    else if (task.assigneeEmail) { assignedList.push(task.assigneeEmail.toLowerCase().trim()); }
    const amIAssigned = assignedList.includes(myEmail);
    if (filterScope === 'mine') { if (!amIAssigned) { return false; } }

    const normStatus = normalizeStatus(task.status);
    const normDept = normalizeDepartment(task.department);
    const normType = normalizeType(task.type);

    if (hideCompleted && currentView !== 'analytics' && normStatus === 'Presentado / Tramitado') return false;
    if (selectedDepts.length > 0 && !selectedDepts.includes(normDept)) return false;
    if (selectedTypes.length > 0 && !selectedTypes.includes(normType)) return false;
    if (selectedStatus.length > 0 && !selectedStatus.includes(normStatus)) return false; 
    
    if (searchTerm) {
        const term = searchTerm.toLowerCase();
        const title = (task.title || '').toLowerCase();
        const client = (task.client || '').toLowerCase();
        if (!title.includes(term) && !client.includes(term)) return false;
    }
    return true;
  });

  const handleOpenNew = () => { 
    setEditingTask(null); 
    setFormData({...initialFormState, assignees: [currentUser.email]}); 
    setShowModal(true); 
  };

  const handleOpenEdit = (task) => {
    setEditingTask(task);
    setFormData({
      title: task.title, 
      client: task.client || '',
      description: task.description || '', 
      department: normalizeDepartment(task.department), 
      type: normalizeType(task.type), 
      status: normalizeStatus(task.status),
      assignees: task.assignees || (task.assigneeEmail ? [task.assigneeEmail] : []), 
      dueDate: task.dueDate || '',
      originalDueDate: task.originalDueDate || task.dueDate || '',
      actions: task.actions || [] 
    });
    setNewUpdateText('');
    setShowModal(true);
  };

  const handleSaveTask = async (e) => {
    e.preventDefault();
    try {
      if (editingTask) { 
          const payload = { 
              ...formData, 
              lastUpdated: serverTimestamp(),
              updatedBy: currentUser.email 
          };
          await updateDoc(doc(db, 'expedientes', editingTask.id), payload).catch(async () => {
            await updateDoc(doc(db, 'tasks', editingTask.id), payload);
          });
          logAction('Actualizado Expediente', `Título: ${formData.title} - Cliente: ${formData.client || 'N/A'}`);
      } else { 
          const newData = { 
              ...formData, 
              originalDueDate: formData.dueDate, 
              createdBy: currentUser.email, 
              createdAt: serverTimestamp(), 
              updates: [],
              updatedBy: currentUser.email 
          };
          await addDoc(collection(db, 'expedientes'), newData);
          logAction('Creado Expediente', `Título: ${formData.title} - Cliente: ${formData.client || 'N/A'}`);
      }
      setShowModal(false);
    } catch (error) { 
      console.error(error);
      alert("Error al guardar el expediente."); 
    }
  };

  const handleAddUpdate = async () => {
    if (!newUpdateText.trim() || !editingTask) return;
    const newUpdate = { text: newUpdateText, author: currentUser.email, date: new Date().toISOString() };
    const updatedUpdates = [newUpdate, ...(editingTask.updates || [])];
    
    await updateDoc(doc(db, 'expedientes', editingTask.id), { 
        updates: updatedUpdates, 
        lastUpdated: serverTimestamp(), 
        updatedBy: currentUser.email 
    }).catch(async () => {
      await updateDoc(doc(db, 'tasks', editingTask.id), { 
        updates: updatedUpdates, 
        lastUpdated: serverTimestamp(), 
        updatedBy: currentUser.email 
      });
    });

    setNewUpdateText('');
    setEditingTask(prev => ({ ...prev, updates: updatedUpdates }));
  };

  const clearAllFilters = () => { 
    setFilterScope('all'); 
    setSelectedDepts([]); 
    setSelectedTypes([]); 
    setSelectedStatus([]); 
    setSearchTerm(''); 
  };

  const navigateTo = (view) => { 
    setCurrentView(view); 
    setIsMobileMenuOpen(false); 
  };

  return (
    <div className="min-h-screen bg-slate-100 font-sans text-slate-900 pb-20">
      
      {/* HEADER PRINCIPAL DE GESTORÍA */}
      <header className="bg-slate-900 text-white shadow-lg sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-4 py-3.5 relative">
          <div className="flex justify-between items-center">
            
            {/* Logo y Marca */}
            <div className="flex items-center gap-3">
              <div className="bg-gradient-to-br from-indigo-600 to-blue-700 p-2 rounded-xl shadow-md flex items-center justify-center shrink-0">
                  <Briefcase className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="font-extrabold text-base sm:text-lg leading-tight tracking-tight text-white flex items-center gap-2">
                  Gestoría & Asesoría
                  <span className="bg-indigo-500/30 text-indigo-300 text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider border border-indigo-400/20">v8.0</span>
                </h1>
                <p className="text-[10px] text-slate-400 tracking-wider uppercase font-semibold">Portal de Expedientes y Vencimientos</p>
              </div>
            </div>

            {/* Menú de Navegación de Vistas */}
            <div className="hidden md:flex items-center gap-4">
               <div className="flex bg-slate-800 rounded-xl p-1 border border-slate-700/50">
                  <button onClick={() => setCurrentView('list')} className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg transition-colors ${currentView === 'list' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-300 hover:text-white'}`}><LayoutList className="w-3.5 h-3.5"/> Expedientes</button>
                  <button onClick={() => setCurrentView('plan')} className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg transition-colors ${currentView === 'plan' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-300 hover:text-white'}`}><BarChart3 className="w-3.5 h-3.5"/> Plan Trimestral</button>
                  <button onClick={() => setCurrentView('roadmap')} className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg transition-colors ${currentView === 'roadmap' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-300 hover:text-white'}`}><CalendarCheck className="w-3.5 h-3.5"/> Vencimientos</button>
                  <button onClick={() => setCurrentView('gtd')} className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg transition-colors ${currentView === 'gtd' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-300 hover:text-white'}`}><Target className="w-3.5 h-3.5"/> Trámites GTD</button>
                  <button onClick={() => setCurrentView('analytics')} className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg transition-colors ${currentView === 'analytics' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-300 hover:text-white'}`}><PieChart className="w-3.5 h-3.5"/> Cuadro Mando</button>
                  {isAdmin && (<button onClick={() => setCurrentView('admin')} className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg transition-colors ${currentView === 'admin' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-300 hover:text-white'}`}><Database className="w-3.5 h-3.5"/> Admin</button>)}
               </div>

               <NotificationDropdown tasks={tasks} currentUser={currentUser} onOpenTask={handleOpenEdit} />
               
               <div className="text-right border-l border-slate-700 pl-4">
                 <div className="text-xs font-semibold text-slate-200">{currentUser.email}</div>
               </div>
               
               <button onClick={() => signOut(auth)} className="bg-slate-800 hover:bg-rose-600 p-2 rounded-xl text-slate-300 hover:text-white transition-colors" title="Cerrar Sesión">
                 <LogOut className="w-4 h-4"/>
               </button>
            </div>

            {/* Menú Móvil */}
            <div className="md:hidden flex items-center gap-3">
                <NotificationDropdown tasks={tasks} currentUser={currentUser} onOpenTask={handleOpenEdit} />
                <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="p-2 text-white hover:bg-slate-800 rounded-lg">{isMobileMenuOpen ? <X className="w-6 h-6"/> : <Menu className="w-6 h-6"/>}</button>
            </div>
          </div>

          {isMobileMenuOpen && (
              <div className="md:hidden absolute top-full left-0 w-full bg-white shadow-xl border-b border-slate-200 z-50 animate-in slide-in-from-top-5 duration-200">
                  <div className="p-4 flex flex-col gap-2">
                      <button onClick={() => navigateTo('list')} className={`p-3 rounded-lg flex items-center gap-3 text-sm font-bold ${currentView === 'list' ? 'bg-indigo-50 text-indigo-700' : 'text-slate-700'}`}><LayoutList className="w-5 h-5"/> Expedientes</button>
                      <button onClick={() => navigateTo('plan')} className={`p-3 rounded-lg flex items-center gap-3 text-sm font-bold ${currentView === 'plan' ? 'bg-indigo-50 text-indigo-700' : 'text-slate-700'}`}><BarChart3 className="w-5 h-5"/> Plan Trimestral</button>
                      <button onClick={() => navigateTo('roadmap')} className={`p-3 rounded-lg flex items-center gap-3 text-sm font-bold ${currentView === 'roadmap' ? 'bg-indigo-50 text-indigo-700' : 'text-slate-700'}`}><CalendarCheck className="w-5 h-5"/> Vencimientos</button>
                      <button onClick={() => navigateTo('gtd')} className={`p-3 rounded-lg flex items-center gap-3 text-sm font-bold ${currentView === 'gtd' ? 'bg-indigo-50 text-indigo-700' : 'text-slate-700'}`}><Target className="w-5 h-5"/> Trámites GTD</button>
                      <button onClick={() => navigateTo('analytics')} className={`p-3 rounded-lg flex items-center gap-3 text-sm font-bold ${currentView === 'analytics' ? 'bg-indigo-50 text-indigo-700' : 'text-slate-700'}`}><PieChart className="w-5 h-5"/> Cuadro de Mando</button>
                      {isAdmin && (<button onClick={() => navigateTo('admin')} className={`p-3 rounded-lg flex items-center gap-3 text-sm font-bold ${currentView === 'admin' ? 'bg-indigo-50 text-indigo-700' : 'text-slate-700'}`}><Database className="w-5 h-5"/> Panel Admin</button>)}
                      <div className="h-px bg-slate-100 my-2"></div>
                      <div className="flex justify-between items-center p-2 text-xs text-slate-500">
                        <span>{currentUser.email}</span>
                        <button onClick={() => signOut(auth)} className="text-rose-600 font-bold flex items-center gap-1">Salir <LogOut className="w-3.5 h-3.5"/></button>
                      </div>
                  </div>
              </div>
          )}
        </div>
      </header>

      {/* CONTENIDO PRINCIPAL */}
      <main className="max-w-7xl mx-auto px-4 py-6">
        {currentView === 'admin' ? (
             isAdmin ? <AdminView tasks={tasks} currentAdmin={currentUser.email} logAction={logAction} /> : <div className="text-center p-10 text-rose-500 font-bold">Acceso Denegado</div>
        ) : (
          <>
            {/* BARRA DE FILTROS Y BÚSQUEDA */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4 mb-6">
              <div className="flex flex-col lg:flex-row gap-3 justify-between items-center w-full">
                
                {/* Ámbito */}
                <div className="flex bg-slate-100 p-1 rounded-xl shrink-0 border border-slate-200">
                  <button onClick={() => setFilterScope('mine')} className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${filterScope === 'mine' ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}>Mis Expedientes</button>
                  <button onClick={() => setFilterScope('all')} className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${filterScope === 'all' ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}>Todos</button>
                </div>

                {/* Filtros Dropdowns y Buscador */}
                <div className="flex flex-wrap items-center gap-2 flex-1 w-full">
                  <MultiSelectDropdown label="Áreas" icon={Briefcase} options={MASTERS.departments} selected={selectedDepts} onChange={setSelectedDepts} />
                  <MultiSelectDropdown label="Trámites" icon={Tag} options={MASTERS.types} selected={selectedTypes} onChange={setSelectedTypes} />
                  <MultiSelectDropdown label="Estados" icon={Filter} options={MASTERS.status} selected={selectedStatus} onChange={setSelectedStatus} />
                  
                  {currentView !== 'analytics' && (
                    <button
                      onClick={() => setHideCompleted(!hideCompleted)}
                      className={`p-2 rounded-xl border flex items-center justify-center transition-colors shadow-sm ${hideCompleted ? 'bg-indigo-50 border-indigo-200 text-indigo-600' : 'bg-white border-slate-200 text-slate-400 hover:bg-slate-50'}`}
                      title={hideCompleted ? "Mostrar Presentados / Completados" : "Ocultar Presentados / Completados"}
                    >
                      {hideCompleted ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  )}

                  <div className="relative flex-1 min-w-[180px]">
                    <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400"/>
                    <input type="text" placeholder="Buscar por expediente o cliente..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"/>
                  </div>
                </div>

                {/* Botones de Acción */}
                <div className="flex items-center gap-2 shrink-0">
                  <button onClick={() => exportToExcel(filteredTasks)} className="bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 px-3.5 py-2 rounded-xl text-xs font-bold shadow-sm flex items-center gap-1.5 transition-colors">
                    <FileSpreadsheet className="w-4 h-4 text-emerald-600" /> <span className="hidden sm:inline">Exportar Excel</span>
                  </button>
                  <button onClick={handleOpenNew} className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-xl text-xs font-bold shadow-md shadow-indigo-100 hover:shadow-lg flex items-center gap-1.5 transition-all">
                    <Plus className="w-4 h-4" /> <span>Nuevo Expediente</span>
                  </button>
                </div>
              </div>

              {(selectedDepts.length > 0 || selectedTypes.length > 0 || selectedStatus.length > 0 || searchTerm) && (
                <div className="mt-3 flex items-center gap-2 text-xs pt-2 border-t border-slate-100">
                  <span className="text-slate-400 font-medium">Filtros activos:</span>
                  <button onClick={clearAllFilters} className="text-rose-600 hover:underline font-bold">Limpiar todos</button>
                </div>
              )}
            </div>

            {/* VISTAS */}
            {currentView === 'list' && <ListView tasks={filteredTasks} onEdit={handleOpenEdit} />}
            {currentView === 'plan' && <AnnualPlanView tasks={filteredTasks} currentUser={currentUser} onEdit={handleOpenEdit} />}
            {currentView === 'analytics' && <AnalyticsView tasks={filteredTasks} onEdit={handleOpenEdit} />}
            {currentView === 'roadmap' && <RoadmapView tasks={filteredTasks} onEdit={handleOpenEdit} />}
            {currentView === 'gtd' && <GTDView tasks={filteredTasks} currentUser={currentUser} onEditParent={handleOpenEdit} />}
          </>
        )}
      </main>

      {/* MODAL FICHA DE EXPEDIENTE */}
      <ExpedienteModal 
        tasks={tasks} 
        show={showModal} 
        onClose={() => setShowModal(false)} 
        task={editingTask} 
        formData={formData} 
        setFormData={setFormData} 
        onSave={handleSaveTask} 
        usersList={usersList} 
        currentUser={currentUser} 
        onAddUpdate={handleAddUpdate} 
        newUpdateText={newUpdateText} 
        setNewUpdateText={setNewUpdateText} 
        setEditingTask={setEditingTask} 
      />
    </div>
  );
};

export default function App() {
  const [currentUser, setCurrentUser] = useState(null);
  const [initializing, setInitializing] = useState(true);

  useEffect(() => { 
    const unsub = onAuthStateChanged(auth, (u) => {
      setCurrentUser(u);
      setInitializing(false);
    }); 
    return () => unsub(); 
  }, []);

  if (initializing) {
    return (
      <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', backgroundColor: '#0f172a' }}>
        <div style={{ width: '44px', height: '44px', border: '3px solid rgba(255,255,255,0.1)', borderTop: '3px solid #6366f1', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }}></div>
        <div style={{ marginTop: '16px', color: '#94a3b8', fontSize: '12px', fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase' }}>Cargando Gestoría & Asesoría...</div>
        <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  return currentUser ? (
    <ExpedienteManager currentUser={currentUser} />
  ) : (
    <Login onLoginSuccess={(user) => setCurrentUser(user)} />
  );
}