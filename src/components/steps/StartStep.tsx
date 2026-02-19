import React, { useState } from 'react';
import { Shield, Clock, Sparkles, MessageCircle, ArrowRight, Car } from 'lucide-react';
import { Button, Input, Select, Card, ThemeToggle } from '../ui';
import { useInspectionStore } from '../../stores/inspectionStore';
import { COUNTRIES, ACCIDENT_TYPES } from '../../lib/constants';
import type { AccidentType } from '../../types';

export const StartStep: React.FC = () => {
  const { initInspection } = useInspectionStore();
  const [plateOrVin, setPlateOrVin] = useState('');
  const [country, setCountry] = useState('PA');
  const [accidentType, setAccidentType] = useState<AccidentType>('collision');
  const [policyNumber, setPolicyNumber] = useState('');

  const handleStart = () => {
    initInspection(country, accidentType);
  };

  const handleWhatsApp = () => {
    const message = encodeURIComponent('Hola, necesito realizar una inspección de accidente');
    window.open(`https://wa.me/50764671392?text=${message}`, '_blank');
  };

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: 'var(--bg-primary)' }}>
      {/* Theme Toggle */}
      <div className="absolute top-4 right-4 z-10">
        <ThemeToggle />
      </div>

      {/* Header */}
      <div className="text-center py-10 px-6">
        {/* Logo */}
        <div className="flex items-center justify-center gap-3 mb-8">
          <div 
            className="p-2.5 rounded-xl"
            style={{ backgroundColor: 'var(--hk-primary)' }}
          >
            <Car className="w-6 h-6 text-white" />
          </div>
          <div className="text-left">
            <h2 className="text-lg font-bold" style={{ color: 'var(--hk-primary)' }}>
              HK Inspect
            </h2>
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>by HenkanCX</p>
          </div>
        </div>

        <h1 className="text-2xl md:text-3xl font-bold mb-3" style={{ color: 'var(--text-primary)' }}>
          Inspección de vehículos
        </h1>
        <p style={{ color: 'var(--text-secondary)' }}>
          Usa tu cámara. La IA completa el resto.
        </p>

        {/* Stats */}
        <div className="flex justify-center gap-3 mt-6">
          <div className="floating-stat">
            <Clock className="w-4 h-4" style={{ color: 'var(--hk-primary)' }} />
            <span style={{ color: 'var(--text-primary)' }}>5-10 min</span>
          </div>
          <div className="floating-stat">
            <Sparkles className="w-4 h-4" style={{ color: 'var(--hk-primary)' }} />
            <span style={{ color: 'var(--text-primary)' }}>IA 98%</span>
          </div>
          <div className="floating-stat">
            <Shield className="w-4 h-4" style={{ color: 'var(--hk-primary)' }} />
            <span style={{ color: 'var(--text-primary)' }}>Seguro</span>
          </div>
        </div>
      </div>

      {/* Form */}
      <div className="flex-1 px-6 pb-8">
        <Card className="max-w-md mx-auto">
          <div className="space-y-5">
            <Input
              label="Número de póliza (opcional)"
              placeholder="Ej: POL-2024-001234"
              value={policyNumber}
              onChange={(e) => setPolicyNumber(e.target.value)}
            />

            <Input
              label="Placa o VIN del vehículo"
              placeholder="Ej: ABC1234"
              value={plateOrVin}
              onChange={(e) => setPlateOrVin(e.target.value.toUpperCase())}
            />

            <Select
              label="País"
              value={country}
              onChange={(e) => setCountry(e.target.value)}
              options={COUNTRIES.map((c) => ({
                value: c.code,
                label: `${c.flag} ${c.name}`,
              }))}
            />

            {/* Accident Type */}
            <div>
              <label className="block text-sm font-medium mb-3" style={{ color: 'var(--text-secondary)' }}>
                Tipo de siniestro
              </label>
              <div className="grid grid-cols-2 gap-2">
                {ACCIDENT_TYPES.map((type) => (
                  <button
                    key={type.value}
                    onClick={() => setAccidentType(type.value)}
                    className="p-3 rounded-lg text-left transition-colors"
                    style={{
                      backgroundColor: accidentType === type.value ? 'rgba(236, 72, 153, 0.1)' : 'var(--bg-input)',
                      border: accidentType === type.value ? '1px solid var(--hk-primary)' : '1px solid var(--border-color)',
                    }}
                  >
                    <span className="text-lg mr-2">{type.icon}</span>
                    <span className="text-sm" style={{ color: 'var(--text-primary)' }}>{type.label}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Buttons */}
          <div className="mt-6 space-y-3">
            <Button
              fullWidth
              onClick={handleStart}
              disabled={!plateOrVin}
              rightIcon={<ArrowRight className="w-5 h-5" />}
            >
              Iniciar inspección
            </Button>

            <Button
              variant="whatsapp"
              fullWidth
              onClick={handleWhatsApp}
              leftIcon={<MessageCircle className="w-5 h-5" />}
            >
              Hacer por WhatsApp
            </Button>
          </div>
        </Card>
      </div>

      {/* Footer */}
      <div className="py-4 px-6 text-center" style={{ borderTop: '1px solid var(--border-color)' }}>
        <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
          © 2024 HenkanCX • Información protegida
        </p>
      </div>
    </div>
  );
};
