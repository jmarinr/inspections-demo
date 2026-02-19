import React, { useState, useRef } from 'react';
import SignatureCanvas from 'react-signature-canvas';
import { FileText, Shield, Share2, BarChart3, Trash2 } from 'lucide-react';
import { Button, Card, Checkbox, Alert } from '../ui';
import { useInspectionStore } from '../../stores/inspectionStore';

export const ConsentStep: React.FC = () => {
  const { updateConsent, nextStep, prevStep } = useInspectionStore();
  const [accepted, setAccepted] = useState(false);
  const [hasSignature, setHasSignature] = useState(false);
  const signatureRef = useRef<SignatureCanvas>(null);

  const handleClear = () => {
    signatureRef.current?.clear();
    setHasSignature(false);
  };

  const handleSignatureEnd = () => {
    if (signatureRef.current && !signatureRef.current.isEmpty()) {
      setHasSignature(true);
    }
  };

  const handleContinue = () => {
    if (accepted && hasSignature && signatureRef.current) {
      const signatureData = signatureRef.current.toDataURL('image/png');
      updateConsent({
        accepted: true,
        signatureUrl: signatureData,
        timestamp: new Date(),
      });
      nextStep();
    }
  };

  const termsContent = [
    {
      icon: <BarChart3 className="w-5 h-5 text-blue-400" />,
      text: 'Procesar las fotografías de tu vehículo mediante inteligencia artificial',
    },
    {
      icon: <Shield className="w-5 h-5 text-emerald-400" />,
      text: 'Almacenar temporalmente la información de tu inspección',
    },
    {
      icon: <Share2 className="w-5 h-5 text-amber-400" />,
      text: 'Compartir el reporte con tu aseguradora o institución financiera',
    },
    {
      icon: <FileText className="w-5 h-5 text-purple-400" />,
      text: 'Utilizar los datos de forma anónima para mejorar el servicio',
    },
  ];

  return (
    <div className="space-y-6 animate-slide-up">
      <Card>
        <h2 className="text-xl font-bold text-white mb-2">Consentimiento</h2>
        <p className="text-dark-400 mb-6">
          Lee y acepta los términos para continuar
        </p>

        {/* Terms Box */}
        <div className="bg-dark-900/50 rounded-xl p-4 mb-6 max-h-64 overflow-y-auto">
          <h3 className="font-semibold text-white mb-4">
            Términos de uso del servicio de auto-inspección
          </h3>
          
          <p className="text-dark-300 mb-4">
            Al utilizar este servicio, autorizas a HenkanCX a:
          </p>

          <ul className="space-y-4">
            {termsContent.map((term, index) => (
              <li key={index} className="flex items-start gap-3">
                {term.icon}
                <span className="text-dark-300">{term.text}</span>
              </li>
            ))}
          </ul>

          <div className="mt-6 pt-4 border-t border-dark-700">
            <p className="text-sm text-dark-400">
              Tus datos personales están protegidos de acuerdo con nuestra política 
              de privacidad y las leyes de protección de datos aplicables en tu país.
              La información será eliminada automáticamente después de 90 días de 
              procesada la inspección.
            </p>
          </div>

          <div className="mt-4">
            <h4 className="font-medium text-white mb-2">Declaración de veracidad</h4>
            <p className="text-sm text-dark-400">
              Declaro bajo protesta de decir verdad que la información y fotografías 
              que proporcionaré son verídicas y corresponden al estado actual del 
              vehículo y las circunstancias del accidente. Entiendo que proporcionar 
              información falsa puede tener consecuencias legales.
            </p>
          </div>
        </div>

        {/* Checkbox */}
        <Checkbox
          checked={accepted}
          onChange={(e) => setAccepted(e.target.checked)}
          label={
            <span>
              He leído y acepto los términos de uso, política de privacidad y autorizo 
              el procesamiento de mis datos personales y fotografías del vehículo.
            </span>
          }
        />
      </Card>

      {/* Signature */}
      {accepted && (
        <Card className="animate-fade-in">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-white">Firma digital</h3>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClear}
              leftIcon={<Trash2 className="w-4 h-4" />}
            >
              Limpiar
            </Button>
          </div>
          
          <p className="text-sm text-dark-400 mb-4">
            Firma en el recuadro para confirmar tu consentimiento
          </p>

          <div className="border-2 border-dashed border-dark-500 rounded-xl overflow-hidden bg-white">
            <SignatureCanvas
              ref={signatureRef}
              onEnd={handleSignatureEnd}
              canvasProps={{
                className: 'signature-pad w-full',
                style: { width: '100%', height: '200px' },
              }}
              backgroundColor="white"
              penColor="black"
            />
          </div>

          {!hasSignature && (
            <p className="text-sm text-dark-400 mt-2 text-center">
              Dibuja tu firma arriba
            </p>
          )}
        </Card>
      )}

      {/* Info Alert */}
      <Alert variant="info" icon={<Shield className="w-5 h-5" />}>
        Tu información está protegida con encriptación de extremo a extremo.
        Solo tú y tu aseguradora tendrán acceso al reporte.
      </Alert>

      {/* Navigation */}
      <div className="flex gap-4">
        <Button variant="secondary" onClick={prevStep}>
          Atrás
        </Button>
        <Button
          fullWidth
          onClick={handleContinue}
          disabled={!accepted || !hasSignature}
        >
          Comenzar inspección
        </Button>
      </div>
    </div>
  );
};
