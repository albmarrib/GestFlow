import React, { useState, useEffect } from 'react';
import { 
  Coins, 
  Building2, 
  CreditCard, 
  Mail, 
  Save, 
  RotateCcw, 
  FileText, 
  CheckCircle2, 
  Printer, 
  HelpCircle,
  Sparkles
} from 'lucide-react';
import { doc, setDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { DEFAULT_BILLING_SETTINGS, openLiquidationPdf } from '../utils/billingUtils';

export default function BillingSettingsManager({ 
  billingSettings = {}, 
  currentUser, 
  logAction 
}) {
  const [formData, setFormData] = useState({
    ...DEFAULT_BILLING_SETTINGS,
    ...(billingSettings || {})
  });

  const [isSaving, setIsSaving] = useState(false);
  const [feedback, setFeedback] = useState({ text: '', type: '' });

  useEffect(() => {
    if (billingSettings && Object.keys(billingSettings).length > 0) {
      setFormData(prev => ({
        ...DEFAULT_BILLING_SETTINGS,
        ...billingSettings
      }));
    }
  }, [billingSettings]);

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = async (e) => {
    if (e) e.preventDefault();
    setIsSaving(true);
    setFeedback({ text: '', type: '' });

    try {
      await setDoc(doc(db, 'settings', 'billing'), {
        ...formData,
        updatedAt: new Date().toISOString(),
        updatedBy: currentUser?.email || 'admin'
      }, { merge: true });

      if (logAction) {
        logAction('Configuración Facturación', 'Se actualizaron los datos del membrete, banco y plantilla de correo de liquidaciones.');
      }

      setFeedback({ text: 'Configuración guardada correctamente.', type: 'success' });
      setTimeout(() => setFeedback({ text: '', type: '' }), 4000);
    } catch (err) {
      console.error("Error guardando settings de facturación:", err);
      setFeedback({ text: 'Error al guardar en Firestore: ' + (err.message || err), type: 'error' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleResetDefaults = () => {
    if (!window.confirm("¿Restablecer los textos y campos a los valores estándar de fábrica?")) return;
    setFormData({ ...DEFAULT_BILLING_SETTINGS });
    setFeedback({ text: 'Valores restablecidos por defecto. Recuerda pulsar "Guardar Configuración".', type: 'info' });
  };

  const handlePreviewPdf = () => {
    const dummyTask = {
      id: 'demo123456',
      title: 'Constitución Sociedad Limitada y Trámites RMC',
      department: 'Mercantil y Societario',
      type: 'Constitución S.L.',
      billingType: 'billable',
      feeAmount: 350,
      invoiceNumber: 'F-2026/0042',
      externalExpenses: [
        { id: 1, provider: 'Notaría García', invoiceNumber: 'NOT-8819', concept: 'Otorgamiento de escritura pública', amount: 180, date: '2026-11-05' },
        { id: 2, provider: 'Registro Mercantil Central', invoiceNumber: 'TASA-302', concept: 'Aranceles certificación denominación', amount: 48.50, date: '2026-11-03' }
      ],
      downPayments: [
        { id: 1, concept: 'Provisión inicial de fondos', paymentMethod: 'transferencia', amount: 200, date: '2026-11-02' }
      ]
    };

    const dummyClient = {
      razonSocial: 'INVERSIONES Y SERVICIOS EJEMPLO S.L.',
      nif: 'B-99887766',
      email: 'cliente.ejemplo@empresa.com',
      telefono: '912 345 678',
      direccion: 'Paseo de la Castellana 100, 28046 Madrid'
    };

    openLiquidationPdf(dummyTask, dummyClient, formData);
  };

  return (
    <div className="space-y-4 max-w-4xl mx-auto">
      
      {/* CABECERA EXPLICATIVA */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-4 rounded-2xl border border-slate-800 shadow-premium flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div>
          <h2 className="text-base font-bold flex items-center gap-2">
            <Coins className="w-5 h-5 text-emerald-400" />
            Configuración de Liquidaciones Económicas & Cobros
          </h2>
          <p className="text-xs text-slate-300 mt-0.5">
            Personaliza el membrete corporativo, datos bancarios para transferencias y el texto estándar del correo de liquidación al cliente.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handlePreviewPdf}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white border border-white/20 rounded-lg text-xs font-semibold transition-all cursor-pointer"
            title="Ver cómo quedará el PDF con tus datos"
          >
            <Printer className="w-3.5 h-3.5 text-blue-300" />
            <span>Vista Previa PDF</span>
          </button>

          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving}
            className="flex items-center gap-1.5 px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold transition-all shadow-xs cursor-pointer disabled:bg-slate-500"
          >
            <Save className="w-3.5 h-3.5" />
            <span>{isSaving ? 'Guardando...' : 'Guardar'}</span>
          </button>
        </div>
      </div>

      {feedback.text && (
        <div className={`p-3 rounded-xl text-xs font-semibold flex items-center gap-2 ${
          feedback.type === 'error' ? 'bg-rose-50 text-rose-800 border border-rose-200' :
          feedback.type === 'info' ? 'bg-blue-50 text-blue-800 border border-blue-200' :
          'bg-emerald-50 text-emerald-800 border border-emerald-200'
        }`}>
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{feedback.text}</span>
        </div>
      )}

      {/* BLOQUE 1: MEMBRETE Y DATOS DEL DESPACHO */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs space-y-3">
        <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
          <Building2 className="w-4 h-4 text-indigo-600" />
          <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wide">
            1. Membrete & Datos del Despacho (Aparecen en el PDF)
          </h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="text-[11px] font-bold text-slate-700 block mb-1">Nombre Comercial / Razón Social *</label>
            <input
              type="text"
              value={formData.despachoNombre}
              onChange={(e) => handleChange('despachoNombre', e.target.value)}
              placeholder="Ej: GESTORÍA ADMINISTRATIVA PÉREZ"
              className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs font-bold text-slate-800 outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label className="text-[11px] font-bold text-slate-700 block mb-1">Subtítulo / Especialidades</label>
            <input
              type="text"
              value={formData.despachoSubtitulo}
              onChange={(e) => handleChange('despachoSubtitulo', e.target.value)}
              placeholder="Ej: Asesoría Fiscal, Laboral, Tráfico y Mercantil"
              className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs text-slate-800 outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label className="text-[11px] font-bold text-slate-700 block mb-1">CIF / NIF del Despacho</label>
            <input
              type="text"
              value={formData.despachoNif}
              onChange={(e) => handleChange('despachoNif', e.target.value)}
              placeholder="Ej: B-12345678"
              className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs font-mono text-slate-800 outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label className="text-[11px] font-bold text-slate-700 block mb-1">Dirección Postal</label>
            <input
              type="text"
              value={formData.despachoDireccion}
              onChange={(e) => handleChange('despachoDireccion', e.target.value)}
              placeholder="Ej: Calle Gran Vía 15, Planta 2ª, Madrid"
              className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs text-slate-800 outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label className="text-[11px] font-bold text-slate-700 block mb-1">Teléfono de Contacto</label>
            <input
              type="text"
              value={formData.despachoTelefono}
              onChange={(e) => handleChange('despachoTelefono', e.target.value)}
              placeholder="Ej: +34 91 123 45 67"
              className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs text-slate-800 outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label className="text-[11px] font-bold text-slate-700 block mb-1">Email del Despacho</label>
            <input
              type="email"
              value={formData.despachoEmail}
              onChange={(e) => handleChange('despachoEmail', e.target.value)}
              placeholder="Ej: info@gestoriaperez.com"
              className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs text-slate-800 outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>
        </div>
      </div>

      {/* BLOQUE 2: DATOS BANCARIOS DE COBRO */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs space-y-3">
        <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
          <CreditCard className="w-4 h-4 text-emerald-600" />
          <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wide">
            2. Datos Bancarios para Transferencias de Clientes
          </h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="text-[11px] font-bold text-slate-700 block mb-1">Entidad Bancaria</label>
            <input
              type="text"
              value={formData.bancoNombre}
              onChange={(e) => handleChange('bancoNombre', e.target.value)}
              placeholder="Ej: CaixaBank, Banco Santander, BBVA"
              className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs font-bold text-slate-800 outline-none focus:ring-1 focus:ring-emerald-500"
            />
          </div>

          <div className="sm:col-span-2">
            <label className="text-[11px] font-bold text-slate-700 block mb-1">Número de Cuenta IBAN *</label>
            <input
              type="text"
              value={formData.bancoIban}
              onChange={(e) => handleChange('bancoIban', e.target.value)}
              placeholder="ES91 2100 0418 4502 0005 1332"
              className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs font-mono font-bold text-slate-900 outline-none focus:ring-1 focus:ring-emerald-500"
            />
          </div>

          <div className="sm:col-span-3">
            <label className="text-[11px] font-bold text-slate-700 block mb-1">Titular de la Cuenta Bancaria</label>
            <input
              type="text"
              value={formData.bancoTitular}
              onChange={(e) => handleChange('bancoTitular', e.target.value)}
              placeholder="Ej: Gestoría Administrativa Pérez S.L."
              className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs text-slate-800 outline-none focus:ring-1 focus:ring-emerald-500"
            />
          </div>
        </div>
      </div>

      {/* BLOQUE 3: PLANTILLA DE CORREO ELECTRÓNICO */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs space-y-3">
        <div className="flex justify-between items-center pb-2 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <Mail className="w-4 h-4 text-blue-600" />
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wide">
              3. Plantilla de Correo Electrónico (Texto Estándar Editable)
            </h3>
          </div>

          <button
            type="button"
            onClick={handleResetDefaults}
            className="flex items-center gap-1 text-[11px] text-slate-500 hover:text-indigo-600 font-semibold cursor-pointer"
          >
            <RotateCcw className="w-3 h-3" />
            <span>Restablecer por defecto</span>
          </button>
        </div>

        {/* Etiquetas dinámicas disponibles */}
        <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200 text-[11px] text-slate-600">
          <span className="font-bold text-slate-800 flex items-center gap-1 mb-1">
            <Sparkles className="w-3 h-3 text-amber-500" /> Variables dinámicas sustituidas automáticamente:
          </span>
          <div className="flex flex-wrap gap-1 font-mono text-[10px]">
            {['{cliente}', '{expediente}', '{ref}', '{honorarios}', '{suplidos}', '{anticipos}', '{saldo}', '{iban}', '{banco}', '{gestoria}', '{fecha}'].map((tag) => (
              <span key={tag} className="bg-white px-1.5 py-0.5 rounded border border-slate-200 text-indigo-700 font-bold">
                {tag}
              </span>
            ))}
          </div>
        </div>

        <div>
          <label className="text-[11px] font-bold text-slate-700 block mb-1">Asunto del Correo Electrónico</label>
          <input
            type="text"
            value={formData.emailSubject}
            onChange={(e) => handleChange('emailSubject', e.target.value)}
            className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs font-bold text-slate-800 outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="text-[11px] font-bold text-slate-700 block mb-1">Cuerpo del Mensaje (Email)</label>
          <textarea
            rows={12}
            value={formData.emailBody}
            onChange={(e) => handleChange('emailBody', e.target.value)}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-mono text-slate-800 leading-relaxed outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>

        <div className="flex justify-end pt-2">
          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving}
            className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold transition-all shadow-xs cursor-pointer disabled:bg-slate-400"
          >
            <Save className="w-3.5 h-3.5" />
            <span>{isSaving ? 'Guardando...' : 'Guardar Configuración'}</span>
          </button>
        </div>
      </div>

    </div>
  );
}
