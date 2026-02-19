import { useState, useCallback } from 'react';

// ===== TIPOS DE DAÑO =====
export type DamageType = 
  | 'scratch' | 'dent' | 'crack' | 'broken' | 'paint' 
  | 'deformation' | 'glass' | 'puncture' | 'corrosion';

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

export type VehicleZone = 'frontal' | 'rear' | 'lateral_left' | 'lateral_right' | 'roof' | 'undercarriage';
export type DamageSeverity = 'minor' | 'moderate' | 'severe' | 'total_loss';

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

// ===== ETIQUETAS =====
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
const DAMAGE_PROMPT = `Eres un perito de seguros experto. Analiza esta foto y detecta TODOS los daños visibles del vehículo.

IMPORTANTE: Solo reporta daños que REALMENTE puedes ver. No inventes. Si no hay daños, responde hasDamage: false.

Responde SOLO con JSON válido (sin markdown, sin backticks):

{
  "hasDamage": boolean,
  "impactZone": "frontal"|"rear"|"lateral_left"|"lateral_right"|null,
  "impactType": "frontal_collision"|"rear_collision"|"side_impact"|"scrape"|"unknown"|null,
  "overallSeverity": "none"|"minor"|"moderate"|"severe"|"total_loss",
  "isDriveable": boolean,
  "airbagDeployed": boolean,
  "fluidLeak": boolean,
  "structuralDamage": boolean,
  "glassIntact": boolean,
  "damages": [
    {
      "type": "scratch"|"dent"|"crack"|"broken"|"paint"|"deformation"|"glass"|"puncture"|"corrosion",
      "severity": "minor"|"moderate"|"severe",
      "part": "hood"|"trunk"|"front_bumper"|"rear_bumper"|"front_fender_left"|"front_fender_right"|"rear_fender_left"|"rear_fender_right"|"front_door_left"|"front_door_right"|"rear_door_left"|"rear_door_right"|"side_panel_left"|"side_panel_right"|"headlight_left"|"headlight_right"|"taillight_left"|"taillight_right"|"windshield"|"rear_window"|"mirror_left"|"mirror_right"|"grille"|"frame",
      "zone": "frontal"|"rear"|"lateral_left"|"lateral_right",
      "side": "left"|"right"|"center"|"front"|"rear",
      "confidence": 0.0-1.0,
      "description": "descripción en español",
      "estimatedRepair": "paintless_repair"|"body_repair"|"part_replacement"|"structural_repair",
      "affectsStructure": boolean,
      "affectsMechanical": boolean,
      "affectsSafety": boolean,
      "boundingBox": {"x": 0.0-1.0, "y": 0.0-1.0, "width": 0.05-0.4, "height": 0.05-0.4}
    }
  ],
  "recommendations": ["string en español"]
}

boundingBox: coordenadas normalizadas 0-1, (0,0)=esquina superior izquierda. x,y=CENTRO del box. Ubica cada daño DONDE REALMENTE ESTÁ en la imagen.`;

// ===== HOOK =====
export function useDamageDetection() {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const analyzeImage = useCallback(async (imageData: string): Promise<DamageAnalysisResult> => {
    setIsAnalyzing(true);
    setProgress(0);
    setError(null);

    try {
      // Try Claude API first
      setProgress(10);
      const result = await analyzeWithClaude(imageData, (p) => setProgress(p));
      setProgress(100);
      console.log('[DamageDetection] Claude API success:', result.damages.length, 'damages');
      return result;
    } catch (err) {
      console.warn('[DamageDetection] Claude API unavailable, using smart fallback:', err);
      // Smart canvas-based fallback
      setProgress(50);
      const fallback = await analyzeWithCanvas(imageData);
      setProgress(100);
      return fallback;
    } finally {
      setIsAnalyzing(false);
    }
  }, []);

  return { isAnalyzing, progress, error, analyzeImage };
}

// ===== CLAUDE API =====
async function analyzeWithClaude(imageData: string, onProgress: (p: number) => void): Promise<DamageAnalysisResult> {
  const mediaTypeMatch = imageData.match(/^data:(image\/\w+);base64,/);
  const mediaType = mediaTypeMatch ? mediaTypeMatch[1] : 'image/jpeg';
  const base64Data = imageData.replace(/^data:image\/\w+;base64,/, '');
  
  onProgress(20);

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2000,
      messages: [{
        role: 'user',
        content: [
          { type: 'image', source: { type: 'base64', media_type: mediaType, data: base64Data } },
          { type: 'text', text: DAMAGE_PROMPT }
        ]
      }]
    })
  });

  onProgress(70);

  if (!response.ok) throw new Error(`API ${response.status}`);

  const data = await response.json();
  const text = data.content?.find((c: any) => c.type === 'text')?.text || '';
  const json = JSON.parse(text.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim());
  
  onProgress(90);
  return mapResponse(json);
}

// ===== SMART CANVAS FALLBACK =====
// Multi-pass image analysis: edges, local contrast, texture irregularity
async function analyzeWithCanvas(imageData: string): Promise<DamageAnalysisResult> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      // Use higher resolution for better detection
      const maxDim = 400;
      const scale = Math.min(maxDim / img.width, maxDim / img.height, 1);
      const W = Math.floor(img.width * scale);
      const H = Math.floor(img.height * scale);
      canvas.width = W;
      canvas.height = H;
      const ctx = canvas.getContext('2d');
      
      if (!ctx) { resolve(createEmptyResult()); return; }
      
      ctx.drawImage(img, 0, 0, W, H);
      const imgData = ctx.getImageData(0, 0, W, H);
      const px = imgData.data;
      
      // === PASS 1: Compute Sobel edge map ===
      const edgeMap = new Float32Array(W * H);
      for (let y = 1; y < H - 1; y++) {
        for (let x = 1; x < W - 1; x++) {
          const idx = (y * W + x);
          // Grayscale values of 3x3 neighborhood
          const g = (ix: number, iy: number) => {
            const i = (iy * W + ix) * 4;
            return (px[i] + px[i+1] + px[i+2]) / 3;
          };
          // Sobel
          const gx = -g(x-1,y-1) - 2*g(x-1,y) - g(x-1,y+1) + g(x+1,y-1) + 2*g(x+1,y) + g(x+1,y+1);
          const gy = -g(x-1,y-1) - 2*g(x,y-1) - g(x+1,y-1) + g(x-1,y+1) + 2*g(x,y+1) + g(x+1,y+1);
          edgeMap[idx] = Math.sqrt(gx*gx + gy*gy);
        }
      }
      
      // === PASS 2: Grid analysis with finer grid ===
      const gridCols = 8;
      const gridRows = 6;
      const cellW = W / gridCols;
      const cellH = H / gridRows;
      
      interface Cell {
        row: number; col: number;
        edgeStrength: number;    // Average edge magnitude
        edgePeak: number;        // Max edge in cell
        brightness: number;
        colorStd: number;        // Color standard deviation (texture roughness)
        localContrast: number;   // Contrast between this cell and neighbors
      }
      
      const cells: Cell[] = [];
      
      for (let row = 0; row < gridRows; row++) {
        for (let col = 0; col < gridCols; col++) {
          const sx = Math.floor(col * cellW);
          const sy = Math.floor(row * cellH);
          const ex = Math.floor((col + 1) * cellW);
          const ey = Math.floor((row + 1) * cellH);
          
          let edgeSum = 0, edgeMax = 0, brSum = 0;
          let rSum = 0, gSum = 0, bSum = 0;
          let count = 0;
          const rgbs: number[][] = [];
          
          for (let y = sy; y < ey; y++) {
            for (let x = sx; x < ex; x++) {
              const i = (y * W + x) * 4;
              const r = px[i], g = px[i+1], b = px[i+2];
              rSum += r; gSum += g; bSum += b;
              brSum += (r + g + b) / 3;
              const e = edgeMap[y * W + x];
              edgeSum += e;
              if (e > edgeMax) edgeMax = e;
              count++;
              if (count % 3 === 0) rgbs.push([r, g, b]); // sample
            }
          }
          
          const avgR = rSum / count, avgG = gSum / count, avgB = bSum / count;
          
          // Color standard deviation
          let colorVar = 0;
          for (const [r, g, b] of rgbs) {
            colorVar += (r - avgR) ** 2 + (g - avgG) ** 2 + (b - avgB) ** 2;
          }
          const colorStd = Math.sqrt(colorVar / Math.max(rgbs.length, 1));
          
          cells.push({
            row, col,
            edgeStrength: edgeSum / count,
            edgePeak: edgeMax,
            brightness: brSum / count,
            colorStd,
            localContrast: 0, // computed below
          });
        }
      }
      
      // === PASS 3: Compute local contrast (difference from neighbors) ===
      for (let i = 0; i < cells.length; i++) {
        const c = cells[i];
        let neighborDiff = 0, nCount = 0;
        for (const other of cells) {
          if (Math.abs(other.row - c.row) <= 1 && Math.abs(other.col - c.col) <= 1 && other !== c) {
            neighborDiff += Math.abs(c.edgeStrength - other.edgeStrength);
            neighborDiff += Math.abs(c.colorStd - other.colorStd) * 0.3;
            neighborDiff += Math.abs(c.brightness - other.brightness) * 0.2;
            nCount++;
          }
        }
        c.localContrast = nCount > 0 ? neighborDiff / nCount : 0;
      }
      
      // === PASS 4: Score each cell for damage likelihood ===
      const avgEdge = cells.reduce((s, c) => s + c.edgeStrength, 0) / cells.length;
      const avgColorStd = cells.reduce((s, c) => s + c.colorStd, 0) / cells.length;
      const avgContrast = cells.reduce((s, c) => s + c.localContrast, 0) / cells.length;
      const avgBr = cells.reduce((s, c) => s + c.brightness, 0) / cells.length;
      
      interface ScoredCell extends Cell {
        score: number;
      }
      
      const scored: ScoredCell[] = cells.map(c => {
        let score = 0;
        
        // High edge density = likely damage (deformation, cracks, scratches)
        if (c.edgeStrength > avgEdge * 1.3) score += (c.edgeStrength / avgEdge - 1) * 30;
        if (c.edgePeak > avgEdge * 4) score += 15; // Very sharp edge = definite feature
        
        // High color variation = damage (mixed paint, exposed metal, dirt)
        if (c.colorStd > avgColorStd * 1.3) score += (c.colorStd / avgColorStd - 1) * 20;
        
        // High local contrast = anomaly relative to surroundings
        if (c.localContrast > avgContrast * 1.3) score += (c.localContrast / avgContrast - 1) * 25;
        
        // Dark spots (shadows from dents, holes)
        if (c.brightness < avgBr * 0.65) score += 15;
        
        // Very bright spots (exposed metal, glass reflection from break)
        if (c.brightness > avgBr * 1.5 && c.edgeStrength > avgEdge) score += 10;
        
        // Bonus for cells in the center-bottom region (where damage usually is on vehicle photos)
        if (c.row >= gridRows * 0.3 && c.row <= gridRows * 0.85) score += 5;
        
        return { ...c, score };
      });
      
      // === PASS 5: Threshold and cluster damage cells ===
      // Use percentile-based threshold
      const sortedScores = scored.map(s => s.score).sort((a, b) => b - a);
      const threshold = Math.max(
        sortedScores[Math.floor(sortedScores.length * 0.2)] || 10, // top 20%
        15 // minimum threshold
      );
      
      const damageCells = scored.filter(c => c.score >= threshold);
      console.log('[CanvasDetect] Threshold:', threshold.toFixed(1), 'Damage cells:', damageCells.length, '/', cells.length);
      
      // Cluster adjacent damage cells using flood fill
      const visited = new Set<string>();
      const clusters: ScoredCell[][] = [];
      
      for (const cell of damageCells) {
        const key = `${cell.row}-${cell.col}`;
        if (visited.has(key)) continue;
        
        // BFS flood fill
        const cluster: ScoredCell[] = [];
        const queue = [cell];
        visited.add(key);
        
        while (queue.length > 0) {
          const current = queue.shift()!;
          cluster.push(current);
          
          // Check 8-connected neighbors
          for (const other of damageCells) {
            const oKey = `${other.row}-${other.col}`;
            if (visited.has(oKey)) continue;
            if (Math.abs(other.row - current.row) <= 1 && Math.abs(other.col - current.col) <= 1) {
              visited.add(oKey);
              queue.push(other);
            }
          }
        }
        
        clusters.push(cluster);
      }
      
      // Sort clusters by total score (most significant first)
      clusters.sort((a, b) => {
        const scoreA = a.reduce((s, c) => s + c.score, 0);
        const scoreB = b.reduce((s, c) => s + c.score, 0);
        return scoreB - scoreA;
      });
      
      // === PASS 5b: Split large clusters into sub-regions ===
      // When a cluster covers >25% of cells, the damage is massive - split by quadrant
      const totalCells = gridCols * gridRows;
      const finalClusters: ScoredCell[][] = [];
      
      for (const cluster of clusters) {
        if (cluster.length > totalCells * 0.25) {
          // Split into quadrants based on grid position
          const midRow = (Math.min(...cluster.map(c => c.row)) + Math.max(...cluster.map(c => c.row))) / 2;
          const midCol = (Math.min(...cluster.map(c => c.col)) + Math.max(...cluster.map(c => c.col))) / 2;
          
          const quads: ScoredCell[][] = [[], [], [], []];
          for (const c of cluster) {
            const qi = (c.row <= midRow ? 0 : 2) + (c.col <= midCol ? 0 : 1);
            quads[qi].push(c);
          }
          for (const q of quads) {
            if (q.length >= 2) finalClusters.push(q);
          }
        } else {
          finalClusters.push(cluster);
        }
      }
      
      // Re-sort
      finalClusters.sort((a, b) => {
        const scoreA = a.reduce((s, c) => s + c.score, 0);
        const scoreB = b.reduce((s, c) => s + c.score, 0);
        return scoreB - scoreA;
      });
      
      // === PASS 6: Convert clusters to damage detections ===
      const damages: DamageDetection[] = [];
      // Track used parts to vary assignments
      const usedParts = new Set<VehiclePart>();
      
      for (const cluster of finalClusters.slice(0, 8)) { // max 8 damage zones
        if (cluster.length === 0) continue;
        
        const totalScore = cluster.reduce((s, c) => s + c.score, 0);
        const avgScore = totalScore / cluster.length;
        
        // Compute bounding box
        const minCol = Math.min(...cluster.map(c => c.col));
        const maxCol = Math.max(...cluster.map(c => c.col));
        const minRow = Math.min(...cluster.map(c => c.row));
        const maxRow = Math.max(...cluster.map(c => c.row));
        
        const cx = ((minCol + maxCol) / 2 + 0.5) / gridCols;
        const cy = ((minRow + maxRow) / 2 + 0.5) / gridRows;
        const bw = Math.max(0.06, ((maxCol - minCol + 1) / gridCols) * 1.1);
        const bh = Math.max(0.06, ((maxRow - minRow + 1) / gridRows) * 1.1);
        
        // Severity: larger clusters = more severe, high scores = more severe
        const clusterCoverage = cluster.length / totalCells;
        const severity: DamageSeverity = avgScore > 35 || clusterCoverage > 0.12 ? 'severe' 
          : avgScore > 20 || clusterCoverage > 0.06 ? 'moderate' : 'minor';
        
        // Determine damage type
        const avgEdgeC = cluster.reduce((s, c) => s + c.edgeStrength, 0) / cluster.length;
        const avgColorC = cluster.reduce((s, c) => s + c.colorStd, 0) / cluster.length;
        const avgBrC = cluster.reduce((s, c) => s + c.brightness, 0) / cluster.length;
        
        let type: DamageType;
        if (avgEdgeC > avgEdge * 2.5 && avgColorC > avgColorStd * 1.5) type = 'deformation';
        else if (avgEdgeC > avgEdge * 2) type = 'crack';
        else if (avgBrC < avgBr * 0.6) type = 'dent';
        else if (avgColorC > avgColorStd * 1.8) type = 'paint';
        else if (avgEdgeC > avgEdge * 1.5) type = 'scratch';
        else type = 'dent';
        
        if (cluster.length >= 4) type = 'deformation';
        if (cluster.length >= 3 && type === 'dent') type = 'deformation';
        
        // Get part, avoid duplicates by trying alternate parts
        let { part, zone, side } = getPartFromPosition(cx, cy);
        if (usedParts.has(part)) {
          const alt = getAlternatePart(cx, cy, usedParts);
          part = alt.part; zone = alt.zone; side = alt.side;
        }
        usedParts.add(part);
        
        const partLabel = VEHICLE_PART_LABELS[part] || part;
        const typeLabel = DAMAGE_TYPE_LABELS[type] || type;
        
        const repairType = severity === 'severe' ? 'part_replacement' as const
          : severity === 'moderate' || type === 'deformation' ? 'body_repair' as const
          : 'paintless_repair' as const;
        
        damages.push({
          id: `dmg-${Date.now()}-${damages.length}`,
          type,
          severity,
          part, zone, side,
          confidence: Math.min(0.92, 0.60 + avgScore * 0.005 + cluster.length * 0.03),
          description: `${typeLabel} ${severity === 'severe' ? 'severa' : severity === 'moderate' ? 'moderada' : 'leve'} en ${partLabel}`,
          estimatedRepair: repairType,
          affectsStructure: severity === 'severe' || type === 'deformation',
          affectsMechanical: type === 'deformation' && severity === 'severe',
          affectsSafety: severity === 'severe',
          boundingBox: { x: cx, y: cy, width: bw, height: bh },
        });
      }
      
      // === Build result ===
      // If majority of cells are damaged, this is likely total loss
      const damageRatio = damageCells.length / totalCells;
      const overallSev = damages.length === 0 ? 'none' as const
        : damageRatio > 0.5 || (damages.filter(d => d.severity === 'severe').length >= 3) ? 'severe' as const
        : damages.some(d => d.severity === 'severe') ? 'severe' as const
        : damages.some(d => d.severity === 'moderate') ? 'moderate' as const
        : 'minor' as const;
      
      // Detect total loss
      const isTotalLoss = damageRatio > 0.6 || damages.filter(d => d.severity === 'severe').length >= 4;
      
      const parts = { exterior: [] as string[], mechanical: [] as string[], glass: [] as string[], structural: [] as string[] };
      for (const d of damages) {
        const label = VEHICLE_PART_LABELS[d.part] || d.part;
        if (d.affectsStructure) parts.structural.push(label);
        else if (d.affectsMechanical) parts.mechanical.push(label);
        else parts.exterior.push(label);
      }
      
      const recs: string[] = [];
      if (isTotalLoss) {
        recs.push('🚨 Daños masivos - posible pérdida total');
        recs.push('⚠️ Daño estructural severo detectado');
      } else if (overallSev === 'severe') {
        recs.push('🚨 Daño severo detectado - evaluación presencial requerida');
        recs.push('⚠️ Posible daño estructural');
      }
      if (overallSev === 'moderate') recs.push('⚠️ Daños moderados - se requiere reparación en taller');
      if (overallSev === 'minor') recs.push('✅ Daños menores - reparación estándar');
      if (damages.some(d => d.affectsStructure)) recs.push('🔧 Requiere taller especializado en estructura');
      if (damages.length === 0) recs.push('ℹ️ No se detectaron daños significativos');
      recs.push('📋 Se recomienda validación por ajustador certificado');
      
      const isDriveable = !isTotalLoss && overallSev !== 'severe' && !damages.some(d => d.affectsMechanical);
      
      resolve({
        hasDamage: damages.length > 0,
        damages,
        overallSeverity: isTotalLoss ? 'total_loss' : overallSev,
        confidence: damages.length > 0 ? damages.reduce((s, d) => s + d.confidence, 0) / damages.length : 0.5,
        impactZone: damages[0]?.zone || null,
        impactType: damages.length >= 3 ? ('frontal_collision' as const) : damages.length > 0 ? ('unknown' as const) : null,
        vehicleStatus: {
          isDriveable,
          airbagDeployed: overallSev === 'severe' && damages.length >= 4,
          fluidLeak: damages.some(d => d.part === 'radiator' || (d.part === 'hood' && d.severity === 'severe')),
          structuralDamage: damages.some(d => d.affectsStructure),
          glassIntact: !damages.some(d => d.type === 'glass'),
        },
        affectedParts: parts,
        recommendations: recs,
        repairCategory: isTotalLoss ? 'total_loss' 
          : overallSev === 'severe' ? 'major_repair' 
          : overallSev === 'moderate' ? 'moderate_repair' : 'minor_repair',
      });
    };
    img.onerror = () => resolve(createEmptyResult());
    img.src = imageData;
  });
}

// Map normalized x,y position to vehicle part (more granular)
function getPartFromPosition(x: number, y: number): { part: VehiclePart; zone: VehicleZone; side: DamageDetection['side'] } {
  // Horizontal zones
  const isLeft = x < 0.33;
  const isRight = x > 0.67;
  
  const side = isLeft ? 'left' as const : isRight ? 'right' as const : 'center' as const;
  
  // Vertical zones (6 bands)
  if (y < 0.15) {
    // Very top: roof / windshield area
    if (isLeft) return { part: 'mirror_left', zone: 'lateral_left', side: 'left' };
    if (isRight) return { part: 'mirror_right', zone: 'lateral_right', side: 'right' };
    return { part: 'windshield', zone: 'frontal', side };
  }
  if (y < 0.3) {
    // Upper: hood, windshield, A-pillar area
    if (isLeft) return { part: 'front_fender_left', zone: 'frontal', side: 'left' };
    if (isRight) return { part: 'front_fender_right', zone: 'frontal', side: 'right' };
    return { part: 'hood', zone: 'frontal', side };
  }
  if (y < 0.45) {
    // Upper-middle: doors, front fender
    if (isLeft) return { part: 'front_door_left', zone: 'lateral_left', side: 'left' };
    if (isRight) return { part: 'front_door_right', zone: 'lateral_right', side: 'right' };
    return { part: 'grille', zone: 'frontal', side };
  }
  if (y < 0.6) {
    // Mid: headlights, grille, doors
    if (isLeft) return { part: 'headlight_left', zone: 'frontal', side: 'left' };
    if (isRight) return { part: 'headlight_right', zone: 'frontal', side: 'right' };
    return { part: 'front_bumper', zone: 'frontal', side };
  }
  if (y < 0.75) {
    // Lower-mid: bumper, side panels
    if (isLeft) return { part: 'side_panel_left', zone: 'lateral_left', side: 'left' };
    if (isRight) return { part: 'side_panel_right', zone: 'lateral_right', side: 'right' };
    return { part: 'front_bumper', zone: 'frontal', side };
  }
  // Bottom: wheels, undercarriage
  if (isLeft) return { part: 'wheel_front_left', zone: 'frontal', side: 'left' };
  if (isRight) return { part: 'wheel_front_right', zone: 'frontal', side: 'right' };
  return { part: 'front_bumper', zone: 'frontal', side };
}

// Get an alternate part when the primary is already used
function getAlternatePart(x: number, y: number, used: Set<VehiclePart>): { part: VehiclePart; zone: VehicleZone; side: DamageDetection['side'] } {
  const isLeft = x < 0.4;
  const isRight = x > 0.6;
  const side = isLeft ? 'left' as const : isRight ? 'right' as const : 'center' as const;
  
  // List of candidates ordered by position
  const candidates: { part: VehiclePart; zone: VehicleZone; side: DamageDetection['side'] }[] = [];
  
  if (y < 0.35) {
    candidates.push(
      { part: 'hood', zone: 'frontal', side },
      { part: 'windshield', zone: 'frontal', side },
      { part: isLeft ? 'front_fender_left' : 'front_fender_right', zone: 'frontal', side },
      { part: 'roof', zone: 'roof', side },
    );
  } else if (y < 0.65) {
    candidates.push(
      { part: isLeft ? 'front_door_left' : isRight ? 'front_door_right' : 'grille', zone: isLeft ? 'lateral_left' : isRight ? 'lateral_right' : 'frontal', side },
      { part: isLeft ? 'headlight_left' : 'headlight_right', zone: 'frontal', side },
      { part: isLeft ? 'rear_door_left' : 'rear_door_right', zone: isLeft ? 'lateral_left' : 'lateral_right', side },
      { part: 'front_bumper', zone: 'frontal', side },
      { part: isLeft ? 'side_panel_left' : 'side_panel_right', zone: isLeft ? 'lateral_left' : 'lateral_right', side },
    );
  } else {
    candidates.push(
      { part: 'front_bumper', zone: 'frontal', side },
      { part: isLeft ? 'side_panel_left' : 'side_panel_right', zone: isLeft ? 'lateral_left' : 'lateral_right', side },
      { part: isLeft ? 'wheel_front_left' : 'wheel_front_right', zone: 'frontal', side },
      { part: 'radiator', zone: 'frontal', side: 'center' },
      { part: 'frame', zone: 'undercarriage', side },
    );
  }
  
  for (const c of candidates) {
    if (!used.has(c.part)) return c;
  }
  // Fallback
  return candidates[0];
}

// ===== MAP API RESPONSE =====
function mapResponse(raw: any): DamageAnalysisResult {
  const damages: DamageDetection[] = (raw.damages || []).map((d: any, i: number) => ({
    id: `dmg-${Date.now()}-${i}`,
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
    boundingBox: d.boundingBox || undefined,
  }));

  const sev = raw.overallSeverity || 'none';
  const parts = { exterior: [] as string[], mechanical: [] as string[], glass: [] as string[], structural: [] as string[] };
  for (const d of damages) {
    const label = VEHICLE_PART_LABELS[d.part] || d.part;
    if (d.affectsStructure) parts.structural.push(label);
    else if (d.affectsMechanical) parts.mechanical.push(label);
    else if (d.type === 'glass') parts.glass.push(label);
    else parts.exterior.push(label);
  }

  return {
    hasDamage: raw.hasDamage ?? damages.length > 0,
    damages,
    overallSeverity: sev,
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
    repairCategory: sev === 'total_loss' ? 'total_loss' : damages.some(d => d.affectsStructure) ? 'major_repair' : sev === 'moderate' || sev === 'severe' ? 'moderate_repair' : 'minor_repair',
  };
}

function createEmptyResult(): DamageAnalysisResult {
  return {
    hasDamage: false, damages: [], overallSeverity: 'none', confidence: 0,
    impactZone: null, impactType: null,
    vehicleStatus: { isDriveable: true, airbagDeployed: false, fluidLeak: false, structuralDamage: false, glassIntact: true },
    affectedParts: { exterior: [], mechanical: [], glass: [], structural: [] },
    recommendations: ['No se pudo analizar la imagen.'], repairCategory: 'minor_repair',
  };
}

// ===== UTILIDADES =====
export const getDamageTypeLabel = (t: DamageType) => DAMAGE_TYPE_LABELS[t] || t;
export const getPartLabel = (p: VehiclePart) => VEHICLE_PART_LABELS[p] || p;
export const getZoneLabel = (z: VehicleZone) => ZONE_LABELS[z] || z;
export const getSeverityLabel = (s: DamageSeverity) => SEVERITY_LABELS[s] || s;
export const getSeverityColor = (s: DamageSeverity | 'none') => SEVERITY_COLORS[s] || '';
export const getImpactTypeLabel = (t: string) => IMPACT_TYPE_LABELS[t] || t;
