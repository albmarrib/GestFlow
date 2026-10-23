import React, { useState, useEffect } from 'react';
import { Building2, X, AlertTriangle, Save, User, Mail, Phone, MapPin, Tag } from 'lucide-react';

const CLIENT_TYPES = [
  'Sociedad Limitada (S.L.)',
  'Sociedad Anónima (S.A.)',
  'Autónomo / Profesional',
  'Persona Física / Particular',
  'Comunidad de Bienes (C.B.)',
  'Sociedad Civil',
  'Asociación / Fundación',
  'Cooperativa',
  'Otro'
];

/**
 * Modal para creación y edición de clientes del despacho GestFlow.
 * Valida obligatoriedad de NIF y Razón Social y unicidad de NIF.
 */
const ClienteModal = ({ 
  show, 
  onClose, 
  cliente = null, 
  existingNifs = new Set(), 
  onSave 
}) => {
  const [formData, setFormData] = useState({
    nif: '',
    razonSocial: '',
    nombreComercial: '',
    email: '',
    telefono: '',
    direccion: '',
    tipo: 'Sociedad Limitada (S.L.)'
  });

  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Inicializar formulario al abrir o cambiar cliente
  useEffect(() => {
    if (cliente) {
      setFormData({
        nif: cliente.nif || '',
        razonSocial: cliente.razonSocial || '',
        nombreComercial: cliente.nombreComercial || '',
        email: cliente.email || '',
        telefono: cliente.telefono || '',
        direccion: cliente.direccion || '',
        tipo: cliente.tipo || 'Sociedad Limitada (S.L.)'
      });
    } else {
      setFormData({
        nif: '',
        razonSocial: '',
        nombreComercial: '',
        email: '',
        telefono: '',
        direccion: '',
        tipo: 'Sociedad Limitada (S.L.)'
      });
    }
    setErrors({});
  }, [cliente, show]);

  if (!show) return null;

  const validate = () => {
    const errs = {};
    const cleanNif = formData.nif.trim().toUpperCase();
    const cleanRazon = formData.razonSocial.trim();

    if (!cleanNif) {
      errs.nif = 'El NIF / CIF / NIE es obligatorio.';
    } else {
      // Si estamos creando o si el NIF cambió en edición, verificar si ya existe
      const originalNif = cliente?.nif ? cliente.nif.toUpperCase().trim() : null;
      if (cleanNif !== originalNif && existingNifs.has(cleanNif)) {
        errs.nif = `Ya existe un cliente registrado con el NIF ${cleanNif}.`;
      }
    }

    if (!cleanRazon) {
      errs.razonSocial = 'La Razón Social es obligatoria.';
    }

    if (formData.email && formData.email.trim()) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(formData.email.trim())) {
        errs.email = 'El formato de correo electrónico no es válido.';
      }
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    setIsSubmitting(true);
    try {
      const cleanData = {
        nif: formData.nif.trim().toUpperCase(),
        razonSocial: formData.razonSocial.trim(),
        nombreComercial: formData.nombreComercial?.trim() || '',
        email: formData.email?.trim() || '',
        telefono: formData.telefono?.trim() || '',
        direccion: formData.direccion?.trim() || '',
        tipo: formData.tipo || ''
      };

      await onSave(cleanData, cliente);
      onClose();
    } catch (err) {
      console.error(err);
      setErrors(prev => ({ ...prev, general: err.message || 'Error al guardar el cliente.' }));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl max-h-[92vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
        
        {/* Cabecera del modal */}
        <div className="flex justify-between items-center p-6 border-b border-slate-100 bg-white">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-800">
                {cliente ? 'Editar Ficha de Cliente' : 'Alta de Nuevo Cliente'}
              </h3>
              <p className="text-xs text-slate-500">
                {cliente ? `Modificando datos de ${cliente.razonSocial}` : 'Registra un cliente en la base de datos de GestFlow'}
              </p>
            </div>
          </div>
          <button 
            type="button" 
            onClick={onClose} 
            className="text-slate-400 hover:text-slate-600 text-lg p-1 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Formulario */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-4">
          
          {errors.general && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{errors.general}</span>
            </div>
          )}

          {/* Fila: NIF y Tipo */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold text-slate-600 uppercase tracking-wide flex items-center justify-between">
                <span>NIF / CIF / NIE <span className="text-rose-500">*</span></span>
                <span className="text-[10px] text-slate-400 font-normal">Identificador único</span>
              </label>
              <input
                type="text"
                required
                value={formData.nif}
                onChange={e => setFormData({ ...formData, nif: e.target.value.toUpperCase() })}
                placeholder="Ej: B12345678 o 12345678Z"
                className={`w-full mt-1.5 px-3 py-2.5 border rounded-xl font-mono font-semibold text-slate-800 text-sm outline-none transition-all uppercase ${
                  errors.nif ? 'border-rose-400 bg-rose-50/40 focus:ring-2 focus:ring-rose-500' : 'border-slate-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20'
                }`}
              />
              {errors.nif && <p className="text-xs text-rose-600 mt-1 font-medium">{errors.nif}</p>}
            </div>

            <div>
              <label className="text-xs font-bold text-slate-600 uppercase tracking-wide flex items-center gap-1.5">
                <Tag className="w-3.5 h-3.5 text-slate-400" /> Tipo de Entidad
              </label>
              <select
                value={formData.tipo}
                onChange={e => setFormData({ ...formData, tipo: e.target.value })}
                className="w-full mt-1.5 px-3 py-2.5 border border-slate-300 rounded-xl bg-white text-xs font-medium text-slate-700 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 outline-none"
              >
                {CLIENT_TYPES.map(t => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Razón Social */}
          <div>
            <label className="text-xs font-bold text-slate-600 uppercase tracking-wide">
              Razón Social / Nombre Legal <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              value={formData.razonSocial}
              onChange={e => setFormData({ ...formData, razonSocial: e.target.value })}
              placeholder="Ej: Logística e Inversiones Levante S.L."
              className={`w-full mt-1.5 px-3 py-2.5 border rounded-xl font-semibold text-slate-800 text-sm outline-none transition-all ${
                errors.razonSocial ? 'border-rose-400 bg-rose-50/40 focus:ring-2 focus:ring-rose-500' : 'border-slate-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20'
              }`}
            />
            {errors.razonSocial && <p className="text-xs text-rose-600 mt-1 font-medium">{errors.razonSocial}</p>}
          </div>

          {/* Nombre Comercial */}
          <div>
            <label className="text-xs font-bold text-slate-600 uppercase tracking-wide flex items-center justify-between">
              <span>Nombre Comercial (Opcional)</span>
              <span className="text-[10px] text-slate-400 font-normal">Marca o alias</span>
            </label>
            <input
              type="text"
              value={formData.nombreComercial}
              onChange={e => setFormData({ ...formData, nombreComercial: e.target.value })}
              placeholder="Ej: Levante Logistics"
              className="w-full mt-1.5 px-3 py-2 border border-slate-300 rounded-xl text-slate-800 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
            />
          </div>

          {/* Fila: Email y Teléfono */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold text-slate-600 uppercase tracking-wide flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5 text-slate-400" /> Correo Electrónico
              </label>
              <input
                type="email"
                value={formData.email}
                onChange={e => setFormData({ ...formData, email: e.target.value })}
                placeholder="contacto@empresa.com"
                className={`w-full mt-1.5 px-3 py-2 border rounded-xl text-slate-800 text-sm outline-none transition-all ${
                  errors.email ? 'border-rose-400 bg-rose-50/40 focus:ring-2 focus:ring-rose-500' : 'border-slate-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20'
                }`}
              />
              {errors.email && <p className="text-xs text-rose-600 mt-1 font-medium">{errors.email}</p>}
            </div>

            <div>
              <label className="text-xs font-bold text-slate-600 uppercase tracking-wide flex items-center gap-1.5">
                <Phone className="w-3.5 h-3.5 text-slate-400" /> Teléfono
              </label>
              <input
                type="tel"
                value={formData.telefono}
                onChange={e => setFormData({ ...formData, telefono: e.target.value })}
                placeholder="Ej: +34 912 345 678"
                className="w-full mt-1.5 px-3 py-2 border border-slate-300 rounded-xl text-slate-800 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
              />
            </div>
          </div>

          {/* Dirección */}
          <div>
            <label className="text-xs font-bold text-slate-600 uppercase tracking-wide flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-slate-400" /> Dirección Postal / Domicilio Fiscal
            </label>
            <input
              type="text"
              value={formData.direccion}
              onChange={e => setFormData({ ...formData, direccion: e.target.value })}
              placeholder="Ej: Calle Gran Vía 42, 3º D, 28013 Madrid"
              className="w-full mt-1.5 px-3 py-2 border border-slate-300 rounded-xl text-slate-800 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
            />
          </div>

          {/* Botones de acción */}
          <div className="pt-4 border-t border-slate-100 flex gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="flex-1 py-2.5 border border-slate-300 text-slate-700 rounded-xl hover:bg-slate-50 font-medium transition-colors text-sm"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 py-2.5 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 font-bold transition-all shadow-md shadow-indigo-100 flex items-center justify-center gap-2 text-sm disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              {isSubmitting ? 'Guardando...' : (cliente ? 'Actualizar Cliente' : 'Dar de Alta Cliente')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ClienteModal;
export { CLIENT_TYPES };
