// Tipos principales de la aplicación

export interface Country {
  code: string;
  name: string;
  flag: string;
  idDocumentName: string;
  idPattern: RegExp;
  platePattern: RegExp;
}

export interface IdentityDocument {
  frontImage: string | null;
  backImage: string | null;
  extractedData: ExtractedIdData | null;
  confidence: number;
  validated: boolean;
}

export interface ExtractedIdData {
  fullName: string;
  idNumber: string;
  birthDate: string;
  expiryDate: string;
  nationality?: string;
  gender?: string;
}

export interface Person {
  id: string;
  type: 'insured' | 'third_party';
  identity: IdentityDocument;
  phone?: string;
  email?: string;
  address?: string;
  driverLicense?: string;
}

export interface Vehicle {
  id: string;
  type: 'insured' | 'third_party';
  plate: string;
  vin: string;
  brand: string;
  model: string;
  year: number;
  version?: string;
  color: string;
  usage: 'private' | 'commercial' | 'public';
  mileage: number;
  hasGarage: boolean;
  photos: VehiclePhoto[];
}

export interface VehiclePhoto {
  id: string;
  angle: PhotoAngle;
  label: string;
  description: string;
  imageUrl: string | null;
  thumbnailUrl?: string;
  timestamp?: Date;
  metadata?: PhotoMetadata;
}

export type PhotoAngle = 
  | 'front'
  | 'front_45_left'
  | 'left'
  | 'rear_45_left'
  | 'rear'
  | 'rear_45_right'
  | 'right'
  | 'front_45_right'
  | 'dashboard'
  | 'interior_front'
  | 'interior_rear'
  | 'trunk'
  | 'damage'
  | 'scene';

export interface PhotoMetadata {
  latitude?: number;
  longitude?: number;
  timestamp?: string;
  deviceInfo?: string;
}

export interface AccidentScene {
  location: {
    latitude: number;
    longitude: number;
    address: string;
  };
  description: string;
  sketchUrl?: string;
  hasWitnesses: boolean;
  witnessInfo?: string;
  policePresent: boolean;
  policeReportNumber?: string;
  photos: VehiclePhoto[];
}

export interface Consent {
  accepted: boolean;
  signatureUrl?: string;
  timestamp?: Date;
  ipAddress?: string;
}

// Damage photo type (analysis uses the type from useDamageDetection hook)
export interface DamagePhoto {
  id: string;
  imageUrl: string;
  timestamp: Date;
  analysis?: any; // Uses DamageAnalysisResult from useDamageDetection hook
}

export type AccidentType = 
  | 'collision'
  | 'theft'
  | 'vandalism'
  | 'natural_disaster'
  | 'self_damage'
  | 'other';

export interface Inspection {
  id: string;
  policyNumber?: string;
  claimNumber?: string;
  country: string;
  accidentType: AccidentType;
  status: 'draft' | 'in_progress' | 'submitted' | 'processed';
  insuredPerson: Person | null;
  insuredVehicle: Vehicle | null;
  hasThirdParty: boolean;
  thirdPartyPerson: Person | null;
  thirdPartyVehicle: Vehicle | null;
  accidentScene: AccidentScene | null;
  damagePhotos: DamagePhoto[];
  consent: Consent;
  createdAt: Date;
  updatedAt: Date;
  submittedAt?: Date;
}

// Store state type
export interface InspectionState {
  currentStep: number;
  inspection: Inspection;
  isLoading: boolean;
  error: string | null;
}

// Wizard step definition
export interface WizardStep {
  id: string;
  title: string;
  subtitle?: string;
  component: React.ComponentType;
  isOptional?: boolean;
  isVisible?: (inspection: Inspection) => boolean;
}

// OCR result type
export interface OCRResult {
  text: string;
  confidence: number;
  blocks: OCRBlock[];
}

export interface OCRBlock {
  text: string;
  confidence: number;
  bbox: {
    x0: number;
    y0: number;
    x1: number;
    y1: number;
  };
}

// API response types
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}
