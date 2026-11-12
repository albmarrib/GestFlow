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
import { translations } from '../i18n/translations';

// Paleta de colores semántica para estados
export const STATUS_COLORS = {
  emerald: {
    id: 'emerald',
    label: 'Verde (Abierto / En Plazo)',
    label_ca: 'Verd (Obert / En Termini)',
    colorClass: 'bg-emerald-50 text-emerald-800 border-emerald-200/90',
    dotColor: 'bg-emerald-500',
    hex: '#10b981',
    bgClass: 'bg-emerald-500'
  },
  amber: {
    id: 'amber',
    label: 'Amarillo (En Riesgo)',
    label_ca: 'Groc (En Risc)',
    colorClass: 'bg-amber-50 text-amber-800 border-amber-200/90',
    dotColor: 'bg-amber-500',
    hex: '#f59e0b',
    bgClass: 'bg-amber-500'
  },
  rose: {
    id: 'rose',
    label: 'Rojo (Con Retraso / Vencido)',
    label_ca: 'Vermell (Amb Retard / Vençut)',
    colorClass: 'bg-rose-50 text-rose-800 border-rose-200/90',
    dotColor: 'bg-rose-500 animate-pulse',
    hex: '#f43f5e',
    bgClass: 'bg-rose-500'
  },
  blue: {
    id: 'blue',
    label: 'Azul (Cerrado)',
    label_ca: 'Blau (Tancat)',
    colorClass: 'bg-blue-50 text-blue-800 border-blue-200/90',
    dotColor: 'bg-blue-500',
    hex: '#3b82f6',
    bgClass: 'bg-blue-500'
  },
  indigo: {
    id: 'indigo',
    label: 'Índigo Corporativo',
    label_ca: 'Índigo Corporatiu',
    colorClass: 'bg-indigo-50 text-indigo-800 border-indigo-200/90',
    dotColor: 'bg-indigo-500',
    hex: '#6366f1',
    bgClass: 'bg-indigo-500'
  },
  purple: {
    id: 'purple',
    label: 'Púrpura / Especial',
    label_ca: 'Púrpura / Especial',
    colorClass: 'bg-purple-50 text-purple-800 border-purple-200/90',
    dotColor: 'bg-purple-500',
    hex: '#a855f7',
    bgClass: 'bg-purple-500'
  },
  cyan: {
    id: 'cyan',
    label: 'Cian / Externo',
    label_ca: 'Cian / Extern',
    colorClass: 'bg-cyan-50 text-cyan-800 border-cyan-200/90',
    dotColor: 'bg-cyan-500',
    hex: '#06b6d4',
    bgClass: 'bg-cyan-500'
  },
  orange: {
    id: 'orange',
    label: 'Naranja Intenso',
    label_ca: 'Taronja Intens',
    colorClass: 'bg-orange-50 text-orange-800 border-orange-200/90',
    dotColor: 'bg-orange-500',
    hex: '#f97316',
    bgClass: 'bg-orange-500'
  },
  slate: {
    id: 'slate',
    label: 'Gris Oscuro',
    label_ca: 'Gris Fosc',
    colorClass: 'bg-slate-800 text-slate-100 border-slate-700',
    dotColor: 'bg-slate-300',
    hex: '#1e293b',
    bgClass: 'bg-slate-800'
  }
};

// Valores recomendados en Catalán (Principal)
export const DEFAULT_AREAS_CA = [
  { nombre: 'Fiscal / Tributari', descripcion: 'Declaracions periòdiques, models tributaris, impostos i AEAT / ATC' },
  { nombre: 'Comptable', descripcion: 'Portar comptabilitat, legalització de llibres i comptes anuals' },
  { nombre: 'Laboral i Seguretat Social', descripcion: 'Nòmines, altes/baixes a TGSS, contractes i convenis' },
  { nombre: 'Mercantil i Societari', descripcion: 'Constitució de societats, modificacions estatutàries i Registre Mercantil' },
  { nombre: 'Jurídic / Legal', descripcion: 'Assessorament legal, contractes mercantils i procediments' },
  { nombre: 'Tràmits DGT / Trànsit', descripcion: 'Transferències de vehicles, matriculacions i baixes DGT' },
  { nombre: 'Estrangeria i Residències', descripcion: 'Permisos de residència, arrels, NIE i renovacions' },
  { nombre: 'Facturació i Cobraments', descripcion: 'Emissió de factures del despatx i control de liquidacions' },
  { nombre: 'Direcció / General', descripcion: 'Gestió interna i tràmits transversals del despatx' }
];

export const DEFAULT_TRAMOS_CA = [
  { nombre: 'Venciment Fiscal', descripcion: 'Termini oficial improrrogable amb presentació telemàtica a AEAT / ATC' },
  { nombre: 'Tancament Comptable / Llibres', descripcion: 'Tancament d\'exercici, legalització de llibres o dipòsit al Registre Mercantil' },
  { nombre: 'Nòmines i Seg. Social', descripcion: 'Enviament d\'assegurances socials (SILTRA), contractes i confecció mensual' },
  { nombre: 'Alta / Constitució', descripcion: 'Creació d\'empreses, altes a IAE/036/037 i tràmits d\'inici d\'activitat' },
  { nombre: 'Requeriment / Notificació AEAT', descripcion: 'Resposta en termini a requeriments d\'informació o comprovacions' },
  { nombre: 'Tràmit Administratiu', descripcion: 'Gestions davant d\'organismes locals, autonòmics o registres' },
  { nombre: 'Declaració Renda (IRPF)', descripcion: 'Campanya anual de Renda i Patrimoni de persones físiques' },
  { nombre: 'Consultoria i Assessorament', descripcion: 'Emissió de dictàmens, informes tributaris o consultes personalitzades' },
  { nombre: 'Altre Tràmit', descripcion: 'Tràmits miscel·lanis no enquadrats en categories anteriors' }
];

export const DEFAULT_ESTADOS_CA = [
  { 
    nombre: 'Obert', 
    color: 'emerald', 
    categoria: 'activo', 
    isCompleted: false, 
    orden: 1, 
    descripcion: 'Projecte en marxa i previst per acabar en el dia esperat (dins de termini)' 
  },
  { 
    nombre: 'En Risc', 
    color: 'amber', 
    categoria: 'riesgo', 
    isCompleted: false, 
    orden: 2, 
    descripcion: 'Incidències detectades o previsió que no s\'acabarà quan estava previst' 
  },
  { 
    nombre: 'Amb Retard', 
    color: 'rose', 
    categoria: 'urgente', 
    isCompleted: false, 
    orden: 3, 
    descripcion: 'Termini superat automàticament sense haver-se tancat l\'expedient' 
  },
  { 
    nombre: 'Tancat', 
    color: 'blue', 
    categoria: 'completado', 
    isCompleted: true, 
    orden: 4, 
    descripcion: 'Expedient conclòs, tramitat i tancat definitivament' 
  }
];

// Valores en Castellano
export const DEFAULT_AREAS_ES = [
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

export const DEFAULT_TRAMOS_ES = [
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

export const DEFAULT_ESTADOS_ES = [
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

// Compatibilidad retroactiva
export const DEFAULT_AREAS = DEFAULT_AREAS_CA;
export const DEFAULT_TRAMOS = DEFAULT_TRAMOS_CA;
export const DEFAULT_ESTADOS = DEFAULT_ESTADOS_CA;

const ClassificationManager = ({
  areas = [],
  tramos = [],
  estados = [],
  tasks = [],
  currentUser,
  logAction,
  lang = 'ca'
}) => {
  const t = translations[lang] || translations.ca;
  const isCa = lang === 'ca';

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
      if (t.area) counts[t.area] = (counts[t.area] || 0) + 1;
      if (t.department) counts[t.department] = (counts[t.department] || 0) + 1;
      if (t.type) counts[t.type] = (counts[t.type] || 0) + 1;
      if (t.tramo) counts[t.tramo] = (counts[t.tramo] || 0) + 1;
      if (t.status) counts[t.status] = (counts[t.status] || 0) + 1;
    });
    return counts;
  }, [tasks]);

  // Abrir modal de creación
  const handleOpenCreate = () => {
    setEditingItem(null);
    setFormNombre('');
    setFormDescripcion('');
    setFormColor('emerald');
    setFormCategoria('activo');
    setFormIsCompleted(false);
    setFormOrden((currentItems.length || 0) + 1);
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

  // Guardar creación o edición
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formNombre.trim()) {
      setFormError(isCa ? 'El nom és obligatori.' : 'El nombre es obligatorio.');
      return;
    }

    // Comprobar duplicados por nombre
    const isDuplicate = currentItems.some(item => 
      item.id !== editingItem?.id && 
      (item.nombre || item.name || '').toLowerCase().trim() === formNombre.toLowerCase().trim()
    );

    if (isDuplicate) {
      setFormError(isCa 
        ? `Ja existeix un element amb el nom "${formNombre.trim()}".` 
        : `Ya existe un elemento con el nombre "${formNombre.trim()}".`);
      return;
    }

    setIsSubmitting(true);
    setFormError('');

    try {
      const payload = {
        nombre: formNombre.trim(),
        descripcion: formDescripcion.trim(),
        updatedAt: serverTimestamp(),
        updatedBy: currentUser?.email || 'Admin'
      };

      if (activeTab === 'estados') {
        payload.color = formColor;
        payload.categoria = formCategoria;
        payload.isCompleted = formIsCompleted;
        payload.orden = Number(formOrden) || 1;
      }

      if (editingItem) {
        // Actualizar existente
        const docRef = doc(db, currentCollectionName, editingItem.id);
        await updateDoc(docRef, payload);
        if (logAction) {
          logAction(
            isCa ? `Modificació de ${currentCollectionName}` : `Modificación de ${currentCollectionName}`, 
            `ID: ${editingItem.id} -> ${formNombre.trim()}`
          );
        }
      } else {
        // Crear nuevo
        payload.createdAt = serverTimestamp();
        payload.createdBy = currentUser?.email || 'Admin';
        payload.activo = true;
        await addDoc(collection(db, currentCollectionName), payload);
        if (logAction) {
          logAction(
            isCa ? `Alta de ${currentCollectionName}` : `Alta de ${currentCollectionName}`, 
            `Nou element: ${formNombre.trim()}`
          );
        }
      }

      setIsModalOpen(false);
    } catch (error) {
      console.error(`Error guardant a ${currentCollectionName}:`, error);
      setFormError(error.message || (isCa ? 'Error en desar.' : 'Error al guardar.'));
    } finally {
      setIsSubmitting(false);
    }
  };

  // Eliminar elemento
  const handleDelete = async (item) => {
    const itemName = item.nombre || item.name || 'aquest element';
    const usage = usageCounts[itemName] || 0;

    let confirmMsg = isCa 
      ? `Segur que voleu eliminar "${itemName}" de ${currentCollectionName}?` 
      : `¿Seguro que deseas eliminar "${itemName}" de ${currentCollectionName}?`;
    if (usage > 0) {
      confirmMsg += isCa 
        ? `\n\n⚠️ Atenció: Actualment hi ha ${usage} expedient(s) utilitzant aquest valor.` 
        : `\n\n⚠️ Atención: Actualmente hay ${usage} expediente(s) usando este valor.`;
    }

    if (!window.confirm(confirmMsg)) return;

    try {
      await deleteDoc(doc(db, currentCollectionName, item.id));
      if (logAction) {
        logAction(
          isCa ? `Eliminació a ${currentCollectionName}` : `Eliminación en ${currentCollectionName}`, 
          `Eliminat: ${itemName}`
        );
      }
    } catch (error) {
      console.error(`Error eliminant de ${currentCollectionName}:`, error);
      alert((isCa ? 'Error en eliminar: ' : 'Error al eliminar: ') + error.message);
    }
  };

  // Carga Masiva Inicial / Restauración
  const handleSeedDefaults = async () => {
    let defaults = [];
    let countName = '';

    if (activeTab === 'areas') {
      defaults = isCa ? DEFAULT_AREAS_CA : DEFAULT_AREAS_ES;
      countName = isCa ? 'Àrees' : 'Áreas';
    } else if (activeTab === 'tramos') {
      defaults = isCa ? DEFAULT_TRAMOS_CA : DEFAULT_TRAMOS_ES;
      countName = isCa ? 'Tràmits' : 'Trámites';
    } else if (activeTab === 'estados') {
      defaults = isCa ? DEFAULT_ESTADOS_CA : DEFAULT_ESTADOS_ES;
      countName = isCa ? 'Estats' : 'Estados';
    }

    const confirmMsg = isCa 
      ? `Voleu afegir a Firestore els valors estàndard en Català que encara no estiguin registrats a la col·lecció de ${countName}?`
      : `¿Deseas añadir a Firestore los valores estándar que aún no estén registrados en la colección de ${countName}?`;

    if (!window.confirm(confirmMsg)) return;

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
          logAction(
            isCa ? `Càrrega Inicial de ${countName}` : `Carga Masiva Inicial de ${countName}`, 
            `${added} elements afegits a Firestore.`
          );
        }
        alert(isCa 
          ? `✅ S'han afegit ${added} ${countName.toLowerCase()} a la base de dades correctament.` 
          : `✅ Se han añadido ${added} ${countName.toLowerCase()} a la base de datos correctamente.`);
      } else {
        alert(isCa 
          ? `Tots els valors predeterminats ja existeixen a la col·lecció.` 
          : `Todos los valores predeterminados ya existen en la colección.`);
      }
    } catch (error) {
      console.error(`Error en seeding de ${currentCollectionName}:`, error);
      alert((isCa ? 'Error en inicialitzar: ' : 'Error al inicializar: ') + error.message);
    } finally {
      setIsSeeding(false);
    }
  };

  // Configuración de los 4 estados operativos oficiales según SLA / Plazos
  const handleApplyOfficial4States = async () => {
    const confirmMsg = isCa 
      ? "Voleu configurar els 4 estats operatius oficials del despatx en Català?\n\n🟢 Obert (Verd - En marxa i dins de termini)\n🟡 En Risc (Groc - Previsió de no acabar a temps)\n🔴 Amb Retard (Vermell - Termini superat automàticament)\n🔵 Tancat (Blau - Completat i liquidat)\n\nEs sincronitzaran aquests 4 estats a Firestore."
      : "¿Deseas configurar los 4 estados operativos oficiales del despacho?\n\n🟢 Abierto (Verde - En marcha y dentro de plazo)\n🟡 En Riesgo (Amarillo - Previsión de no terminar a tiempo)\n🔴 Con Retraso (Rojo - Plazo superado automáticamente)\n🔵 Cerrado (Azul - Completado y facturado)\n\nSe sincronizarán estos 4 estados en Firestore.";

    if (!window.confirm(confirmMsg)) {
      return;
    }

    setIsSeeding(true);
    const targetDefaults = isCa ? DEFAULT_ESTADOS_CA : DEFAULT_ESTADOS_ES;

    try {
      const batch = writeBatch(db);
      
      targetDefaults.forEach(def => {
        const existing = estados.find(e => {
          const eName = (e.nombre || e.name || '').toLowerCase().trim();
          const targetName = def.nombre.toLowerCase().trim();
          if (eName === targetName) return true;
          if (targetName === 'obert' && (eName === 'abierto' || eName === 'en plazo')) return true;
          if (targetName === 'en risc' && eName === 'en riesgo') return true;
          if (targetName === 'amb retard' && eName === 'con retraso') return true;
          if (targetName === 'tancat' && eName === 'cerrado') return true;
          if (targetName === 'abierto' && (eName === 'obert' || eName === 'en termini')) return true;
          if (targetName === 'en riesgo' && eName === 'en risc') return true;
          if (targetName === 'con retraso' && eName === 'amb retard') return true;
          if (targetName === 'cerrado' && eName === 'tancat') return true;
          return false;
        });

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
        logAction(
          isCa ? 'Configuració d\'Estats Oficials' : 'Configuración de Estados Oficiales', 
          isCa ? 'Sincronitzats els 4 estats oficials del despatx a Firestore' : 'Sincronizados los 4 estados oficiales del despacho en Firestore'
        );
      }
      alert(isCa 
        ? '✅ Els 4 estats oficials (Obert 🟢, En Risc 🟡, Amb Retard 🔴, Tancat 🔵) han quedat configurats a Firestore!' 
        : '✅ ¡Los 4 estados oficiales (Abierto 🟢, En Riesgo 🟡, Con Retraso 🔴, Cerrado 🔵) han quedado configurados en Firestore!');
    } catch (error) {
      console.error('Error aplicant estats oficials:', error);
      alert('Error: ' + error.message);
    } finally {
      setIsSeeding(false);
    }
  };

  const getTabLabel = (tab) => {
    if (tab === 'areas') return isCa ? 'Àrees' : 'Áreas';
    if (tab === 'tramos') return isCa ? 'Trams' : 'Tramos';
    return isCa ? 'Estats' : 'Estados';
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
              {t.classification.title}
            </h2>
            <p className="text-xs text-slate-500">
              {t.classification.subtitle}
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
            <span>{t.classification.tabs.areas}</span>
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
            <span>{t.classification.tabs.tramos}</span>
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
            <span>{t.classification.tabs.estados}</span>
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
            placeholder={t.classification.searchIn.replace('{tab}', getTabLabel(activeTab))}
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
              title={isCa 
                ? "Sincronitzar els 4 Estats Oficials de GestFlow: Obert (Verd), En Risc (Groc), Amb Retard (Vermell) i Tancat (Blau)" 
                : "Sincronizar los 4 Estados Oficiales de GestFlow: Abierto (Verde), En Riesgo (Amarillo), Con Retraso (Rojo) y Cerrado (Azul)"}
            >
              {isSeeding ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5 text-indigo-600" />}
              <span className="hidden sm:inline">{t.classification.resetOfficialStates}</span>
              <span className="sm:hidden">{isCa ? '4 Estats' : '4 Estados'}</span>
            </button>
          )}

          {/* Botón de Carga Inicial si la colección tiene pocos elementos */}
          {currentItems.length === 0 && activeTab !== 'estados' && (
            <button
              onClick={handleSeedDefaults}
              disabled={isSeeding}
              className="bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 px-3.5 py-2 rounded-xl text-xs font-bold shadow-xs flex items-center gap-1.5 transition-all disabled:opacity-50 cursor-pointer"
              title={isCa ? "Carregar catàleg estàndard inicial a Firestore" : "Cargar catálogo estándar inicial en Firestore"}
            >
              {isSeeding ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5 text-emerald-600" />}
              <span>{t.classification.loadDefaults}</span>
            </button>
          )}

          {/* Botón Nuevo Elemento */}
          <button
            onClick={handleOpenCreate}
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-xl text-xs font-bold shadow-md shadow-indigo-100 flex items-center gap-1.5 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>
              {activeTab === 'areas' 
                ? t.classification.newArea 
                : activeTab === 'tramos' 
                ? t.classification.newTramo 
                : t.classification.newState}
            </span>
          </button>
        </div>
      </div>

      {/* Avís informatiu bilingüe per a Estats */}
      {activeTab === 'estados' && (
        <div className="p-3 bg-indigo-50/70 border border-indigo-100 rounded-xl text-xs text-indigo-900 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="text-base shrink-0">🌐</span>
            <span className="text-[11px] font-medium leading-relaxed">
              {isCa 
                ? "Els 4 estats oficials (Obert, En Risc, Amb Retard i Tancat) es tradueixen automàticament al català o castellà segons l'idioma seleccionat per cada usuari a la seva interfície." 
                : "Los 4 estados oficiales (Abierto, En Riesgo, Con Retraso y Cerrado) se traducen automáticamente al catalán o castellano según el idioma seleccionado por cada usuario en su interfaz."}
            </span>
          </div>
          <button
            type="button"
            onClick={handleApplyOfficial4States}
            disabled={isSeeding}
            className="text-[11px] font-bold text-indigo-700 bg-white hover:bg-indigo-100/70 border border-indigo-200 px-3 py-1 rounded-lg shrink-0 transition-colors shadow-2xs cursor-pointer flex items-center gap-1.5"
          >
            <Sparkles className="w-3 h-3 text-indigo-600" />
            <span>{isCa ? "Sincronitzar Nomenclatura en Català" : "Sincronizar Nomenclatura en Castellano"}</span>
          </button>
        </div>
      )}

      {/* TABLA PRINCIPAL DE ELEMENTOS */}
      <div className="border border-slate-200 rounded-xl overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-600 font-bold uppercase text-[10px] tracking-wider">
                <th className="p-3.5 pl-4">{activeTab === 'estados' ? t.classification.tableHeaders.stateColor : t.classification.tableHeaders.name}</th>
                {activeTab === 'estados' && <th className="p-3.5">{t.classification.tableHeaders.category}</th>}
                {activeTab === 'estados' && <th className="p-3.5 text-center">{t.classification.tableHeaders.filterFinished}</th>}
                <th className="p-3.5">{t.classification.tableHeaders.description}</th>
                <th className="p-3.5 text-center">{t.classification.tableHeaders.inUse}</th>
                <th className="p-3.5 text-right pr-4">{t.classification.tableHeaders.actions}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredItems.map((item) => {
                const itemName = item.nombre || item.name || (isCa ? 'Sense nom' : 'Sin nombre');
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
                          {item.categoria || 'actiu'}
                        </span>
                      </td>
                    )}

                    {activeTab === 'estados' && (
                      <td className="p-3.5 text-center whitespace-nowrap">
                        {item.isCompleted ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <Check className="w-3 h-3" /> {t.classification?.tableBody?.hiddenOnFinish || (isCa ? 'Ocult en finalitzar' : 'Oculto al finalizar')}
                          </span>
                        ) : (
                          <span className="text-slate-400 text-[10px]">{t.classification?.tableBody?.inProgress || (isCa ? 'En progrés' : 'En progreso')}</span>
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
                        <span className="text-slate-400 italic text-[11px]">{t.classification?.tableBody?.noDescription || (isCa ? 'Sense descripció' : 'Sin descripción')}</span>
                      )}
                    </td>

                    {/* Expedientes en uso */}
                    <td className="p-3.5 text-center whitespace-nowrap">
                      {usage > 0 ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-100">
                          {usage === 1 
                            ? (t.classification?.tableBody?.singleExp || (isCa ? '1 expedient' : '1 expediente')) 
                            : (t.classification?.tableBody?.multiExp ? t.classification.tableBody.multiExp.replace('{count}', usage) : `${usage} ${isCa ? 'expedients' : 'expedientes'}`)}
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] text-slate-400 bg-slate-100">
                          0 {isCa ? 'expedients' : 'expedientes'}
                        </span>
                      )}
                    </td>

                    {/* Acciones */}
                    <td className="p-3.5 pr-4 text-right whitespace-nowrap">
                      <div className="inline-flex items-center gap-1">
                        <button
                          onClick={() => handleOpenEdit(item)}
                          className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors cursor-pointer"
                          title={isCa ? "Editar element" : "Editar elemento"}
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDelete(item)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                          title={isCa ? "Eliminar element" : "Eliminar elemento"}
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
                          ? (t.classification?.tableBody?.emptyFilter ? t.classification.tableBody.emptyFilter.replace('{term}', searchTerm) : (isCa ? `Sense resultats per "${searchTerm}"` : `Sin resultados para "${searchTerm}"`))
                          : (t.classification?.tableBody?.emptyCollection ? t.classification.tableBody.emptyCollection.replace('{tab}', getTabLabel(activeTab).toLowerCase()) : (isCa ? 'Sense elements' : 'Sin elementos'))}
                      </p>
                      {!searchTerm && (
                        <div className="mt-2 flex items-center gap-3">
                          <button
                            onClick={handleOpenCreate}
                            className="text-xs bg-indigo-600 text-white font-bold px-3 py-1.5 rounded-lg hover:bg-indigo-700 transition-colors cursor-pointer"
                          >
                            {(t.classification?.tableBody?.createFirst || '+ Crear el primer {singular}').replace('{singular}', activeTab === 'areas' ? (isCa ? 'Àrea' : 'Área') : activeTab === 'tramos' ? (isCa ? 'Tram' : 'Tramo') : (isCa ? 'Estat' : 'Estado'))}
                          </button>
                          <button
                            onClick={handleSeedDefaults}
                            className="text-xs bg-slate-100 text-slate-700 font-bold px-3 py-1.5 rounded-lg hover:bg-slate-200 border border-slate-200 transition-colors cursor-pointer"
                          >
                            {t.classification?.tableBody?.loadStandardValues || (isCa ? 'Carregar valors estàndard' : 'Cargar valores estándar')}
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
          {(t.classification?.footer?.showing || 'Mostrant {filtered} de {total} {tab}')
            .replace('{filtered}', filteredItems.length)
            .replace('{total}', currentItems.length)
            .replace('{tab}', getTabLabel(activeTab).toLowerCase())}
        </span>
        <button
          onClick={handleSeedDefaults}
          disabled={isSeeding}
          className="text-indigo-600 hover:text-indigo-800 font-bold flex items-center gap-1 hover:underline disabled:opacity-50 cursor-pointer"
        >
          <Sparkles className="w-3 h-3" />
          <span>{t.classification?.footer?.restoreMissing || (isCa ? 'Restaurar / Afegir valors estàndard absents' : 'Restaurar / Añadir valores estándar ausentes')}</span>
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
                      ? (activeTab === 'areas' ? t.classification.editArea : activeTab === 'tramos' ? t.classification.editTramo : t.classification.editState)
                      : (activeTab === 'areas' ? t.classification.newArea : activeTab === 'tramos' ? t.classification.newTramo : t.classification.newState)}
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    {isCa ? 'Col·lecció de Firestore:' : 'Colección de Firestore:'} <code className="text-indigo-600 font-mono font-bold">{currentCollectionName}</code>
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
                  <span className="text-xs font-semibold text-slate-500">{t.classification.modal.badgePreview}</span>
                  <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${STATUS_COLORS[formColor]?.colorClass || STATUS_COLORS.slate.colorClass} shadow-2xs`}>
                    <span className={`w-2 h-2 rounded-full ${STATUS_COLORS[formColor]?.dotColor || STATUS_COLORS.slate.dotColor}`}></span>
                    <span>{formNombre || (isCa ? 'Nom de l\'Estat' : 'Nombre del Estado')}</span>
                  </span>
                </div>
              )}

              {/* Campo Nombre */}
              <div>
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wide block mb-1">
                  {t.classification.modal.nameLabel.replace('{entity}', activeTab === 'areas' ? (isCa ? 'l\'Àrea / Departament' : 'el Área / Departamento') : activeTab === 'tramos' ? (isCa ? 'el Tram / Tràmit' : 'el Tramo / Trámite') : (isCa ? 'l\'Estat' : 'el Estado'))} <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formNombre}
                  onChange={(e) => setFormNombre(e.target.value)}
                  placeholder={
                    activeTab === 'areas' 
                      ? t.classification.modal.namePlaceholderArea 
                      : activeTab === 'tramos' 
                      ? t.classification.modal.namePlaceholderTramo 
                      : t.classification.modal.namePlaceholderState
                  }
                  className="w-full border border-slate-300 rounded-xl p-2.5 text-xs text-slate-800 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all"
                  autoFocus
                />
              </div>

              {/* Campos específicos de Estados: Selector de Color */}
              {activeTab === 'estados' && (
                <div>
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wide block mb-2">
                    {t.classification.modal.colorLabel}
                  </label>
                  <div className="grid grid-cols-5 gap-2">
                    {Object.values(STATUS_COLORS).map((c) => {
                      const isSelected = formColor === c.id;
                      const colorName = isCa ? (c.label_ca || c.label) : c.label;
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
                          title={colorName}
                        >
                          <span className={`w-4 h-4 rounded-full ${c.bgClass} shadow-2xs flex items-center justify-center text-white`}>
                            {isSelected && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                          </span>
                          <span className="text-[10px] font-semibold text-slate-700 truncate max-w-full text-center">
                            {colorName.split(' ')[0]}
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
                      {t.classification.modal.categoryLabel}
                    </label>
                    <select
                      value={formCategoria}
                      onChange={(e) => setFormCategoria(e.target.value)}
                      className="w-full border border-slate-300 rounded-xl p-2 text-xs text-slate-800 focus:border-indigo-500 outline-none"
                    >
                      <option value="activo">{t.classification.modal.catActive}</option>
                      <option value="riesgo">{t.classification.modal.catRisk}</option>
                      <option value="urgente">{t.classification.modal.catUrgent}</option>
                      <option value="completado">{t.classification.modal.catCompleted}</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-700 uppercase tracking-wide block mb-1">
                      {t.classification.modal.orderLabel}
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
                    <span className="font-bold text-slate-800 block">
                      {isCa ? 'És un estat finalitzat / tramitat?' : '¿Es un estado finalizado / tramitado?'}
                    </span>
                    <span className="text-[11px] text-slate-500">
                      {t.classification.modal.autoHide}
                    </span>
                  </label>
                </div>
              )}

              {/* Campo Descripción */}
              <div>
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wide block mb-1">
                  {t.classification.modal.descLabel}
                </label>
                <textarea
                  value={formDescripcion}
                  onChange={(e) => setFormDescripcion(e.target.value)}
                  placeholder={t.classification.modal.descPlaceholder}
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
                  {t.common?.cancel || (isCa ? 'Cancel·lar' : 'Cancelar')}
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-md shadow-indigo-100 flex items-center gap-1.5 transition-all disabled:opacity-50 cursor-pointer"
                >
                  {isSubmitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>{editingItem ? (isCa ? 'Desar Canvis' : 'Guardar Cambios') : (isCa ? 'Crear' : 'Crear')}</span>
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
