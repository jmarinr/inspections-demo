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

  // Preprocess image with canvas for better OCR on IDs with holograms/watermarks
  const preprocessImage = useCallback(async (imageData: string, threshold: number): Promise<string> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const scale = Math.min(1600 / img.width, 1600 / img.height, 2);
        canvas.width = Math.floor(img.width * scale);
        canvas.height = Math.floor(img.height * scale);
        const ctx = canvas.getContext('2d');
        if (!ctx) { resolve(imageData); return; }

        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        const data = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const px = data.data;

        // Convert to grayscale, increase contrast, threshold
        for (let i = 0; i < px.length; i += 4) {
          const gray = px[i] * 0.299 + px[i+1] * 0.587 + px[i+2] * 0.114;
          // Apply contrast stretch
          const contrast = ((gray - 128) * 1.8) + 128;
          const val = contrast < threshold ? 0 : 255;
          px[i] = px[i+1] = px[i+2] = val;
        }
        ctx.putImageData(data, 0, 0);
        resolve(canvas.toDataURL('image/png'));
      };
      img.onerror = () => resolve(imageData);
      img.src = imageData;
    });
  }, []);

  const processImage = useCallback(async (imageFile: File | string): Promise<OCRResult> => {
    setIsProcessing(true);
    setProgress(0);
    setError(null);

    try {
      // Run OCR on original image first
      const result = await Tesseract.recognize(
        imageFile,
        'spa+eng',
        {
          logger: (m) => {
            if (m.status === 'recognizing text') {
              setProgress(Math.round(m.progress * 50)); // first pass = 0-50%
            }
          },
        }
      );

      console.log('[OCR] Pass 1 raw:', result.data.text.substring(0, 200));
      console.log('[OCR] Pass 1 confidence:', result.data.confidence);

      // If confidence is low OR text is short, try with preprocessing
      const text1 = result.data.text;
      const hasName = /[A-Z][a-z]{3,}/.test(text1) || /[A-Z]{4,}/.test(text1);
      
      if (typeof imageFile === 'string' && (result.data.confidence < 70 || !hasName)) {
        console.log('[OCR] Low confidence or missing name, trying preprocessed passes...');
        
        let bestText = text1;
        let bestConf = result.data.confidence;
        let bestBlocks = result.data.blocks;
        
        // Try multiple threshold values
        for (const thresh of [130, 150]) {
          try {
            setProgress(50 + (thresh === 130 ? 15 : 30));
            const preprocessed = await preprocessImage(imageFile, thresh);
            const res2 = await Tesseract.recognize(preprocessed, 'spa+eng', {
              logger: (m) => {
                if (m.status === 'recognizing text') {
                  setProgress(50 + (thresh === 130 ? 15 : 30) + Math.round(m.progress * 10));
                }
              },
            });
            console.log(`[OCR] Pass thresh=${thresh}:`, res2.data.text.substring(0, 200));
            
            // Score: prefer text with more recognizable ID patterns
            const score = (txt: string) => {
              let s = 0;
              if (/[A-Z][a-z]{3,}/.test(txt)) s += 20; // mixed case name
              if (/\d{1,2}[-][A-Z]{3}[-]\d{4}/.test(txt)) s += 15; // date
              if (/\d{1,2}[-]\d{2,4}[-]\d{3,6}/.test(txt)) s += 15; // cedula
              if (/NOMBRE|FECHA|NACIMIENTO|SEXO|EXPIR/i.test(txt)) s += 10; // keywords
              return s;
            };
            
            if (score(res2.data.text) > score(bestText) || res2.data.confidence > bestConf + 5) {
              bestText = res2.data.text;
              bestConf = res2.data.confidence;
              bestBlocks = res2.data.blocks;
              console.log(`[OCR] Better result at thresh=${thresh}`);
            }
          } catch { /* skip failed pass */ }
        }
        
        // Merge: combine unique lines from all passes for maximum coverage
        const lines1 = new Set(text1.split('\n').map(l => l.trim()).filter(l => l.length > 3));
        const lines2 = new Set(bestText.split('\n').map(l => l.trim()).filter(l => l.length > 3));
        const merged = [...new Set([...lines1, ...lines2])].join('\n');
        
        console.log('[OCR] Merged text lines:', merged.split('\n').length);
        
        return {
          text: merged,
          confidence: bestConf,
          blocks: bestBlocks?.map((block) => ({
            text: block.text,
            confidence: block.confidence,
            bbox: block.bbox,
          })) || [],
        };
      }

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
  }, [preprocessImage]);

  const extractIdData = useCallback(async (
    frontImage: string,
    backImage?: string,
    country: string = 'MX'
  ): Promise<{ data: ExtractedIdData | null; confidence: number; rawText: string }> => {
    setIsProcessing(true);
    setError(null);
    setRawText(null);

    try {
      // Try Claude API first (much better for ID extraction)
      try {
        console.log('[OCR] Trying Claude API for ID extraction...');
        setProgress(20);
        const claudeResult = await extractWithClaude(frontImage, backImage, country);
        if (claudeResult && (claudeResult.fullName || claudeResult.idNumber)) {
          console.log('[OCR] Claude API success:', claudeResult);
          setProgress(100);
          setRawText('(Extraído con IA avanzada)');
          return {
            data: claudeResult,
            confidence: 0.95,
            rawText: '(Extraído con IA avanzada)',
          };
        }
      } catch (claudeErr) {
        console.warn('[OCR] Claude API unavailable, falling back to Tesseract:', claudeErr);
      }

      // Fallback: Tesseract OCR
      console.log('[OCR] Processing front image with Tesseract...');
      const frontResult = await processImage(frontImage);
      
      let backResult: OCRResult | null = null;
      if (backImage) {
        console.log('[OCR] Processing back image...');
        backResult = await processImage(backImage);
      }

      const combinedText = `${frontResult.text}\n${backResult?.text || ''}`;
      setRawText(combinedText);
      console.log('[OCR] Combined text:', combinedText);

      const parsedData = parseIdDocument(combinedText, country);
      console.log('[OCR] Parsed data:', parsedData);
      
      const confidence = backResult
        ? (frontResult.confidence + backResult.confidence) / 2
        : frontResult.confidence;

      return {
        data: parsedData,
        confidence: confidence / 100,
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

// ===== CLAUDE API OCR EXTRACTION =====
async function extractWithClaude(
  frontImage: string, backImage: string | undefined, country: string
): Promise<ExtractedIdData | null> {
  const countryNames: Record<string, string> = {
    PA: 'Panamá', MX: 'México', CR: 'Costa Rica', CO: 'Colombia', PR: 'Puerto Rico'
  };

  const images: Array<{ type: 'image'; source: { type: 'base64'; media_type: string; data: string } }> = [];

  const addImage = (imgData: string) => {
    const mt = imgData.match(/^data:(image\/\w+);base64,/);
    images.push({
      type: 'image',
      source: { type: 'base64', media_type: mt ? mt[1] : 'image/jpeg', data: imgData.replace(/^data:image\/\w+;base64,/, '') }
    });
  };

  addImage(frontImage);
  if (backImage) addImage(backImage);

  const prompt = `Extrae los datos de este documento de identidad de ${countryNames[country] || 'Latinoamérica'}.

Responde SOLO con JSON válido (sin markdown, sin backticks):
{
  "fullName": "nombre completo tal como aparece",
  "idNumber": "número de cédula/identidad con formato correcto (ej: 8-203-1365 para Panamá)",
  "birthDate": "YYYY-MM-DD",
  "expiryDate": "YYYY-MM-DD",
  "gender": "M o F",
  "bloodType": "tipo de sangre (ej: O+, A-, B+)",
  "birthPlace": "lugar de nacimiento",
  "issueDate": "YYYY-MM-DD fecha de expedición"
}

Si no puedes leer algún campo, usa cadena vacía "". Lee EXACTAMENTE lo que dice el documento.`;

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 500,
      messages: [{
        role: 'user',
        content: [...images, { type: 'text' as const, text: prompt }]
      }]
    })
  });

  if (!response.ok) throw new Error(`API ${response.status}`);

  const data = await response.json();
  const text = data.content?.find((c: any) => c.type === 'text')?.text || '';
  const json = JSON.parse(text.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim());

  return {
    fullName: json.fullName || '',
    idNumber: json.idNumber || '',
    birthDate: json.birthDate || '',
    expiryDate: json.expiryDate || '',
    gender: json.gender || undefined,
    bloodType: json.bloodType || undefined,
    birthPlace: json.birthPlace || undefined,
    issueDate: json.issueDate || undefined,
    nationality: countryNames[country] ? `${countryNames[country]}` : undefined,
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
  const skipWordsSet = new Set([
    'REPUBLICA', 'REPÚBLICA', 'PANAMA', 'PANAMÁ', 'TRIBUNAL', 'ELECTORAL',
    'NOMBRE', 'USUAL', 'FECHA', 'LUGAR', 'NACIMIENTO', 'MUESTRA', 'EXPIRA',
    'SEXO', 'TIPO', 'SANGRE', 'CEDULA', 'CÉDULA', 'IDENTIDAD', 'PERSONAL',
    'EXPEDIDA', 'NACIONALIDAD', 'PANAMEÑA', 'PANAMENA', 'EMISION', 'EMISIÓN',
    'VENCIMIENTO', 'SANGUINEO', 'FOTO', 'FIRMA', 'AUTORIDAD', 'REGISTRO',
    'CIVIL', 'GOBIERNO', 'NACIONAL', 'DIRECCION', 'GENERAL', 'DE',
    'BSSMA', 'BUGAR', 'BECHA', 'ECHA', 'TIPODE', 'RANAMA', 'PANAME',
    'NAQUIENEO', 'NACIMIENEO', 'PANÑAMÁSRAÑAM',
  ]);

  const fieldLabels = ['LUGAR', 'FECHA', 'NACIMIENTO', 'EXPEDIDA', 'EXPIRA',
    'SEXO', 'SANGRE', 'NOMBRE USUAL', 'TIPO', 'EMISION'];

  // ---- Strategy ZERO: Scan ALL lines for name words, filtering non-name lines ----
  {
    const nameCandidates: { words: string[]; score: number; line: string }[] = [];
    
    for (const line of lines) {
      const upper = line.toUpperCase();
      if (fieldLabels.some(fl => upper.includes(fl))) continue;
      if (upper.includes('REPUBLICA') || upper.includes('TRIBUNAL') || upper.includes('ELECTORAL')) continue;
      if ((line.match(/\d/g) || []).length > 3) continue;
      
      const cleaned = line
        .replace(/[=~><\[\]{}()*#@!?;:_"'\|\\\/\d\-\.]+/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
      
      const words = cleaned.split(/\s+/).filter(w => {
        if (w.length < 4) return false;
        if (skipWordsSet.has(w.toUpperCase())) return false;
        if (!/^[A-Za-záéíóúñÁÉÍÓÚÑ]+$/.test(w)) return false;
        return true;
      });
      
      if (words.length === 0) continue;
      
      let score = 0;
      for (const w of words) {
        if (/^[A-ZÁÉÍÓÚÑ][a-záéíóúñ]{3,}$/.test(w)) score += 10;
        else if (/^[A-ZÁÉÍÓÚÑ]{4,}$/.test(w)) score += 5;
        else if (w.length >= 5) score += 2;
      }
      
      if (score >= 5) nameCandidates.push({ words, score, line });
    }
    
    nameCandidates.sort((a, b) => b.score - a.score);
    console.log('[OCR-PA] Strategy ZERO candidates:', nameCandidates.slice(0, 5));
    
    if (nameCandidates.length > 0) {
      const allNameWords: string[] = [...nameCandidates[0].words];
      
      // Add unique words from other good candidates (fuzzy dedup)
      for (const c of nameCandidates.slice(1, 3)) {
        if (c.score < 8) break;
        for (const w of c.words) {
          const isDup = allNameWords.some(aw => 
            aw.toLowerCase() === w.toLowerCase() ||
            (aw.length >= 4 && w.length >= 4 && 
             aw.toLowerCase().substring(0, 4) === w.toLowerCase().substring(0, 4))
          );
          if (!isDup && w.length >= 5) allNameWords.push(w);
        }
      }
      
      if (allNameWords.length >= 1) {
        data.fullName = formatName(allNameWords.join(' '));
        console.log('[OCR-PA] Strategy ZERO name:', data.fullName);
      }
    }
  }

  // ---- Strategy PRIME: Grab all text BETWEEN header and data section ----
  {
    let startIdx = -1;
    let endIdx = lines.length;
    
    for (let i = 0; i < lines.length; i++) {
      const upper = lines[i].toUpperCase();
      if (upper.includes('ELECTORAL') || upper.includes('TRIBUNAL')) {
        startIdx = i + 1;
      }
      if (startIdx >= 0 && i > startIdx) {
        if (upper.includes('NOMBRE USUAL') || upper.includes('FECHA') ||
            upper.includes('NACIMIENTO') || upper.includes('EXPEDIDA') ||
            upper.includes('SEXO:') || upper.includes('TIPO DE SANGRE') ||
            /\d{1,2}[-\/][A-Z]{3}[-\/]\d{4}/i.test(lines[i]) ||
            /\d{1,2}[-]\d{2,4}[-]\d{3,6}/.test(lines[i])) {
          endIdx = i;
          break;
        }
      }
    }
    
    console.log('[OCR-PA] Name zone: lines', startIdx, 'to', endIdx, 'of', lines.length);
    
    if (startIdx >= 0 && startIdx < endIdx) {
      const nameLines = lines.slice(startIdx, endIdx);
      
      // For each name line, extract ONLY the left-side text (name is left-aligned, 
      // right side has photo/hologram artifacts)
      // Keep only first ~60% of each line to avoid photo noise
      const cleanedLines: string[] = [];
      for (const line of nameLines) {
        // Remove everything after common artifact patterns
        let cleaned = line
          .replace(/[=~><\[\]{}()*#@!?;:_"'\|\\\/]+.*$/, '') // strip from first artifact char
          .replace(/\s+[a-z]{1,2}\s*$/i, '') // trailing single/double letter noise
          .replace(/\.\s*$/, '') // trailing dots
          .replace(/[^A-Za-záéíóúñÁÉÍÓÚÑ\s]/g, '') // remove digits and punctuation
          .replace(/\s+/g, ' ')
          .trim();
        if (cleaned.length >= 3) cleanedLines.push(cleaned);
      }
      
      console.log('[OCR-PA] Cleaned name lines:', cleanedLines);
      
      // Strategy PRIME-A: Try concatenating cleaned lines and finding longest alpha sequences
      const fullText = cleanedLines.join(' ');
      const words = fullText.split(/\s+/).filter(w => {
        if (w.length < 2) return false;
        if (skipWordsSet.has(w.toUpperCase())) return false;
        if (!/^[A-Za-záéíóúñÁÉÍÓÚÑ]+$/.test(w)) return false;
        return true;
      });
      
      // Merge fragmented words
      const merged = mergeFragmentedWords(words);
      
      if (merged.length >= 1) {
        // Filter out obvious non-name fragments (very short, or known OCR noise)
        const nameWords = merged.filter(w => w.length >= 4 || (w.length >= 3 && /^[A-ZÁÉÍÓÚÑ]/.test(w)));
        if (nameWords.length >= 1) {
          data.fullName = formatName(nameWords.join(' '));
          console.log('[OCR-PA] Strategy PRIME name:', data.fullName, 'from words:', nameWords);
        }
      }
    }
  }

  // ---- Strategy A: Mixed-case pattern (multi-word on same line) ----
  if (!data.fullName) {
    const mixedCasePattern = /([A-ZÁÉÍÓÚÑ][a-záéíóúñ]{2,}(?:\s+[A-ZÁÉÍÓÚÑ][a-záéíóúñ]{1,}){1,5})/g;
    const mixedMatches: string[] = [];
    let m;
    while ((m = mixedCasePattern.exec(text)) !== null) {
      const candidate = m[1].trim();
      const words = candidate.split(/\s+/);
      if (words.length >= 2) {
        const hasSkip = words.some(w => skipWordsSet.has(w.toUpperCase()));
        if (!hasSkip) mixedMatches.push(candidate);
      }
    }
    if (mixedMatches.length > 0) {
      data.fullName = mixedMatches.sort((a, b) => b.length - a.length)[0];
      console.log('[OCR-PA] Strategy A - mixed-case:', data.fullName);
    }
  }

  // ---- Strategy B: "NOMBRE USUAL:" keyword ----
  if (!data.fullName) {
    const nameUsualIdx = text.toUpperCase().indexOf('NOMBRE USUAL');
    if (nameUsualIdx !== -1) {
      const afterKeyword = text.substring(nameUsualIdx + 12).trim();
      const firstLine = afterKeyword.split('\n')[0]?.replace(/[^A-Za-záéíóúñÁÉÍÓÚÑ\s]/g, '').trim();
      if (firstLine && firstLine.length >= 3) {
        const nameWords = firstLine.split(/\s+/).filter(w => w.length >= 2 && !skipWordsSet.has(w.toUpperCase()));
        if (nameWords.length >= 1) {
          data.fullName = formatName(nameWords.join(' '));
          console.log('[OCR-PA] Strategy B - NOMBRE USUAL:', data.fullName);
        }
      }
    }
  }

  // ---- Strategy C: Longest non-header, non-data alpha lines ----
  if (!data.fullName) {
    const candidateLines: { text: string; score: number }[] = [];
    for (const line of lines) {
      const upper = line.toUpperCase();
      if (/\d{4}/.test(line)) continue;
      if (upper.includes('REPUBLICA') || upper.includes('TRIBUNAL') || upper.includes('ELECTORAL')) continue;
      if (upper.includes('NACIMIENTO') || upper.includes('EXPEDIDA') || upper.includes('EXPIRA')) continue;
      if (upper.includes('NOMBRE USUAL') || upper.includes('SEXO') || upper.includes('SANGRE')) continue;
      
      const cleaned = line.replace(/[^A-Za-záéíóúñÁÉÍÓÚÑ\s]/g, '').replace(/\s+/g, ' ').trim();
      const words = cleaned.split(/\s+/).filter(w => w.length >= 2 && !skipWordsSet.has(w.toUpperCase()));
      if (words.length >= 1 && words.join(' ').length >= 4) {
        candidateLines.push({ text: words.join(' '), score: words.join(' ').length });
      }
    }
    candidateLines.sort((a, b) => b.score - a.score);
    
    if (candidateLines.length >= 2) {
      data.fullName = formatName(candidateLines.slice(0, 2).map(c => c.text).join(' '));
      console.log('[OCR-PA] Strategy C - combined:', data.fullName);
    } else if (candidateLines.length === 1 && candidateLines[0].score >= 5) {
      data.fullName = formatName(candidateLines[0].text);
      console.log('[OCR-PA] Strategy C - single:', data.fullName);
    }
  }

  // ===== 3. EXTRACT DATES =====
  // Panamanian IDs use DD-MMM-YYYY format (08-OCT-1956, 01-FEB-2027)
  // OCR often corrupts these: "0CT" for "OCT", missing year digits, noise chars
  
  // Pre-clean: fix common OCR substitutions in month names
  const dateCleanText = text
    .replace(/0CT/g, 'OCT').replace(/0ct/g, 'OCT')
    .replace(/FE8/g, 'FEB').replace(/FE3/g, 'FEB')
    .replace(/N0V/g, 'NOV').replace(/D1C/g, 'DIC')
    .replace(/JU[NL]/gi, (m) => m.toUpperCase())
    .replace(/[=]/g, '-'); // OCR sometimes reads dash as equals
  
  // Keyword-based extraction (most reliable)
  const birthMatch = dateCleanText.match(/(?:NACIMIENTO|NACI)[:\s]*(\d{1,2})[-\/\s]+([A-Z]{3})[-\/\s]+(\d{4})/i);
  if (birthMatch) {
    data.birthDate = formatPanamanianDate(`${birthMatch[1]}-${birthMatch[2]}-${birthMatch[3]}`);
    console.log('[OCR-PA] Birth date from keyword:', data.birthDate);
  }
  
  const expiryMatch = dateCleanText.match(/EXPIRA[:\s]*(\d{1,2})[-\/\s]+([A-Z]{3})[-\/\s]+(\d{4})/i);
  if (expiryMatch) {
    data.expiryDate = formatPanamanianDate(`${expiryMatch[1]}-${expiryMatch[2]}-${expiryMatch[3]}`);
    console.log('[OCR-PA] Expiry date from keyword:', data.expiryDate);
  }
  
  // Also try EXPEDIDA for issue date
  const issueMatch2 = dateCleanText.match(/EXPEDIDA[:\s]*(\d{1,2})[-\/\s]+([A-Z]{3})[-\/\s]+(\d{4})/i);
  if (issueMatch2) {
    data.issueDate = formatPanamanianDate(`${issueMatch2[1]}-${issueMatch2[2]}-${issueMatch2[3]}`);
    console.log('[OCR-PA] Issue date from keyword:', data.issueDate);
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
  } else {
    // Fallback: look for M or F near SEXO keyword
    const sexoIdx = text.toUpperCase().indexOf('SEXO');
    if (sexoIdx !== -1) {
      const nearby = text.substring(sexoIdx, sexoIdx + 15).toUpperCase();
      if (nearby.includes('M')) data.gender = 'M';
      else if (nearby.includes('F')) data.gender = 'F';
      console.log('[OCR-PA] Gender (nearby):', data.gender);
    }
  }

  // ===== 5. EXTRACT BLOOD TYPE =====
  const bloodMatch = text.match(/(?:TIPO\s*(?:DE\s*)?SANGRE|SANGUINEO)\s*:?\s*([ABO]{1,2}[+-]?(?:\s*[+-])?)/i);
  if (bloodMatch) {
    data.bloodType = bloodMatch[1].replace(/\s+/g, '').toUpperCase();
    console.log('[OCR-PA] Blood type:', data.bloodType);
  }

  // ===== 6. EXTRACT BIRTH PLACE =====
  const birthPlaceMatch = text.match(/LUGAR\s*(?:DE\s*)?(?:NACI\w*|NAC[:\s])\s*:?\s*([A-Za-záéíóúñÁÉÍÓÚÑ\s,]+?)(?:\n|$|\d)/i);
  if (birthPlaceMatch) {
    let place = birthPlaceMatch[1].replace(/[^A-Za-záéíóúñÁÉÍÓÚÑ\s,]/g, '').trim();
    // Fix common OCR errors in place names
    place = place.replace(/RANAMA/g, 'PANAMA').replace(/PANAMÄ/g, 'PANAMA');
    if (place.length >= 3) {
      data.birthPlace = formatName(place);
      console.log('[OCR-PA] Birth place:', data.birthPlace);
    }
  }

  // ===== 7. EXTRACT ISSUE DATE =====
  const issueMatch = text.match(/EXPEDIDA\s*:?\s*(\d{1,2})[-\/\s]+([A-Z]{3})[-\/\s]+(\d{4})/i);
  if (issueMatch) {
    data.issueDate = formatPanamanianDate(`${issueMatch[1]}-${issueMatch[2]}-${issueMatch[3]}`);
    console.log('[OCR-PA] Issue date:', data.issueDate);
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

// Merge OCR-fragmented words: ["Mar", "garita"] → ["Margarita"]
// Only merges when it's clearly a broken word (short fragment + lowercase continuation)
function mergeFragmentedWords(words: string[]): string[] {
  if (words.length <= 1) return words;
  
  const merged: string[] = [];
  let i = 0;
  
  while (i < words.length) {
    let current = words[i];
    
    // Try merging with next word(s) if current is a short fragment
    while (i + 1 < words.length) {
      const next = words[i + 1];
      const nextStartsLower = /^[a-záéíóúñ]/.test(next);
      const currentIsShort = current.length <= 3;
      
      // Only merge if: current is very short (<=3) AND next starts lowercase
      // This handles "Mar" + "garita" but NOT "Gomez" + "quezhm"
      if (currentIsShort && nextStartsLower && next.length >= 2) {
        current = current + next;
        i++;
      } else {
        break;
      }
    }
    
    merged.push(current);
    i++;
  }
  
  // Filter: keep words >= 3 chars that look like name parts
  return merged.filter(w => w.length >= 3 && /^[A-Za-záéíóúñÁÉÍÓÚÑ]+$/.test(w));
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
