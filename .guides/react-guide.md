# Forms and Validation
- Use `react-hook-form` with `zod` for forms and validation.
- Don't use `setError` or `clearErrors` inside a submit handler, use `toast.error()` instead.

# Architecture
- For components that is shown after data being loaded, use a Skeleton component to show a loading state. Create the Skeleton component as a static method on the component using the `Skeleton` component from the `@/components/ui/skeleton` package.
Example:
```tsx
export function SomeComponent() {
  // Component code...
}

SomeComponent.Skeleton = function SomeComponentSkeleton() {
  return (
    <Skeleton className="..." />
    // More skeleton code...
  );
}
```

- When using shadcn's `Tooltip`, there's no need to wrap it inside `TooltipProvider` until you want to override the delay duration.
- Use shadcn's `empty.tsx` component to show a empty state anywhere.
- Never use the html `title` attribute.
- When using `cn`, follow this linting format:
```tsx
<div className={cn(
  "defaults",
  condition1 && "some-classes",
  condition2 && "some-other-classes",
)}>
  
</div>
```

# URL Management
- Use `nuqs` for query state management.

# Convex Usage
- When using `useQuery` with no args (e.g. `useQuery(api.users.getViewerProfile, {})`), don't give empty object as second argument. Use `useQuery(api.users.getViewerProfile)` instead.