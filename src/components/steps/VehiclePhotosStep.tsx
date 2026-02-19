import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Camera, Check, Info, RotateCcw, Sparkles, Loader2, Car, Search, Hash, AlertCircle, ChevronDown, ChevronUp, XCircle } from 'lucide-react';
import { Button, Card, Alert, Badge, ProgressBar } from '../ui';
import { useInspectionStore } from '../../stores/inspectionStore';
import { useVehicleOCR } from '../../hooks/useVehicleOCR';
import { useImageValidation } from '../../hooks/useImageValidation';
import { compressImage, fileToBase64 } from '../../lib/imageUtils';
import type { VehiclePhoto } from '../../types';

// ===== Photo Card Component =====
interface PhotoCardProps {
  photo: VehiclePhoto;
  index: number;
  onCapture: (imageData: string) => void;
  onClear: () => void;
  isPlatePhoto?: boolean;
  isDashboardPhoto?: boolean;
  validationError?: string | null;
}

const PhotoCard: React.FC<PhotoCardProps> = ({ 
  photo, index, onCapture, onClear, isPlatePhoto, isDashboardPhoto, validationError
}) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isCapturing, setIsCapturing] = useState(false);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsCapturing(true);
    try {
      const compressed = await compressImage(file, { maxSizeMB: 0.8 });
      const base64 = await fileToBase64(compressed);
      onCapture(base64);
    } catch (error) {
      console.error('Error processing photo:', error);
    } finally {
      setIsCapturing(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  if (photo.imageUrl) {
    return (
      <div className={`relative rounded-xl overflow-hidden border-2 aspect-[4/3] group ${validationError ? 'border-red-500/80' : 'border-emerald-500/60'}`}>
        <img src={photo.imageUrl} alt={photo.label} className="w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
        {validationError ? (
          <div className="absolute inset-0 bg-red-900/60 flex flex-col items-center justify-center p-2 text-center">
            <XCircle className="w-6 h-6 text-red-300 mb-1" />
            <p className="text-[10px] text-red-100 font-medium leading-tight">{validationError}</p>
          </div>
        ) : (
          <div className="absolute top-2 left-2 flex gap-1">
            <div className="w-6 h-6 rounded-full bg-emerald-500 flex items-center justify-center">
              <Check className="w-3.5 h-3.5 text-white" />
            </div>
            {isPlatePhoto && <Badge variant="ai" className="text-[10px]">Placa</Badge>}
            {isDashboardPhoto && <Badge variant="ai" className="text-[10px]">VIN</Badge>}
          </div>
        )}
        <div className="absolute bottom-0 left-0 right-0 p-2">
          <p className="text-white text-xs font-medium">{photo.label}</p>
        </div>
        <button 
          onClick={(e) => { e.stopPropagation(); onClear(); }}
          className="absolute top-2 right-2 p-1.5 rounded-full bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity"
        >
          <RotateCcw className="w-3.5 h-3.5 text-white" />
        </button>
      </div>
    );
  }

  return (
    <>
      <input ref={inputRef} type="file" accept="image/*" capture="environment" onChange={handleFileSelect} className="hidden" />
      <button
        onClick={() => inputRef.current?.click()}
        disabled={isCapturing}
        className="relative rounded-xl border-2 border-dashed aspect-[4/3] flex flex-col items-center justify-center gap-2 transition-all hover:border-primary-400 active:scale-[0.98]"
        style={{ borderColor: 'var(--border-color)', backgroundColor: 'var(--bg-card)' }}
      >
        {isCapturing ? (
          <Loader2 className="w-6 h-6 animate-spin" style={{ color: 'var(--hk-primary)' }} />
        ) : (
          <>
            <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ backgroundColor: 'rgba(236,72,153,0.15)' }}>
              <Camera className="w-5 h-5" style={{ color: 'var(--hk-primary)' }} />
            </div>
            <div className="text-center px-1">
              <p className="text-xs font-semibold" style={{ color: 'var(--text-primary)' }}>{photo.label}</p>
              <p className="text-[10px] mt-0.5" style={{ color: 'var(--text-muted)' }}>{index + 1}/7</p>
            </div>
          </>
        )}
      </button>
    </>
  );
};

// ===== Analysis Result Item =====
interface AnalysisItemProps {
  icon: React.ReactNode;
  label: string;
  value: string | null;
  confidence?: number;
}

const AnalysisItem: React.FC<AnalysisItemProps> = ({ icon, label, value, confidence }) => (
  <div className="flex items-center gap-3 p-3 rounded-lg" style={{ backgroundColor: 'var(--bg-input)' }}>
    <div className="p-2 rounded-lg shrink-0" style={{ backgroundColor: value ? 'rgba(16,185,129,0.15)' : 'rgba(236,72,153,0.1)' }}>
      {icon}
    </div>
    <div className="flex-1 min-w-0">
      <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{label}</p>
      <p className="text-sm font-semibold truncate" style={{ color: value ? 'var(--text-primary)' : 'var(--text-muted)' }}>
        {value || 'No detectado'}
      </p>
    </div>
    {value && confidence !== undefined && (
      <Badge variant={confidence > 60 ? 'success' : 'warning'} className="text-[10px] shrink-0">
        {Math.round(confidence)}%
      </Badge>
    )}
  </div>
);

// ===== Main Component =====
export const VehiclePhotosStep: React.FC = () => {
  const { inspection, updateVehiclePhoto, updateInsuredVehicle, nextStep, prevStep } = useInspectionStore();
  const { progress: ocrProgress, extractPlate, extractVIN } = useVehicleOCR();
  const { validateImage } = useImageValidation();
  
  const [analysisState, setAnalysisState] = useState<'idle' | 'running' | 'done'>('idle');
  const [analysisStep, setAnalysisStep] = useState('');
  const [showAnalysis, setShowAnalysis] = useState(true);
  const [photoErrors, setPhotoErrors] = useState<Record<string, string | null>>({});
  
  // OCR Results
  const [detectedPlate, setDetectedPlate] = useState<string | null>(inspection.insuredVehicle?.plate || null);
  const [detectedVIN, setDetectedVIN] = useState<string | null>(inspection.insuredVehicle?.vin || null);
  const [plateConfidence, setPlateConfidence] = useState(0);
  const [vinConfidence, setVinConfidence] = useState(0);
  const [plateRawText, setPlateRawText] = useState<string | null>(null);
  const [vinRawText, setVinRawText] = useState<string | null>(null);
  const [showRawText, setShowRawText] = useState(false);
  
  // Editable fields
  const [editPlate, setEditPlate] = useState(inspection.insuredVehicle?.plate || '');
  const [editVIN, setEditVIN] = useState(inspection.insuredVehicle?.vin || '');
  
  const photos = inspection.insuredVehicle?.photos || [];
  const capturedCount = photos.filter((p) => p.imageUrl).length;
  const totalPhotos = photos.length;
  const validCapturedCount = photos.filter(p => p.imageUrl && !photoErrors[p.id]).length;
  const allPhotosCaptured = capturedCount === totalPhotos;
  const progressPercent = Math.round((capturedCount / totalPhotos) * 100);
  const hasErrors = Object.values(photoErrors).some(e => !!e);

  // Run OCR analysis automatically when all 7 photos are captured
  const runAnalysis = useCallback(async () => {
    if (analysisState === 'running') return;
    
    setAnalysisState('running');
    console.log('[VehicleOCR] Starting automatic analysis...');

    // Find rear photo (for plate) and dashboard photo (for VIN)
    const rearPhoto = photos.find(p => p.angle === 'rear');
    const dashboardPhoto = photos.find(p => p.angle === 'dashboard');
    const frontPhoto = photos.find(p => p.angle === 'front');

    // 1. Extract plate from rear photo
    if (rearPhoto?.imageUrl) {
      try {
        setAnalysisStep('Analizando placa trasera...');
        const plateResult = await extractPlate(rearPhoto.imageUrl, inspection.country);
        console.log('[VehicleOCR] Plate result:', plateResult);
        setPlateRawText(plateResult.rawText);
        if (plateResult.plate) {
          setDetectedPlate(plateResult.plate);
          setPlateConfidence(plateResult.confidence * 100);
          setEditPlate(plateResult.plate);
          updateInsuredVehicle({ plate: plateResult.plate });
        }
      } catch (err) {
        console.error('[VehicleOCR] Plate extraction error:', err);
      }
    }
    
    // 2. If no plate from rear, try front photo
    if (!detectedPlate && frontPhoto?.imageUrl) {
      try {
        setAnalysisStep('Buscando placa en foto frontal...');
        const frontPlateResult = await extractPlate(frontPhoto.imageUrl, inspection.country);
        if (frontPlateResult.plate) {
          setDetectedPlate(frontPlateResult.plate);
          setPlateConfidence(frontPlateResult.confidence * 100);
          setEditPlate(frontPlateResult.plate);
          updateInsuredVehicle({ plate: frontPlateResult.plate });
        }
      } catch (err) {
        console.error('[VehicleOCR] Front plate error:', err);
      }
    }

    // 3. Extract VIN from dashboard photo
    if (dashboardPhoto?.imageUrl) {
      try {
        setAnalysisStep('Buscando VIN en tablero...');
        const vinResult = await extractVIN(dashboardPhoto.imageUrl);
        console.log('[VehicleOCR] VIN result:', vinResult);
        setVinRawText(vinResult.rawText);
        if (vinResult.vin) {
          setDetectedVIN(vinResult.vin);
          setVinConfidence(vinResult.confidence * 100);
          setEditVIN(vinResult.vin);
          updateInsuredVehicle({ vin: vinResult.vin });
        }
      } catch (err) {
        console.error('[VehicleOCR] VIN extraction error:', err);
      }
    }

    setAnalysisStep('');
    setAnalysisState('done');
    console.log('[VehicleOCR] Analysis complete');
  }, [photos, inspection.country, extractPlate, extractVIN, updateInsuredVehicle, analysisState, detectedPlate]);

  // Auto-trigger analysis when all photos are captured and valid
  useEffect(() => {
    if (allPhotosCaptured && !hasErrors && analysisState === 'idle') {
      const timer = setTimeout(() => runAnalysis(), 800);
      return () => clearTimeout(timer);
    }
  }, [allPhotosCaptured, hasErrors, analysisState, runAnalysis]);

  const handlePhotoCapture = async (photoId: string, imageData: string) => {
    // Find the photo to get its angle for validation
    const photo = photos.find(p => p.id === photoId);
    const validationStep = photo?.angle === 'dashboard' ? 'vehicle_dashboard' : `vehicle_${photo?.angle || 'front'}`;
    
    // Validate
    const result = await validateImage(imageData, validationStep);
    if (!result.isValid) {
      // Show error but still save (user can clear & retake)
      setPhotoErrors(prev => ({ ...prev, [photoId]: result.reason }));
      updateVehiclePhoto('insured', photoId, { imageUrl: imageData, timestamp: new Date() });
      return;
    }
    
    setPhotoErrors(prev => ({ ...prev, [photoId]: null }));
    updateVehiclePhoto('insured', photoId, { imageUrl: imageData, timestamp: new Date() });
    if (analysisState === 'done') {
      setAnalysisState('idle');
    }
  };

  const handlePhotoClear = (photoId: string) => {
    updateVehiclePhoto('insured', photoId, { imageUrl: null, timestamp: undefined });
    setPhotoErrors(prev => ({ ...prev, [photoId]: null }));
    if (analysisState === 'done') {
      setAnalysisState('idle');
    }
  };

  const handleContinue = () => {
    // Save edited values
    updateInsuredVehicle({ 
      plate: editPlate || detectedPlate || '',
      vin: editVIN || detectedVIN || '',
    });
    nextStep();
  };

  return (
    <div className="space-y-6 animate-slide-up">
      {/* Header */}
      <Card>
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2.5 rounded-xl" style={{ backgroundColor: 'var(--hk-primary)' }}>
            <Car className="w-5 h-5 text-white" />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold" style={{ color: 'var(--text-primary)' }}>
              Fotos del vehículo
            </h3>
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
              7 fotos requeridas · La IA analizará placa y VIN
            </p>
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold" style={{ color: allPhotosCaptured ? '#10b981' : 'var(--hk-primary)' }}>
              {capturedCount}/{totalPhotos}
            </p>
          </div>
        </div>
        <ProgressBar progress={progressPercent} size="md" />
      </Card>

      {/* Photo Grid */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
            Captura las 7 fotos
          </h3>
          {capturedCount > 0 && capturedCount < totalPhotos && (
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
              Faltan {totalPhotos - capturedCount}
            </p>
          )}
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {photos.map((photo, idx) => (
            <PhotoCard
              key={photo.id}
              photo={photo}
              index={idx}
              onCapture={(data) => handlePhotoCapture(photo.id, data)}
              onClear={() => handlePhotoClear(photo.id)}
              isPlatePhoto={photo.angle === 'rear'}
              validationError={photoErrors[photo.id] || null}
              isDashboardPhoto={photo.angle === 'dashboard'}
            />
          ))}
        </div>
      </div>

      {/* Analysis Running */}
      {analysisState === 'running' && (
        <Card className="animate-fade-in">
          <div className="flex items-center gap-4">
            <div className="relative">
              <div className="w-14 h-14 rounded-full flex items-center justify-center" style={{ backgroundColor: 'rgba(236,72,153,0.15)' }}>
                <Search className="w-7 h-7 animate-pulse" style={{ color: 'var(--hk-primary)' }} />
              </div>
              <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-primary-500 flex items-center justify-center">
                <Sparkles className="w-3.5 h-3.5 text-white" />
              </div>
            </div>
            <div className="flex-1">
              <h3 className="font-semibold" style={{ color: 'var(--text-primary)' }}>
                Analizando fotos con IA...
              </h3>
              <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
                {analysisStep || 'Procesando imágenes...'}
              </p>
              <div className="mt-2">
                <ProgressBar progress={ocrProgress} size="sm" />
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* Analysis Results */}
      {analysisState === 'done' && (
        <div className="space-y-4 animate-fade-in">
          {/* Results Header */}
          <button 
            onClick={() => setShowAnalysis(!showAnalysis)}
            className="w-full"
          >
            <Card>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-full" style={{ backgroundColor: (detectedPlate || detectedVIN) ? 'rgba(16,185,129,0.15)' : 'rgba(245,158,11,0.15)' }}>
                    {(detectedPlate || detectedVIN) ? (
                      <Sparkles className="w-5 h-5 text-emerald-400" />
                    ) : (
                      <AlertCircle className="w-5 h-5 text-amber-400" />
                    )}
                  </div>
                  <div className="text-left">
                    <h3 className="font-semibold" style={{ color: 'var(--text-primary)' }}>
                      Análisis completado
                    </h3>
                    <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                      {detectedPlate && detectedVIN 
                        ? 'Placa y VIN detectados' 
                        : detectedPlate 
                          ? 'Placa detectada · VIN no encontrado'
                          : detectedVIN
                            ? 'VIN detectado · Placa no encontrada'
                            : 'No se detectaron datos · Ingresa manualmente'}
                    </p>
                  </div>
                </div>
                {showAnalysis ? (
                  <ChevronUp className="w-5 h-5" style={{ color: 'var(--text-muted)' }} />
                ) : (
                  <ChevronDown className="w-5 h-5" style={{ color: 'var(--text-muted)' }} />
                )}
              </div>
            </Card>
          </button>

          {showAnalysis && (
            <Card className="animate-fade-in">
              {/* Detected Data */}
              <div className="space-y-3 mb-6">
                <AnalysisItem 
                  icon={<Hash className="w-4 h-4" style={{ color: detectedPlate ? '#10b981' : 'var(--hk-primary)' }} />}
                  label="Placa detectada"
                  value={detectedPlate}
                  confidence={plateConfidence}
                />
                <AnalysisItem 
                  icon={<Car className="w-4 h-4" style={{ color: detectedVIN ? '#10b981' : 'var(--hk-primary)' }} />}
                  label="VIN detectado"
                  value={detectedVIN}
                  confidence={vinConfidence}
                />
              </div>

              {/* Editable Fields */}
              <div className="space-y-4 pt-4" style={{ borderTop: '1px solid var(--border-color)' }}>
                <p className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>
                  Verifica o corrige los datos:
                </p>
                
                <div>
                  <label className="flex items-center gap-2 text-xs font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>
                    <Hash className="w-3.5 h-3.5" />
                    Placa del vehículo
                  </label>
                  <input
                    type="text"
                    value={editPlate}
                    onChange={(e) => setEditPlate(e.target.value.toUpperCase())}
                    placeholder="Ej: AB-1234"
                    className="w-full px-4 py-3 rounded-lg text-sm font-mono"
                    style={{ 
                      backgroundColor: 'var(--bg-input)', 
                      border: '1px solid var(--border-color)',
                      color: 'var(--text-primary)',
                    }}
                  />
                </div>
                
                <div>
                  <label className="flex items-center gap-2 text-xs font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>
                    <Car className="w-3.5 h-3.5" />
                    VIN (17 caracteres)
                  </label>
                  <input
                    type="text"
                    value={editVIN}
                    onChange={(e) => setEditVIN(e.target.value.toUpperCase())}
                    placeholder="Ej: 1HGBH41JXMN109186"
                    maxLength={17}
                    className="w-full px-4 py-3 rounded-lg text-sm font-mono"
                    style={{ 
                      backgroundColor: 'var(--bg-input)', 
                      border: '1px solid var(--border-color)',
                      color: 'var(--text-primary)',
                    }}
                  />
                </div>
              </div>

              {/* Re-analyze & Debug */}
              <div className="flex items-center justify-between mt-4 pt-4" style={{ borderTop: '1px solid var(--border-color)' }}>
                <button
                  onClick={() => { setAnalysisState('idle'); setTimeout(() => runAnalysis(), 100); }}
                  className="text-xs flex items-center gap-1.5 transition-colors"
                  style={{ color: 'var(--hk-primary)' }}
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  Reintentar análisis
                </button>
                
                {(plateRawText || vinRawText) && (
                  <button
                    onClick={() => setShowRawText(!showRawText)}
                    className="text-xs underline opacity-60 hover:opacity-100"
                    style={{ color: 'var(--text-muted)' }}
                  >
                    {showRawText ? 'Ocultar OCR' : 'Ver texto OCR'}
                  </button>
                )}
              </div>

              {/* Debug Raw Text */}
              {showRawText && (
                <div className="mt-3 space-y-2">
                  {plateRawText && (
                    <div>
                      <p className="text-[10px] font-medium mb-1" style={{ color: 'var(--text-muted)' }}>Texto placa:</p>
                      <pre className="text-[10px] p-2 rounded-lg max-h-24 overflow-y-auto" style={{ backgroundColor: 'var(--bg-input)', color: 'var(--text-muted)' }}>
                        {plateRawText}
                      </pre>
                    </div>
                  )}
                  {vinRawText && (
                    <div>
                      <p className="text-[10px] font-medium mb-1" style={{ color: 'var(--text-muted)' }}>Texto VIN:</p>
                      <pre className="text-[10px] p-2 rounded-lg max-h-24 overflow-y-auto" style={{ backgroundColor: 'var(--bg-input)', color: 'var(--text-muted)' }}>
                        {vinRawText}
                      </pre>
                    </div>
                  )}
                </div>
              )}
            </Card>
          )}
        </div>
      )}

      {/* Hint before all photos */}
      {!allPhotosCaptured && capturedCount > 0 && (
        <Alert variant="info" icon={<Info className="w-4 h-4" />}>
          Al completar las 7 fotos, la IA analizará automáticamente la placa y el VIN del vehículo.
        </Alert>
      )}

      {/* Navigation */}
      <div className="flex gap-3">
        <Button variant="secondary" onClick={prevStep}>Atrás</Button>
        <Button 
          fullWidth 
          onClick={handleContinue}
          disabled={validCapturedCount < 5 || analysisState === 'running' || hasErrors}
        >
          {analysisState === 'running' 
            ? 'Analizando...' 
            : hasErrors
              ? 'Corrige las fotos marcadas'
              : validCapturedCount < 5 
                ? `Faltan ${5 - validCapturedCount} fotos mínimo`
                : 'Continuar'}
        </Button>
      </div>
    </div>
  );
};
