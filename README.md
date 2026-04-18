DiseaseX/
├── app/
│   ├── _layout.tsx          ← Root layout, wraps everything in AppProvider
│   ├── index.tsx            ← Redirects to tabs
│   ├── result.tsx           ← Result screen (to be built)
│   └── (tabs)/
│       ├── _layout.tsx      ← Tab bar config (add new tabs here)
│       ├── index.tsx        ← Triage screen ✅ BUILT
│       ├── protocol.tsx     ← Protocol walker (placeholder)
│       ├── dosing.tsx       ← Dosing calculator (placeholder)
│       └── cases.tsx        ← Case log (placeholder)
├── constants/
│   └── theme.ts             ← All colors live here. Never hardcode colors.
├── store/
│   └── AppContext.tsx       ← Global state. Patient data + triage result.
└── services/
    └── api.ts               ← All backend calls go here. Has offline fallback.




Three Rules for the Team
1. Never hardcode colors
Always import from constants/theme.ts:
typescriptimport { COLORS } from '../../constants/theme';
// use COLORS.red, COLORS.text, etc.

2. Share data through the store
Never pass data between screens via props or navigation params. Use the global store:
typescriptimport { useAppState } from '../../store/AppContext';
const { patient, result, setResult } = useAppState();
3. All API calls go through services/api.ts
Never call fetch() directly in a screen. Add a function to api.ts and import it. This keeps the offline fallback logic in one place.

How Navigation Works
This uses expo-router — file-based routing like Next.js.

Every file in app/ is a route
app/(tabs)/index.tsx = the / tab
To navigate: router.push('/result')
To go back: router.back()


Team Split
PersonFile to ownFE-1app/(tabs)/index.tsx — triage screen (done, can improve)FE-2app/result.tsx — result + WHO protocol stepsBE-1services/api.ts + backend main.pyBE-2app/(tabs)/dosing.tsx + app/(tabs)/cases.tsx

To Run
bashnpm install
npx expo start
# Scan QR with Expo Go on phone
Push to GitHub first, everyone branches off main.Sonnet 4.6