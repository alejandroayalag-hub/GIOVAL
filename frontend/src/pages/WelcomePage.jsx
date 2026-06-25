import { Navigate, useNavigate } from 'react-router-dom';

const frases = [
  "La confianza que devuelves a cada paciente es el tratamiento más poderoso.",
  "Cada consulta es una oportunidad de transformar, no solo de tratar.",
  "El cuidado que pones en tu trabajo se refleja en el bienestar de quienes confían en ti.",
  "La medicina estética no cambia quién eres — revela la mejor versión de ti.",
  "Hoy es un buen día para hacer sentir extraordinaria a alguien.",
  "Tu precisión y tu empatía trabajan juntas en cada procedimiento.",
  "El detalle que otros omiten es el que tú conviertes en excelencia.",
  "Cada paciente lleva consigo una historia; tu trabajo es escribir el siguiente capítulo.",
  "La belleza que creas transforma vidas desde adentro hacia afuera.",
  "El conocimiento que dominas hoy es la seguridad que das mañana.",
  "Una sonrisa devuelta es el mejor resultado clínico.",
  "La constancia construye reputaciones que ningún marketing puede comprar.",
  "Tratar con arte lo que la ciencia diagnóstica — eso es lo que haces cada día.",
  "El bienestar de tu paciente comienza en el instante en que cruza la puerta.",
  "Tu trabajo no solo embellece — da seguridad, da identidad, da alegría.",
  "La excelencia no es un accidente; es el resultado de lo que decides hacer hoy.",
  "Cada procedimiento bien hecho es una promesa cumplida.",
  "La medicina estética es donde la ciencia se encuentra con el cuidado humano.",
  "Tu vocación es visible en cada resultado que logras.",
  "El mejor día para crecer profesionalmente es hoy.",
  "Lo que haces con tus manos tiene un impacto que va mucho más allá del consultorio.",
  "La atención al detalle es lo que distingue lo bueno de lo extraordinario.",
  "Cada paciente que sale satisfecho lleva tu trabajo al mundo.",
  "La dedicación que traes cada día construye una clínica de la que todos se enorgullecen.",
  "Tú transformas inseguridades en confianza — eso es un regalo.",
  "El aprendizaje continuo es el mejor tratamiento preventivo para tu carrera.",
  "La pasión que traes a tu trabajo se siente en cada consulta.",
  "Gioval existe porque existe el compromiso de hacer las cosas bien.",
  "Cada procedimiento es una obra pequeña; el conjunto es una carrera extraordinaria.",
  "Hoy, como siempre, tu trabajo importa más de lo que imaginas.",
];

export default function WelcomePage() {
  const navigate = useNavigate();

  const today = new Date().toISOString().split('T')[0];
  const stored = localStorage.getItem('bienvenida_fecha');

  if (stored === today) {
    return <Navigate to="/" replace />;
  }

  const nombre = localStorage.getItem('nombre') || 'bienvenida';
  const hora = new Date().getHours();
  const saludo = hora < 12 ? 'Buenos días' : hora < 19 ? 'Buenas tardes' : 'Buenas noches';

  const ahora = new Date();
  const inicio = new Date(ahora.getFullYear(), 0, 0);
  const diaAnio = Math.floor((ahora - inicio) / 86400000);
  const frase = frases[diaAnio % frases.length];

  function handleContinue() {
    localStorage.setItem('bienvenida_fecha', today);
    navigate('/');
  }

  return (
    <div
      onClick={handleContinue}
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#f5f2f0',
        cursor: 'pointer',
      }}
    >
      <div style={{ maxWidth: '480px', width: '100%', padding: '0 1.5rem', textAlign: 'center' }}>
        {/* Saludo */}
        <div>
          <p style={{
            fontFamily: "'Megante', Georgia, serif",
            fontSize: '2.8rem',
            color: '#887482',
            lineHeight: 1.1,
            margin: 0,
          }}>
            {saludo},
          </p>
          <p style={{
            fontFamily: "'Megante', Georgia, serif",
            fontSize: '2.8rem',
            color: '#887482',
            lineHeight: 1.2,
            margin: '0 0 2rem',
          }}>
            {nombre}
          </p>
        </div>

        {/* Divider */}
        <hr style={{
          width: '180px',
          border: 'none',
          borderTop: '1px solid #ced1ca',
          margin: '0 auto 2rem',
        }} />

        {/* Frase */}
        <p style={{
          fontFamily: "'Montserrat', system-ui, sans-serif",
          fontStyle: 'italic',
          fontWeight: 300,
          fontSize: '1rem',
          color: '#aba3ba',
          textAlign: 'center',
          lineHeight: 1.7,
          margin: '0 0 2.5rem',
        }}>
          {frase}
        </p>

        {/* Button */}
        <button
          onClick={(e) => { e.stopPropagation(); handleContinue(); }}
          style={{
            background: '#aba3ba',
            color: 'white',
            border: 'none',
            fontFamily: "'Montserrat', system-ui, sans-serif",
            fontWeight: 500,
            fontSize: '0.9rem',
            letterSpacing: '0.08em',
            padding: '0.75rem 2rem',
            borderRadius: '4px',
            cursor: 'pointer',
          }}
        >
          Continuar →
        </button>
      </div>
    </div>
  );
}
