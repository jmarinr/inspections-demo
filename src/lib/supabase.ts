import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://mvcimblwqhyhgjwcxttc.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_u6Kgixtcl8BAvJxg1KVyBA_SlKxHDDj';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Tipos para la base de datos
export interface DBInspection {
  id: string;
  created_at?: string;
  updated_at?: string;
  status: 'Pendiente' | 'En Revisión' | 'Aprobada' | 'Rechazada' | 'Reinspección';
  
  // Cliente
  client_name: string | null;
  client_id: string | null;
  client_phone: string | null;
  client_email: string | null;
  client_address?: string | null;
  client_driver_license?: string | null;
  client_id_front_image?: string | null;
  client_id_back_image?: string | null;
  
  // Vehículo
  vehicle_vin: string | null;
  vehicle_plate: string | null;
  vehicle_brand: string | null;
  vehicle_model: string | null;
  vehicle_year: number | null;
  vehicle_color: string | null;
  vehicle_mileage: number | null;
  vehicle_usage: string | null;
  vehicle_has_garage?: boolean;
  
  // Tercero
  has_third_party?: boolean;
  third_party_name?: string | null;
  third_party_id?: string | null;
  third_party_phone?: string | null;
  third_party_email?: string | null;
  third_party_id_front_image?: string | null;
  third_party_id_back_image?: string | null;
  
  // Vehículo del tercero
  third_party_vehicle_plate?: string | null;
  third_party_vehicle_brand?: string | null;
  third_party_vehicle_model?: string | null;
  third_party_vehicle_year?: number | null;
  third_party_vehicle_color?: string | null;
  
  // Póliza
  policy_number: string | null;
  claim_number?: string | null;
  policy_type: 'Premium' | 'Standard' | 'Comprehensive';
  policy_status: 'En-Proceso' | 'Emitida' | 'Rechazada' | 'Cancelada';
  
  // Scores
  risk_score: number;
  quality_score: number;
  
  // Accidente
  accident_type: string | null;
  accident_date: string | null;
  accident_location: string | null;
  accident_lat: number | null;
  accident_lng: number | null;
  accident_description?: string | null;
  accident_sketch_url?: string | null;
  has_witnesses?: boolean;
  witness_info?: string | null;
  police_present?: boolean;
  police_report_number?: string | null;
  
  // Comentarios
  client_comments: string | null;
  review_notes?: string | null;
  
  // SLA y metadata
  sla_deadline: string | null;
  tags: string[];
  country: string;
}

export interface DBPhoto {
  id?: string;
  inspection_id: string;
  created_at?: string;
  photo_type: 'vehicle' | 'damage' | 'scene' | 'document';
  category?: string | null;
  angle: string | null;
  label: string | null;
  description?: string | null;
  image_url: string | null;
  thumbnail_url?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  timestamp: string | null;
  vehicle_type?: string | null;
}

export interface DBDamage {
  id?: string;
  inspection_id: string;
  created_at?: string;
  part: string;
  type: string;
  severity: 'Leve' | 'Moderado' | 'Severo' | 'Pérdida total';
  zone?: string | null;
  side?: 'left' | 'right' | 'center' | 'front' | 'rear' | null;
  confidence: number;
  description?: string | null;
  repair_type?: string | null;
  affects_structure?: boolean;
  affects_mechanical?: boolean;
  affects_safety?: boolean;
  approved?: boolean | null;
  photo_url?: string | null;
}

export interface DBConsent {
  id?: string;
  inspection_id: string;
  created_at?: string;
  person_type: 'insured' | 'third_party';
  accepted: boolean;
  signature_url: string | null;
  ip_address?: string | null;
  timestamp: string;
}

// Funciones helper
export async function saveInspection(inspection: Partial<DBInspection>) {
  const { data, error } = await supabase
    .from('inspections')
    .upsert(inspection)
    .select()
    .single();
  
  if (error) {
    console.error('Error saving inspection:', error);
    throw error;
  }
  return data;
}

export async function savePhotos(photos: Partial<DBPhoto>[]) {
  if (photos.length === 0) return [];
  
  const { data, error } = await supabase
    .from('photos')
    .insert(photos)
    .select();
  
  if (error) {
    console.error('Error saving photos:', error);
    throw error;
  }
  return data;
}

export async function saveDamages(damages: Partial<DBDamage>[]) {
  if (damages.length === 0) return [];
  
  const { data, error } = await supabase
    .from('damages')
    .insert(damages)
    .select();
  
  if (error) {
    console.error('Error saving damages:', error);
    throw error;
  }
  return data;
}

export async function saveConsent(consent: Partial<DBConsent>) {
  const { data, error } = await supabase
    .from('consents')
    .insert(consent)
    .select()
    .single();
  
  if (error) {
    console.error('Error saving consent:', error);
    throw error;
  }
  return data;
}
