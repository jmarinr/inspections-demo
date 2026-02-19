import React, { useState, useEffect, useRef } from 'react';
import { MapPin, Camera, FileText, Users, Shield, Loader2 } from 'lucide-react';
import { Button, Card, Input, Textarea, Checkbox, Alert, Badge } from '../ui';
import { useInspectionStore } from '../../stores/inspectionStore';
import { v4 as uuidv4 } from 'uuid';
import { compressImage, fileToBase64 } from '../../lib/imageUtils';
import type { VehiclePhoto } from '../../types';

export const SceneStep: React.FC = () => {
  const { inspection, updateAccidentScene, addScenePhoto, nextStep, prevStep } = useInspectionStore();
  
  const [isGettingLocation, setIsGettingLocation] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);
  
  const [sceneData, setSceneData] = useState({
    latitude: inspection.accidentScene?.location.latitude || 0,
    longitude: inspection.accidentScene?.location.longitude || 0,
    address: inspection.accidentScene?.location.address || '',
    description: inspection.accidentScene?.description || '',
    hasWitnesses: inspection.accidentScene?.hasWitnesses || false,
    witnessInfo: inspection.accidentScene?.witnessInfo || '',
    policePresent: inspection.accidentScene?.policePresent || false,
    policeReportNumber: inspection.accidentScene?.policeReportNumber || '',
  });

  const [scenePhotos, setScenePhotos] = useState<string[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  // Get current location on mount
  useEffect(() => {
    if (!sceneData.latitude && !sceneData.longitude) {
      getCurrentLocation();
    }
  }, []);

  const getCurrentLocation = () => {
    if (!navigator.geolocation) {
      setLocationError('Geolocalización no disponible en este dispositivo');
      return;
    }

    setIsGettingLocation(true);
    setLocationError(null);

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        setSceneData((prev) => ({ ...prev, latitude, longitude }));
        
        // Try to get address from coordinates (reverse geocoding)
        try {
          const response = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`
          );
          const data = await response.json();
          if (data.display_name) {
            setSceneData((prev) => ({ ...prev, address: data.display_name }));
          }
        } catch (error) {
          console.error('Error getting address:', error);
        }
        
        setIsGettingLocation(false);
      },
      () => {
        setLocationError('No se pudo obtener la ubicación. Por favor ingresa la dirección manualmente.');
        setIsGettingLocation(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const handleChange = (field: string, value: string | boolean) => {
    setSceneData((prev) => ({ ...prev, [field]: value }));
  };

  const handleAddScenePhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const compressed = await compressImage(file, { maxSizeMB: 0.8 });
      const base64 = await fileToBase64(compressed);
      setScenePhotos((prev) => [...prev, base64]);

      const newPhoto: VehiclePhoto = {
        id: uuidv4(),
        angle: 'scene',
        label: `Escena ${scenePhotos.length + 1}`,
        description: 'Foto de la escena',
        imageUrl: base64,
        timestamp: new Date(),
      };
      addScenePhoto(newPhoto);
    } catch (error) {
      console.error('Error processing photo:', error);
    }

    if (inputRef.current) {
      inputRef.current.value = '';
    }
  };

  const handleContinue = () => {
    updateAccidentScene({
      location: {
        latitude: sceneData.latitude,
        longitude: sceneData.longitude,
        address: sceneData.address,
      },
      description: sceneData.description,
      hasWitnesses: sceneData.hasWitnesses,
      witnessInfo: sceneData.witnessInfo,
      policePresent: sceneData.policePresent,
      policeReportNumber: sceneData.policeReportNumber,
    });
    nextStep();
  };

  return (
    <div className="space-y-6 animate-slide-up">
      {/* Location Card */}
      <Card>
        <h3 className="text-lg font-semibold text-white flex items-center gap-2 mb-6">
          <MapPin className="w-5 h-5 text-primary-400" />
          Ubicación del accidente
        </h3>

        {/* GPS Status */}
        <div className="flex items-center gap-3 mb-4 p-3 bg-dark-900/50 rounded-lg">
          {isGettingLocation ? (
            <>
              <Loader2 className="w-5 h-5 text-primary-400 animate-spin" />
              <span className="text-dark-300">Obteniendo ubicación GPS...</span>
            </>
          ) : sceneData.latitude && sceneData.longitude ? (
            <>
              <div className="p-1.5 bg-emerald-500 rounded-full">
                <MapPin className="w-4 h-4 text-white" />
              </div>
              <div className="flex-1">
                <p className="text-sm text-dark-300">
                  {sceneData.latitude.toFixed(6)}, {sceneData.longitude.toFixed(6)}
                </p>
              </div>
              <Badge variant="success">GPS activo</Badge>
            </>
          ) : (
            <>
              <MapPin className="w-5 h-5 text-dark-400" />
              <span className="text-dark-400">Sin ubicación GPS</span>
              <Button variant="ghost" size="sm" onClick={getCurrentLocation}>
                Reintentar
              </Button>
            </>
          )}
        </div>

        {locationError && (
          <Alert variant="warning" className="mb-4">
            {locationError}
          </Alert>
        )}

        <Input
          label="Dirección / Referencia"
          placeholder="Calle, número, colonia, ciudad..."
          value={sceneData.address}
          onChange={(e) => handleChange('address', e.target.value)}
          hint="Puedes corregir o agregar detalles a la dirección detectada"
        />
      </Card>

      {/* Scene Photos */}
      <Card>
        <h3 className="text-lg font-semibold text-white flex items-center gap-2 mb-4">
          <Camera className="w-5 h-5 text-primary-400" />
          Fotos del lugar
        </h3>
        <p className="text-sm text-dark-400 mb-4">
          Toma fotos panorámicas del lugar del accidente, señales de tránsito, 
          marcas en el pavimento, y cualquier elemento relevante.
        </p>

        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          capture="environment"
          onChange={handleAddScenePhoto}
          className="hidden"
        />

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {scenePhotos.map((photo, index) => (
            <div key={index} className="relative rounded-xl overflow-hidden aspect-square">
              <img src={photo} alt={`Escena ${index + 1}`} className="w-full h-full object-cover" />
              <Badge variant="neutral" size="sm" className="absolute top-2 left-2">
                Escena {index + 1}
              </Badge>
            </div>
          ))}
          <button
            onClick={() => inputRef.current?.click()}
            className="bg-dark-800 border-2 border-dashed border-dark-500 rounded-xl aspect-square flex flex-col items-center justify-center gap-2 hover:border-primary-500 transition-all"
          >
            <Camera className="w-8 h-8 text-dark-400" />
            <span className="text-sm text-dark-400">Agregar foto</span>
          </button>
        </div>
      </Card>

      {/* Description */}
      <Card>
        <h3 className="text-lg font-semibold text-white flex items-center gap-2 mb-4">
          <FileText className="w-5 h-5 text-primary-400" />
          Descripción del accidente
        </h3>
        
        <Textarea
          label="¿Cómo ocurrieron los hechos?"
          placeholder="Describe cómo sucedió el accidente: dirección en la que circulabas, maniobras realizadas, condiciones del clima, etc."
          value={sceneData.description}
          onChange={(e) => handleChange('description', e.target.value)}
          rows={5}
        />
      </Card>

      {/* Witnesses & Police */}
      <Card>
        <h3 className="text-lg font-semibold text-white flex items-center gap-2 mb-6">
          <Users className="w-5 h-5 text-primary-400" />
          Testigos y autoridades
        </h3>

        <div className="space-y-4">
          <Checkbox
            checked={sceneData.hasWitnesses}
            onChange={(e) => handleChange('hasWitnesses', e.target.checked)}
            label="Hubo testigos presentes"
          />

          {sceneData.hasWitnesses && (
            <Textarea
              label="Información de testigos"
              placeholder="Nombres, teléfonos o cualquier dato de contacto de los testigos"
              value={sceneData.witnessInfo}
              onChange={(e) => handleChange('witnessInfo', e.target.value)}
              rows={3}
              className="animate-fade-in"
            />
          )}

          <Checkbox
            checked={sceneData.policePresent}
            onChange={(e) => handleChange('policePresent', e.target.checked)}
            label={
              <span className="flex items-center gap-2">
                <Shield className="w-4 h-4 text-blue-400" />
                Acudió la policía / tránsito
              </span>
            }
          />

          {sceneData.policePresent && (
            <Input
              label="Número de parte / reporte policial"
              placeholder="Ej: PARTE-2024-001234"
              value={sceneData.policeReportNumber}
              onChange={(e) => handleChange('policeReportNumber', e.target.value)}
              className="animate-fade-in"
            />
          )}
        </div>
      </Card>

      {/* Navigation */}
      <div className="flex gap-4">
        <Button variant="secondary" onClick={prevStep}>
          Atrás
        </Button>
        <Button
          fullWidth
          onClick={handleContinue}
          disabled={!sceneData.description}
        >
          Revisar y enviar
        </Button>
      </div>
    </div>
  );
};
