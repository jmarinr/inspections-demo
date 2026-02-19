import type { Country, AccidentType } from '../types';

export const COUNTRIES: Country[] = [
  {
    code: 'MX',
    name: 'México',
    flag: '🇲🇽',
    idDocumentName: 'INE/IFE',
    idPattern: /^[A-Z]{6}[0-9]{8}[A-Z]{1}[0-9]{3}$/,
    platePattern: /^[A-Z]{3}[-]?[0-9]{3,4}[-]?[A-Z]?$/,
  },
  {
    code: 'CR',
    name: 'Costa Rica',
    flag: '🇨🇷',
    idDocumentName: 'Cédula de Identidad',
    idPattern: /^[0-9]{1}-[0-9]{4}-[0-9]{4}$/,
    platePattern: /^[A-Z]{3}[-]?[0-9]{3}$/,
  },
  {
    code: 'PA',
    name: 'Panamá',
    flag: '🇵🇦',
    idDocumentName: 'Cédula de Identidad',
    idPattern: /^[0-9]{1,2}-[0-9]{1,4}-[0-9]{1,6}$/,
    platePattern: /^[A-Z]{2,3}[-]?[0-9]{4}$/,
  },
  {
    code: 'CO',
    name: 'Colombia',
    flag: '🇨🇴',
    idDocumentName: 'Cédula de Ciudadanía',
    idPattern: /^[0-9]{6,10}$/,
    platePattern: /^[A-Z]{3}[-]?[0-9]{3}$/,
  },
  {
    code: 'GT',
    name: 'Guatemala',
    flag: '🇬🇹',
    idDocumentName: 'DPI',
    idPattern: /^[0-9]{4}[-]?[0-9]{5}[-]?[0-9]{4}$/,
    platePattern: /^[A-Z]{1}[-]?[0-9]{3}[A-Z]{3}$/,
  },
  {
    code: 'SV',
    name: 'El Salvador',
    flag: '🇸🇻',
    idDocumentName: 'DUI',
    idPattern: /^[0-9]{8}-[0-9]{1}$/,
    platePattern: /^[A-Z]{1}[-]?[0-9]{3}[-]?[0-9]{3}$/,
  },
  {
    code: 'HN',
    name: 'Honduras',
    flag: '🇭🇳',
    idDocumentName: 'Tarjeta de Identidad',
    idPattern: /^[0-9]{4}-[0-9]{4}-[0-9]{5}$/,
    platePattern: /^[A-Z]{3}[-]?[0-9]{4}$/,
  },
  {
    code: 'NI',
    name: 'Nicaragua',
    flag: '🇳🇮',
    idDocumentName: 'Cédula de Identidad',
    idPattern: /^[0-9]{3}-[0-9]{6}-[0-9]{4}[A-Z]{1}$/,
    platePattern: /^[A-Z]{2}[-]?[0-9]{5}$/,
  },
];

export const ACCIDENT_TYPES: { value: AccidentType; label: string; icon: string }[] = [
  { value: 'collision', label: 'Colisión', icon: '💥' },
  { value: 'theft', label: 'Robo', icon: '🚨' },
  { value: 'vandalism', label: 'Vandalismo', icon: '🔨' },
  { value: 'natural_disaster', label: 'Desastre Natural', icon: '🌊' },
  { value: 'self_damage', label: 'Daños Propios', icon: '⚠️' },
  { value: 'other', label: 'Otro', icon: '📋' },
];

export const VEHICLE_BRANDS = [
  'Acura', 'Alfa Romeo', 'Audi', 'BMW', 'Buick', 'Cadillac', 'Chevrolet',
  'Chrysler', 'Dodge', 'Fiat', 'Ford', 'GMC', 'Honda', 'Hyundai', 'Infiniti',
  'Jaguar', 'Jeep', 'Kia', 'Land Rover', 'Lexus', 'Lincoln', 'Mazda',
  'Mercedes-Benz', 'Mini', 'Mitsubishi', 'Nissan', 'Peugeot', 'Porsche',
  'RAM', 'Renault', 'Seat', 'Subaru', 'Suzuki', 'Tesla', 'Toyota',
  'Volkswagen', 'Volvo',
];

export const VEHICLE_COLORS = [
  { value: 'white', label: 'Blanco' },
  { value: 'black', label: 'Negro' },
  { value: 'silver', label: 'Plata' },
  { value: 'gray', label: 'Gris' },
  { value: 'red', label: 'Rojo' },
  { value: 'blue', label: 'Azul' },
  { value: 'green', label: 'Verde' },
  { value: 'yellow', label: 'Amarillo' },
  { value: 'orange', label: 'Naranja' },
  { value: 'brown', label: 'Café' },
  { value: 'beige', label: 'Beige' },
  { value: 'gold', label: 'Dorado' },
  { value: 'other', label: 'Otro' },
];

export const VEHICLE_USAGE = [
  { value: 'private', label: 'Particular' },
  { value: 'commercial', label: 'Comercial' },
  { value: 'public', label: 'Transporte Público' },
];

export const CURRENT_YEAR = new Date().getFullYear();
export const VEHICLE_YEARS = Array.from({ length: 30 }, (_, i) => CURRENT_YEAR - i);

export const WIZARD_STEPS = [
  { id: 'start', title: 'Inicio', subtitle: 'Información básica' },
  { id: 'identity', title: 'Identidad', subtitle: 'Verificación del conductor' },
  { id: 'photos', title: 'Fotografías', subtitle: 'Fotos del vehículo' },
  { id: 'vehicle', title: 'Vehículo', subtitle: 'Datos del vehículo' },
  { id: 'damage', title: 'Daños', subtitle: 'Fotos de daños' },
  { id: 'third_party', title: 'Tercero', subtitle: 'Información del tercero' },
  { id: 'scene', title: 'Escena', subtitle: 'Lugar del accidente' },
  { id: 'summary', title: 'Resumen', subtitle: 'Consentimiento y firma' },
];
