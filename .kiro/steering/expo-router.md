---
name: expo-router
description: "Navigation and routing for Expo Router. Covers file-based routes, groups and dynamic routes, folder organization, Link with previews and context menus, native Stack, page titles, modals and form sheets, NativeTabs, headers and toolbars, and header search bars."
inclusion: auto
---

<!-- Copiado de https://github.com/expo/skills (plugins/expo/skills/expo-router/SKILL.md), licencia MIT, Copyright (c) 2025-present 650 Industries, Inc. Las referencias a references/*.md no están copiadas en este archivo; consultar el repositorio original si se necesitan. Secciones de feedback omitidas. -->

# Expo Router Navigation

Navigation and routing for Expo Router apps. For screen styling, colors, controls, and visual effects, use the `expo-ui` or `expo-design-system` skills; for motion and gestures, use `expo-animation`.

## Code Style

- Always use kebab-case for file names, e.g. `comment-card.tsx`
- Always remove old route files when moving or restructuring navigation
- Never use special characters in file names
- Configure tsconfig.json with path aliases, and prefer aliases over relative imports for refactors.

## Routes

- Routes belong in the `app` directory.
- Never co-locate components, types, or utilities in the app directory. This is an anti-pattern.
- Ensure the app always has a route that matches "/", it may be inside a group route.

## Library Preferences

- `Color` from `expo-router` for native semantic colors, not raw `PlatformColor`.
- In SDK 56+, never import from `@react-navigation/*` directly — use `expo-router/react-navigation` instead.

## Behavior

- Prefer `Stack.SearchBar` to add a search bar to a screen

## Stack

- ALWAYS use `_layout.tsx` files to define stacks
- Use Stack from 'expo-router/stack' for native navigation stacks

### Page Title

```tsx
<Stack.Title>Home</Stack.Title>
```

## Link

Use `<Link href="/path" />` from 'expo-router' for navigation between routes.

```tsx
import { Link } from 'expo-router';

<Link href="/path" />

<Link href="/path" asChild>
  <Pressable>...</Pressable>
</Link>
```

Whenever possible, include a `<Link.Preview>` to follow iOS conventions.

## Modal

```tsx
<Stack.Screen name="modal" options={{ presentation: "modal" }} />
```

Prefer this to building a custom modal component.

## Sheet

```tsx
<Stack.Screen
  name="sheet"
  options={{
    presentation: "formSheet",
    sheetGrabberVisible: true,
    sheetAllowedDetents: [0.5, 1.0],
    contentStyle: { backgroundColor: "transparent" },
  }}
/>
```

## Common route structure

```
app/
  _layout.tsx — <NativeTabs />
  (index,search)/
    _layout.tsx — <Stack />
    index.tsx — Main list
    search.tsx — Search view
```

`headerLargeTitleEnabled` is the SDK 56+ option name; older SDKs use `headerLargeTitle`, which is deprecated upstream.

## Mobile app context (MotoFleet)

- Route groups planned for MotoFleet: `(rider)` for motociclistas and `(user)` for solicitantes, with a shared login.
- Check the Expo SDK in `mobile/package.json` before using version-specific options.
