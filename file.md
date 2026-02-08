# Product Specification — Abstract Motion Video Generator (AI-Assisted)

---

## 1. Product Goal
Build a web-based SaaS that allows users to generate stock-friendly abstract motion background videos using procedural visuals, with optional AI assistance for prompt-to-parameter translation and stock metadata generation.

The product prioritizes consistency, performance, and usability for stock creators and content creators.

---

## 2. Target User
Primary users:
- Stock video uploaders
- Content creators (YouTube, short-form videos, ads)

---

## 3. MVP Scope

### Included
- Procedural abstract motion video generation
- Predefined abstract visual styles (shader-based)
- Manual visual parameter controls
- AI-assisted text prompt to visual parameter translation
- AI-assisted title and keyword generation for stock uploads
- Real-time preview before export
- Video export with fixed constraints

### Excluded
- Payments, pricing, or billing system
- Credit or subscription logic
- User authentication or accounts
- Preset saving
- Render history
- Collaboration or team features
- Native mobile apps
- Any functionality not explicitly listed as included

---

## 4. Core Feature

### Abstract Motion Generator
Users can:
- Select one abstract motion style
- Adjust parameters such as color, speed, density, and mood
- Optionally enter a text prompt to auto-generate parameters via AI
- Preview the animation
- Export the animation as a looping video

### Abstract Motion Styles (MVP)
Each style maps to a predefined procedural shader or rendering system.
No custom or user-defined styles are allowed.

Available styles:
- fluid-gradient
- particle-wave
- geometric-flow
- noise-liquid
- soft-organic

### AI Assistance
AI is used ONLY for:
- Translating natural language prompts into existing visual parameters
- Generating suggested titles and keywords for stock platforms

AI is NOT used for frame-by-frame video rendering.

---

## 5. User Flow
1. User opens the web application
2. User selects an abstract motion style
3. User adjusts parameters manually OR enters a text prompt
4. User clicks “Generate”
5. System renders a preview animation
6. User reviews the preview
7. User exports the video
8. User downloads the final file

---

## 6. Pages / Routes
- `/`  
  Single main page containing:
  - Style selector
  - Parameter controls
  - AI prompt input
  - Preview canvas
  - Export controls

No additional pages are part of the MVP.

---

## 7. Data Models

### GenerationConfig
- style: string (must match predefined styles)
- colors: array of color values (maximum 3 colors)
- speed: number (range: 0.1 – 2.0)
- density: number (range: 0.1 – 1.0)
- mood: enum (calm | energetic | futuristic | minimal)
- loop: boolean
- aspect_ratio: string
- resolution: string

### AIPromptResult
- prompt_text: string
- generated_parameters: GenerationConfig
- suggested_title: string
- suggested_keywords: array of strings

### ExportJob
- config: GenerationConfig
- format: "mp4"
- resolution: "1080p"
- aspect_ratio: "16:9" | "9:16"
- loop: true
- status: pending | processing | completed | failed

---

## 8. Business Rules
- All exported videos must be seamless loops
- Only procedural visuals are allowed for rendering
- AI output must map strictly to existing parameters and ranges
- Users cannot export unsupported formats or resolutions
- Manual controls must work even if AI is unavailable

### Preview vs Export Rules
- Preview rendering may use reduced resolution or frame rate
- Final export must always render at full 1080p resolution

### AI Failure Handling
If AI fails, times out, or returns invalid parameters:
- System must fall back to the last valid manual parameters
- Generation and export must not be blocked

---

## 9. Constraints
- Resolution: 1080p only
- Format: MP4 only
- Aspect ratios:
  - 16:9
  - 9:16
- Looping: always enabled
- No authentication required
- No monetization logic
- Web platform only
- English language only

---

## 10. AI Coding Instructions

### Recommended Tech Stack (Not Mandatory)
These technologies are RECOMMENDATIONS and may be replaced with equivalent alternatives.

#### Frontend
- React-based framework (e.g. Next.js)
- WebGL or Canvas rendering
- Three.js or similar rendering library
- GLSL shaders for procedural visuals

#### Rendering & Video Export
- Client-side rendering for preview
- Server-side rendering for export using:
  - Headless browser rendering
  - FFmpeg for video encoding

#### Backend
- JavaScript runtime (e.g. Node.js or equivalent)
- Job-based API for video export
- Queue system for render jobs
- Object storage (S3-compatible)

#### AI Integration
- Any LLM provider capable of:
  - Text-to-structured data generation
  - Title and keyword generation
- AI must only output parameter values and metadata

### Implementation Rules
- Build exactly what is specified in this document
- Do not add authentication, payments, or monetization
- Do not add extra styles, parameters, or export options
- Do not infer features beyond this specification
- Treat all excluded items as out of scope
- Follow this document strictly without assumptions

