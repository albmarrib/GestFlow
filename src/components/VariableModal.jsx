import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Zap,
  X,
  Briefcase,
  Tag,
  UserCheck,
  Coins,
  CalendarDays,
  Trash2,
  Check,
  Lock,
  Sparkles,
  FileText,
  ChevronDown
} from 'lucide-react';
import ClientAutocomplete from './ClientAutocomplete';
import DynamicClassificationSelect from './DynamicClassificationSelect';
import { translations } from '../i18n/translations';

export default function VariableModal({
  show,
  onClose,
  task = null,
  tasks = [],
  clientes = [],
  areas = [],
  tramos = [],
  usersList = [],
  currentUser,
  variablesCatalog = [],
  onSaveVariable,
  onDelete,
  onDeleteCatalogItem,
  fallbackDepartments = [],
  fallbackTypes = [],
  isAdmin = false,
  lang = 'ca'
}) {
  const isCa = lang === 'ca';
  const t = translations[lang] || translations.ca;
  const dropdownRef = useRef(null);

  const [formState, setFormState] = useState({
    title: '',
    client: '',
    clientNif: '',
    clientRazonSocial: '',
    isProvisionalClient: false,
    department: '',
    type: '',
    status: 'Abierto',
    dueDate: new Date().toISOString().split('T')[0],
    assignee: '',
    feeAmount: '',
    billingStatus: 'pending',
    description: ''
  });

  const [showCatalogDropdown, setShowCatalogDropdown] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const teamOptions = useMemo(() => {
    const list = (usersList || [])
      .map(u => ({
        email: (u?.email || '').trim(),
        label: u?.name ? `${u.name} (${u.email})` : (u?.email || '')
      }))
      .filter(u => u.email);
    const curEmail = (currentUser?.email || '').trim();
    if (curEmail && !list.some(u => u.email.toLowerCase() === curEmail.toLowerCase())) {
      list.unshift({ email: curEmail, label: curEmail });
    }
    return list;
  }, [usersList, currentUser]);

  useEffect(() => {
    if (!show) return;
    const defaultArea = areas[0]?.nombre || fallbackDepartments[0] || 'Laboral y Seguridad Social';
    const defaultTramo = tramos[0]?.nombre || fallbackTypes[0] || 'Trámite Administrativo';
    const defaultAssignee = currentUser?.email || teamOptions[0]?.email || '';

    if (task) {
      const firstActionAssignee = Array.isArray(task.actions) && task.actions[0]?.assignee
        ? task.actions[0].assignee
        : '';
      const taskAssignee = Array.isArray(task.assignees) && task.assignees[0]
        ? task.assignees[0]
        : (task.assigneeEmail || firstActionAssignee || defaultAssignee);

      const rawBillingStatus = task.billingStatus === 'paid' ? 'invoiced' : (task.billingStatus || 'pending');
      setFormState({
        title: task.title || '',
        client: task.client || '',
        clientNif: task.clientNif || '',
        clientRazonSocial: task.clientRazonSocial || '',
        isProvisionalClient: Boolean(task.isProvisionalClient),
        department: task.department || task.area || defaultArea,
        type: task.type || task.tramo || defaultTramo,
        status: task.status || 'Abierto',
        dueDate: task.dueDate || new Date().toISOString().split('T')[0],
        assignee: taskAssignee,
        feeAmount: task.feeAmount !== undefined && task.feeAmount !== null ? String(task.feeAmount) : '',
        billingStatus: rawBillingStatus,
        description: task.description || ''
      });
    } else {
      setFormState({
        title: '',
        client: '',
        clientNif: '',
        clientRazonSocial: '',
        isProvisionalClient: false,
        department: defaultArea,
        type: defaultTramo,
        status: 'Abierto',
        dueDate: new Date().toISOString().split('T')[0],
        assignee: defaultAssignee,
        feeAmount: '',
        billingStatus: 'pending',
        description: ''
      });
    }
    setShowCatalogDropdown(false);
  }, [show, task, areas, tramos, fallbackDepartments, fallbackTypes, currentUser, teamOptions]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setShowCatalogDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filteredCatalog = useMemo(() => {
    const q = (formState.title || '').toLowerCase().trim();
    if (!q) return variablesCatalog;
    return (variablesCatalog || []).filter(item =>
      (item.name || '').toLowerCase().includes(q) ||
      (item.description || '').toLowerCase().includes(q)
    );
  }, [variablesCatalog, formState.title]);

  const isClientOfficial = useMemo(() => {
    const formNif = (formState.clientNif || '').toUpperCase().trim();
    const formClient = (formState.client || '').toLowerCase().trim();
    if (!formClient) return false;
    return (clientes || []).some(c => {
      const cNif = (c.nif || '').toUpperCase().trim();
      const cRazon = (c.razonSocial || '').toLowerCase().trim();
      if (formNif && formNif === cNif) return true;
      if (cNif && formClient.includes(cNif.toLowerCase())) return true;
      if (cRazon && formClient === cRazon) return true;
      if (`${cRazon} (${cNif.toLowerCase()})` === formClient) return true;
      return false;
    });
  }, [clientes, formState.client, formState.clientNif]);

  const isValidClient = Boolean(formState.client && formState.client.trim());

  if (!show) return null;

  const handleSelectCatalogItem = (item) => {
    setFormState(prev => ({
      ...prev,
      title: item.name || prev.title,
      feeAmount: item.defaultPrice !== undefined && item.defaultPrice !== null ? String(item.defaultPrice) : prev.feeAmount,
      description: item.description || prev.description,
      department: item.department || prev.department,
      type: item.type || prev.type
    }));
    setShowCatalogDropdown(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formState.title.trim()) {
      alert(isCa ? 'Introdueix el nom de la variable.' : 'Introduce el nombre de la variable.');
      return;
    }
    if (!isValidClient) {
      alert(isCa ? 'Selecciona o indica un client per a la variable.' : 'Selecciona o indica un cliente para la variable.');
      return;
    }

    const numericFee = parseFloat(String(formState.feeAmount || '0').replace(',', '.'));
    const safeFee = isNaN(numericFee) || numericFee < 0 ? 0 : Math.round(numericFee * 100) / 100;

    setIsSaving(true);
    try {
      await onSaveVariable({
        ...formState,
        title: formState.title.trim(),
        feeAmount: safeFee,
        isProvisionalClient: !isClientOfficial
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-sm p-3 sm:p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl max-h-[92vh] flex flex-col overflow-hidden border border-slate-200 animate-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-5 py-3.5 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-teal-50/80 via-white to-slate-50 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-teal-600 text-white flex items-center justify-center shadow-xs">
              <Zap className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 leading-tight">
                {task
                  ? (isCa ? 'Editar Variable (Tasca Directa)' : 'Editar Variable (Tarea Directa)')
                  : (isCa ? 'Nova Variable / Actuació Directa' : 'Nueva Variable / Actuación Directa')}
              </h3>
              <p className="text-[10px] text-slate-500">
                {isCa
                  ? "Pas únic en GTD, Venciments, Plan Fiscal i Pressupostos. Les variables lliures es desen al catàleg."
                  : "Paso único en GTD, Vencimientos, Plan Fiscal y Presupuestos. Las variables libres se guardan en catálogo."}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            {task && isAdmin && onDelete && (
              <button
                type="button"
                onClick={() => onDelete(task.id)}
                className="text-[11px] bg-rose-50 hover:bg-rose-100 text-rose-600 px-2.5 py-1 rounded-full font-semibold border border-rose-200 flex items-center gap-1 cursor-pointer"
                title={isCa ? 'Eliminar variable' : 'Eliminar variable'}
              >
                <Trash2 className="w-3 h-3" />
                <span className="hidden sm:inline">{isCa ? 'Eliminar' : 'Eliminar'}</span>
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="w-7 h-7 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 flex items-center justify-center cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Form Body + Footer */}
        <form onSubmit={handleSubmit} className="flex-1 flex flex-col min-h-0">
          <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-2.5">
            {/* Variable Name Combobox (1 único campo con flecha desplegable) + Precio */}
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-2.5 items-start">
              <div className="relative sm:col-span-3" ref={dropdownRef}>
                <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wide flex items-center gap-1 mb-1">
                  <Sparkles className="w-3 h-3 text-teal-600" />
                  <span>{isCa ? 'Variable / Concepte *' : 'Variable / Concepto *'}</span>
                </label>

                <div className="relative flex items-center">
                  <input
                    required
                    value={formState.title}
                    onFocus={() => {
                      if (variablesCatalog.length > 0) setShowCatalogDropdown(true);
                    }}
                    onChange={(e) => {
                      setFormState(prev => ({ ...prev, title: e.target.value }));
                      if (variablesCatalog.length > 0) setShowCatalogDropdown(true);
                    }}
                    placeholder={isCa ? 'Escriu una variable o desplega el catàleg...' : 'Escribe una variable o despliega el catálogo...'}
                    className="w-full border border-slate-300 py-1.5 pl-3 pr-8 rounded-xl focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none font-semibold text-xs text-slate-800"
                  />
                  {variablesCatalog.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setShowCatalogDropdown(prev => !prev)}
                      className="absolute right-1.5 top-1/2 -translate-y-1/2 w-6 h-6 rounded-lg text-slate-400 hover:text-teal-700 hover:bg-teal-50 flex items-center justify-center cursor-pointer transition-colors"
                      title={isCa ? 'Mostrar / ocultar catàleg' : 'Mostrar / ocultar catálogo'}
                    >
                      <ChevronDown className={`w-4 h-4 transition-transform ${showCatalogDropdown ? 'rotate-180 text-teal-600' : ''}`} />
                    </button>
                  )}
                </div>

                {showCatalogDropdown && filteredCatalog.length > 0 && (
                  <div className="absolute left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-xl z-40 max-h-52 overflow-y-auto divide-y divide-slate-100">
                    <div className="px-3 py-1 bg-slate-50 text-[10px] font-bold text-slate-500 uppercase tracking-wider flex justify-between">
                      <span>{isCa ? 'Catàleg (tria o escriu una nova)' : 'Catálogo (elige o escribe una libre)'}</span>
                      <span>{isCa ? 'Preu ref.' : 'Precio ref.'}</span>
                    </div>
                    {filteredCatalog.map(item => (
                      <div
                        key={item.id}
                        onMouseDown={(e) => {
                          e.preventDefault();
                          handleSelectCatalogItem(item);
                        }}
                        className="px-3 py-2 hover:bg-teal-50/70 cursor-pointer flex items-center justify-between gap-2 group"
                      >
                        <div className="min-w-0 flex-1">
                          <div className="text-xs font-bold text-slate-800 truncate">{item.name}</div>
                          {item.description && (
                            <div className="text-[10px] text-slate-500 truncate">{item.description}</div>
                          )}
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="text-xs font-extrabold text-teal-700 bg-teal-50 px-2 py-0.5 rounded-md border border-teal-200">
                            {Number(item.defaultPrice || 0).toFixed(2)} €
                          </span>
                          {isAdmin && onDeleteCatalogItem && (
                            <button
                              type="button"
                              onMouseDown={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                onDeleteCatalogItem(item);
                              }}
                              className="text-slate-300 hover:text-rose-600 p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                              title={isCa ? 'Treure del catàleg' : 'Quitar del catálogo'}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="sm:col-span-1">
                <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wide flex items-center gap-1 mb-1">
                  <Coins className="w-3 h-3 text-teal-600" />
                  <span>{isCa ? 'Preu (€)' : 'Precio (€)'}</span>
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  value={formState.feeAmount}
                  onChange={(e) => setFormState(prev => ({ ...prev, feeAmount: e.target.value }))}
                  className="w-full border border-slate-300 py-1.5 px-2.5 rounded-xl text-xs font-extrabold text-slate-900 bg-white outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>
            </div>

            {/* Client */}
            <div>
              <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wide block mb-1">
                {t.expedienteModal.clientLabel} <span className="text-rose-500">*</span>
              </label>
              <ClientAutocomplete
                clientes={clientes}
                tasks={tasks}
                value={formState.client}
                selectedNif={formState.clientNif}
                isProvisional={Boolean(formState.client && !isClientOfficial)}
                onChange={(selected) => {
                  if (selected) {
                    if (selected.isProvisional) {
                      setFormState(prev => ({
                        ...prev,
                        client: selected.razonSocial,
                        clientNif: '',
                        clientRazonSocial: selected.razonSocial,
                        isProvisionalClient: true
                      }));
                    } else {
                      setFormState(prev => ({
                        ...prev,
                        client: `${selected.razonSocial} (${selected.nif})`,
                        clientNif: selected.nif,
                        clientRazonSocial: selected.razonSocial,
                        isProvisionalClient: false
                      }));
                    }
                  } else {
                    setFormState(prev => ({
                      ...prev,
                      client: '',
                      clientNif: '',
                      clientRazonSocial: '',
                      isProvisionalClient: false
                    }));
                  }
                }}
                error={false}
                lang={lang}
              />
            </div>

            {/* Area & Tramo */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <DynamicClassificationSelect
                label={t.expedienteModal.areaLabel}
                icon={Briefcase}
                value={formState.department}
                onChange={(val) => setFormState(prev => ({ ...prev, department: val }))}
                items={areas}
                fallbackOptions={fallbackDepartments}
                placeholder={t.expedienteModal.areaPlaceholder}
                name="area"
                lang={lang}
                category="areas"
              />
              <DynamicClassificationSelect
                label={t.expedienteModal.tramoLabel}
                icon={Tag}
                value={formState.type}
                onChange={(val) => setFormState(prev => ({ ...prev, type: val }))}
                items={tramos}
                fallbackOptions={fallbackTypes}
                placeholder={t.expedienteModal.tramoPlaceholder}
                name="tramo"
                lang={lang}
                category="tramos"
              />
            </div>

            {/* DueDate, Assignee, Status */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              <div>
                <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wide flex items-center gap-1 mb-0.5">
                  <CalendarDays className="w-3 h-3 text-slate-400" />
                  {t.expedienteModal.dueDateLabel}
                </label>
                <input
                  type="date"
                  value={formState.dueDate}
                  onChange={(e) => setFormState(prev => ({ ...prev, dueDate: e.target.value }))}
                  className="w-full border border-slate-300 py-1.5 px-2.5 rounded-lg text-xs font-medium text-slate-800 outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wide flex items-center gap-1 mb-0.5">
                  <UserCheck className="w-3 h-3 text-slate-400" />
                  {isCa ? 'Assignat GTD' : 'Asignado GTD'}
                </label>
                <select
                  value={formState.assignee}
                  onChange={(e) => setFormState(prev => ({ ...prev, assignee: e.target.value }))}
                  className="w-full border border-slate-300 py-1.5 px-2 rounded-lg text-xs font-semibold text-slate-800 bg-white outline-none focus:ring-2 focus:ring-teal-500 cursor-pointer"
                >
                  {teamOptions.map(u => (
                    <option key={u.email} value={u.email}>{u.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wide block mb-0.5">
                  {t.expedienteModal.statusLabel}
                </label>
                <select
                  value={formState.status}
                  onChange={(e) => setFormState(prev => ({ ...prev, status: e.target.value }))}
                  className="w-full border border-slate-300 py-1.5 px-2 rounded-lg text-xs font-bold text-slate-800 bg-white outline-none focus:ring-2 focus:ring-teal-500 cursor-pointer"
                >
                  <option value="Abierto">{t.expedienteModal.statusOptions.abierto}</option>
                  <option value="En Riesgo">{t.expedienteModal.statusOptions.enRiesgo}</option>
                  <option value="Con Retraso">{t.expedienteModal.statusOptions.conRetraso}</option>
                  <option value="Cerrado">{t.expedienteModal.statusOptions.cerrado}</option>
                </select>
              </div>
            </div>

            {/* Brief description */}
            <div>
              <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wide flex items-center gap-1 mb-1">
                <FileText className="w-3 h-3 text-slate-400" />
                {isCa ? 'Descripció breu' : 'Descripción breve'}
              </label>
              <textarea
                rows={2}
                value={formState.description}
                onChange={(e) => setFormState(prev => ({ ...prev, description: e.target.value }))}
                placeholder={isCa ? 'Breu detall del concepte o indicació...' : 'Breve detalle del concepto o indicación...'}
                className="w-full border border-slate-300 p-2 rounded-xl text-xs text-slate-800 outline-none focus:ring-2 focus:ring-teal-500 resize-none"
              />
            </div>
          </div>

          {/* Sticky Bottom Buttons */}
          <div className="px-5 py-3 border-t border-slate-100 bg-white flex gap-2 shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2 border border-slate-300 text-slate-700 rounded-xl hover:bg-slate-50 font-semibold text-xs cursor-pointer transition-colors"
            >
              {isCa ? 'Cancel·lar' : 'Cancelar'}
            </button>
            <button
              type="submit"
              disabled={!isValidClient || isSaving}
              className={`flex-1 py-2 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-all ${
                isValidClient && !isSaving
                  ? 'bg-teal-600 hover:bg-teal-700 text-white shadow-sm cursor-pointer'
                  : 'bg-slate-200 text-slate-400 cursor-not-allowed'
              }`}
            >
              {!isValidClient ? <Lock className="w-3.5 h-3.5" /> : <Check className="w-3.5 h-3.5" />}
              {isSaving
                ? (isCa ? 'Desant...' : 'Guardando...')
                : task
                  ? (isCa ? 'Desar Variable' : 'Guardar Variable')
                  : (isCa ? 'Crear Variable' : 'Crear Variable')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
