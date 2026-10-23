import React, { useState, useMemo } from 'react';
import { 
  collection, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  serverTimestamp, 
  writeBatch 
} from 'firebase/firestore';
import { db } from '../firebase';
import { 
  Briefcase, 
  Tag, 
  Plus, 
  Pencil, 
  Trash2, 
  Search, 
  CheckCircle2, 
  Layers, 
  AlertTriangle, 
  Sparkles, 
  FolderPlus, 
  X, 
  Loader2,
  FileSpreadsheet
} from 'lucide-react';

// Valores iniciales recomendados para el despacho si las colecciones están vacías
const DEFAULT_AREAS = [
  { nombre: 'Fiscal / Tributario', descripcion: 'Declaraciones periódicas, modelos tributarios, impuestos y AEAT' },
  { nombre: 'Contable', descripcion: 'Llevar contabilidad, legalización de libros y cuentas anuales' },
  { nombre: 'Laboral y Seguridad Social', descripcion: 'Nóminas, altas/bajas en TGSS, contratos y convenios' },
  { nombre: 'Mercantil y Societario', descripcion: 'Constitución de sociedades, modificaciones estatutarias y Registro Mercantil' },
  { nombre: 'Jurídico / Legal', descripcion: 'Asesoramiento legal, contratos mercantiles y procedimientos' },
  { nombre: 'Trámites DGT / Tráfico', descripcion: 'Transferencias de vehículos, matriculaciones y bajas DGT' },
  { nombre: 'Extranjería y Residencias', descripcion: 'Permisos de residencia, arraigos, NIE y renovaciones' },
  { nombre: 'Facturación y Cobros', descripcion: 'Emisión de facturas del despacho y control de cobros' },
  { nombre: 'Dirección / General', descripcion: 'Gestión interna y trámites transversales del despacho' }
];

const DEFAULT_TRAMOS = [
  { nombre: 'Vencimiento Fiscal', descripcion: 'Plazo oficial improrrogable con presentación telemática en AEAT' },
  { nombre: 'Cierre Contable / Libros', descripcion: 'Cierre de ejercicio, legalización de libros o depósito en Registro Mercantil' },
  { nombre: 'Nóminas y Seg. Social', descripcion: 'Envío de seguros sociales (SILTRA), contratos y confección mensual' },
  { nombre: 'Alta / Constitución', descripcion: 'Creación de empresas, altas en IAE/036/037 y trámites de inicio de actividad' },
  { nombre: 'Requerimiento / Notificación AEAT', descripcion: 'Respuesta en plazo a requerimientos de información o comprobaciones' },
  { nombre: 'Trámite Administrativo', descripcion: 'Gestiones ante organismos locales, autonómicos o registros' },
  { nombre: 'Declaración Renta (IRPF)', descripcion: 'Campaña anual de Renta y Patrimonio de personas físicas' },
  { nombre: 'Consultoría y Asesoramiento', descripcion: 'Emisión de dictámenes, informes tributarios o consultas personalizadas' },
  { nombre: 'Otro Trámite', descripcion: 'Trámites misceláneos no encuadrados en categorías anteriores' }
];

const ClassificationManager = ({
  areas = [],
  tramos = [],
  tasks = [],
  currentUser,
  logAction
}) => {
  const [activeTab, setActiveTab] = useState('areas'); // 'areas' | 'tramos'
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [formNombre, setFormNombre] = useState('');
  const [formDescripcion, setFormDescripcion] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSeeding, setIsSeeding] = useState(false);
  const [formError, setFormError] = useState('');

  const isAreas = activeTab === 'areas';
  const currentCollectionName = isAreas ? 'areas' : 'tramos';
  const currentItems = isAreas ? areas : tramos;

  // Filtrado de elementos
  const filteredItems = useMemo(() => {
    const term = searchTerm.toLowerCase().trim();
    if (!term) return currentItems;
    return currentItems.filter(item => 
      (item.nombre || item.name || '').toLowerCase().includes(term) ||
      (item.descripcion || item.description || '').toLowerCase().includes(term)
    );
  }, [currentItems, searchTerm]);

  // Contar expedientes que usan cada área o tramo
  const usageCounts = useMemo(() => {
    const counts = {};
    tasks.forEach(t => {
      if (isAreas) {
        const areaName = (t.department || t.area || '').trim();
        if (areaName) {
          counts[areaName] = (counts[areaName] || 0) + 1;
        }
      } else {
        const tramoName = (t.type || t.tramo || '').trim();
        if (tramoName) {
          counts[tramoName] = (counts[tramoName] || 0) + 1;
        }
      }
    });
    return counts;
  }, [tasks, isAreas]);

  // Abrir modal de creación
  const handleOpenCreate = () => {
    setEditingItem(null);
    setFormNombre('');
    setFormDescripcion('');
    setFormError('');
    setIsModalOpen(true);
  };

  // Abrir modal de edición
  const handleOpenEdit = (item) => {
    setEditingItem(item);
    setFormNombre(item.nombre || item.name || '');
    setFormDescripcion(item.descripcion || item.description || '');
    setFormError('');
    setIsModalOpen(true);
  };

  // Guardar (Crear o Actualizar)
  const handleSubmit = async (e) => {
    e.preventDefault();
    const cleanNombre = formNombre.trim();
    if (!cleanNombre) {
      setFormError('El nombre es obligatorio.');
      return;
    }

    // Verificar duplicados (salvo el que estamos editando)
    const exists = currentItems.some(item => 
      (item.id !== editingItem?.id) && 
      (item.nombre || item.name || '').toLowerCase() === cleanNombre.toLowerCase()
    );
    if (exists) {
      setFormError(`Ya existe un ${isAreas ? 'área' : 'tramo'} con el nombre "${cleanNombre}".`);
      return;
    }

    setIsSubmitting(true);
    setFormError('');

    try {
      if (editingItem) {
        // Actualizar
        const itemRef = doc(db, currentCollectionName, editingItem.id);
        await updateDoc(itemRef, {
          nombre: cleanNombre,
          descripcion: formDescripcion.trim(),
          updatedAt: serverTimestamp(),
          updatedBy: currentUser?.email || 'Sistema'
        });

        if (logAction) {
          logAction(
            `Actualizado ${isAreas ? 'Área' : 'Tramo'}`, 
            `Nombre: ${cleanNombre} (ID: ${editingItem.id})`
          );
        }
      } else {
        // Crear nuevo
        await addDoc(collection(db, currentCollectionName), {
          nombre: cleanNombre,
          descripcion: formDescripcion.trim(),
          activo: true,
          createdAt: serverTimestamp(),
          createdBy: currentUser?.email || 'Sistema',
          updatedAt: serverTimestamp(),
          updatedBy: currentUser?.email || 'Sistema'
        });

        if (logAction) {
          logAction(
            `Creado ${isAreas ? 'Área' : 'Tramo'}`, 
            `Nombre: ${cleanNombre}`
          );
        }
      }

      setIsModalOpen(false);
      setEditingItem(null);
      setFormNombre('');
      setFormDescripcion('');
    } catch (error) {
      console.error(`Error guardando en ${currentCollectionName}:`, error);
      setFormError(`Error al guardar: ${error.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Eliminar un elemento
  const handleDelete = async (item) => {
    const itemName = item.nombre || item.name || 'Sin nombre';
    const usedCount = usageCounts[itemName] || 0;

    let confirmMsg = `¿Seguro que deseas eliminar el ${isAreas ? 'área' : 'tramo'} "${itemName}"?`;
    if (usedCount > 0) {
      confirmMsg = `⚠️ ¡ADVERTENCIA!\n\nHay ${usedCount} expediente(s) asociados actualmente a "${itemName}".\n\nSi lo eliminas, los expedientes existentes mantendrán el texto histórico, pero no estará disponible para nuevas asignaciones.\n\n¿Deseas eliminarlo de todas formas?`;
    }

    if (!window.confirm(confirmMsg)) return;

    try {
      await deleteDoc(doc(db, currentCollectionName, item.id));
      if (logAction) {
        logAction(
          `Eliminado ${isAreas ? 'Área' : 'Tramo'}`, 
          `Nombre: ${itemName} (ID: ${item.id}) - Expedientes vinculados: ${usedCount}`
        );
      }
    } catch (error) {
      console.error(`Error eliminando de ${currentCollectionName}:`, error);
      alert(`Error al eliminar: ${error.message}`);
    }
  };

  // Cargar valores predeterminados en Firestore por lotes
  const handleSeedDefaults = async () => {
    const defaults = isAreas ? DEFAULT_AREAS : DEFAULT_TRAMOS;
    const countName = isAreas ? 'Áreas' : 'Tramos';
    
    if (!window.confirm(`¿Cargar las ${defaults.length} ${countName} estándar predeterminadas en la base de datos de Firestore? Se omitirán las que ya existan.`)) {
      return;
    }

    setIsSeeding(true);
    try {
      const batch = writeBatch(db);
      let added = 0;

      defaults.forEach(def => {
        const alreadyExists = currentItems.some(i => 
          (i.nombre || i.name || '').toLowerCase() === def.nombre.toLowerCase()
        );

        if (!alreadyExists) {
          const newDocRef = doc(collection(db, currentCollectionName));
          batch.set(newDocRef, {
            nombre: def.nombre,
            descripcion: def.descripcion,
            activo: true,
            createdAt: serverTimestamp(),
            createdBy: currentUser?.email || 'Sistema (Seed)',
            updatedAt: serverTimestamp(),
            updatedBy: currentUser?.email || 'Sistema (Seed)'
          });
          added++;
        }
      });

      if (added > 0) {
        await batch.commit();
        if (logAction) {
          logAction(`Carga Masiva Inicial de ${countName}`, `${added} elementos añadidos a Firestore.`);
        }
        alert(`✅ Se han añadido ${added} ${countName.toLowerCase()} a la base de datos correctamente.`);
      } else {
        alert(`Todos los valores predeterminados ya existen en la colección.`);
      }
    } catch (error) {
      console.error(`Error en seeding de ${currentCollectionName}:`, error);
      alert(`Error al inicializar: ${error.message}`);
    } finally {
      setIsSeeding(false);
    }
  };

  return (
    <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-6">
      
      {/* CABECERA Y SELECTOR DE PESTAÑA */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-slate-100 pb-5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
            <Layers className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
              Clasificación Dinámica de Expedientes
            </h2>
            <p className="text-xs text-slate-500">
              Administra las colecciones Firestore de <span className="font-semibold text-slate-700">Áreas</span> y <span className="font-semibold text-slate-700">Tramos</span> que alimentan los selectores en tiempo real.
            </p>
          </div>
        </div>

        {/* Pestañas de Navegación */}
        <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200 self-stretch sm:self-auto">
          <button
            onClick={() => { setActiveTab('areas'); setSearchTerm(''); }}
            className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${
              isAreas 
                ? 'bg-white text-indigo-600 shadow-sm' 
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Briefcase className="w-3.5 h-3.5" />
            <span>Áreas / Departamentos</span>
            <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${
              isAreas ? 'bg-indigo-50 text-indigo-700 font-bold' : 'bg-slate-200 text-slate-600'
            }`}>
              {areas.length}
            </span>
          </button>

          <button
            onClick={() => { setActiveTab('tramos'); setSearchTerm(''); }}
            className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${
              !isAreas 
                ? 'bg-white text-indigo-600 shadow-sm' 
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Tag className="w-3.5 h-3.5" />
            <span>Tramos / Trámites</span>
            <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${
              !isAreas ? 'bg-indigo-50 text-indigo-700 font-bold' : 'bg-slate-200 text-slate-600'
            }`}>
              {tramos.length}
            </span>
          </button>
        </div>
      </div>

      {/* BARRA DE ACCIONES: BUSCADOR + BOTONES */}
      <div className="flex flex-col sm:flex-row justify-between items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder={`Buscar en ${isAreas ? 'Áreas' : 'Tramos'} por nombre o descripción...`}
            className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 placeholder-slate-400 bg-slate-50 focus:bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs font-bold"
            >
              ✕
            </button>
          )}
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto shrink-0">
          {/* Botón de Carga Inicial si la colección tiene pocos elementos */}
          {currentItems.length === 0 && (
            <button
              onClick={handleSeedDefaults}
              disabled={isSeeding}
              className="bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 px-3.5 py-2 rounded-xl text-xs font-bold shadow-xs flex items-center gap-1.5 transition-all disabled:opacity-50"
              title="Cargar catálogo estándar inicial en Firestore"
            >
              {isSeeding ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5 text-emerald-600" />}
              <span>Cargar Predeterminados</span>
            </button>
          )}

          {/* Botón Nuevo Elemento */}
          <button
            onClick={handleOpenCreate}
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-xl text-xs font-bold shadow-md shadow-indigo-100 flex items-center gap-1.5 transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>{isAreas ? 'Nueva Área' : 'Nuevo Tramo'}</span>
          </button>
        </div>
      </div>

      {/* TABLA PRINCIPAL DE ELEMENTOS */}
      <div className="border border-slate-200 rounded-xl overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-600 font-bold uppercase text-[10px] tracking-wider">
                <th className="p-3.5 pl-4">Nombre</th>
                <th className="p-3.5">Descripción</th>
                <th className="p-3.5 text-center">Expedientes en Uso</th>
                <th className="p-3.5 text-right pr-4">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredItems.map((item) => {
                const itemName = item.nombre || item.name || 'Sin nombre';
                const usage = usageCounts[itemName] || 0;

                return (
                  <tr key={item.id} className="hover:bg-slate-50/60 transition-colors">
                    {/* Nombre */}
                    <td className="p-3.5 pl-4 font-bold text-slate-800">
                      <div className="flex items-center gap-2">
                        <span className={`w-2 h-2 rounded-full ${isAreas ? 'bg-indigo-500' : 'bg-emerald-500'}`}></span>
                        <span className="text-slate-900 font-semibold">{itemName}</span>
                      </div>
                    </td>

                    {/* Descripción */}
                    <td className="p-3.5 text-slate-500 max-w-md">
                      {item.descripcion || item.description ? (
                        <span className="line-clamp-2" title={item.descripcion || item.description}>
                          {item.descripcion || item.description}
                        </span>
                      ) : (
                        <span className="text-slate-400 italic text-[11px]">Sin descripción</span>
                      )}
                    </td>

                    {/* Expedientes en uso */}
                    <td className="p-3.5 text-center whitespace-nowrap">
                      {usage > 0 ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-100">
                          {usage} {usage === 1 ? 'expediente' : 'expedientes'}
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] text-slate-400 bg-slate-100">
                          0 expedientes
                        </span>
                      )}
                    </td>

                    {/* Acciones */}
                    <td className="p-3.5 pr-4 text-right whitespace-nowrap">
                      <div className="inline-flex items-center gap-1">
                        <button
                          onClick={() => handleOpenEdit(item)}
                          className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                          title="Editar elemento"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDelete(item)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                          title="Eliminar elemento"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}

              {filteredItems.length === 0 && (
                <tr>
                  <td colSpan="4" className="p-8 text-center text-slate-400">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <Layers className="w-8 h-8 text-slate-300 stroke-1" />
                      <p className="text-sm font-medium text-slate-600">
                        {searchTerm 
                          ? `No hay ${isAreas ? 'áreas' : 'tramos'} que coincidan con "${searchTerm}".`
                          : `No hay ${isAreas ? 'áreas' : 'tramos'} creados en Firestore.`}
                      </p>
                      {!searchTerm && (
                        <div className="mt-2 flex items-center gap-3">
                          <button
                            onClick={handleOpenCreate}
                            className="text-xs bg-indigo-600 text-white font-bold px-3 py-1.5 rounded-lg hover:bg-indigo-700 transition-colors"
                          >
                            + Crear primera {isAreas ? 'Área' : 'Tramo'}
                          </button>
                          <button
                            onClick={handleSeedDefaults}
                            className="text-xs bg-slate-100 text-slate-700 font-bold px-3 py-1.5 rounded-lg hover:bg-slate-200 border border-slate-200 transition-colors"
                          >
                            Cargar valores estándar
                          </button>
                        </div>
                      )}
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* PIE DE TABLA / RESUMEN */}
      <div className="flex flex-col sm:flex-row justify-between items-center text-xs text-slate-500 pt-2 border-t border-slate-100 gap-2">
        <span>
          Mostrando {filteredItems.length} de {currentItems.length} {isAreas ? 'áreas' : 'tramos'} en Firestore
        </span>
        <button
          onClick={handleSeedDefaults}
          disabled={isSeeding}
          className="text-indigo-600 hover:text-indigo-800 font-bold flex items-center gap-1 hover:underline disabled:opacity-50"
        >
          <Sparkles className="w-3 h-3" />
          <span>Restaurar / Añadir valores estándar ausentes</span>
        </button>
      </div>

      {/* MODAL PARA CREAR O EDITAR */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
            
            {/* Cabecera del Modal */}
            <div className="px-6 py-4 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold">
                  {isAreas ? <Briefcase className="w-4 h-4" /> : <Tag className="w-4 h-4" />}
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-800">
                    {editingItem 
                      ? `Editar ${isAreas ? 'Área' : 'Tramo'}` 
                      : `Nueva ${isAreas ? 'Área' : 'Nuevo Tramo'}`}
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    Colección de Firestore: <code className="text-indigo-600 font-mono font-bold">{currentCollectionName}</code>
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-200/50 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Formulario */}
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {formError && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-rose-500 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              {/* Campo Nombre */}
              <div>
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wide block mb-1">
                  Nombre del {isAreas ? 'Área / Departamento' : 'Tramo / Trámite'} <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formNombre}
                  onChange={(e) => setFormNombre(e.target.value)}
                  placeholder={isAreas ? 'Ej. Fiscal / Tributario' : 'Ej. Vencimiento Fiscal'}
                  className="w-full border border-slate-300 rounded-xl p-2.5 text-xs text-slate-800 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all"
                  autoFocus
                />
              </div>

              {/* Campo Descripción */}
              <div>
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wide block mb-1">
                  Descripción u observaciones (Opcional)
                </label>
                <textarea
                  value={formDescripcion}
                  onChange={(e) => setFormDescripcion(e.target.value)}
                  placeholder="Detalles sobre qué expedientes o plazos comprende..."
                  rows="3"
                  className="w-full border border-slate-300 rounded-xl p-2.5 text-xs text-slate-800 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all"
                />
              </div>

              {/* Botones de acción */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  disabled={isSubmitting}
                  className="px-4 py-2 border border-slate-200 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-50 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-md shadow-indigo-100 flex items-center gap-1.5 transition-all disabled:opacity-50"
                >
                  {isSubmitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>{editingItem ? 'Guardar Cambios' : 'Crear'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ClassificationManager;
