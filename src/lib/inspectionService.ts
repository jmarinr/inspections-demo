import { saveInspection, savePhotos, saveConsent, saveDamages } from './supabase';
import type { Inspection, VehiclePhoto } from '../types';

export async function submitInspectionToSupabase(inspection: Inspection): Promise<string> {
  const inspectionId = `INS-${Date.now().toString(36).toUpperCase()}`;
  
  const slaDeadline = new Date();
  slaDeadline.setHours(slaDeadline.getHours() + 24);
  
  const riskScore = calculateRiskScore(inspection);
  const qualityScore = calculateQualityScore(inspection);
  const tags = generateTags(inspection);
  
  try {
    // 1. Guardar inspección principal con TODOS los datos
    await saveInspection({
      id: inspectionId,
      status: 'Pendiente',
      
      // Cliente asegurado
      client_name: inspection.insuredPerson?.identity.extractedData?.fullName || null,
      client_id: inspection.insuredPerson?.identity.extractedData?.idNumber || null,
      client_phone: inspection.insuredPerson?.phone || null,
      client_email: inspection.insuredPerson?.email || null,
      client_address: inspection.insuredPerson?.address || null,
      client_driver_license: inspection.insuredPerson?.driverLicense || null,
      client_id_front_image: inspection.insuredPerson?.identity.frontImage || null,
      client_id_back_image: inspection.insuredPerson?.identity.backImage || null,
      
      // Vehículo asegurado
      vehicle_vin: inspection.insuredVehicle?.vin || null,
      vehicle_plate: inspection.insuredVehicle?.plate || null,
      vehicle_brand: inspection.insuredVehicle?.brand || null,
      vehicle_model: inspection.insuredVehicle?.model || null,
      vehicle_year: inspection.insuredVehicle?.year || null,
      vehicle_color: inspection.insuredVehicle?.color || null,
      vehicle_mileage: inspection.insuredVehicle?.mileage || null,
      vehicle_usage: inspection.insuredVehicle?.usage || 'private',
      vehicle_has_garage: inspection.insuredVehicle?.hasGarage || false,
      
      // Tercero (si existe)
      has_third_party: inspection.hasThirdParty,
      third_party_name: inspection.thirdPartyPerson?.identity.extractedData?.fullName || null,
      third_party_id: inspection.thirdPartyPerson?.identity.extractedData?.idNumber || null,
      third_party_phone: inspection.thirdPartyPerson?.phone || null,
      third_party_email: inspection.thirdPartyPerson?.email || null,
      third_party_id_front_image: inspection.thirdPartyPerson?.identity.frontImage || null,
      third_party_id_back_image: inspection.thirdPartyPerson?.identity.backImage || null,
      
      // Vehículo del tercero
      third_party_vehicle_plate: inspection.thirdPartyVehicle?.plate || null,
      third_party_vehicle_brand: inspection.thirdPartyVehicle?.brand || null,
      third_party_vehicle_model: inspection.thirdPartyVehicle?.model || null,
      third_party_vehicle_year: inspection.thirdPartyVehicle?.year || null,
      third_party_vehicle_color: inspection.thirdPartyVehicle?.color || null,
      
      // Póliza
      policy_number: inspection.policyNumber || null,
      claim_number: inspection.claimNumber || null,
      policy_type: 'Standard',
      policy_status: 'En-Proceso',
      
      // Scores
      risk_score: riskScore,
      quality_score: qualityScore,
      
      // Accidente
      accident_type: inspection.accidentType || null,
      accident_date: inspection.createdAt.toISOString(),
      accident_location: inspection.accidentScene?.location.address || null,
      accident_lat: inspection.accidentScene?.location.latitude || null,
      accident_lng: inspection.accidentScene?.location.longitude || null,
      
      // Información adicional del accidente
      accident_description: inspection.accidentScene?.description || null,
      accident_sketch_url: inspection.accidentScene?.sketchUrl || null,
      has_witnesses: inspection.accidentScene?.hasWitnesses || false,
      witness_info: inspection.accidentScene?.witnessInfo || null,
      police_present: inspection.accidentScene?.policePresent || false,
      police_report_number: inspection.accidentScene?.policeReportNumber || null,
      
      // Comentarios
      client_comments: inspection.accidentScene?.description || null,
      
      // SLA y metadata
      sla_deadline: slaDeadline.toISOString(),
      tags: tags,
      country: inspection.country,
    });
    
    // 2. Guardar fotos del vehículo asegurado
    const vehiclePhotos = (inspection.insuredVehicle?.photos || [])
      .filter((p: VehiclePhoto) => p.imageUrl)
      .map((p: VehiclePhoto) => ({
        inspection_id: inspectionId,
        photo_type: 'vehicle' as const,
        category: p.angle === 'damage' ? 'damage' : 'exterior',
        angle: p.angle || null,
        label: p.label || null,
        description: p.description || null,
        image_url: p.imageUrl || null,
        thumbnail_url: p.thumbnailUrl || null,
        latitude: p.metadata?.latitude || null,
        longitude: p.metadata?.longitude || null,
        timestamp: p.timestamp?.toISOString() || null,
        vehicle_type: 'insured',
      }));
    
    if (vehiclePhotos.length > 0) {
      await savePhotos(vehiclePhotos);
    }
    
    // 3. Guardar fotos del vehículo del tercero
    const thirdPartyPhotos = (inspection.thirdPartyVehicle?.photos || [])
      .filter((p: VehiclePhoto) => p.imageUrl)
      .map((p: VehiclePhoto) => ({
        inspection_id: inspectionId,
        photo_type: 'vehicle' as const,
        category: p.angle === 'damage' ? 'damage' : 'exterior',
        angle: p.angle || null,
        label: p.label || null,
        description: p.description || null,
        image_url: p.imageUrl || null,
        thumbnail_url: p.thumbnailUrl || null,
        latitude: p.metadata?.latitude || null,
        longitude: p.metadata?.longitude || null,
        timestamp: p.timestamp?.toISOString() || null,
        vehicle_type: 'third_party',
      }));
    
    if (thirdPartyPhotos.length > 0) {
      await savePhotos(thirdPartyPhotos);
    }
    
    // 4. Guardar fotos de la escena
    const scenePhotos = (inspection.accidentScene?.photos || [])
      .filter((p: VehiclePhoto) => p.imageUrl)
      .map((p: VehiclePhoto) => ({
        inspection_id: inspectionId,
        photo_type: 'scene' as const,
        category: 'scene',
        angle: null,
        label: p.label || 'Escena del accidente',
        description: p.description || null,
        image_url: p.imageUrl || null,
        thumbnail_url: p.thumbnailUrl || null,
        latitude: p.metadata?.latitude || null,
        longitude: p.metadata?.longitude || null,
        timestamp: p.timestamp?.toISOString() || null,
        vehicle_type: null,
      }));
    
    if (scenePhotos.length > 0) {
      await savePhotos(scenePhotos);
    }
    
    // 5. Guardar daños detectados desde damagePhotos
    const damagePhotosData = inspection.damagePhotos || [];
    
    if (damagePhotosData.length > 0) {
      const allDamages: any[] = [];
      
      // También guardar las fotos de daños
      const damagePhotoRecords = damagePhotosData.map((dp, index) => ({
        inspection_id: inspectionId,
        photo_type: 'damage' as const,
        category: 'damage',
        angle: 'damage',
        label: `Foto de daño ${index + 1}`,
        description: dp.analysis?.damages?.length 
          ? `${dp.analysis.damages.length} daños detectados` 
          : 'Foto de daño',
        image_url: dp.imageUrl || null,
        thumbnail_url: null,
        latitude: null,
        longitude: null,
        timestamp: dp.timestamp ? new Date(dp.timestamp).toISOString() : null,
        vehicle_type: 'insured',
      }));
      
      if (damagePhotoRecords.length > 0) {
        await savePhotos(damagePhotoRecords);
      }
      
      // Extraer daños individuales del análisis de cada foto
      damagePhotosData.forEach((dp) => {
        if (dp.analysis?.damages && dp.analysis.damages.length > 0) {
          dp.analysis.damages.forEach((damage: any) => {
            allDamages.push({
              inspection_id: inspectionId,
              part: damage.part || 'Parte no especificada',
              type: damage.type || 'Daño detectado',
              severity: damage.severity === 'minor' ? 'Leve' 
                      : damage.severity === 'moderate' ? 'Moderado'
                      : damage.severity === 'severe' ? 'Severo'
                      : damage.severity === 'total_loss' ? 'Pérdida total'
                      : 'Moderado',
              description: damage.description || null,
              confidence: Math.round((damage.confidence || 0.85) * 100),
              photo_url: dp.imageUrl,
            });
          });
        }
      });
      
      if (allDamages.length > 0) {
        await saveDamages(allDamages);
      }
    }
    
    // 6. Guardar consentimiento y firma
    if (inspection.consent?.accepted) {
      await saveConsent({
        inspection_id: inspectionId,
        person_type: 'insured',
        accepted: true,
        signature_url: inspection.consent.signatureUrl || null,
        ip_address: inspection.consent.ipAddress || null,
        timestamp: inspection.consent.timestamp?.toISOString() || new Date().toISOString(),
      });
    }
    
    console.log('✅ Inspección completa guardada:', inspectionId);
    return inspectionId;
    
  } catch (error) {
    console.error('❌ Error guardando inspección:', error);
    throw error;
  }
}

function calculateRiskScore(inspection: Inspection): number {
  let score = 50;
  
  const mileage = inspection.insuredVehicle?.mileage || 0;
  if (mileage > 100000) score += 20;
  else if (mileage > 50000) score += 10;
  
  const year = inspection.insuredVehicle?.year || new Date().getFullYear();
  const age = new Date().getFullYear() - year;
  if (age > 10) score += 15;
  else if (age > 5) score += 5;
  
  if (inspection.accidentType === 'collision') score += 10;
  if (inspection.accidentType === 'theft') score += 20;
  if (inspection.hasThirdParty) score += 10;
  if (!inspection.insuredVehicle?.hasGarage) score += 5;
  
  // Considerar daños detectados
  const damagePhotos = inspection.damagePhotos || [];
  if (damagePhotos.length > 0) {
    // Contar daños totales
    let totalDamages = 0;
    let hasSevereDamage = false;
    let hasStructuralDamage = false;
    
    damagePhotos.forEach((dp) => {
      if (dp.analysis?.damages) {
        totalDamages += dp.analysis.damages.length;
        dp.analysis.damages.forEach((d: any) => {
          if (d.severity === 'severe' || d.severity === 'total_loss') hasSevereDamage = true;
          if (d.affectsStructure) hasStructuralDamage = true;
        });
      }
      if (dp.analysis?.vehicleStatus?.isDriveable === false) score += 15;
    });
    
    if (totalDamages > 5) score += 15;
    else if (totalDamages > 2) score += 10;
    else if (totalDamages > 0) score += 5;
    
    if (hasSevereDamage) score += 10;
    if (hasStructuralDamage) score += 10;
  }
  
  return Math.min(100, Math.max(0, score));
}

function calculateQualityScore(inspection: Inspection): number {
  let score = 100;
  
  const vehiclePhotos = (inspection.insuredVehicle?.photos || [])
    .filter((p: VehiclePhoto) => p.imageUrl).length;
  if (vehiclePhotos < 8) score -= (8 - vehiclePhotos) * 5;
  
  if (!inspection.insuredPerson?.identity.validated) score -= 10;
  if (!inspection.insuredPerson?.identity.frontImage) score -= 5;
  if (!inspection.insuredVehicle?.plate) score -= 5;
  if (!inspection.insuredVehicle?.vin) score -= 5;
  if (!inspection.accidentScene?.location.address) score -= 5;
  
  if (inspection.hasThirdParty) {
    if (!inspection.thirdPartyPerson?.identity.extractedData?.fullName) score -= 10;
    if (!inspection.thirdPartyVehicle?.plate) score -= 5;
  }
  
  if (inspection.consent?.signatureUrl) score += 5;
  
  return Math.min(100, Math.max(0, score));
}

function generateTags(inspection: Inspection): string[] {
  const tags: string[] = ['Pendiente'];
  
  const mileage = inspection.insuredVehicle?.mileage || 0;
  if (mileage > 80000) tags.push('high-mileage');
  
  const year = inspection.insuredVehicle?.year || new Date().getFullYear();
  if (new Date().getFullYear() - year > 8) tags.push('old-vehicle');
  
  if (inspection.hasThirdParty) tags.push('third-party');
  if (inspection.accidentType === 'collision') tags.push('collision');
  if (inspection.accidentType === 'theft') tags.push('theft');
  if (inspection.accidentScene?.policePresent) tags.push('police-report');
  if (inspection.accidentScene?.hasWitnesses) tags.push('witnesses');
  
  // Tags de daños
  const damagePhotos = inspection.damagePhotos || [];
  if (damagePhotos.length > 0) {
    let totalDamages = 0;
    let hasSevereDamage = false;
    let notDriveable = false;
    
    damagePhotos.forEach((dp) => {
      if (dp.analysis?.damages) {
        totalDamages += dp.analysis.damages.length;
        dp.analysis.damages.forEach((d: any) => {
          if (d.severity === 'severe' || d.severity === 'total_loss') hasSevereDamage = true;
        });
      }
      if (dp.analysis?.vehicleStatus?.isDriveable === false) notDriveable = true;
    });
    
    if (totalDamages > 0) tags.push(`${totalDamages}-damages`);
    if (hasSevereDamage) tags.push('severe-damage');
    if (notDriveable) tags.push('not-driveable');
  }
  
  return tags;
}
