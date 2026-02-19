import { useState, useCallback } from 'react';
import Tesseract from 'tesseract.js';
import type { ExtractedIdData, OCRResult } from '../types';

interface UseOCRResult {
  isProcessing: boolean;
  progress: number;
  error: string | null;
  rawText: string | null;
  processImage: (imageFile: File | string) => Promise<OCRResult>;
  extractIdData: (frontImage: string, backImage?: string, country?: string) => Promise<{
    data: ExtractedIdData | null;
    confidence: number;
    rawText: string;
  }>;
}

export function useOCR(): UseOCRResult {
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [rawText, setRawText] = useState<string | null>(null);

  const processImage = useCallback(async (imageFile: File | string): Promise<OCRResult> => {
    setIsProcessing(true);
    setProgress(0);
    setError(null);

    try {
      const result = await Tesseract.recognize(
        imageFile,
        'spa+eng', // Spanish and English
        {
          logger: (m) => {
            if (m.status === 'recognizing text') {
              setProgress(Math.round(m.progress * 100));
            }
          },
        }
      );

      console.log('[OCR] Raw text extracted:', result.data.text);
      console.log('[OCR] Confidence:', result.data.confidence);

      return {
        text: result.data.text,
        confidence: result.data.confidence,
        blocks: result.data.blocks?.map((block) => ({
          text: block.text,
          confidence: block.confidence,
          bbox: block.bbox,
        })) || [],
      };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error procesando imagen';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setIsProcessing(false);
      setProgress(100);
    }
  }, []);

  const extractIdData = useCallback(async (
    frontImage: string,
    backImage?: string,
    country: string = 'MX'
  ): Promise<{ data: ExtractedIdData | null; confidence: number; rawText: string }> => {
    setIsProcessing(true);
    setError(null);
    setRawText(null);

    try {
      // Process front image
      console.log('[OCR] Processing front image...');
      const frontResult = await processImage(frontImage);
      
      // Process back image if provided
      let backResult: OCRResult | null = null;
      if (backImage) {
        console.log('[OCR] Processing back image...');
        backResult = await processImage(backImage);
      }

      // Combine and parse the extracted text
      const combinedText = `${frontResult.text}\n${backResult?.text || ''}`;
      setRawText(combinedText);
      console.log('[OCR] Combined text:', combinedText);

      const parsedData = parseIdDocument(combinedText, country);
      console.log('[OCR] Parsed data:', parsedData);
      
      // Calculate overall confidence
      const confidence = backResult
        ? (frontResult.confidence + backResult.confidence) / 2
        : frontResult.confidence;

      return {
        data: parsedData,
        confidence: confidence / 100, // Normalize to 0-1
        rawText: combinedText,
      };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error extrayendo datos';
      setError(errorMessage);
      return { data: null, confidence: 0, rawText: '' };
    } finally {
      setIsProcessing(false);
    }
  }, [processImage]);

  return {
    isProcessing,
    progress,
    error,
    rawText,
    processImage,
    extractIdData,
  };
}

// Helper function to parse ID document text based on country
function parseIdDocument(text: string, country: string): ExtractedIdData | null {
  const lines = text.split('\n').map((line) => line.trim()).filter(Boolean);
  
  if (lines.length === 0) {
    console.log('[OCR] No text lines found');
    return null;
  }

  // Common patterns
  const datePattern = /\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4}/g;
  const dates = text.match(datePattern) || [];

  let data: Partial<ExtractedIdData> = {};

  switch (country) {
    case 'MX':
      data = parseMexicanId(text, lines, dates);
      break;
    case 'CR':
      data = parseCostaRicanId(text, lines, dates);
      break;
    case 'PA':
      data = parsePanamanianId(text, lines, dates);
      break;
    case 'CO':
      data = parseColombianId(text, lines, dates);
      break;
    default:
      data = parseGenericId(text, lines, dates);
  }

  console.log('[OCR] Parsed fields:', data);

  // Return data even if only partially filled - let the user complete the rest
  const hasAnyData = data.fullName || data.idNumber || data.birthDate || data.expiryDate;
  
  if (hasAnyData) {
    return {
      fullName: data.fullName || '',
      idNumber: data.idNumber || '',
      birthDate: data.birthDate || '',
      expiryDate: data.expiryDate || '',
      nationality: data.nationality,
      gender: data.gender,
    };
  }

  // Last resort: try generic parsing if country-specific failed
  if (country !== 'generic') {
    console.log('[OCR] Country-specific parsing failed, trying generic...');
    const genericData = parseGenericId(text, lines, dates);
    if (genericData.fullName || genericData.idNumber) {
      return {
        fullName: genericData.fullName || '',
        idNumber: genericData.idNumber || '',
        birthDate: genericData.birthDate || '',
        expiryDate: genericData.expiryDate || '',
        nationality: genericData.nationality,
        gender: genericData.gender,
      };
    }
  }

  return null;
}

function parseMexicanId(text: string, lines: string[], dates: string[]): Partial<ExtractedIdData> {
  const data: Partial<ExtractedIdData> = {};
  
  console.log('[OCR-MX] Parsing Mexican ID...');
  
  // Look for CURP pattern (18 characters)
  const curpPattern = /[A-Z]{4}\d{6}[HM][A-Z]{5}[A-Z0-9]\d/;
  const curpMatch = text.match(curpPattern);
  if (curpMatch) {
    data.idNumber = curpMatch[0];
    const genderChar = curpMatch[0].charAt(10);
    data.gender = genderChar === 'H' ? 'M' : 'F';
    console.log('[OCR-MX] Found CURP:', data.idNumber);
  }

  // Look for Clave de Elector
  if (!data.idNumber) {
    const clavePattern = /[A-Z]{6}\d{8}[A-Z]\d{3}/;
    const claveMatch = text.match(clavePattern);
    if (claveMatch) {
      data.idNumber = claveMatch[0];
      console.log('[OCR-MX] Found Clave Elector:', data.idNumber);
    }
  }

  // Skip words for Mexican IDs
  const skipWords = new Set([
    'INSTITUTO', 'NACIONAL', 'ELECTORAL', 'MEXICO', 'MÉXICO', 'ESTADOS',
    'UNIDOS', 'MEXICANOS', 'CREDENCIAL', 'PARA', 'VOTAR', 'NOMBRE',
    'DOMICILIO', 'CLAVE', 'ELECTOR', 'CURP', 'ESTADO', 'SECCIÓN',
    'SECCION', 'MUNICIPIO', 'LOCALIDAD', 'VIGENCIA', 'REGISTRO', 'FEDERAL',
    'ELECTORES', 'APELLIDO', 'PATERNO', 'MATERNO', 'FECHA', 'NACIMIENTO',
    'SEXO', 'AÑO', 'EMISION', 'EMISIÓN',
  ]);

  // Strategy 1: Look for name after keyword NOMBRE or APELLIDO
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].toUpperCase().trim();
    if (line.includes('NOMBRE') || line.includes('APELLIDO')) {
      // Name might be on the next line
      for (let j = i + 1; j < Math.min(i + 3, lines.length); j++) {
        const candidate = lines[j].trim();
        if (/^[A-ZÁÉÍÓÚÑ\s]{3,50}$/.test(candidate)) {
          const words = candidate.split(/\s+/).filter(w => w.length >= 2);
          const isSkip = words.every(w => skipWords.has(w.toUpperCase()));
          if (!isSkip && words.length >= 1) {
            data.fullName = (data.fullName ? data.fullName + ' ' : '') + formatName(candidate);
            console.log('[OCR-MX] Found name part:', candidate);
          }
        }
      }
    }
  }

  // Strategy 2: Fallback to uppercase lines that look like names
  if (!data.fullName) {
    for (const line of lines) {
      const trimmed = line.trim();
      if (/^[A-ZÁÉÍÓÚÑ\s]{5,50}$/.test(trimmed)) {
        const words = trimmed.split(/\s+/).filter(w => w.length >= 2);
        const hasSkip = words.some(w => skipWords.has(w.toUpperCase()));
        if (!hasSkip && words.length >= 2) {
          data.fullName = formatName(trimmed);
          console.log('[OCR-MX] Found name (fallback):', data.fullName);
          break;
        }
      }
    }
  }

  // Parse dates
  if (dates.length >= 1) data.birthDate = formatDate(dates[0]);
  if (dates.length >= 2) data.expiryDate = formatDate(dates[dates.length - 1]);

  data.nationality = 'Mexicana';
  console.log('[OCR-MX] Final parsed data:', data);
  return data;
}

function parseCostaRicanId(text: string, lines: string[], dates: string[]): Partial<ExtractedIdData> {
  const data: Partial<ExtractedIdData> = {};
  
  console.log('[OCR-CR] Parsing Costa Rican ID...');

  // Costa Rican ID pattern: X-XXXX-XXXX (with dashes or spaces)
  const idPatterns = [
    /\b(\d)-(\d{4})-(\d{4})\b/,           // 1-1234-5678
    /\b(\d)[\s]+(\d{4})[\s]+(\d{4})\b/,   // 1 1234 5678
  ];
  
  for (const pattern of idPatterns) {
    const match = text.match(pattern);
    if (match && match[1] && match[2] && match[3]) {
      data.idNumber = `${match[1]}-${match[2]}-${match[3]}`;
      console.log('[OCR-CR] Found cédula:', data.idNumber);
      break;
    }
  }
  
  // Fallback: simple pattern
  if (!data.idNumber) {
    const simpleMatch = text.match(/\d-\d{4}-\d{4}/);
    if (simpleMatch) data.idNumber = simpleMatch[0];
  }

  const skipWords = new Set([
    'REPUBLICA', 'REPÚBLICA', 'COSTA', 'RICA', 'TRIBUNAL', 'SUPREMO',
    'ELECCIONES', 'CEDULA', 'CÉDULA', 'IDENTIDAD', 'NOMBRE', 'APELLIDO',
    'CONOCIDO', 'COMO', 'FECHA', 'NACIMIENTO', 'VENCIMIENTO', 'LUGAR',
    'DOMICILIO', 'ELECTORAL', 'REGISTRO', 'CIVIL',
  ]);

  // Look for name
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.length < 5 || /\d/.test(trimmed)) continue;
    const words = trimmed.split(/\s+/).filter(w => w.length >= 2);
    const hasSkip = words.some(w => skipWords.has(w.toUpperCase()));
    if (hasSkip) continue;
    
    if (/^[A-Za-záéíóúñÁÉÍÓÚÑ\s]{5,50}$/.test(trimmed) && words.length >= 2) {
      data.fullName = formatName(trimmed);
      console.log('[OCR-CR] Found name:', data.fullName);
      break;
    }
  }

  if (dates.length >= 1) data.birthDate = formatDate(dates[0]);
  if (dates.length >= 2) data.expiryDate = formatDate(dates[dates.length - 1]);

  data.nationality = 'Costarricense';
  console.log('[OCR-CR] Final parsed data:', data);
  return data;
}

function parsePanamanianId(text: string, lines: string[], _dates: string[]): Partial<ExtractedIdData> {
  const data: Partial<ExtractedIdData> = {};
  
  console.log('[OCR-PA] Parsing Panamanian ID...');
  console.log('[OCR-PA] Lines:', lines);

  // Normalize text: collapse multi-spaces, fix common OCR substitutions
  const cleanText = text
    .replace(/[|l]/g, (c) => c) // keep as is for now
    .replace(/\s{2,}/g, ' ');

  // ===== 1. EXTRACT CÉDULA NUMBER =====
  // Try progressively looser patterns
  
  // Pattern A: Standard dashed format anywhere in text
  const dashMatch = cleanText.match(/(\d{1,2})\s*[-–—]\s*(\d{2,4})\s*[-–—]\s*(\d{3,6})/);
  if (dashMatch) {
    data.idNumber = `${dashMatch[1]}-${dashMatch[2]}-${dashMatch[3]}`;
    console.log('[OCR-PA] Found ID (dashed):', data.idNumber);
  }
  
  // Pattern B: Space-separated numbers that fit cédula format
  if (!data.idNumber) {
    const allNumberGroups = cleanText.match(/\b(\d{1,2})\s+(\d{2,4})\s+(\d{3,6})\b/g);
    if (allNumberGroups) {
      for (const group of allNumberGroups) {
        const parts = group.trim().split(/\s+/);
        if (parts.length === 3) {
          const p1 = parseInt(parts[0]);
          if (p1 >= 1 && p1 <= 13) {
            data.idNumber = `${parts[0]}-${parts[1]}-${parts[2]}`;
            console.log('[OCR-PA] Found ID (spaced):', data.idNumber);
            break;
          }
        }
      }
    }
  }

  // Pattern C: Numbers embedded in noisy lines (like "N 8 203 1365" or "SANGRE 8-203-1365")
  if (!data.idNumber) {
    for (const line of lines) {
      // Strip all non-digits and non-dashes, then look for pattern
      const numbersOnly = line.replace(/[^0-9\-\s]/g, ' ').replace(/\s+/g, ' ').trim();
      const match = numbersOnly.match(/(\d{1,2})\s*[-]?\s*(\d{2,4})\s*[-]?\s*(\d{3,6})/);
      if (match) {
        const p1 = parseInt(match[1]);
        if (p1 >= 1 && p1 <= 13 && parseInt(match[3]) > 100) {
          data.idNumber = `${match[1]}-${match[2]}-${match[3]}`;
          console.log('[OCR-PA] Found ID (noisy line):', data.idNumber);
          break;
        }
      }
    }
  }

  // Pattern D: Scan every line for any 3 digit groups that could be a cédula
  if (!data.idNumber) {
    for (const line of lines) {
      const digits = line.match(/\d+/g);
      if (digits && digits.length >= 3) {
        for (let i = 0; i <= digits.length - 3; i++) {
          const p1 = parseInt(digits[i]);
          const p2 = parseInt(digits[i+1]);
          const p3 = parseInt(digits[i+2]);
          if (p1 >= 1 && p1 <= 13 && p2 >= 1 && p2 <= 9999 && p3 >= 100 && p3 <= 999999) {
            data.idNumber = `${digits[i]}-${digits[i+1]}-${digits[i+2]}`;
            console.log('[OCR-PA] Found ID (digit scan):', data.idNumber);
            break;
          }
        }
        if (data.idNumber) break;
      }
    }
  }

  // ===== 2. EXTRACT NAME =====
  // Priority: Strategy 3 (mixed case) first since it's most reliable for "Margarita Gomez Velazquez"
  
  const skipWordsSet = new Set([
    'REPUBLICA', 'REPÚBLICA', 'PANAMA', 'PANAMÁ', 'TRIBUNAL', 'ELECTORAL',
    'NOMBRE', 'USUAL', 'FECHA', 'LUGAR', 'NACIMIENTO', 'MUESTRA', 'EXPIRA',
    'SEXO', 'TIPO', 'SANGRE', 'CEDULA', 'CÉDULA', 'IDENTIDAD', 'PERSONAL',
    'EXPEDIDA', 'NACIONALIDAD', 'PANAMEÑA', 'PANAMENA', 'EMISION', 'EMISIÓN',
    'VENCIMIENTO', 'SANGUINEO', 'FOTO', 'FIRMA', 'AUTORIDAD', 'REGISTRO',
    'CIVIL', 'GOBIERNO', 'NACIONAL', 'DIRECCION', 'GENERAL',
  ]);

  // Strategy A (BEST): Find mixed-case names like "Margarita Gomez Velazquez"
  // Tesseract often preserves the original case of the printed text
  const mixedCasePattern = /([A-ZÁÉÍÓÚÑ][a-záéíóúñ]{2,}(?:\s+[A-ZÁÉÍÓÚÑ][a-záéíóúñ]{1,}){1,5})/g;
  const mixedMatches: string[] = [];
  let m;
  while ((m = mixedCasePattern.exec(text)) !== null) {
    const candidate = m[1].trim();
    const words = candidate.split(/\s+/);
    // Must have 2+ words, no skip words, 2+ chars each
    if (words.length >= 2) {
      const hasSkip = words.some(w => skipWordsSet.has(w.toUpperCase()));
      const allNameLike = words.every(w => /^[A-ZÁÉÍÓÚÑa-záéíóúñ]{2,}$/.test(w));
      if (!hasSkip && allNameLike) {
        mixedMatches.push(candidate);
      }
    }
  }
  
  if (mixedMatches.length > 0) {
    // Pick the longest match (most complete name)
    data.fullName = mixedMatches.sort((a, b) => b.length - a.length)[0];
    console.log('[OCR-PA] Found mixed-case name:', data.fullName, 'all candidates:', mixedMatches);
  }

  // Strategy B: Look for name after "NOMBRE USUAL:" keyword
  if (!data.fullName) {
    const nameUsualIdx = text.toUpperCase().indexOf('NOMBRE USUAL');
    if (nameUsualIdx !== -1) {
      const afterKeyword = text.substring(nameUsualIdx + 12).trim();
      const firstLine = afterKeyword.split('\n')[0]?.replace(/[^A-Za-záéíóúñÁÉÍÓÚÑ\s]/g, '').trim();
      if (firstLine && firstLine.length >= 3) {
        data.fullName = formatName(firstLine);
        console.log('[OCR-PA] Found name via NOMBRE USUAL:', data.fullName);
      }
    }
  }
  
  // Strategy C: Reconstruct from ALL CAPS name fragments after header
  if (!data.fullName) {
    const nameFragments: string[] = [];
    let pastHeader = false;
    
    for (const line of lines) {
      const upper = line.toUpperCase().trim();
      
      if (upper.includes('ELECTORAL') || upper.includes('TRIBUNAL')) {
        pastHeader = true;
        continue;
      }
      
      if (upper.includes('NACIMIENTO') || upper.includes('FECHA') || 
          upper.includes('EXPEDIDA') || upper.includes('SEXO') ||
          upper.includes('TIPO DE SANGRE') || upper.includes('NOMBRE USUAL')) {
        if (pastHeader) break;
        continue;
      }
      
      if (!pastHeader) continue;
      
      // Clean OCR artifacts
      const cleaned = line.replace(/[~><=|\\\/\[\]{}()*#@!?.,;:0-9_\-"']/g, '').replace(/\s+/g, ' ').trim();
      if (cleaned.length < 3) continue;
      
      const words = cleaned.split(/\s+/).filter(w => 
        w.length >= 3 && /^[A-Za-záéíóúñÁÉÍÓÚÑ]+$/.test(w) && !skipWordsSet.has(w.toUpperCase())
      );
      
      if (words.length > 0) nameFragments.push(...words);
    }
    
    if (nameFragments.length >= 2) {
      data.fullName = formatName(nameFragments.join(' '));
      console.log('[OCR-PA] Reconstructed name:', data.fullName, 'fragments:', nameFragments);
    }
  }

  // Strategy D: Brute force - find ANY line with 2+ consecutive alpha words ≥3 chars
  if (!data.fullName) {
    for (const line of lines) {
      const cleaned = line.replace(/[^A-Za-záéíóúñÁÉÍÓÚÑ\s]/g, '').trim();
      const words = cleaned.split(/\s+/).filter(w => w.length >= 3 && !skipWordsSet.has(w.toUpperCase()));
      if (words.length >= 2 && words.length <= 5) {
        data.fullName = formatName(words.join(' '));
        console.log('[OCR-PA] Found name (brute force):', data.fullName);
        break;
      }
    }
  }

  // ===== 3. EXTRACT DATES =====
  // Panamanian IDs use DD-MMM-YYYY format (08-OCT-1956, 01-FEB-2027)
  
  // First try keyword-based extraction (most reliable)
  const birthMatch = text.match(/(?:NACIMIENTO|NACI)[:\s]*(\d{1,2})[-\/\s]+([A-Z]{3})[-\/\s]+(\d{4})/i);
  if (birthMatch) {
    data.birthDate = formatPanamanianDate(`${birthMatch[1]}-${birthMatch[2]}-${birthMatch[3]}`);
    console.log('[OCR-PA] Birth date from keyword:', data.birthDate);
  }
  
  const expiryMatch = text.match(/EXPIRA[:\s]*(\d{1,2})[-\/\s]+([A-Z]{3})[-\/\s]+(\d{4})/i);
  if (expiryMatch) {
    data.expiryDate = formatPanamanianDate(`${expiryMatch[1]}-${expiryMatch[2]}-${expiryMatch[3]}`);
    console.log('[OCR-PA] Expiry date from keyword:', data.expiryDate);
  }

  // Fallback: scan for all DD-MMM-YYYY dates
  if (!data.birthDate || !data.expiryDate) {
    const dateRegex = /(\d{1,2})[-\/\s]+([A-Z]{3})[-\/\s]+(\d{4})/gi;
    const foundDates: string[] = [];
    let dm;
    while ((dm = dateRegex.exec(text)) !== null) {
      foundDates.push(`${dm[1]}-${dm[2]}-${dm[3]}`);
    }
    
    // Also look for numeric dates DD/MM/YYYY
    const numDateRegex = /(\d{1,2})[-\/](\d{1,2})[-\/](\d{4})/g;
    while ((dm = numDateRegex.exec(text)) !== null) {
      foundDates.push(`${dm[1]}/${dm[2]}/${dm[3]}`);
    }
    
    console.log('[OCR-PA] All found dates:', foundDates);
    
    for (const d of foundDates) {
      const formatted = formatPanamanianDate(d);
      const year = parseInt(formatted.split('-')[0] || '0');
      if (!data.birthDate && year > 1920 && year < 2010) {
        data.birthDate = formatted;
      } else if (!data.expiryDate && year >= 2020) {
        data.expiryDate = formatted;
      }
    }
  }

  // ===== 4. EXTRACT GENDER =====
  const genderMatch = text.match(/SEXO\s*:?\s*([MF])/i);
  if (genderMatch) {
    data.gender = genderMatch[1].toUpperCase();
    console.log('[OCR-PA] Gender:', data.gender);
  }

  data.nationality = 'Panameña';
  console.log('[OCR-PA] FINAL:', data);
  return data;
}

// Format Panamanian date (DD-MMM-YYYY to YYYY-MM-DD)
function formatPanamanianDate(dateStr: string): string {
  const monthMap: Record<string, string> = {
    'ENE': '01', 'FEB': '02', 'MAR': '03', 'ABR': '04',
    'MAY': '05', 'JUN': '06', 'JUL': '07', 'AGO': '08',
    'SEP': '09', 'OCT': '10', 'NOV': '11', 'DIC': '12',
    'JAN': '01', 'APR': '04', 'AUG': '08', 'DEC': '12',
  };
  
  // Try DD-MMM-YYYY format
  const monthNameMatch = dateStr.match(/(\d{1,2})[-\/\s]+([A-Z]{3})[-\/\s]+(\d{4})/i);
  if (monthNameMatch) {
    const day = monthNameMatch[1].padStart(2, '0');
    const monthCode = monthNameMatch[2].toUpperCase();
    const year = monthNameMatch[3];
    const month = monthMap[monthCode] || '01';
    return `${year}-${month}-${day}`;
  }
  
  // Try DD/MM/YYYY
  const numericMatch = dateStr.match(/(\d{1,2})[-\/](\d{1,2})[-\/](\d{4})/);
  if (numericMatch) {
    const day = numericMatch[1].padStart(2, '0');
    const month = numericMatch[2].padStart(2, '0');
    const year = numericMatch[3];
    return `${year}-${month}-${day}`;
  }
  
  return dateStr;
}

function parseGenericId(text: string, lines: string[], dates: string[]): Partial<ExtractedIdData> {
  const data: Partial<ExtractedIdData> = {};

  // Try to find any ID-like number pattern
  const idPatterns = [
    /\d{1,2}-\d{4}-\d{4,6}/, // Common Latin American format
    /\d{9,12}/, // Simple numeric ID (9+ digits)
    /\d{6,8}/, // Shorter numeric ID
    /[A-Z]{2,3}\d{6,10}/, // Alphanumeric ID
    /[A-Z]{4}\d{6}[HM][A-Z]{5}[A-Z0-9]\d/, // CURP
  ];

  for (const pattern of idPatterns) {
    const match = text.match(pattern);
    if (match) {
      data.idNumber = match[0];
      console.log('[OCR Generic] Found ID:', data.idNumber);
      break;
    }
  }

  // Skip words - common header/label text on IDs
  const skipWords = new Set([
    'REPUBLICA', 'REPÚBLICA', 'PANAMA', 'PANAMÁ', 'MEXICO', 'MÉXICO',
    'COSTA', 'RICA', 'COLOMBIA', 'TRIBUNAL', 'ELECTORAL', 'REGISTRO',
    'CIVIL', 'NACIONAL', 'NOMBRE', 'FECHA', 'LUGAR', 'NACIMIENTO',
    'CEDULA', 'CÉDULA', 'IDENTIDAD', 'INSTITUTO', 'INE', 'IFE',
    'DOCUMENTO', 'PERSONAL', 'SEXO', 'TIPO', 'SANGRE', 'EMISION',
    'EMISIÓN', 'VENCIMIENTO', 'EXPIRA', 'VIGENCIA', 'DOMICILIO',
    'ESTADO', 'MUNICIPIO', 'SECCIÓN', 'SECCION', 'LOCALIDAD',
    'ELECTOR', 'CLAVE', 'CURP', 'FIRMA', 'HUELLA', 'FOTO',
    'GOBIERNO', 'FEDERAL', 'TARJETA', 'IDENTIFICACION', 'IDENTIFICACIÓN',
  ]);

  // Look for name (uppercase text that looks like a name)
  for (const line of lines) {
    const cleanLine = line.trim();
    // Skip short lines, lines with numbers, or lines with skip words
    if (cleanLine.length < 5) continue;
    if (/\d/.test(cleanLine)) continue;
    
    const words = cleanLine.split(/\s+/).filter(w => w.length > 1);
    const hasSkipWord = words.some(w => skipWords.has(w.toUpperCase()));
    if (hasSkipWord) continue;

    if (/^[A-Za-záéíóúñÁÉÍÓÚÑ\s]{5,50}$/.test(cleanLine) && words.length >= 2) {
      data.fullName = formatName(cleanLine);
      console.log('[OCR Generic] Found name:', data.fullName);
      break;
    }
  }

  // Parse dates
  if (dates.length >= 1) {
    data.birthDate = formatDate(dates[0]);
  }
  if (dates.length >= 2) {
    data.expiryDate = formatDate(dates[dates.length - 1]);
  }

  return data;
}

function parseColombianId(text: string, lines: string[], dates: string[]): Partial<ExtractedIdData> {
  const data: Partial<ExtractedIdData> = {};

  // Colombian CC: 6-10 digit number
  const idPattern = /\b\d{6,10}\b/;
  // More specific: look near "CEDULA" or "CC" or "NÚMERO" keywords
  const ccSection = text.match(/(?:CEDULA|CC|NÚMERO|NUMERO|No\.)[\s:]*(\d{6,10})/i);
  if (ccSection) {
    data.idNumber = ccSection[1];
  } else {
    const idMatch = text.match(idPattern);
    if (idMatch) {
      data.idNumber = idMatch[0];
    }
  }

  // Look for name
  const skipWords = new Set([
    'REPUBLICA', 'REPÚBLICA', 'COLOMBIA', 'REGISTRADURIA', 'REGISTRADURÍA',
    'NACIONAL', 'ESTADO', 'CIVIL', 'CEDULA', 'CÉDULA', 'CIUDADANIA',
    'CIUDADANÍA', 'NOMBRE', 'APELLIDOS', 'FECHA', 'NACIMIENTO', 'LUGAR',
    'EXPEDICION', 'EXPEDICIÓN', 'SEXO', 'ESTATURA', 'GRUPO', 'SANGUINEO',
    'RH', 'DOCUMENTO', 'IDENTIDAD',
  ]);

  for (const line of lines) {
    const cleanLine = line.trim();
    if (cleanLine.length < 5 || /\d/.test(cleanLine)) continue;
    const words = cleanLine.split(/\s+/).filter(w => w.length > 1);
    const hasSkipWord = words.some(w => skipWords.has(w.toUpperCase()));
    if (hasSkipWord) continue;

    if (/^[A-ZÁÉÍÓÚÑ\s]{5,50}$/.test(cleanLine) && words.length >= 2) {
      data.fullName = formatName(cleanLine);
      break;
    }
  }

  if (dates.length >= 1) data.birthDate = formatDate(dates[0]);
  if (dates.length >= 2) data.expiryDate = formatDate(dates[dates.length - 1]);

  data.nationality = 'Colombiana';
  return data;
}

function formatName(name: string): string {
  return name
    .toLowerCase()
    .split(' ')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

function formatDate(dateStr: string): string {
  // Try to normalize date format to YYYY-MM-DD
  const parts = dateStr.split(/[\/\-\.]/);
  if (parts.length === 3) {
    let [day, month, year] = parts;
    
    // Handle 2-digit year
    if (year.length === 2) {
      const currentYear = new Date().getFullYear();
      const century = parseInt(year) > (currentYear % 100) + 10 ? '19' : '20';
      year = century + year;
    }
    
    // Ensure proper formatting
    day = day.padStart(2, '0');
    month = month.padStart(2, '0');
    
    return `${year}-${month}-${day}`;
  }
  return dateStr;
}
