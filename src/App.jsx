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
  getDoc,
  deleteDoc,
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
  Building2, Scale, UserCheck, CalendarCheck, RefreshCw, Crown, Shield, UserPlus,
  Coins, Receipt, CreditCard, Sparkles, CheckSquare, Palette, UploadCloud
} from 'lucide-react';
import ClientAutocomplete from './components/ClientAutocomplete';
import ClientesView from './components/ClientesView';
import ClassificationManager, { STATUS_COLORS, DEFAULT_ESTADOS } from './components/ClassificationManager';
import DynamicClassificationSelect from './components/DynamicClassificationSelect';
import TemplateManager from './components/TemplateManager';
import ExpedienteBillingTab from './components/ExpedienteBillingTab';
import BillingView from './components/BillingView';
import ExpedienteChatTab from './components/ExpedienteChatTab';
import BillingSettingsManager from './components/BillingSettingsManager';
import { DEFAULT_BILLING_SETTINGS } from './utils/billingUtils';
import { translations } from './i18n/translations';

// Contexto global para que todos los Badges de estado consuman la paleta dinámica en tiempo real
export const EstadosContext = React.createContext([]);

// --- CONFIGURACIÓN DE SEGURIDAD Y SUPER ADMINISTRADORES ---
export const SUPER_ADMINS = ['albmarrib@gmail.com'];
export const PRE_AUTHORIZED_USERS = [
  { email: 'josep@ferrer-assessoria.com', name: 'Josep Ferrer', role: 'admin', department: 'Dirección / General' }
];

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
    'Abierto',
    'En Riesgo',
    'Con Retraso',
    'Cerrado'
  ]
};

const DELAY_METRICS_TYPES = [
  'Vencimiento Fiscal',
  'Cierre Contable / Libros',
  'Requerimiento / Notificación AEAT',
  'Nóminas y Seg. Social',
  'Trámite Administrativo'
];

// Obtiene el estado efectivo del expediente calculando automáticamente si está fuera de plazo (SLA)
export const getEffectiveStatus = (task) => {
  if (!task) return 'Abierto';
  return normalizeStatus(task.status, task.dueDate);
};

// Normalizador compatible con 4 estados oficiales del despacho:
// 🟢 Verde: Abierto (en marcha y en plazo)
// 🟡 Amarillo: En Riesgo (previsión de incidencias o demora)
// 🔴 Rojo: Con Retraso (plazo superado automáticamente)
// 🔵 Azul: Cerrado (finalizado)
export const normalizeStatus = (status, dueDate) => {
  if (!status) status = 'Abierto';
  const s = String(status).trim();

  // Si tiene fecha de vencimiento y ya pasó (< hoy), y no está cerrado -> AUTOMÁTICAMENTE 'Con Retraso' (Rojo)
  if (dueDate && s !== 'Cerrado' && s !== 'Closed' && s !== 'Completed' && s !== 'Presentado / Tramitado') {
    const todayStr = new Date().toISOString().split('T')[0];
    if (dueDate < todayStr) {
      return 'Con Retraso';
    }
  }

  switch (s) {
    // 🟢 Verde: Abierto (en marcha y dentro de plazo)
    case 'Abierto':
    case 'En Plazo':
    case 'On Track':
    case 'Trámite Periódico':
    case 'Ongoing Task':
      return 'Abierto';

    // 🟡 Amarillo: En Riesgo (previsión de incidencias o demora)
    case 'En Riesgo':
    case 'Pendiente Documentación':
    case 'Behind':
    case 'En Revisión':
    case 'En Pausa / Suspendido':
    case 'On Hold':
      return 'En Riesgo';

    // 🔴 Rojo: Con Retraso (plazo superado)
    case 'Con Retraso':
    case 'Fuera de Plazo':
    case 'Urgente / Próximo a Vencer':
    case 'No Meet Goal':
      return 'Con Retraso';

    // 🔵 Azul: Cerrado (tramitado y archivado)
    case 'Cerrado':
    case 'Closed':
    case 'Presentado / Tramitado':
    case 'Completed':
      return 'Cerrado';

    default:
      return s;
  }
};

const normalizeDepartment = (dept) => {
  if (!dept) return 'Fiscal / Tributario';
  if (dept.includes('General')) return 'Dirección / General';
  if (dept.includes('Systems') || dept.includes('CLEO') || dept.includes('Chemistry')) return 'Fiscal / Tributario';
  if (dept.includes('Financials') || dept.includes('Hematology')) return 'Contable';
  if (dept.includes('Employee') || dept.includes('Parasitology')) return 'Laboral y Seguridad Social';
  return dept;
};

const normalizeType = (type) => {
  if (!type) return 'Vencimiento Fiscal';
  if (type === 'Platform Installs') return 'Vencimiento Fiscal';
  if (type === 'Platform Focused') return 'Cierre Contable / Libros';
  if (type === 'Year Financials') return 'Cierre Contable / Libros';
  if (type === 'Employee Focused') return 'Nóminas y Seg. Social';
  if (type === 'Communication') return 'Consultoría y Asesoramiento';
  if (type === 'Other') return 'Trámite Administrativo';
  return type;
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
    if (!task || !task.dueDate) return 0;
    const currentStatus = getEffectiveStatus(task);
    if (currentStatus === 'Cerrado') return 0; 
    
    // Si la fecha original fue pospuesta
    if (task.originalDueDate && task.originalDueDate !== task.dueDate) {
      const original = new Date(task.originalDueDate);
      const current = new Date(task.dueDate);
      const diffTime = current - original;
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      if (diffDays > 0) return diffDays;
    }

    // O si ya venció respecto a hoy
    const today = new Date();
    today.setHours(0,0,0,0);
    const due = new Date(task.dueDate);
    const diff = Math.ceil((today - due) / (1000 * 60 * 60 * 24));
    return diff > 0 ? diff : 0; 
};

const Badge = ({ text, task, size = 'xs' }) => {
  const dynamicEstados = React.useContext(EstadosContext) || [];
  const statusToEvaluate = task ? getEffectiveStatus(task) : text;
  if (!statusToEvaluate) return null;
  const norm = normalizeStatus(statusToEvaluate, task?.dueDate);

  // 1. Buscar en la colección de estados dinámicos de Firestore
  const matchedEstado = dynamicEstados.find(e => 
    (e.nombre || e.name || '').toLowerCase().trim() === norm.toLowerCase().trim()
  );

  let colorConfig = null;
  if (matchedEstado && matchedEstado.color && STATUS_COLORS[matchedEstado.color]) {
    colorConfig = STATUS_COLORS[matchedEstado.color];
  } else {
    // 2. Mapeo semántico oficial:
    // Verde (Abierto), Amarillo (En Riesgo), Rojo (Con Retraso), Azul (Cerrado)
    switch (norm) {
      case 'Abierto': colorConfig = STATUS_COLORS.emerald; break;
      case 'En Riesgo': colorConfig = STATUS_COLORS.amber; break;
      case 'Con Retraso': colorConfig = STATUS_COLORS.rose; break;
      case 'Cerrado': colorConfig = STATUS_COLORS.blue; break;
      default: colorConfig = STATUS_COLORS.slate;
    }
  }

  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-${size} font-bold border ${colorConfig.colorClass} whitespace-nowrap shadow-2xs tracking-tight`}>
      <span className={`w-1.5 h-1.5 rounded-full ${colorConfig.dotColor} shrink-0`}></span>
      <span>{norm}</span>
    </span>
  );
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

  const toggleOption = (option) => { 
    selected.includes(option) ? onChange(selected.filter(item => item !== option)) : onChange([...selected, option]); 
  };

  return (
    <div className={`relative ${isOpen ? 'z-50' : 'z-10'} ${fullWidth ? 'w-full' : ''}`} ref={wrapperRef}>
      <button 
        type="button" 
        onClick={() => setIsOpen(!isOpen)} 
        className={`flex items-center justify-between gap-2 px-3 py-2 rounded-xl border text-xs font-semibold transition-all shadow-2xs ${
          fullWidth ? 'w-full bg-white border-slate-200' : ''
        } ${
          !fullWidth && selected.length > 0 
            ? 'bg-indigo-50/90 border-indigo-200 text-indigo-700 shadow-indigo-100/50' 
            : 'bg-white/90 hover:bg-slate-50 border-slate-200/90 text-slate-700'
        }`}
      >
        <div className="flex items-center gap-2 overflow-hidden">
          {Icon && <Icon className={`w-3.5 h-3.5 shrink-0 ${selected.length > 0 ? 'text-indigo-600' : 'text-slate-400'}`} />}
          <span className="truncate">{selected.length === 0 ? label : `${label} (${selected.length})`}</span>
        </div>
        <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-200 ${isOpen ? 'rotate-180 text-indigo-600' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute top-full mt-1.5 left-0 w-full min-w-[220px] bg-white rounded-2xl shadow-2xl border border-slate-200 z-[999] animate-in fade-in zoom-in-95 duration-150 max-h-64 overflow-y-auto p-1.5 space-y-0.5">
          {options.length === 0 ? (
            <div className="p-3 text-center text-xs text-slate-400">Sin opciones disponibles</div>
          ) : (
            options.map(option => {
              const isSelected = selected.includes(option);
              return (
                <div 
                  key={option} 
                  onClick={() => toggleOption(option)} 
                  className={`flex items-center gap-2.5 px-3 py-2 rounded-xl cursor-pointer text-xs transition-colors ${
                    isSelected 
                      ? 'bg-indigo-50/90 text-indigo-800 font-bold' 
                      : 'hover:bg-slate-50 text-slate-700 font-medium'
                  }`}
                >
                  <div className={`w-4 h-4 rounded-md border flex items-center justify-center shrink-0 transition-colors ${
                    isSelected ? 'bg-indigo-600 border-indigo-600 shadow-xs' : 'border-slate-300 bg-white'
                  }`}>
                    {isSelected && <Check className="w-3 h-3 text-white stroke-[3]" />}
                  </div>
                  <span className="truncate">{option}</span>
                </div>
              );
            })
          )}
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
      const effectiveStatus = getEffectiveStatus(t);
      if (effectiveStatus === 'Cerrado') return false; 
      if (!t.dueDate) return false;
      const today = new Date();
      today.setHours(0,0,0,0);
      const due = new Date(t.dueDate);
      const diffTime = due - today;
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      const limitDays = normalizeType(t.type) === 'Vencimiento Fiscal' ? 30 : 10;
      return diffDays <= limitDays || effectiveStatus === 'Con Retraso' || effectiveStatus === 'En Riesgo';
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
      <button 
        onClick={() => setIsOpen(!isOpen)} 
        className="relative p-2 text-slate-300 hover:text-white transition-all rounded-xl hover:bg-slate-800/80 border border-transparent hover:border-slate-700/50" 
        title="Vencimientos Próximos"
      >
        <Bell className="w-5 h-5" />
        {notifications.length > 0 && (
          <span className="absolute top-1 right-1 min-w-[18px] h-[18px] px-1 bg-rose-500 rounded-full border-2 border-slate-900 flex items-center justify-center text-[9px] font-black text-white shadow-xs">
            {notifications.length > 9 ? '9+' : notifications.length}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute top-full right-0 mt-2 w-84 bg-white/95 backdrop-blur-md rounded-2xl shadow-premium border border-slate-200/90 z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
          <div className="bg-slate-50/90 p-3.5 border-b border-slate-100 flex justify-between items-center">
            <h3 className="font-bold text-slate-800 text-xs tracking-wide uppercase flex items-center gap-2">
              <Clock className="w-4 h-4 text-indigo-600"/> 
              <span>Vencimientos Próximos</span>
            </h3>
            <span className="bg-indigo-100 text-indigo-700 text-[11px] px-2 py-0.5 rounded-full font-bold">
              {notifications.length}
            </span>
          </div>

          <div className="max-h-80 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-xs">
                <CheckCircle2 className="w-8 h-8 mx-auto mb-2 opacity-25 text-emerald-500"/>
                <p className="font-medium text-slate-600">¡Todo al día!</p>
                <p className="text-[11px] text-slate-400 mt-0.5">Sin vencimientos pendientes inmediatos.</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100/80">
                {notifications.map(n => (
                  <div key={n.id} onClick={() => { onOpenTask(n); setIsOpen(false); }} className="p-3 hover:bg-indigo-50/60 cursor-pointer transition-colors group">
                    <div className="flex items-start gap-3">
                      <div className={`mt-1.5 w-2 h-2 rounded-full shrink-0 ${n.alertType === 'overdue' ? 'bg-rose-500 shadow-xs shadow-rose-500/50' : n.alertType === 'urgent' ? 'bg-amber-500 shadow-xs shadow-amber-500/50' : 'bg-blue-400'}`}></div>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-bold text-slate-800 group-hover:text-indigo-600 truncate leading-tight transition-colors">{n.title}</p>
                        {n.client && <p className="text-[11px] text-indigo-600 font-semibold truncate mt-0.5">{n.client}</p>}
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

// --- VISTA GTD: CENTRO DE ACCIONES Y TRÁMITES (COMPACTO Y PROFESIONAL) ---
const GTDView = ({ 
  tasks = [], 
  currentUser, 
  onEditParent,
  isAdmin = false,
  usersList = []
}) => {
  const [activeTab, setActiveTab] = useState('all'); // 'all', 'mine', 'waiting'
  const [sortBy, setSortBy] = useState('urgency'); // 'urgency', 'expediente', 'assignee'
  const [adminScope, setAdminScope] = useState('personal'); // 'personal', 'all_office'
  const [selectedAssigneeFilter, setSelectedAssigneeFilter] = useState('');
  const [urgencyFilter, setUrgencyFilter] = useState('all'); // 'all', 'overdue', 'today'
  const [localSearch, setLocalSearch] = useState('');

  // Cálculo de Urgencia y Días Restantes según dueDate del expediente
  const getActionUrgency = (task) => {
    const dueDateStr = task.dueDate;
    if (!dueDateStr) {
      return {
        dueDate: '',
        label: 'Sin fecha',
        color: 'slate',
        badgeClass: 'bg-slate-100 text-slate-500 border-slate-200',
        daysDiff: 9999,
        isOverdue: false,
        isToday: false,
        isSoon: false
      };
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const due = new Date(dueDateStr);
    due.setHours(0, 0, 0, 0);
    const diffTime = due - today;
    const daysDiff = Math.round(diffTime / (1000 * 60 * 60 * 24));

    if (daysDiff < 0) {
      return {
        dueDate: dueDateStr,
        label: `Vencido (${Math.abs(daysDiff)}d)`,
        shortLabel: `${daysDiff}d`,
        color: 'rose',
        badgeClass: 'bg-rose-50 text-rose-700 border-rose-200 font-bold',
        daysDiff,
        isOverdue: true,
        isToday: false,
        isSoon: false
      };
    } else if (daysDiff === 0) {
      return {
        dueDate: dueDateStr,
        label: '¡Vence Hoy!',
        shortLabel: 'Hoy',
        color: 'amber',
        badgeClass: 'bg-amber-100 text-amber-800 border-amber-300 font-extrabold',
        daysDiff: 0,
        isOverdue: false,
        isToday: true,
        isSoon: true
      };
    } else if (daysDiff <= 3) {
      return {
        dueDate: dueDateStr,
        label: `Vence en ${daysDiff}d`,
        shortLabel: `${daysDiff}d`,
        color: 'amber',
        badgeClass: 'bg-amber-50 text-amber-700 border-amber-200 font-semibold',
        daysDiff,
        isOverdue: false,
        isToday: false,
        isSoon: true
      };
    } else {
      return {
        dueDate: dueDateStr,
        label: `${dueDateStr}`,
        shortLabel: `${daysDiff}d`,
        color: 'emerald',
        badgeClass: 'bg-slate-50 text-slate-600 border-slate-200',
        daysDiff,
        isOverdue: false,
        isToday: false,
        isSoon: false
      };
    }
  };

  const myEmail = (currentUser?.email || '').toLowerCase().trim();
  const myUserPrefix = myEmail.split('@')[0];

  // Procesamiento y separación de TO-DO y WAITING-FOR con control estricto anti-dispersión
  const { 
    myActions, 
    waitingActions, 
    allKnownAssignees,
    countOverdue, 
    countToday 
  } = useMemo(() => {
    const mineList = [];
    const waitingList = [];
    const assigneesSet = new Set();
    let overdueCount = 0;
    let todayCount = 0;

    const s = localSearch.toLowerCase().trim();

    tasks.forEach(task => {
      const effectiveStatus = getEffectiveStatus(task);
      if (effectiveStatus === 'Cerrado' || !task.actions || task.actions.length === 0) return;

      // Involucración en el expediente:
      const isTaskAssignee = Array.isArray(task.assignees) && task.assignees.some(a => {
        const aLower = (a || '').toLowerCase().trim();
        return aLower === myEmail || aLower === myUserPrefix;
      });
      const isTaskCreator = (task.createdBy || '').toLowerCase().trim() === myEmail;
      const amIInvolvedInTask = isTaskAssignee || isTaskCreator;

      const urgency = getActionUrgency(task);

      task.actions.forEach(action => {
        if (action.isCompleted) return;

        if (action.assignee) {
          assigneesSet.add(action.assignee.trim());
        }

        // Búsqueda
        if (s) {
          const matchTitle = (task.title || '').toLowerCase().includes(s);
          const matchClient = (task.client || '').toLowerCase().includes(s);
          const matchAction = (action.text || '').toLowerCase().includes(s);
          const matchAssignee = (action.assignee || '').toLowerCase().includes(s);
          if (!matchTitle && !matchClient && !matchAction && !matchAssignee) return;
        }

        // Filtro de urgencia
        if (urgencyFilter === 'overdue' && !urgency.isOverdue) return;
        if (urgencyFilter === 'today' && !urgency.isToday && !urgency.isSoon) return;

        const actionAssigneeLower = (action.assignee || '').toLowerCase().trim();
        const isAssignedToMe = actionAssigneeLower === myEmail || 
                               actionAssigneeLower === myUserPrefix || 
                               actionAssigneeLower === 'yo';

        const item = {
          ...action,
          parentTask: task,
          urgency
        };

        if (urgency.isOverdue) overdueCount++;
        if (urgency.isToday) todayCount++;

        // LÓGICA DE VISIBILIDAD:
        if (isAdmin && adminScope === 'all_office') {
          // El Administrador en modo supervisión global
          if (selectedAssigneeFilter) {
            const filterLower = selectedAssigneeFilter.toLowerCase().trim();
            if (actionAssigneeLower === filterLower || actionAssigneeLower === filterLower.split('@')[0]) {
              mineList.push(item);
            } else {
              waitingList.push(item);
            }
          } else {
            if (isAssignedToMe) {
              mineList.push(item);
            } else {
              waitingList.push(item);
            }
          }
        } else {
          // MODO PERSONAL (Tanto para Gestores normales como para el Admin en su propio espacio)
          if (isAssignedToMe) {
            mineList.push(item);
          } else if (amIInvolvedInTask) {
            // ANTI-DISPERSIÓN: Solo entra en Waiting-For si el gestor forma parte de este expediente
            waitingList.push(item);
          }
        }
      });
    });

    // Ordenación
    const sortFn = (a, b) => {
      if (sortBy === 'urgency') {
        return a.urgency.daysDiff - b.urgency.daysDiff;
      }
      if (sortBy === 'expediente') {
        return (a.parentTask.title || '').localeCompare(b.parentTask.title || '');
      }
      if (sortBy === 'assignee') {
        return (a.assignee || '').localeCompare(b.assignee || '');
      }
      return 0;
    };

    mineList.sort(sortFn);
    waitingList.sort(sortFn);

    return {
      myActions: mineList,
      waitingActions: waitingList,
      allKnownAssignees: Array.from(assigneesSet).sort(),
      countOverdue: overdueCount,
      countToday: todayCount
    };
  }, [tasks, currentUser, localSearch, sortBy, urgencyFilter, adminScope, selectedAssigneeFilter, isAdmin]);

  // Marcar trámite como completado directamente
  const toggleActionQuick = async (actionItem) => {
    const taskRef = doc(db, 'expedientes', actionItem.parentTask.id);
    const updatedActions = actionItem.parentTask.actions.map(a => 
      a.id === actionItem.id ? { ...a, isCompleted: true, completedAt: new Date().toISOString() } : a
    );
    try {
      await updateDoc(taskRef, { 
        actions: updatedActions, 
        updatedBy: currentUser.email, 
        lastUpdated: serverTimestamp() 
      });
    } catch (e) {
      await updateDoc(doc(db, 'tasks', actionItem.parentTask.id), { 
        actions: updatedActions, 
        updatedBy: currentUser.email, 
        lastUpdated: serverTimestamp() 
      });
    }
  };

  // Exportar checklist para enviar a un delegado o externo (Word / doc)
  const exportChecklistForAssignee = (assigneeName, actionsToExport) => {
    const date = new Date().toLocaleDateString('es-ES');
    let content = `CHECKLIST DE TRÁMITES PENDIENTES - ${assigneeName.toUpperCase()}\n`;
    content += `Fecha de emisión: ${date}\n`;
    content += `Despacho GestFlow\n--------------------------------------------------\n\n`;
    actionsToExport.forEach((action, idx) => {
      content += `${idx + 1}. [ ] ${action.text}\n`;
      content += `   Expediente: ${action.parentTask.title}\n`;
      if (action.parentTask.client) content += `   Cliente: ${action.parentTask.client}\n`;
      if (action.parentTask.dueDate) content += `   Fecha Límite: ${action.parentTask.dueDate} (${action.urgency.label})\n`;
      content += `\n`;
    });
    const blob = new Blob([content], { type: 'application/msword;charset=utf-8' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    const safeName = assigneeName.replace(/[^a-zA-Z0-9]/g, '_');
    link.download = `Checklist_GTD_${safeName}_${date.replace(/\//g, '-')}.doc`;
    link.click();
  };

  return (
    <div className="w-full space-y-3.5 animate-in fade-in duration-200">
      
      {/* BARRA SUPERIOR DE HERRAMIENTAS GTD (COMPACTA Y PROFESIONAL) */}
      <div className="bg-white p-3 rounded-xl border border-slate-200/80 shadow-2xs space-y-2.5">
        
        {/* Fila 1: Título, Selector To-Do/Waiting y Toggle Admin */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2.5">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-600 text-white flex items-center justify-center font-bold shadow-xs">
              <Target className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-bold text-slate-800">Trámites GTD</h2>
                {isAdmin && (
                  <span className="text-[10px] bg-slate-100 text-slate-600 font-semibold px-1.5 py-0.2 rounded border border-slate-200">
                    Modo Admin
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-400">Acciones inmediatas y seguimiento de delegaciones</p>
            </div>
          </div>

          {/* Selector de Pestaña Principal */}
          <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-lg border border-slate-200/80 w-full sm:w-auto justify-between sm:justify-start">
            <button
              type="button"
              onClick={() => setActiveTab('all')}
              className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-all ${
                activeTab === 'all' 
                  ? 'bg-white text-slate-800 shadow-2xs font-bold' 
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Ambas Listas
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('mine')}
              className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-all flex items-center gap-1.5 ${
                activeTab === 'mine' 
                  ? 'bg-white text-emerald-700 shadow-2xs font-bold' 
                  : 'text-slate-500 hover:text-emerald-700'
              }`}
            >
              <span>Mi To-Do</span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${activeTab === 'mine' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-600'}`}>
                {myActions.length}
              </span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('waiting')}
              className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-all flex items-center gap-1.5 ${
                activeTab === 'waiting' 
                  ? 'bg-white text-amber-700 shadow-2xs font-bold' 
                  : 'text-slate-500 hover:text-amber-700'
              }`}
            >
              <span>En Espera</span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${activeTab === 'waiting' ? 'bg-amber-100 text-amber-800' : 'bg-slate-200 text-slate-600'}`}>
                {waitingActions.length}
              </span>
            </button>
          </div>
        </div>

        {/* Fila 2: Filtros de Urgencia, Búsqueda, Ordenación y Supervisión Despacho */}
        <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2">
          
          {/* Filtros rápidos de Urgencia */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide mr-1">Plazos:</span>
            <button
              type="button"
              onClick={() => setUrgencyFilter('all')}
              className={`px-2 py-0.5 text-[11px] rounded-lg transition-all ${
                urgencyFilter === 'all' 
                  ? 'bg-slate-800 text-white font-bold' 
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200 font-medium'
              }`}
            >
              Todos
            </button>
            <button
              type="button"
              onClick={() => setUrgencyFilter('overdue')}
              className={`px-2 py-0.5 text-[11px] rounded-lg transition-all flex items-center gap-1 ${
                urgencyFilter === 'overdue' 
                  ? 'bg-rose-600 text-white font-bold shadow-xs' 
                  : countOverdue > 0 
                  ? 'bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200 font-semibold' 
                  : 'bg-slate-100 text-slate-400 font-medium'
              }`}
            >
              <AlertTriangle className="w-3 h-3" />
              <span>Vencidos ({countOverdue})</span>
            </button>
            <button
              type="button"
              onClick={() => setUrgencyFilter('today')}
              className={`px-2 py-0.5 text-[11px] rounded-lg transition-all flex items-center gap-1 ${
                urgencyFilter === 'today' 
                  ? 'bg-amber-600 text-white font-bold shadow-xs' 
                  : countToday > 0 
                  ? 'bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-200 font-semibold' 
                  : 'bg-slate-100 text-slate-400 font-medium'
              }`}
            >
              <Clock className="w-3 h-3" />
              <span>Hoy / Próximos ({countToday})</span>
            </button>
          </div>

          {/* Búsqueda, Ordenación y Filtros Admin */}
          <div className="flex items-center gap-2 flex-wrap ml-auto">
            
            {/* Si es Admin: Alternar Mi Espacio vs Despacho Global */}
            {isAdmin && (
              <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-lg border border-slate-200">
                <button
                  type="button"
                  onClick={() => { setAdminScope('personal'); setSelectedAssigneeFilter(''); }}
                  className={`px-2 py-0.5 text-[10px] font-bold rounded ${
                    adminScope === 'personal' ? 'bg-white text-indigo-700 shadow-2xs' : 'text-slate-500'
                  }`}
                  title="Ver solo mis trámites y lo que he delegado en mis expedientes"
                >
                  Mi Espacio
                </button>
                <button
                  type="button"
                  onClick={() => setAdminScope('all_office')}
                  className={`px-2 py-0.5 text-[10px] font-bold rounded ${
                    adminScope === 'all_office' ? 'bg-white text-indigo-700 shadow-2xs' : 'text-slate-500'
                  }`}
                  title="Ver todos los trámites del despacho"
                >
                  Todo el Despacho
                </button>
              </div>
            )}

            {/* Si está en visión global: selector de asesor/externo */}
            {isAdmin && adminScope === 'all_office' && (
              <select
                value={selectedAssigneeFilter}
                onChange={(e) => setSelectedAssigneeFilter(e.target.value)}
                className="py-1 px-2 text-xs border border-slate-200 rounded-lg bg-white text-slate-700 font-medium outline-none focus:ring-1 focus:ring-indigo-500 max-w-[150px]"
              >
                <option value="">Todos los gestores</option>
                {allKnownAssignees.map(a => (
                  <option key={a} value={a}>{a}</option>
                ))}
              </select>
            )}

            {/* Ordenación */}
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="py-1 px-2 text-xs border border-slate-200 rounded-lg bg-white text-slate-700 font-medium outline-none focus:ring-1 focus:ring-indigo-500"
              title="Criterio de ordenación"
            >
              <option value="urgency">⚡ Ordenar: Fecha / Urgencia</option>
              <option value="expediente">📁 Ordenar: Expediente</option>
              <option value="assignee">👤 Ordenar: Responsable</option>
            </select>

            {/* Búsqueda rápida */}
            <div className="relative w-40 sm:w-52">
              <Search className="absolute left-2.5 top-2 w-3 h-3 text-slate-400" />
              <input
                type="text"
                value={localSearch}
                onChange={(e) => setLocalSearch(e.target.value)}
                placeholder="Buscar trámite..."
                className="w-full pl-7 pr-2.5 py-1 text-xs border border-slate-200 rounded-lg bg-slate-50 focus:bg-white outline-none focus:ring-1 focus:ring-indigo-500 text-slate-800"
              />
            </div>
          </div>
        </div>
      </div>

      {/* CUERPO PRINCIPAL: LISTAS TO-DO Y WAITING FOR */}
      <div className={`grid gap-3.5 ${activeTab === 'all' ? 'grid-cols-1 lg:grid-cols-2' : 'grid-cols-1'}`}>
        
        {/* COLUMNA 1: MI TO-DO (MIS TRÁMITES DIRECTOS) */}
        {(activeTab === 'all' || activeTab === 'mine') && (
          <div className="bg-white rounded-xl border border-slate-200/80 shadow-2xs overflow-hidden flex flex-col">
            
            {/* Cabecera compacta To-Do */}
            <div className="p-2.5 px-3 bg-emerald-50/70 border-b border-emerald-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <h3 className="text-xs font-bold text-emerald-950 uppercase tracking-wide">
                  {isAdmin && adminScope === 'all_office' && selectedAssigneeFilter 
                    ? `Trámites de: ${selectedAssigneeFilter}`
                    : 'Mi To-Do (Mis Trámites a Realizar)'}
                </h3>
              </div>
              <span className="text-[11px] font-bold bg-white text-emerald-800 px-2 py-0.5 rounded-full border border-emerald-200 shadow-2xs">
                {myActions.length} pendientes
              </span>
            </div>

            {/* Listado de tareas To-Do */}
            <div className="p-2.5 space-y-1.5 flex-1 overflow-y-auto max-h-[620px]">
              {myActions.length === 0 ? (
                <div className="py-12 text-center text-slate-400">
                  <CheckSquare className="w-8 h-8 text-emerald-400/40 mx-auto mb-1.5" />
                  <p className="text-xs font-semibold text-slate-600">¡Todo al día en tu To-Do!</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">No tienes trámites propios pendientes en este momento.</p>
                </div>
              ) : (
                myActions.map((action) => (
                  <div
                    key={`${action.parentTask.id}_${action.id}`}
                    className="p-2.5 rounded-lg border border-slate-200 bg-white hover:border-emerald-300 hover:shadow-2xs transition-all flex items-start justify-between gap-2.5 group"
                  >
                    {/* Checkbox para completar */}
                    <button
                      type="button"
                      onClick={() => toggleActionQuick(action)}
                      className="w-5 h-5 mt-0.5 rounded-md border-2 border-slate-300 bg-white flex items-center justify-center shrink-0 hover:border-emerald-500 hover:bg-emerald-50 transition-colors cursor-pointer group-hover:border-emerald-400"
                      title="Marcar paso como completado"
                    >
                      <Check className="w-3.5 h-3.5 text-emerald-600 opacity-0 hover:opacity-100 transition-opacity" strokeWidth={3} />
                    </button>

                    {/* Descripción y contexto del expediente */}
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-slate-800 leading-snug break-words">
                        {action.text}
                      </p>
                      
                      <div className="flex items-center gap-1.5 flex-wrap mt-1 text-[11px]">
                        {/* Enlace al Expediente */}
                        <button
                          type="button"
                          onClick={() => onEditParent(action.parentTask)}
                          className="font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 px-1.5 py-0.2 rounded border border-indigo-200/70 truncate max-w-[200px] transition-colors"
                          title="Abrir ficha del expediente"
                        >
                          📁 {action.parentTask.title}
                        </button>

                        {/* Cliente */}
                        {action.parentTask.client && (
                          <span className="text-slate-500 truncate max-w-[150px]">
                            • {action.parentTask.client}
                          </span>
                        )}

                        {/* Badge de Urgencia y Due Date */}
                        <span className={`inline-flex items-center gap-1 px-1.5 py-0.2 rounded text-[10px] border ${action.urgency.badgeClass}`}>
                          <Clock className="w-2.5 h-2.5" />
                          <span>{action.urgency.label}</span>
                        </span>
                      </div>
                    </div>

                    {/* Botón rápido Abrir */}
                    <button
                      type="button"
                      onClick={() => onEditParent(action.parentTask)}
                      className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-indigo-600 p-1 rounded transition-all shrink-0"
                      title="Abrir expediente"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* COLUMNA 2: EN ESPERA / DELEGADAS (WAITING FOR) */}
        {(activeTab === 'all' || activeTab === 'waiting') && (
          <div className="bg-white rounded-xl border border-slate-200/80 shadow-2xs overflow-hidden flex flex-col">
            
            {/* Cabecera compacta Waiting For */}
            <div className="p-2.5 px-3 bg-amber-50/70 border-b border-amber-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-amber-600" />
                <h3 className="text-xs font-bold text-amber-950 uppercase tracking-wide">
                  En Espera (Delegado a Terceros / Externos)
                </h3>
              </div>
              <span className="text-[11px] font-bold bg-white text-amber-800 px-2 py-0.5 rounded-full border border-amber-200 shadow-2xs">
                {waitingActions.length} en espera
              </span>
            </div>

            {/* Listado de tareas Waiting-For */}
            <div className="p-2.5 space-y-1.5 flex-1 overflow-y-auto max-h-[620px]">
              {waitingActions.length === 0 ? (
                <div className="py-12 text-center text-slate-400">
                  <Users className="w-8 h-8 text-amber-400/40 mx-auto mb-1.5" />
                  <p className="text-xs font-semibold text-slate-600">No estás esperando trámites de nadie</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    {isAdmin && adminScope === 'all_office' 
                      ? 'No hay trámites delegados en el despacho.' 
                      : 'En tus expedientes no hay pasos pendientes asignados a otros compañeros o externos.'}
                  </p>
                </div>
              ) : (
                waitingActions.map((action) => {
                  const assigneeName = action.assignee || 'Sin Asignar';
                  const isExternal = !assigneeName.includes('@');

                  return (
                    <div
                      key={`${action.parentTask.id}_${action.id}`}
                      className="p-2.5 rounded-lg border border-slate-200 bg-white hover:border-amber-300 hover:shadow-2xs transition-all flex items-start justify-between gap-2.5 group"
                    >
                      {/* Checkbox para completar si ya nos entregaron lo esperado */}
                      <button
                        type="button"
                        onClick={() => toggleActionQuick(action)}
                        className="w-5 h-5 mt-0.5 rounded-md border-2 border-slate-300 bg-white flex items-center justify-center shrink-0 hover:border-emerald-500 hover:bg-emerald-50 transition-colors cursor-pointer group-hover:border-amber-400"
                        title="Marcar como recibido / completado"
                      >
                        <Check className="w-3.5 h-3.5 text-emerald-600 opacity-0 hover:opacity-100 transition-opacity" strokeWidth={3} />
                      </button>

                      {/* Descripción y metadatos */}
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-slate-800 leading-snug break-words">
                          {action.text}
                        </p>
                        
                        <div className="flex items-center gap-1.5 flex-wrap mt-1 text-[11px]">
                          {/* Badge del Asignado Delegado */}
                          <span 
                            className={`inline-flex items-center gap-1 px-1.5 py-0.2 rounded font-bold text-[10px] border ${
                              isExternal 
                                ? 'bg-amber-50 text-amber-800 border-amber-200' 
                                : 'bg-slate-100 text-slate-700 border-slate-200'
                            }`}
                            title={`Esperando respuesta de: ${assigneeName}`}
                          >
                            <User className="w-2.5 h-2.5 opacity-70" />
                            <span>{assigneeName}</span>
                          </span>

                          {/* Enlace al Expediente */}
                          <button
                            type="button"
                            onClick={() => onEditParent(action.parentTask)}
                            className="font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 px-1.5 py-0.2 rounded border border-indigo-200/70 truncate max-w-[180px] transition-colors"
                            title="Abrir ficha del expediente"
                          >
                            📁 {action.parentTask.title}
                          </button>

                          {/* Cliente */}
                          {action.parentTask.client && (
                            <span className="text-slate-500 truncate max-w-[130px]">
                              • {action.parentTask.client}
                            </span>
                          )}

                          {/* Badge de Urgencia y Due Date */}
                          <span className={`inline-flex items-center gap-1 px-1.5 py-0.2 rounded text-[10px] border ${action.urgency.badgeClass}`}>
                            <Clock className="w-2.5 h-2.5" />
                            <span>{action.urgency.label}</span>
                          </span>
                        </div>
                      </div>

                      {/* Botón rápido Exportar y Abrir */}
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={() => exportChecklistForAssignee(assigneeName, [action])}
                          className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-amber-700 p-1 rounded transition-all"
                          title={`Exportar checklist para ${assigneeName}`}
                        >
                          <FileText className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => onEditParent(action.parentTask)}
                          className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-indigo-600 p-1 rounded transition-all"
                          title="Abrir expediente"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
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
            const effectiveStatus = getEffectiveStatus(task);
            if (!task.dueDate) return;
            const due = new Date(task.dueDate);
            const isCompleted = effectiveStatus === 'Cerrado';
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
            <div onClick={() => onEdit(task)} className="hover-card-elevate bg-white/95 backdrop-blur-xs p-3.5 rounded-xl border border-slate-200/80 shadow-xs hover:border-indigo-200/80 cursor-pointer group transition-all">
                <div className="flex justify-between items-start mb-1.5">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{normalizeDepartment(task.department)}</span>
                    <Badge task={task} text={task.status} size="[10px]"/>
                </div>
                <h4 className="font-bold text-sm text-slate-800 leading-tight mb-1 group-hover:text-indigo-600 transition-colors line-clamp-2">{task.title}</h4>
                {task.client && (
                    <div className="inline-flex items-center gap-1 text-[11px] text-indigo-700 font-semibold px-2 py-0.5 rounded-md bg-indigo-50/70 border border-indigo-100/60 mb-2 max-w-full truncate">
                        <Building2 className="w-3 h-3 text-indigo-500 shrink-0"/> 
                        <span className="truncate">{task.client}</span>
                    </div>
                )}
                <div className="flex items-center gap-2 text-xs text-slate-500 mt-1">
                    <Clock className="w-3.5 h-3.5 text-slate-400"/> 
                    <span className={delay > 0 ? "text-rose-600 font-bold bg-rose-50 px-1 rounded border border-rose-100 text-[11px]" : "font-medium"}>
                        {new Date(task.dueDate).toLocaleDateString('es-ES', {month: 'short', day: 'numeric'})}
                        {delay > 0 && ` (+${delay}d demora)`}
                    </span>
                </div>
            </div>
        );
    };

    return (
        <div className="space-y-4 animate-in fade-in duration-300">
            <div className="flex items-center justify-between pb-2">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 shadow-2xs">
                        <CalendarCheck className="w-5 h-5"/>
                    </div>
                    <div>
                      <h2 className="text-xl font-bold text-slate-900 tracking-tight">Cronograma de Vencimientos</h2>
                      <p className="text-xs text-slate-500">Visualización temporal de plazos fiscales y expedientes por fase</p>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 min-h-[520px]">
                {/* Fuera de Plazo */}
                <div className="flex flex-col bg-rose-50/40 backdrop-blur-xs rounded-2xl border border-rose-200/70 shadow-xs overflow-hidden">
                    <div className="p-3.5 border-b border-rose-200/60 bg-rose-100/40 flex justify-between items-center">
                        <h3 className="font-bold text-rose-900 text-xs uppercase tracking-wide flex items-center gap-1.5">
                            <AlertTriangle className="w-4 h-4 text-rose-600"/> Fuera de Plazo
                        </h3>
                        <span className="bg-white/90 text-rose-700 text-xs font-bold px-2 py-0.5 rounded-full border border-rose-200 shadow-2xs">{buckets.overdue.length}</span>
                    </div>
                    <div className="flex-1 overflow-y-auto p-3 space-y-2.5">{buckets.overdue.map(t => <RoadmapCard key={t.id} task={t}/>)}</div>
                </div>

                {/* Mes Actual */}
                <div className="flex flex-col bg-slate-100/70 backdrop-blur-xs rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
                    <div className="p-3.5 border-b border-slate-200/80 bg-slate-200/50 flex justify-between items-center">
                        <h3 className="font-bold text-slate-800 text-xs uppercase tracking-wide flex items-center gap-1.5">
                            <CalendarDays className="w-4 h-4 text-indigo-600"/> {currentMonthName} (Mes Actual)
                        </h3>
                        <span className="bg-white text-slate-700 text-xs font-bold px-2 py-0.5 rounded-full border border-slate-200 shadow-2xs">{buckets.current.length}</span>
                    </div>
                    <div className="flex-1 overflow-y-auto p-3 space-y-2.5">{buckets.current.map(t => <RoadmapCard key={t.id} task={t}/>)}</div>
                </div>

                {/* Próximo Mes */}
                <div className="flex flex-col bg-slate-50/70 backdrop-blur-xs rounded-2xl border border-slate-200/70 shadow-xs overflow-hidden">
                    <div className="p-3.5 border-b border-slate-200/70 bg-slate-100/50 flex justify-between items-center">
                        <h3 className="font-bold text-slate-700 text-xs uppercase tracking-wide">{nextMonthName} (Próximo)</h3>
                        <span className="bg-white text-slate-600 text-xs font-bold px-2 py-0.5 rounded-full border border-slate-200 shadow-2xs">{buckets.next.length}</span>
                    </div>
                    <div className="flex-1 overflow-y-auto p-3 space-y-2.5">{buckets.next.map(t => <RoadmapCard key={t.id} task={t}/>)}</div>
                </div>

                {/* Horizonte Posterior */}
                <div className="flex flex-col bg-slate-50/40 backdrop-blur-xs rounded-2xl border border-slate-200/50 shadow-xs overflow-hidden">
                    <div className="p-3.5 border-b border-slate-200/50 bg-slate-100/30 flex justify-between items-center">
                        <h3 className="font-bold text-slate-500 text-xs uppercase tracking-wide">Horizonte Posterior</h3>
                        <span className="bg-slate-100 text-slate-500 text-xs font-bold px-2 py-0.5 rounded-full">{buckets.future.length}</span>
                    </div>
                    <div className="flex-1 overflow-y-auto p-3 space-y-2.5">{buckets.future.map(t => <RoadmapCard key={t.id} task={t}/>)}</div>
                </div>
            </div>
        </div>
    );
};

// --- COMPONENTE DE ACCESO DENEGADO (PROTECCIÓN ESTRICTA DEL DESPACHO) ---
const AccessDeniedView = ({ currentUser, onSignOut }) => {
  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-center items-center p-4 text-white">
      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-8 text-center shadow-2xl relative overflow-hidden animate-in fade-in duration-300">
        <div className="w-16 h-16 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-inner">
          <ShieldAlert className="w-8 h-8 text-rose-500" />
        </div>
        <h2 className="text-xl font-bold text-white mb-2">Acceso No Autorizado al Despacho</h2>
        <p className="text-xs text-slate-400 mb-6 leading-relaxed">
          Has iniciado sesión como <strong className="text-slate-200">{currentUser?.email}</strong>, pero este correo no figura como asesor o empleado autorizado en el despacho.
        </p>
        <div className="bg-slate-950/80 rounded-xl p-3.5 border border-slate-800/80 text-left mb-6 text-xs text-slate-400 space-y-2">
          <p className="font-bold text-slate-300 flex items-center gap-1.5">
            <Lock className="w-3.5 h-3.5 text-indigo-400" />
            <span>Medidas de Seguridad y RGPD</span>
          </p>
          <p className="text-[11px] leading-normal">
            Por confidencialidad de los expedientes y clientes, solo el personal dado de alta por el Administrador puede acceder al sistema.
          </p>
          <p className="text-[11px] text-slate-500">
            Contacta con <strong className="text-slate-300">albmarrib@gmail.com</strong> para autorizar tu usuario.
          </p>
        </div>
        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="flex-1 py-2.5 px-4 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold transition-all flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" /> Reintentar
          </button>
          <button
            type="button"
            onClick={onSignOut}
            className="flex-1 py-2.5 px-4 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-semibold transition-all flex items-center justify-center gap-1.5 shadow-md shadow-rose-900/30 cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" /> Cerrar Sesión
          </button>
        </div>
      </div>
    </div>
  );
};

// --- VISTA ADMIN: GESTIÓN Y AUDITORÍA DEL DESPACHO ---
const AdminView = ({ 
  tasks, 
  currentAdmin, 
  logAction, 
  onNavigateToClientes, 
  clientesCount = 0,
  areas = [],
  tramos = [],
  estados = [],
  currentUser,
  usersList = [],
  billingSettings = {},
  lang = 'ca'
}) => {
  const [selectedTasks, setSelectedTasks] = useState([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [adminList, setAdminList] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [adminSearchTerm, setAdminSearchTerm] = useState('');
  const [adminTab, setAdminTab] = useState('clasificacion'); // 'clasificacion' | 'plantillas' | 'facturacion' | 'personal' | 'clientes' | 'mantenimiento'

  // Estado para formulario de alta de nuevo empleado
  const [newEmployee, setNewEmployee] = useState({
    email: '',
    name: '',
    department: areas[0]?.nombre || MASTERS.departments[0],
    role: 'gestor'
  });
  const [empFeedback, setEmpFeedback] = useState({ text: '', type: '' });

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
          batch.delete(doc(db, 'expedientes', id)); 
          batch.delete(doc(db, 'tasks', id));
      });
      await batch.commit();
      setSelectedTasks([]); alert("Expedientes eliminados correctamente.");
    } catch (e) { alert("Error al eliminar: " + e.message); }
    setIsProcessing(false);
  };

  // Alta y autorización de empleado
  const handleSaveEmployee = async (e) => {
    e.preventDefault();
    const cleanEmail = (newEmployee.email || '').toLowerCase().trim();
    if (!cleanEmail || !cleanEmail.includes('@')) {
      setEmpFeedback({ text: 'Introduce un correo electrónico válido.', type: 'error' });
      return;
    }

    try {
      // 1. Guardar o actualizar en colección users
      await setDoc(doc(db, 'users', cleanEmail), {
        email: cleanEmail,
        name: newEmployee.name.trim() || cleanEmail.split('@')[0],
        department: newEmployee.department || 'General',
        role: newEmployee.role,
        status: 'active',
        createdAt: serverTimestamp(),
        createdBy: currentUser?.email || currentAdmin
      }, { merge: true });

      // 2. Si el rol es admin, añadirlo a la lista en settings/config
      if (newEmployee.role === 'admin') {
        await updateDoc(doc(db, 'settings', 'config'), {
          admins: arrayUnion(cleanEmail)
        }).catch(async () => {
          await setDoc(doc(db, 'settings', 'config'), { admins: [cleanEmail] }, { merge: true });
        });
      }

      await logAction('Alta de Empleado', `Email: ${cleanEmail} - Nombre: ${newEmployee.name} - Rol: ${newEmployee.role}`);
      setEmpFeedback({ text: `Asesor ${cleanEmail} registrado y autorizado con éxito.`, type: 'success' });
      setNewEmployee({
        email: '',
        name: '',
        department: areas[0]?.nombre || MASTERS.departments[0],
        role: 'gestor'
      });
      setTimeout(() => setEmpFeedback({ text: '', type: '' }), 4000);
    } catch (err) {
      setEmpFeedback({ text: 'Error al registrar: ' + err.message, type: 'error' });
    }
  };

  // Alternar estado activo / suspendido
  const handleToggleUserStatus = async (user) => {
    const userEmail = (user.email || user.id || '').toLowerCase().trim();
    if (SUPER_ADMINS.includes(userEmail)) {
      alert("No se puede desactivar la cuenta del Super Administrador.");
      return;
    }
    if (userEmail === (currentUser?.email || '').toLowerCase().trim()) {
      alert("No puedes suspender tu propio acceso.");
      return;
    }
    const newStatus = user.status === 'inactive' ? 'active' : 'inactive';
    const actionText = newStatus === 'active' ? 'Reactivar acceso' : 'Suspender acceso temporalmente';
    if (!confirm(`¿${actionText} a ${userEmail}?`)) return;

    try {
      await updateDoc(doc(db, 'users', userEmail), { status: newStatus });
      await logAction(`Cambio Estado Empleado (${newStatus})`, userEmail);
    } catch (e) {
      alert("Error al actualizar estado: " + e.message);
    }
  };

  // Alternar rol Administrador / Gestor
  const handleToggleUserRole = async (user) => {
    const userEmail = (user.email || user.id || '').toLowerCase().trim();
    if (SUPER_ADMINS.includes(userEmail)) {
      alert("No se puede revocar el rol del Super Administrador.");
      return;
    }
    if (userEmail === (currentUser?.email || '').toLowerCase().trim()) {
      alert("No puedes revocar tus propios privilegios de administrador.");
      return;
    }
    const isCurrentlyAdmin = adminList.includes(userEmail) || user.role === 'admin';
    const newRole = isCurrentlyAdmin ? 'gestor' : 'admin';
    const actionText = isCurrentlyAdmin ? 'Degradar a Gestor / Asesor' : 'Ascender a Administrador del Despacho';
    if (!confirm(`¿${actionText} a ${userEmail}?`)) return;

    try {
      await updateDoc(doc(db, 'users', userEmail), { role: newRole });
      if (newRole === 'admin') {
        await updateDoc(doc(db, 'settings', 'config'), { admins: arrayUnion(userEmail) }).catch(async () => {
          await setDoc(doc(db, 'settings', 'config'), { admins: [userEmail] }, { merge: true });
        });
        await logAction('Añadido Administrador', userEmail);
      } else {
        await updateDoc(doc(db, 'settings', 'config'), { admins: arrayRemove(userEmail) }).catch(console.warn);
        await logAction('Revocado Administrador', userEmail);
      }
    } catch (e) {
      alert("Error al cambiar rol: " + e.message);
    }
  };

  // Eliminar usuario
  const handleDeleteUser = async (user) => {
    const userEmail = (user.email || user.id || '').toLowerCase().trim();
    if (SUPER_ADMINS.includes(userEmail)) {
      alert("No se puede eliminar la cuenta del Super Administrador.");
      return;
    }
    if (userEmail === (currentUser?.email || '').toLowerCase().trim()) {
      alert("No puedes eliminar tu propia cuenta.");
      return;
    }
    if (!confirm(`¿Eliminar completamente a ${userEmail} de la plantilla del despacho? Esta acción revocará todos sus accesos.`)) return;

    try {
      await deleteDoc(doc(db, 'users', userEmail));
      await updateDoc(doc(db, 'settings', 'config'), { admins: arrayRemove(userEmail) }).catch(console.warn);
      await logAction('Eliminado Empleado', userEmail);
    } catch (e) {
      alert("Error al eliminar usuario: " + e.message);
    }
  };

  // Estados y funciones para Edición de Asesores / Empleados (Requisito: cambiar departamento, nombre, rol)
  const [editingUser, setEditingUser] = useState(null);
  const [editUserForm, setEditUserForm] = useState({ name: '', department: '', role: 'gestor' });
  const [editFeedback, setEditFeedback] = useState({ text: '', type: '' });

  const handleOpenEditUser = (user) => {
    setEditingUser(user);
    const userEmail = (user.email || user.id || '').toLowerCase().trim();
    const isUserAdmin = adminList.includes(userEmail) || user.role === 'admin';
    setEditUserForm({
      name: user.name || userEmail.split('@')[0],
      department: user.department || areas[0]?.nombre || 'General',
      role: isUserAdmin ? 'admin' : (user.role || 'gestor')
    });
    setEditFeedback({ text: '', type: '' });
  };

  const handleSaveEditUser = async (e) => {
    e.preventDefault();
    if (!editingUser) return;
    const userEmail = (editingUser.email || editingUser.id || '').toLowerCase().trim();
    const isSuper = SUPER_ADMINS.includes(userEmail);
    const finalRole = isSuper ? 'admin' : editUserForm.role;

    try {
      await updateDoc(doc(db, 'users', userEmail), {
        name: editUserForm.name.trim(),
        department: editUserForm.department || 'General',
        role: finalRole,
        lastUpdated: serverTimestamp()
      }).catch(async () => {
        await setDoc(doc(db, 'users', userEmail), {
          email: userEmail,
          name: editUserForm.name.trim(),
          department: editUserForm.department || 'General',
          role: finalRole,
          status: editingUser.status || 'active'
        }, { merge: true });
      });

      // Sincronizar admin en settings/config si no es Super Admin
      if (!isSuper) {
        if (finalRole === 'admin') {
          await updateDoc(doc(db, 'settings', 'config'), { admins: arrayUnion(userEmail) }).catch(async () => {
            await setDoc(doc(db, 'settings', 'config'), { admins: [userEmail] }, { merge: true });
          });
        } else {
          await updateDoc(doc(db, 'settings', 'config'), { admins: arrayRemove(userEmail) }).catch(console.warn);
        }
      }

      await logAction('Modificación Empleado', `Email: ${userEmail} - Nombre: ${editUserForm.name} - Dpto: ${editUserForm.department} - Rol: ${finalRole}`);
      setEditFeedback({ text: 'Empleado actualizado con éxito.', type: 'success' });
      setTimeout(() => {
        setEditingUser(null);
        setEditFeedback({ text: '', type: '' });
      }, 700);
    } catch (err) {
      setEditFeedback({ text: 'Error al actualizar: ' + err.message, type: 'error' });
    }
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
      
      {/* CABECERA Y SELECTOR DE PESTAÑAS DEL PANEL DE CONTROL */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-premium space-y-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 pb-3 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-slate-900 to-indigo-900 text-white flex items-center justify-center shadow-xs">
              <Database className="w-5 h-5 text-indigo-400" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-slate-900 tracking-tight">
                Panel de Administración y Control
              </h1>
              <p className="text-xs text-slate-500">
                Configuración del despacho, catálogo de estados, plantillas operativas y gestión de permisos.
              </p>
            </div>
          </div>
        </div>

        {/* BARRA DE PESTAÑAS ADMINISTRATIVAS EN UNA SOLA LÍNEA */}
        <div className="flex items-center gap-1.5 bg-slate-100/80 p-1.5 rounded-xl border border-slate-200/80 overflow-x-auto">
          <button
            type="button"
            onClick={() => setAdminTab('clasificacion')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
              adminTab === 'clasificacion'
                ? 'bg-white text-indigo-600 shadow-2xs ring-1 ring-slate-200/50'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
            }`}
          >
            <Palette className="w-3.5 h-3.5 text-indigo-500" />
            <span>Áreas, Trámites y Estados</span>
            <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${
              adminTab === 'clasificacion' ? 'bg-indigo-50 text-indigo-700' : 'bg-slate-200 text-slate-600'
            }`}>
              {estados.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setAdminTab('plantillas')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
              adminTab === 'plantillas'
                ? 'bg-white text-indigo-600 shadow-2xs ring-1 ring-slate-200/50'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
            }`}
          >
            <Layers className="w-3.5 h-3.5 text-amber-500" />
            <span>Plantillas de Trámites GTD</span>
          </button>

          <button
            type="button"
            onClick={() => setAdminTab('facturacion')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
              adminTab === 'facturacion'
                ? 'bg-white text-indigo-600 shadow-2xs ring-1 ring-slate-200/50'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
            }`}
          >
            <Coins className="w-3.5 h-3.5 text-emerald-500" />
            <span>Liquidaciones & Cobros</span>
          </button>

          <button
            type="button"
            onClick={() => setAdminTab('personal')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
              adminTab === 'personal'
                ? 'bg-white text-indigo-600 shadow-2xs ring-1 ring-slate-200/50'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
            }`}
          >
            <Users className="w-3.5 h-3.5 text-indigo-500" />
            <span>Equipo y Asesores</span>
            <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${
              adminTab === 'personal' ? 'bg-indigo-50 text-indigo-700' : 'bg-slate-200 text-slate-600'
            }`}>
              {usersList.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setAdminTab('clientes')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
              adminTab === 'clientes'
                ? 'bg-white text-indigo-600 shadow-2xs ring-1 ring-slate-200/50'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
            }`}
          >
            <Building2 className="w-3.5 h-3.5 text-blue-500" />
            <span>Cartera de Clientes</span>
            <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${
              adminTab === 'clientes' ? 'bg-indigo-50 text-indigo-700' : 'bg-slate-200 text-slate-600'
            }`}>
              {clientesCount}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setAdminTab('mantenimiento')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
              adminTab === 'mantenimiento'
                ? 'bg-white text-indigo-600 shadow-2xs ring-1 ring-slate-200/50'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
            }`}
          >
            <ShieldAlert className="w-3.5 h-3.5 text-rose-500" />
            <span>Auditoría & Limpieza</span>
          </button>
        </div>
      </div>

      {/* PESTAÑA 1: CLASIFICACIÓN DINÁMICA DE EXPEDIENTES (ÁREAS, TRAMOS Y ESTADOS) */}
      {adminTab === 'clasificacion' && (
        <ClassificationManager 
          areas={areas}
          tramos={tramos}
          estados={estados}
          tasks={tasks}
          currentUser={currentUser}
          logAction={logAction}
        />
      )}

      {/* PESTAÑA 2: PLANTILLAS DE TRÁMITES Y TAREAS PREDEFINIDAS GTD */}
      {adminTab === 'plantillas' && (
        <TemplateManager 
          areas={areas}
          tramos={tramos}
          usersList={usersList}
          currentUser={currentUser}
          logAction={logAction}
        />
      )}

      {/* PESTAÑA 2.5: CONFIGURACIÓN DE LIQUIDACIONES Y FACTURACIÓN */}
      {adminTab === 'facturacion' && (
        <BillingSettingsManager 
          billingSettings={billingSettings}
          currentUser={currentUser}
          logAction={logAction}
        />
      )}

      {/* PESTAÑA 3: CARTERA DE CLIENTES Y EMPRESAS */}
      {adminTab === 'clientes' && (
        <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-premium space-y-5">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-4 border-b border-slate-100">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
                <Building2 className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-slate-800">Cartera de Clientes y Empresas</h2>
                <p className="text-xs text-slate-500">
                  Actualmente hay <span className="font-bold text-indigo-600">{clientesCount}</span> clientes activos registrados con validación de NIF/CIF.
                </p>
              </div>
            </div>
            {onNavigateToClientes && (
              <button
                type="button"
                onClick={onNavigateToClientes}
                className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2.5 rounded-xl text-xs font-bold shadow-xs hover:shadow-premium-hover flex items-center gap-2 transition-all shrink-0 cursor-pointer"
              >
                <Building2 className="w-4 h-4" /> <span>Abrir Módulo Completo de Clientes</span>
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-4 bg-slate-50/80 rounded-xl border border-slate-200/80">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">Total en Cartera</span>
              <span className="text-2xl font-black text-slate-800">{clientesCount}</span>
              <p className="text-[11px] text-slate-400 mt-1">Sociedades, autónomos y particulares</p>
            </div>
            <div className="p-4 bg-slate-50/80 rounded-xl border border-slate-200/80">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">Validación Obligatoria</span>
              <span className="text-sm font-bold text-emerald-600 flex items-center gap-1 mt-1">
                <CheckCircle2 className="w-4 h-4" /> NIF / CIF Verificado
              </span>
              <p className="text-[11px] text-slate-400 mt-1">Garantiza trazabilidad legal y fiscal en expedientes</p>
            </div>
            <div className="p-4 bg-slate-50/80 rounded-xl border border-slate-200/80">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">Herramientas</span>
              <span className="text-sm font-bold text-indigo-600 flex items-center gap-1 mt-1">
                <FileSpreadsheet className="w-4 h-4" /> Carga Masiva CSV
              </span>
              <p className="text-[11px] text-slate-400 mt-1">Importa carteras completas de programas contables</p>
            </div>
          </div>
        </div>
      )}

      {/* PESTAÑA 4: GESTIÓN DE PERSONAL Y PRIVILEGIOS DEL DESPACHO */}
      {adminTab === 'personal' && (
        <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-premium space-y-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-slate-100 pb-4">
            <div>
              <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                <Users className="text-indigo-600 w-5 h-5"/>
                <span>Gestión del Equipo de Asesores y Empleados</span>
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Controla las altas, permisos y accesos autorizados. Solo el personal registrado aquí podrá acceder a GestFlow.
              </p>
            </div>
            <span className="text-xs font-semibold px-2.5 py-1 bg-indigo-50 text-indigo-700 rounded-full border border-indigo-100">
              {usersList.length} asesores en plantilla
            </span>
          </div>

          {/* Formulario de Alta y Autorización */}
          <form onSubmit={handleSaveEmployee} className="bg-slate-50/80 p-4 rounded-xl border border-slate-200/80 space-y-3">
            <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
              <UserPlus className="w-4 h-4 text-indigo-600" />
              <span>Dar de Alta y Autorizar Nuevo Asesor / Empleado</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Correo Electrónico *</label>
                <input
                  type="email"
                  required
                  value={newEmployee.email}
                  onChange={e => setNewEmployee({ ...newEmployee, email: e.target.value })}
                  placeholder="gestor@asesoria.com"
                  className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Nombre Completo</label>
                <input
                  type="text"
                  value={newEmployee.name}
                  onChange={e => setNewEmployee({ ...newEmployee, name: e.target.value })}
                  placeholder="Ej. Carmen Gómez"
                  className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Área / Especialidad</label>
                <select
                  value={newEmployee.department}
                  onChange={e => setNewEmployee({ ...newEmployee, department: e.target.value })}
                  className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  {areas.length > 0 
                    ? areas.map(a => <option key={a.id || a.nombre} value={a.nombre || a.name}>{a.nombre || a.name}</option>)
                    : MASTERS.departments.map(d => <option key={d} value={d}>{d}</option>)
                  }
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Rol y Permisos</label>
                <select
                  value={newEmployee.role}
                  onChange={e => setNewEmployee({ ...newEmployee, role: e.target.value })}
                  className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
                >
                  <option value="gestor">Gestor / Asesor (Solo sus expedientes)</option>
                  <option value="admin">Administrador (Control global)</option>
                </select>
              </div>
            </div>

            <div className="flex justify-between items-center pt-2">
              <div>
                {empFeedback.text && (
                  <span className={`text-xs font-semibold ${empFeedback.type === 'error' ? 'text-rose-600' : 'text-emerald-600'}`}>
                    {empFeedback.text}
                  </span>
                )}
              </div>
              <button
                type="submit"
                className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-xs font-bold transition-all shadow-sm flex items-center gap-1.5 cursor-pointer"
              >
                <UserPlus className="w-3.5 h-3.5" />
                <span>Registrar y Autorizar Empleado</span>
              </button>
            </div>
          </form>

          {/* Tabla de Asesores Registrados */}
          <div className="overflow-x-auto border border-slate-200 rounded-xl">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase">
                <tr>
                  <th className="p-3">Asesor / Empleado</th>
                  <th className="p-3">Área / Especialidad</th>
                  <th className="p-3">Rol</th>
                  <th className="p-3">Estado</th>
                  <th className="p-3 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {usersList.map((user) => {
                  const uEmail = (user.email || user.id || '').toLowerCase().trim();
                  const isSuper = SUPER_ADMINS.includes(uEmail);
                  const isUserAdmin = isSuper || adminList.includes(uEmail) || user.role === 'admin';
                  const isInactive = user.status === 'inactive';
                  const isSelf = uEmail === (currentUser?.email || '').toLowerCase().trim();

                  return (
                    <tr key={uEmail} className={`hover:bg-slate-50/80 transition-colors ${isInactive ? 'opacity-60 bg-slate-50/40' : ''}`}>
                      <td className="p-3">
                        <div className="flex items-center gap-2.5">
                          <div className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-white text-[11px] uppercase ${isSuper ? 'bg-gradient-to-tr from-amber-500 to-amber-600' : isUserAdmin ? 'bg-indigo-600' : 'bg-slate-700'}`}>
                            {user.name ? user.name.charAt(0) : uEmail.charAt(0)}
                          </div>
                          <div>
                            <p className="font-semibold text-slate-800 flex items-center gap-1.5">
                              <span>{user.name || uEmail.split('@')[0]}</span>
                              {isSuper && <Crown className="w-3.5 h-3.5 text-amber-500" title="Super Administrador" />}
                            </p>
                            <p className="text-[10px] text-slate-400 font-mono">{uEmail}</p>
                          </div>
                        </div>
                      </td>
                      <td className="p-3 text-slate-600 font-medium">
                        {user.department || 'General'}
                      </td>
                      <td className="p-3">
                        {isSuper ? (
                          <span className="px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200 font-bold text-[10px] flex items-center gap-1 w-fit">
                            <Crown className="w-3 h-3" /> Super Admin
                          </span>
                        ) : isUserAdmin ? (
                          <span className="px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200 font-bold text-[10px] flex items-center gap-1 w-fit">
                            <Shield className="w-3 h-3" /> Administrador
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200 font-medium text-[10px] flex items-center gap-1 w-fit">
                            <User className="w-3 h-3 text-slate-500" /> Gestor / Asesor
                          </span>
                        )}
                      </td>
                      <td className="p-3">
                        {isInactive ? (
                          <span className="px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200 font-semibold text-[10px]">
                            Acceso Revocado
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 font-semibold text-[10px]">
                            Activo
                          </span>
                        )}
                      </td>
                      <td className="p-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleOpenEditUser(user)}
                            className="px-2 py-1 rounded bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-[11px] font-semibold transition-colors cursor-pointer flex items-center gap-1 border border-indigo-200"
                            title="Editar empleado (nombre, departamento, rol)"
                          >
                            <Pencil className="w-3 h-3" />
                            <span>Editar</span>
                          </button>

                          {!isSuper && !isSelf && (
                            <>
                              <button
                                type="button"
                                onClick={() => handleToggleUserStatus(user)}
                                className={`px-2 py-1 rounded text-[10px] font-semibold transition-colors cursor-pointer ${isInactive ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200' : 'bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-200'}`}
                                title={isInactive ? "Permitir Acceso" : "Suspender Acceso"}
                              >
                                {isInactive ? "Reactivar" : "Suspender"}
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteUser(user)}
                                className="p-1 rounded text-rose-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                                title="Eliminar del Despacho"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {usersList.length === 0 && (
                  <tr>
                    <td colSpan="5" className="p-4 text-center text-slate-400">
                      Sin asesores registrados aún.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* MODAL EDICIÓN DE ASESOR / EMPLEADO (Departamento, Nombre, Rol) */}
          {editingUser && (
            <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
              <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden">
                <div className="flex justify-between items-center p-4 border-b border-slate-100 bg-slate-50">
                  <div className="flex items-center gap-2">
                    <Pencil className="w-4 h-4 text-indigo-600" />
                    <h3 className="font-bold text-sm text-slate-800">Modificar Ficha de Empleado</h3>
                  </div>
                  <button
                    type="button"
                    onClick={() => setEditingUser(null)}
                    className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200 transition-colors cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <form onSubmit={handleSaveEditUser} className="p-5 space-y-3.5">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Correo Electrónico (Identificador)</label>
                    <input
                      type="email"
                      disabled
                      value={editingUser.email || editingUser.id || ''}
                      className="w-full bg-slate-100 border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-500 cursor-not-allowed font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">Nombre Completo *</label>
                    <input
                      type="text"
                      required
                      value={editUserForm.name}
                      onChange={e => setEditUserForm({ ...editUserForm, name: e.target.value })}
                      className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs font-semibold text-slate-800 outline-none focus:ring-2 focus:ring-indigo-500"
                      placeholder="Nombre del asesor"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">Departamento / Área Asignada *</label>
                    <select
                      value={editUserForm.department}
                      onChange={e => setEditUserForm({ ...editUserForm, department: e.target.value })}
                      className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs font-medium text-slate-800 outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
                    >
                      {areas.length > 0 
                        ? areas.map(a => <option key={a.id || a.nombre} value={a.nombre || a.name}>{a.nombre || a.name}</option>)
                        : MASTERS.departments.map(d => <option key={d} value={d}>{d}</option>)
                      }
                    </select>
                  </div>

                  {!SUPER_ADMINS.includes((editingUser.email || editingUser.id || '').toLowerCase().trim()) && (
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">Rol y Permisos</label>
                      <select
                        value={editUserForm.role}
                        onChange={e => setEditUserForm({ ...editUserForm, role: e.target.value })}
                        className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs font-semibold text-slate-800 outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
                      >
                        <option value="gestor">Gestor / Asesor (Solo sus expedientes)</option>
                        <option value="admin">Administrador (Acceso y control global)</option>
                      </select>
                    </div>
                  )}

                  {editFeedback.text && (
                    <p className={`text-xs font-semibold text-center ${editFeedback.type === 'error' ? 'text-rose-600' : 'text-emerald-600'}`}>
                      {editFeedback.text}
                    </p>
                  )}

                  <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={() => setEditingUser(null)}
                      className="px-3.5 py-2 rounded-lg border border-slate-300 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition-colors cursor-pointer"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
                    >
                      <Save className="w-3.5 h-3.5" />
                      <span>Guardar Cambios</span>
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      )}

      {/* PESTAÑA 5: AUDITORÍA Y LIMPIEZA DE BASE DE DATOS */}
      {adminTab === 'mantenimiento' && (
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-premium">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                <FileText className="text-indigo-600"/> Registro de Auditoría de Expedientes
              </h2>
              <button 
                onClick={exportAuditLogs} 
                className="text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-1.5 rounded-lg border border-slate-200 flex items-center gap-1 transition-colors cursor-pointer font-semibold"
              >
                <Download className="w-3.5 h-3.5"/> Descargar Auditoría
              </button>
            </div>
            <div className="overflow-x-auto max-h-72 border border-slate-100 rounded-xl">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase sticky top-0">
                  <tr>
                    <th className="p-3">Fecha y Hora</th>
                    <th className="p-3">Asesor / Usuario</th>
                    <th className="p-3">Acción</th>
                    <th className="p-3">Detalles</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {auditLogs.map(log => (
                    <tr key={log.id} className="hover:bg-slate-50">
                      <td className="p-3 text-slate-400 whitespace-nowrap">{log.timestamp ? new Date(log.timestamp.seconds * 1000).toLocaleString('es-ES') : '-'}</td>
                      <td className="p-3 font-medium text-slate-700">{log.user}</td>
                      <td className="p-3">
                        <span className={`px-2 py-0.5 rounded-full border ${log.action && log.action.includes('Eliminado') ? 'bg-rose-50 text-rose-700 border-rose-100' : 'bg-slate-100 text-slate-600 border-slate-200'}`}>
                          {log.action || 'Desconocida'}
                        </span>
                      </td>
                      <td className="p-3 text-slate-500 truncate max-w-xs" title={log.details}>{log.details}</td>
                    </tr>
                  ))}
                  {auditLogs.length === 0 && (
                    <tr>
                      <td colSpan="4" className="p-4 text-center text-slate-400">Sin actividad registrada todavía.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-premium flex flex-col gap-4">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
              <div>
                <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                  <Database className="text-indigo-600"/> Gestión y Depuración de Expedientes
                </h2>
                <p className="text-xs text-slate-500">Selecciona expedientes para su eliminación permanente o archivado forzado.</p>
              </div>
              <button 
                onClick={deleteSelected} 
                disabled={selectedTasks.length === 0 || isProcessing} 
                className="bg-rose-50 text-rose-600 hover:bg-rose-600 hover:text-white border border-rose-200 px-4 py-2 rounded-xl font-bold text-xs transition-colors flex items-center gap-2 disabled:opacity-50 cursor-pointer"
              >
                <Trash2 className="w-4 h-4"/> Eliminar Seleccionados ({selectedTasks.length})
              </button>
            </div>
            <div className="relative">
              <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400"/>
              <input 
                type="text" 
                placeholder="Buscar expedientes o clientes para eliminar..." 
                value={adminSearchTerm} 
                onChange={e => setAdminSearchTerm(e.target.value)} 
                className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-indigo-500 outline-none"
              />
            </div>

            <div className="border border-slate-200 rounded-xl overflow-hidden">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase text-[11px]">
                  <tr>
                    <th className="p-3 w-10 text-center">
                      <input 
                        type="checkbox" 
                        onChange={(e) => { 
                          if (e.target.checked) setSelectedTasks(filteredAdminTasks.map(t => t.id)); 
                          else setSelectedTasks([]); 
                        }} 
                        checked={filteredAdminTasks.length > 0 && selectedTasks.length === filteredAdminTasks.length} 
                      />
                    </th>
                    <th className="p-3">Expediente</th>
                    <th className="p-3">Cliente</th>
                    <th className="p-3">Tipo</th>
                    <th className="p-3">Área</th>
                    <th className="p-3">Estado</th>
                    <th className="p-3">Creado por</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredAdminTasks.map(task => (
                    <tr key={task.id} className={`hover:bg-slate-50 transition-colors ${selectedTasks.includes(task.id) ? 'bg-indigo-50/50' : ''}`}>
                      <td className="p-3 text-center">
                        <input 
                          type="checkbox" 
                          checked={selectedTasks.includes(task.id)} 
                          onChange={() => toggleSelect(task.id)} 
                        />
                      </td>
                      <td className="p-3 font-semibold text-slate-800">{task.title}</td>
                      <td className="p-3 text-indigo-600 font-medium">{task.client || '-'}</td>
                      <td className="p-3 text-slate-500">{normalizeType(task.type)}</td>
                      <td className="p-3 text-slate-500">{normalizeDepartment(task.department)}</td>
                      <td className="p-3"><Badge text={task.status} /></td>
                      <td className="p-3 text-slate-400 font-mono text-[11px]">{task.createdBy}</td>
                    </tr>
                  ))}
                  {filteredAdminTasks.length === 0 && (
                    <tr>
                      <td colSpan="7" className="p-4 text-center text-slate-400">No se encontraron expedientes que coincidan.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// --- VISTA ANALYTICS: CUADRO DE MANDO DEL DESPACHO ---
const AnalyticsView = ({ tasks }) => {
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  
  const annualTasks = useMemo(() => tasks.filter(t => {
    return !t.dueDate || t.dueDate.startsWith(selectedYear.toString());
  }), [tasks, selectedYear]);

  const stats = useMemo(() => {
    const totalCount = annualTasks.length;
    
    const abiertoCount = annualTasks.filter(t => getEffectiveStatus(t) === 'Abierto').length;
    const enRiesgoCount = annualTasks.filter(t => getEffectiveStatus(t) === 'En Riesgo').length;
    const conRetrasoCount = annualTasks.filter(t => getEffectiveStatus(t) === 'Con Retraso').length;
    const cerradoCount = annualTasks.filter(t => getEffectiveStatus(t) === 'Cerrado').length;

    const byDept = MASTERS.departments.map(dept => ({
      name: dept, 
      value: annualTasks.filter(task => normalizeDepartment(task.department) === dept).length
    })).sort((a, b) => b.value - a.value);

    const byStatus = [
        { name: 'Abierto (En Plazo)', value: abiertoCount, color: 'bg-emerald-500', hexColor: '#10b981' },
        { name: 'En Riesgo', value: enRiesgoCount, color: 'bg-amber-500', hexColor: '#f59e0b' },
        { name: 'Con Retraso', value: conRetrasoCount, color: 'bg-rose-500', hexColor: '#f43f5e' },
        { name: 'Cerrado', value: cerradoCount, color: 'bg-blue-500', hexColor: '#3b82f6' }
    ].filter(i => i.value > 0);

    const uniqueUsers = [...new Set(annualTasks.flatMap(t => t.assignees || (t.assigneeEmail ? [t.assigneeEmail] : [])))];
    const byUser = uniqueUsers.map(email => {
      const userTasks = annualTasks.filter(t => (t.assignees && t.assignees.includes(email)) || t.assigneeEmail === email);
      const statusCounts = { 
          Abierto: userTasks.filter(t => getEffectiveStatus(t) === 'Abierto').length,
          EnRiesgo: userTasks.filter(t => getEffectiveStatus(t) === 'En Riesgo').length,
          ConRetraso: userTasks.filter(t => getEffectiveStatus(t) === 'Con Retraso').length,
          Cerrado: userTasks.filter(t => getEffectiveStatus(t) === 'Cerrado').length
      };
      return { email, total: userTasks.length, statusCounts };
    }).sort((a, b) => b.total - a.total);

    const delayByType = DELAY_METRICS_TYPES.map(type => {
        const typeTasks = annualTasks.filter(t => {
            const s = getEffectiveStatus(t);
            return normalizeType(t.type) === type && s !== 'Cerrado';
        });
        const typeDelayed = typeTasks.filter(t => getDelayDays(t) > 0 || getEffectiveStatus(t) === 'Con Retraso');
        const typeTotalDelay = typeDelayed.reduce((acc, t) => acc + getDelayDays(t), 0);
        return {
            type,
            reliability: typeTasks.length ? Math.round(((typeTasks.length - typeDelayed.length) / typeTasks.length) * 100) : 100,
            avgDelay: typeDelayed.length ? Math.round(typeTotalDelay / typeDelayed.length) : 0,
            count: typeTasks.length,
            delayedCount: typeDelayed.length
        };
    });

    return { totalCount, abiertoCount, enRiesgoCount, conRetrasoCount, cerradoCount, byDept, byStatus, byUser, delayByType };
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

      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          <div className="bg-slate-800 text-white p-4 rounded-xl shadow-sm flex flex-col justify-between min-h-[100px]">
              <div className="text-slate-400 text-[10px] uppercase font-bold tracking-wider">Carga Total</div>
              <div className="text-3xl font-bold">{stats.totalCount}</div>
              <div className="text-[10px] text-slate-300 flex items-center gap-1 mt-1"><Activity className="w-3 h-3"/> Expedientes del Año</div>
          </div>
          <div className="bg-white p-4 rounded-xl border-l-4 border-l-emerald-500 border border-slate-200 shadow-sm min-h-[100px]">
              <div className="text-slate-500 text-[10px] uppercase font-bold">Abiertos (En Plazo)</div>
              <div className="text-3xl font-bold text-emerald-600">{stats.abiertoCount}</div>
              <div className="text-[10px] text-slate-400 mt-1">Previstos en fecha</div>
          </div>
          <div className="bg-white p-4 rounded-xl border-l-4 border-l-amber-500 border border-slate-200 shadow-sm min-h-[100px]">
              <div className="text-slate-500 text-[10px] uppercase font-bold">En Riesgo</div>
              <div className="text-3xl font-bold text-amber-600">{stats.enRiesgoCount}</div>
              <div className="text-[10px] text-slate-400 mt-1">Posible demora</div>
          </div>
          <div className="bg-white p-4 rounded-xl border-l-4 border-l-rose-500 border border-slate-200 shadow-sm min-h-[100px]">
              <div className="text-slate-500 text-[10px] uppercase font-bold">Con Retraso</div>
              <div className="text-3xl font-bold text-rose-600">{stats.conRetrasoCount}</div>
              <div className="text-[10px] text-slate-400 mt-1">Plazo superado</div>
          </div>
          <div className="bg-white p-4 rounded-xl border-l-4 border-l-blue-500 border border-slate-200 shadow-sm min-h-[100px]">
              <div className="text-slate-500 text-[10px] uppercase font-bold">Cerrados</div>
              <div className="text-3xl font-bold text-blue-600">{stats.cerradoCount}</div>
              <div className="text-[10px] text-slate-400 mt-1">{Math.round((stats.cerradoCount/(stats.totalCount || 1))*100)}% Completados</div>
          </div>
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

      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <h3 className="font-bold text-slate-700 mb-4 flex items-center gap-2"><Users className="w-4 h-4 text-indigo-600"/> Carga de Trabajo por Asesor / Gestor</h3>
          <div className="space-y-4">
              {stats.byUser.map(u => (
                  <div key={u.email} className="flex items-center gap-3 text-sm">
                      <div className="w-28 sm:w-48 font-medium text-slate-600 truncate text-right text-xs" title={u.email}>{u.email.split('@')[0]}</div>
                      <div className="flex-1 h-4 bg-slate-100 rounded-full overflow-hidden flex">
                          <div className="bg-emerald-500 h-full transition-all" title="Abierto" style={{width: `${(u.statusCounts.Abierto/u.total)*100}%`}}></div>
                          <div className="bg-amber-400 h-full transition-all" title="En Riesgo" style={{width: `${(u.statusCounts.EnRiesgo/u.total)*100}%`}}></div>
                          <div className="bg-rose-500 h-full transition-all" title="Con Retraso" style={{width: `${(u.statusCounts.ConRetraso/u.total)*100}%`}}></div>
                          <div className="bg-blue-500 h-full transition-all" title="Cerrado" style={{width: `${(u.statusCounts.Cerrado/u.total)*100}%`}}></div>
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
const ListView = ({ tasks, onEdit, lang = 'ca' }) => {
  const [showEmpty, setShowEmpty] = useState(false);
  const dateLocale = lang === 'ca' ? 'ca-ES' : 'es-ES';

  useEffect(() => {
    const timer = setTimeout(() => setShowEmpty(true), 1200);
    return () => clearTimeout(timer);
  }, []);

  const formatDateLocal = (isoString) => isoString ? new Date(isoString).toLocaleDateString(dateLocale, { dateStyle: 'medium' }) : '-';
  const formatCreationDate = (timestamp) => timestamp?.seconds ? new Date(timestamp.seconds * 1000).toLocaleDateString(dateLocale) : '';
  
  if (tasks.length === 0) {
    if (!showEmpty) {
      return (
        <div className="text-center py-20">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-indigo-50 text-indigo-600 text-xs font-semibold animate-pulse">
            <RefreshCw className="w-3.5 h-3.5 animate-spin" /> {lang === 'ca' ? 'Carregant expedients del despatx...' : 'Cargando expedientes del despacho...'}
          </div>
        </div>
      );
    }
    return (
      <div className="text-center py-20 bg-white/70 backdrop-blur-xs rounded-2xl border border-dashed border-slate-300 p-8">
        <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto mb-3 text-slate-400">
          <Briefcase className="w-6 h-6" />
        </div>
        <h4 className="text-sm font-bold text-slate-700">{lang === 'ca' ? 'Sense expedients coincidents' : 'Sin expedientes coincidentes'}</h4>
        <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
          {lang === 'ca' 
            ? 'No s\'han trobat expedients amb els filtres aplicats en aquest moment.' 
            : 'No se han encontrado expedientes con los filtros aplicados en este momento.'}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2.5 animate-in fade-in duration-300">
      {tasks.map(task => {
        const delay = getDelayDays(task);
        const effectiveStatus = getEffectiveStatus(task);
        const normType = normalizeType(task.type);
        const normDept = normalizeDepartment(task.department);

        return (
        <div 
          key={task.id} 
          onClick={() => onEdit(task)} 
          className="group hover-card-elevate bg-white/95 backdrop-blur-xs rounded-2xl p-4 sm:p-4.5 border border-slate-200/80 shadow-xs hover:border-indigo-200/80 transition-all cursor-pointer relative overflow-hidden"
        >
          <div className={`absolute left-0 top-0 bottom-0 w-1.5 transition-colors ${
            effectiveStatus === 'Cerrado' ? 'bg-blue-500' : 
            effectiveStatus === 'Abierto' ? 'bg-emerald-500' : 
            effectiveStatus === 'En Riesgo' ? 'bg-amber-500' : 
            effectiveStatus === 'Con Retraso' ? 'bg-rose-500' : 'bg-slate-300'
          }`}></div>

          <div className="flex flex-col md:flex-row gap-3.5 items-start md:items-center justify-between pl-3">
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2 mb-1.5">
                <h3 className="font-bold text-slate-900 text-sm sm:text-base group-hover:text-indigo-600 transition-colors tracking-tight truncate">{task.title}</h3>
                <Badge text={normType} size="xs" />
              </div>
              
              {task.client && (
                <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg bg-indigo-50/70 text-indigo-700 font-semibold text-xs border border-indigo-100/70 mb-2">
                  <Building2 className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                  <span className="truncate max-w-md">{task.client}</span>
                </div>
              )}

              <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 mt-0.5">
                <span className="flex items-center gap-1.5 text-slate-600 font-medium">
                  <Briefcase className="w-3.5 h-3.5 text-slate-400"/> {normDept}
                </span>
                
                <div className="flex items-center gap-1.5 bg-slate-50 px-2 py-0.5 rounded-full border border-slate-200/70 text-slate-600">
                  <Users className="w-3.5 h-3.5 text-slate-400"/>
                  {task.assignees && task.assignees.length > 0 ? (
                    <span className="truncate max-w-[200px]">{task.assignees.join(', ')}</span>
                  ) : (
                    <span>{task.assigneeEmail || (lang === 'ca' ? 'Sense Assessor Assignat' : 'Sin Asesor Asignado')}</span>
                  )}
                </div>

                {task.dueDate && (
                  <span className="flex items-center gap-1.5 font-medium text-slate-600">
                    <Clock className="w-3.5 h-3.5 text-slate-400"/> {lang === 'ca' ? 'Venciment:' : 'Vencimiento:'} {formatDateLocal(task.dueDate)} 
                    {delay > 0 && <span className="text-rose-600 font-bold ml-1 bg-rose-50 px-1.5 py-0.5 rounded border border-rose-100">({lang === 'ca' ? `+${delay}d retard` : `+${delay}d demora`})</span>}
                  </span>
                )}
                {task.attachments?.length > 0 && (
                  <span className="flex items-center gap-1 text-slate-500 font-medium">
                    <Paperclip className="w-3.5 h-3.5 text-slate-400"/> {task.attachments.length} {lang === 'ca' ? 'fitxers' : 'archivos'}
                  </span>
                )}
                {task.actions?.length > 0 && (
                  <span className="flex items-center gap-1 text-emerald-600 font-semibold bg-emerald-50/50 px-2 py-0.5 rounded-full border border-emerald-100/60">
                    <Target className="w-3.5 h-3.5"/> {task.actions.filter(a => a.isCompleted).length}/{task.actions.length} {lang === 'ca' ? 'passos' : 'pasos'}
                  </span>
                )}
              </div>
            </div>
            
            <div className="flex flex-col sm:items-end gap-1.5 shrink-0 self-end sm:self-center">
              <Badge task={task} text={effectiveStatus} />
              <span className="text-[10px] text-slate-400 font-mono flex items-center gap-1">
                <CalendarDays className="w-3 h-3 text-slate-400"/> Alta: {formatCreationDate(task.createdAt)}
              </span>
            </div>
          </div>
        </div>
      )})}
    </div>
  );
};

const ExpedienteModal = ({ 
  tasks, 
  show, 
  onClose, 
  task, 
  formData, 
  setFormData, 
  onSave, 
  usersList, 
  currentUser, 
  onAddUpdate, 
  newUpdateText, 
  setNewUpdateText, 
  setEditingTask, 
  clientes = [],
  areas = [],
  tramos = [],
  estados = [],
  plantillas = [],
  gtdAssignees = [],
  saveGtdAssignee,
  billingSettings = {},
  logAction,
  lang = 'ca'
}) => {
  const t = translations[lang] || translations.ca;
  const effectiveFormStatus = useMemo(() => {
    return normalizeStatus(formData.status, formData.dueDate);
  }, [formData.status, formData.dueDate]);

  const dynamicStatusList = useMemo(() => {
    return ['Abierto', 'En Riesgo', 'Con Retraso', 'Cerrado'];
  }, []);

  const suggestedAssignees = useMemo(() => {
    const result = [];
    const lowerSet = new Set();
    const myEmail = currentUser?.email?.toLowerCase().trim() || '';

    const addSafe = (val) => {
      if (!val || typeof val !== 'string' || val.trim().toLowerCase() === 'yo') return;
      const lower = val.toLowerCase().trim();
      if (lower === myEmail || lowerSet.has(lower)) return;
      lowerSet.add(lower);
      result.push(val.trim());
    };

    // 1. Usuarios del equipo (nombres y correos)
    if (usersList) {
      usersList.forEach(u => {
        if (u.name) addSafe(u.name);
        if (u.email) addSafe(u.email);
      });
    }

    // 2. Contactos externos grabados en Firestore (ej: "Paco Notaría")
    if (gtdAssignees) {
      gtdAssignees.forEach(a => addSafe(a.name));
    }

    // 3. Contactos históricos utilizados en tareas cargadas
    if (tasks) {
      tasks.forEach(t => t?.actions?.forEach(a => addSafe(a?.assignee)));
    }

    return result.sort((a, b) => a.toLowerCase().localeCompare(b.toLowerCase()));
  }, [tasks, usersList, gtdAssignees, currentUser]);

  // Validación estricta: Comprobar si el cliente seleccionado existe en la colección de clientes
  const isValidClientSelected = useMemo(() => {
    if (!formData.client && !formData.clientNif) return false;
    if (!clientes || clientes.length === 0) return false;
    return clientes.some(c => {
      const cNif = (c.nif || '').toUpperCase().trim();
      const cRazon = (c.razonSocial || '').toLowerCase().trim();
      const formClient = (formData.client || '').toLowerCase().trim();
      const formNif = (formData.clientNif || '').toUpperCase().trim();

      if (formNif && formNif === cNif) return true;
      if (cNif && formClient.includes(cNif.toLowerCase())) return true;
      if (cRazon && formClient === cRazon) return true;
      if (`${cRazon} (${cNif.toLowerCase()})` === formClient) return true;
      return false;
    });
  }, [clientes, formData.client, formData.clientNif]);

  const handleSubmitForm = (e) => {
    e.preventDefault();
    if (!isValidClientSelected) {
      alert("⚠️ Bloqueo de seguridad: No se puede crear ni actualizar el expediente sin asociarlo a un cliente existente en la base de datos.");
      return;
    }
    onSave(e);
  };

  const [isUploading, setIsUploading] = useState(false);
  const [isDraggingFile, setIsDraggingFile] = useState(false);
  const fileInputRef = useRef(null);
  const [editingUpdateIndex, setEditingUpdateIndex] = useState(null);
  const [editedUpdateText, setEditedUpdateText] = useState('');
  const [rightTab, setRightTab] = useState('activity');
  const [newActionText, setNewActionText] = useState('');
  const [newActionAssignee, setNewActionAssignee] = useState(currentUser?.email || '');
  const [showSuggestions, setShowSuggestions] = useState(false);

  // Estados para modal de edición de pasos GTD (Requerimiento 1 & 2)
  const [editingActionItem, setEditingActionItem] = useState(null);
  const [modalActionText, setModalActionText] = useState('');
  const [modalActionAssignee, setModalActionAssignee] = useState('');
  const [modalShowSuggestions, setModalShowSuggestions] = useState(false);

  const handleOpenEditActionModal = (action) => {
    setEditingActionItem(action);
    setModalActionText(action.text || '');
    setModalActionAssignee(action.assignee || currentUser?.email || '');
    setModalShowSuggestions(false);
  };

  const handleSaveActionModal = () => {
    if (!modalActionText.trim() || !editingActionItem) return;
    let finalAssignee = modalActionAssignee.trim();
    if (!finalAssignee || finalAssignee.toLowerCase() === 'yo') {
      finalAssignee = currentUser.email;
    } else {
      if (saveGtdAssignee) {
        saveGtdAssignee(finalAssignee);
      }
    }

    setFormData(prev => ({
      ...prev,
      actions: (prev.actions || []).map(a => a.id === editingActionItem.id ? {
        ...a,
        text: modalActionText.trim(),
        assignee: finalAssignee
      } : a)
    }));

    setEditingActionItem(null);
  };

  const handleApplyTemplate = (templateId) => {
    const template = (plantillas || []).find(p => p.id === templateId);
    if (!template) return;

    if (formData.title && !window.confirm(`¿Aplicar la plantilla "${template.titulo}"? Esto precargará título, área, trámite, pasos GTD y honorarios.`)) {
      return;
    }

    let calculatedDueDate = formData.dueDate;
    if (template.diasVencimiento) {
      const targetDate = new Date();
      targetDate.setDate(targetDate.getDate() + Number(template.diasVencimiento));
      calculatedDueDate = targetDate.toISOString().split('T')[0];
    }

    const clonedActions = (template.pasos || []).map((step, idx) => ({
      id: Date.now() + idx,
      text: step.text,
      assignee: step.defaultAssignee || currentUser?.email || '',
      isCompleted: false,
      createdAt: new Date().toISOString()
    }));

    setFormData(prev => ({
      ...prev,
      title: template.titulo,
      department: template.area || prev.department,
      area: template.area || prev.area,
      type: template.tramo || prev.type,
      tramo: template.tramo || prev.tramo,
      description: template.descripcion ? `${template.descripcion}\n\n${prev.description || ''}`.trim() : prev.description,
      dueDate: calculatedDueDate,
      billingType: template.billingType || (template.esFacturable === false ? 'included' : 'billable'),
      esFacturable: template.billingType === 'billable',
      feeAmount: template.billingType === 'billable' ? (Number(template.precioHonorarios) || 0) : 0,
      precioHonorarios: template.billingType === 'billable' ? (Number(template.precioHonorarios) || 0) : 0,
      actions: clonedActions.length > 0 ? clonedActions : prev.actions
    }));

    if (clonedActions.length > 0) {
      setRightTab('gtd');
    }
  };

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
          status: 'Abierto', 
          dueDate: new Date().toISOString().split('T')[0],
          originalDueDate: new Date().toISOString().split('T')[0],
          description: formData.description,
          assignees: formData.assignees,
          department: formData.department,
          type: formData.type,
          actions: [] 
      });
  };

  const processFileUpload = async (file) => {
    if (!file) return;
    setIsUploading(true);
    try {
      const parentId = task?.id || ('nuevo_' + Date.now());
      const cleanFileName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
      const storageRef = ref(storage, `expedientes/${parentId}/${Date.now()}_${cleanFileName}`);
      await uploadBytes(storageRef, file);
      const downloadURL = await getDownloadURL(storageRef);
      const newAttachment = { 
        name: file.name, 
        url: downloadURL, 
        path: storageRef.fullPath, 
        type: 'file', 
        size: file.size,
        uploadedAt: new Date().toISOString(), 
        uploadedBy: currentUser?.email || 'gestor' 
      };

      const currentList = task?.attachments || formData.attachments || [];
      const updatedAttachments = [...currentList, newAttachment];
      
      if (task) {
        const docRef = doc(db, 'expedientes', task.id);
        await updateDoc(docRef, { attachments: updatedAttachments, updatedBy: currentUser.email, lastUpdated: serverTimestamp() }).catch(async () => {
          await updateDoc(doc(db, 'tasks', task.id), { attachments: updatedAttachments, updatedBy: currentUser.email, lastUpdated: serverTimestamp() });
        });
        setEditingTask(prev => ({ ...prev, attachments: updatedAttachments }));
      }
      setFormData(prev => ({ ...prev, attachments: updatedAttachments }));
      if (logAction) {
        logAction('Adjunto Subido', `Archivo: ${file.name} en ${task?.title || formData.title}`);
      }
    } catch (error) { 
      console.error(error); 
      alert("Error al subir el archivo: " + (error.message || error)); 
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleFileUpload = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      Array.from(e.target.files).forEach(f => processFileUpload(f));
    }
  };

  const handleAddLinkAttachment = async () => {
    const url = prompt("Enlace de interés (Sede Electrónica AEAT, Carpeta Cloud, DGT, Seguridad Social...):");
    if (!url) return;
    const name = prompt("Nombre o descripción del enlace:", "Sede Electrónica / Documento Web");
    if (!name) return;
    let cleanUrl = url.trim();
    if (!cleanUrl.startsWith('http://') && !cleanUrl.startsWith('https://')) {
      cleanUrl = 'https://' + cleanUrl;
    }
    const newAttachment = { name: name, url: cleanUrl, type: 'link', uploadedAt: new Date().toISOString(), uploadedBy: currentUser.email };
    const currentList = task?.attachments || formData.attachments || [];
    const updatedAttachments = [...currentList, newAttachment];
    
    if (task) {
      await updateDoc(doc(db, 'expedientes', task.id), { attachments: updatedAttachments, updatedBy: currentUser.email, lastUpdated: serverTimestamp() }).catch(async () => {
        await updateDoc(doc(db, 'tasks', task.id), { attachments: updatedAttachments, updatedBy: currentUser.email, lastUpdated: serverTimestamp() });
      });
      setEditingTask(prev => ({ ...prev, attachments: updatedAttachments }));
    }
    setFormData(prev => ({ ...prev, attachments: updatedAttachments }));
  };

  const handleDeleteAttachment = async (attachment) => {
    if (!confirm(`¿Eliminar "${attachment.name}"?`)) return;
    try {
      if (attachment.type !== 'link' && attachment.path) {
        const fileRef = ref(storage, attachment.path);
        await deleteObject(fileRef).catch(console.warn);
      }
      const currentList = task?.attachments || formData.attachments || [];
      const updatedAttachments = currentList.filter(a => a.url !== attachment.url);
      
      if (task) {
        await updateDoc(doc(db, 'expedientes', task.id), { attachments: updatedAttachments, updatedBy: currentUser.email, lastUpdated: serverTimestamp() }).catch(async () => {
          await updateDoc(doc(db, 'tasks', task.id), { attachments: updatedAttachments, updatedBy: currentUser.email, lastUpdated: serverTimestamp() });
        });
        setEditingTask(prev => ({ ...prev, attachments: updatedAttachments }));
      }
      setFormData(prev => ({ ...prev, attachments: updatedAttachments }));
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
      } else {
          if (saveGtdAssignee) {
              saveGtdAssignee(finalAssignee);
          }
      }
      const newAction = {
          id: Date.now(),
          text: newActionText.trim(),
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

  const allAttachments = task?.attachments || formData.attachments || [];
  const resourceLinks = allAttachments.filter(a => a.type === 'link') || [];
  const fileAttachments = allAttachments.filter(a => a.type === 'file') || [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-md p-2 sm:p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl h-[650px] max-h-[90vh] flex flex-col md:flex-row overflow-hidden border border-slate-200/80 animate-in zoom-in-95 duration-200">
        
        {/* COLUMNA IZQUIERDA: FORMULARIO DEL EXPEDIENTE (ALTURA CONSTANTE) */}
        <div className="w-full md:w-1/2 h-full p-4 sm:p-5 border-r border-slate-100 overflow-y-auto bg-white flex flex-col justify-between">
          <div>
            <div className="flex justify-between items-center mb-2.5 pb-2 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900 tracking-tight flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 shadow-2xs">
                  {task ? <Scale className="w-3.5 h-3.5"/> : <Plus className="w-3.5 h-3.5"/>} 
                </div>
                <span>{task ? 'Ficha de Expediente' : 'Nuevo Expediente / Trámite'}</span>
              </h3>
              <div className="flex items-center gap-2">
                  {task && (
                    <button type="button" onClick={handleDuplicate} className="text-[11px] bg-slate-50 hover:bg-indigo-50 text-indigo-600 px-2.5 py-1 rounded-full font-semibold border border-slate-200 hover:border-indigo-200 flex items-center gap-1 transition-all" title="Duplicar Expediente">
                      <Copy className="w-3 h-3"/> Duplicar
                    </button>
                  )}
                  <button type="button" onClick={onClose} className="w-6 h-6 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 flex items-center justify-center transition-colors text-xs font-bold">✕</button>
              </div>
            </div>

            {/* SELECTOR RÁPIDO DE PLANTILLAS PREDEFINIDAS */}
            {(!task || (plantillas && plantillas.length > 0)) && (
              <div className="mb-2.5 p-2 bg-gradient-to-r from-amber-500/10 via-amber-50/60 to-indigo-50/60 rounded-xl border border-amber-200/80 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <div className="w-6 h-6 rounded-lg bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-2xs font-bold text-xs">
                    <Sparkles className="w-3.5 h-3.5" />
                  </div>
                  <div className="truncate">
                    <span className="text-xs font-bold text-slate-800 block leading-tight truncate">Cargar Plantilla Predefinida</span>
                    <span className="text-[10px] text-slate-500 hidden sm:block truncate">Pasos GTD, tramo y honorarios automáticos</span>
                  </div>
                </div>

                <select
                  onChange={(e) => {
                    const selectedId = e.target.value;
                    if (!selectedId) return;
                    handleApplyTemplate(selectedId);
                    e.target.value = '';
                  }}
                  defaultValue=""
                  className="text-xs font-bold px-2.5 py-1 bg-white border border-slate-300 rounded-lg shadow-2xs text-slate-700 outline-none hover:border-indigo-400 cursor-pointer shrink-0 max-w-[200px]"
                >
                  <option value="" disabled>⚡ Aplicar plantilla...</option>
                  {(plantillas || []).map(p => (
                    <option key={p.id} value={p.id}>
                      {p.titulo} ({p.pasos?.length || 0} pasos)
                    </option>
                  ))}
                </select>
              </div>
            )}

            <form onSubmit={handleSubmitForm} className="space-y-2">
              <div>
                <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wide block mb-0.5">Título del Expediente / Trámite</label>
                <input required value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} placeholder="Ej: Presentación Modelo 303 1T - IVA" className="w-full border border-slate-300 py-1.5 px-3 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none font-medium text-xs text-slate-800" />
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wide flex items-center justify-between mb-0.5">
                  <span>Cliente / Empresa <span className="text-rose-500">*</span></span>
                </label>
                <ClientAutocomplete
                  clientes={clientes}
                  value={formData.client || ''}
                  selectedNif={formData.clientNif || ''}
                  onChange={(selected) => {
                    if (selected) {
                      setFormData({
                        ...formData,
                        client: `${selected.razonSocial} (${selected.nif})`,
                        clientNif: selected.nif,
                        clientRazonSocial: selected.razonSocial
                      });
                    } else {
                      setFormData({
                        ...formData,
                        client: '',
                        clientNif: '',
                        clientRazonSocial: ''
                      });
                    }
                  }}
                  error={!isValidClientSelected && Boolean(formData.client)}
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                 <div>
                    <DynamicClassificationSelect 
                      label="Tramo"
                      icon={Tag}
                      value={formData.type || formData.tramo}
                      onChange={(val) => setFormData({ ...formData, type: val, tramo: val })}
                      items={tramos}
                      fallbackOptions={MASTERS.types}
                      placeholder="Selecciona tramo..."
                      name="tramo"
                    />
                 </div>
                 <div>
                    <DynamicClassificationSelect 
                      label="Área"
                      icon={Briefcase}
                      value={formData.department || formData.area}
                      onChange={(val) => setFormData({ ...formData, department: val, area: val })}
                      items={areas}
                      fallbackOptions={MASTERS.departments}
                      placeholder="Selecciona área..."
                      name="area"
                    />
                 </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wide block mb-0.5">Estado del Expediente</label>
                  <select 
                    value={effectiveFormStatus} 
                    onChange={e => {
                      const val = e.target.value;
                      setFormData(prev => ({ ...prev, status: val }));
                    }} 
                    className="w-full border border-slate-300 py-1.5 px-2 rounded-lg bg-white font-bold text-xs text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
                  >
                    <option value="Abierto">🟢 Abierto (En Plazo)</option>
                    <option value="En Riesgo">🟡 En Riesgo (Previsión de retraso)</option>
                    <option value="Con Retraso">🔴 Con Retraso (Plazo vencido)</option>
                    <option value="Cerrado">🔵 Cerrado (Finalizado)</option>
                  </select>
                  {effectiveFormStatus === 'Abierto' && (
                    <span className="text-[10px] text-emerald-600 font-medium flex items-center gap-1 mt-0.5">
                      <CheckCircle2 className="w-2.5 h-2.5 shrink-0" /> En marcha y previsto en fecha
                    </span>
                  )}
                  {effectiveFormStatus === 'En Riesgo' && (
                    <span className="text-[10px] text-amber-600 font-medium flex items-center gap-1 mt-0.5">
                      <Clock className="w-2.5 h-2.5 shrink-0" /> Riesgo de no terminar a tiempo
                    </span>
                  )}
                  {effectiveFormStatus === 'Con Retraso' && (
                    <span className="text-[10px] text-rose-600 font-bold flex items-center gap-1 mt-0.5">
                      <AlertTriangle className="w-2.5 h-2.5 shrink-0" /> Plazo superado automáticamente
                    </span>
                  )}
                  {effectiveFormStatus === 'Cerrado' && (
                    <span className="text-[10px] text-blue-600 font-medium flex items-center gap-1 mt-0.5">
                      <Check className="w-2.5 h-2.5 shrink-0" /> Expediente archivado y cerrado
                    </span>
                  )}
                </div>
                <div>
                    <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wide block mb-0.5">Vencimiento Plazo</label>
                    <input 
                      type="date" 
                      value={formData.dueDate || ''} 
                      onChange={e => {
                        const newDate = e.target.value;
                        const todayStr = new Date().toISOString().split('T')[0];
                        let newStatus = formData.status;
                        if (formData.status !== 'Cerrado') {
                          if (newDate && newDate < todayStr) {
                            newStatus = 'Con Retraso';
                          } else if (formData.status === 'Con Retraso') {
                            newStatus = 'Abierto';
                          }
                        }
                        setFormData(prev => ({ ...prev, dueDate: newDate, status: newStatus }));
                      }} 
                      className="w-full border border-slate-300 py-1.5 px-2.5 rounded-lg text-xs outline-none focus:ring-2 focus:ring-indigo-500 font-medium" 
                    />
                    {currentDelay > 0 && (<div className="mt-0.5 text-[9px] text-rose-600 bg-rose-50 border border-rose-100 px-1 py-0.5 rounded font-bold flex items-center gap-1"><AlertTriangle className="w-2.5 h-2.5"/> Demora de {currentDelay}d</div>)}
                </div>
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wide mb-0.5 block">Gestores Asignados</label>
                <MultiSelectDropdown label="Seleccionar gestores..." icon={UserCheck} options={usersList.map(u => u.email)} selected={formData.assignees} onChange={(newAssignees) => setFormData({...formData, assignees: newAssignees})} fullWidth={true} />
                {formData.assignees?.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-1">
                    {formData.assignees.map(email => (
                      <span key={email} className="bg-indigo-50 text-indigo-700 border border-indigo-100 px-1.5 py-0.2 rounded text-[10px] flex items-center gap-1 font-medium">
                        {email}
                        <button type="button" onClick={() => setFormData(prev => ({...prev, assignees: prev.assignees.filter(e => e !== email)}))} className="hover:text-red-500 font-bold ml-0.5">✕</button>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wide block mb-0.5">Observaciones</label>
                <textarea placeholder="Detalles del cliente, requerimientos o notas para la gestión..." value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} className="w-full border border-slate-300 p-2 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-xs text-slate-800 resize-none" rows="2"></textarea>
              </div>

              {task && (
                <div className="flex items-center justify-between p-2 rounded-lg bg-slate-50 border border-slate-200 text-xs">
                  <span className="text-slate-500 text-[11px] font-medium flex items-center gap-1.5">
                    <Paperclip className="w-3.5 h-3.5 text-slate-400" />
                    {(resourceLinks.length + fileAttachments.length)} archivos y enlaces
                  </span>
                  <button 
                    type="button" 
                    onClick={() => setRightTab('docs')}
                    className="text-xs text-indigo-600 hover:text-indigo-700 font-bold hover:underline"
                  >
                    Ver en panel lateral →
                  </button>
                </div>
              )}

              <div className="pt-2 flex gap-2">
                <button type="button" onClick={onClose} className="flex-1 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 font-medium transition-colors text-xs">Cancelar</button>
                <button 
                  type="submit" 
                  disabled={!isValidClientSelected}
                  className={`flex-1 py-2 rounded-lg font-bold transition-all shadow-sm text-xs flex items-center justify-center gap-1.5 ${
                    isValidClientSelected 
                      ? 'bg-indigo-600 text-white hover:bg-indigo-700 cursor-pointer shadow-indigo-100' 
                      : 'bg-slate-200 text-slate-400 cursor-not-allowed border border-slate-300'
                  }`}
                  title={!isValidClientSelected ? "Selecciona un cliente válido registrado en la base de datos para habilitar el guardado" : ""}
                >
                  {!isValidClientSelected && <Lock className="w-3 h-3 text-slate-400" />}
                  {task ? 'Guardar Cambios' : 'Crear Expediente'}
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* COLUMNA DERECHA: PESTAÑAS Y CONTENIDO CON ALTURA CONSTANTE */}
        <div className="w-full md:w-1/2 h-full bg-slate-50 flex flex-col overflow-hidden border-t md:border-t-0">
          <div className="grid grid-cols-5 border-b border-slate-200 bg-white shrink-0 h-11">
            {/* 1. BITÁCORA */}
            <button 
              type="button"
              onClick={() => setRightTab('activity')}
              title={lang === 'ca' ? "Bitàcola de seguiment" : "Bitácora de seguimiento"}
              className={`h-full px-1 text-xs font-semibold flex items-center justify-center gap-1.5 transition-all border-b-2 whitespace-nowrap ${
                rightTab === 'activity' 
                  ? 'text-slate-900 border-slate-900 bg-slate-50 font-bold' 
                  : 'text-slate-500 border-transparent hover:text-slate-800 hover:bg-slate-50/60'
              }`}
            >
              <Clock className="w-3.5 h-3.5 shrink-0"/>
              <span className="truncate">{t.expedienteTabs?.bitacora || 'Bitácora'}</span>
              {(task?.updates?.length || 0) > 0 && (
                <span className="bg-slate-200/80 text-slate-700 px-1.5 py-0.2 rounded-full text-[10px] font-bold">
                  {task.updates.length}
                </span>
              )}
            </button>

            {/* 2. GTD */}
            <button 
              type="button"
              onClick={() => setRightTab('gtd')}
              title={lang === 'ca' ? "Pla d'acció GTD" : "Plan de acción GTD"}
              className={`h-full px-1 text-xs font-semibold flex items-center justify-center gap-1.5 transition-all border-b-2 whitespace-nowrap ${
                rightTab === 'gtd' 
                  ? 'text-emerald-700 border-emerald-600 bg-emerald-50/50 font-bold' 
                  : 'text-slate-500 border-transparent hover:text-slate-800 hover:bg-slate-50/60'
              }`}
            >
              <Target className="w-3.5 h-3.5 shrink-0 text-emerald-600"/>
              <span className="truncate">{t.expedienteTabs?.gtd || 'GTD'}</span>
              {(formData.actions?.length || 0) > 0 && (
                <span className="bg-emerald-100 text-emerald-800 px-1.5 py-0.2 rounded-full text-[10px] font-bold">
                  {formData.actions.length}
                </span>
              )}
            </button>

            {/* 3. FACTURACIÓN */}
            <button 
              type="button"
              onClick={() => setRightTab('billing')}
              title={lang === 'ca' ? "Honoraris, suplerts i bestretes" : "Honorarios, suplidos y anticipos"}
              className={`h-full px-1 text-xs font-semibold flex items-center justify-center gap-1.5 transition-all border-b-2 whitespace-nowrap ${
                rightTab === 'billing' 
                  ? 'text-amber-700 border-amber-600 bg-amber-50/50 font-bold' 
                  : 'text-slate-500 border-transparent hover:text-slate-800 hover:bg-slate-50/60'
              }`}
            >
              <Coins className="w-3.5 h-3.5 shrink-0 text-amber-600"/>
              <span className="truncate">{t.expedienteTabs?.facturacion || 'Facturación'}</span>
            </button>

            {/* 4. ADJUNTOS */}
            <button 
              type="button"
              onClick={() => setRightTab('docs')}
              title={lang === 'ca' ? "Documents i fitxers d'interès" : "Documentos y enlaces de interés"}
              className={`h-full px-1 text-xs font-semibold flex items-center justify-center gap-1.5 transition-all border-b-2 whitespace-nowrap ${
                rightTab === 'docs' 
                  ? 'text-blue-700 border-blue-600 bg-blue-50/50 font-bold' 
                  : 'text-slate-500 border-transparent hover:text-slate-800 hover:bg-slate-50/60'
              }`}
            >
              <Paperclip className="w-3.5 h-3.5 shrink-0 text-blue-600"/>
              <span className="truncate">{t.expedienteTabs?.adjuntos || 'Adjuntos'}</span>
              {((resourceLinks?.length || 0) + (fileAttachments?.length || 0)) > 0 && (
                <span className="bg-blue-100 text-blue-800 px-1.5 py-0.2 rounded-full text-[10px] font-bold">
                  {(resourceLinks?.length || 0) + (fileAttachments?.length || 0)}
                </span>
              )}
            </button>

            {/* 5. CHAT */}
            <button 
              type="button"
              onClick={() => setRightTab('chat')}
              title={lang === 'ca' ? "Xat intern de l'expedient" : "Chat interno del expediente"}
              className={`h-full px-1 text-xs font-semibold flex items-center justify-center gap-1.5 transition-all border-b-2 whitespace-nowrap ${
                rightTab === 'chat' 
                  ? 'text-indigo-700 border-indigo-600 bg-indigo-50/50 font-bold' 
                  : 'text-slate-500 border-transparent hover:text-slate-800 hover:bg-slate-50/60'
              }`}
            >
              <MessageSquare className="w-3.5 h-3.5 shrink-0 text-indigo-600"/>
              <span className="truncate">{t.expedienteTabs?.chat || 'Chat'}</span>
            </button>
          </div>

          {/* PESTAÑA 1: BITÁCORA */}
          {rightTab === 'activity' && (
            task ? (
              <div className="flex-1 flex flex-col h-full overflow-hidden">
                <div className="flex-1 overflow-y-auto p-4 space-y-3">
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
                <div className="p-3 bg-white border-t border-slate-200 shrink-0">
                  <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wide block mb-1">Añadir Nota de Seguimiento</label>
                  <div className="flex gap-2 relative">
                    <textarea value={newUpdateText} onChange={(e) => setNewUpdateText(e.target.value)} placeholder="Escribe un avance o notas..." className="flex-1 border border-slate-300 rounded-lg p-2 text-xs focus:ring-2 focus:ring-indigo-500 outline-none resize-none pr-8" rows="2"></textarea>
                    <button type="button" onClick={handlePasteLinkInChat} className="absolute right-14 top-2 text-slate-400 hover:text-indigo-600 p-1 rounded transition-colors" title="Pegar enlace web"><LinkIcon className="w-4 h-4"/></button>
                    <button type="button" onClick={onAddUpdate} disabled={!newUpdateText.trim()} className="bg-indigo-600 disabled:bg-slate-300 text-white px-3.5 rounded-lg hover:bg-indigo-700 transition-colors flex items-center justify-center"><Send className="w-3.5 h-3.5" /></button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-slate-400">
                <Clock className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                <h4 className="text-xs font-bold text-slate-700">Bitácora de Seguimiento</h4>
                <p className="text-[11px] text-slate-400 mt-1 max-w-xs">
                  Las notas de seguimiento se podrán añadir una vez guardado el nuevo expediente.
                </p>
              </div>
            )
          )}

          {/* PESTAÑA 2: PASOS GTD LIMPIOS Y PROFESIONALES */}
          {rightTab === 'gtd' && (
            <div className="flex-1 flex flex-col h-full overflow-hidden bg-slate-50">
              <div className="p-2.5 bg-emerald-50/50 border-b border-emerald-100 shrink-0">
                <p className="text-[11px] text-emerald-800 text-center font-medium">Divide este expediente en pasos secuenciales. Pulsa el lápiz para editar o reasignar cualquier paso.</p>
              </div>
              
              <div className="flex-1 overflow-y-auto p-3 space-y-2">
                {(formData.actions || []).map(action => {
                  const isMe = action.assignee === currentUser?.email || action.assignee === 'Yo';
                  let assigneeLabel = 'Sin asignar';
                  if (isMe) {
                    assigneeLabel = 'Yo';
                  } else if (action.assignee) {
                    if (action.assignee.includes('@')) {
                      // Buscar si hay un nombre en usersList
                      const foundUser = (usersList || []).find(u => (u.email || '').toLowerCase() === action.assignee.toLowerCase());
                      assigneeLabel = foundUser?.name ? foundUser.name : action.assignee.split('@')[0];
                    } else {
                      assigneeLabel = action.assignee;
                    }
                  }

                  return (
                    <div 
                      key={action.id} 
                      className={`flex items-center justify-between gap-2.5 p-2.5 rounded-xl border transition-all ${
                        action.isCompleted 
                          ? 'bg-slate-100/70 border-slate-200 opacity-60' 
                          : 'bg-white border-slate-200 hover:border-emerald-300 shadow-2xs'
                      }`}
                    >
                      {/* Checkbox circular de completado */}
                      <button 
                        type="button" 
                        onClick={() => toggleAction(action.id)} 
                        className={`w-5 h-5 rounded-full border flex items-center justify-center transition-colors shrink-0 cursor-pointer ${
                          action.isCompleted 
                            ? 'bg-emerald-500 border-emerald-500' 
                            : 'border-slate-300 hover:border-emerald-400 bg-slate-50'
                        }`}
                        title={action.isCompleted ? "Marcar como pendiente" : "Marcar como completado"}
                      >
                        {action.isCompleted && <Check className="w-3 h-3 text-white"/>}
                      </button>

                      {/* Texto del paso (limpio, sin campos pesados) */}
                      <div className="flex-1 min-w-0">
                        <span 
                          onClick={() => handleOpenEditActionModal(action)} 
                          className={`block leading-snug font-medium text-xs truncate cursor-pointer hover:text-indigo-600 transition-colors ${
                            action.isCompleted ? 'line-through text-slate-500' : 'text-slate-800'
                          }`}
                          title="Haz clic para editar este paso"
                        >
                          {action.text}
                        </span>
                      </div>

                      {/* Badge / Pill del asignado (SIN desplegable, sólo lectura elegante) */}
                      <div className="shrink-0">
                        <span 
                          onClick={() => handleOpenEditActionModal(action)}
                          className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border truncate max-w-[140px] cursor-pointer hover:ring-1 hover:ring-indigo-300 transition-all ${
                            isMe 
                              ? 'bg-indigo-50 text-indigo-700 border-indigo-200' 
                              : action.assignee 
                              ? 'bg-slate-100 text-slate-700 border-slate-200' 
                              : 'bg-amber-50 text-amber-700 border-amber-200'
                          }`}
                          title={`Asignado a: ${action.assignee || 'Sin asignar'} (clic para cambiar)`}
                        >
                          <User className="w-3 h-3 shrink-0 opacity-70" />
                          <span className="truncate">{assigneeLabel}</span>
                        </span>
                      </div>

                      {/* Acciones: Editar en modal y Eliminar */}
                      <div className="flex items-center gap-0.5 shrink-0">
                        <button 
                          type="button" 
                          onClick={() => handleOpenEditActionModal(action)} 
                          className="text-slate-400 hover:text-indigo-600 p-1.5 rounded-lg hover:bg-indigo-50 transition-colors cursor-pointer"
                          title="Editar paso y reasignar responsable"
                        >
                          <Pencil className="w-3.5 h-3.5"/>
                        </button>
                        <button 
                          type="button" 
                          onClick={() => deleteAction(action.id)} 
                          className="text-slate-400 hover:text-rose-500 p-1.5 rounded-lg hover:bg-rose-50 transition-colors cursor-pointer"
                          title="Eliminar paso GTD"
                        >
                          <Trash2 className="w-3.5 h-3.5"/>
                        </button>
                      </div>
                    </div>
                  );
                })}

                {(!formData.actions || formData.actions.length === 0) && (
                  <div className="flex flex-col items-center justify-center h-40 text-slate-400">
                    <Target className="w-8 h-8 mb-2 opacity-20"/>
                    <span className="text-xs italic">Sin pasos definidos para este expediente.</span>
                  </div>
                )}
              </div>

              {/* Formulario inferior para añadir nuevo paso */}
              <div className="p-3 bg-white border-t border-slate-200 shrink-0">
                <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wide block mb-1">Añadir Nuevo Paso GTD</label>
                <div className="flex gap-2 items-center">
                  <input 
                    type="text" 
                    placeholder="¿Cuál es el siguiente paso?" 
                    value={newActionText}
                    onChange={e => setNewActionText(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), handleAddAction())}
                    className="flex-1 text-xs border border-slate-300 rounded-lg p-2 outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                  
                  <div className="relative w-[140px] shrink-0">
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
                      className="w-full text-xs border border-slate-300 rounded-lg p-2 bg-white outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
                    />
                    
                    {showSuggestions && (
                      (() => {
                        const allOptions = ['Yo', ...(suggestedAssignees || [])];
                        const query = newActionAssignee.toLowerCase().trim();
                        const matches = allOptions.filter(a => 
                          !query || a.toLowerCase().includes(query)
                        );
                        
                        if (matches.length === 0 || (matches.length === 1 && matches[0].toLowerCase() === query)) return null;

                        return (
                          <div className="absolute bottom-full left-0 mb-1 w-full bg-white border border-slate-200 rounded-xl shadow-xl z-[9999] overflow-hidden max-h-48 overflow-y-auto">
                            <div className="px-2 py-1 text-[9px] font-bold text-slate-400 bg-slate-50 uppercase tracking-wide border-b border-slate-100">
                              Equipo & Externos
                            </div>
                            {matches.map((item, idx) => (
                              <div 
                                key={idx} 
                                onMouseDown={() => {
                                  setNewActionAssignee(item === 'Yo' ? currentUser?.email : item);
                                  setShowSuggestions(false);
                                }}
                                className="px-2.5 py-1.5 text-xs hover:bg-emerald-50 cursor-pointer text-slate-700 truncate font-medium border-b border-slate-50 last:border-0 flex items-center justify-between"
                              >
                                <span className="truncate">{item}</span>
                                {item === 'Yo' ? (
                                  <span className="text-[9px] text-emerald-600 font-bold shrink-0">Tú</span>
                                ) : !item.includes('@') ? (
                                  <span className="text-[9px] text-amber-600 font-bold shrink-0">Ext.</span>
                                ) : null}
                              </div>
                            ))}
                          </div>
                        );
                      })()
                    )}
                  </div>

                  <button 
                    type="button" 
                    onClick={handleAddAction}
                    disabled={!newActionText.trim()}
                    className="bg-emerald-600 disabled:bg-slate-300 text-white px-3 py-2 rounded-lg text-xs font-bold hover:bg-emerald-700 transition-colors shrink-0 cursor-pointer shadow-xs"
                  >
                    Añadir
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* PESTAÑA 3: FACTURACIÓN Y GASTOS SUPLIDOS */}
          {rightTab === 'billing' && (
            <div className="flex-1 flex flex-col h-full overflow-hidden">
              <ExpedienteBillingTab 
                formData={formData}
                setFormData={setFormData}
                currentUser={currentUser}
                clientes={clientes}
                billingSettings={billingSettings}
                logAction={logAction}
                lang={lang}
              />
            </div>
          )}

          {/* PESTAÑA 4: ADJUNTOS CON DRAG & DROP DIRECTO Y ELIMINACIÓN ÁGIL */}
          {rightTab === 'docs' && (
            <div 
              onDragOver={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setIsDraggingFile(true);
              }}
              onDragLeave={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setIsDraggingFile(false);
              }}
              onDrop={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setIsDraggingFile(false);
                if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                  Array.from(e.dataTransfer.files).forEach(f => processFileUpload(f));
                }
              }}
              className="flex-1 flex flex-col h-full overflow-hidden bg-white p-4 relative"
            >
              {/* Overlay visual cuando se arrastra un archivo encima */}
              {isDraggingFile && (
                <div className="absolute inset-0 bg-indigo-600/90 backdrop-blur-xs z-30 flex flex-col items-center justify-center text-white border-2 border-dashed border-white m-2 rounded-2xl animate-in fade-in duration-150">
                  <UploadCloud className="w-12 h-12 text-white animate-bounce mb-2" />
                  <p className="font-bold text-sm">Suelta tus archivos aquí para adjuntarlos</p>
                  <p className="text-xs text-indigo-200 mt-1">Se guardarán automáticamente en este expediente</p>
                </div>
              )}

              <div className="flex justify-between items-center mb-2.5 pb-2 border-b border-slate-100 shrink-0">
                <span className="text-xs font-bold text-slate-800 uppercase tracking-wide flex items-center gap-1.5">
                  <Paperclip className="w-3.5 h-3.5 text-blue-600" /> Archivos y Documentación
                </span>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={handleAddLinkAttachment}
                    className="text-xs bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 px-2.5 py-1 rounded-lg font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                    title="Añadir enlace oficial a Sede Electrónica (AEAT, DGT, Cloud...)"
                  >
                    <Globe className="w-3 h-3" />
                    <span>+ Enlace Web</span>
                  </button>
                  <label className="text-xs bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 px-2.5 py-1 rounded-lg font-semibold cursor-pointer flex items-center gap-1 transition-colors">
                    {isUploading ? <Loader2 className="w-3 h-3 animate-spin"/> : <UploadCloud className="w-3 h-3"/>}
                    <span>{isUploading ? "Subiendo..." : "Subir Archivo"}</span>
                    <input type="file" ref={fileInputRef} onChange={handleFileUpload} multiple className="hidden" disabled={isUploading} />
                  </label>
                </div>
              </div>

              {/* Zona dropzone visual para arrastrar o hacer clic */}
              <div
                onClick={() => fileInputRef.current?.click()}
                className="mb-2.5 p-2.5 border-2 border-dashed border-slate-200 hover:border-indigo-400 bg-slate-50/70 hover:bg-indigo-50/30 rounded-xl transition-all cursor-pointer text-center group shrink-0"
              >
                <div className="flex items-center justify-center gap-2 text-xs text-slate-600 group-hover:text-indigo-600 font-medium">
                  <UploadCloud className="w-4 h-4 text-slate-400 group-hover:text-indigo-500 transition-colors" />
                  <span>Arrastra archivos aquí o <span className="underline font-bold text-indigo-600">examinar desde el equipo</span></span>
                </div>
                <p className="text-[10px] text-slate-400 mt-0.5">Admite PDF, imágenes, justificantes bancarios y documentos</p>
              </div>
              <div className="flex-1 overflow-y-auto space-y-2">
                {(resourceLinks.length === 0 && fileAttachments.length === 0) ? (
                  <div className="py-12 text-center text-slate-400">
                    <Paperclip className="w-8 h-8 text-slate-300 mx-auto mb-1.5" />
                    <p className="text-xs font-semibold text-slate-600">Sin archivos ni enlaces adjuntos aún</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">Usa los botones superiores para adjuntar documentos PDF o enlaces oficiales.</p>
                  </div>
                ) : (
                  <>
                    {/* ENLACES OFICIALES */}
                    {resourceLinks.map((link, idx) => (
                      <div key={'link_' + idx} className="flex items-center justify-between p-2.5 rounded-lg bg-slate-50 border border-slate-200 text-xs hover:bg-slate-100/70 transition-colors group">
                        <div className="flex items-center gap-2 truncate flex-1 min-w-0">
                          <Globe className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                          <a href={link.url} target="_blank" rel="noopener noreferrer" className="text-indigo-700 hover:underline font-semibold truncate" title={link.name || link.url}>
                            {link.name || link.url}
                          </a>
                        </div>
                        <div className="flex items-center gap-2 shrink-0 ml-2">
                          <a href={link.url} target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:text-indigo-800 text-[11px] font-semibold flex items-center gap-0.5">
                            <ExternalLink className="w-3 h-3" /> Abrir
                          </a>
                          <button
                            type="button"
                            onClick={() => handleDeleteAttachment(link)}
                            className="text-slate-400 hover:text-rose-600 p-1 rounded hover:bg-rose-50 transition-colors cursor-pointer"
                            title="Eliminar este enlace"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}

                    {/* ARCHIVOS Y DOCUMENTOS SUBIDOS */}
                    {fileAttachments.map((f, idx) => (
                      <div key={'file_' + idx} className="flex items-center justify-between p-2.5 rounded-lg bg-slate-50 border border-slate-200 text-xs hover:bg-slate-100/70 transition-colors group">
                        <div className="flex items-center gap-2 truncate flex-1 min-w-0">
                          <Paperclip className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                          <div className="truncate">
                            <a href={f.url} target="_blank" rel="noopener noreferrer" className="text-slate-800 hover:text-indigo-600 font-semibold truncate block" title={f.name}>
                              {f.name}
                            </a>
                            {f.uploadedAt && (
                              <span className="text-[10px] text-slate-400 block mt-0.5">
                                Subido el {new Date(f.uploadedAt).toLocaleDateString('es-ES')}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0 ml-2">
                          <a href={f.url} target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:text-indigo-800 text-[11px] font-semibold flex items-center gap-0.5">
                            <ExternalLink className="w-3 h-3" /> Ver
                          </a>
                          <button
                            type="button"
                            onClick={() => handleDeleteAttachment(f)}
                            className="text-slate-400 hover:text-rose-600 p-1 rounded hover:bg-rose-50 transition-colors cursor-pointer"
                            title="Eliminar este archivo (deshacer subida)"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </>
                )}
              </div>
            </div>
          )}

          {/* PESTAÑA 5: CHAT INTERNO CON GLOBOS (AL FINAL) */}
          {rightTab === 'chat' && (
            <div className="flex-1 flex flex-col h-full overflow-hidden">
              {task ? (
                <ExpedienteChatTab 
                  task={task}
                  currentUser={currentUser}
                  logAction={logAction}
                />
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-slate-400">
                  <MessageSquare className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                  <h4 className="text-xs font-bold text-slate-700">Canal de Chat Interno</h4>
                  <p className="text-[11px] text-slate-400 mt-1 max-w-xs">
                    El chat interno con globos se activará una vez guardado el nuevo expediente.
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* DIÁLOGO MODAL PARA EDITAR PASO GTD (REQUERIMIENTO 1 & 2) */}
      {editingActionItem && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200/90 w-full max-w-md p-5 space-y-4 animate-in zoom-in-95 duration-150">
            <div className="flex justify-between items-center pb-2.5 border-b border-slate-100">
              <h4 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-indigo-50 border border-indigo-100 text-indigo-600 flex items-center justify-center font-bold">
                  <Pencil className="w-3.5 h-3.5" />
                </div>
                <span>Editar Paso GTD</span>
              </h4>
              <button
                type="button"
                onClick={() => setEditingActionItem(null)}
                className="text-slate-400 hover:text-slate-700 w-6 h-6 rounded-full hover:bg-slate-100 flex items-center justify-center text-xs font-bold transition-colors cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wide block mb-1">
                  Descripción de la Tarea / Trámite *
                </label>
                <textarea
                  value={modalActionText}
                  onChange={(e) => setModalActionText(e.target.value)}
                  rows={3}
                  placeholder="Escribe la acción concreta a realizar..."
                  className="w-full text-xs font-medium border border-slate-300 rounded-xl p-2.5 outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 resize-none text-slate-800"
                  autoFocus
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wide block mb-1">
                  Responsable Asignado (Equipo o Contacto Externo)
                </label>
                <div className="relative">
                  <div className="flex items-center border border-slate-300 rounded-xl bg-white px-2.5 py-1.5 focus-within:ring-2 focus-within:ring-indigo-500/20 focus-within:border-indigo-500">
                    <User className="w-3.5 h-3.5 text-slate-400 mr-2 shrink-0" />
                    <input
                      type="text"
                      value={modalActionAssignee}
                      onChange={(e) => {
                        setModalActionAssignee(e.target.value);
                        setModalShowSuggestions(true);
                      }}
                      onFocus={() => {
                        if (modalActionAssignee === 'Yo' || modalActionAssignee === currentUser?.email) {
                          setModalActionAssignee('');
                        }
                        setModalShowSuggestions(true);
                      }}
                      onBlur={() => {
                        setTimeout(() => setModalShowSuggestions(false), 200);
                        if (!modalActionAssignee.trim()) setModalActionAssignee('Yo');
                      }}
                      placeholder="Escribe 'Yo', asesor o contacto externo (ej: Paco Notaría)..."
                      className="w-full text-xs font-semibold outline-none bg-transparent text-slate-800"
                    />
                  </div>

                  {modalShowSuggestions && (
                    (() => {
                      const allOptions = ['Yo', ...(suggestedAssignees || [])];
                      const query = modalActionAssignee.toLowerCase().trim();
                      const matches = allOptions.filter(a => 
                        !query || a.toLowerCase().includes(query)
                      );

                      if (matches.length === 0 || (matches.length === 1 && matches[0].toLowerCase() === query)) return null;

                      return (
                        <div className="absolute top-full left-0 mt-1 w-full bg-white border border-slate-200 rounded-xl shadow-xl z-[9999] overflow-hidden max-h-48 overflow-y-auto">
                          <div className="px-2.5 py-1 text-[10px] font-bold text-slate-400 bg-slate-50 uppercase tracking-wide border-b border-slate-100">
                            Equipo & Contactos Externos
                          </div>
                          {matches.map((item, idx) => (
                            <div
                              key={idx}
                              onMouseDown={() => {
                                setModalActionAssignee(item === 'Yo' ? currentUser?.email : item);
                                setModalShowSuggestions(false);
                              }}
                              className="px-3 py-2 text-xs hover:bg-indigo-50 cursor-pointer text-slate-700 font-medium border-b border-slate-50 last:border-0 flex items-center justify-between"
                            >
                              <span>{item}</span>
                              {item === 'Yo' ? (
                                <span className="text-[10px] text-indigo-600 font-bold">Tú</span>
                              ) : !item.includes('@') ? (
                                <span className="text-[10px] text-amber-700 font-bold bg-amber-50 px-1.5 py-0.2 rounded border border-amber-200">Externo</span>
                              ) : (
                                <span className="text-[10px] text-slate-400">Equipo</span>
                              )}
                            </div>
                          ))}
                        </div>
                      );
                    })()
                  )}
                </div>
                <p className="text-[10px] text-slate-400 mt-1">
                  Admite texto libre. Si escribes un nombre nuevo (ej. <em>Paco Notaría</em>), quedará grabado para que todo el equipo lo use igual en futuros expedientes.
                </p>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2.5 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setEditingActionItem(null)}
                className="px-3.5 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleSaveActionModal}
                disabled={!modalActionText.trim()}
                className="px-4 py-1.5 text-xs font-bold bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 text-white rounded-xl shadow-xs transition-all cursor-pointer"
              >
                Guardar Cambios
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// --- GESTOR PRINCIPAL DE EXPEDIENTES (MAIN) ---
const ExpedienteManager = ({ currentUser }) => {
  const userEmail = (currentUser?.email || '').toLowerCase().trim();
  const isSuperAdmin = SUPER_ADMINS.includes(userEmail);
  const preAuth = PRE_AUTHORIZED_USERS.find(u => u.email.toLowerCase() === userEmail);
  const isInitialAdmin = isSuperAdmin || (preAuth && preAuth.role === 'admin');
  const isInitiallyAuthorized = isSuperAdmin || Boolean(preAuth);

  const [currentView, setCurrentView] = useState('list');
  const [tasks, setTasks] = useState([]);
  const [clientes, setClientes] = useState([]);
  const [areas, setAreas] = useState([]);
  const [tramos, setTramos] = useState([]);
  const [estados, setEstados] = useState([]);
  const [plantillas, setPlantillas] = useState([]);
  const [gtdAssignees, setGtdAssignees] = useState([]);
  const [billingSettings, setBillingSettings] = useState(DEFAULT_BILLING_SETTINGS);
  const [usersList, setUsersList] = useState([]); 
  const [filterScope, setFilterScope] = useState(isInitialAdmin ? 'all' : 'mine'); 
  const [selectedDepts, setSelectedDepts] = useState([]);
  const [selectedTypes, setSelectedTypes] = useState([]);
  const [selectedStatus, setSelectedStatus] = useState([]); 
  const [searchTerm, setSearchTerm] = useState('');
  const [hideCompleted, setHideCompleted] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [newUpdateText, setNewUpdateText] = useState('');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false); 
  const [isAdmin, setIsAdmin] = useState(isInitialAdmin);
  const [isAuthorized, setIsAuthorized] = useState(isInitiallyAuthorized);
  const [isAuthChecking, setIsAuthChecking] = useState(!isInitiallyAuthorized);

  // Idioma de la aplicación: Català (per defecte) o Castellano
  const [lang, setLangState] = useState(() => {
    return localStorage.getItem('gestflow_lang') || 'ca';
  });

  const setLang = (newLang) => {
    const valid = newLang === 'es' ? 'es' : 'ca';
    setLangState(valid);
    localStorage.setItem('gestflow_lang', valid);
  };

  const t = translations[lang] || translations.ca;

  // Derivación dinámica de opciones para filtros a partir de Firestore
  const dynamicDepartments = useMemo(() => {
    if (areas.length > 0) return areas.map(a => a.nombre || a.name).filter(Boolean);
    return MASTERS.departments;
  }, [areas]);

  const dynamicTypes = useMemo(() => {
    if (tramos.length > 0) return tramos.map(t => t.nombre || t.name).filter(Boolean);
    return MASTERS.types;
  }, [tramos]);

  const dynamicStatus = useMemo(() => {
    return ['Abierto', 'En Riesgo', 'Con Retraso', 'Cerrado'];
  }, []);

  const completedStatusNames = useMemo(() => {
    return ['cerrado', 'closed', 'presentado / tramitado', 'completed'];
  }, []);

  const initialFormState = {
    title: '', 
    client: '',
    clientNif: '',
    clientRazonSocial: '',
    description: '', 
    department: MASTERS.departments[0],
    area: MASTERS.departments[0],
    type: MASTERS.types[0], 
    tramo: MASTERS.types[0],
    status: 'Abierto', 
    assignees: [],
    dueDate: new Date().toISOString().split('T')[0],
    actions: [],
    // Reto 3: Módulo Económico y Facturación
    billingType: 'billable',
    esFacturable: true,
    feeAmount: 0,
    precioHonorarios: 0,
    billingStatus: 'pending',
    invoiceNumber: '',
    downPayments: [],
    externalExpenses: []
  };
  const [formData, setFormData] = useState(initialFormState);

  useEffect(() => {
    const userEmail = (currentUser?.email || '').toLowerCase().trim();
    const isSuperAdmin = SUPER_ADMINS.includes(userEmail);
    const preAuth = PRE_AUTHORIZED_USERS.find(u => u.email.toLowerCase() === userEmail);

    const syncUser = async () => { 
      if (userEmail) {
        try {
          const userDocRef = doc(db, 'users', userEmail);
          const snap = await getDoc(userDocRef);
          if (isSuperAdmin) {
            if (!snap.exists()) {
              await setDoc(userDocRef, { 
                email: userEmail, 
                name: 'Super Administrador', 
                role: 'admin', 
                status: 'active',
                createdAt: serverTimestamp(),
                lastSeen: serverTimestamp() 
              }, { merge: true });
            } else {
              await updateDoc(userDocRef, { 
                role: 'admin', 
                status: 'active',
                lastSeen: serverTimestamp() 
              });
            }
            // Asegurar que albmarrib@gmail.com está registrado en settings/config
            await setDoc(doc(db, 'settings', 'config'), {
              admins: arrayUnion(userEmail)
            }, { merge: true });
          } else if (preAuth && (!snap.exists() || snap.data()?.status !== 'active')) {
            // Auto-provisión de usuario pre-autorizado (ej: Josep Ferrer)
            await setDoc(userDocRef, {
              email: userEmail,
              name: preAuth.name,
              department: preAuth.department || 'General',
              role: preAuth.role || 'admin',
              status: 'active',
              createdAt: serverTimestamp(),
              lastSeen: serverTimestamp()
            }, { merge: true });
            if (preAuth.role === 'admin') {
              await setDoc(doc(db, 'settings', 'config'), {
                admins: arrayUnion(userEmail)
              }, { merge: true });
            }
          } else if (snap.exists()) {
            await updateDoc(userDocRef, { lastSeen: serverTimestamp() }).catch(console.warn);
          }
        } catch (e) {
          console.warn("Aviso en syncUser:", e);
        }
      }
    };
    syncUser();

    // Escuchar colección users y verificar autorización en tiempo real
    const unsubUsers = onSnapshot(collection(db, 'users'), (snap) => {
      const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setUsersList(data);

      if (isSuperAdmin) {
        setIsAuthorized(true);
        setIsAdmin(true);
      } else {
        const found = data.find(u => (u.email || u.id || '').toLowerCase().trim() === userEmail);
        setIsAuthorized(Boolean((found && found.status !== 'inactive') || preAuth));
        if (found) {
          const roleIsAdmin = found.role === 'admin';
          setIsAdmin(roleIsAdmin);
          if (!roleIsAdmin) setFilterScope('mine');
        } else if (preAuth) {
          const preIsAdmin = preAuth.role === 'admin';
          setIsAdmin(preIsAdmin);
          if (!preIsAdmin) setFilterScope('mine');
        }
      }
      setIsAuthChecking(false);
    }, (err) => {
      console.warn("Error cargando usuarios:", err);
      setIsAuthorized(isSuperAdmin || Boolean(preAuth));
      setIsAdmin(isSuperAdmin || Boolean(preAuth && preAuth.role === 'admin'));
      setIsAuthChecking(false);
    });

    // Escuchar colección clientes en tiempo real
    const unsubClientes = onSnapshot(collection(db, 'clientes'), (snap) => {
      const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      data.sort((a, b) => (a.razonSocial || '').localeCompare(b.razonSocial || ''));
      setClientes(data);
    }, (err) => console.warn("Error cargando clientes:", err));

    // Escuchar colección areas en tiempo real
    const unsubAreas = onSnapshot(collection(db, 'areas'), (snap) => {
      const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      data.sort((a, b) => (a.nombre || a.name || '').localeCompare(b.nombre || b.name || ''));
      setAreas(data);
    }, (err) => console.warn("Error cargando areas:", err));

    // Escuchar colección tramos en tiempo real
    const unsubTramos = onSnapshot(collection(db, 'tramos'), (snap) => {
      const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      data.sort((a, b) => (a.nombre || a.name || '').localeCompare(b.nombre || b.name || ''));
      setTramos(data);
    }, (err) => console.warn("Error cargando tramos:", err));

    // Escuchar colección estados en tiempo real
    const unsubEstados = onSnapshot(collection(db, 'estados'), (snap) => {
      const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      data.sort((a, b) => (a.orden || 99) - (b.orden || 99));
      setEstados(data);
    }, (err) => console.warn("Error cargando estados:", err));

    // Escuchar colección plantillas_tareas en tiempo real
    const unsubPlantillas = onSnapshot(collection(db, 'plantillas_tareas'), (snap) => {
      const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      data.sort((a, b) => (a.titulo || '').localeCompare(b.titulo || ''));
      setPlantillas(data);
    }, (err) => console.warn("Error cargando plantillas_tareas:", err));

    // Escuchar colección gtd_assignees en tiempo real (contactos externos para pasos GTD)
    const unsubGtdAssignees = onSnapshot(collection(db, 'gtd_assignees'), (snap) => {
      const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      data.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
      setGtdAssignees(data);
    }, (err) => console.warn("Error cargando gtd_assignees:", err));

    // Escuchar configuración de facturación y liquidaciones en tiempo real
    const unsubBilling = onSnapshot(doc(db, 'settings', 'billing'), (docSnap) => {
      if (docSnap.exists()) {
        setBillingSettings({ ...DEFAULT_BILLING_SETTINGS, ...docSnap.data() });
      } else {
        setBillingSettings(DEFAULT_BILLING_SETTINGS);
      }
    }, (err) => console.warn("Error cargando settings/billing:", err));

    // Escuchar expedientes (primaria) y tasks (compatibilidad)
    const unsubExpedientes = onSnapshot(collection(db, 'expedientes'), (snap) => {
      if (!snap.empty) {
        const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        data.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
        setTasks(data);
      } else {
        const unsubOld = onSnapshot(collection(db, 'tasks'), (oldSnap) => {
          const data = oldSnap.docs.map(d => ({ id: d.id, ...d.data() }));
          data.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
          setTasks(data);
        }, (err) => console.warn(err));
        return () => unsubOld();
      }
    }, (err) => console.warn(err));

    // Escuchar configuración de administradores: Nadie es admin por defecto excepto el Super Admin y pre-autorizados
    const unsubAdmin = onSnapshot(doc(db, 'settings', 'config'), (docSnap) => {
      if (isSuperAdmin) {
        setIsAdmin(true);
        return;
      }
      const adminList = docSnap.exists() 
        ? (docSnap.data().admins || []).map(e => (typeof e === 'string' ? e.toLowerCase().trim() : ''))
        : [];
      
      const userDoc = usersList.find(u => (u.email || u.id || '').toLowerCase().trim() === userEmail);
      if (userDoc) {
        const userIsAdmin = userDoc.role === 'admin';
        setIsAdmin(userIsAdmin);
        if (!userIsAdmin) setFilterScope('mine');
      } else {
        const preAuthIsAdmin = preAuth && preAuth.role === 'admin';
        const userIsAdmin = preAuthIsAdmin || adminList.includes(userEmail);
        setIsAdmin(userIsAdmin);
        if (!userIsAdmin) setFilterScope('mine');
      }
    }, () => {
      if (isSuperAdmin) {
        setIsAdmin(true);
      } else {
        const userDoc = usersList.find(u => (u.email || u.id || '').toLowerCase().trim() === userEmail);
        const userIsAdmin = userDoc ? userDoc.role === 'admin' : Boolean(preAuth && preAuth.role === 'admin');
        setIsAdmin(userIsAdmin);
        if (!userIsAdmin) setFilterScope('mine');
      }
    });

    return () => { unsubUsers(); unsubExpedientes(); unsubAdmin(); unsubClientes(); unsubAreas(); unsubTramos(); unsubEstados(); unsubPlantillas(); unsubGtdAssignees(); unsubBilling(); };
  }, [currentUser]);

  const saveGtdAssignee = async (name) => {
    if (!name || typeof name !== 'string') return;
    const clean = name.trim();
    if (!clean || clean.toLowerCase() === 'yo') return;

    // Comprobar si coincide con un miembro del equipo
    const isTeam = (usersList || []).some(u => 
      (u.email || '').toLowerCase().trim() === clean.toLowerCase() ||
      (u.name && u.name.toLowerCase().trim() === clean.toLowerCase())
    );
    if (isTeam) return;

    const docId = clean.toLowerCase().replace(/[^a-z0-9]/g, '_').slice(0, 50);
    try {
      await setDoc(doc(db, 'gtd_assignees', docId), {
        name: clean,
        updatedAt: serverTimestamp()
      }, { merge: true });
    } catch (err) {
      console.warn("Error guardando contacto externo:", err);
    }
  };

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

    // RESTRICCIÓN DE VISIBILIDAD ESTRICTA:
    // Si el usuario no es administrador, NUNCA puede ver expedientes ajenos.
    if (!isAdmin) {
      if (!amIAssigned) return false;
    } else if (filterScope === 'mine') {
      if (!amIAssigned) return false;
    }

    const effectiveStatus = getEffectiveStatus(task);
    const normDept = normalizeDepartment(task.department);
    const normType = normalizeType(task.type);

    if (hideCompleted && currentView !== 'analytics' && effectiveStatus === 'Cerrado') return false;
    if (selectedDepts.length > 0 && !selectedDepts.includes(normDept)) return false;
    if (selectedTypes.length > 0 && !selectedTypes.includes(normType)) return false;
    if (selectedStatus.length > 0 && !selectedStatus.includes(effectiveStatus)) return false; 
    
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
    const defaultDept = areas[0]?.nombre || MASTERS.departments[0];
    const defaultType = tramos[0]?.nombre || MASTERS.types[0];
    setFormData({
      ...initialFormState,
      client: '',
      clientNif: '',
      clientRazonSocial: '',
      department: defaultDept,
      area: defaultDept,
      type: defaultType,
      tramo: defaultType,
      status: 'Abierto',
      assignees: [currentUser.email]
    }); 
    setShowModal(true); 
  };

  const handleOpenEdit = (task) => {
    setEditingTask(task);
    const dept = task.department || task.area || normalizeDepartment(task.department);
    const typ = task.type || task.tramo || normalizeType(task.type);
    setFormData({
      title: task.title, 
      client: task.client || '',
      clientNif: task.clientNif || '',
      clientRazonSocial: task.clientRazonSocial || '',
      description: task.description || '', 
      department: dept, 
      area: dept,
      type: typ, 
      tramo: typ,
      status: getEffectiveStatus(task),
      assignees: task.assignees || (task.assigneeEmail ? [task.assigneeEmail] : []), 
      dueDate: task.dueDate || '',
      originalDueDate: task.originalDueDate || task.dueDate || '',
      actions: task.actions || [],
      // Reto 3: Módulo Económico y Facturación
      billingType: task.billingType || (task.esFacturable === false ? 'included' : 'billable'),
      esFacturable: task.billingType ? task.billingType === 'billable' : (task.esFacturable !== false),
      feeAmount: task.feeAmount !== undefined ? task.feeAmount : (task.precioHonorarios || 0),
      precioHonorarios: task.precioHonorarios !== undefined ? task.precioHonorarios : (task.feeAmount || 0),
      billingStatus: task.billingStatus || 'pending',
      invoiceNumber: task.invoiceNumber || '',
      downPayments: Array.isArray(task.downPayments) ? task.downPayments : [],
      externalExpenses: Array.isArray(task.externalExpenses) ? task.externalExpenses : []
    });
    setNewUpdateText('');
    setShowModal(true);
  };

  const handleSaveTask = async (e) => {
    e.preventDefault();

    // Verificación estricta: El cliente debe existir en la base de datos de Clientes
    const clientExists = clientes.some(c => {
      const cNif = (c.nif || '').toUpperCase().trim();
      const cRazon = (c.razonSocial || '').toLowerCase().trim();
      const formClient = (formData.client || '').toLowerCase().trim();
      const formNif = (formData.clientNif || '').toUpperCase().trim();

      if (formNif && formNif === cNif) return true;
      if (cNif && formClient.includes(cNif.toLowerCase())) return true;
      if (cRazon && formClient === cRazon) return true;
      if (`${cRazon} (${cNif.toLowerCase()})` === formClient) return true;
      return false;
    });

    if (!clientExists) {
      alert("⚠️ Operación bloqueada: No se puede crear ni actualizar el expediente sin asociarlo a un cliente existente en la base de datos de Clientes.");
      return;
    }

    // Calcular estado definitivo asegurando coherencia con la fecha límite
    let finalStatus = formData.status || 'Abierto';
    if (finalStatus !== 'Cerrado' && finalStatus !== 'Closed') {
      const todayStr = new Date().toISOString().split('T')[0];
      if (formData.dueDate && formData.dueDate < todayStr) {
        finalStatus = 'Con Retraso';
      }
    } else {
      finalStatus = 'Cerrado';
    }

    try {
      if (editingTask) { 
          const payload = { 
              ...formData, 
              status: finalStatus,
              lastUpdated: serverTimestamp(),
              updatedBy: currentUser.email 
          };
          await updateDoc(doc(db, 'expedientes', editingTask.id), payload).catch(async () => {
            await updateDoc(doc(db, 'tasks', editingTask.id), payload);
          });
          logAction('Actualizado Expediente', `Título: ${formData.title} - Estado: ${finalStatus} - Cliente: ${formData.client || 'N/A'}`);
      } else { 
          const newData = { 
              ...formData, 
              status: finalStatus,
              originalDueDate: formData.dueDate, 
              createdBy: currentUser.email, 
              createdAt: serverTimestamp(), 
              updates: [],
              updatedBy: currentUser.email 
          };
          await addDoc(collection(db, 'expedientes'), newData);
          logAction('Creado Expediente', `Título: ${formData.title} - Estado: ${finalStatus} - Cliente: ${formData.client || 'N/A'}`);
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
    if (isAdmin) setFilterScope('all');
    else setFilterScope('mine');
    setSelectedDepts([]); 
    setSelectedTypes([]); 
    setSelectedStatus([]); 
    setSearchTerm(''); 
  };

  const navigateTo = (view) => { 
    setCurrentView(view); 
    setIsMobileMenuOpen(false); 
  };

  // Pantalla de carga mientras se verifica la autorización
  if (isAuthChecking) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col justify-center items-center text-white">
        <div className="w-10 h-10 border-3 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin"></div>
        <p className="mt-4 text-xs font-semibold text-slate-400 uppercase tracking-wider">Verificando autorización en el despacho...</p>
      </div>
    );
  }

  // Pantalla de Acceso Denegado si el usuario no figura en la plantilla autorizada
  if (!isAuthorized) {
    return (
      <AccessDeniedView 
        currentUser={currentUser} 
        onSignOut={() => signOut(auth)} 
      />
    );
  }

  return (
    <EstadosContext.Provider value={estados}>
      <div className="min-h-screen font-sans text-slate-900 pb-24 antialiased selection:bg-indigo-500 selection:text-white">
      
      {/* HEADER PRINCIPAL DE GESTORÍA (SaaS Elegante & Equilibrado) */}
      <header className="bg-slate-950/95 backdrop-blur-xl text-white border-b border-slate-800/80 sticky top-0 z-40 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-2.5 relative">
          <div className="flex justify-between items-center gap-4">
            
            {/* Logo y Marca */}
            <div className="flex items-center gap-2.5 shrink-0">
              <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-violet-500 text-white shadow-sm ring-1 ring-white/10 shrink-0">
                <Briefcase className="w-4.5 h-4.5 text-white drop-shadow-xs" />
              </div>
              <div className="leading-tight">
                <h1 className="font-bold text-base tracking-tight text-white flex items-center">
                  <span>GestFlow</span>
                </h1>
                <p className="text-[10px] text-slate-400 font-medium">{t.appSubtitle}</p>
              </div>
            </div>

            {/* Menú de Navegación de Vistas */}
            <div className="hidden lg:flex items-center gap-3">
               <div className="flex bg-slate-900/90 rounded-xl p-1 border border-slate-800/80 shadow-inner gap-0.5">
                  <button onClick={() => setCurrentView('list')} className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all whitespace-nowrap ${currentView === 'list' ? 'bg-gradient-to-r from-indigo-600 to-indigo-500 text-white shadow-xs' : 'text-slate-400 hover:text-white hover:bg-slate-800/50'}`}><LayoutList className="w-3.5 h-3.5"/> {t.views.expedientes}</button>
                  <button onClick={() => setCurrentView('plan')} className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all whitespace-nowrap ${currentView === 'plan' ? 'bg-gradient-to-r from-indigo-600 to-indigo-500 text-white shadow-xs' : 'text-slate-400 hover:text-white hover:bg-slate-800/50'}`}><BarChart3 className="w-3.5 h-3.5"/> {t.views.plan}</button>
                  <button onClick={() => setCurrentView('roadmap')} className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all whitespace-nowrap ${currentView === 'roadmap' ? 'bg-gradient-to-r from-indigo-600 to-indigo-500 text-white shadow-xs' : 'text-slate-400 hover:text-white hover:bg-slate-800/50'}`}><CalendarCheck className="w-3.5 h-3.5"/> {t.views.vencimientos}</button>
                  <button onClick={() => setCurrentView('gtd')} className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all whitespace-nowrap ${currentView === 'gtd' ? 'bg-gradient-to-r from-indigo-600 to-indigo-500 text-white shadow-xs' : 'text-slate-400 hover:text-white hover:bg-slate-800/50'}`}><Target className="w-3.5 h-3.5"/> {t.views.gtd}</button>
                  <button onClick={() => setCurrentView('clientes')} className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all whitespace-nowrap ${currentView === 'clientes' ? 'bg-gradient-to-r from-indigo-600 to-indigo-500 text-white shadow-xs' : 'text-slate-400 hover:text-white hover:bg-slate-800/50'}`}><Building2 className="w-3.5 h-3.5"/> {t.views.clientes}</button>
                  <button onClick={() => setCurrentView('billing')} className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all whitespace-nowrap ${currentView === 'billing' ? 'bg-gradient-to-r from-indigo-600 to-indigo-500 text-white shadow-xs' : 'text-slate-400 hover:text-white hover:bg-slate-800/50'}`}><Coins className="w-3.5 h-3.5"/> {t.views.facturacion}</button>
                  <button onClick={() => setCurrentView('analytics')} className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all whitespace-nowrap ${currentView === 'analytics' ? 'bg-gradient-to-r from-indigo-600 to-indigo-500 text-white shadow-xs' : 'text-slate-400 hover:text-white hover:bg-slate-800/50'}`}><PieChart className="w-3.5 h-3.5"/> {t.views.informes}</button>
                  {isAdmin && (<button onClick={() => setCurrentView('admin')} className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all whitespace-nowrap ${currentView === 'admin' ? 'bg-gradient-to-r from-indigo-600 to-indigo-500 text-white shadow-xs' : 'text-slate-400 hover:text-white hover:bg-slate-800/50'}`}><Database className="w-3.5 h-3.5"/> {t.views.admin}</button>)}
               </div>

               {/* Conmutador de Idioma Bilingüe [ CA | ES ] */}
               <div className="flex items-center bg-slate-900/90 rounded-xl p-0.5 border border-slate-800 shadow-inner">
                 <button
                   type="button"
                   onClick={() => setLang('ca')}
                   className={`px-2 py-1 rounded-lg text-xs font-bold transition-all ${
                     lang === 'ca'
                       ? 'bg-indigo-600 text-white shadow-xs'
                       : 'text-slate-400 hover:text-white'
                   }`}
                   title="Canviar idioma a Català"
                 >
                   CA
                 </button>
                 <button
                   type="button"
                   onClick={() => setLang('es')}
                   className={`px-2 py-1 rounded-lg text-xs font-bold transition-all ${
                     lang === 'es'
                       ? 'bg-indigo-600 text-white shadow-xs'
                       : 'text-slate-400 hover:text-white'
                   }`}
                   title="Cambiar idioma a Castellano"
                 >
                   ES
                 </button>
               </div>

               <NotificationDropdown tasks={tasks} currentUser={currentUser} onOpenTask={handleOpenEdit} />
               
               {/* User Avatar Pill */}
               <div className="flex items-center gap-2 pl-2 border-l border-slate-800 shrink-0">
                 <div className="flex items-center gap-2 bg-slate-900/80 px-2.5 py-1 rounded-full border border-slate-800 shadow-inner">
                   <div className="w-6 h-6 rounded-full bg-gradient-to-tr from-indigo-500 to-violet-600 flex items-center justify-center text-[10px] font-bold text-white uppercase ring-1 ring-white/20">
                     {currentUser?.email ? currentUser.email.charAt(0) : 'U'}
                   </div>
                   <span className="text-xs font-medium text-slate-300 max-w-[130px] truncate">{currentUser?.email}</span>
                   <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]" title={t.userMenu.online}></span>
                 </div>
                 
                 <button onClick={() => signOut(auth)} className="bg-slate-900/80 hover:bg-rose-500/20 text-slate-400 hover:text-rose-300 p-2 rounded-xl border border-slate-800 hover:border-rose-500/30 transition-all cursor-pointer" title={t.userMenu.logout}>
                   <LogOut className="w-4 h-4"/>
                 </button>
               </div>
            </div>

            {/* Menú Móvil */}
            <div className="lg:hidden flex items-center gap-2">
                {/* Conmutador de idioma en cabecera móvil */}
                <div className="flex items-center bg-slate-900/90 rounded-lg p-0.5 border border-slate-800">
                  <button
                    type="button"
                    onClick={() => setLang('ca')}
                    className={`px-2 py-0.5 rounded text-[11px] font-bold ${lang === 'ca' ? 'bg-indigo-600 text-white' : 'text-slate-400'}`}
                    title="Català"
                  >
                    CA
                  </button>
                  <button
                    type="button"
                    onClick={() => setLang('es')}
                    className={`px-2 py-0.5 rounded text-[11px] font-bold ${lang === 'es' ? 'bg-indigo-600 text-white' : 'text-slate-400'}`}
                    title="Castellano"
                  >
                    ES
                  </button>
                </div>

                <NotificationDropdown tasks={tasks} currentUser={currentUser} onOpenTask={handleOpenEdit} />
                <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="p-2 text-slate-300 hover:text-white hover:bg-slate-800 rounded-xl border border-slate-800">{isMobileMenuOpen ? <X className="w-5 h-5"/> : <Menu className="w-5 h-5"/>}</button>
            </div>
          </div>

          {isMobileMenuOpen && (
              <div className="lg:hidden absolute top-full left-0 w-full bg-slate-900/95 backdrop-blur-xl shadow-2xl border-b border-slate-800 z-50 animate-in slide-in-from-top-3 duration-200">
                  <div className="p-4 flex flex-col gap-1.5">
                      <button onClick={() => navigateTo('list')} className={`p-2.5 rounded-xl flex items-center gap-3 text-xs font-semibold ${currentView === 'list' ? 'bg-indigo-600 text-white' : 'text-slate-300 hover:bg-slate-800'}`}><LayoutList className="w-4 h-4"/> {t.views.expedientes}</button>
                      <button onClick={() => navigateTo('plan')} className={`p-2.5 rounded-xl flex items-center gap-3 text-xs font-semibold ${currentView === 'plan' ? 'bg-indigo-600 text-white' : 'text-slate-300 hover:bg-slate-800'}`}><BarChart3 className="w-4 h-4"/> {t.views.plan}</button>
                      <button onClick={() => navigateTo('roadmap')} className={`p-2.5 rounded-xl flex items-center gap-3 text-xs font-semibold ${currentView === 'roadmap' ? 'bg-indigo-600 text-white' : 'text-slate-300 hover:bg-slate-800'}`}><CalendarCheck className="w-4 h-4"/> {t.views.vencimientos}</button>
                      <button onClick={() => navigateTo('gtd')} className={`p-2.5 rounded-xl flex items-center gap-3 text-xs font-semibold ${currentView === 'gtd' ? 'bg-indigo-600 text-white' : 'text-slate-300 hover:bg-slate-800'}`}><Target className="w-4 h-4"/> {t.views.gtd}</button>
                      <button onClick={() => navigateTo('clientes')} className={`p-2.5 rounded-xl flex items-center gap-3 text-xs font-semibold ${currentView === 'clientes' ? 'bg-indigo-600 text-white' : 'text-slate-300 hover:bg-slate-800'}`}><Building2 className="w-4 h-4"/> {t.views.clientes}</button>
                      <button onClick={() => navigateTo('billing')} className={`p-2.5 rounded-xl flex items-center gap-3 text-xs font-semibold ${currentView === 'billing' ? 'bg-indigo-600 text-white' : 'text-slate-300 hover:bg-slate-800'}`}><Coins className="w-4 h-4"/> {t.views.facturacion}</button>
                      <button onClick={() => navigateTo('analytics')} className={`p-2.5 rounded-xl flex items-center gap-3 text-xs font-semibold ${currentView === 'analytics' ? 'bg-indigo-600 text-white' : 'text-slate-300 hover:bg-slate-800'}`}><PieChart className="w-4 h-4"/> {t.views.informes}</button>
                      {isAdmin && (<button onClick={() => navigateTo('admin')} className={`p-2.5 rounded-xl flex items-center gap-3 text-xs font-semibold ${currentView === 'admin' ? 'bg-indigo-600 text-white' : 'text-slate-300 hover:bg-slate-800'}`}><Database className="w-4 h-4"/> {t.views.admin}</button>)}
                      <div className="h-px bg-slate-800 my-2"></div>
                      <div className="flex justify-between items-center p-2 text-xs text-slate-400">
                        <span className="truncate max-w-[200px]">{currentUser?.email}</span>
                        <button onClick={() => signOut(auth)} className="text-rose-400 font-semibold flex items-center gap-1 hover:text-rose-300 cursor-pointer">{t.userMenu.logout} <LogOut className="w-3.5 h-3.5"/></button>
                      </div>
                  </div>
              </div>
          )}
        </div>
      </header>

      {/* CONTENIDO PRINCIPAL */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        {currentView === 'admin' ? (
             isAdmin ? (
               <AdminView 
                 tasks={tasks} 
                 currentAdmin={currentUser.email} 
                 logAction={logAction} 
                 onNavigateToClientes={() => setCurrentView('clientes')} 
                 clientesCount={clientes.length} 
                 areas={areas}
                 tramos={tramos}
                 estados={estados}
                 currentUser={currentUser}
                 usersList={usersList}
                 billingSettings={billingSettings}
                 lang={lang}
               />
             ) : (
               <ClientesView 
                  clientes={clientes} 
                  tasks={tasks} 
                  currentUser={currentUser} 
                  logAction={logAction} 
                  onBackToAdmin={() => setCurrentView('list')}
                  onNavigateToClientExpedientes={(nifOrName) => {
                    setSearchTerm(nifOrName);
                    setCurrentView('list');
                  }}
                  isAdmin={false}
               />
             )
        ) : currentView === 'clientes' ? (
             <ClientesView 
                clientes={clientes} 
                tasks={tasks} 
                currentUser={currentUser} 
                logAction={logAction} 
                onBackToAdmin={() => setCurrentView(isAdmin ? 'admin' : 'list')}
                onNavigateToClientExpedientes={(nifOrName) => {
                  setSearchTerm(nifOrName);
                  setCurrentView('list');
                }}
                isAdmin={isAdmin}
             />
        ) : currentView === 'billing' ? (
             <BillingView 
                tasks={tasks}
                currentUser={currentUser}
                onEditTask={handleOpenEdit}
                logAction={logAction}
                clientes={clientes}
                billingSettings={billingSettings}
                lang={lang}
             />
        ) : (
          <>
            {/* BARRA DE FILTROS Y BÚSQUEDA */}
            <div className="bg-white/90 backdrop-blur-md rounded-2xl shadow-premium border border-slate-200/80 p-3.5 mb-6 relative z-20">
              <div className="flex flex-col lg:flex-row gap-3 justify-between items-center w-full">
                
                {/* Ámbito: Solo los administradores pueden ver todos los expedientes */}
                {isAdmin ? (
                  <div className="flex bg-slate-100/80 p-1 rounded-xl shrink-0 border border-slate-200/70">
                    <button onClick={() => setFilterScope('mine')} className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${filterScope === 'mine' ? 'bg-white text-indigo-700 shadow-2xs border border-slate-200/50' : 'text-slate-500 hover:text-slate-900'}`}>{t.filters.myExpedientes}</button>
                    <button onClick={() => setFilterScope('all')} className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${filterScope === 'all' ? 'bg-white text-indigo-700 shadow-2xs border border-slate-200/50' : 'text-slate-500 hover:text-slate-900'}`}>{t.filters.allExpedientes}</button>
                  </div>
                ) : (
                  <div className="flex items-center gap-1.5 bg-indigo-50/90 text-indigo-700 px-3 py-1.5 rounded-xl border border-indigo-100 text-xs font-bold shrink-0">
                    <User className="w-3.5 h-3.5 text-indigo-600" />
                    <span>{t.filters.myExpedientes}</span>
                  </div>
                )}

                {/* Filtros Dropdowns y Buscador Dinámicos */}
                <div className="flex flex-wrap items-center gap-2 flex-1 w-full">
                  <MultiSelectDropdown label={t.filters.areas} icon={Briefcase} options={dynamicDepartments} selected={selectedDepts} onChange={setSelectedDepts} />
                  <MultiSelectDropdown label={t.filters.tramites} icon={Tag} options={dynamicTypes} selected={selectedTypes} onChange={setSelectedTypes} />
                  <MultiSelectDropdown label={t.filters.estados} icon={Filter} options={dynamicStatus} selected={selectedStatus} onChange={setSelectedStatus} />
                  
                  {currentView !== 'analytics' && (
                    <button
                      onClick={() => setHideCompleted(!hideCompleted)}
                      className={`p-2 rounded-xl border flex items-center justify-center transition-all cursor-pointer ${hideCompleted ? 'bg-indigo-50/80 border-indigo-200 text-indigo-600 shadow-2xs' : 'bg-white border-slate-200/80 text-slate-400 hover:text-slate-700 hover:bg-slate-50'}`}
                      title={hideCompleted ? t.filters.showCompleted : t.filters.hideCompleted}
                    >
                      {hideCompleted ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  )}

                  <div className="relative flex-1 min-w-[200px]">
                    <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400"/>
                    <input type="text" placeholder={t.filters.searchPlaceholder} value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full pl-9 pr-3 py-2 bg-slate-50/80 border border-slate-200/80 rounded-xl text-xs outline-none focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-slate-800 placeholder-slate-400"/>
                  </div>
                </div>

                {/* Botones de Acción */}
                <div className="flex items-center gap-2 shrink-0">
                  <button onClick={() => exportToExcel(filteredTasks)} className="bg-white hover:bg-emerald-50/60 text-emerald-700 border border-emerald-200/80 px-3.5 py-2 rounded-xl text-xs font-semibold shadow-2xs hover:shadow-xs flex items-center gap-1.5 transition-all cursor-pointer">
                    <FileSpreadsheet className="w-4 h-4 text-emerald-600" /> <span className="hidden sm:inline">{t.filters.exportExcel}</span>
                  </button>
                  <button onClick={handleOpenNew} className="bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-600 text-white px-4 py-2 rounded-xl text-xs font-bold shadow-xs hover:shadow-premium-hover flex items-center gap-1.5 transition-all transform active:scale-95 cursor-pointer">
                    <Plus className="w-4 h-4" /> <span>{t.filters.newExpediente}</span>
                  </button>
                </div>
              </div>

              {(selectedDepts.length > 0 || selectedTypes.length > 0 || selectedStatus.length > 0 || searchTerm) && (
                <div className="mt-3 flex items-center gap-2 text-xs pt-2.5 border-t border-slate-100">
                  <span className="text-slate-400 font-medium">{t.filters.activeFilters}</span>
                  <button onClick={clearAllFilters} className="text-rose-600 hover:text-rose-700 hover:underline font-bold transition-colors cursor-pointer">{t.filters.clearAll}</button>
                </div>
              )}
            </div>

            {/* VISTAS */}
            {currentView === 'list' && <ListView tasks={filteredTasks} onEdit={handleOpenEdit} lang={lang} />}
            {currentView === 'plan' && <AnnualPlanView tasks={filteredTasks} currentUser={currentUser} onEdit={handleOpenEdit} />}
            {currentView === 'analytics' && <AnalyticsView tasks={filteredTasks} onEdit={handleOpenEdit} />}
            {currentView === 'roadmap' && <RoadmapView tasks={filteredTasks} onEdit={handleOpenEdit} />}
            {currentView === 'gtd' && (
              <GTDView 
                tasks={filteredTasks} 
                currentUser={currentUser} 
                onEditParent={handleOpenEdit} 
                isAdmin={isAdmin}
                usersList={usersList}
              />
            )}
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
        clientes={clientes}
        areas={areas}
        tramos={tramos}
        estados={estados}
        plantillas={plantillas}
        gtdAssignees={gtdAssignees}
        saveGtdAssignee={saveGtdAssignee}
        billingSettings={billingSettings}
        logAction={logAction}
        lang={lang}
      />
    </div>
    </EstadosContext.Provider>
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