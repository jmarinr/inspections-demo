import React, { useRef } from 'react';
import { 
  Camera, AlertTriangle, X, ShieldAlert, 
  ChevronDown, ChevronUp, AlertCircle, Wrench, MapPin, Sparkles, Target, Zap
} from 'lucide-react';
import { Button, Card, Alert, Badge, ProgressBar } from '../ui';
import { useInspectionStore } from '../../stores/inspectionStore';
import { useImageValidation } from '../../hooks/useImageValidation';
import { 
  useDamageDetection, 
  getDamageTypeLabel, 
  getPartLabel,
  getSeverityLabel, 
  getSeverityColor,
  getImpactTypeLabel,
  getZoneLabel
} from '../../hooks/useDamageDetection';
import type { DamageDetection } from '../../hooks/useDamageDetection';
import { compressImage, fileToBase64 } from '../../lib/imageUtils';
import type { DamagePhoto } from '../../types';

// ===== Severity badge colors =====
const severityBadge = (sev: string) => {
  switch (sev) {
    case 'severe': case 'total_loss': return { bg: '#ef4444', text: 'white' };
    case 'moderate': return { bg: '#f59e0b', text: 'white' };
    default: return { bg: '#eab308', text: 'white' };
  }
};

// ===== Damage Overlay Component =====
interface DamageOverlayProps {
  imageUrl: string;
  damages: DamageDetection[];
  selectedDamage: string | null;
  onSelectDamage: (id: string | null) => void;
}

const DamageOverlay: React.FC<DamageOverlayProps> = ({ imageUrl, damages, selectedDamage, onSelectDamage }) => {
  return (
    <div className="relative w-full rounded-xl overflow-hidden" style={{ aspectRatio: '4/3' }}>
      {/* Base Image */}
      <img src={imageUrl} alt="Daño" className="w-full h-full object-cover" />
      
      {/* Dark overlay for contrast */}
      <div className="absolute inset-0 bg-black/20" />
      
      {/* Damage markers */}
      {damages.map((damage, idx) => {
        if (!damage.boundingBox) return null;
        const { x, y, width, height } = damage.boundingBox;
        const isSelected = selectedDamage === damage.id;
        const colors = severityBadge(damage.severity);
        
        return (
          <React.Fragment key={damage.id}>
            {/* Bounding box */}
            <div
              className="absolute transition-all duration-300 cursor-pointer"
              style={{
                left: `${(x - width / 2) * 100}%`,
                top: `${(y - height / 2) * 100}%`,
                width: `${width * 100}%`,
                height: `${height * 100}%`,
                border: `2px solid ${colors.bg}`,
                borderRadius: '8px',
                backgroundColor: isSelected ? `${colors.bg}22` : `${colors.bg}11`,
                boxShadow: isSelected 
                  ? `0 0 0 2px ${colors.bg}, 0 0 20px ${colors.bg}66`
                  : `0 0 10px ${colors.bg}33`,
                transform: isSelected ? 'scale(1.02)' : 'scale(1)',
                zIndex: isSelected ? 20 : 10,
              }}
              onClick={(e) => { e.stopPropagation(); onSelectDamage(isSelected ? null : damage.id); }}
            >
              {/* Corner brackets for tech look */}
              <div className="absolute -top-px -left-px w-3 h-3 border-t-2 border-l-2 rounded-tl-md" style={{ borderColor: colors.bg }} />
              <div className="absolute -top-px -right-px w-3 h-3 border-t-2 border-r-2 rounded-tr-md" style={{ borderColor: colors.bg }} />
              <div className="absolute -bottom-px -left-px w-3 h-3 border-b-2 border-l-2 rounded-bl-md" style={{ borderColor: colors.bg }} />
              <div className="absolute -bottom-px -right-px w-3 h-3 border-b-2 border-r-2 rounded-br-md" style={{ borderColor: colors.bg }} />
            </div>

            {/* Number marker */}
            <div
              className="absolute cursor-pointer transition-all duration-200 z-30"
              style={{
                left: `${(x - width / 2) * 100}%`,
                top: `${(y - height / 2) * 100}%`,
                transform: 'translate(-50%, -50%)',
              }}
              onClick={(e) => { e.stopPropagation(); onSelectDamage(isSelected ? null : damage.id); }}
            >
              <div
                className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shadow-lg"
                style={{ 
                  backgroundColor: colors.bg,
                  color: colors.text,
                  boxShadow: `0 2px 8px ${colors.bg}88`,
                  border: '2px solid white',
                }}
              >
                {idx + 1}
              </div>
            </div>

            {/* Tooltip on selected */}
            {isSelected && (
              <div
                className="absolute z-40 p-2.5 rounded-lg shadow-xl max-w-[200px] animate-fade-in"
                style={{
                  left: `${x * 100}%`,
                  top: `${Math.max(0, (y - height / 2) * 100 - 2)}%`,
                  transform: 'translate(-50%, -100%)',
                  backgroundColor: 'rgba(15,10,31,0.95)',
                  border: `1px solid ${colors.bg}`,
                  backdropFilter: 'blur(8px)',
                }}
              >
                <div className="flex items-center gap-1.5 mb-1">
                  <span className="w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-bold" style={{ backgroundColor: colors.bg, color: 'white' }}>
                    {idx + 1}
                  </span>
                  <span className="text-xs font-bold text-white">{getPartLabel(damage.part)}</span>
                </div>
                <p className="text-[10px] text-gray-300">{getDamageTypeLabel(damage.type)} · {getSeverityLabel(damage.severity)}</p>
                <div className="w-full h-px bg-gray-700 my-1.5" />
                <p className="text-[10px] text-gray-400 leading-tight">{damage.description}</p>
              </div>
            )}
          </React.Fragment>
        );
      })}
      
      {/* AI Badge overlay */}
      <div className="absolute top-3 right-3 z-30">
        <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-[10px] font-semibold shadow-lg" 
          style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--hk-primary)', color: 'white', backdropFilter: 'blur(8px)' }}>
          <Sparkles className="w-3 h-3" style={{ color: 'var(--hk-primary)' }} />
          IA Detección
        </div>
      </div>

      {/* Damage count overlay */}
      <div className="absolute bottom-3 left-3 z-30">
        <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-[10px] font-bold shadow-lg"
          style={{ backgroundColor: 'var(--bg-card)', border: '1px solid rgba(255,255,255,0.15)', color: 'white', backdropFilter: 'blur(8px)' }}>
          <Target className="w-3 h-3 text-red-400" />
          {damages.length} {damages.length === 1 ? 'daño' : 'daños'} detectados
        </div>
      </div>
    </div>
  );
};

// ===== Damage Detail Card =====
interface DamageDetailProps {
  damage: DamageDetection;
  index: number;
  isSelected: boolean;
  onSelect: () => void;
}

const DamageDetail: React.FC<DamageDetailProps> = ({ damage, index, isSelected, onSelect }) => {
  const colors = severityBadge(damage.severity);
  return (
    <button
      onClick={onSelect}
      className="w-full text-left p-3 rounded-xl transition-all duration-200"
      style={{ 
        backgroundColor: isSelected ? `${colors.bg}15` : 'var(--bg-input)',
        border: isSelected ? `1.5px solid ${colors.bg}` : '1.5px solid transparent',
      }}
    >
      <div className="flex items-start gap-3">
        {/* Number */}
        <div className="shrink-0">
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold"
            style={{ backgroundColor: colors.bg, color: 'white' }}
          >
            {index + 1}
          </div>
        </div>
        
        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-1">
            <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
              {getPartLabel(damage.part)}
            </p>
            <Badge variant={damage.severity === 'severe' || damage.severity === 'total_loss' ? 'warning' : 'info'}>
              {getSeverityLabel(damage.severity)}
            </Badge>
          </div>
          
          <div className="flex items-center gap-3 mb-1.5">
            <span className="text-xs flex items-center gap-1" style={{ color: 'var(--text-muted)' }}>
              <Zap className="w-3 h-3" />
              {getDamageTypeLabel(damage.type)}
            </span>
            <span className="text-xs flex items-center gap-1" style={{ color: 'var(--text-muted)' }}>
              <MapPin className="w-3 h-3" />
              {damage.side === 'left' ? 'Izquierdo' : damage.side === 'right' ? 'Derecho' : damage.side === 'front' ? 'Frontal' : damage.side === 'rear' ? 'Trasero' : 'Centro'}
            </span>
          </div>
          
          <p className="text-xs leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
            {damage.description}
          </p>
          
          {/* Tags */}
          <div className="flex gap-1.5 mt-2 flex-wrap">
            {damage.affectsStructure && (
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-red-500/20 text-red-400 font-medium">Estructural</span>
            )}
            {damage.affectsMechanical && (
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-orange-500/20 text-orange-400 font-medium">Mecánico</span>
            )}
            {damage.affectsSafety && (
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-yellow-500/20 text-yellow-400 font-medium">Seguridad</span>
            )}
            <span className="text-[10px] px-2 py-0.5 rounded-full font-medium" style={{ backgroundColor: 'var(--bg-card)', color: 'var(--text-muted)' }}>
              <Wrench className="w-2.5 h-2.5 inline mr-0.5" />
              {damage.estimatedRepair === 'paintless_repair' ? 'Sin pintura' :
               damage.estimatedRepair === 'body_repair' ? 'Carrocería' :
               damage.estimatedRepair === 'part_replacement' ? 'Reemplazo' : 'Estructural'}
            </span>
            <span className="text-[10px] px-2 py-0.5 rounded-full font-medium" style={{ backgroundColor: 'var(--bg-card)', color: 'var(--text-muted)' }}>
              {Math.round(damage.confidence * 100)}% conf.
            </span>
          </div>
        </div>
      </div>
    </button>
  );
};

// ===== Main Component =====
export const DamagePhotosStep: React.FC = () => {
  const { 
    inspection, nextStep, prevStep, 
    addDamagePhoto, removeDamagePhoto, updateDamagePhoto 
  } = useInspectionStore();
  const { isAnalyzing, progress, analyzeImage } = useDamageDetection();
  const { validateImage } = useImageValidation();
  
  const damagePhotos = inspection.damagePhotos || [];
  const [expandedPhoto, setExpandedPhoto] = React.useState<string | null>(null);
  const [selectedDamage, setSelectedDamage] = React.useState<string | null>(null);
  const [isCapturing, setIsCapturing] = React.useState(false);
  const [validationError, setValidationError] = React.useState<string | null>(null);
  
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsCapturing(true);
    setValidationError(null);
    try {
      const compressed = await compressImage(file, { maxSizeMB: 0.8 });
      const base64 = await fileToBase64(compressed);
      
      // Validate
      const validation = await validateImage(base64, 'damage');
      if (!validation.isValid) {
        setValidationError(validation.reason);
        setIsCapturing(false);
        if (inputRef.current) inputRef.current.value = '';
        return;
      }
      
      const newPhoto: DamagePhoto = {
        id: `damage-${Date.now()}`,
        imageUrl: base64,
        timestamp: new Date(),
      };
      
      addDamagePhoto(newPhoto);
      setExpandedPhoto(newPhoto.id);
      setSelectedDamage(null);
      
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
    if (expandedPhoto === photoId) { setExpandedPhoto(null); setSelectedDamage(null); }
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
          <div className="p-2.5 rounded-xl" style={{ backgroundColor: 'var(--hk-primary)' }}>
            <ShieldAlert className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="font-semibold" style={{ color: 'var(--text-primary)' }}>Detección de daños con IA</h3>
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Marcación automática de zona, parte y severidad</p>
          </div>
        </div>
        
        <div className="grid grid-cols-4 gap-2">
          <div className="stat-card">
            <p className="stat-value text-lg">{damagePhotos.length}</p>
            <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>Fotos</p>
          </div>
          <div className="stat-card">
            <p className="stat-value text-lg">{totalDamagesDetected}</p>
            <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>Daños</p>
          </div>
          <div className="stat-card">
            <p className={`text-lg font-bold ${getSeverityColor(overallSeverity as any)}`}>
              {overallSeverity === 'none' ? '—' : getSeverityLabel(overallSeverity as any)}
            </p>
            <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>Severidad</p>
          </div>
          <div className="stat-card">
            <p className={`text-lg font-bold ${hasNonDriveableVehicle ? 'text-red-400' : 'text-emerald-400'}`}>
              {damagePhotos.length === 0 ? '—' : hasNonDriveableVehicle ? 'NO' : 'SÍ'}
            </p>
            <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>Conducible</p>
          </div>
        </div>
      </Card>

      {/* Processing */}
      {isAnalyzing && (
        <Card className="animate-fade-in">
          <div className="flex items-center gap-4">
            <div className="relative">
              <div className="w-14 h-14 rounded-full flex items-center justify-center" style={{ backgroundColor: 'var(--hk-primary-surface)' }}>
                <Target className="w-7 h-7 animate-pulse" style={{ color: 'var(--hk-primary)' }} />
              </div>
              <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full flex items-center justify-center" style={{ backgroundColor: 'var(--hk-primary)' }}>
                <Sparkles className="w-3.5 h-3.5 text-white" />
              </div>
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Analizando daños con IA...</p>
              <p className="text-xs mb-2" style={{ color: 'var(--text-muted)' }}>Detectando partes dañadas, tipo y severidad</p>
              <ProgressBar progress={progress} />
            </div>
          </div>
        </Card>
      )}

      {/* Validation Error */}
      {validationError && (
        <Alert variant="warning" icon={<AlertCircle className="w-4 h-4" />}>
          {validationError}
          <p className="text-xs mt-1 opacity-80">Por favor sube una foto que muestre los daños del vehículo.</p>
        </Alert>
      )}

      {/* Upload Button */}
      <input ref={inputRef} type="file" accept="image/*" capture="environment" onChange={handleFileSelect} className="hidden" />
      
      <button
        onClick={() => inputRef.current?.click()}
        disabled={isCapturing || isAnalyzing}
        className="w-full upload-zone"
      >
        <div className="p-3 rounded-xl" style={{ backgroundColor: 'var(--hk-primary)' }}>
          <Camera className="w-6 h-6 text-white" />
        </div>
        <div className="text-center">
          <p className="font-medium" style={{ color: 'var(--text-primary)' }}>Agregar foto de daño</p>
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>La IA marcará y clasificará cada daño automáticamente</p>
        </div>
      </button>

      {/* Damage Photos with Overlay */}
      {damagePhotos.length > 0 && (
        <div className="space-y-4">
          {damagePhotos.map((photo) => {
            const isExpanded = expandedPhoto === photo.id;
            const damages: DamageDetection[] = photo.analysis?.damages || [];
            const photoSeverity = photo.analysis?.overallSeverity || 'none';
            const impactType = photo.analysis?.impactType;
            const impactZone = photo.analysis?.impactZone;
            
            return (
              <Card key={photo.id} padding="none" className="overflow-hidden">
                {/* Image with Overlay */}
                <DamageOverlay
                  imageUrl={photo.imageUrl}
                  damages={damages}
                  selectedDamage={selectedDamage}
                  onSelectDamage={setSelectedDamage}
                />
                
                {/* Summary Bar */}
                <div 
                  className="p-3 cursor-pointer"
                  style={{ borderTop: '1px solid var(--border-color)' }}
                  onClick={() => { setExpandedPhoto(isExpanded ? null : photo.id); setSelectedDamage(null); }}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {impactZone && (
                        <Badge variant="info" className="text-[10px]">
                          {getZoneLabel(impactZone)}
                        </Badge>
                      )}
                      {impactType && (
                        <Badge variant="info" className="text-[10px]">
                          {getImpactTypeLabel(impactType)}
                        </Badge>
                      )}
                      <Badge variant={photoSeverity === 'severe' || photoSeverity === 'total_loss' ? 'warning' : photoSeverity === 'moderate' ? 'warning' : 'success'} className="text-[10px]">
                        {photoSeverity === 'none' ? 'Sin daños' : getSeverityLabel(photoSeverity as any)}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                        {damages.length} {damages.length === 1 ? 'daño' : 'daños'}
                      </span>
                      {isExpanded ? (
                        <ChevronUp className="w-4 h-4" style={{ color: 'var(--text-muted)' }} />
                      ) : (
                        <ChevronDown className="w-4 h-4" style={{ color: 'var(--text-muted)' }} />
                      )}
                    </div>
                  </div>
                </div>

                {/* Expanded Details */}
                {isExpanded && photo.analysis && (
                  <div className="px-3 pb-4 space-y-3" style={{ borderTop: '1px solid var(--border-color)' }}>
                    {/* Damage list with interactive selection */}
                    {damages.length > 0 && (
                      <div className="space-y-2 pt-3">
                        <p className="text-xs font-semibold px-1" style={{ color: 'var(--text-muted)' }}>
                          DAÑOS DETECTADOS
                        </p>
                        {damages.map((damage, idx) => (
                          <DamageDetail
                            key={damage.id}
                            damage={damage}
                            index={idx}
                            isSelected={selectedDamage === damage.id}
                            onSelect={() => setSelectedDamage(selectedDamage === damage.id ? null : damage.id)}
                          />
                        ))}
                      </div>
                    )}

                    {/* Affected Parts */}
                    {(photo.analysis.affectedParts.exterior.length > 0 || 
                      photo.analysis.affectedParts.mechanical.length > 0 ||
                      photo.analysis.affectedParts.structural.length > 0) && (
                      <div className="p-3 rounded-xl" style={{ backgroundColor: 'var(--bg-input)' }}>
                        <p className="text-xs font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>
                          Partes afectadas
                        </p>
                        <div className="space-y-1.5 text-xs">
                          {photo.analysis.affectedParts.exterior.length > 0 && (
                            <div className="flex gap-1.5 flex-wrap">
                              {photo.analysis.affectedParts.exterior.map((p: string, i: number) => (
                                <span key={i} className="px-2 py-0.5 rounded-full text-[10px]" style={{ backgroundColor: 'var(--bg-card)', color: 'var(--text-secondary)' }}>{p}</span>
                              ))}
                            </div>
                          )}
                          {photo.analysis.affectedParts.mechanical.length > 0 && (
                            <div className="flex gap-1.5 flex-wrap">
                              {photo.analysis.affectedParts.mechanical.map((p: string, i: number) => (
                                <span key={i} className="px-2 py-0.5 rounded-full text-[10px] bg-orange-500/20 text-orange-400">{p}</span>
                              ))}
                            </div>
                          )}
                          {photo.analysis.affectedParts.structural.length > 0 && (
                            <div className="flex gap-1.5 flex-wrap">
                              {photo.analysis.affectedParts.structural.map((p: string, i: number) => (
                                <span key={i} className="px-2 py-0.5 rounded-full text-[10px] bg-red-500/20 text-red-400">{p}</span>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Recommendations */}
                    {photo.analysis.recommendations.length > 0 && (
                      <div className="p-3 rounded-xl" style={{ backgroundColor: 'var(--bg-input)' }}>
                        <p className="text-xs font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>Recomendaciones</p>
                        <div className="space-y-1">
                          {photo.analysis.recommendations.map((rec: string, idx: number) => (
                            <p key={idx} className="text-xs leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{rec}</p>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Footer */}
                    <div className="flex items-center justify-between pt-2">
                      <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
                        Confianza: {Math.round((photo.analysis.confidence || 0) * 100)}% · 
                        {photo.analysis.repairCategory === 'minor_repair' ? ' Reparación menor' :
                         photo.analysis.repairCategory === 'moderate_repair' ? ' Reparación moderada' :
                         photo.analysis.repairCategory === 'major_repair' ? ' Reparación mayor' : ' Pérdida total'}
                      </span>
                      <button
                        onClick={(e) => { e.stopPropagation(); handleRemovePhoto(photo.id); }}
                        className="text-[10px] flex items-center gap-1 px-2 py-1 rounded-lg transition-colors"
                        style={{ color: 'var(--text-muted)', backgroundColor: 'var(--bg-input)' }}
                      >
                        <X className="w-3 h-3" />
                        Eliminar
                      </button>
                    </div>
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}

      {/* No damage hint */}
      {damagePhotos.length === 0 && (
        <Alert variant="info" icon={<AlertTriangle className="w-4 h-4" />}>
          Toma fotos de los daños del vehículo. La IA marcará automáticamente cada área dañada con el nombre de la parte, tipo de daño y severidad. Si no hay daños visibles, puedes continuar.
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
            ? `Continuar (${totalDamagesDetected} daños detectados)` 
            : 'Continuar sin daños'}
        </Button>
      </div>
    </div>
  );
};
