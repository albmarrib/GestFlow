import React, { Component, StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App.jsx';

class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("ErrorBoundary caught an error:", error, errorInfo);
    this.setState({ errorInfo });
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ minHeight: '100vh', backgroundColor: '#0f172a', color: '#fff', padding: '32px', fontFamily: 'system-ui, sans-serif' }}>
          <div style={{ maxWidth: '800px', margin: '0 auto', backgroundColor: '#1e293b', borderRadius: '16px', padding: '24px', border: '1px solid #ef4444' }}>
            <h2 style={{ color: '#ef4444', fontSize: '20px', fontWeight: 'bold', marginBottom: '12px' }}>
              ⚠️ Error detectado en la aplicación (GestFlow)
            </h2>
            <p style={{ color: '#94a3b8', fontSize: '14px', marginBottom: '16px' }}>
              Se ha producido un error inesperado al renderizar la interfaz:
            </p>
            <pre style={{ backgroundColor: '#0f172a', padding: '16px', borderRadius: '8px', color: '#f87171', fontSize: '13px', overflowX: 'auto', whiteSpace: 'pre-wrap' }}>
              {this.state.error?.toString()}
              {'\n\n'}
              {this.state.errorInfo?.componentStack}
            </pre>
            <div style={{ marginTop: '20px', display: 'flex', gap: '12px' }}>
              <button 
                onClick={() => window.location.reload()} 
                style={{ backgroundColor: '#4f46e5', color: '#fff', border: 'none', padding: '8px 16px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}
              >
                Recargar Página
              </button>
              <button 
                onClick={() => { localStorage.clear(); sessionStorage.clear(); window.location.reload(); }} 
                style={{ backgroundColor: '#334155', color: '#cbd5e1', border: 'none', padding: '8px 16px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}
              >
                Limpiar Caché y Recargar
              </button>
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
);
