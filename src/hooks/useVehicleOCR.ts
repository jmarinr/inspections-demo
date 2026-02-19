import { useState, useCallback } from 'react';
import Tesseract from 'tesseract.js';

export interface VehicleOCRResult {
  plate: string | null;
  vin: string | null;
  confidence: number;
  rawText: string;
}

interface UseVehicleOCRResult {
  isProcessing: boolean;
  progress: number;
  error: string | null;
  extractPlate: (imageData: string, country?: string) => Promise<VehicleOCRResult>;
  extractVIN: (imageData: string) => Promise<VehicleOCRResult>;
}

// Plate patterns by country
const PLATE_PATTERNS: Record<string, RegExp[]> = {
  MX: [
    /[A-Z]{3}[-\s]?\d{3,4}[-\s]?[A-Z]?/gi,  // Standard: ABC-123-A
    /\d{3}[-\s]?[A-Z]{3}/gi,                  // Alternative
  ],
  CR: [
    /[A-Z]{3}[-\s]?\d{3}/gi,                  // Standard: ABC-123
    /[A-Z]{2}[-\s]?\d{4}/gi,                  // Special vehicles
  ],
  PA: [
    /[A-Z]{2,3}[-\s]?\d{4}/gi,               // Standard: AB-1234 or ABC-1234
    /\d{4}[-\s]?[A-Z]{2,3}/gi,               // Alternative
  ],
  CO: [
    /[A-Z]{3}[-\s]?\d{3}/gi,                 // Standard: ABC-123
    /[A-Z]{3}[-\s]?\d{2}[A-Z]/gi,            // Motorcycles
  ],
  GT: [
    /[A-Z][-\s]?\d{3}[-\s]?[A-Z]{3}/gi,     // Standard: A-123-ABC
    /[CMOP][-\s]?\d{3}[-\s]?[A-Z]{3}/gi,    // Special
  ],
  default: [
    /[A-Z0-9]{5,8}/gi,                       // Generic alphanumeric
    /[A-Z]{2,3}[-\s]?\d{3,4}/gi,            // Common format
  ],
};

// VIN pattern (17 characters, no I, O, Q)
const VIN_PATTERN = /[A-HJ-NPR-Z0-9]{17}/gi;

export function useVehicleOCR(): UseVehicleOCRResult {
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const extractPlate = useCallback(async (
    imageData: string,
    country: string = 'default'
  ): Promise<VehicleOCRResult> => {
    setIsProcessing(true);
    setProgress(0);
    setError(null);

    try {
      console.log('Starting plate OCR...');
      
      const result = await Tesseract.recognize(
        imageData,
        'eng',
        {
          logger: (m) => {
            if (m.status === 'recognizing text') {
              setProgress(Math.round(m.progress * 100));
            }
          },
        }
      );

      const rawText = result.data.text;
      const confidence = result.data.confidence;
      
      console.log('OCR Raw text:', rawText);
      console.log('OCR Confidence:', confidence);

      // Try to find plate using country-specific patterns
      const patterns = PLATE_PATTERNS[country] || PLATE_PATTERNS.default;
      let detectedPlate: string | null = null;
      
      for (const pattern of patterns) {
        const matches = rawText.match(pattern);
        if (matches && matches.length > 0) {
          // Clean up the match
          detectedPlate = matches[0]
            .toUpperCase()
            .replace(/\s+/g, '-')
            .replace(/--+/g, '-');
          console.log('Detected plate:', detectedPlate);
          break;
        }
      }

      // If no pattern match, try to extract any alphanumeric sequence that looks like a plate
      if (!detectedPlate) {
        const cleanText = rawText.replace(/[^A-Z0-9]/gi, ' ').trim();
        const words = cleanText.split(/\s+/);
        for (const word of words) {
          if (word.length >= 5 && word.length <= 8 && /[A-Z]/.test(word) && /\d/.test(word)) {
            detectedPlate = word.toUpperCase();
            console.log('Fallback plate detection:', detectedPlate);
            break;
          }
        }
      }

      return {
        plate: detectedPlate,
        vin: null,
        confidence: confidence / 100,
        rawText,
      };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error procesando imagen';
      setError(errorMessage);
      console.error('Plate OCR error:', err);
      return {
        plate: null,
        vin: null,
        confidence: 0,
        rawText: '',
      };
    } finally {
      setIsProcessing(false);
    }
  }, []);

  const extractVIN = useCallback(async (imageData: string): Promise<VehicleOCRResult> => {
    setIsProcessing(true);
    setProgress(0);
    setError(null);

    try {
      const result = await Tesseract.recognize(
        imageData,
        'eng',
        {
          logger: (m) => {
            if (m.status === 'recognizing text') {
              setProgress(Math.round(m.progress * 100));
            }
          },
        }
      );

      const rawText = result.data.text;
      const confidence = result.data.confidence;

      // Try to find VIN
      const vinMatches = rawText.match(VIN_PATTERN);
      const detectedVIN = vinMatches ? vinMatches[0].toUpperCase() : null;

      return {
        plate: null,
        vin: detectedVIN,
        confidence: confidence / 100,
        rawText,
      };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error procesando imagen';
      setError(errorMessage);
      return {
        plate: null,
        vin: null,
        confidence: 0,
        rawText: '',
      };
    } finally {
      setIsProcessing(false);
    }
  }, []);

  return {
    isProcessing,
    progress,
    error,
    extractPlate,
    extractVIN,
  };
}

// Utility function to format plate for display
export function formatPlate(plate: string, country: string = 'default'): string {
  const clean = plate.replace(/[^A-Z0-9]/gi, '').toUpperCase();
  
  switch (country) {
    case 'MX':
      // Format: ABC-1234-A
      if (clean.length >= 6) {
        return `${clean.slice(0, 3)}-${clean.slice(3, 7)}${clean.length > 7 ? '-' + clean.slice(7) : ''}`;
      }
      break;
    case 'PA':
      // Format: AB-1234
      if (clean.length >= 6) {
        const letters = clean.match(/[A-Z]+/)?.[0] || '';
        const numbers = clean.match(/\d+/)?.[0] || '';
        return `${letters}-${numbers}`;
      }
      break;
    case 'CR':
      // Format: ABC-123
      if (clean.length >= 6) {
        return `${clean.slice(0, 3)}-${clean.slice(3, 6)}`;
      }
      break;
  }
  
  return plate;
}
