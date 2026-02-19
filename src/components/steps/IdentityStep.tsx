import React, { useState } from 'react';
import { Check, AlertCircle, User, CreditCard, Calendar, Loader2, Sparkles, Edit3, Hash } from 'lucide-react';
import { Button, Card, ProgressBar, ImageUploader, Alert } from '../ui';
import { useInspectionStore } from '../../stores/inspectionStore';
import { useOCR } from '../../hooks/useOCR';
import { COUNTRIES } from '../../lib/constants';

export const IdentityStep: React.FC = () => {
  const { inspection, updateInsuredIdentity, nextStep, prevStep } = useInspectionStore();
  const { isProcessing, progress, error: ocrError, extractIdData } = useOCR();
  
  const [frontImage, setFrontImage] = useState<string | null>(
    inspection.insuredPerson?.identity.frontImage || null
  );
  const [backImage, setBackImage] = useState<string | null>(
    inspection.insuredPerson?.identity.backImage || null
  );
  const [isExtracting, setIsExtracting] = useState(false);
  const [extractionAttempted, setExtractionAttempted] = useState(
    !!(inspection.insuredPerson?.identity.extractedData)
  );
  const [extractionSuccess, setExtractionSuccess] = useState(
    !!(inspection.insuredPerson?.identity.extractedData?.fullName || 
       inspection.insuredPerson?.identity.extractedData?.idNumber)
  );
  const [ocrRawText, setOcrRawText] = useState<string | null>(null);
  const [showRawText, setShowRawText] = useState(false);
  
  // Editable fields - always visible after images are uploaded
  const [fullName, setFullName] = useState(
    inspection.insuredPerson?.identity.extractedData?.fullName || ''
  );
  const [idNumber, setIdNumber] = useState(
    inspection.insuredPerson?.identity.extractedData?.idNumber || ''
  );
  const [birthDate, setBirthDate] = useState(
    inspection.insuredPerson?.identity.extractedData?.birthDate || ''
  );
  const [expiryDate, setExpiryDate] = useState(
    inspection.insuredPerson?.identity.extractedData?.expiryDate || ''
  );

  const country = COUNTRIES.find((c) => c.code === inspection.country);
  const identityData = inspection.insuredPerson?.identity;

  const handleFrontImage = (imageData: string) => {
    setFrontImage(imageData);
    setExtractionAttempted(false);
    setExtractionSuccess(false);
  };

  const handleBackImage = (imageData: string) => {
    setBackImage(imageData);
    setExtractionAttempted(false);
    setExtractionSuccess(false);
  };

  // OCR extraction
  const handleExtractData = async () => {
    if (!frontImage) return;
    
    setIsExtracting(true);
    setOcrRawText(null);
    
    try {
      console.log('[IdentityStep] Starting OCR extraction...');
      const result = await extractIdData(frontImage, backImage || undefined, inspection.country);
      console.log('[IdentityStep] OCR Result:', result);
      
      setOcrRawText(result.rawText || null);
      
      // Update fields with extracted data (only if we got something)
      if (result.data) {
        if (result.data.fullName) setFullName(result.data.fullName);
        if (result.data.idNumber) setIdNumber(result.data.idNumber);
        if (result.data.birthDate) setBirthDate(result.data.birthDate);
        if (result.data.expiryDate) setExpiryDate(result.data.expiryDate);
        setExtractionSuccess(true);
      }
      
      setExtractionAttempted(true);
      
      // Save to store
      updateInsuredIdentity({
        frontImage,
        backImage,
        extractedData: result.data,
        confidence: result.confidence,
        validated: result.confidence >= 0.7,
      });
      
    } catch (err) {
      console.error('[IdentityStep] Error extracting data:', err);
      setExtractionAttempted(true);
      setExtractionSuccess(false);
    } finally {
      setIsExtracting(false);
    }
  };

  const handleContinue = () => {
    // Save images and manually entered/corrected data
    updateInsuredIdentity({
      frontImage,
      backImage,
      extractedData: {
        fullName,
        idNumber,
        birthDate,
        expiryDate,
        nationality: country?.name || '',
      },
      confidence: identityData?.confidence || 0.5,
      validated: !!(fullName && idNumber),
    });
    nextStep();
  };

  const canContinue = frontImage && (fullName || idNumber);
  const bothImagesLoaded = !!(frontImage && backImage);
  const showExtractButton = (frontImage || backImage) && !isExtracting && !isProcessing;

  return (
    <div className="space-y-6 animate-slide-up">
      {/* Instructions */}
      <Alert variant="info" icon={<CreditCard className="w-5 h-5" />}>
        Sube una foto de tu <strong>{country?.idDocumentName || 'documento de identidad'}</strong> (frente y reverso).
        La IA intentará extraer los datos. Si no lo logra, puedes ingresarlos manualmente.
      </Alert>

      {/* Upload Cards */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Front ID */}
        <Card>
          <h3 className="font-semibold text-white mb-4 flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-primary-400" />
            Frente del documento
          </h3>
          <ImageUploader
            onImageCapture={handleFrontImage}
            previewImage={frontImage}
            label="Foto frontal"
            description={`${country?.idDocumentName || 'Documento'} - lado del frente`}
            disabled={isProcessing || isExtracting}
          />
        </Card>

        {/* Back ID */}
        <Card>
          <h3 className="font-semibold text-white mb-4 flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-primary-400" />
            Reverso del documento
          </h3>
          <ImageUploader
            onImageCapture={handleBackImage}
            previewImage={backImage}
            label="Foto reverso"
            description={`${country?.idDocumentName || 'Documento'} - lado de atrás`}
            disabled={isProcessing || isExtracting}
          />
        </Card>
      </div>

      {/* Processing State */}
      {(isProcessing || isExtracting) && (
        <Card className="text-center">
          <Loader2 className="w-12 h-12 text-primary-500 animate-spin mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-white mb-2">
            Procesando documento...
          </h3>
          <p className="text-dark-400 mb-4">
            Extrayendo información con IA (puede tardar 15-30 segundos)
          </p>
          <ProgressBar progress={progress} showLabel color="primary" />
        </Card>
      )}

      {/* Extract Button */}
      {showExtractButton && !extractionSuccess && (
        <Card className="text-center animate-fade-in">
          <Sparkles className="w-10 h-10 text-primary-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-white mb-2">
            {bothImagesLoaded ? '¡Fotos cargadas!' : 'Foto cargada'}
          </h3>
          <p className="text-dark-400 mb-4">
            {bothImagesLoaded 
              ? 'Haz clic para extraer los datos automáticamente con IA'
              : 'Puedes subir la otra foto o extraer datos de la que ya tienes'}
          </p>
          <Button
            onClick={handleExtractData}
            leftIcon={<Sparkles className="w-5 h-5" />}
          >
            Extraer datos con IA
          </Button>
        </Card>
      )}

      {/* OCR Success/Failure Feedback */}
      {extractionAttempted && !isExtracting && (
        <>
          {extractionSuccess ? (
            <Alert variant="success" icon={<Check className="w-5 h-5" />}>
              Se extrajeron datos del documento. Verifica que sean correctos y corrige si es necesario.
            </Alert>
          ) : (
            <Alert variant="warning" icon={<AlertCircle className="w-5 h-5" />}>
              No se pudieron extraer datos automáticamente. Por favor ingresa los datos manualmente en los campos de abajo.
              {ocrRawText && (
                <button
                  onClick={() => setShowRawText(!showRawText)}
                  className="block mt-2 text-xs underline opacity-70 hover:opacity-100"
                >
                  {showRawText ? 'Ocultar texto detectado' : 'Ver texto detectado por OCR'}
                </button>
              )}
            </Alert>
          )}

          {/* Debug: Raw OCR text */}
          {showRawText && ocrRawText && (
            <Card>
              <h4 className="text-sm font-medium text-dark-300 mb-2">Texto detectado por OCR:</h4>
              <pre className="text-xs text-dark-400 whitespace-pre-wrap bg-dark-800 p-3 rounded-lg max-h-40 overflow-y-auto">
                {ocrRawText}
              </pre>
            </Card>
          )}
        </>
      )}

      {/* OCR Error */}
      {ocrError && (
        <Alert variant="error" icon={<AlertCircle className="w-5 h-5" />}>
          Error al procesar: {ocrError}
        </Alert>
      )}

      {/* Editable Fields - ALWAYS visible when at least one image is loaded */}
      {(frontImage || backImage) && !isExtracting && !isProcessing && (
        <Card className="animate-fade-in">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 rounded-full bg-primary-500/20">
              <Edit3 className="w-5 h-5 text-primary-400" />
            </div>
            <div>
              <h3 className="font-semibold text-white">
                Datos del documento
              </h3>
              <p className="text-sm text-dark-400">
                {extractionSuccess 
                  ? 'Verifica y corrige los datos extraídos'
                  : 'Ingresa los datos de tu documento de identidad'}
              </p>
            </div>
          </div>

          <div className="space-y-4">
            {/* Full Name */}
            <div>
              <label className="flex items-center gap-2 text-sm font-medium text-dark-300 mb-1.5">
                <User className="w-4 h-4" />
                Nombre completo *
              </label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Nombre y apellidos como aparecen en el documento"
                className="w-full px-4 py-3 bg-dark-700 border border-dark-600 rounded-lg text-white placeholder-dark-500 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-colors"
              />
            </div>

            {/* ID Number */}
            <div>
              <label className="flex items-center gap-2 text-sm font-medium text-dark-300 mb-1.5">
                <Hash className="w-4 h-4" />
                Número de {country?.idDocumentName || 'documento'} *
              </label>
              <input
                type="text"
                value={idNumber}
                onChange={(e) => setIdNumber(e.target.value)}
                placeholder={`Ej: ${country?.code === 'PA' ? '8-123-4567' : country?.code === 'CR' ? '1-1234-1234' : '123456789'}`}
                className="w-full px-4 py-3 bg-dark-700 border border-dark-600 rounded-lg text-white placeholder-dark-500 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-colors"
              />
            </div>

            {/* Birth Date */}
            <div>
              <label className="flex items-center gap-2 text-sm font-medium text-dark-300 mb-1.5">
                <Calendar className="w-4 h-4" />
                Fecha de nacimiento
              </label>
              <input
                type="date"
                value={birthDate}
                onChange={(e) => setBirthDate(e.target.value)}
                className="w-full px-4 py-3 bg-dark-700 border border-dark-600 rounded-lg text-white placeholder-dark-500 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-colors"
              />
            </div>

            {/* Expiry Date */}
            <div>
              <label className="flex items-center gap-2 text-sm font-medium text-dark-300 mb-1.5">
                <Calendar className="w-4 h-4" />
                Fecha de vencimiento
              </label>
              <input
                type="date"
                value={expiryDate}
                onChange={(e) => setExpiryDate(e.target.value)}
                className="w-full px-4 py-3 bg-dark-700 border border-dark-600 rounded-lg text-white placeholder-dark-500 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-colors"
              />
            </div>
          </div>

          {/* Re-extract button if they already tried */}
          {extractionAttempted && frontImage && (
            <div className="mt-4 pt-4 border-t border-dark-600">
              <button
                onClick={handleExtractData}
                className="text-sm text-primary-400 hover:text-primary-300 flex items-center gap-2 transition-colors"
                disabled={isExtracting || isProcessing}
              >
                <Sparkles className="w-4 h-4" />
                Reintentar extracción con IA
              </button>
            </div>
          )}
        </Card>
      )}

      {/* Navigation */}
      <div className="flex gap-4">
        <Button variant="secondary" onClick={prevStep}>
          Atrás
        </Button>
        <Button
          fullWidth
          onClick={handleContinue}
          disabled={!frontImage || isProcessing || isExtracting}
        >
          {canContinue ? 'Continuar' : 'Continuar sin datos'}
        </Button>
      </div>
    </div>
  );
};
