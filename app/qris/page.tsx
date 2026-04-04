'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import {
  Box,
  Typography,
  Tabs,
  Tab,
  Button,
  TextField,
  Paper,
  Stack,
  Alert,
  CircularProgress,
  LinearProgress,
  Grid,
  IconButton,
  Tooltip,
  Chip,
  Divider,
} from '@mui/material';
import QrCode2Icon from '@mui/icons-material/QrCode2';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import VideocamIcon from '@mui/icons-material/Videocam';
import StopIcon from '@mui/icons-material/Stop';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import RefreshIcon from '@mui/icons-material/Refresh';
import SendIcon from '@mui/icons-material/Send';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import jsQR from 'jsqr';
import axios from 'axios';

// ─── Scanner Engine ──────────────────────────────────────────────────────────
// Strategy: use native BarcodeDetector if available (Chrome/Edge), else jsQR.
// Detection happens once on mount and is stored in a ref so scan loops
// never re-check the condition in a hot path.

type Engine = 'native' | 'jsqr';

function detectEngine(): Engine {
  if (typeof window !== 'undefined' && 'BarcodeDetector' in window) {
    return 'native';
  }
  return 'jsqr';
}

/** Extract ImageData from a video element via an offscreen canvas. */
function getVideoImageData(video: HTMLVideoElement): ImageData | null {
  if (video.readyState < 2 || video.videoWidth === 0) return null;
  const canvas = document.createElement('canvas');
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;
  ctx.drawImage(video, 0, 0);
  return ctx.getImageData(0, 0, canvas.width, canvas.height);
}

/** Extract ImageData from an HTMLImageElement via an offscreen canvas. */
function getImageElementData(img: HTMLImageElement): ImageData | null {
  const canvas = document.createElement('canvas');
  canvas.width = img.naturalWidth;
  canvas.height = img.naturalHeight;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;
  ctx.drawImage(img, 0, 0);
  return ctx.getImageData(0, 0, canvas.width, canvas.height);
}

// ─── QRIS EMV TLV Parser ────────────────────────────────────────────────────

function parseTLV(data: string): Record<string, string> {
  const result: Record<string, string> = {};
  let i = 0;
  while (i < data.length) {
    if (i + 4 > data.length) break;
    const tag = data.substring(i, i + 2);
    const len = parseInt(data.substring(i + 2, i + 4), 10);
    if (isNaN(len) || i + 4 + len > data.length) break;
    result[tag] = data.substring(i + 4, i + 4 + len);
    i += 4 + len;
  }
  return result;
}

function generateSTAN(): string {
  return String(Math.floor(Math.random() * 999999)).padStart(6, '0');
}

function generateApprovalCode(): string {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

function formatTransmissionDateTime(): string {
  const d = new Date();
  return (
    String(d.getMonth() + 1).padStart(2, '0') +
    String(d.getDate()).padStart(2, '0') +
    String(d.getHours()).padStart(2, '0') +
    String(d.getMinutes()).padStart(2, '0') +
    String(d.getSeconds()).padStart(2, '0')
  );
}

function toDateStr(d: Date): string {
  return d.toISOString().split('T')[0];
}

function toTimeStr(d: Date): string {
  return d.toTimeString().split(' ')[0];
}

function qrisToPayload(raw: string, isDynamic: boolean): PayloadState {
  const root = parseTLV(raw);
  const m26 = root['26'] ? parseTLV(root['26']) : {};
  const m51 = root['51'] ? parseTLV(root['51']) : {};

  const now = new Date();
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const stan = generateSTAN();
  const pan = m26['01'] || m51['01'] || '';
  const acqId = pan ? pan.substring(0, 8) : '93600002';
  const cardAcceptorId = m26['02'] || pan.substring(0, 15) || '';
  const additionalData = root['62'] || '';

  return {
    MTI: '200',
    PAN: pan,
    proccesingCode: '260000',
    transactionAmount: isDynamic ? (root['54'] || '') : '',
    transmissionDateTime: formatTransmissionDateTime(),
    STAN: stan,
    localTransactionTime: toTimeStr(now),
    localTransactionDate: toDateStr(now),
    settlementDate: toDateStr(tomorrow),
    captureDate: toDateStr(now),
    merchantType: root['52'] || '',
    posEntryMode: '011',
    convenienceFee: 'C00000000',
    acqInstitutionId: acqId,
    fwdInstitutionId: '360004',
    RRN: `${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}${stan}`,
    approvalCode: generateApprovalCode(),
    cardAcceptorTerminal: 'BRIMO',
    cardAcceptorId,
    cardAcceptorName: root['59'] || '',
    additionalData,
    currencyCode: root['53'] || '360',
    additionalDataNational: root['64'] || additionalData,
    issuerID: m51['00'] || acqId,
    accountIdentification1: m51['01'] || pan,
  };
}

// ─── Types ───────────────────────────────────────────────────────────────────

type QrisType = 'dynamic' | 'static';
type ScanMethod = 'camera' | 'upload';

interface PayloadState {
  MTI: string;
  PAN: string;
  proccesingCode: string;
  transactionAmount: string;
  transmissionDateTime: string;
  STAN: string;
  localTransactionTime: string;
  localTransactionDate: string;
  settlementDate: string;
  captureDate: string;
  merchantType: string;
  posEntryMode: string;
  convenienceFee: string;
  acqInstitutionId: string;
  fwdInstitutionId: string;
  RRN: string;
  approvalCode: string;
  cardAcceptorTerminal: string;
  cardAcceptorId: string;
  cardAcceptorName: string;
  additionalData: string;
  currencyCode: string;
  additionalDataNational: string;
  issuerID: string;
  accountIdentification1: string;
}

const FIELD_LABELS: Record<keyof PayloadState, string> = {
  MTI: 'MTI',
  PAN: 'PAN',
  proccesingCode: 'Processing Code',
  transactionAmount: 'Transaction Amount',
  transmissionDateTime: 'Transmission Date/Time',
  STAN: 'STAN',
  localTransactionTime: 'Local Transaction Time',
  localTransactionDate: 'Local Transaction Date',
  settlementDate: 'Settlement Date',
  captureDate: 'Capture Date',
  merchantType: 'Merchant Type (MCC)',
  posEntryMode: 'POS Entry Mode',
  convenienceFee: 'Convenience Fee',
  acqInstitutionId: 'Acquirer Institution ID',
  fwdInstitutionId: 'Forward Institution ID',
  RRN: 'RRN',
  approvalCode: 'Approval Code',
  cardAcceptorTerminal: 'Card Acceptor Terminal',
  cardAcceptorId: 'Card Acceptor ID',
  cardAcceptorName: 'Card Acceptor Name',
  additionalData: 'Additional Data',
  currencyCode: 'Currency Code',
  additionalDataNational: 'Additional Data National',
  issuerID: 'Issuer ID',
  accountIdentification1: 'Account Identification 1',
};

const AUTO_FIELDS = new Set([
  'transmissionDateTime',
  'STAN',
  'localTransactionTime',
  'localTransactionDate',
  'settlementDate',
  'captureDate',
  'RRN',
  'approvalCode',
]);

// Field grouping for cleaner form layout
const FIELD_GROUPS: { label: string; fields: (keyof PayloadState)[] }[] = [
  {
    label: 'Transaction',
    fields: ['MTI', 'proccesingCode', 'transactionAmount', 'currencyCode', 'posEntryMode', 'convenienceFee'],
  },
  {
    label: 'Timing',
    fields: ['transmissionDateTime', 'STAN', 'localTransactionTime', 'localTransactionDate', 'settlementDate', 'captureDate', 'RRN', 'approvalCode'],
  },
  {
    label: 'Merchant',
    fields: ['cardAcceptorName', 'cardAcceptorId', 'cardAcceptorTerminal', 'merchantType', 'PAN'],
  },
  {
    label: 'Institution',
    fields: ['acqInstitutionId', 'fwdInstitutionId', 'issuerID', 'accountIdentification1'],
  },
  {
    label: 'Additional',
    fields: ['additionalData', 'additionalDataNational'],
  },
];

// ─── Component ───────────────────────────────────────────────────────────────

export default function QrisPayPage() {
  const [qrisType, setQrisType] = useState<QrisType>('dynamic');
  const [scanMethod, setScanMethod] = useState<ScanMethod>('camera');
  const [isScanning, setIsScanning] = useState(false);
  const [scannedRaw, setScannedRaw] = useState<string | null>(null);
  const [payload, setPayload] = useState<PayloadState | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [response, setResponse] = useState<{
    ok: boolean;
    data?: any;
    errorType?: 'timeout' | 'unreachable' | 'unknown' | null;
    errorCode?: string | null;
    errorMessage?: string;
    httpStatus?: number | null;
  } | null>(null);
  const [uploadedImageUrl, setUploadedImageUrl] = useState<string | null>(null);
  const [scanError, setScanError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  // Tracks which engine is active so we can show a badge in the UI
  const [activeEngine, setActiveEngine] = useState<Engine | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animFrameRef = useRef<number | null>(null);
  // Native BarcodeDetector instance (only set when engine === 'native')
  const nativeDetectorRef = useRef<any>(null);
  const engineRef = useRef<Engine>('jsqr'); // safe default until mount

  // ── Detect engine once on mount ──────────────────────────────────────────
  useEffect(() => {
    const engine = detectEngine();
    engineRef.current = engine;
    setActiveEngine(engine);
    if (engine === 'native') {
      nativeDetectorRef.current = new (window as any).BarcodeDetector({
        formats: ['qr_code'],
      });
    }
  }, []);

  // ── Shared: decode a single source using whichever engine is available ──
  const decodeWithNative = useCallback(
    async (source: HTMLVideoElement | HTMLImageElement): Promise<string | null> => {
      try {
        const results = await nativeDetectorRef.current.detect(source);
        return results.length > 0 ? results[0].rawValue : null;
      } catch {
        return null;
      }
    },
    []
  );

  const decodeWithJsQR = useCallback(
    (source: HTMLVideoElement | HTMLImageElement): string | null => {
      const imageData =
        source instanceof HTMLVideoElement
          ? getVideoImageData(source)
          : getImageElementData(source);
      if (!imageData) return null;
      const result = jsQR(imageData.data, imageData.width, imageData.height, {
        inversionAttempts: 'dontInvert',
      });
      return result ? result.data : null;
    },
    []
  );

  const decode = useCallback(
    async (source: HTMLVideoElement | HTMLImageElement): Promise<string | null> => {
      if (engineRef.current === 'native') {
        return decodeWithNative(source);
      }
      return decodeWithJsQR(source);
    },
    [decodeWithNative, decodeWithJsQR]
  );

  // ── Camera control ───────────────────────────────────────────────────────
  const stopCamera = useCallback(() => {
    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    animFrameRef.current = null;
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    setIsScanning(false);
  }, []);

  const handleScanned = useCallback(
    (rawValue: string) => {
      stopCamera();
      setScannedRaw(rawValue);
      setPayload(qrisToPayload(rawValue, qrisType === 'dynamic'));
      setScanError(null);
    },
    [qrisType, stopCamera]
  );

  const startCamera = useCallback(async () => {
    setScanError(null);
    setScannedRaw(null);
    setPayload(null);
    setResponse(null);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1280 } },
      });
      streamRef.current = stream;
      if (!videoRef.current) return;
      videoRef.current.srcObject = stream;
      await videoRef.current.play();
      setIsScanning(true);

      const scanLoop = async () => {
        if (!videoRef.current) return;
        // jsQR: throttle to ~15 fps to avoid blocking the main thread
        if (engineRef.current === 'jsqr') {
          await new Promise((r) => setTimeout(r, 66));
        }
        const result = await decode(videoRef.current);
        if (result) {
          handleScanned(result);
          return;
        }
        animFrameRef.current = requestAnimationFrame(scanLoop);
      };

      scanLoop();
    } catch {
      setScanError('Could not access camera. Please allow camera permissions and try again.');
    }
  }, [decode, handleScanned]);

  // ── Image upload ─────────────────────────────────────────────────────────
  const handleImageUpload = useCallback(
    async (file: File) => {
      setScannedRaw(null);
      setPayload(null);
      setResponse(null);
      setScanError(null);

      const url = URL.createObjectURL(file);
      setUploadedImageUrl(url);

      const img = new Image();
      // Required for cross-origin canvas operations (no-op for blob URLs but safe)
      img.crossOrigin = 'anonymous';
      img.src = url;
      img.onload = async () => {
        const result = await decode(img);
        if (result) {
          handleScanned(result);
        } else {
          setScanError('No QR code found in the image. Please try a clearer image.');
        }
      };
      img.onerror = () => {
        setScanError('Failed to load the image file.');
      };
    },
    [decode, handleScanned]
  );

  // ── Reset ────────────────────────────────────────────────────────────────
  const handleReset = useCallback(() => {
    stopCamera();
    setScannedRaw(null);
    setPayload(null);
    setResponse(null);
    setUploadedImageUrl(null);
    setScanError(null);
  }, [stopCamera]);

  const handleQrisTypeChange = (_: any, val: QrisType) => {
    setQrisType(val);
    handleReset();
  };

  const handleScanMethodChange = (_: any, val: ScanMethod) => {
    setScanMethod(val);
    stopCamera();
    setUploadedImageUrl(null);
  };

  // ── API submit ───────────────────────────────────────────────────────────
  const handleSubmit = async () => {
    if (!payload) return;
    setIsSubmitting(true);
    setResponse(null);
    try {
      const res = await axios.post('/api/qris/pay', payload);
      const d = res.data;
      setResponse({
        ok: d.ok,
        data: d.data,
        errorType: d.errorType ?? null,
        errorCode: d.errorCode ?? null,
        errorMessage: d.errorMessage ?? null,
        httpStatus: d.httpStatus ?? null,
      });
    } catch (err: any) {
      // Axios-level error (shouldn't normally happen since route always returns 200)
      setResponse({
        ok: false,
        errorType: 'unknown',
        errorMessage: err.message,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCopyResponse = () => {
    if (!response) return;
    const payload = response.ok
      ? response.data
      : { errorType: response.errorType, errorCode: response.errorCode, message: response.errorMessage };
    navigator.clipboard.writeText(JSON.stringify(payload, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  useEffect(() => () => stopCamera(), [stopCamera]);

  return (
    <Box sx={{ p: 4, maxWidth: 1100, mx: 'auto' }}>
      {/* ── Header ── */}
      <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Box
            sx={{
              width: 44,
              height: 44,
              borderRadius: 2,
              bgcolor: '#eff6ff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <QrCode2Icon sx={{ color: '#3b82f6', fontSize: 26 }} />
          </Box>
          <Box>
            <Typography variant="h5" fontWeight={700}>
              QRIS Pay
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Scan or upload a QRIS code to process a payment via BRI QRIS API.
            </Typography>
          </Box>
        </Box>
        {/* Engine badge */}
        {activeEngine && (
          <Tooltip
            title={
              activeEngine === 'native'
                ? 'Using the native BarcodeDetector API (Chrome/Edge). Fast, hardware-accelerated.'
                : 'BarcodeDetector not available — using jsQR (pure JS fallback). Works in all browsers.'
            }
            placement="left"
          >
            <Chip
              size="small"
              label={activeEngine === 'native' ? '⚡ BarcodeDetector API' : '🔄 jsQR Fallback'}
              sx={{
                fontWeight: 700,
                fontSize: 11,
                bgcolor: activeEngine === 'native' ? '#f0fdf4' : '#fffbeb',
                color: activeEngine === 'native' ? '#15803d' : '#92400e',
                border: '1px solid',
                borderColor: activeEngine === 'native' ? '#bbf7d0' : '#fde68a',
                cursor: 'help',
              }}
            />
          </Tooltip>
        )}
      </Box>

      {/* ── QRIS Type Tabs ── */}
      <Paper elevation={0} sx={{ mb: 3, borderRadius: 2, border: '1px solid #e5e7eb', overflow: 'hidden' }}>
        <Tabs
          value={qrisType}
          onChange={handleQrisTypeChange}
          sx={{ borderBottom: '1px solid #e5e7eb', px: 1 }}
          TabIndicatorProps={{ style: { backgroundColor: '#3b82f6', height: 3 } }}
        >
          <Tab
            value="dynamic"
            label={
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, py: 0.5 }}>
                <Chip
                  label="Dynamic"
                  size="small"
                  sx={{
                    bgcolor: qrisType === 'dynamic' ? '#3b82f6' : '#f3f4f6',
                    color: qrisType === 'dynamic' ? 'white' : '#6b7280',
                    fontWeight: 700,
                    fontSize: 10,
                    height: 20,
                  }}
                />
                <span style={{ fontSize: 14, fontWeight: 600 }}>Dynamic QRIS</span>
              </Box>
            }
            sx={{ textTransform: 'none', minHeight: 52 }}
          />
          <Tab
            value="static"
            label={
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, py: 0.5 }}>
                <Chip
                  label="Static"
                  size="small"
                  sx={{
                    bgcolor: qrisType === 'static' ? '#8b5cf6' : '#f3f4f6',
                    color: qrisType === 'static' ? 'white' : '#6b7280',
                    fontWeight: 700,
                    fontSize: 10,
                    height: 20,
                  }}
                />
                <span style={{ fontSize: 14, fontWeight: 600 }}>Static QRIS</span>
              </Box>
            }
            sx={{ textTransform: 'none', minHeight: 52 }}
          />
        </Tabs>

        <Box sx={{ px: 3, py: 2 }}>
          <Alert
            severity={qrisType === 'dynamic' ? 'info' : 'warning'}
            sx={{ borderRadius: 2, fontSize: 13 }}
          >
            {qrisType === 'dynamic' ? (
              <>
                <strong>Dynamic QRIS</strong> — The transaction amount is embedded in the QR code
                and will be extracted automatically (tag <code>54</code>).
              </>
            ) : (
              <>
                <strong>Static QRIS</strong> — The QR code does not contain an amount. You must
                enter the <strong>Transaction Amount</strong> manually before submitting.
              </>
            )}
          </Alert>
        </Box>
      </Paper>

      {/* ── Scanner Section ── */}
      {!payload && (
        <Paper
          elevation={0}
          sx={{ mb: 3, borderRadius: 2, border: '1px solid #e5e7eb', overflow: 'hidden' }}
        >
          <Tabs
            value={scanMethod}
            onChange={handleScanMethodChange}
            sx={{ bgcolor: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}
            TabIndicatorProps={{ style: { backgroundColor: '#1f2937', height: 3 } }}
          >
            <Tab
              icon={<VideocamIcon fontSize="small" />}
              iconPosition="start"
              label="Camera Scan"
              value="camera"
              sx={{ textTransform: 'none', fontWeight: 600, minHeight: 52, fontSize: 13 }}
            />
            <Tab
              icon={<UploadFileIcon fontSize="small" />}
              iconPosition="start"
              label="Upload Image"
              value="upload"
              sx={{ textTransform: 'none', fontWeight: 600, minHeight: 52, fontSize: 13 }}
            />
          </Tabs>

          {/* Camera mode */}
          {scanMethod === 'camera' && (
            <Box sx={{ p: 3 }}>
              <Box
                sx={{
                  position: 'relative',
                  width: '100%',
                  maxWidth: 440,
                  mx: 'auto',
                  borderRadius: 3,
                  overflow: 'hidden',
                  bgcolor: '#0f172a',
                  aspectRatio: '4/3',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <video
                  ref={videoRef}
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                    display: isScanning ? 'block' : 'none',
                  }}
                  playsInline
                  muted
                />
                {!isScanning && (
                  <Box sx={{ textAlign: 'center', color: 'rgba(255,255,255,0.5)' }}>
                    <VideocamIcon sx={{ fontSize: 56, mb: 1 }} />
                    <Typography variant="body2">Camera preview</Typography>
                  </Box>
                )}
                {/* Scan frame overlay */}
                {isScanning && (
                  <Box
                    sx={{
                      position: 'absolute',
                      top: '50%',
                      left: '50%',
                      transform: 'translate(-50%, -50%)',
                      width: 180,
                      height: 180,
                      borderRadius: 2,
                      boxShadow: '0 0 0 9999px rgba(0,0,0,0.45)',
                      '&::before': {
                        content: '""',
                        position: 'absolute',
                        inset: -2,
                        border: '3px solid #3b82f6',
                        borderRadius: 'inherit',
                        animation: 'qrisPulse 1.5s ease-in-out infinite',
                      },
                      '@keyframes qrisPulse': {
                        '0%, 100%': { opacity: 1 },
                        '50%': { opacity: 0.4 },
                      },
                    }}
                  />
                )}
              </Box>

              <Box sx={{ mt: 3, textAlign: 'center' }}>
                {!isScanning ? (
                  <Button
                    variant="contained"
                    onClick={startCamera}
                    startIcon={<VideocamIcon />}
                    sx={{
                      bgcolor: '#3b82f6',
                      px: 4,
                      py: 1.5,
                      borderRadius: 2,
                      textTransform: 'none',
                      fontWeight: 700,
                      fontSize: 14,
                      '&:hover': { bgcolor: '#2563eb' },
                    }}
                  >
                    Start Camera
                  </Button>
                ) : (
                  <Stack direction="row" spacing={2} justifyContent="center" alignItems="center">
                    <CircularProgress size={20} thickness={5} sx={{ color: '#3b82f6' }} />
                    <Typography variant="body2" color="text.secondary" fontWeight={500}>
                      Scanning for QRIS code…
                    </Typography>
                    <Button
                      variant="outlined"
                      color="error"
                      size="small"
                      onClick={stopCamera}
                      startIcon={<StopIcon />}
                      sx={{ textTransform: 'none', borderRadius: 2 }}
                    >
                      Stop
                    </Button>
                  </Stack>
                )}
              </Box>
            </Box>
          )}

          {/* Upload mode */}
          {scanMethod === 'upload' && (
            <Box sx={{ p: 3 }}>
              <Box
                component="label"
                htmlFor="qris-image-upload"
                sx={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  p: 5,
                  border: '2px dashed #d1d5db',
                  borderRadius: 3,
                  cursor: 'pointer',
                  bgcolor: '#f9fafb',
                  transition: 'all 0.2s',
                  '&:hover': { bgcolor: '#eff6ff', borderColor: '#3b82f6' },
                  minHeight: 220,
                }}
              >
                {uploadedImageUrl ? (
                  <img
                    src={uploadedImageUrl}
                    alt="Uploaded QRIS"
                    style={{ maxHeight: 220, maxWidth: '100%', borderRadius: 8, objectFit: 'contain' }}
                  />
                ) : (
                  <>
                    <UploadFileIcon sx={{ fontSize: 52, color: '#9ca3af', mb: 2 }} />
                    <Typography fontWeight={700} color="text.secondary">
                      Click to upload QRIS image
                    </Typography>
                    <Typography variant="caption" color="text.disabled" sx={{ mt: 0.5 }}>
                      PNG, JPG, WEBP supported
                    </Typography>
                  </>
                )}
              </Box>
              <input
                id="qris-image-upload"
                type="file"
                accept="image/*"
                style={{ display: 'none' }}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleImageUpload(file);
                  e.target.value = '';
                }}
              />
            </Box>
          )}
        </Paper>
      )}

      {/* Scan error */}
      {scanError && (
        <Alert severity="error" sx={{ mb: 3, borderRadius: 2 }} icon={<ErrorOutlineIcon />}>
          {scanError}
        </Alert>
      )}

      {/* ── Payload Form ── */}
      {payload && (
        <Paper elevation={0} sx={{ borderRadius: 2, border: '1px solid #e5e7eb', overflow: 'hidden' }}>
          {/* Scan success header */}
          <Box
            sx={{
              p: 2.5,
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              bgcolor: '#f0fdf4',
              borderBottom: '1px solid #bbf7d0',
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <CheckCircleIcon sx={{ color: '#16a34a', fontSize: 24 }} />
              <Box>
                <Typography fontWeight={700} sx={{ color: '#15803d', fontSize: 14 }}>
                  QR Code Scanned Successfully
                </Typography>
                <Typography
                  variant="caption"
                  sx={{
                    color: '#6b7280',
                    fontFamily: 'monospace',
                    display: 'block',
                    mt: 0.2,
                    maxWidth: 540,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {scannedRaw}
                </Typography>
              </Box>
            </Box>
            <Button
              variant="outlined"
              color="inherit"
              size="small"
              startIcon={<RefreshIcon />}
              onClick={handleReset}
              sx={{ textTransform: 'none', borderRadius: 2, flexShrink: 0 }}
            >
              Scan Again
            </Button>
          </Box>

          {/* In-flight loading bar */}
          {isSubmitting && (
            <LinearProgress
              sx={{
                height: 3,
                bgcolor: '#e0f2fe',
                '& .MuiLinearProgress-bar': { bgcolor: '#3b82f6' },
              }}
            />
          )}

          <Box sx={{ p: 3, opacity: isSubmitting ? 0.6 : 1, transition: 'opacity 0.2s', pointerEvents: isSubmitting ? 'none' : 'auto' }}>
            {qrisType === 'static' && (
              <Alert severity="warning" sx={{ mb: 3, borderRadius: 2 }}>
                Enter the <strong>Transaction Amount</strong> before submitting (in IDR, e.g.{' '}
                <code>50000</code>).
              </Alert>
            )}

            {/* Grouped fields */}
            <Stack spacing={3}>
              {FIELD_GROUPS.map((group) => (
                <Box key={group.label}>
                  <Typography
                    variant="caption"
                    fontWeight={700}
                    sx={{
                      textTransform: 'uppercase',
                      letterSpacing: 1,
                      color: '#6b7280',
                      mb: 1.5,
                      display: 'block',
                    }}
                  >
                    {group.label}
                  </Typography>
                  <Grid container spacing={2}>
                    {group.fields.map((key) => {
                      const isAutoGen = AUTO_FIELDS.has(key);
                      const isAmountField = key === 'transactionAmount';
                      const isAmountRequired = isAmountField && qrisType === 'static';
                      const isAmountError = isAmountRequired && !payload[key];

                      return (
                        <Grid
                          size={{
                            xs: 12,
                            sm: key === 'additionalData' || key === 'additionalDataNational' ? 12 : 6,
                            md: key === 'additionalData' || key === 'additionalDataNational' ? 12 : 4,
                          }}
                          key={key}
                        >
                          <TextField
                            label={FIELD_LABELS[key]}
                            value={payload[key]}
                            onChange={(e) => setPayload({ ...payload, [key]: e.target.value })}
                            fullWidth
                            size="small"
                            required={isAmountRequired}
                            error={isAmountError}
                            helperText={isAmountError ? 'Required for Static QRIS' : undefined}
                            slotProps={{
                              inputLabel: { shrink: true },
                              input: {
                                sx: {
                                  fontFamily: isAutoGen ? 'monospace' : 'inherit',
                                  fontSize: 13,
                                  bgcolor: isAutoGen ? '#f9fafb' : isAmountRequired ? '#fffbeb' : 'white',
                                },
                              },
                            }}
                          />
                        </Grid>
                      );
                    })}
                  </Grid>
                </Box>
              ))}
            </Stack>

            {/* Submit row */}
            <Divider sx={{ my: 3 }} />
            <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2 }}>
              <Button
                variant="outlined"
                color="inherit"
                onClick={handleReset}
                sx={{ textTransform: 'none', borderRadius: 2, px: 3 }}
              >
                Reset
              </Button>
              <Button
                variant="contained"
                onClick={handleSubmit}
                disabled={
                  isSubmitting || (qrisType === 'static' && !payload.transactionAmount.trim())
                }
                startIcon={
                  isSubmitting ? <CircularProgress size={16} color="inherit" /> : <SendIcon />
                }
                sx={{
                  bgcolor: '#0f172a',
                  px: 4,
                  borderRadius: 2,
                  textTransform: 'none',
                  fontWeight: 700,
                  '&:hover': { bgcolor: '#1e293b' },
                  '&:disabled': { bgcolor: '#94a3b8', color: 'white' },
                }}
              >
                {isSubmitting ? 'Submitting…' : 'Submit Payment'}
              </Button>
            </Box>
          </Box>
        </Paper>
      )}

      {/* ── Response ── */}
      {response && (
        <Box sx={{ mt: 3 }}>
          {response.ok ? (
            /* ── Success ── */
            <Paper
              elevation={0}
              sx={{ borderRadius: 2, border: '1px solid #bbf7d0', overflow: 'hidden' }}
            >
              <Box
                sx={{
                  p: 2.5,
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  bgcolor: '#f0fdf4',
                  borderBottom: '1px solid #bbf7d0',
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <CheckCircleIcon sx={{ color: '#16a34a' }} />
                  <Box>
                    <Typography fontWeight={700} sx={{ color: '#15803d' }}>
                      Payment Request Sent
                    </Typography>
                    {response.httpStatus && (
                      <Typography variant="caption" sx={{ color: '#6b7280' }}>
                        HTTP {response.httpStatus}
                      </Typography>
                    )}
                  </Box>
                </Box>
                <Tooltip title={copied ? 'Copied!' : 'Copy response'}>
                  <IconButton size="small" onClick={handleCopyResponse}>
                    <ContentCopyIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              </Box>
              <Box sx={{ p: 3, bgcolor: '#0f172a' }}>
                <pre
                  style={{
                    margin: 0,
                    fontFamily: "'Fira Code', 'Consolas', monospace",
                    fontSize: 12.5,
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-all',
                    color: '#e2e8f0',
                    lineHeight: 1.7,
                  }}
                >
                  {JSON.stringify(response.data, null, 2)}
                </pre>
              </Box>
            </Paper>
          ) : (
            /* ── Error ── */
            <Paper
              elevation={0}
              sx={{ borderRadius: 2, border: '1px solid #fecaca', overflow: 'hidden' }}
            >
              {/* Error header */}
              <Box
                sx={{
                  p: 2.5,
                  bgcolor: '#fef2f2',
                  borderBottom: '1px solid #fecaca',
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: 1.5,
                }}
              >
                <ErrorOutlineIcon sx={{ color: '#dc2626', mt: 0.2, flexShrink: 0 }} />
                <Box sx={{ flex: 1 }}>
                  <Typography fontWeight={700} sx={{ color: '#991b1b', mb: 0.5 }}>
                    {response.errorType === 'timeout'
                      ? 'Connection Timed Out'
                      : response.errorType === 'unreachable'
                      ? 'Server Unreachable'
                      : 'Request Failed'}
                  </Typography>
                  <Typography variant="body2" sx={{ color: '#7f1d1d', lineHeight: 1.6 }}>
                    {response.errorType === 'timeout' && (
                      <>The QRIS API did not respond within <strong>10 seconds</strong>. This usually means the server is down or unreachable from your current network.</>
                    )}
                    {response.errorType === 'unreachable' && (
                      <>Could not establish a connection to the BRI QRIS API. This endpoint is <strong>only accessible from the office intranet</strong>. If you are on a personal or external network, this request will always fail.</>
                    )}
                    {(response.errorType === 'unknown' || !response.errorType) && (
                      <>An unexpected error occurred while communicating with the API.</>
                    )}
                  </Typography>
                </Box>
              </Box>

              {/* Intranet hint */}
              {(response.errorType === 'unreachable' || response.errorType === 'timeout') && (
                <Alert
                  severity="warning"
                  sx={{
                    borderRadius: 0,
                    borderBottom: '1px solid #fecaca',
                    '& .MuiAlert-icon': { alignSelf: 'flex-start', mt: 0.5 },
                  }}
                >
                  <Typography variant="body2" fontWeight={600} sx={{ mb: 0.5 }}>
                    Not on the office network?
                  </Typography>
                  <Typography variant="body2">
                    The endpoint{' '}
                    <code style={{ fontSize: 11, background: '#fef3c7', padding: '1px 4px', borderRadius: 3 }}>
                      kyogre-ocp.apps.ocp-new-dev.bri.co.id
                    </code>{' '}
                    is an internal BRI intranet address. Connect to the office VPN or use an office Wi-Fi
                    network to reach it.
                  </Typography>
                </Alert>
              )}

              {/* Technical detail */}
              <Box sx={{ p: 2.5, bgcolor: '#0f172a' }}>
                <Typography
                  variant="caption"
                  sx={{ color: '#94a3b8', display: 'block', mb: 1, letterSpacing: 0.5 }}
                >
                  TECHNICAL DETAIL
                </Typography>
                <pre
                  style={{
                    margin: 0,
                    fontFamily: "'Fira Code', 'Consolas', monospace",
                    fontSize: 12,
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-all',
                    color: '#fca5a5',
                    lineHeight: 1.6,
                  }}
                >
                  {JSON.stringify(
                    {
                      errorType: response.errorType,
                      errorCode: response.errorCode,
                      message: response.errorMessage,
                      httpStatus: response.httpStatus,
                    },
                    null,
                    2
                  )}
                </pre>
              </Box>
            </Paper>
          )}
        </Box>
      )}
    </Box>
  );
}
