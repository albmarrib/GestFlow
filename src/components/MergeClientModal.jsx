import React, { useState } from 'react';
import { GitMerge, Building2, UserPlus, X, AlertTriangle, Check, Search, ArrowRight, Loader2 } from 'lucide-react';
import { db } from '../firebase';
import { collection, writeBatch, doc, serverTimestamp } from 'firebase/firestore';
import { translations } from '../i18n/translations';

/**
 * Modal para Formalizar o Fusionar Clientes Provisionales
 * Permite reasignar expedientes creados sin cliente oficial
 * a un cliente registrado o abrir el alta oficial directamente.
 */
const MergeClientModal = ({
  show,
  onClose,
  provisionalClientName,
  tasks = [],
  clientes = [],
  currentUser,
  logAction,
  onOpenCreateOfficialClient,
  onSuccess,
  lang = 'ca'
}) => {
  const t = translations[lang] || translations.ca;
  const isCa = lang === 'ca';

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTargetClient, setSelectedTargetClient] = useState(null);
  const [isMerging, setIsMerging] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  if (!show || !provisionalClientName) return null;

  // Filtrar expedientes vinculados a este cliente provisional
  const cleanName = provisionalClientName.trim().toLowerCase();
  const linkedTasks = tasks.filter(task => {
    if (!task.client) return false;
    return task.client.trim().toLowerCase() === cleanName || 
           task.client.trim().toLowerCase() === `${cleanName} (provisional)`;
  });

  // Filtrar clientes oficiales para fusionar
  const filteredOfficialClients = clientes.filter(c => {
    if (!searchTerm.trim()) return true;
    const term = searchTerm.toLowerCase().trim();
    return (c.razonSocial || '').toLowerCase().includes(term) ||
           (c.nif || '').toLowerCase().includes(term) ||
           (c.nombreComercial || '').toLowerCase().includes(term);
  }).slice(0, 15);

  // Ejecutar fusión hacia el cliente oficial seleccionado
  const handleExecuteMerge = async () => {
    if (!selectedTargetClient) {
      setErrorMsg(isCa ? 'Selecciona un client oficial per a la fusió.' : 'Selecciona un cliente oficial para la fusión.');
      return;
    }

    if (linkedTasks.length === 0) {
      setErrorMsg(isCa ? 'No s\'han trobat expedients per actualitzar.' : 'No se encontraron expedientes para actualizar.');
      return;
    }

    setIsMerging(true);
    setErrorMsg('');

    try {
      const batch = writeBatch(db);
      const targetLabel = `${selectedTargetClient.razonSocial} (${selectedTargetClient.nif})`;

      linkedTasks.forEach(task => {
        const docRef = doc(db, 'expedientes', task.id);
        batch.update(docRef, {
          client: targetLabel,
          clientNif: selectedTargetClient.nif || '',
          isProvisionalClient: false,
          lastUpdated: serverTimestamp(),
          updatedBy: currentUser?.email || 'Sistema'
        });
        // Compatibilidad con colección tasks si existe
        const taskDocRef = doc(db, 'tasks', task.id);
        batch.update(taskDocRef, {
          client: targetLabel,
          clientNif: selectedTargetClient.nif || '',
          isProvisionalClient: false,
          lastUpdated: serverTimestamp(),
          updatedBy: currentUser?.email || 'Sistema'
        }).catch(() => {});
      });

      await batch.commit();

      if (logAction) {
        logAction(
          isCa ? 'Fusió de Client Provisional' : 'Fusión de Cliente Provisional',
          `Provisional "${provisionalClientName}" -> Oficial "${targetLabel}" (${linkedTasks.length} expedients)`
        );
      }

      if (onSuccess) {
        onSuccess(
          t.provisionalClient.mergeSuccess
            .replace('{count}', linkedTasks.length)
            .replace('{clientName}', selectedTargetClient.razonSocial)
        );
      }

      onClose();
    } catch (err) {
      console.error("Error en fusió de client provisional:", err);
      setErrorMsg(err.message || (isCa ? 'Error en fusionar expedients.' : 'Error al fusionar expedientes.'));
    } finally {
      setIsMerging(false);
    }
  };

  // Redirigir a formalización (abrir ClienteModal con datos prellenados)
  const handleFormalize = () => {
    onClose();
    if (onOpenCreateOfficialClient) {
      onOpenCreateOfficialClient({
        razonSocial: provisionalClientName,
        fromProvisionalName: provisionalClientName,
        linkedTasksCount: linkedTasks.length
      });
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-xl overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Cabecera */}
        <div className="p-5 border-b border-slate-100 bg-gradient-to-r from-amber-50 to-orange-50 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500 text-white flex items-center justify-center shadow-xs">
              <GitMerge className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-800 text-base">{t.provisionalClient.mergeModalTitle}</h3>
              <p className="text-xs text-slate-500">
                {t.provisionalClient.linkedExpedientes.replace('{count}', linkedTasks.length)}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-white/80 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Cuerpo del Modal */}
        <div className="p-6 space-y-5 overflow-y-auto flex-1">
          
          {/* Tarjeta de cliente provisional seleccionado */}
          <div className="p-4 bg-amber-50/80 border border-amber-200 rounded-xl flex items-start justify-between gap-3">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-amber-700 block mb-0.5">
                {t.provisionalClient.badge}
              </span>
              <h4 className="font-bold text-slate-900 text-sm">{provisionalClientName}</h4>
              <p className="text-xs text-slate-600 mt-1">
                {isCa 
                  ? `Hi ha ${linkedTasks.length} expedient(s) oberts amb aquest nom que necessiten un client oficial definitiu.`
                  : `Hay ${linkedTasks.length} expediente(s) abiertos con este nombre que necesitan un cliente oficial definitivo.`}
              </p>
            </div>
            <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-200/60 text-amber-900 shrink-0">
              {linkedTasks.length} exp.
            </span>
          </div>

          {errorMsg && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-500 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Opción 1: Formalizar como nuevo cliente oficial */}
          <div className="border border-slate-200 rounded-xl p-4 bg-slate-50/50 hover:border-indigo-200 transition-colors space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-700 uppercase tracking-wide flex items-center gap-1.5">
                <UserPlus className="w-4 h-4 text-indigo-600" />
                {isCa ? 'Opció A: Donar d\'Alta com a Nou Client' : 'Opción A: Dar de Alta como Nuevo Cliente'}
              </span>
            </div>
            <p className="text-xs text-slate-500">
              {isCa 
                ? 'Omple la fitxa fiscal (NIF, adreça, telèfon). En desar, els expedients s\'actualitzaran automàticament.' 
                : 'Rellena la ficha fiscal (NIF, dirección, teléfono). Al guardar, los expedientes se actualizarán automáticamente.'}
            </p>
            <button
              type="button"
              onClick={handleFormalize}
              className="mt-1 w-full sm:w-auto px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl transition-all shadow-xs flex items-center justify-center gap-2 cursor-pointer"
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>{t.provisionalClient.formalizeBtn}</span>
            </button>
          </div>

          {/* Opción 2: Fusionar con cliente oficial existente */}
          <div className="border border-slate-200 rounded-xl p-4 space-y-3 bg-white">
            <span className="text-xs font-bold text-slate-700 uppercase tracking-wide flex items-center gap-1.5">
              <Building2 className="w-4 h-4 text-emerald-600" />
              {isCa ? 'Opció B: Fusionar amb un Client Oficial Existent' : 'Opción B: Fusionar con un Cliente Oficial Existente'}
            </span>
            <p className="text-xs text-slate-500">
              {t.provisionalClient.mergeModalDesc.replace('{provisionalName}', provisionalClientName)}
            </p>

            {/* Buscador de cliente oficial */}
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                placeholder={isCa ? "Cercar client oficial per CIF o Nom..." : "Buscar cliente oficial por CIF o Nombre..."}
                className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-xl text-xs font-medium focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none"
              />
            </div>

            {/* Lista de clientes oficiales seleccionables */}
            <div className="max-h-48 overflow-y-auto border border-slate-200 rounded-xl divide-y divide-slate-100">
              {filteredOfficialClients.map(c => {
                const isSelected = selectedTargetClient?.id === c.id;
                return (
                  <div
                    key={c.id || c.nif}
                    onClick={() => setSelectedTargetClient(c)}
                    className={`p-2.5 cursor-pointer flex items-center justify-between text-xs transition-colors ${
                      isSelected ? 'bg-indigo-50 border-l-4 border-indigo-600 text-indigo-900 font-bold' : 'hover:bg-slate-50 text-slate-700'
                    }`}
                  >
                    <div className="min-w-0 flex-1 pr-2">
                      <div className="flex items-center gap-2">
                        <span className="truncate">{c.razonSocial}</span>
                        <span className="text-[10px] font-mono font-bold bg-slate-100 px-1.5 py-0.2 rounded text-slate-600">
                          {c.nif}
                        </span>
                      </div>
                    </div>
                    {isSelected && <Check className="w-4 h-4 text-indigo-600 shrink-0" />}
                  </div>
                );
              })}
              {filteredOfficialClients.length === 0 && (
                <div className="p-4 text-center text-xs text-slate-400">
                  {isCa ? 'No s\'han trobat clients oficials que coincideixin.' : 'No se encontraron clientes oficiales coincidentes.'}
                </div>
              )}
            </div>

            {/* Cliente seleccionado actualmente */}
            {selectedTargetClient && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between text-xs text-emerald-900 font-medium">
                <div className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>
                    {isCa ? 'Client de destí seleccionat:' : 'Cliente de destino seleccionado:'}{' '}
                    <strong>{selectedTargetClient.razonSocial}</strong> ({selectedTargetClient.nif})
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedTargetClient(null)}
                  className="text-slate-400 hover:text-slate-600 p-0.5"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Pie del Modal */}
        <div className="p-4 border-t border-slate-100 bg-slate-50 flex items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={onClose}
            disabled={isMerging}
            className="px-4 py-2 border border-slate-300 text-slate-700 text-xs font-bold rounded-xl hover:bg-white transition-colors cursor-pointer"
          >
            {t.common?.cancel || (isCa ? 'Cancel·lar' : 'Cancelar')}
          </button>

          <button
            type="button"
            onClick={handleExecuteMerge}
            disabled={!selectedTargetClient || isMerging}
            className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-xs flex items-center gap-2 transition-all disabled:opacity-50 cursor-pointer"
          >
            {isMerging ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>{t.provisionalClient.merging}</span>
              </>
            ) : (
              <>
                <GitMerge className="w-3.5 h-3.5" />
                <span>{t.provisionalClient.confirmMerge}</span>
              </>
            )}
          </button>
        </div>

      </div>
    </div>
  );
};

export default MergeClientModal;
