# Forms and Validation
- Use `react-hook-form` with `zod` for forms and validation.
- Don't use `setError` or `clearErrors` inside a submit handler, use `toast.error()` instead.

# Architecture
### For components that is shown after data being loaded, use a Skeleton component to show a loading state. Create the Skeleton component as a static method on the component using the `Skeleton` component from the `@/components/ui/skeleton` package.
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