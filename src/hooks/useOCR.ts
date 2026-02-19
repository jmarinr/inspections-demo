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
  console.log('[OCR-PA] Raw text:', text);

  // ===== 1. EXTRACT CÉDULA NUMBER =====
  // Tesseract often fragments the ID. Look for multiple patterns:
  
  // Pattern A: Standard with dashes: 8-203-1365
  const dashPatterns = [
    /\b(\d{1,2})-(\d{2,4})-(\d{3,6})\b/,
    /\b(\d{1,2})[-–](\d{2,4})[-–](\d{3,6})\b/,
  ];
  
  for (const pattern of dashPatterns) {
    const match = text.match(pattern);
    if (match && match[1] && match[2] && match[3]) {
      data.idNumber = `${match[1]}-${match[2]}-${match[3]}`;
      console.log('[OCR-PA] Found ID (dashed):', data.idNumber);
      break;
    }
  }

  // Pattern B: Tesseract might read spaces instead of dashes: "8 203 1365"
  // Or embed it in another line like "TIPO DE SANGRE: N 8 203 1365"
  if (!data.idNumber) {
    // Look for 3 consecutive number groups that fit cédula format
    const spaceIdPattern = /\b(\d{1,2})\s+(\d{2,4})\s+(\d{3,6})\b/g;
    let match;
    while ((match = spaceIdPattern.exec(text)) !== null) {
      const [, p1, p2, p3] = match;
      const num1 = parseInt(p1);
      const num2 = parseInt(p2);
      const num3 = parseInt(p3);
      // Validate: first part 1-13 (province), second 1-9999, third 1-999999
      if (num1 >= 1 && num1 <= 13 && num2 >= 1 && num2 <= 9999 && num3 >= 1) {
        data.idNumber = `${p1}-${p2}-${p3}`;
        console.log('[OCR-PA] Found ID (from spaces):', data.idNumber);
        break;
      }
    }
  }
  
  // Pattern C: Look near keywords like "CEDULA", "No.", "#"
  if (!data.idNumber) {
    const keywordIdPattern = /(?:CEDULA|CÉDULA|No\.?|#|PERSONAL)\s*:?\s*(\d{1,2})[\s\-–]+(\d{2,4})[\s\-–]+(\d{3,6})/i;
    const match = text.match(keywordIdPattern);
    if (match) {
      data.idNumber = `${match[1]}-${match[2]}-${match[3]}`;
      console.log('[OCR-PA] Found ID (keyword):', data.idNumber);
    }
  }

  // ===== 2. EXTRACT NAME =====
  // Panamanian IDs have the name after institution header lines.
  // Tesseract often fragments names across lines. We need to reconstruct.
  
  // Words to skip - institutional/label text
  const skipWordsSet = new Set([
    'REPUBLICA', 'REPÚBLICA', 'PANAMA', 'PANAMÁ', 'TRIBUNAL', 'ELECTORAL',
    'NOMBRE', 'USUAL', 'FECHA', 'LUGAR', 'NACIMIENTO', 'MUESTRA', 'EXPIRA',
    'SEXO', 'TIPO', 'SANGRE', 'CEDULA', 'CÉDULA', 'IDENTIDAD', 'PERSONAL',
    'EXPEDIDA', 'NACIONALIDAD', 'PANAMEÑA', 'PANAMENA', 'EMISION', 'EMISIÓN',
    'VENCIMIENTO', 'RH', 'SANGUINEO', 'FOTO', 'FIRMA',
  ]);
  
  // Strategy 1: Look for name near "NOMBRE USUAL" or after header
  const nameUsualIdx = text.toUpperCase().indexOf('NOMBRE USUAL');
  if (nameUsualIdx !== -1) {
    // Get text after "NOMBRE USUAL:" and extract the name
    const afterNameUsual = text.substring(nameUsualIdx + 12).trim();
    const nameLines = afterNameUsual.split('\n').map(l => l.trim()).filter(Boolean);
    if (nameLines.length > 0) {
      const candidateName = nameLines[0].replace(/[^A-Za-záéíóúñÁÉÍÓÚÑ\s]/g, '').trim();
      if (candidateName.length >= 3) {
        data.fullName = formatName(candidateName);
        console.log('[OCR-PA] Found name after NOMBRE USUAL:', data.fullName);
      }
    }
  }
  
  // Strategy 2: Reconstruct fragmented name from consecutive "name-like" lines
  // After "TRIBUNAL ELECTORAL" header, look for name fragments
  if (!data.fullName) {
    const nameFragments: string[] = [];
    let foundHeader = false;
    
    for (const line of lines) {
      const upper = line.toUpperCase().trim();
      
      // Mark when we pass the header
      if (upper.includes('ELECTORAL') || upper.includes('TRIBUNAL') || upper.includes('PANAMA')) {
        foundHeader = true;
        continue;
      }
      
      // Stop at labels/data sections
      if (upper.includes('NACIMIENTO') || upper.includes('FECHA') || 
          upper.includes('EXPEDIDA') || upper.includes('SEXO') ||
          upper.includes('TIPO DE SANGRE') || upper.includes('NOMBRE USUAL')) {
        break;
      }
      
      if (!foundHeader) continue;
      
      // Clean the line: remove OCR artifacts like ~ > - = \ | etc.
      const cleaned = line
        .replace(/[~><=|\\\/\[\]{}()*#@!?.,;:0-9]/g, '')
        .replace(/\s+/g, ' ')
        .trim();
      
      // Skip if too short or contains skip words
      if (cleaned.length < 2) continue;
      const words = cleaned.split(/\s+/).filter(w => w.length >= 2);
      if (words.length === 0) continue;
      
      const isAllSkipWords = words.every(w => skipWordsSet.has(w.toUpperCase()));
      if (isAllSkipWords) continue;
      
      // Accept words that look like name parts (mostly letters)
      const nameWords = words.filter(w => /^[A-Za-záéíóúñÁÉÍÓÚÑ]{2,}$/.test(w));
      if (nameWords.length > 0) {
        nameFragments.push(...nameWords);
      }
    }
    
    if (nameFragments.length >= 2) {
      // Filter out any remaining skip words
      const filteredFragments = nameFragments.filter(
        w => !skipWordsSet.has(w.toUpperCase())
      );
      if (filteredFragments.length >= 2) {
        data.fullName = formatName(filteredFragments.join(' '));
        console.log('[OCR-PA] Reconstructed name from fragments:', data.fullName, '(from:', filteredFragments, ')');
      }
    }
  }
  
  // Strategy 3: Look for mixed case name pattern (Margarita Gomez Velazquez)
  if (!data.fullName) {
    const mixedCasePattern = /\b([A-ZÁÉÍÓÚÑ][a-záéíóúñ]{2,}(?:\s+[A-ZÁÉÍÓÚÑ][a-záéíóúñ]{2,}){1,4})\b/g;
    const matches = text.match(mixedCasePattern) || [];
    for (const match of matches) {
      const words = match.split(/\s+/);
      if (words.length >= 2 && words.length <= 5) {
        const hasSkip = words.some(w => skipWordsSet.has(w.toUpperCase()));
        if (!hasSkip) {
          data.fullName = match;
          console.log('[OCR-PA] Found mixed case name:', data.fullName);
          break;
        }
      }
    }
  }

  // ===== 3. EXTRACT DATES =====
  // Panamanian IDs use DD-MMM-YYYY format (08-OCT-1956, 01-FEB-2027)
  const datePatterns = [
    /(\d{1,2})[-\/\s]([A-Z]{3})[-\/\s](\d{4})/gi,  // 08-OCT-1956 or 01 FEB 2027
    /(\d{1,2})[-\/](\d{1,2})[-\/](\d{4})/g,          // 08/10/1956
  ];
  
  const allDates: { raw: string; type: string }[] = [];
  
  // Find dates near NACIMIENTO keyword for birth date
  const birthSection = text.match(/NACIMIENTO[:\s]*(\d{1,2}[-\/\s][A-Z]{3}[-\/\s]\d{4})/i);
  if (birthSection) {
    allDates.push({ raw: birthSection[1], type: 'birth' });
  }
  
  // Find date near EXPIRA keyword
  const expiraSection = text.match(/EXPIRA[:\s]*(\d{1,2}[-\/\s][A-Z]{3}[-\/\s]\d{4})/i);
  if (expiraSection) {
    allDates.push({ raw: expiraSection[1], type: 'expiry' });
  }
  
  // Find date near EXPEDIDA keyword
  const expedidaSection = text.match(/EXPEDIDA[:\s]*(\d{1,2}[-\/\s][A-Z]{3}[-\/\s]\d{4})/i);
  if (expedidaSection) {
    // This is the issuance date, not birth - use it only if no expiry found
  }
  
  // Fallback: find all dates in order
  if (allDates.length === 0) {
    for (const pattern of datePatterns) {
      let match;
      const regex = new RegExp(pattern.source, pattern.flags);
      while ((match = regex.exec(text)) !== null) {
        allDates.push({ raw: match[0], type: 'unknown' });
      }
    }
  }
  
  console.log('[OCR-PA] Found dates:', allDates);
  
  // Assign dates
  for (const d of allDates) {
    if (d.type === 'birth') {
      data.birthDate = formatPanamanianDate(d.raw);
    } else if (d.type === 'expiry') {
      data.expiryDate = formatPanamanianDate(d.raw);
    }
  }
  
  // If we have untyped dates, assign by position/value
  if (!data.birthDate || !data.expiryDate) {
    const untypedDates = allDates.filter(d => d.type === 'unknown');
    for (const d of untypedDates) {
      const formatted = formatPanamanianDate(d.raw);
      const year = parseInt(formatted.split('-')[0] || '0');
      if (!data.birthDate && year < 2010) {
        data.birthDate = formatted;
      } else if (!data.expiryDate && year >= 2020) {
        data.expiryDate = formatted;
      }
    }
  }

  // ===== 4. EXTRACT GENDER =====
  const genderMatch = text.match(/SEXO\s*:?\s*([MF])/i);
  if (genderMatch) {
    data.gender = genderMatch[1].toUpperCase() as 'M' | 'F';
    console.log('[OCR-PA] Found gender:', data.gender);
  }

  data.nationality = 'Panameña';

  console.log('[OCR-PA] Final parsed data:', data);
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
