-- =============================================
-- AGREGAR CAMPOS FALTANTES A LA TABLA INSPECTIONS
-- Ejecutar en Supabase SQL Editor
-- =============================================

-- Campos adicionales del cliente
ALTER TABLE inspections ADD COLUMN IF NOT EXISTS client_address TEXT;
ALTER TABLE inspections ADD COLUMN IF NOT EXISTS client_driver_license TEXT;
ALTER TABLE inspections ADD COLUMN IF NOT EXISTS client_id_front_image TEXT;
ALTER TABLE inspections ADD COLUMN IF NOT EXISTS client_id_back_image TEXT;

-- Campos adicionales del vehículo
ALTER TABLE inspections ADD COLUMN IF NOT EXISTS vehicle_has_garage BOOLEAN DEFAULT FALSE;

-- Campos del tercero
ALTER TABLE inspections ADD COLUMN IF NOT EXISTS has_third_party BOOLEAN DEFAULT FALSE;
ALTER TABLE inspections ADD COLUMN IF NOT EXISTS third_party_name TEXT;
ALTER TABLE inspections ADD COLUMN IF NOT EXISTS third_party_id TEXT;
ALTER TABLE inspections ADD COLUMN IF NOT EXISTS third_party_phone TEXT;
ALTER TABLE inspections ADD COLUMN IF NOT EXISTS third_party_email TEXT;
ALTER TABLE inspections ADD COLUMN IF NOT EXISTS third_party_id_front_image TEXT;
ALTER TABLE inspections ADD COLUMN IF NOT EXISTS third_party_id_back_image TEXT;

-- Campos del vehículo del tercero
ALTER TABLE inspections ADD COLUMN IF NOT EXISTS third_party_vehicle_plate TEXT;
ALTER TABLE inspections ADD COLUMN IF NOT EXISTS third_party_vehicle_brand TEXT;
ALTER TABLE inspections ADD COLUMN IF NOT EXISTS third_party_vehicle_model TEXT;
ALTER TABLE inspections ADD COLUMN IF NOT EXISTS third_party_vehicle_year INTEGER;
ALTER TABLE inspections ADD COLUMN IF NOT EXISTS third_party_vehicle_color TEXT;

-- Campos adicionales del accidente
ALTER TABLE inspections ADD COLUMN IF NOT EXISTS claim_number TEXT;
ALTER TABLE inspections ADD COLUMN IF NOT EXISTS accident_description TEXT;
ALTER TABLE inspections ADD COLUMN IF NOT EXISTS accident_sketch_url TEXT;
ALTER TABLE inspections ADD COLUMN IF NOT EXISTS has_witnesses BOOLEAN DEFAULT FALSE;
ALTER TABLE inspections ADD COLUMN IF NOT EXISTS witness_info TEXT;
ALTER TABLE inspections ADD COLUMN IF NOT EXISTS police_present BOOLEAN DEFAULT FALSE;
ALTER TABLE inspections ADD COLUMN IF NOT EXISTS police_report_number TEXT;

-- =============================================
-- ACTUALIZAR TABLA DE FOTOS
-- =============================================

ALTER TABLE photos ADD COLUMN IF NOT EXISTS category TEXT;
ALTER TABLE photos ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE photos ADD COLUMN IF NOT EXISTS thumbnail_url TEXT;
ALTER TABLE photos ADD COLUMN IF NOT EXISTS vehicle_type TEXT;

-- =============================================
-- ACTUALIZAR TABLA DE DAÑOS
-- =============================================

ALTER TABLE damages ADD COLUMN IF NOT EXISTS photo_url TEXT;

-- =============================================
-- ACTUALIZAR TABLA DE CONSENTIMIENTOS
-- =============================================

ALTER TABLE consents ADD COLUMN IF NOT EXISTS ip_address TEXT;

-- =============================================
-- VERIFICAR QUE TODO ESTÉ CORRECTO
-- =============================================

-- Ver estructura de la tabla inspections
-- SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'inspections';
