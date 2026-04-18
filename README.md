Markdown
# DiseaseX

DiseaseX is a triage and protocol application designed to assist in medical decision-making. This document outlines the project structure, development guidelines, and team responsibilities.

## 📂 Project Structure

```text
DiseaseX/
├── app/                  # File-based routing (expo-router)
│   ├── _layout.tsx       # Root layout, wraps everything in AppProvider
│   ├── index.tsx         # Redirects to tabs
│   ├── result.tsx        # Result screen
│   └── (tabs)/           # Tab bar configuration
│       ├── _layout.tsx   # Tab bar config
│       ├── index.tsx     # Triage screen (✅ BUILT)
│       ├── protocol.tsx  # Protocol walker
│       ├── dosing.tsx    # Dosing calculator
│       └── cases.tsx     # Case log
├── constants/
│   └── theme.ts          # Centralized style definitions
├── store/
│   └── AppContext.tsx    # Global state (Patient data + triage result)
└── services/
    └── api.ts            # API calls and offline fallback logic
🛠 Development Rules
To ensure code consistency, every team member must adhere to the following three rules:

1. Never Hardcode Colors
All colors must be imported from constants/theme.ts. Do not use hex codes or standard color strings in components.

TypeScript
import { COLORS } from '../../constants/theme';

// Correct Usage
<View style={{ backgroundColor: COLORS.red }} />
<Text style={{ color: COLORS.text }}>Hello World</Text>

2. Share Data through the Store
Do not pass data between screens via navigation params or props. Use the global AppContext as the single source of truth.

TypeScript
import { useAppState } from '../../store/AppContext';

// Correct Usage
const { patient, result, setResult } = useAppState();
3. All API Calls go through services/api.ts
Do not call fetch() directly in a screen. Add a function to api.ts and import it. This ensures all API logic and offline fallback handling remains centralized.

🧭 Navigation
This project utilizes expo-router, which provides file-based routing similar to Next.js.

Every file inside app/ is automatically a route.

app/(tabs)/index.tsx corresponds to the base tab route.

Common Navigation Commands:

To navigate: router.push('/result')

To go back: router.back()

👥 Team Assignments
Role	Responsibility	Focus
FE-1	app/(tabs)/index.tsx	Triage screen optimization
FE-2	app/result.tsx	Result display & WHO protocol steps
BE-1	services/api.ts	Backend API integration & main.py
BE-2	app/(tabs)/dosing.tsx & cases.tsx	Dosing calculator & Case logging
🚀 Getting Started
Clone the Repository: Ensure you pull the latest code.

Branching: Always create a new feature branch from main. Do not push directly to main.

Install Dependencies:

Bash
npm install
Run the App:

Bash
npx expo start
Preview: Scan the QR code generated in your terminal using the Expo Go app on your physical device.