-- =====================================================
-- ACCIDENT INSPECTION DATABASE SCHEMA
-- Para Supabase (PostgreSQL)
-- =====================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- TABLA: inspections (Inspecciones principales)
-- =====================================================
CREATE TABLE inspections (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    policy_number VARCHAR(100),
    claim_number VARCHAR(100),
    country VARCHAR(2) NOT NULL DEFAULT 'MX',
    accident_type VARCHAR(50) NOT NULL DEFAULT 'collision',
    status VARCHAR(20) NOT NULL DEFAULT 'draft',
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    submitted_at TIMESTAMPTZ,
    
    -- Geolocation
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    
    -- Consent
    consent_accepted BOOLEAN DEFAULT FALSE,
    consent_signature_url TEXT,
    consent_timestamp TIMESTAMPTZ,
    
    -- Metadata
    device_info JSONB,
    ip_address INET,
    
    CONSTRAINT valid_status CHECK (status IN ('draft', 'in_progress', 'submitted', 'processing', 'completed', 'rejected')),
    CONSTRAINT valid_accident_type CHECK (accident_type IN ('collision', 'theft', 'vandalism', 'natural_disaster', 'self_damage', 'other'))
);

-- Index for faster queries
CREATE INDEX idx_inspections_status ON inspections(status);
CREATE INDEX idx_inspections_created_at ON inspections(created_at DESC);
CREATE INDEX idx_inspections_country ON inspections(country);

-- =====================================================
-- TABLA: persons (Personas involucradas)
-- =====================================================
CREATE TABLE persons (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    inspection_id UUID NOT NULL REFERENCES inspections(id) ON DELETE CASCADE,
    person_type VARCHAR(20) NOT NULL,
    
    -- Identity data
    full_name VARCHAR(255),
    id_number VARCHAR(50),
    birth_date DATE,
    document_expiry DATE,
    nationality VARCHAR(100),
    gender VARCHAR(10),
    
    -- Contact
    phone VARCHAR(50),
    email VARCHAR(255),
    address TEXT,
    driver_license VARCHAR(50),
    
    -- Document photos
    id_front_url TEXT,
    id_back_url TEXT,
    
    -- OCR confidence
    ocr_confidence DECIMAL(3, 2),
    data_validated BOOLEAN DEFAULT FALSE,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT valid_person_type CHECK (person_type IN ('insured', 'third_party', 'witness'))
);

CREATE INDEX idx_persons_inspection ON persons(inspection_id);

-- =====================================================
-- TABLA: vehicles (Vehículos)
-- =====================================================
CREATE TABLE vehicles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    inspection_id UUID NOT NULL REFERENCES inspections(id) ON DELETE CASCADE,
    vehicle_type VARCHAR(20) NOT NULL,
    
    -- Identification
    plate VARCHAR(20),
    vin VARCHAR(17),
    
    -- Specifications
    brand VARCHAR(100),
    model VARCHAR(100),
    year INTEGER,
    version VARCHAR(100),
    color VARCHAR(50),
    
    -- Usage
    usage_type VARCHAR(20) DEFAULT 'private',
    mileage INTEGER,
    has_garage BOOLEAN DEFAULT FALSE,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT valid_vehicle_type CHECK (vehicle_type IN ('insured', 'third_party')),
    CONSTRAINT valid_usage_type CHECK (usage_type IN ('private', 'commercial', 'public')),
    CONSTRAINT valid_year CHECK (year >= 1900 AND year <= 2100)
);

CREATE INDEX idx_vehicles_inspection ON vehicles(inspection_id);
CREATE INDEX idx_vehicles_plate ON vehicles(plate);
CREATE INDEX idx_vehicles_vin ON vehicles(vin);

-- =====================================================
-- TABLA: photos (Fotografías)
-- =====================================================
CREATE TABLE photos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    inspection_id UUID NOT NULL REFERENCES inspections(id) ON DELETE CASCADE,
    vehicle_id UUID REFERENCES vehicles(id) ON DELETE SET NULL,
    
    -- Classification
    category VARCHAR(50) NOT NULL,
    angle VARCHAR(50),
    label VARCHAR(100),
    description TEXT,
    
    -- Storage
    url TEXT NOT NULL,
    thumbnail_url TEXT,
    file_size INTEGER,
    mime_type VARCHAR(50),
    
    -- Metadata
    exif_data JSONB,
    ai_analysis JSONB,
    
    -- Geolocation from EXIF
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    
    captured_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT valid_category CHECK (category IN ('exterior', 'interior', 'damage', 'document', 'scene', 'third_party'))
);

CREATE INDEX idx_photos_inspection ON photos(inspection_id);
CREATE INDEX idx_photos_vehicle ON photos(vehicle_id);
CREATE INDEX idx_photos_category ON photos(category);

-- =====================================================
-- TABLA: accident_scenes (Escena del accidente)
-- =====================================================
CREATE TABLE accident_scenes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    inspection_id UUID NOT NULL UNIQUE REFERENCES inspections(id) ON DELETE CASCADE,
    
    -- Location
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    address TEXT,
    
    -- Description
    description TEXT,
    sketch_url TEXT,
    
    -- Witnesses & Police
    has_witnesses BOOLEAN DEFAULT FALSE,
    witness_info TEXT,
    police_present BOOLEAN DEFAULT FALSE,
    police_report_number VARCHAR(100),
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_scenes_inspection ON accident_scenes(inspection_id);

-- =====================================================
-- TABLA: ai_analysis (Análisis de IA)
-- =====================================================
CREATE TABLE ai_analysis (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    inspection_id UUID NOT NULL REFERENCES inspections(id) ON DELETE CASCADE,
    photo_id UUID REFERENCES photos(id) ON DELETE SET NULL,
    
    analysis_type VARCHAR(50) NOT NULL,
    result JSONB NOT NULL,
    confidence DECIMAL(3, 2),
    
    processed_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT valid_analysis_type CHECK (analysis_type IN ('damage_detection', 'ocr', 'vehicle_recognition', 'scene_analysis'))
);

CREATE INDEX idx_ai_inspection ON ai_analysis(inspection_id);

-- =====================================================
-- FUNCIONES Y TRIGGERS
-- =====================================================

-- Función para actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger para inspections
CREATE TRIGGER update_inspections_updated_at
    BEFORE UPDATE ON inspections
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- ROW LEVEL SECURITY (RLS)
-- =====================================================

-- Habilitar RLS en todas las tablas
ALTER TABLE inspections ENABLE ROW LEVEL SECURITY;
ALTER TABLE persons ENABLE ROW LEVEL SECURITY;
ALTER TABLE vehicles ENABLE ROW LEVEL SECURITY;
ALTER TABLE photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE accident_scenes ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_analysis ENABLE ROW LEVEL SECURITY;

-- Política: Permitir acceso anónimo para crear inspecciones (para MVP)
-- En producción, deberías requerir autenticación
CREATE POLICY "Allow anonymous insert" ON inspections
    FOR INSERT
    TO anon
    WITH CHECK (true);

CREATE POLICY "Allow anonymous select own" ON inspections
    FOR SELECT
    TO anon
    USING (true);

CREATE POLICY "Allow anonymous update own" ON inspections
    FOR UPDATE
    TO anon
    USING (true);

-- Políticas similares para otras tablas
CREATE POLICY "Allow anonymous all" ON persons FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "Allow anonymous all" ON vehicles FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "Allow anonymous all" ON photos FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "Allow anonymous all" ON accident_scenes FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "Allow anonymous all" ON ai_analysis FOR ALL TO anon USING (true) WITH CHECK (true);

-- =====================================================
-- STORAGE BUCKETS
-- =====================================================
-- Ejecutar en Supabase Dashboard > Storage

-- Crear bucket para fotos de inspección
-- INSERT INTO storage.buckets (id, name, public) VALUES ('inspection-photos', 'inspection-photos', true);

-- Política de storage para permitir uploads
-- CREATE POLICY "Allow public uploads" ON storage.objects
--     FOR INSERT
--     TO anon
--     WITH CHECK (bucket_id = 'inspection-photos');

-- CREATE POLICY "Allow public read" ON storage.objects
--     FOR SELECT
--     TO anon
--     USING (bucket_id = 'inspection-photos');
