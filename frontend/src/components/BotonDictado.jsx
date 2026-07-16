import { useState, useRef, useEffect } from 'react';

// Dictado por voz con Web Speech API (Chrome/Edge/Safari). El botón se muestra
// siempre; si el navegador no soporta dictado o el sitio no corre en HTTPS,
// al tocarlo explica el motivo en vez de desaparecer en silencio.
export default function BotonDictado({ onTexto }) {
  const [activo, setActivo] = useState(false);
  const recRef = useRef(null);
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;

  useEffect(() => () => recRef.current?.stop(), []);

  function toggle() {
    if (!SR) {
      alert('Este navegador no soporta dictado por voz. Usa Chrome, Edge o Safari.');
      return;
    }
    if (activo) {
      recRef.current?.stop();
      return;
    }
    const rec = new SR();
    rec.lang = 'es-MX';
    rec.continuous = true;
    rec.interimResults = false;
    rec.onresult = (e) => {
      let texto = '';
      for (let i = e.resultIndex; i < e.results.length; i++) {
        if (e.results[i].isFinal) texto += e.results[i][0].transcript;
      }
      if (texto) onTexto(texto.trim());
    };
    rec.onend = () => setActivo(false);
    rec.onerror = (e) => {
      setActivo(false);
      if (e.error === 'not-allowed' || e.error === 'service-not-allowed') {
        alert(window.isSecureContext
          ? 'Permiso de micrófono denegado. Actívalo en la configuración del navegador.'
          : 'El dictado requiere conexión segura (HTTPS). Estará disponible cuando el sistema corra bajo HTTPS.');
      }
    };
    recRef.current = rec;
    rec.start();
    setActivo(true);
  }

  return (
    <button type="button" onClick={toggle}
            title={activo ? 'Detener dictado' : 'Dictar con voz'}
            className={`text-xs px-2 py-1 rounded-full border transition-colors ${activo ? 'animate-pulse' : ''}`}
            style={{
              borderColor: activo ? '#ef4444' : 'var(--color-accent)',
              color: activo ? 'white' : 'var(--color-accent)',
              backgroundColor: activo ? '#ef4444' : 'transparent',
            }}>
      {activo ? '⏹ Detener' : '🎤 Dictar'}
    </button>
  );
}
