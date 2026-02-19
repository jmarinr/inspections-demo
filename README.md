# 🚗 Accident Inspection App

Aplicación de auto-inspección digital para accidentes de tránsito con IA, optimizada para América Latina.

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![React](https://img.shields.io/badge/React-18.2-61DAFB?logo=react)
![TypeScript](https://img.shields.io/badge/TypeScript-5.2-3178C6?logo=typescript)
![Tailwind](https://img.shields.io/badge/Tailwind-3.4-06B6D4?logo=tailwindcss)

## ✨ Características

- 📸 **Captura guiada de fotos** - 12 ángulos del vehículo + daños + escena
- 🤖 **OCR con IA** - Extracción automática de datos de documentos de identidad
- 📍 **Geolocalización** - Ubicación GPS automática del accidente
- ✍️ **Firma digital** - Consentimiento firmado digitalmente
- 💾 **Modo offline** - Funciona sin conexión, sincroniza después
- 🌎 **Multi-país** - Soporte para México, Costa Rica, Panamá, Colombia, etc.

## 🏗️ Arquitectura

```
┌─────────────────────────────────────────────────────────────────┐
│                    FRONTEND (GitHub Pages)                       │
│              React + Vite + TypeScript + Tailwind                │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      SUPABASE (Gratis)                          │
│  • PostgreSQL (500MB) • Storage (1GB) • Auth • Edge Functions   │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    OCR (100% Browser)                           │
│                      Tesseract.js                               │
└─────────────────────────────────────────────────────────────────┘
```

## 🚀 Quick Start

### Prerrequisitos

- Node.js 18+
- npm o yarn
- Cuenta de [Supabase](https://supabase.com) (gratis)
- Cuenta de [GitHub](https://github.com)

### 1. Clonar el repositorio

```bash
git clone https://github.com/tu-usuario/accident-inspection.git
cd accident-inspection
```

### 2. Instalar dependencias

```bash
npm install
```

### 3. Configurar Supabase

1. Crea un proyecto en [Supabase](https://supabase.com)
2. Ve a **SQL Editor** y ejecuta el contenido de `supabase/migrations/001_initial_schema.sql`
3. Ve a **Storage** y crea un bucket llamado `inspection-photos` (público)
4. Copia las credenciales de **Settings > API**

### 4. Configurar variables de entorno

Crea un archivo `.env.local`:

```env
VITE_SUPABASE_URL=https://tu-proyecto.supabase.co
VITE_SUPABASE_ANON_KEY=tu-anon-key-aqui
```

### 5. Desarrollo local

```bash
npm run dev
```

Abre [http://localhost:5173](http://localhost:5173)

## 📦 Deployment a GitHub Pages

### Opción 1: Manual

```bash
# Build
npm run build

# Deploy
npm run deploy
```

### Opción 2: GitHub Actions (Automático)

Crea `.github/workflows/deploy.yml`:

```yaml
name: Deploy to GitHub Pages

on:
  push:
    branches: [main]

jobs:
  build-and-deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Node
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Build
        run: npm run build
        env:
          VITE_SUPABASE_URL: ${{ secrets.VITE_SUPABASE_URL }}
          VITE_SUPABASE_ANON_KEY: ${{ secrets.VITE_SUPABASE_ANON_KEY }}
      
      - name: Deploy
        uses: peaceiris/actions-gh-pages@v3
        with:
          github_token: ${{ secrets.GITHUB_TOKEN }}
          publish_dir: ./dist
```

Agrega los secrets en **Settings > Secrets > Actions**:
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

## 📁 Estructura del Proyecto

```
accident-inspection/
├── src/
│   ├── components/
│   │   ├── ui/              # Componentes reutilizables
│   │   ├── steps/           # Pasos del wizard
│   │   └── layout/          # Layout principal
│   ├── hooks/               # Custom hooks (OCR, etc)
│   ├── lib/                 # Utilidades y configuración
│   ├── stores/              # Zustand store
│   ├── types/               # TypeScript types
│   ├── App.tsx
│   └── main.tsx
├── supabase/
│   └── migrations/          # SQL migrations
├── public/
└── package.json
```

## 🔧 Flujo de la Aplicación

| Paso | Pantalla | Descripción |
|------|----------|-------------|
| 0 | Inicio | País, tipo de siniestro, placa/VIN |
| 1 | Identidad | Fotos de ID + OCR automático |
| 2 | Consentimiento | Términos + firma digital |
| 3 | Vehículo | Datos del vehículo asegurado |
| 4 | Fotos | 12 fotos estándar del vehículo |
| 5 | Daños | Fotos detalladas de daños |
| 6 | Tercero | Info del tercero (opcional) |
| 7 | Escena | GPS + fotos del lugar |
| 8 | Resumen | Revisión y envío |

## 🌐 Países Soportados

| País | Documento | Formato ID |
|------|-----------|------------|
| 🇲🇽 México | INE/IFE | CURP 18 caracteres |
| 🇨🇷 Costa Rica | Cédula | X-XXXX-XXXX |
| 🇵🇦 Panamá | Cédula | XX-XXXX-XXXXXX |
| 🇨🇴 Colombia | CC | 6-10 dígitos |
| 🇬🇹 Guatemala | DPI | XXXX-XXXXX-XXXX |
| 🇸🇻 El Salvador | DUI | XXXXXXXX-X |
| 🇭🇳 Honduras | TI | XXXX-XXXX-XXXXX |
| 🇳🇮 Nicaragua | Cédula | XXX-XXXXXX-XXXXX |

## 💰 Costos (Todo Gratis)

| Servicio | Límite Gratis | Uso Estimado |
|----------|---------------|--------------|
| GitHub Pages | Ilimitado | Hosting frontend |
| Supabase DB | 500 MB | ~10,000 inspecciones |
| Supabase Storage | 1 GB | ~500 inspecciones con fotos |
| Supabase Bandwidth | 2 GB/mes | ~1,000 inspecciones/mes |
| Tesseract.js | 100% gratis | OCR en el browser |

## 🔒 Seguridad

- ✅ Datos encriptados en tránsito (HTTPS)
- ✅ Row Level Security en Supabase
- ✅ Sin almacenamiento de contraseñas
- ✅ Imágenes comprimidas antes de subir
- ✅ Datos eliminados automáticamente después de 90 días

## 🛠️ Tecnologías

- **Frontend**: React 18, TypeScript, Vite, Tailwind CSS
- **Estado**: Zustand (persistido en localStorage)
- **Backend**: Supabase (PostgreSQL + Storage + Auth)
- **OCR**: Tesseract.js (100% browser)
- **Firmas**: react-signature-canvas
- **Imágenes**: browser-image-compression

## 📝 Licencia

MIT License - libre para uso comercial y personal.

## 🤝 Contribuir

1. Fork el proyecto
2. Crea tu branch (`git checkout -b feature/nueva-funcionalidad`)
3. Commit tus cambios (`git commit -m 'Agregar nueva funcionalidad'`)
4. Push al branch (`git push origin feature/nueva-funcionalidad`)
5. Abre un Pull Request

---

Desarrollado con ❤️ por [HenkanCX](https://henkancx.com)
