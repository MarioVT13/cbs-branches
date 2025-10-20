HSBC Branches — React Native (Expo + TypeScript)

A minimal, production-minded demo that lists bank branches and shows details with an embedded map. Optional toggle to display ATMs on the same map.

Quick Links

Branches: GET https://europe-west1-proto-rn-frbs-4242.cloudfunctions.net/dev_task/branches

ATMs: GET https://europe-west1-proto-rn-frbs-4242.cloudfunctions.net/dev_task/atms

Requirements

Node 18+ / 20+

Yarn or npm (use one; don’t mix)

Xcode (iOS) / Android Studio (Android)

Expo CLI (via npx expo …)

Dev build required for react-native-maps (Expo Go is not enough)

If using Yarn 4, set .yarnrc.yml → nodeLinker: node-modules and reinstall

Getting Started

1. Install dependencies

# yarn

yarn install

# or npm

npm install

2. Install app libraries

# yarn

yarn add expo-router@^3 @tanstack/react-query axios zod
yarn add react-native-maps
yarn add xstate @xstate/react

# npm (alternative)

npm i expo-router@^3 @tanstack/react-query axios zod
npm i react-native-maps
npm i xstate @xstate/react

3. Ensure compatible React/RN versions for your Expo SDK
   npx expo install react react-native

4. Create a dev build (required for react-native-maps)
   npx expo prebuild -p ios,android
   npx expo run:ios

# or

npx expo run:android

5. Start the bundler

# clear cache if you changed Babel config

npx expo start -c

Run Commands

iOS: npx expo run:ios

Android: npx expo run:android

Web (optional preview): npx expo start --web

Note: mapping behavior differs on web; mobile is the target.

Project Structure
cbs-branches/
app/
\_layout.tsx # Router + React Query provider
index.tsx # Branch list + search
branch/
[id].tsx # Branch details + map + ATMs toggle
src/
api/
client.ts # Axios instance
schemas.ts # Zod schemas & types
branches.ts # Branch fetchers
atms.ts # ATM fetchers
components/
BranchListItem.tsx
Loading.tsx
ErrorView.tsx
hooks/
useDebounce.ts
machines/ # (optional XState bonus)
branchDetails.machine.ts
mapOverlay.machine.ts
theme/
colors.ts # (placeholder)
README.md

Configuration Highlights

Babel (babel.config.js)

Preset: babel-preset-expo

Aliases via module-resolver:

@/_ → src/_

app/_ → app/_

TypeScript (tsconfig.json)

baseUrl: "." + paths for the same aliases

"types": ["react", "react-native", "expo-router"]

Formatting

.prettierrc.json + .editorconfig enforce tabs (4) and consistent style

.vscode/settings.json (optional) sets Prettier as default formatter

Note: TS path aliases are compile-time; Babel module-resolver handles runtime. Both are configured.

Features & Techniques

Expo Router (v3) — file-based navigation (/app/index.tsx → list, /app/branch/[id].tsx → details)

React Query (@tanstack/react-query) — fetching, caching, loading/error states

Cached queries for branches/ATMs; pull-to-refresh on the list

Zod — runtime API validation + inferred TS types

Search / Filter — debounced text search (name, city, address)

Map (react-native-maps) — branch marker + optional ATM markers

ATMs fetched on demand via enabled: showATMs

TypeScript — strict types across API & components

Clean UX — small reusable Loading/Error components, minimal inline styles

Optional XState bonus

Sample machines to model details lifecycle & map overlay toggles (parent/child actors)

Specs

Platform: React Native (Expo SDK ≥ 54), iOS & Android

Language: TypeScript

Libs: expo-router, @tanstack/react-query, axios, zod, react-native-maps, (optional) xstate

Style: React Native core components

Formatting: Tabs (4), Prettier

How To Use

Launch the app on iOS/Android.

The branches list loads automatically.

Use the search bar to filter by name, city, or address.

Tap a branch to open details:

Address & working hours (if available)

Map centered on the branch

Show ATMs toggle to overlay ATM markers

Troubleshooting

Map not rendering / red screen

Ensure you created a dev build (prebuild + run:ios|android). Expo Go is not enough for react-native-maps.

Aliases not found (@/...)

Restart Metro: npx expo start -c

VS Code: TypeScript: Restart TS Server

Verify tsconfig.json and babel.config.js alias settings

Router Babel warning

On SDK 50+, remove 'expo-router/babel' from plugins. babel-preset-expo already includes it.

Yarn 4 PnP problems

Use .yarnrc.yml → nodeLinker: node-modules, then reinstall.

Design & Trade-offs

UI intentionally minimal to highlight data flow, typing, and structure.

fetchBranchById currently derives from the list for simplicity (single endpoint). For large datasets, add a real GET /branches/:id and normalize/cache by id.

React Query covers async; XState is optional (adds clarity for complex flows).

Future Work (if this were production)

Add GET /branches/:id or normalize entities

Persist query cache & search term (MMKV/AsyncStorage)

Shimmer skeletons & richer empty/error states

Deep linking to a specific branch

Unit tests for schemas.ts and list filtering

Scripts
yarn start # Start Metro
yarn ios # Run iOS (after prebuild)
yarn android # Run Android (after prebuild)
yarn web # Optional web preview
yarn format # Prettier --write .
