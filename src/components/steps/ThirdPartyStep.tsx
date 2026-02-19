import React, { useState } from 'react';
import { Users, Car, Camera, CreditCard, AlertCircle } from 'lucide-react';
import { Button, Card, Input, Select, Alert, ImageUploader, Badge } from '../ui';
import { useInspectionStore } from '../../stores/inspectionStore';
import { VEHICLE_BRANDS, VEHICLE_COLORS, VEHICLE_YEARS } from '../../lib/constants';

export const ThirdPartyStep: React.FC = () => {
  const { 
    inspection, 
    setHasThirdParty, 
    updateThirdPartyPerson, 
    updateThirdPartyVehicle, 
    nextStep, 
    prevStep 
  } = useInspectionStore();

  const [hasThirdParty, setLocalHasThirdParty] = useState(inspection.hasThirdParty);
  
  const [personData, setPersonData] = useState({
    name: '',
    idNumber: '',
    phone: '',
    email: '',
    driverLicense: '',
  });

  const [vehicleData, setVehicleData] = useState({
    plate: inspection.thirdPartyVehicle?.plate || '',
    brand: inspection.thirdPartyVehicle?.brand || '',
    model: inspection.thirdPartyVehicle?.model || '',
    year: inspection.thirdPartyVehicle?.year || new Date().getFullYear(),
    color: inspection.thirdPartyVehicle?.color || '',
  });

  const [idImage, setIdImage] = useState<string | null>(null);
  const [plateImage, setPlateImage] = useState<string | null>(null);
  const [damageImages, setDamageImages] = useState<string[]>([]);

  const handleThirdPartyToggle = (value: boolean) => {
    setLocalHasThirdParty(value);
    setHasThirdParty(value);
  };

  const handlePersonChange = (field: string, value: string) => {
    setPersonData((prev) => ({ ...prev, [field]: value }));
  };

  const handleVehicleChange = (field: string, value: string | number) => {
    setVehicleData((prev) => ({ ...prev, [field]: value }));
  };

  const handleAddDamageImage = (imageData: string) => {
    setDamageImages((prev) => [...prev, imageData]);
  };

  const handleContinue = () => {
    if (hasThirdParty) {
      updateThirdPartyPerson({
        phone: personData.phone,
        email: personData.email,
        driverLicense: personData.driverLicense,
        identity: {
          frontImage: idImage,
          backImage: null,
          extractedData: {
            fullName: personData.name,
            idNumber: personData.idNumber,
            birthDate: '',
            expiryDate: '',
          },
          confidence: 0,
          validated: false,
        },
      });
      updateThirdPartyVehicle(vehicleData);
    }
    nextStep();
  };

  return (
    <div className="space-y-6 animate-slide-up">
      {/* Third Party Toggle */}
      <Card>
        <div className="flex items-center gap-4">
          <div className="p-3 bg-dark-700 rounded-full">
            <Users className="w-6 h-6 text-primary-400" />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-white">¿Hubo un tercero involucrado?</h3>
            <p className="text-sm text-dark-400">
              Otro vehículo, peatón o propiedad afectada
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => handleThirdPartyToggle(true)}
              className={`px-4 py-2 rounded-lg font-medium transition-all ${
                hasThirdParty
                  ? 'bg-primary-500 text-white'
                  : 'bg-dark-700 text-dark-300 hover:bg-dark-600'
              }`}
            >
              Sí
            </button>
            <button
              onClick={() => handleThirdPartyToggle(false)}
              className={`px-4 py-2 rounded-lg font-medium transition-all ${
                !hasThirdParty
                  ? 'bg-primary-500 text-white'
                  : 'bg-dark-700 text-dark-300 hover:bg-dark-600'
              }`}
            >
              No
            </button>
          </div>
        </div>
      </Card>

      {hasThirdParty && (
        <>
          {/* Third Party Person Info */}
          <Card className="animate-slide-up">
            <h3 className="text-lg font-semibold text-white flex items-center gap-2 mb-6">
              <CreditCard className="w-5 h-5 text-primary-400" />
              Datos del conductor tercero
            </h3>

            <Alert variant="info" icon={<AlertCircle className="w-5 h-5" />} className="mb-6">
              Si el tercero está disponible, solicita su información. 
              Si no es posible, completa lo que puedas observar.
            </Alert>

            <div className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <Input
                  label="Nombre completo"
                  placeholder="Nombre del conductor tercero"
                  value={personData.name}
                  onChange={(e) => handlePersonChange('name', e.target.value)}
                />
                <Input
                  label="Número de identificación"
                  placeholder="INE/Cédula/DUI"
                  value={personData.idNumber}
                  onChange={(e) => handlePersonChange('idNumber', e.target.value)}
                />
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <Input
                  label="Teléfono"
                  type="tel"
                  placeholder="+52 55 1234 5678"
                  value={personData.phone}
                  onChange={(e) => handlePersonChange('phone', e.target.value)}
                />
                <Input
                  label="Licencia de conducir"
                  placeholder="Número de licencia"
                  value={personData.driverLicense}
                  onChange={(e) => handlePersonChange('driverLicense', e.target.value)}
                />
              </div>

              {/* ID Photo (optional) */}
              <div>
                <label className="block text-sm font-medium text-dark-200 mb-2">
                  Foto de identificación (opcional)
                </label>
                <ImageUploader
                  onImageCapture={setIdImage}
                  previewImage={idImage}
                  label="Foto ID del tercero"
                  description="Si está disponible"
                />
              </div>
            </div>
          </Card>

          {/* Third Party Vehicle Info */}
          <Card className="animate-slide-up">
            <h3 className="text-lg font-semibold text-white flex items-center gap-2 mb-6">
              <Car className="w-5 h-5 text-primary-400" />
              Vehículo del tercero
            </h3>

            <div className="space-y-4">
              {/* Plate Photo */}
              <div>
                <label className="block text-sm font-medium text-dark-200 mb-2">
                  Foto de la placa del tercero
                </label>
                <ImageUploader
                  onImageCapture={(data) => {
                    setPlateImage(data);
                    // Here you could add OCR to extract plate number
                  }}
                  previewImage={plateImage}
                  label="Foto de placa"
                  description="Captura la placa del vehículo tercero"
                />
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <Input
                  label="Placa"
                  placeholder="ABC123"
                  value={vehicleData.plate}
                  onChange={(e) => handleVehicleChange('plate', e.target.value.toUpperCase())}
                />
                <Select
                  label="Marca"
                  value={vehicleData.brand}
                  onChange={(e) => handleVehicleChange('brand', e.target.value)}
                  options={VEHICLE_BRANDS.map((b) => ({ value: b, label: b }))}
                  placeholder="Seleccionar"
                />
              </div>

              <div className="grid md:grid-cols-3 gap-4">
                <Input
                  label="Modelo"
                  placeholder="Modelo"
                  value={vehicleData.model}
                  onChange={(e) => handleVehicleChange('model', e.target.value)}
                />
                <Select
                  label="Año"
                  value={vehicleData.year.toString()}
                  onChange={(e) => handleVehicleChange('year', parseInt(e.target.value))}
                  options={VEHICLE_YEARS.map((y) => ({ value: y.toString(), label: y.toString() }))}
                />
                <Select
                  label="Color"
                  value={vehicleData.color}
                  onChange={(e) => handleVehicleChange('color', e.target.value)}
                  options={VEHICLE_COLORS}
                  placeholder="Seleccionar"
                />
              </div>
            </div>
          </Card>

          {/* Third Party Damage Photos */}
          <Card className="animate-slide-up">
            <h3 className="text-lg font-semibold text-white flex items-center gap-2 mb-4">
              <Camera className="w-5 h-5 text-primary-400" />
              Fotos de daños del vehículo tercero
            </h3>
            <p className="text-sm text-dark-400 mb-4">
              Documenta los daños visibles del vehículo del tercero
            </p>

            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {damageImages.map((img, index) => (
                <div key={index} className="relative rounded-xl overflow-hidden aspect-square">
                  <img src={img} alt={`Daño ${index + 1}`} className="w-full h-full object-cover" />
                  <Badge variant="neutral" size="sm" className="absolute top-2 left-2">
                    Daño {index + 1}
                  </Badge>
                </div>
              ))}
              <ImageUploader
                onImageCapture={handleAddDamageImage}
                label="Agregar foto"
                description="de daño del tercero"
                showPreview={false}
                className="aspect-square"
              />
            </div>
          </Card>
        </>
      )}

      {/* No Third Party Message */}
      {!hasThirdParty && (
        <Alert variant="info" icon={<AlertCircle className="w-5 h-5" />}>
          Has indicado que no hubo terceros involucrados en el accidente. 
          Si esto cambia, puedes regresar a este paso.
        </Alert>
      )}

      {/* Navigation */}
      <div className="flex gap-4">
        <Button variant="secondary" onClick={prevStep}>
          Atrás
        </Button>
        <Button fullWidth onClick={handleContinue}>
          Continuar
        </Button>
      </div>
    </div>
  );
};
