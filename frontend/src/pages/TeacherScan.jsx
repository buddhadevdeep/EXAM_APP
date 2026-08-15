import React, { useEffect, useState, useRef } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { useNavigate, Link } from 'react-router-dom';
import { FaCamera, FaArrowLeft, FaExclamationTriangle } from 'react-icons/fa';

const TeacherScan = () => {
  const navigate = useNavigate();
  const [error, setError] = useState('');
  const [permissionGranted, setPermissionGranted] = useState(null);
  const [scannerStarted, setScannerStarted] = useState(false);
  const [manualId, setManualId] = useState('');
  const scannerRef = useRef(null);

  const handleManualSubmit = (e) => {
    e.preventDefault();
    if (manualId.trim()) {
      stopScanner().then(() => {
        navigate(`/verify-submission/${manualId.trim()}`);
      });
    }
  };

  const retryTimeoutRef = useRef(null);

  useEffect(() => {
    const html5Qrcode = new Html5Qrcode('qr-reader');
    scannerRef.current = html5Qrcode;

    const startScanner = async () => {
      try {
        setPermissionGranted(true);
        setScannerStarted(true);
        await html5Qrcode.start(
          { facingMode: 'environment' },
          {
            fps: 10,
            qrbox: { width: 250, height: 250 }
          },
          (decodedText) => {
            console.log('QR Code scanned:', decodedText);
            try {
              stopScanner().then(() => {
                const match = decodedText.match(/\/verify-submission\/(\d+)/);
                if (match && match[1]) {
                  navigate(`/verify-submission/${match[1]}`);
                } else {
                  setError('Invalid QR Code format. Please scan a valid exam submission QR.');
                  retryTimeoutRef.current = setTimeout(startScanner, 3000);
                }
              });
            } catch (err) {
              console.error(err);
            }
          },
          (errorMessage) => {
            // Keep verbose log silent
          }
        );
      } catch (err) {
        console.error('Failed to start scanner:', err);
        setPermissionGranted(false);
        setError('Camera permission denied or camera not found.');
      }
    };

    startScanner();

    return () => {
      stopScanner();
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
      }
    };
  }, [navigate]);

  const stopScanner = async () => {
    if (scannerRef.current && scannerRef.current.isScanning) {
      try {
        await scannerRef.current.stop();
      } catch (err) {
        console.error('Error stopping scanner:', err);
      }
    }
  };

  return (
    <div className="container mt-4 animated-fade">
      <div className="d-flex align-items-center gap-3 mb-4">
        <Link to="/teacher/dashboard" className="btn btn-outline-secondary p-2 d-flex align-items-center justify-content-center" style={{ borderRadius: '50%', width: '38px', height: '38px' }}>
          <FaArrowLeft />
        </Link>
        <h3 className="fw-bold mb-0 text-gradient">Scan Student QR Code</h3>
      </div>

      <div className="card glass-card p-4 mx-auto shadow" style={{ maxWidth: '500px', borderRadius: '24px' }}>
        <p className="text-muted text-center mb-4">
          Point your device's camera at the QR code displayed on the student's exam screen to automatically verify and approve their submission.
        </p>

        {error && (
          <div className="alert alert-danger d-flex align-items-center gap-2 mb-4 py-2">
            <FaExclamationTriangle className="flex-shrink-0 text-danger" />
            <div className="small">{error}</div>
          </div>
        )}

        <div className="position-relative bg-dark rounded-4 overflow-hidden border border-secondary border-opacity-30 mb-4" style={{ minHeight: '300px' }}>
          <div id="qr-reader" className="w-100 h-100"></div>
          
          {!scannerStarted && (
            <div className="position-absolute top-50 start-50 translate-middle text-center text-muted">
              <FaCamera className="fs-1 mb-2 text-primary animate-pulse" />
              <div>Initializing camera...</div>
            </div>
          )}

          {scannerStarted && (
            <div className="position-absolute top-50 start-50 translate-middle pointer-events-none" style={{ width: '250px', height: '250px', border: '3px solid var(--primary-color)', borderRadius: '16px', boxShadow: '0 0 0 9999px rgba(0,0,0,0.5)', zIndex: 10 }}>
              <div className="w-100" style={{ height: '3px', background: 'var(--primary-color)', position: 'absolute', top: '0', animation: 'scanLine 2s linear infinite' }}></div>
            </div>
          )}
        </div>

        <hr className="my-4 border-secondary border-opacity-30" />

        <form onSubmit={handleManualSubmit} className="text-center mb-4">
          <label className="form-label text-muted small d-block mb-2">
            Having trouble with the camera? Enter the Submission ID manually:
          </label>
          <div className="d-flex gap-2 justify-content-center">
            <input 
              type="text" 
              className="form-control text-center" 
              placeholder="e.g. 12" 
              value={manualId}
              onChange={e => setManualId(e.target.value)}
              style={{ maxWidth: '120px' }}
              required
            />
            <button type="submit" className="btn btn-primary px-3">
              Go
            </button>
          </div>
        </form>

        <div className="text-center">
          <Link to="/teacher/dashboard" className="btn btn-outline-secondary px-4">
            Cancel
          </Link>
        </div>
      </div>

      <style>{`
        @keyframes scanLine {
          0% { top: 0%; }
          50% { top: 100%; }
          100% { top: 0%; }
        }
        #qr-reader video {
          width: 100% !important;
          height: auto !important;
          border-radius: 12px;
          object-fit: cover !important;
        }
      `}</style>
    </div>
  );
};

export default TeacherScan;
