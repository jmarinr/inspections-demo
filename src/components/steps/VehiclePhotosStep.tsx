import React, { useState, useRef } from 'react';
import { Camera, Check, Info, X, RotateCcw, Sparkles, Loader2, Car } from 'lucide-react';
import { Button, Card, Alert, Badge, ProgressBar } from '../ui';
import { useInspectionStore } from '../../stores/inspectionStore';
import { useVehicleOCR } from '../../hooks/useVehicleOCR';
import { compressImage, fileToBase64 } from '../../lib/imageUtils';
import type { VehiclePhoto } from '../../types';

interface PhotoCardProps {
  photo: VehiclePhoto;
  onClick: () => void;
  onCapture: (imageData: string) => void;
  onClear: () => void;
  isPlatePhoto?: boolean;
  plateDetected?: string | null;
}

const PhotoCard: React.FC<PhotoCardProps> = ({ 
  photo, onClick, onCapture, onClear, isPlatePhoto, plateDetected 
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
    }
  };

  if (photo.imageUrl) {
    return (
      <div className="relative rounded-lg overflow-hidden border-2 border-emerald-500 aspect-[4/3] group">
        <img src={photo.imageUrl} alt={photo.label} className="w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
        
        {isPlatePhoto && plateDetected && (
          <div className="absolute top-2 left-2">
            <Badge variant="ai">{plateDetected}</Badge>
          </div>
        )}
        
        <div className="absolute top-2 right-2">
          <div className="p-1 bg-emerald-500 rounded-full">
            <Check className="w-3 h-3 text-white" />
          </div>
        </div>
        
        <div className="absolute bottom-2 left-2 right-2">
          <p className="text-white text-xs font-medium">{photo.label}</p>
        </div>

        <div className="absolute inset-0 bg-black/70 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
          <Button variant="secondary" size="sm" onClick={(e) => { e.stopPropagation(); onClear(); }} leftIcon={<RotateCcw className="w-4 h-4" />}>
            Retomar
          </Button>
        </div>
      </div>
    );
  }

  return (
    <>
      <input ref={inputRef} type="file" accept="image/*" capture="environment" onChange={handleFileSelect} className="hidden" />
      <button
        onClick={() => inputRef.current?.click()}
        disabled={isCapturing}
        className="photo-card"
      >
        <div className="relative">
          <div className="p-2 rounded-lg" style={{ backgroundColor: 'var(--hk-primary)' }}>
            <Camera className="w-5 h-5 text-white" />
          </div>
          <button onClick={(e) => { e.stopPropagation(); onClick(); }} className="absolute -top-1 -right-1 p-1 rounded-full" style={{ backgroundColor: 'var(--bg-card)' }}>
            <Info className="w-3 h-3" style={{ color: 'var(--text-muted)' }} />
          </button>
        </div>
        <p className="text-xs font-medium mt-2" style={{ color: 'var(--text-primary)' }}>{photo.label}</p>
        {isPlatePhoto && <Badge variant="ai" className="mt-1"><Sparkles className="w-3 h-3" />OCR</Badge>}
      </button>
    </>
  );
};

export const VehiclePhotosStep: React.FC = () => {
  const { inspection, updateVehiclePhoto, updateInsuredVehicle, nextStep, prevStep } = useInspectionStore();
  const { isProcessing: isOCRProcessing, progress: ocrProgress, extractPlate } = useVehicleOCR();
  const [selectedPhoto, setSelectedPhoto] = useState<VehiclePhoto | null>(null);
  const [detectedPlate, setDetectedPlate] = useState<string | null>(inspection.insuredVehicle?.plate || null);
  const [ocrComplete, setOcrComplete] = useState(false);
  
  const photos = inspection.insuredVehicle?.photos || [];
  const capturedCount = photos.filter((p) => p.imageUrl).length;
  const totalPhotos = photos.length;
  const progress = Math.round((capturedCount / totalPhotos) * 100);

  const handlePhotoCapture = async (photoId: string, imageData: string) => {
    updateVehiclePhoto('insured', photoId, { imageUrl: imageData, timestamp: new Date() });

    const photo = photos.find(p => p.id === photoId);
    if (photo?.angle === 'rear' && !detectedPlate) {
      try {
        const result = await extractPlate(imageData, inspection.country);
        if (result.plate) {
          setDetectedPlate(result.plate);
          setOcrComplete(true);
          updateInsuredVehicle({ plate: result.plate });
        }
      } catch (error) {
        console.error('OCR error:', error);
      }
    }
  };

  const handlePhotoClear = (photoId: string) => {
    updateVehiclePhoto('insured', photoId, { imageUrl: null, timestamp: undefined });
    const photo = photos.find(p => p.id === photoId);
    if (photo?.angle === 'rear') {
      setDetectedPlate(null);
      setOcrComplete(false);
    }
  };

  const exteriorPhotos = photos.filter((p) => ['front', 'front_45_left', 'left', 'rear_45_left', 'rear', 'rear_45_right', 'right', 'front_45_right'].includes(p.angle));
  const interiorPhotos = photos.filter((p) => ['dashboard', 'interior_front', 'interior_rear', 'trunk'].includes(p.angle));

  return (
    <div className="space-y-6 animate-slide-up">
      {/* Header Card */}
      <Card>
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 rounded-lg" style={{ backgroundColor: 'var(--hk-primary)' }}>
            <Car className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="font-semibold" style={{ color: 'var(--text-primary)' }}>Fotografías del vehículo</h3>
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>La IA extraerá la placa automáticamente</p>
          </div>
        </div>
        
        <div className="grid grid-cols-3 gap-3">
          <div className="stat-card">
            <p className="stat-value">{capturedCount}</p>
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Fotos</p>
          </div>
          <div className="stat-card">
            <p className="stat-value">{progress}%</p>
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Progreso</p>
          </div>
          <div className="stat-card">
            <p className={`text-xl font-bold ${detectedPlate ? 'text-emerald-400' : ''}`} style={{ color: detectedPlate ? undefined : 'var(--text-muted)' }}>
              {detectedPlate ? '✓' : '—'}
            </p>
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Placa</p>
          </div>
        </div>
      </Card>

      {/* OCR Processing */}
      {isOCRProcessing && (
        <Card>
          <div className="flex items-center gap-3">
            <Loader2 className="w-6 h-6 animate-spin" style={{ color: 'var(--hk-primary)' }} />
            <div className="flex-1">
              <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>Detectando placa...</p>
              <ProgressBar progress={ocrProgress} />
            </div>
          </div>
        </Card>
      )}

      {/* Plate Detected */}
      {detectedPlate && ocrComplete && !isOCRProcessing && (
        <Alert variant="success" icon={<Sparkles className="w-4 h-4" />}>
          Placa detectada: <span className="font-mono font-bold">{detectedPlate}</span>
        </Alert>
      )}

      {/* Exterior Photos */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>Exterior</h3>
          <Badge variant={exteriorPhotos.filter(p => p.imageUrl).length >= 6 ? 'success' : 'warning'}>
            {exteriorPhotos.filter(p => p.imageUrl).length}/{exteriorPhotos.length}
          </Badge>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {exteriorPhotos.map((photo) => (
            <PhotoCard
              key={photo.id}
              photo={photo}
              onClick={() => setSelectedPhoto(photo)}
              onCapture={(data) => handlePhotoCapture(photo.id, data)}
              onClear={() => handlePhotoClear(photo.id)}
              isPlatePhoto={photo.angle === 'rear'}
              plateDetected={photo.angle === 'rear' ? detectedPlate : null}
            />
          ))}
        </div>
      </div>

      {/* Interior Photos */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>Interior</h3>
          <Badge variant={interiorPhotos.filter(p => p.imageUrl).length >= 2 ? 'success' : 'warning'}>
            {interiorPhotos.filter(p => p.imageUrl).length}/{interiorPhotos.length}
          </Badge>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {interiorPhotos.map((photo) => (
            <PhotoCard
              key={photo.id}
              photo={photo}
              onClick={() => setSelectedPhoto(photo)}
              onCapture={(data) => handlePhotoCapture(photo.id, data)}
              onClear={() => handlePhotoClear(photo.id)}
            />
          ))}
        </div>
      </div>

      {/* Photo Info Modal */}
      {selectedPhoto && (
        <div className="fixed inset-0 flex items-center justify-center z-50 p-4" style={{ backgroundColor: 'rgba(0,0,0,0.8)' }} onClick={() => setSelectedPhoto(null)}>
          <Card className="max-w-md w-full">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold" style={{ color: 'var(--text-primary)' }}>{selectedPhoto.label}</h3>
              <button onClick={() => setSelectedPhoto(null)} className="p-2 rounded-lg" style={{ backgroundColor: 'var(--bg-input)' }}>
                <X className="w-4 h-4" style={{ color: 'var(--text-muted)' }} />
              </button>
            </div>
            <p className="text-sm mb-4" style={{ color: 'var(--text-secondary)' }}>{selectedPhoto.description}</p>
            <div className="p-3 rounded-lg text-xs" style={{ backgroundColor: 'var(--bg-input)', color: 'var(--text-muted)' }}>
              • Buena iluminación • Cámara estable • Incluir toda el área
            </div>
          </Card>
        </div>
      )}

      {/* Navigation */}
      <div className="flex gap-3">
        <Button variant="secondary" onClick={prevStep}>Atrás</Button>
        <Button fullWidth onClick={nextStep} disabled={capturedCount < 8}>
          {capturedCount < 8 ? `Faltan ${8 - capturedCount} fotos` : 'Continuar'}
        </Button>
      </div>
    </div>
  );
};
