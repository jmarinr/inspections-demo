import React, { useRef } from 'react';
import { 
  Camera, AlertTriangle, X, Loader2, ShieldAlert, 
  ChevronDown, ChevronUp, Car, AlertCircle, Wrench, MapPin
} from 'lucide-react';
import { Button, Card, Alert, Badge, ProgressBar } from '../ui';
import { useInspectionStore } from '../../stores/inspectionStore';
import { 
  useDamageDetection, 
  getDamageTypeLabel, 
  getPartLabel,
  getZoneLabel,
  getSeverityLabel, 
  getSeverityColor,
  getImpactTypeLabel
} from '../../hooks/useDamageDetection';
import { compressImage, fileToBase64 } from '../../lib/imageUtils';
import type { DamagePhoto } from '../../types';

export const DamagePhotosStep: React.FC = () => {
  const { 
    inspection, 
    nextStep, 
    prevStep, 
    addDamagePhoto, 
    removeDamagePhoto,
    updateDamagePhoto 
  } = useInspectionStore();
  const { isAnalyzing, progress, analyzeImage } = useDamageDetection();
  
  // Use damagePhotos from the store instead of local state
  const damagePhotos = inspection.damagePhotos || [];
  const [expandedPhoto, setExpandedPhoto] = React.useState<string | null>(null);
  const [isCapturing, setIsCapturing] = React.useState(false);
  
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsCapturing(true);
    try {
      const compressed = await compressImage(file, { maxSizeMB: 0.8 });
      const base64 = await fileToBase64(compressed);
      
      const newPhoto: DamagePhoto = {
        id: `damage-${Date.now()}`,
        imageUrl: base64,
        timestamp: new Date(),
      };
      
      // Add photo to store immediately
      addDamagePhoto(newPhoto);
      setExpandedPhoto(newPhoto.id);
      
      // Analyze and update
      const analysis = await analyzeImage(base64);
      updateDamagePhoto(newPhoto.id, { analysis });
      
    } catch (error) {
      console.error('Error processing photo:', error);
    } finally {
      setIsCapturing(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  const handleRemovePhoto = (photoId: string) => {
    removeDamagePhoto(photoId);
    if (expandedPhoto === photoId) setExpandedPhoto(null);
  };

  const totalDamagesDetected = damagePhotos.reduce((acc, photo) => acc + (photo.analysis?.damages.length || 0), 0);
  
  const getOverallSeverity = () => {
    if (damagePhotos.length === 0) return 'none';
    if (damagePhotos.some(p => p.analysis?.overallSeverity === 'total_loss')) return 'total_loss';
    if (damagePhotos.some(p => p.analysis?.overallSeverity === 'severe')) return 'severe';
    if (damagePhotos.some(p => p.analysis?.overallSeverity === 'moderate')) return 'moderate';
    if (damagePhotos.some(p => p.analysis?.overallSeverity === 'minor')) return 'minor';
    return 'none';
  };

  const overallSeverity = getOverallSeverity();
  const hasNonDriveableVehicle = damagePhotos.some(p => p.analysis?.vehicleStatus.isDriveable === false);

  return (
    <div className="space-y-5 animate-slide-up">
      {/* Header */}
      <Card>
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 rounded-lg" style={{ backgroundColor: 'var(--hk-primary)' }}>
            <ShieldAlert className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="font-semibold" style={{ color: 'var(--text-primary)' }}>Detección de daños con IA</h3>
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Análisis automático de zona, severidad y tipo</p>
          </div>
        </div>
        
        <div className="grid grid-cols-4 gap-2">
          <div className="stat-card">
            <p className="stat-value text-lg">{damagePhotos.length}</p>
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Fotos</p>
          </div>
          <div className="stat-card">
            <p className="stat-value text-lg">{totalDamagesDetected}</p>
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Daños</p>
          </div>
          <div className="stat-card">
            <p className={`text-lg font-bold ${getSeverityColor(overallSeverity as any)}`}>
              {overallSeverity === 'none' ? '—' : getSeverityLabel(overallSeverity as any)}
            </p>
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Severidad</p>
          </div>
          <div className="stat-card">
            <p className={`text-lg font-bold ${hasNonDriveableVehicle ? 'text-red-400' : 'text-emerald-400'}`}>
              {hasNonDriveableVehicle ? 'NO' : 'SÍ'}
            </p>
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Conducible</p>
          </div>
        </div>
      </Card>

      {/* Processing */}
      {isAnalyzing && (
        <Card>
          <div className="flex items-center gap-3">
            <Loader2 className="w-6 h-6 animate-spin" style={{ color: 'var(--hk-primary)' }} />
            <div className="flex-1">
              <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                Analizando daños con IA...
              </p>
              <p className="text-xs mb-2" style={{ color: 'var(--text-muted)' }}>
                Detectando zona, tipo y severidad
              </p>
              <ProgressBar progress={progress} />
            </div>
          </div>
        </Card>
      )}

      {/* Upload Button */}
      <input ref={inputRef} type="file" accept="image/*" capture="environment" onChange={handleFileSelect} className="hidden" />
      
      <button
        onClick={() => inputRef.current?.click()}
        disabled={isCapturing || isAnalyzing}
        className="w-full upload-zone"
      >
        <div className="p-3 rounded-lg" style={{ backgroundColor: 'var(--hk-primary)' }}>
          <Camera className="w-6 h-6 text-white" />
        </div>
        <div className="text-center">
          <p className="font-medium" style={{ color: 'var(--text-primary)' }}>Agregar foto de daño</p>
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Análisis automático: zona, severidad, tipo de impacto</p>
        </div>
      </button>

      {/* Damage Photos List */}
      {damagePhotos.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
            Análisis de daños ({damagePhotos.length})
          </h3>
          
          {damagePhotos.map((photo) => (
            <Card key={photo.id} padding="sm">
              {/* Header */}
              <div 
                className="flex items-center justify-between cursor-pointer p-2"
                onClick={() => setExpandedPhoto(expandedPhoto === photo.id ? null : photo.id)}
              >
                <div className="flex items-center gap-3">
                  <img src={photo.imageUrl} alt="Daño" className="w-14 h-14 rounded-lg object-cover" />
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      {photo.analysis?.impactType && (
                        <Badge variant="ai">
                          {getImpactTypeLabel(photo.analysis.impactType)}
                        </Badge>
                      )}
                      {photo.analysis?.impactZone && (
                        <Badge variant="info">
                          {getZoneLabel(photo.analysis.impactZone)}
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                      {photo.analysis?.damages.length || 0} daño(s) detectado(s)
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={
                    photo.analysis?.overallSeverity === 'severe' || photo.analysis?.overallSeverity === 'total_loss' 
                      ? 'warning' 
                      : photo.analysis?.hasDamage ? 'info' : 'success'
                  }>
                    {photo.analysis?.overallSeverity === 'none' 
                      ? 'Sin daños' 
                      : getSeverityLabel(photo.analysis?.overallSeverity as any)}
                  </Badge>
                  {expandedPhoto === photo.id ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </div>
              </div>

              {/* Expanded Details */}
              {expandedPhoto === photo.id && photo.analysis && (
                <div className="mt-3 pt-3 space-y-4" style={{ borderTop: '1px solid var(--border-color)' }}>
                  
                  {/* Vehicle Status */}
                  {(photo.analysis.vehicleStatus.airbagDeployed || 
                    photo.analysis.vehicleStatus.fluidLeak || 
                    photo.analysis.vehicleStatus.structuralDamage ||
                    !photo.analysis.vehicleStatus.isDriveable) && (
                    <div className="p-3 rounded-lg" style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)' }}>
                      <p className="text-xs font-medium mb-2 text-red-400">⚠️ Estado del vehículo</p>
                      <div className="flex flex-wrap gap-2">
                        {!photo.analysis.vehicleStatus.isDriveable && (
                          <Badge variant="warning">No conducible</Badge>
                        )}
                        {photo.analysis.vehicleStatus.airbagDeployed && (
                          <Badge variant="warning">Airbag desplegado</Badge>
                        )}
                        {photo.analysis.vehicleStatus.fluidLeak && (
                          <Badge variant="warning">Fuga de fluidos</Badge>
                        )}
                        {photo.analysis.vehicleStatus.structuralDamage && (
                          <Badge variant="warning">Daño estructural</Badge>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Image with markers */}
                  <div className="relative rounded-lg overflow-hidden">
                    <img src={photo.imageUrl} alt="Daño" className="w-full rounded-lg" />
                    {photo.analysis.damages.map((damage: any, idx: number) => (
                      damage.boundingBox && (
                        <div
                          key={idx}
                          className="damage-marker"
                          style={{ left: `${damage.boundingBox.x * 100}%`, top: `${damage.boundingBox.y * 100}%` }}
                          title={`${getPartLabel(damage.part)}: ${getDamageTypeLabel(damage.type)}`}
                        >
                          {idx + 1}
                        </div>
                      )
                    ))}
                  </div>

                  {/* Damage List */}
                  {photo.analysis.damages.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>
                        Daños detectados:
                      </p>
                      {photo.analysis.damages.map((damage: any, idx: number) => (
                        <div 
                          key={idx} 
                          className="p-3 rounded-lg" 
                          style={{ backgroundColor: 'var(--bg-input)' }}
                        >
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <span 
                                className="w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold text-white"
                                style={{ 
                                  backgroundColor: damage.severity === 'severe' || damage.severity === 'total_loss' 
                                    ? '#ef4444' 
                                    : damage.severity === 'moderate' ? '#f59e0b' : '#eab308' 
                                }}
                              >
                                {idx + 1}
                              </span>
                              <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                                {getDamageTypeLabel(damage.type)}
                              </span>
                            </div>
                            <Badge variant={damage.severity === 'severe' ? 'warning' : 'info'}>
                              {getSeverityLabel(damage.severity)}
                            </Badge>
                          </div>
                          
                          <div className="grid grid-cols-2 gap-2 text-xs mb-2">
                            <div className="flex items-center gap-1">
                              <Car className="w-3 h-3" style={{ color: 'var(--text-muted)' }} />
                              <span style={{ color: 'var(--text-secondary)' }}>{getPartLabel(damage.part)}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <MapPin className="w-3 h-3" style={{ color: 'var(--text-muted)' }} />
                              <span style={{ color: 'var(--text-secondary)' }}>
                                {damage.side === 'left' ? 'Izquierdo' : 
                                 damage.side === 'right' ? 'Derecho' : 
                                 damage.side === 'center' ? 'Centro' :
                                 damage.side === 'front' ? 'Frontal' : 'Trasero'}
                              </span>
                            </div>
                          </div>
                          
                          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                            {damage.description}
                          </p>
                          
                          {/* Indicators */}
                          <div className="flex gap-2 mt-2 flex-wrap">
                            {damage.affectsStructure && (
                              <span className="text-xs px-2 py-0.5 rounded bg-red-500/20 text-red-400">Estructural</span>
                            )}
                            {damage.affectsMechanical && (
                              <span className="text-xs px-2 py-0.5 rounded bg-orange-500/20 text-orange-400">Mecánico</span>
                            )}
                            {damage.affectsSafety && (
                              <span className="text-xs px-2 py-0.5 rounded bg-yellow-500/20 text-yellow-400">Seguridad</span>
                            )}
                            <span className="text-xs px-2 py-0.5 rounded" style={{ backgroundColor: 'var(--bg-card)', color: 'var(--text-muted)' }}>
                              <Wrench className="w-3 h-3 inline mr-1" />
                              {damage.estimatedRepair === 'paintless_repair' ? 'Reparación sin pintura' :
                               damage.estimatedRepair === 'body_repair' ? 'Reparación carrocería' :
                               damage.estimatedRepair === 'part_replacement' ? 'Reemplazo de pieza' : 'Reparación estructural'}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Affected Parts Summary */}
                  {(photo.analysis.affectedParts.exterior.length > 0 || 
                    photo.analysis.affectedParts.mechanical.length > 0 ||
                    photo.analysis.affectedParts.structural.length > 0) && (
                    <div className="p-3 rounded-lg" style={{ backgroundColor: 'var(--bg-input)' }}>
                      <p className="text-xs font-medium mb-2" style={{ color: 'var(--text-primary)' }}>
                        Partes afectadas:
                      </p>
                      <div className="space-y-1 text-xs">
                        {photo.analysis.affectedParts.exterior.length > 0 && (
                          <p><span style={{ color: 'var(--text-muted)' }}>Exterior:</span> <span style={{ color: 'var(--text-secondary)' }}>{photo.analysis.affectedParts.exterior.join(', ')}</span></p>
                        )}
                        {photo.analysis.affectedParts.mechanical.length > 0 && (
                          <p><span className="text-orange-400">Mecánico:</span> <span style={{ color: 'var(--text-secondary)' }}>{photo.analysis.affectedParts.mechanical.join(', ')}</span></p>
                        )}
                        {photo.analysis.affectedParts.structural.length > 0 && (
                          <p><span className="text-red-400">Estructural:</span> <span style={{ color: 'var(--text-secondary)' }}>{photo.analysis.affectedParts.structural.join(', ')}</span></p>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Recommendations */}
                  {photo.analysis.recommendations.length > 0 && (
                    <div className="p-3 rounded-lg" style={{ backgroundColor: 'var(--bg-input)' }}>
                      <p className="text-xs font-medium mb-2" style={{ color: 'var(--text-primary)' }}>
                        Recomendaciones:
                      </p>
                      <ul className="space-y-1">
                        {photo.analysis.recommendations.map((rec: any, idx: number) => (
                          <li key={idx} className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                            {rec}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Confidence & Category */}
                  <div className="flex items-center justify-between text-xs" style={{ color: 'var(--text-muted)' }}>
                    <span>Confianza: {Math.round((photo.analysis.confidence || 0) * 100)}%</span>
                    <span>
                      Categoría: {
                        photo.analysis.repairCategory === 'minor_repair' ? 'Reparación menor' :
                        photo.analysis.repairCategory === 'moderate_repair' ? 'Reparación moderada' :
                        photo.analysis.repairCategory === 'major_repair' ? 'Reparación mayor' : 'Pérdida total'
                      }
                    </span>
                  </div>

                  {/* Remove button */}
                  <Button 
                    variant="secondary" 
                    size="sm" 
                    fullWidth 
                    onClick={(e) => { e.stopPropagation(); handleRemovePhoto(photo.id); }} 
                    leftIcon={<X className="w-4 h-4" />}
                  >
                    Eliminar foto
                  </Button>
                </div>
              )}
            </Card>
          ))}
        </div>
      )}

      {/* No damage info */}
      {damagePhotos.length === 0 && (
        <Alert variant="info" icon={<AlertTriangle className="w-4 h-4" />}>
          Sin daños visibles, puedes continuar sin fotos.
        </Alert>
      )}

      {/* Warning if not driveable */}
      {hasNonDriveableVehicle && (
        <Alert variant="warning" icon={<AlertCircle className="w-4 h-4" />}>
          <strong>Vehículo no conducible detectado.</strong> Se requiere grúa para traslado.
        </Alert>
      )}

      {/* Navigation */}
      <div className="flex gap-3">
        <Button variant="secondary" onClick={prevStep}>Atrás</Button>
        <Button fullWidth onClick={nextStep}>
          {damagePhotos.length > 0 
            ? `Continuar (${totalDamagesDetected} daños)` 
            : 'Continuar sin daños'}
        </Button>
      </div>
    </div>
  );
};
