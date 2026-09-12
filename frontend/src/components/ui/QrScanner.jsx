import { useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { Camera, Loader2, RotateCcw, AlertTriangle } from 'lucide-react';

export default function QrScanner({ onResult }) {
  const scannerRef = useRef(null);
  const handledRef = useRef(false);
  const [scanning, setScanning] = useState(false);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState('');

  const stop = async () => {
    const s = scannerRef.current;
    scannerRef.current = null;
    if (s) {
      try {
        await s.stop();
        s.clear();
      } catch {
        // already stopped
      }
    }
    handledRef.current = false;
    setScanning(false);
  };

  useEffect(() => {
    const current = stop;
    return () => {
      void current();
    };
  }, []);

  const start = async () => {
    setStarting(true);
    setError('');
    handledRef.current = false;
    try {
      const scanner = new Html5Qrcode('qr-reader-region');
      scannerRef.current = scanner;
      await scanner.start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: { width: 240, height: 240 } },
        async (decodedText) => {
          if (handledRef.current) return;
          handledRef.current = true;
          await stop();
          onResult(decodedText);
        },
        () => {}
      );
      setScanning(true);
    } catch (e) {
      setError(
        e?.name === 'NotAllowedError'
          ? 'Camera permission denied — allow camera access or use manual paste below.'
          : 'Camera unavailable on this device — use manual paste below.'
      );
      setScanning(false);
    } finally {
      setStarting(false);
    }
  };

  return (
    <div>
      <div id="qr-reader-region" className="mx-auto w-full max-w-xs overflow-hidden rounded-2xl" />
      {error && (
        <p className="mt-2 flex items-start justify-center gap-1.5 text-center text-xs text-rose-500">
          <AlertTriangle size={13} className="mt-0.5 shrink-0" /> {error}
        </p>
      )}
      <div className="mt-3 flex justify-center gap-2">
        {scanning ? (
          <button onClick={stop} className="btn-ghost">
            <RotateCcw size={16} /> Stop camera
          </button>
        ) : (
          <button onClick={start} disabled={starting} className="btn-primary">
            {starting ? <Loader2 className="animate-spin" size={16} /> : <Camera size={16} />}
            {starting ? 'Starting camera…' : 'Start camera scan'}
          </button>
        )}
      </div>
    </div>
  );
}