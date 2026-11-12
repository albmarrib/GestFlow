import React, { useState, useEffect } from 'react';
import { 
  collection, 
  onSnapshot, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  serverTimestamp 
} from 'firebase/firestore';
import { db } from '../firebase';
import { 
  FileText, 
  Plus, 
  Edit3, 
  Trash2, 
  Copy, 
  CheckCircle2, 
  Clock, 
  Coins, 
  ArrowUp, 
  ArrowDown, 
  Briefcase, 
  Tag, 
  Search, 
  Sparkles, 
  Layers, 
  CheckSquare, 
  AlertCircle,
  X,
  Save,
  Users
} from 'lucide-react';

export const DEFAULT_PLANTILLAS = [
  {
    titulo: "Constitución de Sociedad Limitada (S.L.)",
    area: "Fiscal",
    tramo: "Sociedades",
    diasVencimiento: 15,
    descripcion: "Trámite completo de constitución de sociedad: denominación, estatutos, notaría, ITP y alta censal.",
    billingType: "billable",
    esFacturable: true,
    precioHonorarios: 350,
    pasos: [
      { id: "sl_1", text: "Solicitud de Certificado de Denominación Social en el Registro Central", defaultAssignee: "" },
      { id: "sl_2", text: "Apertura de cuenta bancaria o certificado de aportaciones dinerarias de capital social", defaultAssignee: "" },
      { id: "sl_3", text: "Redacción de estatutos sociales y concertación de cita para firma ante Notario", defaultAssignee: "" },
      { id: "sl_4", text: "Obtención de NIF provisional en la AEAT (Modelo 036) y liquidación de exención de ITP-AJD", defaultAssignee: "" },
      { id: "sl_5", text: "Inscripción en el Registro Mercantil provincial y solicitud de NIF definitivo", defaultAssignee: "" }
    ]
  },
  {
    titulo: "Alta de Autónomo (AEAT 036/037 + RETA Seguridad Social)",
    area: "Laboral",
    tramo: "Altas",
    diasVencimiento: 3,
    descripcion: "Alta censal en la Agencia Tributaria y tramitación telemática en el Régimen Especial de Trabajadores Autónomos.",
    billingType: "billable",
    esFacturable: true,
    precioHonorarios: 95,
    pasos: [
      { id: "aut_1", text: "Recopilar DNI, cuenta bancaria (IBAN) y verificar certificado digital activo del cliente", defaultAssignee: "" },
      { id: "aut_2", text: "Determinación del epígrafe IAE y régimen de estimación (Directa Simplificada o Módulos)", defaultAssignee: "" },
      { id: "aut_3", text: "Presentación telemática del Modelo 036/037 de alta censal en la AEAT", defaultAssignee: "" },
      { id: "aut_4", text: "Tramitación de alta telemática en el RETA de la Seguridad Social y elección de base de cotización", defaultAssignee: "" }
    ]
  },
  {
    titulo: "Liquidación Trimestral de Impuestos (Modelos 303, 111 y 115)",
    area: "Fiscal",
    tramo: "Impuestos",
    diasVencimiento: 10,
    descripcion: "Revisión, conciliación de facturas de ingresos y gastos del trimestre y presentación de liquidaciones.",
    billingType: "included",
    esFacturable: false,
    precioHonorarios: 0,
    pasos: [
      { id: "imp_1", text: "Reclamar y recopilar facturas emitidas, recibidas y tickets del trimestre al cliente", defaultAssignee: "" },
      { id: "imp_2", text: "Punteo, contabilización de ingresos/gastos y conciliación bancaria completa", defaultAssignee: "" },
      { id: "imp_3", text: "Generación y revisión de borradores de Modelos 303 (IVA), 111 (Retenciones) y 115 (Alquileres)", defaultAssignee: "" },
      { id: "imp_4", text: "Envío de borradores al cliente para visto bueno y presentación/domiciliación bancaria en AEAT", defaultAssignee: "" }
    ]
  },
  {
    titulo: "Cambio de Titularidad de Vehículo (Traspaso DGT)",
    area: "Tráfico",
    tramo: "Traspasos",
    diasVencimiento: 5,
    descripcion: "Trámite telemático de cambio de nombre de vehículo en la Dirección General de Tráfico e impuesto 620/621.",
    billingType: "billable",
    esFacturable: true,
    precioHonorarios: 80,
    pasos: [
      { id: "dgt_1", text: "Solicitar informe telemático de tráfico DGT para verificar ausencia de embargos, reservas de dominio o precintos", defaultAssignee: "" },
      { id: "dgt_2", text: "Contrato de compraventa debidamente firmado y copias de DNI de comprador y vendedor", defaultAssignee: "" },
      { id: "dgt_3", text: "Liquidación telemática del Impuesto de Transmisiones Patrimoniales (Modelo 620/621)", defaultAssignee: "" },
      { id: "dgt_4", text: "Presentación telemática en la plataforma DGT, pago de Tasa 1.5 y emisión del permiso de circulación provisional", defaultAssignee: "" }
    ]
  },
  {
    titulo: "Contratación Laboral y Alta en Seguridad Social",
    area: "Laboral",
    tramo: "Contratos",
    diasVencimiento: 2,
    descripcion: "Formalización de contrato de trabajo, alta previa en el Sistema RED y registro en el SEPE.",
    billingType: "billable",
    esFacturable: true,
    precioHonorarios: 50,
    pasos: [
      { id: "lab_1", text: "Recopilar datos del trabajador (DNI, NUSS, cuenta bancaria, titulación y categoría del convenio)", defaultAssignee: "" },
      { id: "lab_2", text: "Tramitación de alta previa en el Sistema RED de la Seguridad Social con la cuenta de cotización de la empresa", defaultAssignee: "" },
      { id: "lab_3", text: "Redacción del contrato de trabajo y comunicación telemática obligatoria en Contrat@ (SEPE)", defaultAssignee: "" },
      { id: "lab_4", text: "Envío del contrato a firma por las partes y entrega de copia básica al trabajador", defaultAssignee: "" }
    ]
  },
  {
    titulo: "Declaración de la Renta y Patrimonio (IRPF Modelo 100)",
    area: "Fiscal",
    tramo: "Renta",
    diasVencimiento: 7,
    descripcion: "Confección, optimización de deducciones autonómicas y presentación telemática del Modelo 100 de IRPF.",
    billingType: "billable",
    esFacturable: true,
    precioHonorarios: 75,
    pasos: [
      { id: "irpf_1", text: "Descarga de datos fiscales oficiales en la AEAT mediante certificado digital o Cl@ve del contribuyente", defaultAssignee: "" },
      { id: "irpf_2", text: "Revisión minuciosa de circunstancias familiares, deducciones autonómicas, planes de pensiones y alquileres", defaultAssignee: "" },
      { id: "irpf_3", text: "Cálculo comparativo y optimización de tributación individual frente a conjunta", defaultAssignee: "" },
      { id: "irpf_4", text: "Presentación telemática del Modelo 100 en la AEAT y entrega del justificante de liquidación al cliente", defaultAssignee: "" }
    ]
  }
];

export default function TemplateManager({ 
  areas = [], 
  tramos = [], 
  usersList = [], 
  currentUser, 
  logAction,
  lang = 'ca'
}) {
  const isCa = lang === 'ca';
  const [plantillas, setPlantillas] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedAreaFilter, setSelectedAreaFilter] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isSeeding, setIsSeeding] = useState(false);

  // Form State
  const initialFormState = {
    titulo: '',
    area: areas[0]?.nombre || 'Fiscal',
    tramo: tramos[0]?.nombre || 'General',
    diasVencimiento: 15,
    descripcion: '',
    billingType: 'billable', // 'billable' | 'included' | 'non_billable'
    precioHonorarios: 150,
    pasos: []
  };

  const [formData, setFormData] = useState(initialFormState);
  const [newStepText, setNewStepText] = useState('');
  const [newStepAssignee, setNewStepAssignee] = useState('');

  // Sincronización en tiempo real con Firestore
  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'plantillas_tareas'), (snapshot) => {
      const data = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      data.sort((a, b) => (a.titulo || '').localeCompare(b.titulo || ''));
      setPlantillas(data);
    }, (err) => console.warn("Error cargando plantillas_tareas:", err));

    return () => unsub();
  }, []);

  const openNewModal = () => {
    setEditingTemplate(null);
    setFormData({
      ...initialFormState,
      area: areas[0]?.nombre || 'Fiscal',
      tramo: tramos[0]?.nombre || 'General'
    });
    setNewStepText('');
    setNewStepAssignee('');
    setIsModalOpen(true);
  };

  const openEditModal = (template) => {
    setEditingTemplate(template);
    setFormData({
      titulo: template.titulo || '',
      area: template.area || areas[0]?.nombre || 'Fiscal',
      tramo: template.tramo || tramos[0]?.nombre || 'General',
      diasVencimiento: template.diasVencimiento !== undefined ? template.diasVencimiento : 15,
      descripcion: template.descripcion || '',
      billingType: template.billingType || (template.esFacturable === false ? 'included' : 'billable'),
      precioHonorarios: template.precioHonorarios !== undefined ? template.precioHonorarios : 150,
      pasos: Array.isArray(template.pasos) ? [...template.pasos] : []
    });
    setNewStepText('');
    setNewStepAssignee('');
    setIsModalOpen(true);
  };

  const handleDuplicate = async (template) => {
    try {
      const clone = {
        ...template,
        titulo: `${template.titulo} (Copia)`,
        createdAt: serverTimestamp(),
        createdBy: currentUser?.email || 'admin'
      };
      delete clone.id;
      await addDoc(collection(db, 'plantillas_tareas'), clone);
      if (logAction) {
        logAction('Duplicada Plantilla Predefinida', `Plantilla: ${template.titulo}`);
      }
    } catch (e) {
      alert("Error al duplicar plantilla: " + e.message);
    }
  };

  const handleDelete = async (template) => {
    if (!window.confirm(`¿Seguro que deseas eliminar la plantilla "${template.titulo}"? Esta acción no afectará a los expedientes ya creados.`)) {
      return;
    }
    try {
      await deleteDoc(doc(db, 'plantillas_tareas', template.id));
      if (logAction) {
        logAction('Eliminada Plantilla Predefinida', `Plantilla: ${template.titulo}`);
      }
    } catch (e) {
      alert("Error al eliminar plantilla: " + e.message);
    }
  };

  // Gestión de pasos en el formulario
  const handleAddStep = () => {
    if (!newStepText.trim()) return;
    const newStep = {
      id: 'step_' + Date.now(),
      text: newStepText.trim(),
      defaultAssignee: newStepAssignee.trim()
    };
    setFormData({
      ...formData,
      pasos: [...formData.pasos, newStep]
    });
    setNewStepText('');
  };

  const handleRemoveStep = (stepId) => {
    setFormData({
      ...formData,
      pasos: formData.pasos.filter(s => s.id !== stepId)
    });
  };

  const handleMoveStep = (index, direction) => {
    const updated = [...formData.pasos];
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= updated.length) return;
    const temp = updated[index];
    updated[index] = updated[targetIndex];
    updated[targetIndex] = temp;
    setFormData({ ...formData, pasos: updated });
  };

  // Guardar plantilla en Firestore
  const handleSave = async (e) => {
    e.preventDefault();
    if (!formData.titulo.trim()) {
      alert("Introduce un título para la plantilla.");
      return;
    }

    setIsSaving(true);
    try {
      const payload = {
        titulo: formData.titulo.trim(),
        area: formData.area || '',
        tramo: formData.tramo || '',
        diasVencimiento: Number(formData.diasVencimiento) || 0,
        descripcion: formData.descripcion.trim(),
        billingType: formData.billingType,
        esFacturable: formData.billingType === 'billable',
        precioHonorarios: formData.billingType === 'billable' ? Number(formData.precioHonorarios) || 0 : 0,
        pasos: formData.pasos,
        updatedAt: serverTimestamp()
      };

      if (editingTemplate) {
        await updateDoc(doc(db, 'plantillas_tareas', editingTemplate.id), payload);
        if (logAction) logAction('Actualizada Plantilla', `Título: ${formData.titulo}`);
      } else {
        payload.createdAt = serverTimestamp();
        payload.createdBy = currentUser?.email || 'admin';
        await addDoc(collection(db, 'plantillas_tareas'), payload);
        if (logAction) logAction('Creada Plantilla', `Título: ${formData.titulo}`);
      }

      setIsModalOpen(false);
    } catch (e) {
      alert("Error al guardar la plantilla: " + e.message);
    } finally {
      setIsSaving(false);
    }
  };

  // Sembrar plantillas por defecto recomendadas
  const handleSeedDefaults = async () => {
    if (!window.confirm("¿Deseas inicializar el catálogo con las 6 plantillas frecuentes de asesoría/gestoría? Se añadirán a tu catálogo actual.")) {
      return;
    }
    setIsSeeding(true);
    try {
      for (const p of DEFAULT_PLANTILLAS) {
        await addDoc(collection(db, 'plantillas_tareas'), {
          ...p,
          createdAt: serverTimestamp(),
          createdBy: currentUser?.email || 'sistema'
        });
      }
      if (logAction) logAction('Inicializadas Plantillas Maestras', 'Cargadas 6 plantillas de gestoría');
      alert("¡Plantillas frecuentes añadidas con éxito!");
    } catch (e) {
      alert("Error inicializando plantillas: " + e.message);
    } finally {
      setIsSeeding(false);
    }
  };

  // Filtrado de plantillas
  const filteredPlantillas = plantillas.filter(p => {
    const matchesSearch = (p.titulo || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                          (p.descripcion || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                          (p.tramo || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchesArea = !selectedAreaFilter || p.area === selectedAreaFilter;
    return matchesSearch && matchesArea;
  });

  return (
    <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-premium space-y-6">
      
      {/* CABECERA DE LA SECCIÓN */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-4 border-b border-slate-100">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-500 to-amber-400 text-white flex items-center justify-center shadow-xs">
            <Layers className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-900 tracking-tight flex items-center gap-2">
              {isCa ? 'Plantilles de Tràmits i Tasques Predefinides' : 'Plantillas de Trámites y Tareas Predefinidas'}
              <span className="bg-amber-100 text-amber-800 text-[11px] font-semibold px-2 py-0.5 rounded-full border border-amber-200/60">
                {plantillas.length} {isCa ? 'actives' : 'activas'}
              </span>
            </h2>
            <p className="text-xs text-slate-500">
              {isCa 
                ? 'Dissenya plantilles amb passos GTD, assignacions i preus per defecte per agilitzar la creació d\'expedients recurrents.' 
                : 'Diseña plantillas con pasos GTD, asignaciones y precios por defecto para agilizar la creación de expedientes recurrentes.'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          {plantillas.length === 0 && (
            <button
              onClick={handleSeedDefaults}
              disabled={isSeeding}
              className="bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200/80 px-3 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all shadow-2xs cursor-pointer"
            >
              <Sparkles className="w-4 h-4 text-amber-600" />
              <span>{isSeeding ? (isCa ? 'Carregant...' : 'Cargando...') : (isCa ? 'Carregar Plantilles Recomanades' : 'Cargar Plantillas Recomendadas')}</span>
            </button>
          )}

          <button
            onClick={openNewModal}
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-3.5 py-2 rounded-xl text-xs font-bold shadow-xs hover:shadow-premium-hover flex items-center gap-1.5 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>{isCa ? 'Nova Plantilla' : 'Nueva Plantilla'}</span>
          </button>
        </div>
      </div>

      {/* BARRA DE BÚSQUEDA Y FILTRO */}
      <div className="flex flex-col sm:flex-row gap-2.5 items-center justify-between">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder={isCa ? "Cercar per nom, tràmit o descripció..." : "Buscar por nombre, trámite o descripción..."}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-slate-50/80 border border-slate-200 rounded-xl text-xs outline-none focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-slate-800"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <select
            value={selectedAreaFilter}
            onChange={(e) => setSelectedAreaFilter(e.target.value)}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500/20 cursor-pointer"
          >
            <option value="">{isCa ? 'Totes les Àrees' : 'Todas las Áreas'}</option>
            {areas.map(a => (
              <option key={a.id || a.nombre} value={a.nombre || a.name}>{a.nombre || a.name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* LISTADO DE TARJETAS DE PLANTILLAS */}
      {filteredPlantillas.length === 0 ? (
        <div className="text-center py-12 px-4 rounded-xl border border-dashed border-slate-200 bg-slate-50/50">
          <Layers className="w-8 h-8 text-slate-300 mx-auto mb-2" />
          <h4 className="text-sm font-bold text-slate-700">{isCa ? 'Sense plantilles configurades' : 'No hay plantillas registradas'}</h4>
          <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
            {isCa 
              ? 'Crea la teva primera plantilla per a expedients recurrents o prem a "Carregar Plantilles Recomanades" per importar els 6 tràmits més freqüents d\'una gestoria.' 
              : 'Crea tu primera plantilla para expedientes recurrentes o pulsa en "Cargar Plantillas Recomendadas" para importar los 6 trámites más frecuentes de una gestoría.'}
          </p>
          <div className="mt-4 flex justify-center gap-2">
            <button
              onClick={handleSeedDefaults}
              disabled={isSeeding}
              className="bg-amber-600 hover:bg-amber-700 text-white px-3.5 py-1.5 rounded-xl text-xs font-bold shadow-xs flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>{isCa ? 'Carregar 6 Plantilles d\'Assessoria' : 'Cargar 6 Plantillas de Asesoría'}</span>
            </button>
            <button
              onClick={openNewModal}
              className="bg-indigo-600 hover:bg-indigo-700 text-white px-3.5 py-1.5 rounded-xl text-xs font-bold shadow-xs flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{isCa ? 'Crear Manualment' : 'Crear Manualmente'}</span>
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredPlantillas.map((plantilla) => {
            const pasosCount = Array.isArray(plantilla.pasos) ? plantilla.pasos.length : 0;
            const isBillable = plantilla.billingType === 'billable' || plantilla.esFacturable;
            
            return (
              <div 
                key={plantilla.id}
                className="bg-white rounded-xl border border-slate-200/90 hover:border-indigo-300 shadow-2xs hover:shadow-premium transition-all p-4.5 flex flex-col justify-between group"
              >
                <div>
                  {/* Fila superior: Badges de Clasificación */}
                  <div className="flex flex-wrap items-center justify-between gap-1.5 mb-2.5">
                    <div className="flex items-center gap-1.5">
                      <span className="bg-indigo-50 text-indigo-700 text-[10px] font-bold px-2 py-0.5 rounded-md border border-indigo-100 flex items-center gap-1">
                        <Briefcase className="w-2.5 h-2.5" />
                        {plantilla.area || 'General'}
                      </span>
                      {plantilla.tramo && (
                        <span className="bg-slate-100 text-slate-700 text-[10px] font-semibold px-2 py-0.5 rounded-md border border-slate-200 flex items-center gap-1">
                          <Tag className="w-2.5 h-2.5" />
                          {plantilla.tramo}
                        </span>
                      )}
                    </div>

                    {/* Badge Económico */}
                    {isBillable ? (
                      <span className="bg-emerald-50 text-emerald-700 text-[10px] font-bold px-2 py-0.5 rounded-md border border-emerald-200 flex items-center gap-1">
                        <Coins className="w-3 h-3 text-emerald-600" />
                        {plantilla.precioHonorarios || 0} €
                      </span>
                    ) : (
                      <span className="bg-slate-100 text-slate-500 text-[10px] font-semibold px-2 py-0.5 rounded-md">
                        {plantilla.billingType === 'included' ? 'Cuota mensual' : 'No facturable'}
                      </span>
                    )}
                  </div>

                  {/* Título de la Plantilla */}
                  <h3 className="text-sm font-bold text-slate-900 group-hover:text-indigo-600 transition-colors leading-snug mb-1">
                    {plantilla.titulo}
                  </h3>

                  {/* Descripción */}
                  {plantilla.descripcion && (
                    <p className="text-[11px] text-slate-500 line-clamp-2 leading-relaxed mb-3">
                      {plantilla.descripcion}
                    </p>
                  )}

                  {/* Metadatos: Días y Pasos GTD */}
                  <div className="flex items-center gap-3 text-[11px] text-slate-500 py-2 border-t border-slate-100 my-2">
                    <span className="flex items-center gap-1 font-medium">
                      <Clock className="w-3.5 h-3.5 text-amber-500" />
                      {plantilla.diasVencimiento ? `${plantilla.diasVencimiento} días plazo` : 'Sin plazo'}
                    </span>
                    <span className="flex items-center gap-1 font-medium">
                      <CheckSquare className="w-3.5 h-3.5 text-indigo-500" />
                      {pasosCount} {pasosCount === 1 ? 'paso GTD' : 'pasos GTD'}
                    </span>
                  </div>

                  {/* Lista previa de pasos */}
                  {pasosCount > 0 && (
                    <div className="space-y-1 mb-3">
                      {plantilla.pasos.slice(0, 3).map((paso, idx) => (
                        <div key={idx} className="flex items-start gap-1.5 text-[11px] text-slate-600">
                          <CheckCircle2 className="w-3 h-3 text-slate-400 shrink-0 mt-0.5" />
                          <span className="truncate">{paso.text}</span>
                        </div>
                      ))}
                      {pasosCount > 3 && (
                        <span className="text-[10px] text-slate-400 italic block pl-4">
                          +{pasosCount - 3} pasos adicionales...
                        </span>
                      )}
                    </div>
                  )}
                </div>

                {/* Acciones de la Tarjeta */}
                <div className="flex items-center justify-between pt-2.5 border-t border-slate-100 mt-2">
                  <button
                    onClick={() => handleDuplicate(plantilla)}
                    className="text-slate-400 hover:text-indigo-600 text-xs font-semibold flex items-center gap-1 transition-colors p-1"
                    title="Duplicar esta plantilla"
                  >
                    <Copy className="w-3.5 h-3.5" />
                    <span>Duplicar</span>
                  </button>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => openEditModal(plantilla)}
                      className="bg-slate-50 hover:bg-indigo-50 text-slate-700 hover:text-indigo-600 border border-slate-200 hover:border-indigo-200 px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1 transition-all"
                    >
                      <Edit3 className="w-3 h-3" />
                      <span>Editar</span>
                    </button>
                    <button
                      onClick={() => handleDelete(plantilla)}
                      className="text-slate-400 hover:text-rose-600 hover:bg-rose-50 p-1.5 rounded-lg transition-colors"
                      title="Eliminar plantilla"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* MODAL DE CREACIÓN / EDICIÓN DE PLANTILLA */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-md p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col border border-slate-200/80 animate-in zoom-in-95 duration-200 my-auto">
            
            {/* Cabecera del Modal */}
            <div className="flex justify-between items-center p-4 sm:p-5 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center border border-amber-200/60 font-bold">
                  <Layers className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    {editingTemplate ? 'Editar Plantilla de Trámite' : 'Nueva Plantilla de Trámite'}
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Define la configuración y secuencia GTD que se aplicará automáticamente al crear expedientes.
                  </p>
                </div>
              </div>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="w-7 h-7 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center transition-colors text-xs font-bold"
              >
                ✕
              </button>
            </div>

            {/* Formulario */}
            <form onSubmit={handleSave} className="p-4 sm:p-5 overflow-y-auto space-y-4 flex-1">
              
              {/* Título de la Plantilla */}
              <div>
                <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wide block mb-1">
                  Nombre del Trámite / Plantilla <span className="text-rose-500">*</span>
                </label>
                <input
                  required
                  type="text"
                  placeholder="Ej: Constitución de Sociedad Limitada (S.L.)"
                  value={formData.titulo}
                  onChange={(e) => setFormData({ ...formData, titulo: e.target.value })}
                  className="w-full border border-slate-300 py-2 px-3 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none text-xs text-slate-800 font-semibold"
                />
              </div>

              {/* Área, Trámite y Días de Vencimiento */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wide block mb-1">
                    Área por Defecto
                  </label>
                  <select
                    value={formData.area}
                    onChange={(e) => setFormData({ ...formData, area: e.target.value })}
                    className="w-full border border-slate-300 py-2 px-3 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none text-xs text-slate-800 bg-white"
                  >
                    {areas.length > 0 ? (
                      areas.map(a => <option key={a.id || a.nombre} value={a.nombre || a.name}>{a.nombre || a.name}</option>)
                    ) : (
                      <>
                        <option value="Fiscal">Fiscal</option>
                        <option value="Laboral">Laboral</option>
                        <option value="Tráfico">Tráfico</option>
                        <option value="Contabilidad">Contabilidad</option>
                        <option value="Jurídico">Jurídico</option>
                      </>
                    )}
                  </select>
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wide block mb-1">
                    Trámite / Tipo
                  </label>
                  <select
                    value={formData.tramo}
                    onChange={(e) => setFormData({ ...formData, tramo: e.target.value })}
                    className="w-full border border-slate-300 py-2 px-3 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none text-xs text-slate-800 bg-white"
                  >
                    {tramos.length > 0 ? (
                      tramos.map(t => <option key={t.id || t.nombre} value={t.nombre || t.name}>{t.nombre || t.name}</option>)
                    ) : (
                      <>
                        <option value="General">General</option>
                        <option value="Sociedades">Sociedades</option>
                        <option value="Altas">Altas</option>
                        <option value="Impuestos">Impuestos</option>
                        <option value="Contratos">Contratos</option>
                        <option value="Traspasos">Traspasos</option>
                      </>
                    )}
                  </select>
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wide block mb-1">
                    Plazo Estimado (Días)
                  </label>
                  <input
                    type="number"
                    min="0"
                    placeholder="15"
                    value={formData.diasVencimiento}
                    onChange={(e) => setFormData({ ...formData, diasVencimiento: e.target.value })}
                    className="w-full border border-slate-300 py-2 px-3 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none text-xs text-slate-800"
                  />
                </div>
              </div>

              {/* Configuración Económica / Facturación */}
              <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200/80 space-y-2.5">
                <label className="text-[11px] font-bold text-slate-800 uppercase tracking-wide flex items-center gap-1.5">
                  <Coins className="w-3.5 h-3.5 text-amber-500" />
                  <span>Configuración Económica y Honorarios</span>
                </label>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] text-slate-500 font-semibold block mb-1">Tipo de Facturación</label>
                    <select
                      value={formData.billingType}
                      onChange={(e) => setFormData({ ...formData, billingType: e.target.value })}
                      className="w-full border border-slate-300 py-1.5 px-3 rounded-lg text-xs bg-white text-slate-800 outline-none"
                    >
                      <option value="billable">Facturable (Honorarios específicos)</option>
                      <option value="included">Incluido en Cuota Mensual del Cliente</option>
                      <option value="non_billable">No Facturable / Gestión Interna</option>
                    </select>
                  </div>

                  {formData.billingType === 'billable' && (
                    <div>
                      <label className="text-[10px] text-slate-500 font-semibold block mb-1">Importe de Honorarios (€)</label>
                      <div className="relative">
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={formData.precioHonorarios}
                          onChange={(e) => setFormData({ ...formData, precioHonorarios: e.target.value })}
                          className="w-full border border-slate-300 py-1.5 pl-3 pr-7 rounded-lg text-xs font-bold text-slate-800 outline-none focus:ring-2 focus:ring-indigo-500/20"
                          placeholder="150.00"
                        />
                        <span className="absolute right-2.5 top-2 text-xs font-bold text-slate-400">€</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Descripción / Instrucciones Operativas */}
              <div>
                <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wide block mb-1">
                  Guía o Instrucciones Operativas
                </label>
                <textarea
                  rows="2"
                  placeholder="Detalles sobre documentación requerida, enlaces o advertencias para el asesor..."
                  value={formData.descripcion}
                  onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
                  className="w-full border border-slate-300 py-1.5 px-3 rounded-xl text-xs text-slate-800 outline-none focus:ring-2 focus:ring-indigo-500/20"
                ></textarea>
              </div>

              {/* GESTOR DE PASOS GTD PREDEFINIDOS */}
              <div className="pt-2 border-t border-slate-200">
                <div className="flex justify-between items-center mb-2">
                  <label className="text-[11px] font-bold text-slate-800 uppercase tracking-wide flex items-center gap-1.5">
                    <CheckSquare className="w-3.5 h-3.5 text-indigo-600" />
                    <span>Secuencia de Pasos GTD Predefinidos ({formData.pasos.length})</span>
                  </label>
                  <span className="text-[10px] text-slate-400">Se precargarán en orden al crear el expediente</span>
                </div>

                {/* Formulario rápido para añadir paso */}
                <div className="flex flex-col sm:flex-row gap-2 bg-indigo-50/50 p-2.5 rounded-xl border border-indigo-100 mb-3">
                  <input
                    type="text"
                    placeholder="Descripción del paso (ej: Solicitar NIF provisional en AEAT)..."
                    value={newStepText}
                    onChange={(e) => setNewStepText(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddStep(); }}}
                    className="flex-1 bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-xs text-slate-800 outline-none focus:ring-2 focus:ring-indigo-500/20"
                  />

                  <select
                    value={newStepAssignee}
                    onChange={(e) => setNewStepAssignee(e.target.value)}
                    className="bg-white border border-slate-200 rounded-lg px-2 py-1.5 text-xs text-slate-700 outline-none"
                  >
                    <option value="">(Asignación abierta)</option>
                    {usersList.map(u => (
                      <option key={u.id || u.email} value={u.email || u.id}>
                        {u.name ? `${u.name} (${u.email})` : u.email}
                      </option>
                    ))}
                  </select>

                  <button
                    type="button"
                    onClick={handleAddStep}
                    disabled={!newStepText.trim()}
                    className="bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 text-white px-3 py-1.5 rounded-lg text-xs font-bold transition-all shrink-0 flex items-center justify-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Añadir</span>
                  </button>
                </div>

                {/* Lista de pasos con reordenación y borrado */}
                {formData.pasos.length === 0 ? (
                  <div className="text-center py-4 bg-slate-50 rounded-xl border border-dashed border-slate-200 text-slate-400 text-xs">
                    No has añadido pasos todavía. Escribe arriba para añadir la secuencia de acciones del trámite.
                  </div>
                ) : (
                  <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                    {formData.pasos.map((paso, idx) => (
                      <div 
                        key={paso.id || idx}
                        className="flex items-center justify-between gap-2 p-2 bg-slate-50 border border-slate-200/80 rounded-xl text-xs hover:bg-slate-100/70 transition-colors"
                      >
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          <span className="w-5 h-5 rounded-full bg-indigo-100 text-indigo-700 font-bold text-[10px] flex items-center justify-center shrink-0">
                            {idx + 1}
                          </span>
                          <span className="text-slate-800 font-medium truncate">{paso.text}</span>
                          {paso.defaultAssignee && (
                            <span className="text-[10px] bg-white border border-slate-200 text-slate-500 px-1.5 py-0.5 rounded shrink-0">
                              {paso.defaultAssignee.split('@')[0]}
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            type="button"
                            onClick={() => handleMoveStep(idx, -1)}
                            disabled={idx === 0}
                            className="p-1 text-slate-400 hover:text-slate-700 disabled:opacity-30 rounded hover:bg-white"
                            title="Subir orden"
                          >
                            <ArrowUp className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleMoveStep(idx, 1)}
                            disabled={idx === formData.pasos.length - 1}
                            className="p-1 text-slate-400 hover:text-slate-700 disabled:opacity-30 rounded hover:bg-white"
                            title="Bajar orden"
                          >
                            <ArrowDown className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleRemoveStep(paso.id)}
                            className="p-1 text-slate-400 hover:text-rose-600 rounded hover:bg-white transition-colors"
                            title="Eliminar paso"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Botones de Pie */}
              <div className="flex justify-end items-center gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2 rounded-xl text-xs font-bold shadow-xs hover:shadow-premium-hover flex items-center gap-1.5 transition-all"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>{isSaving ? 'Guardando...' : (editingTemplate ? 'Actualizar Plantilla' : 'Crear Plantilla')}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
