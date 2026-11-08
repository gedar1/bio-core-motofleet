---
name: expo-overview
description: "Entry point and router for every Expo or EAS task. Load this skill first, before writing code and before choosing another expo-* or eas-* skill, when the request mentions Expo, EAS, Expo Go, or an expo-* package, or the project has an expo dependency in package.json. Also covers app specs to implement (tabs, stacks, maps, lists, navigation) and phrasings like 'implement a mobile app', 'add navigation', 'fetch some data', 'upgrade my SDK', 'ship to the App Store'."
inclusion: auto
---

<!-- Copiado de https://github.com/expo/skills (plugins/expo/skills/expo-overview/SKILL.md), licencia MIT, Copyright (c) 2025-present 650 Industries, Inc. (Expo). Secciones de feedback omitidas. -->

# `expo-overview` — router & shared rules for Expo / EAS

## Start Here — read before doing anything

**Do not guess the skill from project files alone.** Many Expo goals look similar from
the filesystem but need different skills.

1. **Confirm this is Expo or EAS work** — the request mentions Expo or EAS, or
   `package.json` has an `expo` dependency. Otherwise this skill does not apply.
   A native app using EAS for delivery qualifies without an Expo runtime.
2. **Read the user's goal** — what outcome do they want, in plain terms?
3. **Classify it** using the Skill Map below, translating casual phrasing to a goal.
4. **Confirm intent** if ambiguous ("Sounds like you want to ship to the stores — that's
   `eas-app-stores`. Right?"), then load that skill's `SKILL.md` and follow it.
5. **Trust the leaf skill** — it has its own detection logic and steps. Don't improvise.

## Skill Map (by goal)

Match the goal to a category, then the skill, then load that leaf's `SKILL.md`.

**Build the app**
- `expo-project-structure` — folder layout for a **new** Expo Router project: where screens, components, and config live (never restructure an existing app to match)
- `expo-native-ui` — screens, styling, semantic colors, native controls, SF Symbols, media, layout
- `expo-router` — navigation: file-based routes, tabs / stacks / modals / sheets, links, headers
- `expo-animation` — motion and gestures: Reanimated worklets, Gesture Handler, screen transitions, sheet and press feedback, haptics, and fixing animation that stutters on device
- `expo-ui` — native UI components via `@expo/ui`: BottomSheet, Picker, Slider, Switch, Menu, Button, FieldGroup (grouped form sections), List / ListItem, and more — real SwiftUI on iOS, Jetpack Compose on Android.
- `expo-design-system` — one visual source of truth: design tokens (color, spacing, typography, radius, shadow, motion), reusable component conventions, and audits for drift (hardcoded colors, spacing, fonts)
- `expo-tailwind-setup` — Tailwind / NativeWind styling
- `expo-data-fetching` — network requests, React Query / SWR, caching, offline, route loaders
- `expo-dom` — run web code or reuse a web library inside native
- `expo-web-to-native` — migrate an existing web / React app to a native iOS / Android app

> **Component selection rule:** whenever you need a UI component (list rows, bottom sheets, pickers, sliders, menus, buttons, segmented controls, toggles), **consult `expo-ui` first** to check whether `@expo/ui` has a native equivalent before reaching for a React Native built-in or a community library. One exception: `@expo/ui` `List` renders native grouped rows (an iOS Settings screen), **not** a virtualized list — use `FlatList` / `FlashList` for large datasets.

**Ship & operate**
- `eas-app-stores` — build and submit iOS/Android apps, TestFlight, versions, and store metadata
- `eas-hosting` — deploy the web bundle to EAS Hosting; also author Expo Router API routes (`+api.ts` handlers)
- `eas-workflows` — EAS Workflow YAML and CI/CD pipelines
- `eas-simulator` — run and drive the app on a remote iOS / Android simulator on EAS cloud
- `expo-dev-client` — custom development builds
- `eas-update` — configure, publish, test, and debug compatible over-the-air updates
- `eas-update-insights` — OTA update health: crash rate, adoption, payload size
- `eas-observe` — startup / launch / TTI performance with EAS Observe

**Extend natively**
- `expo-module` — native modules and views (Swift / Kotlin) with the Expo Modules API
- `expo-brownfield` — embed Expo / React Native screens in native SwiftUI/UIKit or Android apps
- `expo-app-clip` — iOS App Clip target (AASA, smart app banner)

**Maintain & learn**
- `expo-upgrade` — upgrade the Expo SDK and fix dependency conflicts
- `expo-examples` — canonical, version-matched integration examples (Stripe, Clerk, Supabase, …)

### Translating vague asks

- "Make it look native" → grouped controls / settings forms = `expo-ui`; screens, styling = `expo-native-ui`; motion = `expo-animation`; navigation = `expo-router`.
- "Make the screens consistent" / "clean up the styling" / "set up a theme or design tokens" → `expo-design-system`.
- "It looks AI-generated" / "too generic, not native" → `expo-design-system`, with `expo-native-ui` for the platform idioms.
- "Ship it" / "get an .ipa or .apk" / "release to the stores" → `eas-app-stores`.
- "I'm new / where do I start" → scaffold first (see Shared setup rules), then route by goal.

## Shared setup rules

- **Starting a new Expo app?** Start one the standard way before routing to a feature skill:
  `npx create-expo-app@latest`, laying out folders per `expo-project-structure`. Then
  classify the user's goal and route.
- **Detect the SDK version** before giving version-specific advice: read the `expo`
  version in `package.json` (and `app.json` / `app.config.{js,ts}`). Many APIs and
  defaults differ by SDK.
- **Read the docs for that SDK, not `latest`.** Use the version-pinned URL, e.g.
  `https://docs.expo.dev/versions/v56.0.0/sdk/ui/` on SDK 56 instead of
  `https://docs.expo.dev/versions/latest/sdk/ui/`.
- **Moving to a newer SDK is its own task** — load `expo-upgrade` instead of bumping
  versions by hand.
- **Managed vs. bare/prebuild**: the presence of committed `ios/` and `android/`
  directories means native projects exist (prebuild or bare).
- **Install packages with `npx expo install <pkg>`**, not raw `npm`/`yarn`/`pnpm add`,
  so versions stay compatible with the project's SDK.
- **EAS auth & linking** (only needed for build/submit/update/observe/workflows): check
  login with `eas whoami`, log in with `eas login`. A project is linked when
  `extra.eas.projectId` exists in the app config; create it with `eas init` if missing.

## When to skip the router hop

- Only when the user explicitly named a specific `expo-*` / `eas-*` skill → load that
  skill directly.
- A fully-specified task is **not** a reason to skip: the shared rules above still apply.
