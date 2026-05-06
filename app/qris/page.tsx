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
  alpha,
  useTheme,
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
import ContentPasteIcon from '@mui/icons-material/ContentPaste';
import FiberManualRecordIcon from '@mui/icons-material/FiberManualRecord';
import jsQR from 'jsqr';
import axios from 'axios';

// ─── Scanner Engine ───────────────────────────────────────────────────────────

type Engine = 'native' | 'jsqr';

function detectEngine(): Engine {
  if (typeof window !== 'undefined' && 'BarcodeDetector' in window) return 'native';
  return 'jsqr';
}

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

function getImageElementData(img: HTMLImageElement): ImageData | null {
  const canvas = document.createElement('canvas');
  canvas.width = img.naturalWidth;
  canvas.height = img.naturalHeight;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;
  ctx.drawImage(img, 0, 0);
  return ctx.getImageData(0, 0, canvas.width, canvas.height);
}

// ─── Luhn Check Digit ────────────────────────────────────────────────────────

function luhnCheckDigit(number18: string): string {
  let total = 0;
  const reverseDigits = number18.split('').reverse();
  reverseDigits.forEach((d, i) => {
    let n = parseInt(d, 10);
    if (i % 2 === 0) {
      n *= 2;
      if (n > 9) n -= 9;
    }
    total += n;
  });
  return String((10 - (total % 10)) % 10);
}

// ─── QRIS EMV TLV Parser ─────────────────────────────────────────────────────

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
  return String(Math.floor(Math.random() * 899999) + 100000);
}

function generateRRN(): string {
  return String(Math.floor(Math.random() * (10 ** 12 - 10 ** 11)) + 10 ** 11);
}

function formatTransmissionDateTime(): string {
  const d = new Date();
  return [d.getMonth() + 1, d.getDate(), d.getHours(), d.getMinutes(), d.getSeconds()]
    .map((v) => String(v).padStart(2, '0'))
    .join('');
}

function toDateStr(d: Date): string {
  return d.toISOString().split('T')[0];
}

function toTimeStr(d: Date): string {
  return d.toTimeString().split(' ')[0];
}

// ─── Matches Python script logic exactly ────────────────────────────────────

function qrisToPayload(raw: string, isDynamic: boolean): PayloadState {
  const root = parseTLV(raw);
  const now = new Date();
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);

  // PAN: parse tag 26 > sub-tag 01, append Luhn check digit (19 digits total)
  let pan = '';
  if (root['26']) {
    const sub = parseTLV(root['26']);
    if (sub['01']) {
      const pan18 = sub['01'];
      pan = pan18 + luhnCheckDigit(pan18);
    }
  }

  // additionalDataNational = raw TLV string of tag 61 + tag 62 (with their TL prefix)
  let ads0 = '';
  let ads1 = '';
  if (root['61']) {
    const len = root['61'].length;
    ads0 = '61' + String(len).padStart(2, '0') + root['61'];
  }
  if (root['62']) {
    const len = root['62'].length;
    ads1 = '62' + String(len).padStart(2, '0') + root['62'];
  }

  // transactionAmount: tag 54 value × 100 (dynamic), or default 15000 × 100 (static)
  const transactionAmount = isDynamic
    ? root['54'] ? String(parseInt(root['54'], 10) * 100) : ''
    : '1500000';

  return {
    MTI: '200',
    PAN: pan,
    proccesingCode: '260000',
    transactionAmount,
    transmissionDateTime: formatTransmissionDateTime(),
    STAN: generateSTAN(),
    localTransactionTime: toTimeStr(now),
    localTransactionDate: toDateStr(now),
    settlementDate: toDateStr(tomorrow),
    captureDate: toDateStr(now),
    merchantType: root['52'] || '',
    posEntryMode: '011',
    convenienceFee: 'C00000000',
    acqInstitutionId: '93600002',
    fwdInstitutionId: '360004',
    RRN: generateRRN(),
    approvalCode: '551467',
    cardAcceptorTerminal: 'BRIMO',
    cardAcceptorId: 'a44ae3df12c7642230ae6ded5fa5d3a930c24298966d6e5f78c50a24c004f5e3',
    cardAcceptorName: root['59'] || '',
    additionalData: 'PI04Q001CD25SINYO SIMPERS SOBAMC03UMI',
    currencyCode: root['53'] || '360',
    additionalDataNational: ads0 + ads1,
    issuerID: '93600002',
    accountIdentification1: '9360000213214291591',
  };
}

// ─── Types ────────────────────────────────────────────────────────────────────

type QrisType = 'dynamic' | 'static';
type ScanMethod = 'camera' | 'upload';
type EndpointStatus = 'checking' | 'up' | 'down' | 'timeout';

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

// Fields auto-generated or hardcoded — shown as read-only
const AUTO_FIELDS = new Set([
  'transmissionDateTime',
  'STAN',
  'localTransactionTime',
  'localTransactionDate',
  'settlementDate',
  'captureDate',
  'RRN',
  'approvalCode',
  'acqInstitutionId',
  'fwdInstitutionId',
  'cardAcceptorId',
  'cardAcceptorTerminal',
  'additionalData',
  'issuerID',
  'accountIdentification1',
  'convenienceFee',
  'posEntryMode',
  'proccesingCode',
  'MTI',
]);

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

const ENDPOINT_URL = 'http://kyogre-ocp.apps.ocp-new-dev.bri.co.id:80/qris_api/qris_pay_bri';
const HEALTH_URL = 'http://kyogre-ocp.apps.ocp-new-dev.bri.co.id:80/';

// ─── Component ────────────────────────────────────────────────────────────────

export default function QrisPayPage() {
  const theme = useTheme();

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
  const [activeEngine, setActiveEngine] = useState<Engine | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [pasteFlash, setPasteFlash] = useState(false);

  // Endpoint health indicator
  const [endpointStatus, setEndpointStatus] = useState<EndpointStatus>('checking');

  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const nativeDetectorRef = useRef<any>(null);
  const engineRef = useRef<Engine>('jsqr');

  // ── Engine detection ─────────────────────────────────────────────────────
  useEffect(() => {
    const engine = detectEngine();
    engineRef.current = engine;
    setActiveEngine(engine);
    if (engine === 'native') {
      nativeDetectorRef.current = new (window as any).BarcodeDetector({ formats: ['qr_code'] });
    }
  }, []);

  // ── Endpoint health check ────────────────────────────────────────────────
  const checkEndpoint = useCallback(async () => {
    setEndpointStatus('checking');
    try {
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), 5000);
      await fetch(HEALTH_URL, { method: 'GET', signal: ctrl.signal, mode: 'no-cors' });
      clearTimeout(timer);
      setEndpointStatus('up');
    } catch (e: any) {
      setEndpointStatus(e.name === 'AbortError' ? 'timeout' : 'down');
    }
  }, []);

  useEffect(() => {
    checkEndpoint();
    const interval = setInterval(checkEndpoint, 30000);
    return () => clearInterval(interval);
  }, [checkEndpoint]);

  // ── Decode helpers ───────────────────────────────────────────────────────
  const decodeWithNative = useCallback(async (source: HTMLVideoElement | HTMLImageElement): Promise<string | null> => {
    try {
      const results = await nativeDetectorRef.current.detect(source);
      return results.length > 0 ? results[0].rawValue : null;
    } catch {
      return null;
    }
  }, []);

  const decodeWithJsQR = useCallback((source: HTMLVideoElement | HTMLImageElement): string | null => {
    const imageData =
      source instanceof HTMLVideoElement ? getVideoImageData(source) : getImageElementData(source);
    if (!imageData) return null;
    const result = jsQR(imageData.data, imageData.width, imageData.height, { inversionAttempts: 'dontInvert' });
    return result ? result.data : null;
  }, []);

  const decode = useCallback(
    async (source: HTMLVideoElement | HTMLImageElement): Promise<string | null> => {
      if (engineRef.current === 'native') return decodeWithNative(source);
      return decodeWithJsQR(source);
    },
    [decodeWithNative, decodeWithJsQR]
  );

  // ── Camera ───────────────────────────────────────────────────────────────
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
        if (engineRef.current === 'jsqr') await new Promise((r) => setTimeout(r, 66));
        const result = await decode(videoRef.current);
        if (result) { handleScanned(result); return; }
        animFrameRef.current = requestAnimationFrame(scanLoop);
      };
      scanLoop();
    } catch {
      setScanError('Could not access camera. Please allow camera permissions and try again.');
    }
  }, [decode, handleScanned]);

  // ── Image decode (shared for upload, drag, paste) ────────────────────────
  const decodeImageFile = useCallback(
    async (file: File) => {
      setScannedRaw(null);
      setPayload(null);
      setResponse(null);
      setScanError(null);
      const url = URL.createObjectURL(file);
      setUploadedImageUrl(url);
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.src = url;
      img.onload = async () => {
        const result = await decode(img);
        if (result) handleScanned(result);
        else setScanError('No QR code found in the image. Please try a clearer image.');
      };
      img.onerror = () => setScanError('Failed to load the image file.');
    },
    [decode, handleScanned]
  );

  const handleImageUpload = useCallback(
    (file: File) => {
      if (file.type.startsWith('image/')) decodeImageFile(file);
    },
    [decodeImageFile]
  );

  // ── Drag & Drop ──────────────────────────────────────────────────────────
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback(() => {
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragOver(false);
      const file = [...e.dataTransfer.items].find(
        (i) => i.kind === 'file' && i.type.startsWith('image/')
      )?.getAsFile();
      if (file) handleImageUpload(file);
      else setScanError('Please drop an image file.');
    },
    [handleImageUpload]
  );

  // ── Clipboard Paste (Ctrl+V / Cmd+V) ────────────────────────────────────
  useEffect(() => {
    if (scanMethod !== 'upload' || payload) return;

    const handlePaste = (e: ClipboardEvent) => {
      const items = [...(e.clipboardData?.items ?? [])];
      const imgItem = items.find((i) => i.type.startsWith('image/'));
      if (!imgItem) return;
      const file = imgItem.getAsFile();
      if (!file) return;
      // Flash the drop zone green
      setPasteFlash(true);
      setTimeout(() => setPasteFlash(false), 400);
      handleImageUpload(file);
    };

    document.addEventListener('paste', handlePaste);
    return () => document.removeEventListener('paste', handlePaste);
  }, [scanMethod, payload, handleImageUpload]);

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

  // ── Submit ───────────────────────────────────────────────────────────────
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
      setResponse({ ok: false, errorType: 'unknown', errorMessage: err.message });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCopyResponse = () => {
    if (!response) return;
    const dataToCopy = response.ok
      ? response.data
      : { errorType: response.errorType, errorCode: response.errorCode, message: response.errorMessage };
    navigator.clipboard.writeText(JSON.stringify(dataToCopy, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  useEffect(() => () => stopCamera(), [stopCamera]);

  // ── Endpoint status indicator helpers ────────────────────────────────────
  const endpointDotColor =
    endpointStatus === 'up' ? theme.palette.success.main
    : endpointStatus === 'checking' ? theme.palette.text.disabled
    : theme.palette.error.main;

  const endpointLabel =
    endpointStatus === 'checking' ? 'Checking endpoint…'
    : endpointStatus === 'up' ? 'Endpoint reachable'
    : endpointStatus === 'timeout' ? 'Endpoint timed out'
    : 'Endpoint unreachable';

  // ─────────────────────────────────────────────────────────────────────────

  return (
    <Box sx={{ p: 4, maxWidth: 1100, mx: 'auto', bgcolor: 'background.default', minHeight: '100vh' }}>

      {/* ── Header ── */}
      <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Box sx={{ width: 44, height: 44, borderRadius: 2, bgcolor: alpha(theme.palette.primary.main, 0.1), display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <QrCode2Icon sx={{ color: 'primary.main', fontSize: 26 }} />
          </Box>
          <Box>
            <Typography variant="h5" fontWeight={700}>QRIS Pay</Typography>
            <Typography variant="body2" color="text.secondary">
              Scan or upload a QRIS code to process a payment via BRI QRIS API.
            </Typography>
          </Box>
        </Box>

        {/* Endpoint health indicator */}
        <Stack direction="row" alignItems="center" spacing={1}
          sx={{ px: 1.5, py: 0.75, borderRadius: 2, border: '1px solid', borderColor: 'divider', bgcolor: 'background.paper' }}>
          <FiberManualRecordIcon
            sx={{
              fontSize: 10,
              color: endpointDotColor,
              animation: endpointStatus === 'checking' ? 'qrisBlink 1s ease-in-out infinite' : 'none',
              '@keyframes qrisBlink': { '0%,100%': { opacity: 1 }, '50%': { opacity: 0.2 } },
            }}
          />
          <Typography variant="caption" fontWeight={500} color="text.secondary">{endpointLabel}</Typography>
          {activeEngine && (
            <Tooltip title={activeEngine === 'native' ? 'Native BarcodeDetector API (Chrome/Edge)' : 'jsQR fallback (all browsers)'}>
              <Chip
                size="small"
                label={activeEngine === 'native' ? '⚡ Native' : '🔄 jsQR'}
                sx={{ fontSize: 10, fontWeight: 700, height: 20, cursor: 'help' }}
              />
            </Tooltip>
          )}
          <Tooltip title="Re-check endpoint">
            <IconButton size="small" onClick={checkEndpoint} disabled={endpointStatus === 'checking'}>
              <RefreshIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Stack>
      </Box>

      {/* ── QRIS Type Tabs ── */}
      <Paper elevation={0} sx={{ mb: 3, borderRadius: 2, border: '1px solid', borderColor: 'divider', overflow: 'hidden', bgcolor: 'background.paper' }}>
        <Tabs value={qrisType} onChange={handleQrisTypeChange} sx={{ borderBottom: '1px solid', borderColor: 'divider', px: 1 }}
          TabIndicatorProps={{ style: { backgroundColor: theme.palette.primary.main, height: 3 } }}>
          <Tab value="dynamic" label={<Box sx={{ display: 'flex', alignItems: 'center', gap: 1, py: 0.5 }}>
            <Chip label="Dynamic" size="small" sx={{ bgcolor: qrisType === 'dynamic' ? 'primary.main' : 'action.hover', color: qrisType === 'dynamic' ? 'primary.contrastText' : 'text.secondary', fontWeight: 700, fontSize: 10, height: 20 }} />
            <span style={{ fontSize: 14, fontWeight: 600 }}>Dynamic QRIS</span>
          </Box>} sx={{ textTransform: 'none', minHeight: 52 }} />
          <Tab value="static" label={<Box sx={{ display: 'flex', alignItems: 'center', gap: 1, py: 0.5 }}>
            <Chip label="Static" size="small" sx={{ bgcolor: qrisType === 'static' ? 'secondary.main' : 'action.hover', color: qrisType === 'static' ? 'secondary.contrastText' : 'text.secondary', fontWeight: 700, fontSize: 10, height: 20 }} />
            <span style={{ fontSize: 14, fontWeight: 600 }}>Static QRIS</span>
          </Box>} sx={{ textTransform: 'none', minHeight: 52 }} />
        </Tabs>
        <Box sx={{ px: 3, py: 2 }}>
          <Alert severity={qrisType === 'dynamic' ? 'info' : 'warning'} sx={{ borderRadius: 2, fontSize: 13 }}>
            {qrisType === 'dynamic' ? (
              <><strong>Dynamic QRIS</strong> — The transaction amount is embedded in the QR code (tag <code>54</code>) and extracted automatically.</>
            ) : (
              <><strong>Static QRIS</strong> — No amount in QR. Defaults to <strong>Rp 15.000</strong> — edit the field before submitting if needed.</>
            )}
          </Alert>
        </Box>
      </Paper>

      {/* ── Scanner ── */}
      {!payload && (
        <Paper elevation={0} sx={{ mb: 3, borderRadius: 2, border: '1px solid', borderColor: 'divider', overflow: 'hidden', bgcolor: 'background.paper' }}>
          <Tabs value={scanMethod} onChange={handleScanMethodChange}
            sx={{ bgcolor: 'background.default', borderBottom: '1px solid', borderColor: 'divider' }}
            TabIndicatorProps={{ style: { backgroundColor: theme.palette.text.primary, height: 3 } }}>
            <Tab icon={<VideocamIcon fontSize="small" />} iconPosition="start" label="Camera Scan" value="camera"
              sx={{ textTransform: 'none', fontWeight: 600, minHeight: 52, fontSize: 13 }} />
            <Tab icon={<UploadFileIcon fontSize="small" />} iconPosition="start" label="Upload Image" value="upload"
              sx={{ textTransform: 'none', fontWeight: 600, minHeight: 52, fontSize: 13 }} />
          </Tabs>

          {/* Camera mode */}
          {scanMethod === 'camera' && (
            <Box sx={{ p: 3 }}>
              <Box sx={{ position: 'relative', width: '100%', maxWidth: 440, mx: 'auto', borderRadius: 3, overflow: 'hidden', bgcolor: '#000', aspectRatio: '4/3', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <video ref={videoRef} style={{ width: '100%', height: '100%', objectFit: 'cover', display: isScanning ? 'block' : 'none' }} playsInline muted />
                {!isScanning && (
                  <Box sx={{ textAlign: 'center', color: 'rgba(255,255,255,0.5)' }}>
                    <VideocamIcon sx={{ fontSize: 56, mb: 1 }} />
                    <Typography variant="body2">Camera preview</Typography>
                  </Box>
                )}
                {isScanning && (
                  <Box sx={{
                    position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
                    width: 180, height: 180, borderRadius: 2, boxShadow: '0 0 0 9999px rgba(0,0,0,0.45)',
                    '&::before': { content: '""', position: 'absolute', inset: -2, border: '3px solid', borderColor: 'primary.main', borderRadius: 'inherit', animation: 'qrisPulse 1.5s ease-in-out infinite' },
                    '@keyframes qrisPulse': { '0%, 100%': { opacity: 1 }, '50%': { opacity: 0.4 } },
                  }} />
                )}
              </Box>
              <Box sx={{ mt: 3, textAlign: 'center' }}>
                {!isScanning ? (
                  <Button variant="contained" onClick={startCamera} startIcon={<VideocamIcon />}
                    sx={{ px: 4, py: 1.5, borderRadius: 2, textTransform: 'none', fontWeight: 700, fontSize: 14 }}>
                    Start Camera
                  </Button>
                ) : (
                  <Stack direction="row" spacing={2} justifyContent="center" alignItems="center">
                    <CircularProgress size={20} thickness={5} sx={{ color: 'primary.main' }} />
                    <Typography variant="body2" color="text.secondary" fontWeight={500}>Scanning for QRIS code…</Typography>
                    <Button variant="outlined" color="error" size="small" onClick={stopCamera} startIcon={<StopIcon />}
                      sx={{ textTransform: 'none', borderRadius: 2 }}>Stop</Button>
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
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                sx={{
                  display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                  p: 5, border: '2px dashed', borderRadius: 3, cursor: 'pointer', minHeight: 220,
                  transition: 'all 0.2s',
                  borderColor: pasteFlash
                    ? 'success.main'
                    : isDragOver ? 'primary.main' : 'divider',
                  bgcolor: pasteFlash
                    ? alpha(theme.palette.success.main, 0.08)
                    : isDragOver ? 'action.hover' : 'background.default',
                  '&:hover': { bgcolor: 'action.hover', borderColor: 'primary.main' },
                }}
              >
                {uploadedImageUrl ? (
                  <img src={uploadedImageUrl} alt="Uploaded QRIS"
                    style={{ maxHeight: 220, maxWidth: '100%', borderRadius: 8, objectFit: 'contain' }} />
                ) : (
                  <Stack alignItems="center" spacing={1}>
                    <UploadFileIcon sx={{ fontSize: 52, color: '#9ca3af' }} />
                    <Typography fontWeight={700} color="text.secondary">
                      Click to upload &nbsp;·&nbsp; drag &amp; drop
                    </Typography>
                    {/* Paste hint */}
                    <Stack direction="row" alignItems="center" spacing={0.5}>
                      <ContentPasteIcon sx={{ fontSize: 14, color: 'text.disabled' }} />
                      <Typography variant="caption" color="text.disabled">
                        or press&nbsp;
                        <Box component="kbd" sx={{ px: 0.5, py: 0.1, border: '1px solid', borderColor: 'divider', borderRadius: 0.5, fontFamily: 'monospace', fontSize: 11 }}>Ctrl</Box>
                        &nbsp;+&nbsp;
                        <Box component="kbd" sx={{ px: 0.5, py: 0.1, border: '1px solid', borderColor: 'divider', borderRadius: 0.5, fontFamily: 'monospace', fontSize: 11 }}>V</Box>
                        &nbsp;to paste from clipboard
                      </Typography>
                    </Stack>
                    <Typography variant="caption" color="text.disabled">PNG · JPG · WEBP</Typography>
                  </Stack>
                )}
              </Box>
              <input id="qris-image-upload" type="file" accept="image/*" style={{ display: 'none' }}
                onChange={(e) => { const f = e.target.files?.[0]; if (f) handleImageUpload(f); e.target.value = ''; }} />
            </Box>
          )}
        </Paper>
      )}

      {/* Scan error */}
      {scanError && (
        <Alert severity="error" sx={{ mb: 3, borderRadius: 2 }} icon={<ErrorOutlineIcon />}>{scanError}</Alert>
      )}

      {/* ── Payload Form ── */}
      {payload && (
        <Paper elevation={0} sx={{ borderRadius: 2, border: '1px solid #e5e7eb', overflow: 'hidden' }}>
          {/* Success header */}
          <Box sx={{ p: 2.5, display: 'flex', justifyContent: 'space-between', alignItems: 'center', bgcolor: alpha(theme.palette.success.main, 0.1), borderBottom: '1px solid', borderColor: alpha(theme.palette.success.main, 0.2) }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <CheckCircleIcon sx={{ color: 'success.main', fontSize: 24 }} />
              <Box>
                <Typography fontWeight={700} sx={{ color: 'success.main', fontSize: 14 }}>QR Code Scanned Successfully</Typography>
                <Typography variant="caption" sx={{ color: 'text.secondary', fontFamily: 'monospace', display: 'block', mt: 0.2, maxWidth: 540, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {scannedRaw}
                </Typography>
              </Box>
            </Box>
            <Button variant="outlined" color="inherit" size="small" startIcon={<RefreshIcon />} onClick={handleReset}
              sx={{ textTransform: 'none', borderRadius: 2, flexShrink: 0 }}>Scan Again</Button>
          </Box>

          {isSubmitting && (
            <LinearProgress sx={{ height: 3, bgcolor: alpha(theme.palette.primary.main, 0.1), '& .MuiLinearProgress-bar': { bgcolor: 'primary.main' } }} />
          )}

          <Box sx={{ p: 3, opacity: isSubmitting ? 0.6 : 1, transition: 'opacity 0.2s', pointerEvents: isSubmitting ? 'none' : 'auto' }}>
            {qrisType === 'static' && (
              <Alert severity="warning" sx={{ mb: 3, borderRadius: 2 }}>
                Amount defaulted to <strong>Rp 15.000</strong> — edit the <strong>Transaction Amount</strong> field below if needed.
              </Alert>
            )}

            <Stack spacing={3}>
              {FIELD_GROUPS.map((group) => (
                <Box key={group.label}>
                  <Typography variant="caption" fontWeight={700} sx={{ textTransform: 'uppercase', letterSpacing: 1, color: 'text.secondary', mb: 1.5, display: 'block' }}>
                    {group.label}
                  </Typography>
                  <Grid container spacing={2}>
                    {group.fields.map((key) => {
                      const isAuto = AUTO_FIELDS.has(key);
                      const isAmount = key === 'transactionAmount';
                      const isAmountStatic = isAmount && qrisType === 'static';
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
                            fullWidth size="small"
                            slotProps={{
                              inputLabel: { shrink: true },
                              input: {
                                readOnly: isAuto,
                                sx: {
                                  fontFamily: isAuto ? 'monospace' : 'inherit',
                                  fontSize: 13,
                                  bgcolor: isAuto
                                    ? 'action.hover'
                                    : isAmountStatic
                                    ? alpha(theme.palette.warning.main, 0.07)
                                    : 'background.paper',
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

            <Divider sx={{ my: 3 }} />
            <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2 }}>
              <Button variant="outlined" color="inherit" onClick={handleReset} sx={{ textTransform: 'none', borderRadius: 2, px: 3 }}>Reset</Button>
              <Button variant="contained" onClick={handleSubmit}
                disabled={isSubmitting || !payload || (qrisType === 'static' && !payload.transactionAmount.trim())}
                startIcon={isSubmitting ? <CircularProgress size={16} color="inherit" /> : <SendIcon />}
                sx={{ bgcolor: 'text.primary', color: 'background.paper', px: 4, borderRadius: 2, textTransform: 'none', fontWeight: 700, '&:hover': { bgcolor: 'text.secondary' }, '&:disabled': { bgcolor: 'action.disabledBackground', color: 'text.disabled' } }}>
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
            <Paper elevation={0} sx={{ borderRadius: 2, border: '1px solid', borderColor: alpha(theme.palette.success.main, 0.3), overflow: 'hidden', bgcolor: 'background.paper' }}>
              <Box sx={{ p: 2.5, display: 'flex', justifyContent: 'space-between', alignItems: 'center', bgcolor: alpha(theme.palette.success.main, 0.1), borderBottom: '1px solid', borderColor: alpha(theme.palette.success.main, 0.2) }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <CheckCircleIcon sx={{ color: 'success.main' }} />
                  <Box>
                    <Typography fontWeight={700} sx={{ color: 'success.main' }}>Payment Request Sent</Typography>
                    {response.httpStatus && <Typography variant="caption" sx={{ color: 'text.secondary' }}>HTTP {response.httpStatus}</Typography>}
                  </Box>
                </Box>
                <Tooltip title={copied ? 'Copied!' : 'Copy response'}>
                  <IconButton size="small" onClick={handleCopyResponse}><ContentCopyIcon fontSize="small" /></IconButton>
                </Tooltip>
              </Box>
              <Box sx={{ p: 3, bgcolor: 'action.hover' }}>
                <pre style={{ margin: 0, fontFamily: "'Fira Code', 'Consolas', monospace", fontSize: 12.5, whiteSpace: 'pre-wrap', wordBreak: 'break-all', lineHeight: 1.7 }}>
                  {JSON.stringify(response.data, null, 2)}
                </pre>
              </Box>
            </Paper>
          ) : (
            <Paper elevation={0} sx={{ borderRadius: 2, border: '1px solid', borderColor: alpha(theme.palette.error.main, 0.3), overflow: 'hidden', bgcolor: 'background.paper' }}>
              <Box sx={{ p: 2.5, bgcolor: alpha(theme.palette.error.main, 0.1), borderBottom: '1px solid', borderColor: alpha(theme.palette.error.main, 0.2), display: 'flex', alignItems: 'flex-start', gap: 1.5 }}>
                <ErrorOutlineIcon sx={{ color: 'error.main', mt: 0.2, flexShrink: 0 }} />
                <Box sx={{ flex: 1 }}>
                  <Typography fontWeight={700} sx={{ color: 'error.main', mb: 0.5 }}>
                    {response.errorType === 'timeout' ? 'Connection Timed Out' : response.errorType === 'unreachable' ? 'Server Unreachable' : 'Request Failed'}
                  </Typography>
                  <Typography variant="body2" sx={{ color: 'text.primary', lineHeight: 1.6 }}>
                    {response.errorType === 'timeout' && <>The QRIS API did not respond within <strong>10 seconds</strong>.</>}
                    {response.errorType === 'unreachable' && <>Could not connect to the BRI QRIS API. This endpoint is <strong>only accessible from the office intranet</strong>.</>}
                    {(response.errorType === 'unknown' || !response.errorType) && <>An unexpected error occurred while communicating with the API.</>}
                  </Typography>
                </Box>
              </Box>
              {(response.errorType === 'unreachable' || response.errorType === 'timeout') && (
                <Alert severity="warning" sx={{ borderRadius: 0, borderBottom: '1px solid #fecaca', '& .MuiAlert-icon': { alignSelf: 'flex-start', mt: 0.5 } }}>
                  <Typography variant="body2" fontWeight={600} sx={{ mb: 0.5 }}>Not on the office network?</Typography>
                  <Typography variant="body2">
                    The endpoint <code style={{ fontSize: 11, background: '#fef3c7', padding: '1px 4px', borderRadius: 3 }}>kyogre-ocp.apps.ocp-new-dev.bri.co.id</code> is an internal BRI intranet address. Connect to the office VPN or use office Wi-Fi to reach it.
                  </Typography>
                </Alert>
              )}
              <Box sx={{ p: 2.5, bgcolor: 'action.hover' }}>
                <Typography variant="caption" sx={{ color: 'text.disabled', display: 'block', mb: 1, letterSpacing: 0.5 }}>TECHNICAL DETAIL</Typography>
                <pre style={{ margin: 0, fontFamily: "'Fira Code', 'Consolas', monospace", fontSize: 12, whiteSpace: 'pre-wrap', wordBreak: 'break-all', color: theme.palette.error.main, lineHeight: 1.6 }}>
                  {JSON.stringify({ errorType: response.errorType, errorCode: response.errorCode, message: response.errorMessage, httpStatus: response.httpStatus }, null, 2)}
                </pre>
              </Box>
            </Paper>
          )}
        </Box>
      )}
    </Box>
  );
}