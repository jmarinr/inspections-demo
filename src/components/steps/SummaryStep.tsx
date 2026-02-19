import React, { useState, useRef } from 'react';
import SignatureCanvas from 'react-signature-canvas';
import { 
  Check, Send, Download, Share2, User, Car, Camera, MapPin, 
  FileText, AlertTriangle, Loader2, CheckCircle2, Shield, 
  Trash2, ChevronDown, ChevronUp
} from 'lucide-react';
import { Button, Card, Badge, Alert, Divider, Checkbox } from '../ui';
import { useInspectionStore } from '../../stores/inspectionStore';
import { submitInspectionToSupabase } from '../../lib/inspectionService';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

export const SummaryStep: React.FC = () => {
  const { inspection, updateInspection, updateConsent, prevStep, setStep, resetInspection } = useInspectionStore();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [submissionId, setSubmissionId] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  
  const [accepted, setAccepted] = useState(false);
  const [hasSignature, setHasSignature] = useState(false);
  const [showTerms, setShowTerms] = useState(false);
  const signatureRef = useRef<SignatureCanvas>(null);

  const vehiclePhotos = inspection.insuredVehicle?.photos.filter(p => p.imageUrl).length || 0;
  const damagePhotos = inspection.insuredVehicle?.photos.filter(p => p.angle === 'damage' && p.imageUrl).length || 0;
  const scenePhotos = inspection.accidentScene?.photos.length || 0;
  const totalPhotos = vehiclePhotos + scenePhotos;

  const handleClearSignature = () => {
    signatureRef.current?.clear();
    setHasSignature(false);
  };

  const handleSignatureEnd = () => {
    if (signatureRef.current && !signatureRef.current.isEmpty()) {
      setHasSignature(true);
    }
  };

  const handleSubmit = async () => {
    if (!accepted || !hasSignature || !signatureRef.current) return;
    
    setIsSubmitting(true);
    setSubmitError(null);
    
    try {
      // Guardar firma en el estado
      const signatureData = signatureRef.current.toDataURL('image/png');
      updateConsent({
        accepted: true,
        signatureUrl: signatureData,
        timestamp: new Date(),
      });

      // Actualizar inspección con el consentimiento
      const updatedInspection = {
        ...inspection,
        consent: {
          accepted: true,
          signatureUrl: signatureData,
          timestamp: new Date(),
        }
      };

      // Enviar a Supabase
      const id = await submitInspectionToSupabase(updatedInspection);
      setSubmissionId(id);
      
      updateInspection({
        status: 'submitted',
        submittedAt: new Date(),
      });
      
      setIsSubmitted(true);
    } catch (error) {
      console.error('Error submitting:', error);
      setSubmitError('Error al enviar. Por favor intenta de nuevo.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDownloadPDF = () => alert('Generando PDF...');
  
  const handleShare = () => {
    if (navigator.share) {
      navigator.share({ title: 'Inspección', text: `ID: ${submissionId}`, url: window.location.href });
    } else {
      navigator.clipboard.writeText(`Inspección ID: ${submissionId}`);
      alert('Copiado');
    }
  };

  // Success Screen
  if (isSubmitted) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center text-center animate-fade-in">
        <div className="p-4 bg-emerald-500/20 rounded-full mb-6">
          <CheckCircle2 className="w-12 h-12 text-emerald-400" />
        </div>
        
        <h2 className="text-xl font-bold mb-2" style={{ color: 'var(--text-primary)' }}>¡Inspección enviada!</h2>
        <p className="text-sm mb-6" style={{ color: 'var(--text-secondary)' }}>Recibida correctamente</p>

        <Card className="w-full max-w-sm mb-6">
          <p className="text-xs mb-1" style={{ color: 'var(--text-muted)' }}>Referencia</p>
          <p className="text-xl font-mono font-bold" style={{ color: 'var(--hk-primary)' }}>{submissionId}</p>
          <Divider className="my-4" />
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
            Guarda este número para seguimiento.
          </p>
        </Card>

        <div className="flex gap-3 w-full max-w-sm">
          <Button variant="secondary" fullWidth onClick={handleDownloadPDF} leftIcon={<Download className="w-4 h-4" />}>
            PDF
          </Button>
          <Button variant="secondary" fullWidth onClick={handleShare} leftIcon={<Share2 className="w-4 h-4" />}>
            Compartir
          </Button>
        </div>

        <button onClick={() => resetInspection()} className="mt-6 text-sm" style={{ color: 'var(--text-muted)' }}>
          Nueva inspección
        </button>
      </div>
    );
  }

  // Submitting
  if (isSubmitting) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center text-center">
        <Loader2 className="w-12 h-12 animate-spin mb-4" style={{ color: 'var(--hk-primary)' }} />
        <p className="font-medium" style={{ color: 'var(--text-primary)' }}>Enviando a HenkanCX...</p>
        <p className="text-sm mt-2" style={{ color: 'var(--text-muted)' }}>Guardando fotos y datos</p>
      </div>
    );
  }

  // Summary
  return (
    <div className="space-y-5 animate-slide-up">
      {submitError && (
        <Alert variant="warning" icon={<AlertTriangle className="w-4 h-4" />}>
          {submitError}
        </Alert>
      )}

      <Alert variant="info" icon={<FileText className="w-4 h-4" />}>
        Revisa, acepta los términos y firma para enviar.
      </Alert>

      {/* Stats */}
      <Card>
        <h3 className="text-sm font-semibold mb-3" style={{ color: 'var(--text-primary)' }}>Resumen</h3>
        <div className="grid grid-cols-3 gap-3">
          <div className="stat-card">
            <p className="stat-value">{totalPhotos}</p>
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Fotos</p>
          </div>
          <div className="stat-card">
            <p className="stat-value">{damagePhotos}</p>
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Daños</p>
          </div>
          <div className="stat-card">
            <p className="stat-value">{inspection.hasThirdParty ? '1' : '0'}</p>
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Terceros</p>
          </div>
        </div>
      </Card>

      {/* Sections */}
      <Card className="cursor-pointer" onClick={() => setStep(1)}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <User className="w-5 h-5" style={{ color: 'var(--hk-primary)' }} />
            <div>
              <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>Conductor</p>
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                {inspection.insuredPerson?.identity.extractedData?.fullName || 'Sin nombre'}
              </p>
            </div>
          </div>
          <Badge variant={inspection.insuredPerson?.identity.validated ? 'success' : 'warning'}>
            {inspection.insuredPerson?.identity.validated ? 'OK' : 'Revisar'}
          </Badge>
        </div>
      </Card>

      <Card className="cursor-pointer" onClick={() => setStep(3)}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Car className="w-5 h-5" style={{ color: 'var(--hk-primary)' }} />
            <div>
              <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>Vehículo</p>
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                {inspection.insuredVehicle?.brand} {inspection.insuredVehicle?.model} • {inspection.insuredVehicle?.plate}
              </p>
            </div>
          </div>
          <Badge variant="success"><Check className="w-3 h-3" /></Badge>
        </div>
      </Card>

      <Card className="cursor-pointer" onClick={() => setStep(2)}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Camera className="w-5 h-5" style={{ color: 'var(--hk-primary)' }} />
            <div>
              <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>Fotos</p>
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{vehiclePhotos} vehículo • {damagePhotos} daños</p>
            </div>
          </div>
          <Badge variant={vehiclePhotos >= 8 ? 'success' : 'warning'}>
            {vehiclePhotos >= 8 ? <Check className="w-3 h-3" /> : 'Revisar'}
          </Badge>
        </div>
      </Card>

      {inspection.hasThirdParty && (
        <Card className="cursor-pointer" onClick={() => setStep(5)}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-400" />
              <div>
                <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>Tercero</p>
                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                  {inspection.thirdPartyVehicle?.plate} • {inspection.thirdPartyVehicle?.brand}
                </p>
              </div>
            </div>
            <Badge variant="info">Registrado</Badge>
          </div>
        </Card>
      )}

      <Card className="cursor-pointer" onClick={() => setStep(6)}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <MapPin className="w-5 h-5" style={{ color: 'var(--hk-primary)' }} />
            <div>
              <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>Escena</p>
              <p className="text-xs truncate max-w-[180px]" style={{ color: 'var(--text-muted)' }}>
                {inspection.accidentScene?.location.address || 'Sin dirección'}
              </p>
            </div>
          </div>
          <Badge variant="success"><Check className="w-3 h-3" /></Badge>
        </div>
      </Card>

      {/* Consent */}
      <Card>
        <div className="flex items-center justify-between cursor-pointer" onClick={() => setShowTerms(!showTerms)}>
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4" style={{ color: 'var(--hk-primary)' }} />
            <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>Términos</span>
          </div>
          {showTerms ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </div>

        {showTerms && (
          <div className="mt-4 p-3 rounded-lg text-xs" style={{ backgroundColor: 'var(--bg-input)', color: 'var(--text-secondary)' }}>
            Al enviar, autorizas a HenkanCX a procesar las fotografías con IA, almacenar la información temporalmente y compartir el reporte con tu aseguradora. Datos eliminados en 90 días.
          </div>
        )}

        <div className="mt-4">
          <Checkbox
            checked={accepted}
            onChange={(e) => setAccepted(e.target.checked)}
            label={<span className="text-sm" style={{ color: 'var(--text-secondary)' }}>Acepto los términos y condiciones</span>}
          />
        </div>
      </Card>

      {/* Signature */}
      {accepted && (
        <Card className="animate-fade-in">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>Firma</span>
            <Button variant="secondary" size="sm" onClick={handleClearSignature} leftIcon={<Trash2 className="w-3 h-3" />}>
              Limpiar
            </Button>
          </div>
          
          <div className="rounded-lg overflow-hidden bg-white" style={{ border: '1px solid var(--border-color)' }}>
            <SignatureCanvas
              ref={signatureRef}
              onEnd={handleSignatureEnd}
              canvasProps={{ className: 'w-full', style: { width: '100%', height: '120px' } }}
              backgroundColor="white"
              penColor="black"
            />
          </div>

          {!hasSignature && (
            <p className="text-xs text-center mt-2" style={{ color: 'var(--text-muted)' }}>Dibuja tu firma</p>
          )}
        </Card>
      )}

      {/* Timestamp */}
      <p className="text-center text-xs" style={{ color: 'var(--text-muted)' }}>
        {format(inspection.createdAt, "d MMM yyyy, HH:mm", { locale: es })}
      </p>

      {/* Actions */}
      <div className="space-y-3">
        <Button fullWidth onClick={handleSubmit} disabled={!accepted || !hasSignature} leftIcon={<Send className="w-4 h-4" />}>
          {!accepted ? 'Acepta los términos' : !hasSignature ? 'Firma para enviar' : 'Enviar inspección'}
        </Button>
        <Button variant="secondary" fullWidth onClick={prevStep}>Editar</Button>
      </div>
    </div>
  );
};
