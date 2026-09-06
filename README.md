# File2Flow — Modern File to PDF Converter

> Professional-grade document-to-PDF conversion platform with AI-powered features, built for speed, privacy, and enterprise scale.

[![React](https://img.shields.io/badge/React-19-61DAFB?style=flat&logo=react)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.8-3178C6?style=flat&logo=typescript)](https://www.typescriptlang.org)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4-06B6D4?style=flat&logo=tailwindcss)](https://tailwindcss.com)
[![Firebase](https://img.shields.io/badge/Firebase-12-FFCA28?style=flat&logo=firebase)](https://firebase.google.com)
[![Vite](https://img.shields.io/badge/Vite-6-646CFF?style=flat&logo=vite)](https://vitejs.dev)

---

## Overview

**File2Flow** is a high-performance, client-first document conversion web application that transforms any file into pixel-perfect PDFs in seconds. Think **iLovePDF** — but faster, smarter, and fully self-hosted.

### Why File2Flow?

| Feature | File2Flow | iLovePDF | Smallpdf |
|---------|-----------|----------|----------|
| Client-side conversion (zero upload) | ✅ | ❌ | ❌ |
| AI-powered summarization | ✅ | ✅ (Premium) | ❌ |
| Batch processing (100+ files) | ✅ | ✅ (Premium) | ❌ |
| Dark mode | ✅ | ❌ | ✅ |
| Self-hostable | ✅ | ❌ | ❌ |
| Free tier with no limits | ✅ | Limited | Limited |

---

## Core Features

### Universal Document Conversion Engine

Convert **any** file format to high-fidelity PDF — entirely in the browser.

| Input Format | Extensions | Conversion Method |
|-------------|------------|-------------------|
| Microsoft Word | `.docx`, `.doc` | Mammoth.js HTML → jsPDF |
| PowerPoint | `.pptx`, `.ppt` | Slide extraction → PDF layout |
| Excel / CSV | `.xlsx`, `.xls`, `.csv` | Sheet rendering → PDF tables |
| Markdown | `.md`, `.markdown` | Markdown → HTML → PDF |
| Rich Text | `.rtf`, `.txt` | Direct text rendering |
| HTML | `.html`, `.htm` | DOM → PDF |
| JSON | `.json` | Structured formatting → PDF |
| Images | `.png`, `.jpg`, `.jpeg`, `.webp`, `.gif`, `.svg` | Direct image embedding |

### Customizable PDF Output

- **Page Formats**: A4, US Letter, US Legal
- **Orientation**: Portrait / Landscape
- **Margins**: Normal (15mm), Narrow (8mm), Wide (25mm), None
- **Watermarks**: Custom diagonal text (`CONFIDENTIAL`, `DRAFT`, etc.)
- **Image Fitting**: Contain, Cover, Original
- **Page Numbering**: Auto-generated "Page X of Y"

### Batch Processing Pipeline

- Convert **1 to 100+ files** simultaneously
- Individual real-time progress bars per file
- Status badges (pending, processing, complete, error)
- One-click bulk download as ZIP
- Drag-and-drop reordering queue

### AI-Powered Features (Groq + Gemini)

- **PDF Summarization**: Generate concise summaries from any document
- **Smart Parsing**: Extract key data from structured documents
- **Content Extraction**: Pull text, tables, and metadata intelligently

### Firebase Authentication & Cloud Sync

- **Email/Password** and **Google OAuth** sign-in
- **Firestore** conversion history with cloud persistence
- Automatic **local fallback** when offline
- Storage quota tracking and monthly usage metrics
- Real-time sync across devices

### Subscription & Monetization

- **4 Tiers**: Free, Starter, Professional, Enterprise
- Simulated Stripe checkout flow
- Promo code support (`SAVE20`)
- Developer REST API key generator with cURL snippets

### UI/UX

- **Dark / Light mode** with system preference detection
- **Responsive** design — works on desktop, tablet, mobile
- **Canvas Confetti** celebrations on successful conversions
- **Lucide React** icon system
- Smooth **Framer Motion** animations

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **Framework** | React 19 + TypeScript 5.8 |
| **Build Tool** | Vite 6 |
| **Styling** | Tailwind CSS 4 + custom animations |
| **PDF Engine** | jsPDF (client-side vector PDF generation) |
| **Document Parsing** | Mammoth.js (DOCX), SheetJS (Excel) |
| **AI Services** | Groq SDK, Google Gemini |
| **Auth & DB** | Firebase Auth + Firestore |
| **Icons** | Lucide React |
| **Animations** | Framer Motion (motion) |
| **Utilities** | clsx, tailwind-merge, canvas-confetti |

---

## Project Structure

```
file2flow---file-to-pdf-converter/
├── public/                      # Static assets
├── src/
│   ├── components/
│   │   ├── ai/                  # AI chatbot & summary components
│   │   ├── common/              # Toast, ErrorBoundary, shared UI
│   │   ├── layout/              # Navbar, Footer
│   │   ├── modals/              # UpgradeModal, ConfirmDelete, PdfPreview
│   │   ├── pages/               # Page-level components
│   │   │   ├── LandingPage.tsx  # Hero, features, CTA
│   │   │   ├── ConvertPage.tsx  # Main conversion workspace
│   │   │   ├── DashboardPage.tsx # User dashboard & history
│   │   │   ├── PricingPage.tsx  # Subscription plans
│   │   │   ├── AccountPage.tsx  # Profile & settings
│   │   │   └── AuthPage.tsx     # Login / Register
│   │   └── ui/                  # Reusable UI primitives
│   ├── context/
│   │   └── AppContext.tsx       # Global state (Auth, Theme, Queue, Quotas)
│   ├── data/
│   │   └── plans.ts             # Subscription tiers & feature matrix
│   ├── lib/                     # Utility libraries
│   ├── services/
│   │   ├── converter.ts         # Core jsPDF conversion engine
│   │   ├── firebase.ts          # Firebase client with local fallback
│   │   └── groqService.ts       # Groq AI integration
│   ├── types/
│   │   └── index.ts             # TypeScript interfaces & types
│   ├── utils/
│   │   └── formatters.ts        # Size, duration, date formatting
│   ├── App.tsx                  # Root component + routing
│   ├── main.tsx                 # React DOM bootstrap
│   └── index.css                # Tailwind CSS & custom styles
├── server/                      # Express dev server (optional)
├── test-files/                  # Sample files for testing
├── .env.example                 # Environment variables template
├── firebase.json                # Firebase hosting config
├── firestore.rules              # Firestore security rules
├── firestore.indexes.json       # Firestore composite indexes
├── storage.rules                # Firebase Storage rules
├── vite.config.ts               # Vite configuration
├── tsconfig.json                # TypeScript config
└── package.json
```

---

## Quick Start

### Prerequisites

- **Node.js** ≥ 18.x
- **npm** or **bun** (recommended)
- **Firebase CLI** (for deployment): `npm install -g firebase-tools`
- **Vercel CLI** (for deployment): `npm install -g vercel`

### Installation

```bash
# Clone the repository
git clone https://github.com/your-username/file2flow---file-to-pdf-converter.git
cd file2flow---file-to-pdf-converter

# Install dependencies
npm install
# or
bun install

# Copy environment variables
cp .env.example .env

# Start development server
npm run dev
```

The app will be available at **http://localhost:3000**.

### Environment Variables

```env
# Firebase (optional — app works offline without these)
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_STORAGE_BUCKET=
VITE_FIREBASE_MESSAGING_SENDER_ID=
VITE_FIREBASE_APP_ID=

# AI Services (optional)
GEMINI_API_KEY=

# App URL (for OAuth callbacks)
APP_URL=http://localhost:3000
```

---

## Development Commands

| Command | Description |
|---------|-------------|
| `npm run dev` | Start Vite dev server on port 3000 |
| `npm run build` | Production build to `dist/` |
| `npm run preview` | Preview production build locally |
| `npm run lint` | TypeScript type-check (`tsc --noEmit`) |
| `npm run clean` | Remove `dist/` and `server.js` |

---

## Deployment

### Vercel (Recommended)

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel

# Deploy to production
vercel --prod
```

### Firebase Hosting

```bash
# Install Firebase CLI
npm i -g firebase-tools

# Login
firebase login

# Initialize (if not already done)
firebase init hosting

# Build and deploy
npm run build
firebase deploy --only hosting
```

### Supabase (Alternative Backend)

```bash
# Install Supabase CLI
npm i -g supabase

# Initialize
supabase init

# Link to your project
supabase link --project-ref <your-project-id>

# Run migrations
supabase db push
```

---

## API Usage (Developer)

Generate an API key from the dashboard, then use:

```bash
# Convert a file via REST API
curl -X POST https://api.file2flow.dev/v1/convert \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -F "file=@document.docx" \
  -F "format=pdf" \
  -F "page_size=A4" \
  -o output.pdf
```

### Supported API Parameters

| Parameter | Type | Default | Options |
|-----------|------|---------|---------|
| `format` | string | `pdf` | `pdf` |
| `page_size` | string | `A4` | `A4`, `LETTER`, `LEGAL` |
| `orientation` | string | `portrait` | `portrait`, `landscape` |
| `margin` | string | `normal` | `normal`, `narrow`, `wide`, `none` |
| `watermark` | string | — | Any custom text |
| `image_fit` | string | `contain` | `contain`, `cover`, `original` |

---

## Security

- **Client-side first**: Files never leave the user's browser unless cloud features are enabled
- **Firebase Security Rules**: Firestore and Storage rules enforced
- **HTTPS everywhere**: All deployments over TLS
- **No tracking**: No analytics or third-party trackers by default

---

## Roadmap

- [ ] PDF merge / split / compress tools
- [ ] PDF to Word / Excel / Image reverse conversion
- [ ] OCR for scanned documents
- [ ] E-signature integration
- [ ] Team collaboration workspaces
- [ ] Webhook support for CI/CD pipelines
- [ ] Self-hosted Docker deployment

---

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## License

MIT License — see [LICENSE](LICENSE) for details.

---

## Support

- **Issues**: [GitHub Issues](https://github.com/your-username/file2flow---file-to-pdf-converter/issues)
- **Discussions**: [GitHub Discussions](https://github.com/your-username/file2flow---file-to-pdf-converter/discussions)

---

> **File2Flow** — Convert anything to PDF. Fast. Free. Private.
