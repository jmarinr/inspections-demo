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

// ===== CLAUDE API PROMPT =====
const DAMAGE_ANALYSIS_PROMPT = `Eres un perito de seguros experto en evaluación de daños vehiculares. Analiza esta foto de un vehículo y detecta TODOS los daños visibles.

IMPORTANTE: Solo reporta daños que REALMENTE puedes ver en la imagen. No inventes daños que no existen. Si no ves daños, indica que no hay daños visibles.

Responde SOLO con un JSON válido (sin markdown, sin backticks) con esta estructura exacta:

{
  "hasDamage": boolean,
  "impactZone": "frontal" | "rear" | "lateral_left" | "lateral_right" | "roof" | null,
  "impactType": "frontal_collision" | "rear_collision" | "side_impact" | "scrape" | "unknown" | null,
  "overallSeverity": "none" | "minor" | "moderate" | "severe" | "total_loss",
  "isDriveable": boolean,
  "airbagDeployed": boolean,
  "fluidLeak": boolean,
  "structuralDamage": boolean,
  "glassIntact": boolean,
  "damages": [
    {
      "type": "scratch" | "dent" | "crack" | "broken" | "paint" | "deformation" | "glass" | "puncture" | "corrosion",
      "severity": "minor" | "moderate" | "severe",
      "part": string (usar: hood, trunk, front_bumper, rear_bumper, front_fender_left, front_fender_right, rear_fender_left, rear_fender_right, front_door_left, front_door_right, rear_door_left, rear_door_right, side_panel_left, side_panel_right, headlight_left, headlight_right, taillight_left, taillight_right, windshield, rear_window, mirror_left, mirror_right, grille, wheel_front_left, wheel_front_right, frame),
      "zone": "frontal" | "rear" | "lateral_left" | "lateral_right",
      "side": "left" | "right" | "center" | "front" | "rear",
      "confidence": number (0-1),
      "description": string (descripción en español del daño visible),
      "estimatedRepair": "paintless_repair" | "body_repair" | "part_replacement" | "structural_repair",
      "affectsStructure": boolean,
      "affectsMechanical": boolean,
      "affectsSafety": boolean,
      "boundingBox": { "x": number (0-1 centro), "y": number (0-1 centro), "width": number (0-1), "height": number (0-1) }
    }
  ],
  "recommendations": [string] (recomendaciones en español)
}

Para boundingBox: usa coordenadas normalizadas 0-1 donde (0,0) es esquina superior izquierda. x,y es el CENTRO del box. Sé preciso ubicando cada daño donde realmente está en la imagen.`;

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
      setProgress(10);
      
      // Try Claude API first
      const result = await analyzeWithClaude(imageData, (p) => setProgress(p));
      setProgress(100);
      return result;
    } catch (err) {
      console.warn('[DamageDetection] Claude API failed, using fallback:', err);
      setError(err instanceof Error ? err.message : 'Error al analizar');
      return createEmptyResult();
    } finally {
      setIsAnalyzing(false);
    }
  }, []);

  return { isAnalyzing, progress, error, analyzeImage };
}

// ===== CLAUDE API ANALYSIS =====
async function analyzeWithClaude(
  imageData: string,
  onProgress: (p: number) => void
): Promise<DamageAnalysisResult> {
  onProgress(15);
  
  // Extract base64 and media type
  const mediaTypeMatch = imageData.match(/^data:(image\/\w+);base64,/);
  const mediaType = mediaTypeMatch ? mediaTypeMatch[1] : 'image/jpeg';
  const base64Data = imageData.replace(/^data:image\/\w+;base64,/, '');
  
  onProgress(25);

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2000,
      messages: [{
        role: 'user',
        content: [
          {
            type: 'image',
            source: { type: 'base64', media_type: mediaType, data: base64Data }
          },
          { type: 'text', text: DAMAGE_ANALYSIS_PROMPT }
        ]
      }]
    })
  });

  onProgress(70);

  if (!response.ok) {
    const errText = await response.text();
    console.error('[DamageDetection] API error:', response.status, errText);
    throw new Error(`API error ${response.status}`);
  }

  const data = await response.json();
  onProgress(85);

  // Extract text response
  const textContent = data.content?.find((c: any) => c.type === 'text')?.text || '';
  console.log('[DamageDetection] Claude response:', textContent);

  // Parse JSON from response
  const jsonStr = textContent.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
  const parsed = JSON.parse(jsonStr);
  
  onProgress(95);
  return mapClaudeResponse(parsed);
}

// ===== MAP CLAUDE RESPONSE TO OUR TYPES =====
function mapClaudeResponse(raw: any): DamageAnalysisResult {
  const damages: DamageDetection[] = (raw.damages || []).map((d: any, idx: number) => ({
    id: `dmg-${Date.now()}-${idx}`,
    type: d.type || 'dent',
    severity: d.severity || 'minor',
    part: d.part || 'front_bumper',
    zone: d.zone || 'frontal',
    side: d.side || 'center',
    confidence: d.confidence || 0.8,
    description: d.description || 'Daño detectado',
    estimatedRepair: d.estimatedRepair || 'body_repair',
    affectsStructure: d.affectsStructure || false,
    affectsMechanical: d.affectsMechanical || false,
    affectsSafety: d.affectsSafety || false,
    boundingBox: d.boundingBox ? {
      x: d.boundingBox.x,
      y: d.boundingBox.y,
      width: d.boundingBox.width || 0.12,
      height: d.boundingBox.height || 0.12,
    } : undefined,
  }));

  const severity = raw.overallSeverity || 'none';
  const parts = { exterior: [] as string[], mechanical: [] as string[], glass: [] as string[], structural: [] as string[] };
  
  for (const d of damages) {
    const label = VEHICLE_PART_LABELS[d.part] || d.part;
    if (d.type === 'glass') parts.glass.push(label);
    else if (d.affectsStructure) parts.structural.push(label);
    else if (d.affectsMechanical) parts.mechanical.push(label);
    else parts.exterior.push(label);
  }

  const repairCategory = severity === 'total_loss' ? 'total_loss' as const
    : damages.some(d => d.affectsStructure) ? 'major_repair' as const
    : severity === 'severe' || severity === 'moderate' ? 'moderate_repair' as const
    : 'minor_repair' as const;

  return {
    hasDamage: raw.hasDamage ?? damages.length > 0,
    damages,
    overallSeverity: severity,
    confidence: damages.length > 0 ? damages.reduce((s, d) => s + d.confidence, 0) / damages.length : 0.95,
    impactZone: raw.impactZone || null,
    impactType: raw.impactType || null,
    vehicleStatus: {
      isDriveable: raw.isDriveable ?? true,
      airbagDeployed: raw.airbagDeployed ?? false,
      fluidLeak: raw.fluidLeak ?? false,
      structuralDamage: raw.structuralDamage ?? false,
      glassIntact: raw.glassIntact ?? true,
    },
    affectedParts: parts,
    recommendations: raw.recommendations || [],
    repairCategory,
  };
}

function createEmptyResult(): DamageAnalysisResult {
  return {
    hasDamage: false, damages: [], overallSeverity: 'none', confidence: 0,
    impactZone: null, impactType: null,
    vehicleStatus: { isDriveable: true, airbagDeployed: false, fluidLeak: false, structuralDamage: false, glassIntact: true },
    affectedParts: { exterior: [], mechanical: [], glass: [], structural: [] },
    recommendations: ['No se pudo analizar la imagen. Intenta con otra foto.'], repairCategory: 'minor_repair',
  };
}

// ===== UTILIDADES =====
export const getDamageTypeLabel = (t: DamageType) => DAMAGE_TYPE_LABELS[t] || t;
export const getPartLabel = (p: VehiclePart) => VEHICLE_PART_LABELS[p] || p;
export const getZoneLabel = (z: VehicleZone) => ZONE_LABELS[z] || z;
export const getSeverityLabel = (s: DamageSeverity) => SEVERITY_LABELS[s] || s;
export const getSeverityColor = (s: DamageSeverity | 'none') => SEVERITY_COLORS[s] || '';
export const getImpactTypeLabel = (t: string) => IMPACT_TYPE_LABELS[t] || t;
