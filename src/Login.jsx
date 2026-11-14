import React, { useState } from 'react';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signInWithPopup, 
  GoogleAuthProvider 
} from 'firebase/auth';
import { auth, db, firebaseConfig } from './firebase';
import { doc, getDoc } from 'firebase/firestore';
import { 
  Briefcase, Lock, Mail, AlertCircle, ArrowRight, ArrowLeft, 
  ShieldCheck, UserPlus, LogIn, CheckCircle2, Building2, 
  Calendar, FileText, Scale, Users, Clock, Sparkles, Check, 
  ChevronRight, Shield, Layers
} from 'lucide-react';

const SUPER_ADMINS = ['albmarrib@gmail.com'];
const PRE_AUTHORIZED_USERS = ['josep@ferrer-assessoria.com'];

export default function Login({ onLoginSuccess }) {
  // 'landing' para la página de inicio corporativa, 'portal' directo en móvil / PWA instalada
  const [view, setView] = useState(() => {
    if (typeof window !== 'undefined') {
      const isSmallOrStandalone =
        window.innerWidth < 768 ||
        window.navigator.standalone === true ||
        window.matchMedia?.('(display-mode: standalone)').matches;
      if (isSmallOrStandalone) return 'portal';
    }
    return 'landing';
  });
  const [isRegistering, setIsRegistering] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const isConfigured = Boolean(firebaseConfig.apiKey && firebaseConfig.projectId);

  const handleOpenLogin = () => {
    setIsRegistering(false);
    setError('');
    setView('portal');
  };

  const handleOpenRegister = () => {
    setIsRegistering(true);
    setError('');
    setView('portal');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!isConfigured) {
      setError('Las credenciales de Firebase no están configuradas en el archivo .env. Añade tus claves para continuar.');
      return;
    }

    if (!email.trim() || !password.trim()) {
      setError('Por favor, completa todos los campos.');
      return;
    }

    setLoading(true);
    try {
      let result;
      if (isRegistering) {
        const userEmailNorm = email.trim().toLowerCase();
        const isSuperAdmin = SUPER_ADMINS.includes(userEmailNorm);
        const isPreAuth = PRE_AUTHORIZED_USERS.includes(userEmailNorm);

        if (!isSuperAdmin && !isPreAuth) {
          // Comprobar si el empleado ha sido pre-autorizado en Firestore por el Administrador
          try {
            const userDocRef = doc(db, 'users', userEmailNorm);
            const snap = await getDoc(userDocRef);
            if (!snap.exists() || snap.data()?.status === 'inactive') {
              setError('Este correo no ha sido autorizado previamente por la administración del despacho. Contacta con tu gestoría para darte de alta.');
              setLoading(false);
              return;
            }
          } catch (checkErr) {
            console.warn("Aviso comprobando autorización:", checkErr);
          }
        }
        result = await createUserWithEmailAndPassword(auth, email.trim(), password);
      } else {
        result = await signInWithEmailAndPassword(auth, email.trim(), password);
      }
      if (onLoginSuccess && result?.user) {
        onLoginSuccess(result.user);
      }
    } catch (err) {
      console.error("Error en autenticación:", err);
      let msg = 'Error al iniciar sesión.';
      if (err.code === 'auth/invalid-credential' || err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password') {
        msg = 'Credenciales incorrectas. Verifica tu correo y contraseña.';
      } else if (err.code === 'auth/email-already-in-use') {
        msg = 'Ya existe una cuenta con este correo electrónico.';
      } else if (err.code === 'auth/weak-password') {
        msg = 'La contraseña debe tener al menos 6 caracteres.';
      } else if (err.code === 'auth/invalid-api-key') {
        msg = 'La API Key de Firebase no es válida. Revisa tu archivo .env.';
      } else {
        msg = err.message || 'Error de conexión con Firebase.';
      }
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setError('');
    if (!isConfigured) {
      setError('Las credenciales de Firebase no están configuradas en el archivo .env.');
      return;
    }
    setLoading(true);
    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      if (onLoginSuccess && result?.user) {
        onLoginSuccess(result.user);
      }
    } catch (err) {
      console.error("Error con Google:", err);
      setError(err.message || 'Error al iniciar sesión con Google.');
    } finally {
      setLoading(false);
    }
  };

  // ==========================================
  // VISTA 1: PÁGINA DE INICIO CORPORATIVA
  // ==========================================
  if (view === 'landing') {
    return (
      <div className="min-h-screen bg-[#152427] text-white font-sans selection:bg-indigo-500 selection:text-white flex flex-col">
        
        {/* CABECERA / NAVBAR SUPERIOR */}
        <header className="sticky top-0 z-50 bg-[#152427]/90 backdrop-blur-xl border-b border-white/10">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5 flex items-center justify-between">
            
            {/* Logo y Marca Ferrer Assessoria */}
            <div className="flex items-center gap-3">
              <img
                src="/logo-ferrer-blanc.svg"
                alt="Ferrer Assessoria"
                className="h-9 w-auto object-contain shrink-0"
              />
              <p className="hidden sm:block text-[10px] text-slate-300 font-semibold uppercase tracking-wider border-l border-white/15 pl-3">
                Despatx & Assessoria
              </p>
            </div>

            {/* Enlaces informativos (Desktop) */}
            <nav className="hidden md:flex items-center gap-8 text-xs font-medium text-slate-300">
              <a href="#modulos" className="hover:text-white transition-colors">Módulos del Despacho</a>
              <a href="#vencimientos" className="hover:text-white transition-colors">Vencimientos & Plazos</a>
              <a href="#clientes" className="hover:text-white transition-colors">Cartera de Clientes</a>
              <a href="#seguridad" className="hover:text-white transition-colors">Seguridad RGPD</a>
            </nav>

            {/* Acciones de acceso */}
            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={handleOpenLogin}
                className="hidden sm:inline-flex px-3.5 py-2 text-xs font-semibold text-slate-300 hover:text-white hover:bg-slate-900 rounded-xl border border-transparent hover:border-slate-800 transition-all"
              >
                Iniciar Sesión
              </button>
              <button
                type="button"
                onClick={handleOpenLogin}
                className="px-4 py-2 bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-600 text-white text-xs font-bold rounded-xl shadow-xs hover:shadow-glow-indigo flex items-center gap-1.5 transition-all transform active:scale-95"
              >
                <span>Entrar al Portal</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </header>

        {/* HERO SECTION */}
        <section className="relative pt-12 pb-20 md:pt-16 md:pb-28 overflow-hidden">
          {/* Luces y gradientes de fondo */}
          <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[350px] bg-indigo-600/15 rounded-full blur-3xl pointer-events-none"></div>
          <div className="absolute top-10 right-10 w-72 h-72 bg-violet-600/10 rounded-full blur-3xl pointer-events-none"></div>

          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
            
            {/* Texto Principal */}
            <div className="text-center max-w-3xl mx-auto space-y-5">
              
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-400/20 text-indigo-300 text-xs font-semibold">
                <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                <span>Plataforma Especializada para Gestorías y Asesorías de Empresas</span>
              </div>

              <h1 className="text-3xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-white leading-tight sm:leading-none">
                Control absoluto de <span className="bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 via-indigo-200 to-violet-300">expedientes, plazos y clientes</span> en tu despacho.
              </h1>

              <p className="text-sm sm:text-base text-slate-300 leading-relaxed max-w-2xl mx-auto font-normal">
                Diseñado para la operativa diaria de asesores fiscales, laborales y contables. Centraliza la cartera por NIF, coordina tu equipo con metodología GTD y garantiza que ningún vencimiento oficial quede desatendido.
              </p>

              {/* Botones CTA */}
              <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={handleOpenLogin}
                  className="w-full sm:w-auto px-6 py-3.5 bg-gradient-to-r from-indigo-600 via-indigo-500 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-bold text-sm rounded-xl shadow-lg shadow-indigo-600/30 hover:shadow-indigo-500/50 flex items-center justify-center gap-2 transition-all transform active:scale-95"
                >
                  <LogIn className="w-4 h-4" />
                  <span>Acceso al Portal de Gestión</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
                <a
                  href="#modulos"
                  className="w-full sm:w-auto px-5 py-3.5 bg-slate-900/90 hover:bg-slate-800 text-slate-200 hover:text-white font-semibold text-sm rounded-xl border border-slate-700/80 hover:border-slate-600 flex items-center justify-center gap-2 transition-all"
                >
                  <Layers className="w-4 h-4 text-indigo-400" />
                  <span>Módulos del Despacho</span>
                </a>
              </div>

              {/* Indicadores rápidos */}
              <div className="pt-6 flex flex-wrap items-center justify-center gap-y-2 gap-x-6 text-xs text-slate-400 font-medium">
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span>Control de Modelos AEAT y Trimestres</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span>Base de Datos por NIF</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span>Sincronización en Tiempo Real</span>
                </div>
              </div>
            </div>

            {/* IMAGEN PROFESIONAL HERO: Despacho de Gestoría & Asesoría */}
            <div className="mt-12 sm:mt-16 max-w-5xl mx-auto relative group">
              
              {/* Resplandor decorativo alrededor de la imagen */}
              <div className="absolute -inset-1.5 bg-gradient-to-r from-indigo-500/20 via-violet-500/20 to-indigo-500/20 rounded-3xl blur-xl opacity-75 group-hover:opacity-100 transition duration-1000"></div>
              
              <div className="relative rounded-2xl md:rounded-3xl overflow-hidden border border-slate-700/80 shadow-2xl bg-slate-900">
                <img
                  src="/gestoria_office.jpg"
                  alt="Despacho profesional de asesoría y gestoría de empresas GestFlow"
                  className="w-full h-[320px] sm:h-[450px] lg:h-[540px] object-cover object-center transform transition duration-700 group-hover:scale-[1.01]"
                />
                
                {/* Degradado tenue inferior */}
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-transparent pointer-events-none"></div>

                {/* Tarjeta flotante 1: Notificación de Vencimientos (Arriba a la derecha) */}
                <div className="absolute top-4 right-4 sm:top-6 sm:right-6 bg-slate-950/85 backdrop-blur-md p-3 sm:p-3.5 rounded-2xl border border-slate-700/70 shadow-xl max-w-[240px] hidden sm:block animate-in fade-in duration-500">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
                      <Calendar className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-[11px] font-bold text-white leading-tight">Plan Fiscal Activo</p>
                      <p className="text-[10px] text-slate-400">Todos los modelos en plazo</p>
                    </div>
                  </div>
                </div>

                {/* Tarjeta flotante 2: Validación por NIF (Abajo a la izquierda) */}
                <div className="absolute bottom-4 left-4 sm:bottom-6 sm:left-6 bg-slate-950/85 backdrop-blur-md p-3 sm:p-3.5 rounded-2xl border border-slate-700/70 shadow-xl max-w-[280px] hidden sm:block animate-in fade-in duration-500">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center shrink-0">
                      <Building2 className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-[11px] font-bold text-white leading-tight">Cartera de Clientes</p>
                      <p className="text-[10px] text-slate-400">Vinculación relacional oficial por NIF</p>
                    </div>
                  </div>
                </div>

                {/* Tarjeta flotante 3: Botón de llamada a la acción en la imagen */}
                <div className="absolute bottom-4 right-4 sm:bottom-6 sm:right-6">
                  <button
                    type="button"
                    onClick={handleOpenLogin}
                    className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-indigo-600/40 flex items-center gap-2 transition-all transform active:scale-95"
                  >
                    <span>Entrar al Despacho</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>

          </div>
        </section>

        {/* SECCIÓN DE CARACTERÍSTICAS Y MÓDULOS */}
        <section id="modulos" className="py-16 sm:py-20 bg-slate-900/60 border-t border-slate-800/80 relative">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            
            <div className="text-center max-w-2xl mx-auto mb-12">
              <span className="text-xs font-bold text-indigo-400 uppercase tracking-widest block mb-2">
                Arquitectura de Trabajo
              </span>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                Diseñado exclusivamente para la operativa de gestorías
              </h2>
              <p className="text-xs sm:text-sm text-slate-400 mt-2">
                Cada sección resuelve los retos críticos del asesor: plazos improrrogables, requerimientos de clientes y coordinación interna del equipo.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
              
              {/* Tarjeta 1 */}
              <div className="bg-slate-950/80 p-5 rounded-2xl border border-slate-800/90 hover:border-indigo-500/40 transition-all hover:-translate-y-1 shadow-lg">
                <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center mb-4">
                  <Calendar className="w-5 h-5" />
                </div>
                <h3 className="text-sm font-bold text-white mb-1.5">Vencimientos & Plan Fiscal</h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Supervisión de cierres trimestrales (1T, 2T, 3T, 4T), control de modelos periódicos e histórico de aplazamientos.
                </p>
              </div>

              {/* Tarjeta 2 */}
              <div id="clientes" className="bg-slate-950/80 p-5 rounded-2xl border border-slate-800/90 hover:border-indigo-500/40 transition-all hover:-translate-y-1 shadow-lg">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center mb-4">
                  <Building2 className="w-5 h-5" />
                </div>
                <h3 className="text-sm font-bold text-white mb-1.5">Cartera de Clientes & CSV</h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Identificador obligatorio por NIF para evitar duplicados. Importación y exportación masiva por lotes con validación relacional.
                </p>
              </div>

              {/* Tarjeta 3 */}
              <div className="bg-slate-950/80 p-5 rounded-2xl border border-slate-800/90 hover:border-indigo-500/40 transition-all hover:-translate-y-1 shadow-lg">
                <div className="w-10 h-10 rounded-xl bg-violet-500/10 border border-violet-500/20 text-violet-400 flex items-center justify-center mb-4">
                  <Clock className="w-5 h-5" />
                </div>
                <h3 className="text-sm font-bold text-white mb-1.5">Metodología GTD & Pasos</h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Desglose de cada expediente en pasos ejecutables con gestor responsable asignado, notas de avance y enlaces oficiales.
                </p>
              </div>

              {/* Tarjeta 4 */}
              <div id="seguridad" className="bg-slate-950/80 p-5 rounded-2xl border border-slate-800/90 hover:border-indigo-500/40 transition-all hover:-translate-y-1 shadow-lg">
                <div className="w-10 h-10 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center justify-center mb-4">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <h3 className="text-sm font-bold text-white mb-1.5">Seguridad & Auditoría</h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Registro exhaustivo de auditoría con fecha y usuario de cada modificación o baja. Estado definitivo 'Cerrado' protegido.
                </p>
              </div>

            </div>

            {/* Banner Final CTA */}
            <div className="mt-14 bg-gradient-to-r from-indigo-900/40 via-slate-900/90 to-indigo-950/50 p-6 sm:p-8 rounded-3xl border border-indigo-500/20 flex flex-col sm:flex-row items-center justify-between gap-6 shadow-xl">
              <div>
                <h3 className="text-lg font-bold text-white">¿Listo para gestionar tu despacho con GestFlow?</h3>
                <p className="text-xs text-slate-300 mt-1">Accede con tus credenciales de gestor o crea una nueva cuenta de asesor.</p>
              </div>
              <button
                type="button"
                onClick={handleOpenLogin}
                className="px-6 py-3 bg-white hover:bg-slate-100 text-slate-950 font-bold text-xs rounded-xl shadow-md flex items-center gap-2 transition-all transform active:scale-95 shrink-0"
              >
                <span>Acceder al Portal Ahora</span>
                <ArrowRight className="w-3.5 h-3.5 text-indigo-600" />
              </button>
            </div>

          </div>
        </section>

        {/* PIE DE PÁGINA */}
        <footer className="mt-auto py-8 bg-[#101c1e] border-t border-white/10 text-slate-400 text-xs">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <img src="/logo-ferrer-blanc.svg" alt="Ferrer Assessoria" className="h-6 w-auto object-contain opacity-90" />
              <span className="text-slate-600">|</span>
              <span>Portal de Gestió d'Expedients — Despatx Professional</span>
            </div>
            <div className="flex items-center gap-4 text-[11px]">
              <button onClick={handleOpenLogin} className="hover:text-slate-300 transition-colors">Entrar al Portal</button>
              <span>Acceso Cifrado SSL / RGPD</span>
            </div>
          </div>
        </footer>

      </div>
    );
  }

  // ==========================================
  // VISTA 2: PANTALLA DE ENTRADA AL PORTAL (LOGIN & SIGN IN)
  // ==========================================
  return (
    <div
      className="min-h-screen bg-[#152427] text-white font-sans flex flex-col justify-center items-center p-3 sm:p-6 relative overflow-x-hidden overflow-y-auto"
      style={{ paddingTop: 'max(0.75rem, env(safe-area-inset-top))', paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom))' }}
    >
      
      {/* Luces y ambiente de fondo corporativo */}
      <div className="absolute top-0 right-1/4 w-96 h-96 bg-[#5C9682]/15 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute bottom-0 left-1/4 w-96 h-96 bg-[#143C3C]/30 rounded-full blur-3xl pointer-events-none"></div>

      {/* Botón flotante para regresar a la página de inicio */}
      <div className="w-full max-w-4xl mb-3 flex justify-between items-center z-10">
        <button
          type="button"
          onClick={() => { setView('landing'); setError(''); }}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-400 hover:text-white bg-slate-900/80 hover:bg-slate-800/80 border border-slate-800 transition-all"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Volver a la Página de Inicio</span>
        </button>

        <div className="flex items-center gap-2 text-xs text-slate-400">
          <ShieldCheck className="w-4 h-4 text-emerald-400" />
          <span className="hidden sm:inline">Portal Seguro de Despacho</span>
        </div>
      </div>

      {/* CONTENEDOR SPLIT: IMAGEN CORPORATIVA A LA IZQUIERDA + FORMULARIO A LA DERECHA */}
      <div className="w-full max-w-4xl bg-[#192b2e]/95 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/10 overflow-hidden flex flex-col md:flex-row z-10 animate-in zoom-in-95 duration-200">
        
        {/* PANEL IZQUIERDO: IMAGEN Y COMPROMISO CORPORATIVO */}
        <div className="w-full md:w-1/2 relative bg-[#152427] flex flex-col justify-between p-6 sm:p-8 min-h-[220px] md:min-h-[500px]">
          
          {/* Fondo fotográfico con overlay elegante */}
          <img
            src="/gestoria_office.jpg"
            alt="Oficina Ferrer Assessoria"
            className="absolute inset-0 w-full h-full object-cover object-center opacity-35"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#152427] via-[#152427]/75 to-[#152427]/45"></div>

          {/* Encabezado sobre la imagen */}
          <div className="relative z-10">
            <div className="mb-3">
              <img
                src="/logo-ferrer-blanc.svg"
                alt="Ferrer Assessoria"
                className="h-9 w-auto object-contain"
              />
            </div>
            <p className="text-[11px] text-slate-300 font-medium uppercase tracking-wider">
              Despatx & Assessoria Integral
            </p>
          </div>

          {/* Testimonio / Cita central */}
          <div className="relative z-10 my-4 hidden md:block">
            <blockquote className="text-xs text-slate-300 italic leading-relaxed border-l-2 border-indigo-500 pl-3">
              "El rigor en los plazos y la precisión documental son la base de la confianza de nuestros clientes."
            </blockquote>
            <p className="text-[10px] text-slate-400 mt-2 font-semibold">
              Consultoría Fiscal, Laboral y Contable
            </p>
          </div>

          {/* Certificaciones y credenciales */}
          <div className="relative z-10 pt-2 border-t border-slate-800/80 flex flex-col gap-1.5 text-[11px] text-slate-400">
            <div className="flex items-center gap-1.5">
              <Check className="w-3.5 h-3.5 text-emerald-400" />
              <span>Conexión segura en tiempo real con Firestore</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Check className="w-3.5 h-3.5 text-emerald-400" />
              <span>Control relacional de clientes por NIF</span>
            </div>
          </div>

        </div>

        {/* PANEL DERECHO: FORMULARIO DE ACCESO (LOGIN / REGISTRO) */}
        <div className="w-full md:w-1/2 p-6 sm:p-8 bg-[#192b2e]/95 flex flex-col justify-between">
          
          <div>
            {/* Título y Selector de Modo */}
            <div className="mb-6">
              <h2 className="text-xl font-bold text-white tracking-tight">
                {isRegistering ? 'Activar Cuenta de Asesor' : 'Acceso al Portal'}
              </h2>
              <p className="text-xs text-slate-400 mt-1">
                {isRegistering 
                  ? 'Si has sido dado de alta por la administración del despacho, define tu clave de acceso.' 
                  : 'Introduce tus credenciales autorizadas para acceder a la gestión de expedientes.'}
              </p>

              {/* Selector Tabs: Iniciar Sesión / Primer Acceso */}
              <div className="flex bg-slate-950 p-1 rounded-xl border border-slate-800 mt-4">
                <button
                  type="button"
                  onClick={() => { setIsRegistering(false); setError(''); }}
                  className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                    !isRegistering 
                      ? 'bg-indigo-600 text-white shadow-xs' 
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Iniciar Sesión
                </button>
                <button
                  type="button"
                  onClick={() => { setIsRegistering(true); setError(''); }}
                  className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                    isRegistering 
                      ? 'bg-indigo-600 text-white shadow-xs' 
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Primer Acceso / Clave
                </button>
              </div>
            </div>

            {/* Alerta si falta configuración de .env */}
            {!isConfigured && (
              <div className="mb-4 p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl flex items-start gap-2.5 text-amber-300 text-xs">
                <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <span>Credenciales de Firebase no detectadas. Configura las variables en el archivo <code className="bg-amber-500/20 px-1 py-0.5 rounded font-mono">.env</code>.</span>
              </div>
            )}

            {/* Mensaje de Error */}
            {error && (
              <div className="mb-4 p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl flex items-start gap-2.5 text-rose-300 text-xs">
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            {/* Formulario */}
            <form onSubmit={handleSubmit} className="space-y-3.5">
              <div>
                <label className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-1">
                  Correo Electrónico
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    required
                    placeholder="gestor@asesoria.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 bg-slate-950/80 border border-slate-700/80 rounded-xl text-xs outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 text-white placeholder-slate-500 transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-1">
                  Contraseña
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="password"
                    required
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 bg-slate-950/80 border border-slate-700/80 rounded-xl text-xs outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 text-white placeholder-slate-500 transition-all"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-600 text-white font-bold rounded-xl text-xs shadow-md shadow-indigo-600/30 hover:shadow-indigo-500/40 transition-all flex items-center justify-center gap-2 disabled:opacity-50 mt-1 cursor-pointer"
              >
                {loading ? (
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : isRegistering ? (
                  <>
                    <UserPlus className="w-3.5 h-3.5" /> <span>Activar y Acceder al Despacho</span>
                  </>
                ) : (
                  <>
                    <LogIn className="w-3.5 h-3.5" /> <span>Entrar al Portal Ferrer Assessoria</span>
                  </>
                )}
              </button>
            </form>

            {/* Separador */}
            <div className="relative my-4 text-center">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-800" />
              </div>
              <span className="relative bg-slate-900 px-3 text-[10px] text-slate-500 uppercase font-medium">O</span>
            </div>

            {/* Botón Google OAuth */}
            <button
              type="button"
              onClick={handleGoogleLogin}
              disabled={loading}
              className="w-full py-2 px-3 bg-slate-950 hover:bg-slate-800/80 border border-slate-700/80 rounded-xl text-xs font-semibold text-slate-200 transition-all flex items-center justify-center gap-2 shadow-sm"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
              </svg>
              <span>Acceder con Cuenta Google</span>
            </button>
          </div>

          {/* Pie de seguridad del portal */}
          <div className="mt-5 pt-3 border-t border-slate-800 text-center">
            <p className="text-[10px] text-slate-500 flex items-center justify-center gap-1">
              <Shield className="w-3 h-3 text-slate-400" />
              <span>Acceso seguro cifrado SSL para despachos profesionales</span>
            </p>
          </div>

        </div>

      </div>

    </div>
  );
}
