import { useState, useCallback } from 'react';

/**
 * Image validation hook - lightweight validation that avoids false positives.
 * 
 * Strategy: Only reject images when we're VERY confident they don't match.
 * For identity docs: accept everything (let OCR be the real validator).
 * For vehicle photos: only reject if it's clearly a document/screenshot.
 * For damage photos: accept everything (damage can look like anything).
 */

export type ImageCategory = 
  | 'id_document'
  | 'vehicle_exterior'
  | 'vehicle_interior' 
  | 'vehicle_damage'
  | 'vehicle_dashboard'
  | 'scene_outdoor'
  | 'screenshot'
  | 'unknown';

export interface ValidationResult {
  isValid: boolean;
  category: ImageCategory;
  confidence: number;
  reason: string;
  details?: string;
}

export function useImageValidation() {
  const [isValidating, setIsValidating] = useState(false);

  const validateImage = useCallback(async (
    imageData: string,
    expectedStep: string
  ): Promise<ValidationResult> => {
    setIsValidating(true);
    
    try {
      const analysis = await analyzeImageBasic(imageData);
      
      // === IDENTITY STEP: Accept all photos, let OCR validate ===
      if (expectedStep.startsWith('identity')) {
        return { isValid: true, category: 'id_document', confidence: 0.8, reason: '' };
      }
      
      // === VEHICLE PHOTOS: Only reject obvious non-photos ===
      if (expectedStep.startsWith('vehicle')) {
        // Reject screenshots (very specific dimensions, no noise)
        if (analysis.isScreenshot) {
          return {
            isValid: false,
            category: 'screenshot',
            confidence: 0.9,
            reason: 'Esta imagen parece ser una captura de pantalla. Por favor toma una foto real del vehículo.',
            details: 'Usa la cámara del dispositivo para fotografiar el vehículo.',
          };
        }
        // Reject very small images (icons, thumbnails)
        if (analysis.width < 200 || analysis.height < 200) {
          return {
            isValid: false,
            category: 'unknown',
            confidence: 0.9,
            reason: 'La imagen es demasiado pequeña. Toma una foto con mejor resolución.',
          };
        }
        return { isValid: true, category: 'vehicle_exterior', confidence: 0.7, reason: '' };
      }
      
      // === DAMAGE PHOTOS: Accept everything ===
      if (expectedStep === 'damage') {
        if (analysis.width < 200 || analysis.height < 200) {
          return {
            isValid: false,
            category: 'unknown',
            confidence: 0.9,
            reason: 'La imagen es demasiado pequeña. Acércate al daño y toma una foto clara.',
          };
        }
        return { isValid: true, category: 'vehicle_damage', confidence: 0.7, reason: '' };
      }
      
      // === SCENE PHOTOS: Accept everything ===
      if (expectedStep === 'scene') {
        return { isValid: true, category: 'scene_outdoor', confidence: 0.7, reason: '' };
      }
      
      // Default: accept
      return { isValid: true, category: 'unknown', confidence: 0.5, reason: '' };
    } catch (err) {
      console.error('[ImageValidation] Error:', err);
      return { isValid: true, category: 'unknown', confidence: 0, reason: '' };
    } finally {
      setIsValidating(false);
    }
  }, []);

  return { isValidating, validateImage };
}

// ===== Lightweight analysis =====
interface BasicAnalysis {
  width: number;
  height: number;
  isScreenshot: boolean;
}

async function analyzeImageBasic(imageData: string): Promise<BasicAnalysis> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      // Screenshot detection: common screen resolutions + very clean edges
      const w = img.width;
      const h = img.height;
      const commonScreenWidths = [320, 360, 375, 390, 393, 412, 414, 428, 768, 800, 1024, 1080, 1170, 1284, 1920, 2560];
      const isExactScreenWidth = commonScreenWidths.includes(w) || commonScreenWidths.includes(h);
      // Screenshots tend to have exact pixel dimensions matching device screens
      const isScreenshot = isExactScreenWidth && (w * h > 500000);
      
      resolve({ width: w, height: h, isScreenshot });
    };
    img.onerror = () => resolve({ width: 0, height: 0, isScreenshot: false });
    img.src = imageData;
  });
}
