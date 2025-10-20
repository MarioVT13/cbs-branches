# Capital Bank Skopje (CBS) Branches — React Native (Expo + TypeScript)

A minimal, production-minded demo that lists bank branches and shows details with an embedded map. Optional toggle to display ATMs on the same map.

## Quick Links

Branches: GET https://europe-west1-proto-rn-frbs-4242.cloudfunctions.net/dev_task/branches

ATMs: GET https://europe-west1-proto-rn-frbs-4242.cloudfunctions.net/dev_task/atms

## Requirements

Node 18+ / 20+

Yarn or npm (use one; don’t mix)

Xcode (iOS) / Android Studio (Android)

Expo CLI (via npx expo …)

Dev build required for react-native-maps (Expo Go is not enough)

If using Yarn 4, set .yarnrc.yml → nodeLinker: node-modules and reinstall

Getting Started

## Install notes

npm install

Create a dev build (required for react-native-maps)
npx expo prebuild -p ios,android
npx expo run:android

### or

npx expo run:ios

Run Commands

iOS: npx expo run:ios

Android: npx expo run:android

### Note: TS path aliases are compile-time; Babel module-resolver handles runtime. Both are configured.

## Features & Techniques

Expo Router (v3) — file-based navigation (/app/index.tsx → list, /app/branch/[id].tsx → details)

React Query (@tanstack/react-query) — fetching, caching, loading/error states

Cached queries for branches/ATMs; pull-to-refresh on the list

Zod — runtime API validation + inferred TS types

Search / Filter — debounced text search (name, city, address)

Map (react-native-maps) — branch marker + optional ATM markers

ATMs fetched on demand via enabled: showATMs

TypeScript — strict types across API & components

Clean UX — small reusable Loading/Error components, minimal styles

// Optional XState bonus

// Sample machines to model details lifecycle & map overlay toggles (parent/child actors)

## Specs

Platform: React Native (Expo SDK ≥ 54), iOS & Android

Language: TypeScript

Libs: expo-router, @tanstack/react-query, axios, zod, react-native-maps, (optional) xstate

Style: React Native core components

## How To Use

Launch the app on iOS/Android.

The bank branches list loads automatically.

Use the search bar to filter by name, city, or address.

Tap a branch to open details:

Address & working hours (if available)

Map centered on the branch

Show ATMs toggle to overlay ATM markers

## Troubleshooting

Map not rendering / red screen

Ensure you created a dev build (prebuild + run:ios|android). Expo Go is not enough for react-native-maps.
