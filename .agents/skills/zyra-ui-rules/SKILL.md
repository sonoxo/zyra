---
name: zyra-ui-rules
description: Zyra frontend conventions, component patterns, and styling rules. Use when building or modifying UI pages.
---

# Zyra UI Rules

## Component Patterns
- All pages in `client/src/pages/`, registered in `client/src/App.tsx`
- Use TanStack Query v5 (object form): `useQuery({ queryKey: ['/api/...'] })`
- Default fetcher is pre-configured — queries should NOT define `queryFn`
- Mutations use `apiRequest` from `@/lib/queryClient`, always invalidate cache after
- For hierarchical keys: `queryKey: ['/api/items', id]` (array, not template string)
- Forms: shadcn `useForm` + `Form` component + `zodResolver` with insert schema from `@shared/schema.ts`

## Styling
- Tailwind CSS + shadcn/ui components
- Dark mode: `darkMode: ["class"]` in tailwind config, `.dark` class on `<html>`
- Always use explicit light/dark variants: `bg-white dark:bg-black`
- Icons: `lucide-react` for actions, `react-icons/si` for company logos
- Color vars in `index.css`: use `H S% L%` format (space-separated, no `hsl()` wrapper)

## Required Attributes
- Every interactive element needs `data-testid="{action}-{target}"`
- Every display element showing dynamic data needs `data-testid="{type}-{content}"`
- Dynamic lists: append unique ID: `data-testid="card-item-${id}"`

## Empty States
- All pages must handle empty data gracefully (no data = helpful empty state, not broken UI)
- Never inject seed/mock data to fill pages — show empty state with call-to-action
- Use loading skeletons while queries are in flight (`.isLoading`)
- Show pending state on mutations (`.isPending`)

## Sidebar
- 7 navigation groups defined in `client/src/components/layout/sidebar.tsx`
- Zyra logo in sidebar header (desktop + mobile), not Shield icon
- Use `Link` from wouter or `useLocation` hook for navigation

## Assets
- User assets: import via `@assets/filename` alias
- Logo path: `@assets/ChatGPT_Image_Mar_30,_2026,_05_28_39_PM_1775166956477.png`

## Common Mistakes to Avoid
- Don't import React explicitly (Vite JSX transform handles it)
- Don't use `process.env` on frontend — use `import.meta.env.VITE_*`
- `<SelectItem>` must always have a `value` prop
- `apiRequest` returns `Response` — call `.json()` to get body
- `useToast` is from `@/hooks/use-toast`
