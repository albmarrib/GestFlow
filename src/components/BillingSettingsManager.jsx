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
  Sparkles,
  Globe
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

  const [emailTabLang, setEmailTabLang] = useState('ca');
  const [isSaving, setIsSaving] = useState(false);
  const [feedback, setFeedback] = useState({ text: '', type: '' });

  useEffect(() => {
    if (billingSettings && Object.keys(billingSettings).length > 0) {
      setFormData(prev => ({
        ...DEFAULT_BILLING_SETTINGS,
        ...billingSettings,
        emailSubject_ca: billingSettings.emailSubject_ca || DEFAULT_BILLING_SETTINGS.emailSubject_ca,
        emailBody_ca: billingSettings.emailBody_ca || DEFAULT_BILLING_SETTINGS.emailBody_ca,
        emailSubject_es: billingSettings.emailSubject_es || billingSettings.emailSubject || DEFAULT_BILLING_SETTINGS.emailSubject_es,
        emailBody_es: billingSettings.emailBody_es || billingSettings.emailBody || DEFAULT_BILLING_SETTINGS.emailBody_es
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
      const payload = {
        ...formData,
        emailSubject: formData.emailSubject_ca || formData.emailSubject || DEFAULT_BILLING_SETTINGS.emailSubject_ca,
        emailBody: formData.emailBody_ca || formData.emailBody || DEFAULT_BILLING_SETTINGS.emailBody_ca,
        updatedAt: new Date().toISOString(),
        updatedBy: currentUser?.email || 'admin'
      };

      await setDoc(doc(db, 'settings', 'billing'), payload, { merge: true });

      if (logAction) {
        logAction('Configuració Facturació', 'Es van actualitzar les dades de capçalera, banc i plantilles bilingües de liquidació.');
      }

      setFeedback({ text: 'Configuració desada correctament (Català & Castellano).', type: 'success' });
      setTimeout(() => setFeedback({ text: '', type: '' }), 4000);
    } catch (err) {
      console.error("Error guardando settings de facturación:", err);
      setFeedback({ text: 'Error al desar a Firestore: ' + (err.message || err), type: 'error' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleResetDefaults = () => {
    if (!window.confirm("Restablir els textos i camps als valors estàndard de fàbrica?")) return;
    setFormData({ ...DEFAULT_BILLING_SETTINGS });
    setFeedback({ text: 'Valors restablerts per defecte. Recorda prémer "Desar Configuració".', type: 'info' });
  };

  const handlePreviewPdf = () => {
    const dummyTask = {
      id: 'demo123456',
      title: emailTabLang === 'ca' ? 'Constitució Societat Limitada i Tràmits RMC' : 'Constitución Sociedad Limitada y Trámites RMC',
      department: emailTabLang === 'ca' ? 'Mercantil i Societari' : 'Mercantil y Societario',
      type: emailTabLang === 'ca' ? 'Constitució S.L.' : 'Constitución S.L.',
      billingType: 'billable',
      feeAmount: 350,
      invoiceNumber: 'F-2026/0042',
      externalExpenses: [
        { id: 1, provider: 'Notaria Garcia', invoiceNumber: 'NOT-8819', concept: emailTabLang === 'ca' ? "Atorgament d'escriptura pública" : 'Otorgamiento de escritura pública', amount: 180, date: '2026-11-05' },
        { id: 2, provider: 'Registre Mercantil Central', invoiceNumber: 'TASA-302', concept: emailTabLang === 'ca' ? 'Aranzels certificació denominació' : 'Aranceles certificación denominación', amount: 48.50, date: '2026-11-03' }
      ],
      downPayments: [
        { id: 1, concept: emailTabLang === 'ca' ? 'Provisió inicial de fons' : 'Provisión inicial de fondos', paymentMethod: 'transferencia', amount: 200, date: '2026-11-02' }
      ]
    };

    const dummyClient = {
      razonSocial: 'INVERSIONS I SERVEIS DEMO S.L.',
      nif: 'B-99887766',
      email: 'client.demo@empresa.cat',
      telefono: '932 345 678',
      direccion: 'Rambla de Catalunya 100, 08008 Barcelona'
    };

    openLiquidationPdf(dummyTask, dummyClient, formData, emailTabLang);
  };

  return (
    <div className="space-y-4 max-w-4xl mx-auto">
      
      {/* CABECERA EXPLICATIVA */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-4 rounded-2xl border border-slate-800 shadow-premium flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div>
          <h2 className="text-base font-bold flex items-center gap-2">
            <Coins className="w-5 h-5 text-emerald-400" />
            Configuració de Liquidacions Econòmiques & Cobraments
          </h2>
          <p className="text-xs text-slate-300 mt-0.5">
            Personalitza la capçalera corporativa, dades bancàries i les plantilles de correu en Català i Castellà.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handlePreviewPdf}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white border border-white/20 rounded-lg text-xs font-semibold transition-all cursor-pointer"
            title="Veure com quedarà el PDF en l'idioma seleccionat"
          >
            <Printer className="w-3.5 h-3.5 text-blue-300" />
            <span>Vista Prèvia PDF ({emailTabLang === 'ca' ? 'Català' : 'Castellà'})</span>
          </button>

          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving}
            className="flex items-center gap-1.5 px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold transition-all shadow-xs cursor-pointer disabled:bg-slate-500"
          >
            <Save className="w-3.5 h-3.5" />
            <span>{isSaving ? 'Desant...' : 'Desar'}</span>
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
            1. Capçalera & Dades del Despatx (Apareixen al PDF)
          </h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="text-[11px] font-bold text-slate-700 block mb-1">Nom Comercial / Raó Social *</label>
            <input
              type="text"
              value={formData.despachoNombre}
              onChange={(e) => handleChange('despachoNombre', e.target.value)}
              placeholder="Ex: GESTORIA ADMINISTRATIVA"
              className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs font-bold text-slate-800 outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label className="text-[11px] font-bold text-slate-700 block mb-1">Subtítol / Especialitats</label>
            <input
              type="text"
              value={formData.despachoSubtitulo}
              onChange={(e) => handleChange('despachoSubtitulo', e.target.value)}
              placeholder="Ex: Assessoria Fiscal, Laboral, Trànsit i Mercantil"
              className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs text-slate-800 outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label className="text-[11px] font-bold text-slate-700 block mb-1">CIF / NIF del Despatx</label>
            <input
              type="text"
              value={formData.despachoNif}
              onChange={(e) => handleChange('despachoNif', e.target.value)}
              placeholder="Ex: B-12345678"
              className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs font-mono text-slate-800 outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label className="text-[11px] font-bold text-slate-700 block mb-1">Adreça Postal</label>
            <input
              type="text"
              value={formData.despachoDireccion}
              onChange={(e) => handleChange('despachoDireccion', e.target.value)}
              placeholder="Ex: Carrer Major 12, Planta 1a, Barcelona"
              className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs text-slate-800 outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label className="text-[11px] font-bold text-slate-700 block mb-1">Telèfon de Contacte</label>
            <input
              type="text"
              value={formData.despachoTelefono}
              onChange={(e) => handleChange('despachoTelefono', e.target.value)}
              placeholder="Ex: +34 93 123 45 67"
              className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs text-slate-800 outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label className="text-[11px] font-bold text-slate-700 block mb-1">Correu Electrònic del Despatx</label>
            <input
              type="email"
              value={formData.despachoEmail}
              onChange={(e) => handleChange('despachoEmail', e.target.value)}
              placeholder="Ex: info@gestoria.cat"
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
            2. Dades Bancàries per a Transferències de Clients
          </h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="text-[11px] font-bold text-slate-700 block mb-1">Entitat Bancària</label>
            <input
              type="text"
              value={formData.bancoNombre}
              onChange={(e) => handleChange('bancoNombre', e.target.value)}
              placeholder="Ex: CaixaBank, Banc Sabadell, BBVA"
              className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs font-bold text-slate-800 outline-none focus:ring-1 focus:ring-emerald-500"
            />
          </div>

          <div className="sm:col-span-2">
            <label className="text-[11px] font-bold text-slate-700 block mb-1">Número de Compte IBAN *</label>
            <input
              type="text"
              value={formData.bancoIban}
              onChange={(e) => handleChange('bancoIban', e.target.value)}
              placeholder="ES91 2100 0418 4502 0005 1332"
              className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs font-mono font-bold text-slate-900 outline-none focus:ring-1 focus:ring-emerald-500"
            />
          </div>

          <div className="sm:col-span-3">
            <label className="text-[11px] font-bold text-slate-700 block mb-1">Titular del Compte Bancari</label>
            <input
              type="text"
              value={formData.bancoTitular}
              onChange={(e) => handleChange('bancoTitular', e.target.value)}
              placeholder="Ex: Gestoria Administrativa S.L."
              className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs text-slate-800 outline-none focus:ring-1 focus:ring-emerald-500"
            />
          </div>
        </div>
      </div>

      {/* BLOQUE 3: PLANTILLAS DE CORREO BILINGÜES */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs space-y-3">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center pb-2 border-b border-slate-100 gap-2">
          <div className="flex items-center gap-2">
            <Mail className="w-4 h-4 text-blue-600" />
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wide">
              3. Plantilles de Correu de Liquidació (Bilingüe)
            </h3>
          </div>

          <div className="flex items-center gap-2">
            {/* Conmutador de pestaña de idioma */}
            <div className="flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200">
              <button
                type="button"
                onClick={() => setEmailTabLang('ca')}
                className={`px-2.5 py-1 rounded text-xs font-bold transition-all flex items-center gap-1 ${
                  emailTabLang === 'ca'
                    ? 'bg-indigo-600 text-white shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <span>Català</span>
                <span className="text-[10px] opacity-80">(Principal)</span>
              </button>
              <button
                type="button"
                onClick={() => setEmailTabLang('es')}
                className={`px-2.5 py-1 rounded text-xs font-bold transition-all flex items-center gap-1 ${
                  emailTabLang === 'es'
                    ? 'bg-indigo-600 text-white shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <span>Castellano</span>
              </button>
            </div>

            <button
              type="button"
              onClick={handleResetDefaults}
              className="flex items-center gap-1 text-[11px] text-slate-500 hover:text-indigo-600 font-semibold cursor-pointer"
              title="Restablir textos per defecte"
            >
              <RotateCcw className="w-3 h-3" />
            </button>
          </div>
        </div>

        {/* Variables dinámicas disponibles */}
        <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200 text-[11px] text-slate-600">
          <span className="font-bold text-slate-800 flex items-center gap-1 mb-1">
            <Sparkles className="w-3 h-3 text-amber-500" /> Variables dinàmiques substituïdes automàticament:
          </span>
          <div className="flex flex-wrap gap-1 font-mono text-[10px]">
            {['{cliente}', '{expediente}', '{ref}', '{honorarios}', '{suplidos}', '{anticipos}', '{saldo}', '{iban}', '{banco}', '{gestoria}', '{fecha}'].map((tag) => (
              <span key={tag} className="bg-white px-1.5 py-0.5 rounded border border-slate-200 text-indigo-700 font-bold">
                {tag}
              </span>
            ))}
          </div>
        </div>

        {emailTabLang === 'ca' ? (
          <div className="space-y-3">
            <div>
              <label className="text-[11px] font-bold text-slate-700 block mb-1">
                Assumpte del Correu (Català)
              </label>
              <input
                type="text"
                value={formData.emailSubject_ca || ''}
                onChange={(e) => handleChange('emailSubject_ca', e.target.value)}
                placeholder="Ex: Liquidació de Despeses i Honoraris - {expediente} ({ref})"
                className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs font-bold text-slate-800 outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="text-[11px] font-bold text-slate-700 block mb-1">
                Cos del Missatge de Liquidació (Català)
              </label>
              <textarea
                rows={12}
                value={formData.emailBody_ca || ''}
                onChange={(e) => handleChange('emailBody_ca', e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-mono text-slate-800 leading-relaxed outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <div>
              <label className="text-[11px] font-bold text-slate-700 block mb-1">
                Asunto del Correo (Castellano)
              </label>
              <input
                type="text"
                value={formData.emailSubject_es || ''}
                onChange={(e) => handleChange('emailSubject_es', e.target.value)}
                placeholder="Ej: Liquidación de Gastos y Honorarios - {expediente} ({ref})"
                className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs font-bold text-slate-800 outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="text-[11px] font-bold text-slate-700 block mb-1">
                Cuerpo del Mensaje de Liquidación (Castellano)
              </label>
              <textarea
                rows={12}
                value={formData.emailBody_es || ''}
                onChange={(e) => handleChange('emailBody_es', e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-mono text-slate-800 leading-relaxed outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
          </div>
        )}

        <div className="flex justify-end pt-2">
          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving}
            className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold transition-all shadow-xs cursor-pointer disabled:bg-slate-400"
          >
            <Save className="w-3.5 h-3.5" />
            <span>{isSaving ? 'Desant...' : 'Desar Configuració'}</span>
          </button>
        </div>
      </div>

    </div>
  );
}
