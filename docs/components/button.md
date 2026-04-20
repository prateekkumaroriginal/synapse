# Button Component

A versatile, accessible button component built with React and styled using Tailwind CSS. The Button component follows the shadcn/ui design system and supports multiple variants, sizes, states, and polymorphic rendering.

## Installation

The Button component requires the following dependencies:

```bash
pnpm add class-variance-authority clsx tailwind-merge @radix-ui/react-slot lucide-react
```

Ensure your Tailwind configuration includes the necessary color tokens and animation keyframes.

## Basic Usage

```tsx
import { Button } from "@/components/ui/button";

export default function Example() {
  return <Button>Click me</Button>;
}
```

## Variants

The Button component supports six visual variants:

### Primary (Default)

```tsx
<Button variant="primary">Primary Button</Button>
```

The primary variant is used for main call-to-action buttons with high emphasis.

### Secondary

```tsx
<Button variant="secondary">Secondary Button</Button>
```

Secondary buttons provide medium emphasis for secondary actions.

### Destructive

```tsx
<Button variant="destructive">Delete Account</Button>
```

Use the destructive variant for actions that cannot be undone, such as deletions.

### Outline

```tsx
<Button variant="outline">Outline Button</Button>
```

Outline buttons are good for secondary actions that need clear boundaries.

### Ghost

```tsx
<Button variant="ghost">Ghost Button</Button>
```

Ghost buttons provide minimal visual weight and are useful for tertiary actions.

### Link

```tsx
<Button variant="link">Link Button</Button>
```

Link buttons appear as text links but maintain button semantics.

## Sizes

The Button component supports four size options:

### Small

```tsx
<Button size="sm">Small Button</Button>
```

### Default

```tsx
<Button size="default">Default Button</Button>
```

### Large

```tsx
<Button size="lg">Large Button</Button>
```

### Icon

```tsx
<Button size="icon" aria-label="Send email">
  <Mail className="h-4 w-4" />
</Button>
```

The icon size creates a square button perfect for icon-only actions.

## States

### Disabled

```tsx
<Button disabled>Disabled Button</Button>
```

Disabled buttons cannot be interacted with and have reduced opacity.

### Loading

```tsx
<Button loading>Loading...</Button>
```

The loading state displays a spinner and disables interaction while an async operation completes.

## Icons

### Icon with Text

```tsx
import { Mail } from "lucide-react";

<Button>
  <Mail className="h-4 w-4" />
  Send Email
</Button>
```

### Icon on Right

```tsx
import { ChevronRight } from "lucide-react";

<Button>
  Continue
  <ChevronRight className="h-4 w-4" />
</Button>
```

### Icon Only

```tsx
import { Trash2 } from "lucide-react";

<Button size="icon" variant="destructive" aria-label="Delete item">
  <Trash2 className="h-4 w-4" />
</Button>
```

Always provide an `aria-label` for icon-only buttons to ensure accessibility.

## Advanced Usage

### Polymorphic Rendering (asChild)

The `asChild` prop allows the Button to render as a different element while maintaining button styles:

```tsx
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

<Button asChild>
  <Link to="/dashboard">Go to Dashboard</Link>
</Button>
```

This is particularly useful for:
- Rendering styled links that look like buttons
- Integrating with routing libraries
- Creating custom interactive elements

### Custom Styling

You can extend or override styles using the `className` prop:

```tsx
<Button className="w-full mt-4">Full Width Button</Button>
```

The component uses `cn()` utility to intelligently merge Tailwind classes, preventing conflicts.

### Form Integration

```tsx
<form onSubmit={handleSubmit}>
  <input type="text" name="email" />
  <Button type="submit">Submit</Button>
</form>
```

The Button defaults to `type="button"` to prevent accidental form submissions. Explicitly set `type="submit"` when needed.

### Ref Forwarding

```tsx
const buttonRef = useRef<HTMLButtonElement>(null);

<Button ref={buttonRef} onClick={() => buttonRef.current?.focus()}>
  Focus Me
</Button>
```

## API Reference

### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `variant` | `"primary" \| "secondary" \| "destructive" \| "outline" \| "ghost" \| "link"` | `"primary"` | Visual style variant |
| `size` | `"sm" \| "default" \| "lg" \| "icon"` | `"default"` | Button size |
| `disabled` | `boolean` | `false` | Disables the button |
| `loading` | `boolean` | `false` | Shows loading spinner and disables button |
| `asChild` | `boolean` | `false` | Renders as child element (polymorphic) |
| `className` | `string` | `undefined` | Additional CSS classes |
| `type` | `"button" \| "submit" \| "reset"` | `"button"` | HTML button type |
| `onClick` | `(event: React.MouseEvent) => void` | `undefined` | Click event handler |
| `children` | `React.ReactNode` | - | Button content |
| `ref` | `React.Ref<HTMLButtonElement>` | `undefined` | Forwarded ref |

All standard HTML button attributes are also supported.

### Exports

- `Button` - The main Button component
- `ButtonProps` - TypeScript interface for Button props
- `buttonVariants` - Class variance authority configuration (useful for creating button-styled custom components)

## Accessibility

The Button component follows WAI-ARIA best practices:

- **Keyboard Navigation**: Fully keyboard accessible with native button semantics
- **Focus Management**: Visible focus indicators with `focus-visible:ring-2`
- **Screen Readers**: 
  - Uses semantic `<button>` element by default
  - Supports `aria-label` for icon-only buttons
  - Sets `aria-disabled` when disabled
  - Sets `aria-busy` when loading
- **Color Contrast**: All variants meet WCAG AA contrast requirements
- **Disabled State**: Uses both `disabled` attribute and `aria-disabled` for maximum compatibility

### Best Practices

1. **Icon-Only Buttons**: Always provide descriptive `aria-label`:
   ```tsx
   <Button size="icon" aria-label="Close dialog">
     <X className="h-4 w-4" />
   </Button>
   ```

2. **Loading State**: Inform users about ongoing operations:
   ```tsx
   <Button loading disabled={isSubmitting}>
     {isSubmitting ? "Saving..." : "Save Changes"}
   </Button>
   ```

3. **Destructive Actions**: Use clear, explicit labels:
   ```tsx
   <Button variant="destructive">
     Delete Account Permanently
   </Button>
   ```

4. **Form Submissions**: Set appropriate type:
   ```tsx
   <Button type="submit">Submit Form</Button>
   <Button type="button" onClick={onCancel}>Cancel</Button>
   ```

## Examples

### Async Action with Loading State

```tsx
import { useState } from "react";
import { Button } from "@/components/ui/button";

function AsyncButton() {
  const [isLoading, setIsLoading] = useState(false);

  const handleClick = async () => {
    setIsLoading(true);
    try {
      await fetch("/api/data");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Button loading={isLoading} onClick={handleClick}>
      {isLoading ? "Loading..." : "Fetch Data"}
    </Button>
  );
}
```

### Button Group

```tsx
<div className="flex gap-2">
  <Button variant="outline" onClick={onCancel}>
    Cancel
  </Button>
  <Button variant="primary" onClick={onConfirm}>
    Confirm
  </Button>
</div>
```

### Responsive Button

```tsx
<Button size="sm" className="md:hidden">
  Mobile
</Button>
<Button size="default" className="hidden md:inline-flex">
  Desktop
</Button>
```

### Navigation with React Router

```tsx
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";

<Button asChild>
  <Link to="/getting-started">
    Get Started
    <ArrowRight className="h-4 w-4" />
  </Link>
</Button>
```

## Troubleshooting

### Styles Not Applying

Ensure your Tailwind configuration includes the component's class names in the content array:

```js
// tailwind.config.js
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  // ...
};
```

### TypeScript Errors with asChild

When using `asChild`, TypeScript may show errors about incompatible props. This is expected as the child component may have different props than a button:

```tsx
// This is fine - TypeScript will infer from the child
<Button asChild>
  <a href="/path">Link</a>
</Button>
```

### Loading Spinner Not Showing

Ensure you have `lucide-react` installed and the Tailwind `animate-spin` utility is available:

```bash
pnpm add lucide-react
```

## Migration Guide

If migrating from an existing button implementation:

1. **Replace imports**:
   ```tsx
   // Before
   import Button from "./OldButton";
   
   // After
   import { Button } from "@/components/ui/button";
   ```

2. **Update prop names**: Map your existing props to the new API
3. **Update variant names**: Ensure variant names match the new system
4. **Add accessibility attributes**: Enhance icon-only buttons with `aria-label`
5. **Test thoroughly**: Verify all button interactions work as expected

## Related Components

- **IconButton**: For icon-only actions
- **ButtonGroup**: For grouping related buttons
- **DropdownMenu**: For buttons that open menus
- **Dialog**: For buttons that trigger modals

## Support

For issues, questions, or contributions, please refer to the project's GitHub repository or internal documentation system.
