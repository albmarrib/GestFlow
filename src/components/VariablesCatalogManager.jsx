import React, { useState } from 'react';
import {
  Zap,
  Plus,
  Pencil,
  Trash2,
  Coins,
  Check,
  X,
  Sparkles,
  Search
} from 'lucide-react';
import { doc, setDoc, deleteDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';

const DEFAULT_VARIABLE_TEMPLATES_CA = [
  { name: 'Alta de Contracte Laboral', defaultPrice: 35, description: 'Confecció, comunicació Contrat@ i alta a la Seguretat Social.', department: 'Laboral y Seguridad Social', type: 'Nóminas y Seg. Social' },
  { name: 'Baixa de Treballador (TGSS)', defaultPrice: 25, description: 'Tramitació de baixa a Sistema RED i certificat d’empresa.', department: 'Laboral y Seguridad Social', type: 'Nóminas y Seg. Social' },
  { name: 'Obtenció i Resposta de Notificació AEAT', defaultPrice: 45, description: 'Descàrrega de notificació electrònica i resposta simple.', department: 'Fiscal / Tributario', type: 'Requerimiento / Notificación AEAT' },
  { name: 'Certificat d’Estar al Corrent (AEAT / TGSS)', defaultPrice: 20, description: 'Obtenció telemàtica de certificat oficial de situació tributària/laboral.', department: 'Fiscal / Tributario', type: 'Trámite Administrativo' },
  { name: 'Modificació Censal (Model 036/037)', defaultPrice: 40, description: 'Canvi de domicili, epígraf IAE o obligacions fiscals.', department: 'Fiscal / Tributario', type: 'Trámite Administrativo' }
];

const DEFAULT_VARIABLE_TEMPLATES_ES = [
  { name: 'Alta de Contrato Laboral', defaultPrice: 35, description: 'Confección, comunicación Contrat@ y alta en la Seguridad Social.', department: 'Laboral y Seguridad Social', type: 'Nóminas y Seg. Social' },
  { name: 'Baja de Trabajador (TGSS)', defaultPrice: 25, description: 'Tramitación de baja en Sistema RED y certificado de empresa.', department: 'Laboral y Seguridad Social', type: 'Nóminas y Seg. Social' },
  { name: 'Obtención y Respuesta de Notificación AEAT', defaultPrice: 45, description: 'Descarga de notificación electrónica y contestación simple.', department: 'Fiscal / Tributario', type: 'Requerimiento / Notificación AEAT' },
  { name: 'Certificado Estar al Corriente (AEAT / TGSS)', defaultPrice: 20, description: 'Obtención telemática de certificado oficial tributario o laboral.', department: 'Fiscal / Tributario', type: 'Trámite Administrativo' },
  { name: 'Modificación Censal (Modelo 036/037)', defaultPrice: 40, description: 'Cambio de domicilio fiscal, epígrafe IAE u obligaciones.', department: 'Fiscal / Tributario', type: 'Trámite Administrativo' }
];

export default function VariablesCatalogManager({
  variablesCatalog = [],
  areas = [],
  tramos = [],
  currentUser,
  logAction,
  lang = 'ca'
}) {
  const isCa = lang === 'ca';
  const [searchTerm, setSearchTerm] = useState('');
  const [showEditor, setShowEditor] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [isSaving, setIsSaving] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    defaultPrice: '',
    description: '',
    department: '',
    type: ''
  });

  const filteredCatalog = (variablesCatalog || []).filter(item => {
    const q = searchTerm.toLowerCase().trim();
    if (!q) return true;
    return (
      (item.name || '').toLowerCase().includes(q) ||
      (item.description || '').toLowerCase().includes(q)
    );
  });

  const openNewForm = () => {
    setEditingId(null);
    setFormData({
      name: '',
      defaultPrice: '',
      description: '',
      department: areas[0]?.nombre || '',
      type: tramos[0]?.nombre || ''
    });
    setShowEditor(true);
  };

  const openEditForm = (item) => {
    setEditingId(item.id);
    setFormData({
      name: item.name || '',
      defaultPrice: item.defaultPrice !== undefined && item.defaultPrice !== null ? String(item.defaultPrice) : '',
      description: item.description || '',
      department: item.department || '',
      type: item.type || ''
    });
    setShowEditor(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    const cleanName = formData.name.trim();
    if (!cleanName) {
      alert(isCa ? 'Introdueix el nom de la variable.' : 'Introduce el nombre de la variable.');
      return;
    }

    const numericPrice = parseFloat(String(formData.defaultPrice || '0').replace(',', '.'));
    const safePrice = isNaN(numericPrice) || numericPrice < 0 ? 0 : Math.round(numericPrice * 100) / 100;
    const docId = editingId || cleanName.toLowerCase().replace(/[^a-z0-9]/g, '_').slice(0, 60);

    setIsSaving(true);
    try {
      await setDoc(doc(db, 'variables_catalog', docId), {
        name: cleanName,
        defaultPrice: safePrice,
        description: formData.description.trim(),
        department: formData.department || '',
        type: formData.type || '',
        updatedBy: currentUser?.email || 'admin',
        updatedAt: serverTimestamp()
      }, { merge: true });

      if (logAction) {
        logAction('Plantilla de Variable', `${editingId ? 'Actualizada' : 'Creada'}: ${cleanName} (${safePrice.toFixed(2)} €)`);
      }
      setShowEditor(false);
      setEditingId(null);
    } catch (err) {
      alert((isCa ? 'Error en desar la plantilla: ' : 'Error al guardar la plantilla: ') + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (item) => {
    const msg = isCa
      ? `Segur que voleu eliminar "${item.name}" del catàleg de variables?`
      : `¿Seguro que deseas eliminar "${item.name}" del catálogo de variables?`;
    if (!window.confirm(msg)) return;
    try {
      await deleteDoc(doc(db, 'variables_catalog', item.id));
      if (logAction) {
        logAction('Eliminada Plantilla Variable', item.name);
      }
    } catch (err) {
      alert((isCa ? 'Error en eliminar: ' : 'Error al eliminar: ') + err.message);
    }
  };

  const handleLoadDefaults = async () => {
    const confirmMsg = isCa
      ? "Voleu carregar les plantilles de variables habituals (Altes, Baixes, Certificats, Notificacions) al catàleg?"
      : "¿Deseas cargar las plantillas de variables habituales (Altas, Bajas, Certificados, Notificaciones) en el catálogo?";
    if (!window.confirm(confirmMsg)) return;

    const presets = isCa ? DEFAULT_VARIABLE_TEMPLATES_CA : DEFAULT_VARIABLE_TEMPLATES_ES;
    setIsSaving(true);
    try {
      await Promise.all(presets.map(item => {
        const docId = item.name.toLowerCase().replace(/[^a-z0-9]/g, '_').slice(0, 60);
        return setDoc(doc(db, 'variables_catalog', docId), {
          ...item,
          updatedBy: currentUser?.email || 'admin',
          updatedAt: serverTimestamp()
        }, { merge: true });
      }));
      if (logAction) {
        logAction('Carga Inicial Variables', `Se cargaron ${presets.length} plantillas de variables.`);
      }
    } catch (err) {
      alert((isCa ? 'Error carregant plantilles: ' : 'Error cargando plantillas: ') + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div>
          <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <Zap className="w-4 h-4 text-teal-600" />
            <span>{isCa ? 'Catàleg de Plantilles de Variables' : 'Catálogo de Plantillas de Variables'}</span>
            <span className="text-xs font-bold bg-teal-50 text-teal-800 px-2 py-0.5 rounded-full border border-teal-200">
              {variablesCatalog.length}
            </span>
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            {isCa
              ? "Defineix actuacions ràpides amb preu i descripció predefinits. A més, qualsevol variable lliure creada pels gestors s'hi afegeix automàticament."
              : "Define actuaciones rápidas con precio y descripción predefinidos. Además, cualquier variable libre creada por los gestores se añade automáticamente."}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          {variablesCatalog.length === 0 && (
            <button
              type="button"
              onClick={handleLoadDefaults}
              disabled={isSaving}
              className="bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-600" />
              <span>{isCa ? 'Carregar Exemples' : 'Cargar Ejemplos'}</span>
            </button>
          )}
          <button
            type="button"
            onClick={openNewForm}
            className="bg-teal-600 hover:bg-teal-700 text-white px-3.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>{isCa ? 'Nova Variable' : 'Nueva Variable'}</span>
          </button>
        </div>
      </div>

      {/* Inline Editor Modal / Card */}
      {showEditor && (
        <form onSubmit={handleSave} className="bg-teal-50/40 p-4 rounded-2xl border border-teal-200 space-y-3 animate-in fade-in duration-150">
          <div className="flex justify-between items-center border-b border-teal-200/70 pb-2">
            <span className="text-xs font-extrabold text-teal-900 uppercase tracking-wide flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5 text-teal-600" />
              {editingId
                ? (isCa ? 'Editar Plantilla de Variable' : 'Editar Plantilla de Variable')
                : (isCa ? 'Nova Plantilla de Variable' : 'Nueva Plantilla de Variable')}
            </span>
            <button
              type="button"
              onClick={() => setShowEditor(false)}
              className="text-slate-400 hover:text-slate-700 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            <div className="sm:col-span-2">
              <label className="text-[11px] font-bold text-slate-700 block mb-1">
                {isCa ? 'Nom de la Variable *' : 'Nombre de la Variable *'}
              </label>
              <input
                required
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                placeholder={isCa ? 'Ex: Alta Contracte Laboral' : 'Ej: Alta Contrato Laboral'}
                className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs font-semibold bg-white outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>

            <div>
              <label className="text-[11px] font-bold text-slate-700 block mb-1">
                {isCa ? 'Preu Orientatiu (€) *' : 'Precio Orientativo (€) *'}
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                required
                placeholder="35.00"
                value={formData.defaultPrice}
                onChange={(e) => setFormData(prev => ({ ...prev, defaultPrice: e.target.value }))}
                className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs font-extrabold bg-white outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <div>
              <label className="text-[11px] font-bold text-slate-700 block mb-1">
                {isCa ? 'Àrea per defecte' : 'Área por defecto'}
              </label>
              <select
                value={formData.department}
                onChange={(e) => setFormData(prev => ({ ...prev, department: e.target.value }))}
                className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs bg-white outline-none"
              >
                <option value="">{isCa ? '-- Sense especificar --' : '-- Sin especificar --'}</option>
                {(areas || []).map(a => (
                  <option key={a.id || a.nombre} value={a.nombre}>{a.nombre}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-[11px] font-bold text-slate-700 block mb-1">
                {isCa ? 'Tràmit per defecte' : 'Trámite por defecto'}
              </label>
              <select
                value={formData.type}
                onChange={(e) => setFormData(prev => ({ ...prev, type: e.target.value }))}
                className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs bg-white outline-none"
              >
                <option value="">{isCa ? '-- Sense especificar --' : '-- Sin especificar --'}</option>
                {(tramos || []).map(t => (
                  <option key={t.id || t.nombre} value={t.nombre}>{t.nombre}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="text-[11px] font-bold text-slate-700 block mb-1">
              {isCa ? 'Descripció breu' : 'Descripción breve'}
            </label>
            <input
              type="text"
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              placeholder={isCa ? 'Breu explicació del servei inclòs...' : 'Breve explicación del servicio incluido...'}
              className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs bg-white outline-none focus:ring-2 focus:ring-teal-500"
            />
          </div>

          <div className="flex justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={() => setShowEditor(false)}
              className="px-3 py-1.5 border border-slate-300 bg-white text-slate-700 rounded-lg text-xs font-semibold hover:bg-slate-50 cursor-pointer"
            >
              {isCa ? 'Cancel·lar' : 'Cancelar'}
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="px-3.5 py-1.5 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer"
            >
              <Check className="w-3.5 h-3.5" />
              <span>{isCa ? 'Desar al Catàleg' : 'Guardar en Catálogo'}</span>
            </button>
          </div>
        </form>
      )}

      {/* Search + Catalog Grid */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs space-y-3">
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder={isCa ? 'Cercar plantilla de variable...' : 'Buscar plantilla de variable...'}
            className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:bg-white focus:ring-1 focus:ring-teal-500"
          />
        </div>

        {filteredCatalog.length === 0 ? (
          <div className="py-10 text-center text-slate-400 text-xs">
            <Zap className="w-8 h-8 text-teal-400/40 mx-auto mb-2" />
            <p className="font-semibold text-slate-600">
              {isCa ? 'Encara no hi ha plantilles de variables al catàleg.' : 'Aún no hay plantillas de variables en el catálogo.'}
            </p>
            <p className="text-[11px] mt-1">
              {isCa
                ? 'Pots crear-ne amb "+ Nova Variable" o carregar els exemples inicials.'
                : 'Puedes crear nuevas con "+ Nueva Variable" o cargar los ejemplos iniciales.'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5">
            {filteredCatalog.map(item => (
              <div
                key={item.id}
                className="p-3 rounded-xl border border-slate-200 bg-slate-50/40 hover:border-teal-300 hover:bg-white transition-all flex flex-col justify-between gap-2"
              >
                <div>
                  <div className="flex justify-between items-start gap-2">
                    <h4 className="font-bold text-xs text-slate-900 leading-snug">{item.name}</h4>
                    <span className="bg-teal-50 text-teal-800 border border-teal-200 text-[11px] font-extrabold px-2 py-0.5 rounded-md shrink-0 flex items-center gap-1">
                      <Coins className="w-3 h-3 text-teal-600" />
                      {Number(item.defaultPrice || 0).toFixed(2)} €
                    </span>
                  </div>
                  {item.description && (
                    <p className="text-[11px] text-slate-500 mt-1 line-clamp-2">{item.description}</p>
                  )}
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-slate-200/70">
                  <span className="text-[10px] text-slate-400 truncate max-w-[160px]">
                    {item.department || (isCa ? 'Sense àrea fixa' : 'Sin área fija')}
                  </span>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => openEditForm(item)}
                      className="p-1 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded cursor-pointer"
                      title={isCa ? 'Editar' : 'Editar'}
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(item)}
                      className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded cursor-pointer"
                      title={isCa ? 'Eliminar' : 'Eliminar'}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
