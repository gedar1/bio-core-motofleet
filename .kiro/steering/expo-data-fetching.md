---
name: expo-data-fetching
description: "Use when implementing or debugging ANY network request, API call, or data fetching. Covers fetch API, React Query, error handling, caching, loading/empty/error screen states, auth tokens, and EXPO_PUBLIC_ environment variables."
inclusion: auto
---

<!-- Copiado de https://github.com/expo/skills (plugins/expo/skills/expo-data-fetching/SKILL.md), licencia MIT, Copyright (c) 2025-present 650 Industries, Inc. Referencias a references/*.md y secciones de feedback omitidas. -->

# Expo Networking

**You MUST use this skill for ANY networking work including API requests, data fetching, caching, or network debugging.**

## Preferences

- Avoid axios, prefer expo/fetch

## Every Screen Has Four States

Design **loading**, **error**, **empty**, and **content** for screens that load data. These can overlap: a refresh error should coexist with cached content.

- **Loading ≠ empty.** Empty means _resolved with zero items_, not missing data. Handle initial loading, failure, and hydration before checking list length. In TanStack Query v5, `isLoading` means the first fetch is running; a disabled or offline-paused query can have no data without being loading.
- **Empty is a designed state, not a blank list.** Use `ListEmptyComponent` on FlatList/FlashList: explain why it is empty and offer the relevant next action.
- **Refetches keep stale content.** Render cached `data` even if a refresh fails, with a nonblocking error and retry. Use `isLoading` for first-fetch spinners and `isFetching` for background activity.
- **Gate on hydration.** When initial UI or a redirect depends on persisted state (auth token, onboarding flag), the root layout renders nothing — or the splash — until that state has loaded.

**Saves preserve work.** While a mutation is pending, disable repeat submission. On failure, retain the draft, show an inline error, and let the user retry; clear or dismiss only after success.

## Basic fetch

```tsx
const fetchUser = async (userId: string) => {
  const response = await fetch(`https://api.example.com/users/${userId}`);

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  return response.json();
};
```

## React Query (TanStack Query)

```tsx
// app/_layout.tsx
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      retry: 2,
    },
  },
});

export default function RootLayout() {
  return (
    <QueryClientProvider client={queryClient}>
      <Stack />
    </QueryClientProvider>
  );
}
```

```tsx
import { useQuery } from "@tanstack/react-query";

function UserProfile({ userId }: { userId: string }) {
  const { data, fetchStatus, error, refetch } = useQuery({
    queryKey: ["user", userId],
    queryFn: () => fetchUser(userId),
  });

  if (data === undefined) {
    if (error)
      return <ErrorState message={error.message} onRetry={() => refetch()} />;
    if (fetchStatus === "paused") return <OfflineState />;
    return <Loading />;
  }

  return (
    <>
      {error && (
        <InlineError
          message="Could not refresh. Showing saved data."
          onRetry={() => refetch()}
        />
      )}
      {data === null ? (
        <EmptyState message="User not found" />
      ) : (
        <Profile user={data} />
      )}
    </>
  );
}
```

```tsx
import { useMutation, useQueryClient } from "@tanstack/react-query";

function CreateUserForm() {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: createUser,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
    },
  });

  const handleSubmit = (data: UserData) => {
    if (mutation.isPending) return;
    mutation.mutate(data);
  };

  return (
    <Form
      onSubmit={handleSubmit}
      isLoading={mutation.isPending}
      error={mutation.error?.message}
    />
  );
}
```

## Error handling

```tsx
class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public code?: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

const fetchWithErrorHandling = async (url: string, options?: RequestInit) => {
  try {
    const response = await fetch(url, options);

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new ApiError(
        error.message || "Request failed",
        response.status,
        error.code,
      );
    }

    return response.json();
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    throw new ApiError("Network error", 0, "NETWORK_ERROR");
  }
};
```

## Authentication

Store tokens with `expo-secure-store`, never in AsyncStorage:

```tsx
import * as SecureStore from "expo-secure-store";

const TOKEN_KEY = "auth_token";

export const auth = {
  getToken: () => SecureStore.getItemAsync(TOKEN_KEY),
  setToken: (token: string) => SecureStore.setItemAsync(TOKEN_KEY, token),
  removeToken: () => SecureStore.deleteItemAsync(TOKEN_KEY),
};
```

## Environment variables

Expo exposes only variables with the `EXPO_PUBLIC_` prefix to the client bundle:

```tsx
// .env
EXPO_PUBLIC_API_URL=https://api.example.com

const API_URL = process.env.EXPO_PUBLIC_API_URL;
```

- Never put secrets (API keys with write access, database passwords) in `EXPO_PUBLIC_` variables. They are visible in the built app.
- Variables are inlined at **build time**, not runtime.
- Restart the dev server after changing `.env` files.
- For server-side secrets in API routes, use variables without the `EXPO_PUBLIC_` prefix.

## Common mistakes

**Wrong:** no error handling — `const data = await fetch(url).then((r) => r.json());`

**Right:** check the response status first:

```tsx
const response = await fetch(url);
if (!response.ok) throw new Error(`HTTP ${response.status}`);
const data = await response.json();
```

**Wrong:** `await AsyncStorage.setItem("token", token);` (not secure)

**Right:** `await SecureStore.setItemAsync("token", token);`

## MotoFleet context

- The backend is a separate Railway service. The app reads its base URL from `EXPO_PUBLIC_API_URL`, set per EAS build profile (preview → pre-prod, production → production).
- Auth mechanism of the backend is not verified yet. Before implementing login, confirm it in `src/` and store any resulting token in SecureStore.
