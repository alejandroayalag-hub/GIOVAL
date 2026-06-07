import { useRef, useEffect, useImperativeHandle, forwardRef, useState } from 'react';

const SignaturePad = forwardRef(function SignaturePad({ width = 500, height = 180 }, ref) {
  const canvasRef = useRef(null);
  const drawing = useRef(false);
  const [isEmpty, setIsEmpty] = useState(true);

  useImperativeHandle(ref, () => ({
    toDataURL: () => canvasRef.current?.toDataURL('image/png') || '',
    clear: () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      canvas.getContext('2d').clearRect(0, 0, canvas.width, canvas.height);
      setIsEmpty(true);
    },
    isEmpty: () => isEmpty,
  }));

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.strokeStyle = '#1a1a1a';
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    function getPos(e) {
      const rect = canvas.getBoundingClientRect();
      const scaleX = canvas.width / rect.width;
      const scaleY = canvas.height / rect.height;
      const src = e.touches ? e.touches[0] : e;
      return { x: (src.clientX - rect.left) * scaleX, y: (src.clientY - rect.top) * scaleY };
    }

    function start(e) {
      e.preventDefault();
      drawing.current = true;
      const { x, y } = getPos(e);
      ctx.beginPath();
      ctx.moveTo(x, y);
    }

    function move(e) {
      e.preventDefault();
      if (!drawing.current) return;
      const { x, y } = getPos(e);
      ctx.lineTo(x, y);
      ctx.stroke();
      setIsEmpty(false);
    }

    function end(e) { e.preventDefault(); drawing.current = false; }

    canvas.addEventListener('mousedown', start);
    canvas.addEventListener('mousemove', move);
    canvas.addEventListener('mouseup', end);
    canvas.addEventListener('mouseleave', end);
    canvas.addEventListener('touchstart', start, { passive: false });
    canvas.addEventListener('touchmove', move, { passive: false });
    canvas.addEventListener('touchend', end, { passive: false });

    return () => {
      canvas.removeEventListener('mousedown', start);
      canvas.removeEventListener('mousemove', move);
      canvas.removeEventListener('mouseup', end);
      canvas.removeEventListener('mouseleave', end);
      canvas.removeEventListener('touchstart', start);
      canvas.removeEventListener('touchmove', move);
      canvas.removeEventListener('touchend', end);
    };
  }, []);

  return (
    <div className="relative">
      <canvas ref={canvasRef} width={width} height={height}
              className="w-full border-2 rounded-xl touch-none cursor-crosshair"
              style={{ borderColor: 'var(--color-accent)', backgroundColor: '#fafafa' }} />
      {isEmpty && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <p className="text-sm text-gray-300 select-none">Firme aquí con el dedo o el cursor</p>
        </div>
      )}
    </div>
  );
});

export default SignaturePad;
