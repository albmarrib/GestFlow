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
  FileSpreadsheet,
  Palette,
  Check,
  Clock,
  ShieldCheck,
  Filter
} from 'lucide-react';

// Paleta de colores semántica para estados
export const STATUS_COLORS = {
  emerald: {
    id: 'emerald',
    label: 'Verde (Abierto / En Plazo)',
    colorClass: 'bg-emerald-50 text-emerald-800 border-emerald-200/90',
    dotColor: 'bg-emerald-500',
    hex: '#10b981',
    bgClass: 'bg-emerald-500'
  },
  amber: {
    id: 'amber',
    label: 'Amarillo (En Riesgo)',
    colorClass: 'bg-amber-50 text-amber-800 border-amber-200/90',
    dotColor: 'bg-amber-500',
    hex: '#f59e0b',
    bgClass: 'bg-amber-500'
  },
  rose: {
    id: 'rose',
    label: 'Rojo (Con Retraso / Vencido)',
    colorClass: 'bg-rose-50 text-rose-800 border-rose-200/90',
    dotColor: 'bg-rose-500 animate-pulse',
    hex: '#f43f5e',
    bgClass: 'bg-rose-500'
  },
  blue: {
    id: 'blue',
    label: 'Azul (Cerrado)',
    colorClass: 'bg-blue-50 text-blue-800 border-blue-200/90',
    dotColor: 'bg-blue-500',
    hex: '#3b82f6',
    bgClass: 'bg-blue-500'
  },
  indigo: {
    id: 'indigo',
    label: 'Índigo Corporativo',
    colorClass: 'bg-indigo-50 text-indigo-800 border-indigo-200/90',
    dotColor: 'bg-indigo-500',
    hex: '#6366f1',
    bgClass: 'bg-indigo-500'
  },
  purple: {
    id: 'purple',
    label: 'Púrpura / Especial',
    colorClass: 'bg-purple-50 text-purple-800 border-purple-200/90',
    dotColor: 'bg-purple-500',
    hex: '#a855f7',
    bgClass: 'bg-purple-500'
  },
  cyan: {
    id: 'cyan',
    label: 'Cian / Externo',
    colorClass: 'bg-cyan-50 text-cyan-800 border-cyan-200/90',
    dotColor: 'bg-cyan-500',
    hex: '#06b6d4',
    bgClass: 'bg-cyan-500'
  },
  orange: {
    id: 'orange',
    label: 'Naranja Intenso',
    colorClass: 'bg-orange-50 text-orange-800 border-orange-200/90',
    dotColor: 'bg-orange-500',
    hex: '#f97316',
    bgClass: 'bg-orange-500'
  },
  slate: {
    id: 'slate',
    label: 'Pizarra / Neutro',
    colorClass: 'bg-slate-100 text-slate-700 border-slate-300',
    dotColor: 'bg-slate-400',
    hex: '#64748b',
    bgClass: 'bg-slate-400'
  },
  dark: {
    id: 'dark',
    label: 'Gris Oscuro',
    colorClass: 'bg-slate-800 text-slate-100 border-slate-700',
    dotColor: 'bg-slate-300',
    hex: '#1e293b',
    bgClass: 'bg-slate-800'
  }
};

// Valores iniciales recomendados para el despacho si las colecciones están vacías
export const DEFAULT_AREAS = [
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

export const DEFAULT_TRAMOS = [
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

// 4 Estados Operativos Oficiales del Despacho según SLA / Plazos:
export const DEFAULT_ESTADOS = [
  { 
    nombre: 'Abierto', 
    color: 'emerald', 
    categoria: 'activo', 
    isCompleted: false, 
    orden: 1, 
    descripcion: 'Proyecto en marcha y previsto para terminar en el día esperado (dentro de plazo)' 
  },
  { 
    nombre: 'En Riesgo', 
    color: 'amber', 
    categoria: 'riesgo', 
    isCompleted: false, 
    orden: 2, 
    descripcion: 'Incidencias detectadas o previsión de que no se terminará cuando estaba previsto' 
  },
  { 
    nombre: 'Con Retraso', 
    color: 'rose', 
    categoria: 'urgente', 
    isCompleted: false, 
    orden: 3, 
    descripcion: 'Plazo superado automáticamente sin haberse cerrado el expediente' 
  },
  { 
    nombre: 'Cerrado', 
    color: 'blue', 
    categoria: 'completado', 
    isCompleted: true, 
    orden: 4, 
    descripcion: 'Expediente concluido, tramitado y cerrado definitivamente' 
  }
];

const ClassificationManager = ({
  areas = [],
  tramos = [],
  estados = [],
  tasks = [],
  currentUser,
  logAction
}) => {
  const [activeTab, setActiveTab] = useState('areas'); // 'areas' | 'tramos' | 'estados'
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  
  // Form states
  const [formNombre, setFormNombre] = useState('');
  const [formDescripcion, setFormDescripcion] = useState('');
  const [formColor, setFormColor] = useState('emerald');
  const [formCategoria, setFormCategoria] = useState('activo');
  const [formIsCompleted, setFormIsCompleted] = useState(false);
  const [formOrden, setFormOrden] = useState(1);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSeeding, setIsSeeding] = useState(false);
  const [formError, setFormError] = useState('');

  const currentCollectionName = activeTab === 'areas' ? 'areas' : activeTab === 'tramos' ? 'tramos' : 'estados';
  const currentItems = activeTab === 'areas' ? areas : activeTab === 'tramos' ? tramos : estados;

  // Filtrado de elementos
  const filteredItems = useMemo(() => {
    const term = searchTerm.toLowerCase().trim();
    if (!term) return currentItems;
    return currentItems.filter(item => 
      (item.nombre || item.name || '').toLowerCase().includes(term) ||
      (item.descripcion || item.description || '').toLowerCase().includes(term)
    );
  }, [currentItems, searchTerm]);

  // Contar expedientes que usan cada área, tramo o estado
  const usageCounts = useMemo(() => {
    const counts = {};
    tasks.forEach(t => {
      if (activeTab === 'areas') {
        const areaName = (t.department || t.area || '').trim();
        if (areaName) counts[areaName] = (counts[areaName] || 0) + 1;
      } else if (activeTab === 'tramos') {
        const tramoName = (t.type || t.tramo || '').trim();
        if (tramoName) counts[tramoName] = (counts[tramoName] || 0) + 1;
      } else {
        const estadoName = (t.status || '').trim();
        if (estadoName) counts[estadoName] = (counts[estadoName] || 0) + 1;
      }
    });
    return counts;
  }, [tasks, activeTab]);

  // Abrir modal de creación
  const handleOpenCreate = () => {
    setEditingItem(null);
    setFormNombre('');
    setFormDescripcion('');
    setFormColor('emerald');
    setFormCategoria('activo');
    setFormIsCompleted(false);
    setFormOrden((estados.length || 0) + 1);
    setFormError('');
    setIsModalOpen(true);
  };

  // Abrir modal de edición
  const handleOpenEdit = (item) => {
    setEditingItem(item);
    setFormNombre(item.nombre || item.name || '');
    setFormDescripcion(item.descripcion || item.description || '');
    setFormColor(item.color || 'emerald');
    setFormCategoria(item.categoria || 'activo');
    setFormIsCompleted(Boolean(item.isCompleted));
    setFormOrden(item.orden || 1);
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
      const typeLabel = activeTab === 'areas' ? 'área' : activeTab === 'tramos' ? 'tramo' : 'estado';
      setFormError(`Ya existe un ${typeLabel} con el nombre "${cleanNombre}".`);
      return;
    }

    setIsSubmitting(true);
    setFormError('');

    try {
      const payload = {
        nombre: cleanNombre,
        descripcion: formDescripcion.trim(),
        updatedAt: serverTimestamp(),
        updatedBy: currentUser?.email || 'Sistema'
      };

      if (activeTab === 'estados') {
        payload.color = formColor;
        payload.categoria = formCategoria;
        payload.isCompleted = Boolean(formIsCompleted);
        payload.orden = Number(formOrden) || 1;
      }

      if (editingItem) {
        // Actualizar
        const itemRef = doc(db, currentCollectionName, editingItem.id);
        await updateDoc(itemRef, payload);

        if (logAction) {
          const typeLabel = activeTab === 'areas' ? 'Área' : activeTab === 'tramos' ? 'Tramo' : 'Estado';
          logAction(
            `Actualizado ${typeLabel}`, 
            `Nombre: ${cleanNombre} (ID: ${editingItem.id})`
          );
        }
      } else {
        // Crear nuevo
        payload.activo = true;
        payload.createdAt = serverTimestamp();
        payload.createdBy = currentUser?.email || 'Sistema';

        await addDoc(collection(db, currentCollectionName), payload);

        if (logAction) {
          const typeLabel = activeTab === 'areas' ? 'Área' : activeTab === 'tramos' ? 'Tramo' : 'Estado';
          logAction(
            `Creado ${typeLabel}`, 
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
    const typeLabel = activeTab === 'areas' ? 'área' : activeTab === 'tramos' ? 'tramo' : 'estado';

    let confirmMsg = `¿Seguro que deseas eliminar el ${typeLabel} "${itemName}"?`;
    if (usedCount > 0) {
      confirmMsg = `⚠️ ¡ADVERTENCIA!\n\nHay ${usedCount} expediente(s) asociados actualmente a este ${typeLabel} "${itemName}".\n\nSi lo eliminas, los expedientes existentes mantendrán el texto histórico, pero no estará disponible para nuevas asignaciones.\n\n¿Deseas eliminarlo de todas formas?`;
    }

    if (!window.confirm(confirmMsg)) return;

    try {
      await deleteDoc(doc(db, currentCollectionName, item.id));
      if (logAction) {
        logAction(
          `Eliminado ${activeTab === 'areas' ? 'Área' : activeTab === 'tramos' ? 'Tramo' : 'Estado'}`, 
          `Nombre: ${itemName} (ID: ${item.id})`
        );
      }
    } catch (error) {
      console.error(`Error eliminando de ${currentCollectionName}:`, error);
      alert(`Error al eliminar: ${error.message}`);
    }
  };

  // Carga masiva de valores estándar recomendados
  const handleSeedDefaults = async () => {
    const defaults = activeTab === 'areas' ? DEFAULT_AREAS : activeTab === 'tramos' ? DEFAULT_TRAMOS : DEFAULT_ESTADOS;
    const countName = activeTab === 'areas' ? 'Áreas' : activeTab === 'tramos' ? 'Tramos' : 'Estados';

    if (!window.confirm(`¿Deseas inicializar los ${defaults.length} ${countName.toLowerCase()} estándar de gestoría en Firestore? Solo se añadirán los que no existan todavía.`)) {
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
          const docData = {
            nombre: def.nombre,
            descripcion: def.descripcion,
            activo: true,
            createdAt: serverTimestamp(),
            createdBy: currentUser?.email || 'Sistema (Seed)',
            updatedAt: serverTimestamp(),
            updatedBy: currentUser?.email || 'Sistema (Seed)'
          };

          if (activeTab === 'estados') {
            docData.color = def.color;
            docData.categoria = def.categoria;
            docData.isCompleted = def.isCompleted;
            docData.orden = def.orden;
          }

          batch.set(newDocRef, docData);
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

  // Configuración de los 4 estados operativos oficiales según SLA / Plazos
  const handleApplyOfficial4States = async () => {
    if (!window.confirm("¿Deseas configurar los 4 estados operativos oficiales del despacho?\n\n🟢 Abierto (Verde - En marcha y dentro de plazo)\n🟡 En Riesgo (Amarillo - Previsión de no terminar a tiempo)\n🔴 Con Retraso (Rojo - Plazo superado automáticamente)\n🔵 Cerrado (Azul - Completado y facturado)\n\nSe sincronizarán estos 4 estados en Firestore.")) {
      return;
    }

    setIsSeeding(true);
    try {
      const batch = writeBatch(db);
      
      DEFAULT_ESTADOS.forEach(def => {
        const existing = estados.find(e => 
          (e.nombre || e.name || '').toLowerCase().trim() === def.nombre.toLowerCase().trim()
        );

        if (existing) {
          const docRef = doc(db, 'estados', existing.id);
          batch.update(docRef, {
            nombre: def.nombre,
            color: def.color,
            categoria: def.categoria,
            isCompleted: def.isCompleted,
            orden: def.orden,
            descripcion: def.descripcion,
            updatedAt: serverTimestamp(),
            updatedBy: currentUser?.email || 'Sistema'
          });
        } else {
          const newDocRef = doc(collection(db, 'estados'));
          batch.set(newDocRef, {
            nombre: def.nombre,
            color: def.color,
            categoria: def.categoria,
            isCompleted: def.isCompleted,
            orden: def.orden,
            descripcion: def.descripcion,
            activo: true,
            createdAt: serverTimestamp(),
            createdBy: currentUser?.email || 'Sistema',
            updatedAt: serverTimestamp(),
            updatedBy: currentUser?.email || 'Sistema'
          });
        }
      });

      await batch.commit();
      if (logAction) {
        logAction('Configuración de Estados Oficiales', 'Sincronizados los 4 estados oficiales del despacho en Firestore');
      }
      alert('✅ ¡Los 4 estados oficiales (Abierto 🟢, En Riesgo 🟡, Con Retraso 🔴, Cerrado 🔵) han quedado configurados en Firestore!');
    } catch (error) {
      console.error('Error aplicando estados oficiales:', error);
      alert('Error: ' + error.message);
    } finally {
      setIsSeeding(false);
    }
  };

  return (
    <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-6">
      
      {/* CABECERA Y SELECTOR DE PESTAÑA */}
      <div className="space-y-4 border-b border-slate-100 pb-5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0 shadow-2xs">
            <Layers className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
              Clasificación Dinámica y Catálogo de Estados
            </h2>
            <p className="text-xs text-slate-500">
              Configura las Áreas, Tipos de Trámites y la paleta de Estados con colores semánticos sincronizados en tiempo real.
            </p>
          </div>
        </div>

        {/* Pestañas de Navegación fijas en una sola línea */}
        <div className="flex items-center gap-1 bg-slate-100/80 p-1 rounded-xl border border-slate-200/80 max-w-full overflow-x-auto">
          <button
            type="button"
            onClick={() => { setActiveTab('areas'); setSearchTerm(''); }}
            className={`flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
              activeTab === 'areas' 
                ? 'bg-white text-indigo-600 shadow-2xs' 
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
            }`}
          >
            <Briefcase className="w-3.5 h-3.5 text-indigo-500" />
            <span>Áreas / Departamentos</span>
            <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${
              activeTab === 'areas' ? 'bg-indigo-50 text-indigo-700' : 'bg-slate-200 text-slate-600'
            }`}>
              {areas.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => { setActiveTab('tramos'); setSearchTerm(''); }}
            className={`flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
              activeTab === 'tramos' 
                ? 'bg-white text-indigo-600 shadow-2xs' 
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
            }`}
          >
            <Tag className="w-3.5 h-3.5 text-indigo-500" />
            <span>Tramos / Trámites</span>
            <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${
              activeTab === 'tramos' ? 'bg-indigo-50 text-indigo-700' : 'bg-slate-200 text-slate-600'
            }`}>
              {tramos.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => { setActiveTab('estados'); setSearchTerm(''); }}
            className={`flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
              activeTab === 'estados' 
                ? 'bg-white text-indigo-600 shadow-2xs' 
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
            }`}
          >
            <Palette className="w-3.5 h-3.5 text-indigo-500" />
            <span>Estados y Colores</span>
            <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${
              activeTab === 'estados' ? 'bg-indigo-50 text-indigo-700' : 'bg-slate-200 text-slate-600'
            }`}>
              {estados.length}
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
            placeholder={`Buscar en ${activeTab === 'areas' ? 'Áreas' : activeTab === 'tramos' ? 'Tramos' : 'Estados'}...`}
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
          {/* Botón de restablecer los 4 estados oficiales del despacho */}
          {activeTab === 'estados' && (
            <button
              type="button"
              onClick={handleApplyOfficial4States}
              disabled={isSeeding}
              className="bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 px-3.5 py-2 rounded-xl text-xs font-bold shadow-xs flex items-center gap-1.5 transition-all disabled:opacity-50 cursor-pointer"
              title="Sincronizar los 4 Estados Oficiales de GestFlow: Abierto (Verde), En Riesgo (Amarillo), Con Retraso (Rojo) y Cerrado (Azul)"
            >
              {isSeeding ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5 text-indigo-600" />}
              <span className="hidden sm:inline">Restablecer 4 Estados Oficiales</span>
              <span className="sm:hidden">4 Estados</span>
            </button>
          )}

          {/* Botón de Carga Inicial si la colección tiene pocos elementos */}
          {currentItems.length === 0 && activeTab !== 'estados' && (
            <button
              onClick={handleSeedDefaults}
              disabled={isSeeding}
              className="bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 px-3.5 py-2 rounded-xl text-xs font-bold shadow-xs flex items-center gap-1.5 transition-all disabled:opacity-50 cursor-pointer"
              title="Cargar catálogo estándar inicial en Firestore"
            >
              {isSeeding ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5 text-emerald-600" />}
              <span>Cargar Predeterminados</span>
            </button>
          )}

          {/* Botón Nuevo Elemento */}
          <button
            onClick={handleOpenCreate}
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-xl text-xs font-bold shadow-md shadow-indigo-100 flex items-center gap-1.5 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>{activeTab === 'areas' ? 'Nueva Área' : activeTab === 'tramos' ? 'Nuevo Tramo' : 'Nuevo Estado'}</span>
          </button>
        </div>
      </div>

      {/* TABLA PRINCIPAL DE ELEMENTOS */}
      <div className="border border-slate-200 rounded-xl overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-600 font-bold uppercase text-[10px] tracking-wider">
                <th className="p-3.5 pl-4">{activeTab === 'estados' ? 'Estado / Color' : 'Nombre'}</th>
                {activeTab === 'estados' && <th className="p-3.5">Categoría / Tipo</th>}
                {activeTab === 'estados' && <th className="p-3.5 text-center">Filtro Finalizado</th>}
                <th className="p-3.5">Descripción</th>
                <th className="p-3.5 text-center">Expedientes en Uso</th>
                <th className="p-3.5 text-right pr-4">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredItems.map((item) => {
                const itemName = item.nombre || item.name || 'Sin nombre';
                const usage = usageCounts[itemName] || 0;
                const colorConfig = STATUS_COLORS[item.color] || STATUS_COLORS.slate;

                return (
                  <tr key={item.id} className="hover:bg-slate-50/60 transition-colors">
                    {/* Nombre / Badge */}
                    <td className="p-3.5 pl-4 font-bold text-slate-800">
                      {activeTab === 'estados' ? (
                        <div className="flex items-center gap-2">
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold border ${colorConfig.colorClass} shadow-2xs`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${colorConfig.dotColor}`}></span>
                            <span>{itemName}</span>
                          </span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <span className={`w-2 h-2 rounded-full ${activeTab === 'areas' ? 'bg-indigo-500' : 'bg-emerald-500'}`}></span>
                          <span className="text-slate-900 font-semibold">{itemName}</span>
                        </div>
                      )}
                    </td>

                    {/* Columnas específicas para Estados */}
                    {activeTab === 'estados' && (
                      <td className="p-3.5 whitespace-nowrap">
                        <span className="text-[11px] font-medium px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 capitalize">
                          {item.categoria || 'activo'}
                        </span>
                      </td>
                    )}

                    {activeTab === 'estados' && (
                      <td className="p-3.5 text-center whitespace-nowrap">
                        {item.isCompleted ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <Check className="w-3 h-3" /> Se Oculta al Terminar
                          </span>
                        ) : (
                          <span className="text-slate-400 text-[10px]">En Proceso</span>
                        )}
                      </td>
                    )}

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
                          className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors cursor-pointer"
                          title="Editar elemento"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDelete(item)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
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
                  <td colSpan={activeTab === 'estados' ? 6 : 4} className="p-8 text-center text-slate-400">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <Layers className="w-8 h-8 text-slate-300 stroke-1" />
                      <p className="text-sm font-medium text-slate-600">
                        {searchTerm 
                          ? `No hay elementos que coincidan con "${searchTerm}".`
                          : `No hay ${activeTab === 'areas' ? 'áreas' : activeTab === 'tramos' ? 'tramos' : 'estados'} creados en Firestore.`}
                      </p>
                      {!searchTerm && (
                        <div className="mt-2 flex items-center gap-3">
                          <button
                            onClick={handleOpenCreate}
                            className="text-xs bg-indigo-600 text-white font-bold px-3 py-1.5 rounded-lg hover:bg-indigo-700 transition-colors"
                          >
                            + Crear primer {activeTab === 'areas' ? 'Área' : activeTab === 'tramos' ? 'Tramo' : 'Estado'}
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
          Mostrando {filteredItems.length} de {currentItems.length} {activeTab === 'areas' ? 'áreas' : activeTab === 'tramos' ? 'tramos' : 'estados'} en Firestore
        </span>
        <button
          onClick={handleSeedDefaults}
          disabled={isSeeding}
          className="text-indigo-600 hover:text-indigo-800 font-bold flex items-center gap-1 hover:underline disabled:opacity-50 cursor-pointer"
        >
          <Sparkles className="w-3 h-3" />
          <span>Restaurar / Añadir valores estándar ausentes</span>
        </button>
      </div>

      {/* MODAL PARA CREAR O EDITAR */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200">
            
            {/* Cabecera del Modal */}
            <div className="px-6 py-4 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold">
                  {activeTab === 'areas' ? <Briefcase className="w-4 h-4" /> : activeTab === 'tramos' ? <Tag className="w-4 h-4" /> : <Palette className="w-4 h-4" />}
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-800">
                    {editingItem 
                      ? `Editar ${activeTab === 'areas' ? 'Área' : activeTab === 'tramos' ? 'Tramo' : 'Estado'}` 
                      : `Nuevo ${activeTab === 'areas' ? 'Área' : activeTab === 'tramos' ? 'Tramo' : 'Estado'}`}
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    Colección de Firestore: <code className="text-indigo-600 font-mono font-bold">{currentCollectionName}</code>
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-200/50 transition-colors cursor-pointer"
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

              {/* Vista previa en tiempo real si es Estado */}
              {activeTab === 'estados' && (
                <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-500">Vista previa del Badge:</span>
                  <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${STATUS_COLORS[formColor]?.colorClass || STATUS_COLORS.slate.colorClass} shadow-2xs`}>
                    <span className={`w-2 h-2 rounded-full ${STATUS_COLORS[formColor]?.dotColor || STATUS_COLORS.slate.dotColor}`}></span>
                    <span>{formNombre || 'Nombre del Estado'}</span>
                  </span>
                </div>
              )}

              {/* Campo Nombre */}
              <div>
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wide block mb-1">
                  Nombre del {activeTab === 'areas' ? 'Área / Departamento' : activeTab === 'tramos' ? 'Tramo / Trámite' : 'Estado'} <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formNombre}
                  onChange={(e) => setFormNombre(e.target.value)}
                  placeholder={activeTab === 'areas' ? 'Ej. Fiscal / Tributario' : activeTab === 'tramos' ? 'Ej. Vencimiento Fiscal' : 'Ej. Pendiente Firma Notarial'}
                  className="w-full border border-slate-300 rounded-xl p-2.5 text-xs text-slate-800 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all"
                  autoFocus
                />
              </div>

              {/* Campos específicos de Estados: Selector de Color */}
              {activeTab === 'estados' && (
                <div>
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wide block mb-2">
                    Color Distintivo del Estado
                  </label>
                  <div className="grid grid-cols-5 gap-2">
                    {Object.values(STATUS_COLORS).map((c) => {
                      const isSelected = formColor === c.id;
                      return (
                        <button
                          key={c.id}
                          type="button"
                          onClick={() => setFormColor(c.id)}
                          className={`p-2 rounded-xl border flex flex-col items-center gap-1 transition-all cursor-pointer ${
                            isSelected 
                              ? 'border-indigo-600 bg-indigo-50/60 ring-2 ring-indigo-500/30 shadow-xs' 
                              : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                          }`}
                          title={c.label}
                        >
                          <span className={`w-4 h-4 rounded-full ${c.bgClass} shadow-2xs flex items-center justify-center text-white`}>
                            {isSelected && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                          </span>
                          <span className="text-[10px] font-semibold text-slate-700 truncate max-w-full text-center">
                            {c.label.split(' ')[0]}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Campos específicos de Estados: Categoría y Checkbox Completado */}
              {activeTab === 'estados' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  <div>
                    <label className="text-xs font-bold text-slate-700 uppercase tracking-wide block mb-1">
                      Categoría
                    </label>
                    <select
                      value={formCategoria}
                      onChange={(e) => setFormCategoria(e.target.value)}
                      className="w-full border border-slate-300 rounded-xl p-2 text-xs text-slate-800 focus:border-indigo-500 outline-none"
                    >
                      <option value="activo">Activo (En curso ordinario)</option>
                      <option value="urgente">Urgente (Plazo inminente / Alerta)</option>
                      <option value="bloqueado">Bloqueado (En espera de cliente/terceros)</option>
                      <option value="informativo">Informativo (Periódico / Recurrente)</option>
                      <option value="completado">Completado (Presentado o Cerrado)</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-700 uppercase tracking-wide block mb-1">
                      Orden de prioridad
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="99"
                      value={formOrden}
                      onChange={(e) => setFormOrden(Number(e.target.value))}
                      className="w-full border border-slate-300 rounded-xl p-2 text-xs text-slate-800 focus:border-indigo-500 outline-none"
                    />
                  </div>
                </div>
              )}

              {activeTab === 'estados' && (
                <div className="p-3 bg-indigo-50/60 border border-indigo-100 rounded-xl flex items-start gap-2.5">
                  <input
                    type="checkbox"
                    id="isCompletedCheck"
                    checked={formIsCompleted}
                    onChange={(e) => setFormIsCompleted(e.target.checked)}
                    className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 border-slate-300 mt-0.5 cursor-pointer"
                  />
                  <label htmlFor="isCompletedCheck" className="text-xs text-slate-700 cursor-pointer">
                    <span className="font-bold text-slate-800 block">¿Es un estado finalizado / tramitado?</span>
                    <span className="text-[11px] text-slate-500">
                      Al activarse, este estado se ocultará cuando los gestores pulsen el botón del ojo ("Ocultar presentados/cerrados") en los filtros.
                    </span>
                  </label>
                </div>
              )}

              {/* Campo Descripción */}
              <div>
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wide block mb-1">
                  Descripción u observaciones (Opcional)
                </label>
                <textarea
                  value={formDescripcion}
                  onChange={(e) => setFormDescripcion(e.target.value)}
                  placeholder="Detalles sobre qué expedientes o situaciones comprende..."
                  rows="2"
                  className="w-full border border-slate-300 rounded-xl p-2.5 text-xs text-slate-800 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all"
                />
              </div>

              {/* Botones de acción */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  disabled={isSubmitting}
                  className="px-4 py-2 border border-slate-200 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-50 transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-md shadow-indigo-100 flex items-center gap-1.5 transition-all disabled:opacity-50 cursor-pointer"
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
