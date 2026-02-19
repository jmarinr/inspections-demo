import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { v4 as uuidv4 } from 'uuid';
import type { 
  Inspection, 
  Person, 
  Vehicle, 
  AccidentScene, 
  Consent,
  IdentityDocument,
  VehiclePhoto,
  AccidentType,
  DamagePhoto
} from '../types';

interface InspectionStore {
  // State
  currentStep: number;
  inspection: Inspection;
  isLoading: boolean;
  error: string | null;
  
  // Navigation actions
  setStep: (step: number) => void;
  nextStep: () => void;
  prevStep: () => void;
  
  // Inspection actions
  initInspection: (country: string, accidentType?: AccidentType) => void;
  updateInspection: (data: Partial<Inspection>) => void;
  
  // Person actions
  updateInsuredPerson: (data: Partial<Person>) => void;
  updateInsuredIdentity: (data: Partial<IdentityDocument>) => void;
  updateThirdPartyPerson: (data: Partial<Person>) => void;
  setHasThirdParty: (value: boolean) => void;
  
  // Vehicle actions
  updateInsuredVehicle: (data: Partial<Vehicle>) => void;
  updateThirdPartyVehicle: (data: Partial<Vehicle>) => void;
  addVehiclePhoto: (vehicleType: 'insured' | 'third_party', photo: VehiclePhoto) => void;
  updateVehiclePhoto: (vehicleType: 'insured' | 'third_party', photoId: string, data: Partial<VehiclePhoto>) => void;
  
  // Scene actions
  updateAccidentScene: (data: Partial<AccidentScene>) => void;
  addScenePhoto: (photo: VehiclePhoto) => void;
  
  // Damage actions
  addDamagePhoto: (photo: DamagePhoto) => void;
  removeDamagePhoto: (photoId: string) => void;
  updateDamagePhoto: (photoId: string, data: Partial<DamagePhoto>) => void;
  
  // Consent actions
  updateConsent: (data: Partial<Consent>) => void;
  
  // Utility actions
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  resetInspection: () => void;
  loadFromStorage: () => void;
}

const createEmptyInspection = (): Inspection => ({
  id: uuidv4(),
  country: '',
  accidentType: 'collision',
  status: 'draft',
  insuredPerson: null,
  insuredVehicle: null,
  hasThirdParty: false,
  thirdPartyPerson: null,
  thirdPartyVehicle: null,
  accidentScene: null,
  damagePhotos: [],
  consent: {
    accepted: false,
  },
  createdAt: new Date(),
  updatedAt: new Date(),
});

const createEmptyPerson = (type: 'insured' | 'third_party'): Person => ({
  id: uuidv4(),
  type,
  identity: {
    frontImage: null,
    backImage: null,
    extractedData: null,
    confidence: 0,
    validated: false,
  },
});

const createEmptyVehicle = (type: 'insured' | 'third_party'): Vehicle => ({
  id: uuidv4(),
  type,
  plate: '',
  vin: '',
  brand: '',
  model: '',
  year: new Date().getFullYear(),
  color: '',
  usage: 'private',
  mileage: 0,
  hasGarage: false,
  photos: getDefaultVehiclePhotos(),
});

const getDefaultVehiclePhotos = (): VehiclePhoto[] => [
  { id: uuidv4(), angle: 'front', label: 'Frontal', description: 'Vista frontal completa', imageUrl: null },
  { id: uuidv4(), angle: 'front_45_left', label: 'Frontal 45° Izq', description: 'Frontal lado conductor', imageUrl: null },
  { id: uuidv4(), angle: 'left', label: 'Lateral Izq', description: 'Lado del conductor', imageUrl: null },
  { id: uuidv4(), angle: 'rear_45_left', label: 'Trasera 45° Izq', description: 'Trasera lado conductor', imageUrl: null },
  { id: uuidv4(), angle: 'rear', label: 'Trasera', description: 'Vista trasera completa', imageUrl: null },
  { id: uuidv4(), angle: 'rear_45_right', label: 'Trasera 45° Der', description: 'Trasera lado pasajero', imageUrl: null },
  { id: uuidv4(), angle: 'right', label: 'Lateral Der', description: 'Lado del pasajero', imageUrl: null },
  { id: uuidv4(), angle: 'front_45_right', label: 'Frontal 45° Der', description: 'Frontal lado pasajero', imageUrl: null },
  { id: uuidv4(), angle: 'dashboard', label: 'Tablero', description: 'Panel de instrumentos', imageUrl: null },
  { id: uuidv4(), angle: 'interior_front', label: 'Interior delantero', description: 'Asientos delanteros', imageUrl: null },
  { id: uuidv4(), angle: 'interior_rear', label: 'Interior trasero', description: 'Asientos traseros', imageUrl: null },
  { id: uuidv4(), angle: 'trunk', label: 'Cajuela', description: 'Espacio de carga', imageUrl: null },
];

export const useInspectionStore = create<InspectionStore>()(
  persist(
    (set) => ({
      // Initial state
      currentStep: 0,
      inspection: createEmptyInspection(),
      isLoading: false,
      error: null,

      // Navigation
      setStep: (step) => set({ currentStep: step }),
      nextStep: () => set((state) => ({ currentStep: state.currentStep + 1 })),
      prevStep: () => set((state) => ({ currentStep: Math.max(0, state.currentStep - 1) })),

      // Inspection
      initInspection: (country, accidentType = 'collision') => {
        const newInspection = createEmptyInspection();
        newInspection.country = country;
        newInspection.accidentType = accidentType;
        newInspection.insuredPerson = createEmptyPerson('insured');
        newInspection.insuredVehicle = createEmptyVehicle('insured');
        set({ 
          inspection: newInspection,
          currentStep: 1,
        });
      },

      updateInspection: (data) => set((state) => ({
        inspection: {
          ...state.inspection,
          ...data,
          updatedAt: new Date(),
        },
      })),

      // Person - Insured
      updateInsuredPerson: (data) => set((state) => ({
        inspection: {
          ...state.inspection,
          insuredPerson: state.inspection.insuredPerson
            ? { ...state.inspection.insuredPerson, ...data }
            : { ...createEmptyPerson('insured'), ...data },
          updatedAt: new Date(),
        },
      })),

      updateInsuredIdentity: (data) => set((state) => ({
        inspection: {
          ...state.inspection,
          insuredPerson: state.inspection.insuredPerson
            ? {
                ...state.inspection.insuredPerson,
                identity: { ...state.inspection.insuredPerson.identity, ...data },
              }
            : null,
          updatedAt: new Date(),
        },
      })),

      // Person - Third Party
      updateThirdPartyPerson: (data) => set((state) => ({
        inspection: {
          ...state.inspection,
          thirdPartyPerson: state.inspection.thirdPartyPerson
            ? { ...state.inspection.thirdPartyPerson, ...data }
            : { ...createEmptyPerson('third_party'), ...data },
          updatedAt: new Date(),
        },
      })),

      setHasThirdParty: (value) => set((state) => ({
        inspection: {
          ...state.inspection,
          hasThirdParty: value,
          thirdPartyPerson: value ? createEmptyPerson('third_party') : null,
          thirdPartyVehicle: value ? createEmptyVehicle('third_party') : null,
          updatedAt: new Date(),
        },
      })),

      // Vehicle - Insured
      updateInsuredVehicle: (data) => set((state) => ({
        inspection: {
          ...state.inspection,
          insuredVehicle: state.inspection.insuredVehicle
            ? { ...state.inspection.insuredVehicle, ...data }
            : { ...createEmptyVehicle('insured'), ...data },
          updatedAt: new Date(),
        },
      })),

      // Vehicle - Third Party
      updateThirdPartyVehicle: (data) => set((state) => ({
        inspection: {
          ...state.inspection,
          thirdPartyVehicle: state.inspection.thirdPartyVehicle
            ? { ...state.inspection.thirdPartyVehicle, ...data }
            : { ...createEmptyVehicle('third_party'), ...data },
          updatedAt: new Date(),
        },
      })),

      // Vehicle Photos
      addVehiclePhoto: (vehicleType, photo) => set((state) => {
        const vehicleKey = vehicleType === 'insured' ? 'insuredVehicle' : 'thirdPartyVehicle';
        const vehicle = state.inspection[vehicleKey];
        if (!vehicle) return state;

        return {
          inspection: {
            ...state.inspection,
            [vehicleKey]: {
              ...vehicle,
              photos: [...vehicle.photos, photo],
            },
            updatedAt: new Date(),
          },
        };
      }),

      updateVehiclePhoto: (vehicleType, photoId, data) => set((state) => {
        const vehicleKey = vehicleType === 'insured' ? 'insuredVehicle' : 'thirdPartyVehicle';
        const vehicle = state.inspection[vehicleKey];
        if (!vehicle) return state;

        return {
          inspection: {
            ...state.inspection,
            [vehicleKey]: {
              ...vehicle,
              photos: vehicle.photos.map((p) =>
                p.id === photoId ? { ...p, ...data } : p
              ),
            },
            updatedAt: new Date(),
          },
        };
      }),

      // Scene
      updateAccidentScene: (data) => set((state) => ({
        inspection: {
          ...state.inspection,
          accidentScene: state.inspection.accidentScene
            ? { ...state.inspection.accidentScene, ...data }
            : {
                location: { latitude: 0, longitude: 0, address: '' },
                description: '',
                hasWitnesses: false,
                policePresent: false,
                photos: [],
                ...data,
              },
          updatedAt: new Date(),
        },
      })),

      addScenePhoto: (photo) => set((state) => ({
        inspection: {
          ...state.inspection,
          accidentScene: state.inspection.accidentScene
            ? {
                ...state.inspection.accidentScene,
                photos: [...state.inspection.accidentScene.photos, photo],
              }
            : null,
          updatedAt: new Date(),
        },
      })),

      // Damage Photos
      addDamagePhoto: (photo) => set((state) => ({
        inspection: {
          ...state.inspection,
          damagePhotos: [...state.inspection.damagePhotos, photo],
          updatedAt: new Date(),
        },
      })),

      removeDamagePhoto: (photoId) => set((state) => ({
        inspection: {
          ...state.inspection,
          damagePhotos: state.inspection.damagePhotos.filter(p => p.id !== photoId),
          updatedAt: new Date(),
        },
      })),

      updateDamagePhoto: (photoId, data) => set((state) => ({
        inspection: {
          ...state.inspection,
          damagePhotos: state.inspection.damagePhotos.map(p => 
            p.id === photoId ? { ...p, ...data } : p
          ),
          updatedAt: new Date(),
        },
      })),

      // Consent
      updateConsent: (data) => set((state) => ({
        inspection: {
          ...state.inspection,
          consent: { ...state.inspection.consent, ...data },
          updatedAt: new Date(),
        },
      })),

      // Utility
      setLoading: (loading) => set({ isLoading: loading }),
      setError: (error) => set({ error }),
      
      resetInspection: () => set({
        currentStep: 0,
        inspection: createEmptyInspection(),
        isLoading: false,
        error: null,
      }),

      loadFromStorage: () => {
        // The persist middleware handles this automatically
      },
    }),
    {
      name: 'accident-inspection-storage',
      partialize: (state) => ({
        inspection: state.inspection,
        currentStep: state.currentStep,
      }),
    }
  )
);
