import React, { useState } from 'react';
import { Sparkles, Car, Hash, Gauge } from 'lucide-react';
import { Button, Card, Input, Select, Checkbox, Badge, Alert } from '../ui';
import { useInspectionStore } from '../../stores/inspectionStore';
import { VEHICLE_BRANDS, VEHICLE_COLORS, VEHICLE_USAGE, VEHICLE_YEARS } from '../../lib/constants';

export const VehicleDataStep: React.FC = () => {
  const { inspection, updateInsuredVehicle, nextStep, prevStep } = useInspectionStore();
  const vehicle = inspection.insuredVehicle;
  
  const [formData, setFormData] = useState({
    vin: vehicle?.vin || '',
    plate: vehicle?.plate || '',
    brand: vehicle?.brand || '',
    model: vehicle?.model || '',
    year: vehicle?.year || new Date().getFullYear(),
    version: vehicle?.version || '',
    color: vehicle?.color || '',
    usage: vehicle?.usage || 'private',
    mileage: vehicle?.mileage || 0,
    hasGarage: vehicle?.hasGarage || false,
  });

  const [aiConfidence] = useState({
    identification: 94,
    specifications: 91,
  });

  const handleChange = (field: string, value: string | number | boolean) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleContinue = () => {
    updateInsuredVehicle(formData);
    nextStep();
  };

  const isFormValid = formData.plate && formData.brand && formData.model && formData.color;

  return (
    <div className="space-y-6 animate-slide-up">
      {/* AI Notice */}
      <Alert variant="info" icon={<Sparkles className="w-5 h-5" />}>
        Los siguientes campos han sido prellenados automáticamente por IA. 
        Por favor verifica que la información sea correcta.
      </Alert>

      {/* Identification Section */}
      <Card>
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-white flex items-center gap-2">
            <Hash className="w-5 h-5 text-primary-400" />
            Identificación
          </h3>
          <Badge variant="info">
            <Sparkles className="w-3 h-3" />
            IA: {aiConfidence.identification}%
          </Badge>
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          <Input
            label="VIN"
            placeholder="1HGBH41JXMN109186"
            value={formData.vin}
            onChange={(e) => handleChange('vin', e.target.value.toUpperCase())}
            hasCamera
            onCameraClick={() => alert('Captura de VIN por cámara')}
            hint="17 caracteres alfanuméricos"
          />
          <Input
            label="Placa"
            placeholder="ABC123"
            value={formData.plate}
            onChange={(e) => handleChange('plate', e.target.value.toUpperCase())}
            hasCamera
            onCameraClick={() => alert('Captura de placa por cámara')}
          />
        </div>
      </Card>

      {/* Specifications Section */}
      <Card>
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-white flex items-center gap-2">
            <Car className="w-5 h-5 text-primary-400" />
            Especificaciones
          </h3>
          <Badge variant="info">
            <Sparkles className="w-3 h-3" />
            IA: {aiConfidence.specifications}%
          </Badge>
        </div>

        <div className="grid md:grid-cols-3 gap-4 mb-4">
          <Select
            label="Marca"
            value={formData.brand}
            onChange={(e) => handleChange('brand', e.target.value)}
            options={VEHICLE_BRANDS.map((brand) => ({ value: brand, label: brand }))}
            placeholder="Seleccionar marca"
          />
          <Input
            label="Modelo"
            placeholder="Accord"
            value={formData.model}
            onChange={(e) => handleChange('model', e.target.value)}
          />
          <Select
            label="Año"
            value={formData.year.toString()}
            onChange={(e) => handleChange('year', parseInt(e.target.value))}
            options={VEHICLE_YEARS.map((year) => ({ value: year.toString(), label: year.toString() }))}
          />
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          <Input
            label="Versión"
            placeholder="EX-L"
            value={formData.version}
            onChange={(e) => handleChange('version', e.target.value)}
          />
          <Select
            label="Color"
            value={formData.color}
            onChange={(e) => handleChange('color', e.target.value)}
            options={VEHICLE_COLORS}
            placeholder="Seleccionar color"
          />
        </div>
      </Card>

      {/* Usage Section */}
      <Card>
        <h3 className="text-lg font-semibold text-white flex items-center gap-2 mb-6">
          <Gauge className="w-5 h-5 text-primary-400" />
          Uso del vehículo
        </h3>

        <div className="grid md:grid-cols-2 gap-4 mb-4">
          <Select
            label="Tipo de uso"
            value={formData.usage}
            onChange={(e) => handleChange('usage', e.target.value)}
            options={VEHICLE_USAGE}
          />
          <Input
            label="Kilometraje actual"
            type="number"
            placeholder="15250"
            value={formData.mileage || ''}
            onChange={(e) => handleChange('mileage', parseInt(e.target.value) || 0)}
            hasCamera
            onCameraClick={() => alert('Captura de odómetro por cámara')}
            hint="Puedes tomar foto del odómetro"
          />
        </div>

        <Checkbox
          checked={formData.hasGarage}
          onChange={(e) => handleChange('hasGarage', e.target.checked)}
          label="El vehículo se guarda en garaje/cochera"
        />
      </Card>

      {/* Navigation */}
      <div className="flex gap-4">
        <Button variant="secondary" onClick={prevStep}>
          Atrás
        </Button>
        <Button
          fullWidth
          onClick={handleContinue}
          disabled={!isFormValid}
        >
          Continuar a captura de fotos
        </Button>
      </div>
    </div>
  );
};
