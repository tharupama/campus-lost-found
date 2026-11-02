import { useEffect, useRef, useState } from 'react';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import { Camera, Loader2, RotateCcw, AlertTriangle } from 'lucide-react';

// Disable the experimental native BarcodeDetector: on several devices it either
// fails to initialise the scanner or silently returns no results, which makes
// the camera look like it is running while nothing is ever decoded. Forcing the
// bundled ZXing decoder is slower but far more reliable for QR handover.
const SCANNER_CONFIG = {
  formatsToSupport: [Html5QrcodeSupportedFormats.QR_CODE],
  useBarCodeDetectorIfSupported: false,
};

const SCAN_OPTIONS = {
  fps: 10,
  qrbox: { width: 240, height: 240 },
};

export default function QrScanner({ onResult }) {
  const scannerRef = useRef(null);
  const handledRef = useRef(false);
  const [scanning, setScanning] = useState(false);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState('');

  const stop = async () => {
    const s = scannerRef.current;
    scannerRef.current = null;
    handledRef.current = true;
    if (s) {
      try {
        await s.stop();
      } catch {
        // already stopped
      }
      try {
        s.clear();
      } catch {
        // nothing rendered yet
      }
    }
    setScanning(false);
  };

  useEffect(() => {
    return () => {
      void stop();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const start = async () => {
    setStarting(true);
    setError('');
    handledRef.current = false;
    try {
      const scanner = new Html5Qrcode('qr-reader-region', SCANNER_CONFIG);
      scannerRef.current = scanner;

      const handleScan = async (decodedText) => {
        if (handledRef.current) return;
        handledRef.current = true;
        await stop();
        onResult(decodedText);
      };

      const ignoreError = () => {};

      try {
        await scanner.start({ facingMode: 'environment' }, SCAN_OPTIONS, handleScan, ignoreError);
      } catch (environmentError) {
        // Desktops and some tablets have no rear camera, so `environment` fails.
        // Fall back to whatever camera is available instead of giving up.
        const cameras = await Html5Qrcode.getCameras().catch(() => []);
        if (!cameras.length) throw environmentError;
        handledRef.current = false;
        await scanner.start(cameras[0].id, SCAN_OPTIONS, handleScan, ignoreError);
      }

      if (scannerRef.current === scanner) setScanning(true);
    } catch (e) {
      const message = typeof e === 'string' ? e : e?.message || '';
      setError(
        /permission|denied|notallowed|not allowed/i.test(message)
          ? 'Camera permission denied — allow camera access or use manual paste below.'
          : 'Camera unavailable on this device — use manual paste below.'
      );
      try {
        scannerRef.current?.clear();
      } catch {
        // nothing rendered yet
      }
      scannerRef.current = null;
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
