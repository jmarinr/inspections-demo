import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Check, AlertCircle, User, CreditCard, Calendar, Loader2, Sparkles, Edit3, Hash, XCircle, Camera, RotateCcw, ShieldCheck } from 'lucide-react';
import { Button, Card, ProgressBar, Alert } from '../ui';
import { useInspectionStore } from '../../stores/inspectionStore';
import { useOCR } from '../../hooks/useOCR';
import { useImageValidation } from '../../hooks/useImageValidation';
import { compressImage, fileToBase64 } from '../../lib/imageUtils';
import { COUNTRIES } from '../../lib/constants';

// ===== Photo Upload Card with Validation =====
interface IdPhotoCardProps {
  label: string;
  image: string | null;
  isProcessing: boolean;
  validationError: string | null;
  onCapture: (imageData: string) => void;
  onClear: () => void;
}

const IdPhotoCard: React.FC<IdPhotoCardProps> = ({ label, image, isProcessing, validationError, onCapture, onClear }) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isCompressing, setIsCompressing] = useState(false);

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsCompressing(true);
    try {
      const compressed = await compressImage(file, { maxSizeMB: 0.8 });
      const base64 = await fileToBase64(compressed);
      onCapture(base64);
    } catch (err) {
      console.error('Error processing:', err);
    } finally {
      setIsCompressing(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  if (image) {
    return (
      <div className="relative rounded-xl overflow-hidden aspect-[16/10]">
        <img src={image} alt={label} className="w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
        {!isProcessing && !validationError && (
          <div className="absolute top-2 left-2 flex items-center gap-1.5 px-2 py-1 rounded-full bg-emerald-500/90">
            <Check className="w-3 h-3 text-white" />
            <span className="text-[10px] text-white font-medium">Imagen cargada</span>
          </div>
        )}
        {isProcessing && (
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
            <div className="flex flex-col items-center gap-2">
              <Loader2 className="w-8 h-8 text-white animate-spin" />
              <span className="text-xs text-white">Analizando...</span>
            </div>
          </div>
        )}
        {validationError && (
          <div className="absolute inset-0 bg-red-900/70 flex items-center justify-center p-4">
            <div className="text-center">
              <XCircle className="w-8 h-8 text-red-300 mx-auto mb-2" />
              <p className="text-xs text-red-100 font-medium">{validationError}</p>
            </div>
          </div>
        )}
        <button
          onClick={onClear}
          className="absolute top-2 right-2 p-1.5 rounded-full bg-black/50 hover:bg-black/70 transition-colors"
        >
          <RotateCcw className="w-4 h-4 text-white" />
        </button>
        <p className="absolute bottom-2 left-2 text-xs text-white font-medium">{label}</p>
      </div>
    );
  }

  return (
    <>
      <input ref={inputRef} type="file" accept="image/*" capture="environment" onChange={handleFile} className="hidden" />
      <button
        onClick={() => inputRef.current?.click()}
        disabled={isCompressing}
        className="w-full rounded-xl border-2 border-dashed aspect-[16/10] flex flex-col items-center justify-center gap-3 transition-all hover:border-primary-400"
        style={{ borderColor: 'var(--border-color)', backgroundColor: 'var(--bg-card)' }}
      >
        {isCompressing ? (
          <Loader2 className="w-6 h-6 animate-spin" style={{ color: 'var(--hk-primary)' }} />
        ) : (
          <>
            <div className="w-12 h-12 rounded-full flex items-center justify-center" style={{ backgroundColor: 'var(--hk-primary-surface)' }}>
              <Camera className="w-6 h-6" style={{ color: 'var(--hk-primary)' }} />
            </div>
            <div className="text-center">
              <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{label}</p>
              <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>Toca para subir o usar cámara</p>
            </div>
          </>
        )}
      </button>
    </>
  );
};

// ===== Main Identity Step =====
export const IdentityStep: React.FC = () => {
  const { inspection, updateInsuredIdentity, nextStep, prevStep } = useInspectionStore();
  const { isProcessing, progress, error: ocrError, extractIdData } = useOCR();
  const { validateImage } = useImageValidation();
  
  const [frontImage, setFrontImage] = useState<string | null>(inspection.insuredPerson?.identity.frontImage || null);
  const [backImage, setBackImage] = useState<string | null>(inspection.insuredPerson?.identity.backImage || null);
  const [frontValidationError, setFrontValidationError] = useState<string | null>(null);
  const [backValidationError, setBackValidationError] = useState<string | null>(null);
  const [isExtracting, setIsExtracting] = useState(false);
  const [extractionDone, setExtractionDone] = useState(!!(inspection.insuredPerson?.identity.extractedData));
  const [extractionSuccess, setExtractionSuccess] = useState(
    !!(inspection.insuredPerson?.identity.extractedData?.fullName || inspection.insuredPerson?.identity.extractedData?.idNumber)
  );
  const [ocrRawText, setOcrRawText] = useState<string | null>(null);
  const [showRawText, setShowRawText] = useState(false);
  
  const [fullName, setFullName] = useState(inspection.insuredPerson?.identity.extractedData?.fullName || '');
  const [idNumber, setIdNumber] = useState(inspection.insuredPerson?.identity.extractedData?.idNumber || '');
  const [birthDate, setBirthDate] = useState(inspection.insuredPerson?.identity.extractedData?.birthDate || '');
  const [expiryDate, setExpiryDate] = useState(inspection.insuredPerson?.identity.extractedData?.expiryDate || '');

  const country = COUNTRIES.find((c) => c.code === inspection.country);
  const ocrTriggered = useRef(false);

  // Auto-trigger OCR when front image is set
  const runOCR = useCallback(async (front: string, back?: string) => {
    if (isExtracting || isProcessing) return;
    setIsExtracting(true);
    setOcrRawText(null);
    
    try {
      console.log('[IdentityStep] Auto-starting OCR...');
      const result = await extractIdData(front, back, inspection.country);
      console.log('[IdentityStep] OCR Result:', result);
      setOcrRawText(result.rawText || null);
      
      if (result.data) {
        if (result.data.fullName) setFullName(result.data.fullName);
        if (result.data.idNumber) setIdNumber(result.data.idNumber);
        if (result.data.birthDate) setBirthDate(result.data.birthDate);
        if (result.data.expiryDate) setExpiryDate(result.data.expiryDate);
        setExtractionSuccess(true);
      }
      
      setExtractionDone(true);
      updateInsuredIdentity({
        frontImage: front,
        backImage: back || null,
        extractedData: result.data,
        confidence: result.confidence,
        validated: result.confidence >= 0.7,
      });
    } catch (err) {
      console.error('[IdentityStep] OCR Error:', err);
      setExtractionDone(true);
      setExtractionSuccess(false);
    } finally {
      setIsExtracting(false);
    }
  }, [inspection.country, extractIdData, updateInsuredIdentity, isExtracting, isProcessing]);

  // Auto-trigger when front image changes
  useEffect(() => {
    if (frontImage && !ocrTriggered.current && !extractionDone) {
      ocrTriggered.current = true;
      const timer = setTimeout(() => runOCR(frontImage, backImage || undefined), 500);
      return () => clearTimeout(timer);
    }
  }, [frontImage]);

  // Re-run OCR when back image is added (if front exists and OCR already ran)
  useEffect(() => {
    if (backImage && frontImage && extractionDone && !isExtracting) {
      // Re-run with both images for better results
      const timer = setTimeout(() => {
        ocrTriggered.current = true;
        setExtractionDone(false);
        runOCR(frontImage, backImage);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [backImage]);

  const handleFrontImage = async (imageData: string) => {
    setFrontValidationError(null);
    
    // Validate
    const validation = await validateImage(imageData, 'identity_front');
    if (!validation.isValid) {
      setFrontValidationError(validation.reason);
      setFrontImage(imageData); // Still show it but with error overlay
      return;
    }
    
    setFrontImage(imageData);
    setExtractionDone(false);
    setExtractionSuccess(false);
    ocrTriggered.current = false;
  };

  const handleBackImage = async (imageData: string) => {
    setBackValidationError(null);
    
    const validation = await validateImage(imageData, 'identity_back');
    if (!validation.isValid) {
      setBackValidationError(validation.reason);
      setBackImage(imageData);
      return;
    }
    
    setBackImage(imageData);
  };

  const handleClearFront = () => {
    setFrontImage(null);
    setFrontValidationError(null);
    setExtractionDone(false);
    setExtractionSuccess(false);
    ocrTriggered.current = false;
    setFullName(''); setIdNumber(''); setBirthDate(''); setExpiryDate('');
  };

  const handleClearBack = () => {
    setBackImage(null);
    setBackValidationError(null);
  };

  const handleContinue = () => {
    updateInsuredIdentity({
      frontImage,
      backImage,
      extractedData: { fullName, idNumber, birthDate, expiryDate, nationality: country?.name || '' },
      confidence: inspection.insuredPerson?.identity.confidence || 0.5,
      validated: !!(fullName && idNumber),
    });
    nextStep();
  };

  const canContinue = frontImage && !frontValidationError && (fullName || idNumber);
  const showFields = frontImage && !frontValidationError && !isExtracting && !isProcessing;

  return (
    <div className="space-y-5 animate-slide-up">
      {/* Instructions */}
      <Alert variant="info" icon={<CreditCard className="w-4 h-4" />}>
        Sube la foto de tu <strong>{country?.idDocumentName || 'documento'}</strong>. 
        La IA extraerá los datos automáticamente al cargar la imagen.
      </Alert>

      {/* Photo Upload Cards */}
      <div className="grid grid-cols-2 gap-3">
        <IdPhotoCard
          label="Frente del documento"
          image={frontImage}
          isProcessing={(isExtracting || isProcessing) && !backImage}
          validationError={frontValidationError}
          onCapture={handleFrontImage}
          onClear={handleClearFront}
        />
        <IdPhotoCard
          label="Reverso del documento"
          image={backImage}
          isProcessing={(isExtracting || isProcessing) && !!backImage}
          validationError={backValidationError}
          onCapture={handleBackImage}
          onClear={handleClearBack}
        />
      </div>

      {/* Validation Errors */}
      {(frontValidationError || backValidationError) && (
        <Alert variant="warning" icon={<AlertCircle className="w-4 h-4" />}>
          {frontValidationError || backValidationError}
          <p className="text-xs mt-1 opacity-80">
            Asegúrate de tomar una foto clara del documento de identidad sobre una superficie plana.
          </p>
        </Alert>
      )}

      {/* Processing State */}
      {(isProcessing || isExtracting) && (
        <Card>
          <div className="flex items-center gap-4">
            <div className="relative">
              <div className="w-14 h-14 rounded-full flex items-center justify-center" style={{ backgroundColor: 'var(--hk-primary-surface)' }}>
                <Sparkles className="w-7 h-7 animate-pulse" style={{ color: 'var(--hk-primary)' }} />
              </div>
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Extrayendo datos del documento...</p>
              <p className="text-xs mb-2" style={{ color: 'var(--text-muted)' }}>OCR en proceso (15-30 segundos)</p>
              <ProgressBar progress={progress} size="sm" />
            </div>
          </div>
        </Card>
      )}

      {/* Extraction Result */}
      {extractionDone && !isExtracting && !isProcessing && (
        <>
          {extractionSuccess ? (
            <Alert variant="success" icon={<ShieldCheck className="w-4 h-4" />}>
              Datos extraídos con éxito. Verifica que sean correctos.
            </Alert>
          ) : (
            <Alert variant="warning" icon={<AlertCircle className="w-4 h-4" />}>
              No se pudieron extraer todos los datos. Ingresa manualmente lo que falte.
              {ocrRawText && (
                <button onClick={() => setShowRawText(!showRawText)} className="block mt-1 text-[10px] underline opacity-70">
                  {showRawText ? 'Ocultar texto OCR' : 'Ver texto OCR detectado'}
                </button>
              )}
            </Alert>
          )}
          {showRawText && ocrRawText && (
            <Card padding="sm">
              <pre className="text-[10px] whitespace-pre-wrap max-h-32 overflow-y-auto" style={{ color: 'var(--text-muted)' }}>
                {ocrRawText}
              </pre>
            </Card>
          )}
        </>
      )}

      {ocrError && (
        <Alert variant="error" icon={<AlertCircle className="w-4 h-4" />}>
          Error: {ocrError}
        </Alert>
      )}

      {/* Editable Fields */}
      {showFields && (
        <Card className="animate-fade-in">
          <div className="flex items-center gap-3 mb-5">
            <div className="p-2 rounded-xl" style={{ backgroundColor: 'var(--hk-primary-surface)' }}>
              <Edit3 className="w-5 h-5" style={{ color: 'var(--hk-primary)' }} />
            </div>
            <div>
              <h3 className="font-semibold" style={{ color: 'var(--text-primary)' }}>Datos del documento</h3>
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                {extractionSuccess ? 'Verifica y corrige si es necesario' : 'Ingresa los datos manualmente'}
              </p>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="flex items-center gap-2 text-xs font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>
                <User className="w-3.5 h-3.5" /> Nombre completo *
              </label>
              <input type="text" value={fullName} onChange={(e) => setFullName(e.target.value)}
                placeholder="Nombre y apellidos"
                className="w-full px-4 py-3 rounded-lg text-sm"
                style={{ backgroundColor: 'var(--bg-input)', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }}
              />
            </div>
            <div>
              <label className="flex items-center gap-2 text-xs font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>
                <Hash className="w-3.5 h-3.5" /> Número de {country?.idDocumentName || 'documento'} *
              </label>
              <input type="text" value={idNumber} onChange={(e) => setIdNumber(e.target.value)}
                placeholder={country?.code === 'PA' ? '8-123-4567' : country?.code === 'CR' ? '1-1234-1234' : '123456789'}
                className="w-full px-4 py-3 rounded-lg text-sm font-mono"
                style={{ backgroundColor: 'var(--bg-input)', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="flex items-center gap-2 text-xs font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>
                  <Calendar className="w-3.5 h-3.5" /> Nacimiento
                </label>
                <input type="date" value={birthDate} onChange={(e) => setBirthDate(e.target.value)}
                  className="w-full px-3 py-3 rounded-lg text-sm"
                  style={{ backgroundColor: 'var(--bg-input)', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }}
                />
              </div>
              <div>
                <label className="flex items-center gap-2 text-xs font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>
                  <Calendar className="w-3.5 h-3.5" /> Vencimiento
                </label>
                <input type="date" value={expiryDate} onChange={(e) => setExpiryDate(e.target.value)}
                  className="w-full px-3 py-3 rounded-lg text-sm"
                  style={{ backgroundColor: 'var(--bg-input)', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }}
                />
              </div>
            </div>
          </div>

          {/* Retry */}
          {extractionDone && frontImage && (
            <div className="mt-4 pt-3" style={{ borderTop: '1px solid var(--border-color)' }}>
              <button
                onClick={() => { setExtractionDone(false); ocrTriggered.current = false; runOCR(frontImage, backImage || undefined); }}
                className="text-xs flex items-center gap-1.5" style={{ color: 'var(--hk-primary)' }}
                disabled={isExtracting || isProcessing}
              >
                <Sparkles className="w-3.5 h-3.5" /> Reintentar extracción IA
              </button>
            </div>
          )}
        </Card>
      )}

      {/* Navigation */}
      <div className="flex gap-3">
        <Button variant="secondary" onClick={prevStep}>Atrás</Button>
        <Button fullWidth onClick={handleContinue} disabled={!frontImage || isProcessing || isExtracting || !!frontValidationError}>
          {canContinue ? 'Continuar' : frontImage ? 'Continuar sin datos' : 'Sube una foto primero'}
        </Button>
      </div>
    </div>
  );
};
