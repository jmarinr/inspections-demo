import { useState, useCallback } from 'react';

/**
 * Image validation hook - validates that uploaded photos match expected content
 * Uses canvas analysis (dimensions, brightness, color distribution) + simulated AI classification
 */

export type ImageCategory = 
  | 'id_document'
  | 'vehicle_exterior'
  | 'vehicle_interior' 
  | 'vehicle_damage'
  | 'vehicle_dashboard'
  | 'scene_outdoor'
  | 'unknown';

export interface ValidationResult {
  isValid: boolean;
  category: ImageCategory;
  confidence: number;
  reason: string;
  details?: string;
}

// Expected categories per step
export const STEP_EXPECTED: Record<string, ImageCategory[]> = {
  identity_front: ['id_document'],
  identity_back: ['id_document'],
  vehicle_front: ['vehicle_exterior'],
  vehicle_rear: ['vehicle_exterior'],
  vehicle_left: ['vehicle_exterior'],
  vehicle_right: ['vehicle_exterior'],
  vehicle_front_45_left: ['vehicle_exterior'],
  vehicle_front_45_right: ['vehicle_exterior'],
  vehicle_dashboard: ['vehicle_dashboard', 'vehicle_interior'],
  damage: ['vehicle_damage', 'vehicle_exterior'],
  scene: ['scene_outdoor', 'vehicle_exterior', 'vehicle_damage'],
};

export function useImageValidation() {
  const [isValidating, setIsValidating] = useState(false);

  const validateImage = useCallback(async (
    imageData: string,
    expectedStep: string
  ): Promise<ValidationResult> => {
    setIsValidating(true);
    
    try {
      // Analyze the image using canvas
      const analysis = await analyzeImageContent(imageData);
      const expected = STEP_EXPECTED[expectedStep] || ['unknown'];
      
      // Classify the image
      const category = classifyImage(analysis);
      const isValid = expected.includes(category) || expected.includes('unknown');
      
      let reason = '';
      let details = '';
      
      if (!isValid) {
        const stepLabel = getStepLabel(expectedStep);
        const categoryLabel = getCategoryLabel(category);
        reason = `Esta foto parece ser ${categoryLabel}, pero se requiere ${stepLabel}.`;
        details = getHelpText(expectedStep);
      }
      
      return {
        isValid,
        category,
        confidence: analysis.confidence,
        reason,
        details,
      };
    } catch (err) {
      console.error('[ImageValidation] Error:', err);
      // On error, allow the image (fail-open)
      return { isValid: true, category: 'unknown', confidence: 0, reason: '' };
    } finally {
      setIsValidating(false);
    }
  }, []);

  return { isValidating, validateImage };
}

// ===== Image analysis using canvas =====
interface ImageAnalysis {
  width: number;
  height: number;
  aspectRatio: number;
  avgBrightness: number;
  colorVariance: number;
  edgeDensity: number;
  hasText: boolean; // approximation from contrast patterns
  dominantTone: 'warm' | 'cool' | 'neutral';
  isLandscape: boolean;
  hasHighContrast: boolean;
  confidence: number;
}

async function analyzeImageContent(imageData: string): Promise<ImageAnalysis> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const scale = Math.min(200 / img.width, 200 / img.height, 1);
      canvas.width = Math.floor(img.width * scale);
      canvas.height = Math.floor(img.height * scale);
      
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve(getDefaultAnalysis());
        return;
      }
      
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      const imageDataObj = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const pixels = imageDataObj.data;
      
      let totalR = 0, totalG = 0, totalB = 0;
      let totalBrightness = 0;
      let edgeCount = 0;
      const pixelCount = pixels.length / 4;
      
      for (let i = 0; i < pixels.length; i += 4) {
        const r = pixels[i], g = pixels[i + 1], b = pixels[i + 2];
        totalR += r; totalG += g; totalB += b;
        totalBrightness += (r + g + b) / 3;
        
        // Simple edge detection: compare with neighbor pixel
        if (i + 8 < pixels.length) {
          const nr = pixels[i + 4], ng = pixels[i + 5], nb = pixels[i + 6];
          const diff = Math.abs(r - nr) + Math.abs(g - ng) + Math.abs(b - nb);
          if (diff > 100) edgeCount++;
        }
      }
      
      const avgR = totalR / pixelCount;
      const avgG = totalG / pixelCount;
      const avgB = totalB / pixelCount;
      const avgBrightness = totalBrightness / pixelCount;
      
      // Color variance
      let variance = 0;
      for (let i = 0; i < pixels.length; i += 16) { // sample every 4th pixel
        const r = pixels[i], g = pixels[i + 1], b = pixels[i + 2];
        variance += Math.pow(r - avgR, 2) + Math.pow(g - avgG, 2) + Math.pow(b - avgB, 2);
      }
      variance = variance / (pixelCount / 4);
      
      const dominantTone = avgR > avgB + 20 ? 'warm' : avgB > avgR + 20 ? 'cool' : 'neutral';
      const edgeDensity = edgeCount / pixelCount;
      
      resolve({
        width: img.width,
        height: img.height,
        aspectRatio: img.width / img.height,
        avgBrightness,
        colorVariance: variance,
        edgeDensity,
        hasText: edgeDensity > 0.15 && avgBrightness > 100,
        dominantTone,
        isLandscape: img.width > img.height,
        hasHighContrast: variance > 5000,
        confidence: 0.75,
      });
    };
    img.onerror = () => resolve(getDefaultAnalysis());
    img.src = imageData;
  });
}

function getDefaultAnalysis(): ImageAnalysis {
  return {
    width: 0, height: 0, aspectRatio: 1, avgBrightness: 128,
    colorVariance: 3000, edgeDensity: 0.1, hasText: false,
    dominantTone: 'neutral', isLandscape: true, hasHighContrast: false, confidence: 0.5,
  };
}

// ===== Classification =====
function classifyImage(analysis: ImageAnalysis): ImageCategory {
  const { aspectRatio, avgBrightness, edgeDensity, hasText, isLandscape, colorVariance } = analysis;
  
  // ID Document heuristics:
  // - Usually close to card aspect ratio (1.58 ≈ credit card)
  // - High text content (edges)
  // - Moderate to high brightness (white/light backgrounds)
  // - Smaller dimensions typically
  const isCardRatio = aspectRatio > 1.3 && aspectRatio < 1.9;
  const isCardRatioPortrait = aspectRatio > 0.5 && aspectRatio < 0.8;
  if ((isCardRatio || isCardRatioPortrait) && hasText && avgBrightness > 90 && edgeDensity > 0.1) {
    return 'id_document';
  }
  
  // Dashboard: usually darker, interior shot, landscape
  if (isLandscape && avgBrightness < 120 && colorVariance < 4000) {
    // Could be dashboard or interior
    if (edgeDensity > 0.12) return 'vehicle_dashboard';
    return 'vehicle_interior';
  }
  
  // Outdoor scene: typically landscape, higher brightness, more color variance
  if (isLandscape && avgBrightness > 100 && colorVariance > 6000) {
    return 'scene_outdoor';
  }
  
  // Vehicle exterior: moderate metrics, usually landscape
  if (isLandscape && colorVariance > 2000) {
    return 'vehicle_exterior';
  }
  
  // Damage: can have any orientation, usually has damage details
  if (edgeDensity > 0.15 && colorVariance > 3000) {
    return 'vehicle_damage';
  }
  
  // Default: treat as vehicle exterior (most common upload)
  return 'vehicle_exterior';
}

// ===== Labels =====
function getStepLabel(step: string): string {
  const labels: Record<string, string> = {
    identity_front: 'una foto del frente del documento de identidad',
    identity_back: 'una foto del reverso del documento de identidad',
    vehicle_front: 'una foto frontal del vehículo',
    vehicle_rear: 'una foto trasera del vehículo',
    vehicle_left: 'una foto del lateral izquierdo del vehículo',
    vehicle_right: 'una foto del lateral derecho del vehículo',
    vehicle_front_45_left: 'una foto frontal 45° izquierda del vehículo',
    vehicle_front_45_right: 'una foto frontal 45° derecha del vehículo',
    vehicle_dashboard: 'una foto del tablero del vehículo',
    damage: 'una foto de los daños del vehículo',
    scene: 'una foto del lugar del accidente',
  };
  return labels[step] || 'una foto apropiada';
}

function getCategoryLabel(category: ImageCategory): string {
  const labels: Record<ImageCategory, string> = {
    id_document: 'un documento de identidad',
    vehicle_exterior: 'un vehículo (exterior)',
    vehicle_interior: 'un interior de vehículo',
    vehicle_damage: 'daño vehicular',
    vehicle_dashboard: 'un tablero de vehículo',
    scene_outdoor: 'una escena exterior',
    unknown: 'contenido no identificado',
  };
  return labels[category];
}

function getHelpText(step: string): string {
  const help: Record<string, string> = {
    identity_front: 'Toma la foto sobre una superficie plana, con buena iluminación y sin reflejos.',
    identity_back: 'Voltea el documento y toma la foto del reverso.',
    vehicle_front: 'Colócate frente al vehículo a unos 3 metros de distancia.',
    vehicle_rear: 'Colócate detrás del vehículo, asegúrate de que se vea la placa.',
    vehicle_dashboard: 'Toma la foto del tablero desde el asiento del conductor.',
    damage: 'Acércate al área dañada para capturar los detalles.',
    scene: 'Toma una foto panorámica del lugar del accidente.',
  };
  return help[step] || '';
}
