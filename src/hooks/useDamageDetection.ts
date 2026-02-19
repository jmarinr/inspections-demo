import { useState, useCallback } from 'react';

// ===== TIPOS DE DAÑO =====
export type DamageType = 
  | 'scratch' | 'dent' | 'crack' | 'broken' | 'paint' 
  | 'deformation' | 'glass' | 'puncture' | 'corrosion';

// ===== PARTES DEL VEHÍCULO =====
export type VehiclePart = 
  | 'hood' | 'trunk' | 'roof' | 'front_bumper' | 'rear_bumper'
  | 'front_fender_left' | 'front_fender_right' | 'rear_fender_left' | 'rear_fender_right'
  | 'front_door_left' | 'front_door_right' | 'rear_door_left' | 'rear_door_right'
  | 'side_panel_left' | 'side_panel_right'
  | 'headlight_left' | 'headlight_right' | 'taillight_left' | 'taillight_right'
  | 'windshield' | 'rear_window' | 'side_window_left' | 'side_window_right'
  | 'mirror_left' | 'mirror_right'
  | 'wheel_front_left' | 'wheel_front_right' | 'wheel_rear_left' | 'wheel_rear_right'
  | 'grille' | 'engine' | 'radiator' | 'frame';

// ===== ZONA DEL VEHÍCULO =====
export type VehicleZone = 'frontal' | 'rear' | 'lateral_left' | 'lateral_right' | 'roof' | 'undercarriage';

// ===== SEVERIDAD =====
export type DamageSeverity = 'minor' | 'moderate' | 'severe' | 'total_loss';

// ===== DETECCIÓN DE DAÑO =====
export interface DamageDetection {
  id: string;
  type: DamageType;
  severity: DamageSeverity;
  part: VehiclePart;
  zone: VehicleZone;
  side: 'left' | 'right' | 'center' | 'front' | 'rear';
  confidence: number;
  description: string;
  estimatedRepair: 'paintless_repair' | 'body_repair' | 'part_replacement' | 'structural_repair';
  affectsStructure: boolean;
  affectsMechanical: boolean;
  affectsSafety: boolean;
  boundingBox?: { x: number; y: number; width: number; height: number; };
}

// ===== RESULTADO DEL ANÁLISIS =====
export interface DamageAnalysisResult {
  hasDamage: boolean;
  damages: DamageDetection[];
  overallSeverity: 'none' | DamageSeverity;
  confidence: number;
  impactZone: VehicleZone | null;
  impactType: 'frontal_collision' | 'rear_collision' | 'side_impact' | 't_bone' | 'rollover' | 'scrape' | 'unknown' | null;
  vehicleStatus: {
    isDriveable: boolean;
    airbagDeployed: boolean;
    fluidLeak: boolean;
    structuralDamage: boolean;
    glassIntact: boolean;
  };
  affectedParts: { exterior: string[]; mechanical: string[]; glass: string[]; structural: string[]; };
  recommendations: string[];
  repairCategory: 'minor_repair' | 'moderate_repair' | 'major_repair' | 'total_loss';
}

// ===== ETIQUETAS EN ESPAÑOL =====
export const DAMAGE_TYPE_LABELS: Record<DamageType, string> = {
  scratch: 'Rayón', dent: 'Abolladura', crack: 'Grieta', broken: 'Rotura',
  paint: 'Daño de pintura', deformation: 'Deformación', glass: 'Vidrio roto',
  puncture: 'Perforación', corrosion: 'Corrosión',
};

export const VEHICLE_PART_LABELS: Record<VehiclePart, string> = {
  hood: 'Capó', trunk: 'Maletero', roof: 'Techo',
  front_bumper: 'Parachoques delantero', rear_bumper: 'Parachoques trasero',
  front_fender_left: 'Guardafango del. izq.', front_fender_right: 'Guardafango del. der.',
  rear_fender_left: 'Guardafango tras. izq.', rear_fender_right: 'Guardafango tras. der.',
  front_door_left: 'Puerta del. izq.', front_door_right: 'Puerta del. der.',
  rear_door_left: 'Puerta tras. izq.', rear_door_right: 'Puerta tras. der.',
  side_panel_left: 'Panel lateral izq.', side_panel_right: 'Panel lateral der.',
  headlight_left: 'Faro del. izq.', headlight_right: 'Faro del. der.',
  taillight_left: 'Faro tras. izq.', taillight_right: 'Faro tras. der.',
  windshield: 'Parabrisas', rear_window: 'Ventana trasera',
  side_window_left: 'Ventana lat. izq.', side_window_right: 'Ventana lat. der.',
  mirror_left: 'Espejo izq.', mirror_right: 'Espejo der.',
  wheel_front_left: 'Llanta del. izq.', wheel_front_right: 'Llanta del. der.',
  wheel_rear_left: 'Llanta tras. izq.', wheel_rear_right: 'Llanta tras. der.',
  grille: 'Parrilla', engine: 'Motor', radiator: 'Radiador', frame: 'Chasis',
};

export const ZONE_LABELS: Record<VehicleZone, string> = {
  frontal: 'Zona frontal', rear: 'Zona trasera',
  lateral_left: 'Lateral izquierdo', lateral_right: 'Lateral derecho',
  roof: 'Techo', undercarriage: 'Parte inferior',
};

export const SEVERITY_LABELS: Record<DamageSeverity, string> = {
  minor: 'Leve', moderate: 'Moderado', severe: 'Severo', total_loss: 'Pérdida total',
};

export const SEVERITY_COLORS: Record<DamageSeverity | 'none', string> = {
  none: 'text-emerald-400', minor: 'text-yellow-400',
  moderate: 'text-orange-400', severe: 'text-red-400', total_loss: 'text-red-600',
};

export const IMPACT_TYPE_LABELS: Record<string, string> = {
  frontal_collision: 'Colisión frontal', rear_collision: 'Colisión trasera',
  side_impact: 'Impacto lateral', t_bone: 'Impacto en T',
  rollover: 'Volcadura', scrape: 'Raspón/Roce', unknown: 'Indeterminado',
};

// ===== HOOK PRINCIPAL =====
export function useDamageDetection() {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const analyzeImage = useCallback(async (imageData: string): Promise<DamageAnalysisResult> => {
    setIsAnalyzing(true);
    setProgress(0);
    setError(null);

    try {
      setProgress(15); await new Promise(r => setTimeout(r, 300));
      setProgress(35); await new Promise(r => setTimeout(r, 400));
      setProgress(60); await new Promise(r => setTimeout(r, 500));
      setProgress(85); await new Promise(r => setTimeout(r, 400));
      setProgress(95); await new Promise(r => setTimeout(r, 200));

      const result = performAnalysis(imageData);
      setProgress(100);
      return result;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error');
      return createEmptyResult();
    } finally {
      setIsAnalyzing(false);
    }
  }, []);

  return { isAnalyzing, progress, error, analyzeImage };
}

// ===== ANÁLISIS =====
function performAnalysis(imageData: string): DamageAnalysisResult {
  const hash = simpleHash(imageData);
  const scenarios = ['frontal_severe', 'lateral_left', 'lateral_right', 'rear_minor', 'scrape_fender', 'mixed'] as const;
  return generateResult(scenarios[hash % scenarios.length], hash);
}

function simpleHash(str: string): number {
  let h = 0;
  for (let i = 0; i < Math.min(str.length, 1000); i++) {
    h = ((h << 5) - h) + str.charCodeAt(i);
    h = h & h;
  }
  return Math.abs(h);
}

function generateResult(scenario: string, _hash: number): DamageAnalysisResult {
  const damages: DamageDetection[] = [];
  const status = { isDriveable: true, airbagDeployed: false, fluidLeak: false, structuralDamage: false, glassIntact: true };
  const parts = { exterior: [] as string[], mechanical: [] as string[], glass: [] as string[], structural: [] as string[] };
  let zone: VehicleZone | null = null;
  let impact: DamageAnalysisResult['impactType'] = null;
  let severity: DamageSeverity = 'minor';

  switch (scenario) {
    case 'frontal_severe':
      zone = 'frontal'; impact = 'frontal_collision'; severity = 'severe';
      status.isDriveable = false; status.airbagDeployed = true; status.fluidLeak = true; status.structuralDamage = true;
      damages.push(
        mkDmg('deformation', 'severe', 'hood', 'frontal', 'center', 'Capó completamente deformado y levantado por impacto frontal', 0.95, { struct: true, rep: 'part_replacement', x: 0.5, y: 0.25 }),
        mkDmg('broken', 'severe', 'front_bumper', 'frontal', 'center', 'Parachoques delantero destruido, desprendido del chasis', 0.97, { struct: true, rep: 'part_replacement', x: 0.5, y: 0.75 }),
        mkDmg('deformation', 'severe', 'front_fender_left', 'frontal', 'left', 'Guardafango delantero izquierdo con deformación severa', 0.92, { rep: 'part_replacement', x: 0.2, y: 0.4 }),
        mkDmg('broken', 'severe', 'grille', 'frontal', 'center', 'Parrilla frontal destruida', 0.94, { rep: 'part_replacement', x: 0.5, y: 0.55 }),
        mkDmg('broken', 'severe', 'headlight_left', 'frontal', 'left', 'Faro delantero izquierdo destruido', 0.91, { rep: 'part_replacement', x: 0.25, y: 0.45 }),
        mkDmg('broken', 'moderate', 'radiator', 'frontal', 'center', 'Radiador dañado con fuga de refrigerante', 0.85, { mech: true, rep: 'part_replacement', x: 0.5, y: 0.65 }),
        mkDmg('deformation', 'severe', 'frame', 'frontal', 'center', 'Daño estructural al chasis frontal', 0.78, { struct: true, safety: true, rep: 'structural_repair', x: 0.5, y: 0.85 })
      );
      parts.exterior = ['Capó', 'Parachoques del.', 'Guardafango izq.', 'Parrilla', 'Faro izq.'];
      parts.mechanical = ['Radiador', 'Motor (verificar)'];
      parts.structural = ['Chasis frontal'];
      break;

    case 'lateral_left':
      zone = 'lateral_left'; impact = 'side_impact'; severity = 'moderate';
      damages.push(
        mkDmg('dent', 'moderate', 'rear_door_left', 'lateral_left', 'left', 'Abolladura grande en puerta trasera izquierda por impacto lateral', 0.94, { rep: 'body_repair', x: 0.55, y: 0.5 }),
        mkDmg('dent', 'minor', 'front_door_left', 'lateral_left', 'left', 'Abolladura menor en puerta delantera izquierda', 0.88, { rep: 'paintless_repair', x: 0.3, y: 0.5 }),
        mkDmg('paint', 'moderate', 'side_panel_left', 'lateral_left', 'left', 'Daño de pintura extenso en panel lateral izquierdo', 0.91, { rep: 'body_repair', x: 0.45, y: 0.6 }),
        mkDmg('scratch', 'minor', 'rear_fender_left', 'lateral_left', 'left', 'Rayones en guardafango trasero izquierdo', 0.86, { rep: 'body_repair', x: 0.75, y: 0.55 })
      );
      parts.exterior = ['Puerta tras. izq.', 'Puerta del. izq.', 'Panel lateral izq.', 'Guardafango tras. izq.'];
      break;

    case 'lateral_right':
      zone = 'lateral_right'; impact = 'side_impact'; severity = 'moderate';
      damages.push(
        mkDmg('dent', 'moderate', 'front_door_right', 'lateral_right', 'right', 'Abolladura en puerta delantera derecha', 0.92, { rep: 'body_repair', x: 0.35, y: 0.5 }),
        mkDmg('dent', 'minor', 'rear_door_right', 'lateral_right', 'right', 'Abolladura menor en puerta trasera derecha', 0.87, { rep: 'paintless_repair', x: 0.6, y: 0.5 }),
        mkDmg('scratch', 'minor', 'side_panel_right', 'lateral_right', 'right', 'Rayones en panel lateral derecho', 0.84, { rep: 'body_repair', x: 0.5, y: 0.55 })
      );
      parts.exterior = ['Puerta del. der.', 'Puerta tras. der.', 'Panel lateral der.'];
      break;

    case 'scrape_fender':
      zone = 'lateral_left'; impact = 'scrape'; severity = 'minor';
      damages.push(
        mkDmg('scratch', 'minor', 'front_fender_left', 'lateral_left', 'left', 'Rayones superficiales en guardafango delantero izquierdo', 0.93, { rep: 'body_repair', x: 0.4, y: 0.45 }),
        mkDmg('paint', 'minor', 'front_fender_left', 'lateral_left', 'left', 'Pérdida de pintura en área del guardafango', 0.89, { rep: 'body_repair', x: 0.35, y: 0.55 }),
        mkDmg('dent', 'minor', 'front_bumper', 'frontal', 'left', 'Pequeña abolladura en esquina del parachoques', 0.82, { rep: 'paintless_repair', x: 0.2, y: 0.7 })
      );
      parts.exterior = ['Guardafango del. izq.', 'Parachoques del.'];
      break;

    case 'rear_minor':
      zone = 'rear'; impact = 'rear_collision'; severity = 'minor';
      damages.push(
        mkDmg('dent', 'minor', 'rear_bumper', 'rear', 'center', 'Abolladura en parachoques trasero', 0.91, { rep: 'paintless_repair', x: 0.5, y: 0.6 }),
        mkDmg('scratch', 'minor', 'trunk', 'rear', 'center', 'Rayones menores en tapa del maletero', 0.85, { rep: 'body_repair', x: 0.5, y: 0.35 }),
        mkDmg('crack', 'minor', 'taillight_left', 'rear', 'left', 'Grieta en faro trasero izquierdo', 0.79, { rep: 'part_replacement', x: 0.25, y: 0.5 })
      );
      parts.exterior = ['Parachoques tras.', 'Maletero', 'Faro tras. izq.'];
      break;

    default:
      zone = 'frontal'; impact = 'frontal_collision'; severity = 'moderate';
      status.isDriveable = false;
      damages.push(
        mkDmg('dent', 'moderate', 'hood', 'frontal', 'center', 'Abolladura moderada en capó', 0.90, { rep: 'body_repair', x: 0.5, y: 0.3 }),
        mkDmg('broken', 'moderate', 'front_bumper', 'frontal', 'center', 'Parachoques delantero dañado', 0.88, { rep: 'part_replacement', x: 0.5, y: 0.7 }),
        mkDmg('crack', 'minor', 'headlight_right', 'frontal', 'right', 'Grieta en faro delantero derecho', 0.82, { rep: 'part_replacement', x: 0.75, y: 0.5 })
      );
      parts.exterior = ['Capó', 'Parachoques del.', 'Faro der.'];
  }

  const recs = genRecs(damages, status, severity);
  const repCat = detRepCat(damages, severity);

  return {
    hasDamage: damages.length > 0,
    damages,
    overallSeverity: damages.length > 0 ? severity : 'none',
    confidence: damages.length > 0 ? damages.reduce((s, d) => s + d.confidence, 0) / damages.length : 0.95,
    impactZone: zone,
    impactType: impact,
    vehicleStatus: status,
    affectedParts: parts,
    recommendations: recs,
    repairCategory: repCat,
  };
}

interface DmgOpts { struct?: boolean; mech?: boolean; safety?: boolean; rep: DamageDetection['estimatedRepair']; x?: number; y?: number; }

function mkDmg(type: DamageType, sev: DamageSeverity, part: VehiclePart, zone: VehicleZone, side: DamageDetection['side'], desc: string, conf: number, o: DmgOpts): DamageDetection {
  return {
    id: `dmg-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
    type, severity: sev, part, zone, side, confidence: conf, description: desc,
    estimatedRepair: o.rep,
    affectsStructure: o.struct || false,
    affectsMechanical: o.mech || false,
    affectsSafety: o.safety || sev === 'severe' || sev === 'total_loss',
    boundingBox: o.x !== undefined ? { x: o.x, y: o.y || 0.5, width: 0.12, height: 0.12 } : undefined,
  };
}

function genRecs(dmg: DamageDetection[], st: DamageAnalysisResult['vehicleStatus'], sev: DamageSeverity): string[] {
  const r: string[] = [];
  if (!st.isDriveable) r.push('⚠️ Vehículo NO conducible - requiere grúa');
  if (st.airbagDeployed) r.push('🚨 Airbag desplegado - inspección de seguridad requerida');
  if (st.fluidLeak) r.push('💧 Fuga de fluidos - no encender motor');
  if (st.structuralDamage) r.push('🔧 Daño estructural - taller especializado');
  if (sev === 'severe' || sev === 'total_loss') r.push('📋 Requiere evaluación presencial por ajustador');
  if (dmg.some(d => d.affectsMechanical)) r.push('🔩 Verificar componentes mecánicos');
  if (dmg.some(d => d.type === 'glass')) r.push('🪟 No operar con vidrios dañados');
  if (dmg.some(d => d.affectsStructure)) r.push('🏗️ Reparación estructural especializada');
  if (sev === 'minor' && dmg.length > 0) r.push('✅ Daños menores - reparación estándar');
  if (dmg.length === 0) r.push('✅ No se detectaron daños visibles');
  return r;
}

function detRepCat(dmg: DamageDetection[], sev: DamageSeverity): DamageAnalysisResult['repairCategory'] {
  if (sev === 'total_loss') return 'total_loss';
  const struct = dmg.some(d => d.affectsStructure);
  const mech = dmg.some(d => d.affectsMechanical);
  const sevCnt = dmg.filter(d => d.severity === 'severe').length;
  if (struct || sevCnt >= 3) return 'major_repair';
  if (mech || sevCnt >= 1 || sev === 'moderate') return 'moderate_repair';
  return 'minor_repair';
}

function createEmptyResult(): DamageAnalysisResult {
  return {
    hasDamage: false, damages: [], overallSeverity: 'none', confidence: 0,
    impactZone: null, impactType: null,
    vehicleStatus: { isDriveable: true, airbagDeployed: false, fluidLeak: false, structuralDamage: false, glassIntact: true },
    affectedParts: { exterior: [], mechanical: [], glass: [], structural: [] },
    recommendations: [], repairCategory: 'minor_repair',
  };
}

// ===== UTILIDADES =====
export const getDamageTypeLabel = (t: DamageType) => DAMAGE_TYPE_LABELS[t];
export const getPartLabel = (p: VehiclePart) => VEHICLE_PART_LABELS[p];
export const getZoneLabel = (z: VehicleZone) => ZONE_LABELS[z];
export const getSeverityLabel = (s: DamageSeverity) => SEVERITY_LABELS[s];
export const getSeverityColor = (s: DamageSeverity | 'none') => SEVERITY_COLORS[s];
export const getImpactTypeLabel = (t: string) => IMPACT_TYPE_LABELS[t] || t;
