import { useState, useRef, useEffect } from 'react';

// Dictado por voz con Web Speech API (Chrome/Edge/Safari). Si el navegador no
// lo soporta, el botón no se renderiza.
export default function BotonDictado({ onTexto }) {
  const [activo, setActivo] = useState(false);
  const recRef = useRef(null);
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;

  useEffect(() => () => recRef.current?.stop(), []);

  if (!SR) return null;

  function toggle() {
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
    rec.onerror = () => setActivo(false);
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
