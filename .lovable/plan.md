# EcoCheck – EcoSense Market

## Overview
A single-page AI-powered sustainability advisor app in Serbian (latinica) that collects user inputs via a questionnaire and returns personalized smart eco-product recommendations using Lovable AI.

## Design & Branding
- Clean, modern, minimal design with sustainable color palette (greens, soft earthy tones)
- Mobile-first responsive layout
- Professional typography with clear visual hierarchy
- EcoSense Market branding throughout
- All UI text in Serbian (latinica)

## Page Structure

### Hero Section
- Title: "EcoCheck – Pametna preporuka za održiv dom"
- Subtitle: "Odgovorite na nekoliko pitanja i saznajte kako da smanjite potrošnju energije i vode."
- Clean, inviting layout

### Questionnaire Form
Five required questions with radio-button style selection:
1. **Tip objekta** – Stan / Kuća
2. **Broj članova domaćinstva** – 1 / 2 / 3–4 / 5+
3. **Najveći mesečni trošak** – Struja / Voda / Oboje
4. **Da li imate dvorište ili baštu?** – Da / Ne
5. **Glavni cilj** – Smanjenje računa / Ekološka odgovornost / Sprečavanje kvarova i štete / Sve navedeno

- Validation ensuring all questions are answered before submission
- Primary CTA button: "Dobij moju EcoCheck preporuku"

### Loading State
- Spinner with "Analiziramo vaše odgovore..." message while AI processes

### Results Section (appears after AI response)
- **Summary** – highlighted text block
- **Eco Score** – visual badge showing 0–100 score (computed on frontend, see below)
- **Product Recommendation Cards** (up to 3) – each showing product name, reasoning, estimated impact, priority level, and "Pogledaj proizvod" button
- **Additional Tips** – eco-friendly tips section
- **Disclaimer** – smaller text at bottom
- **Smooth scroll** to results section on reveal with subtle fade-in/slide-up animation (framer-motion)

### Error Handling
- Fallback message in Serbian: "Došlo je do greške prilikom generisanja preporuke. Molimo pokušajte ponovo."
- **"Pokušaj ponovo"** button shown on error – resets to form state so user can resubmit
- Graceful handling of malformed JSON responses with try/catch

---

## AI Integration (Lovable Cloud + Lovable AI)

### Edge Function
- Receives questionnaire answers from frontend
- Sends a carefully crafted prompt to Lovable AI (google/gemini-3-flash-preview)
- **Strict JSON-only output enforcement:**
  - System prompt explicitly instructs: "You MUST return ONLY valid JSON. No text, no markdown, no explanation outside the JSON object."
  - Response format instruction repeated in user prompt
  - If AI returns text outside JSON, frontend parsing catches it

### Prompt Rules
- Only recommend from the 5 EcoSense products (exact names)
- Max 3 recommendations
- Personalized based on inputs
- Edge case logic embedded in the prompt:
  - "Oboje" → combo energy + water products
  - Kuća + dvorište → strongly consider irrigation system
  - "Sprečavanje kvarova" → prioritize water leak sensor
  - Struja dominant → prioritize smart thermostat + electricity meter

### AI Response Schema
```json
{
  "summary": "string",
  "top_recommendations": [
    {
      "product_name": "string",
      "why": "string",
      "estimated_impact": "string",
      "priority_level": "string"
    }
  ],
  "additional_tips": ["string"],
  "eco_score_interpretation": "string",
  "disclaimer": "string"
}
```
Note: `next_step_url` is NOT returned by AI. It is mapped deterministically on the frontend.

---

## Fixed Product Name → URL Mapping (Frontend)

The frontend maintains a strict mapping table. AI-returned `product_name` values are matched against this table. Any URL the AI might return is **ignored and overridden**.

| product_name | URL |
|---|---|
| Pametni termostat | https://ecosense-market.rs/product/termostat |
| Pametni merač potrošnje struje | https://ecosense-market.rs/product/merac-struje |
| Pametni LED sistem | https://ecosense-market.rs/product/led-sistem |
| Pametni sistem za navodnjavanje | https://ecosense-market.rs/product/navodnjavanje |
| Senzor curenja vode | https://ecosense-market.rs/product/senzor-curenja |

Unknown product names → button hidden or link omitted.

---

## Eco Score (0–100) – Deterministic Frontend Computation

The Eco Score is **computed deterministically on the frontend** based on user answers, NOT by the AI. The score is then passed to the AI in the prompt so the AI can provide an interpretation string.

### Scoring Logic (example weights):
- **Tip objekta:** Kuća = +10 (more optimization potential)
- **Broj članova:** 5+ = +15, 3–4 = +10, 2 = +5, 1 = +0
- **Najveći trošak:** Oboje = +20, Struja = +15, Voda = +10
- **Dvorište:** Da = +15 (irrigation opportunity)
- **Glavni cilj:** Sve navedeno = +25, Smanjenje računa = +15, Ekološka odgovornost = +15, Sprečavanje kvarova = +10
- Base score: 15 (everyone gets credit for taking the quiz)

Score clamped to 0–100 range. Displayed as a visual badge/progress indicator.

The AI receives: `"Korisnikov Eco Score je X/100."` and returns `eco_score_interpretation` as a human-readable string.

---

## Safe JSON Parsing

Frontend parsing flow:
1. Receive AI response (non-streaming, via `supabase.functions.invoke`)
2. Extract response content string
3. **Try to extract JSON** from the response:
   - First try `JSON.parse(content)` directly
   - If that fails, try regex to extract `{...}` from surrounding text
   - If that fails, show error state with "Pokušaj ponovo" button
4. **Validate** parsed object has required fields (`summary`, `top_recommendations` array)
5. **Override** any `next_step_url` in recommendations with the fixed mapping table
6. Filter out any `product_name` not in the allowed list

---

## Dev Mode Logging

In development (`import.meta.env.DEV`):
- Log raw AI response to console
- Log parsed JSON result
- Log any parse errors with the raw string that failed
- **No user PII logged** – only log question keys (e.g., "tip_objekta: kuca"), never personal data

---

## Error & Fallback Handling

| Scenario | Behavior |
|---|---|
| AI call fails (network/500) | Show: "Došlo je do greške prilikom generisanja preporuke. Molimo pokušajte ponovo." + "Pokušaj ponovo" button |
| AI returns invalid JSON | Same fallback message + "Pokušaj ponovo" button |
| AI returns empty recommendations | Show summary + tips if available, note "Nema specifičnih preporuka" |
| Rate limit (429) | Show: "Sistem je trenutno preopterećen. Pokušajte ponovo za nekoliko minuta." |
| Payment required (402) | Show: "Usluga trenutno nije dostupna. Kontaktirajte podršku." |

---

## UX Details
- Mobile-first design with responsive breakpoints
- Smooth scroll to results section after AI response arrives
- Subtle reveal animation on results (fade-in + slide-up via framer-motion)
- Form validation with visual feedback (highlight unanswered questions)
- Loading spinner with pulsing animation + "Analiziramo vaše odgovore..."
- All text in Serbian (latinica)

## Tech Stack
- React + TypeScript + Tailwind CSS + framer-motion
- Lovable Cloud backend with edge function for AI calls
- Lovable AI (google/gemini-3-flash-preview) for generating recommendations
- Non-streaming AI call (structured JSON output, not chat)
