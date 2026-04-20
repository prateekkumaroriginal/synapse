# Button Component

A versatile and accessible button component built with React, TypeScript, and Tailwind CSS, following the shadcn/ui design system principles.

## Installation

The Button component depends on several packages. Ensure you have the following installed:

```bash
pnpm add class-variance-authority clsx tailwind-merge @radix-ui/react-slot lucide-react
```

## Basic Usage

```tsx
import { Button } from "@/components/ui/button";

function Example() {
  return <Button>Click me</Button>;
}
```

## API Reference

### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `variant` | `"default" \| "primary" \| "secondary" \| "destructive" \| "outline" \| "ghost" \| "link"` | `"default"` | Visual style variant of the button |
| `size` | `"default" \| "sm" \| "lg" \| "icon"` | `"default"` | Size of the button |
| `disabled` | `boolean` | `false` | Whether the button is disabled |
| `loading` | `boolean` | `false` | Whether the button is in loading state (shows spinner and disables) |
| `asChild` | `boolean` | `false` | Merge props with child component (polymorphic rendering) |
| `type` | `"button" \| "submit" \| "reset"` | `"button"` | HTML button type attribute |
| `className` | `string` | `undefined` | Additional CSS classes to apply |
| `children` | `ReactNode` | Required | Button content |
| `onClick` | `MouseEventHandler` | `undefined` | Click event handler |

The Button component also accepts all standard HTML button attributes.

## Variants

### Default / Primary

The primary action button with high contrast.

```tsx
<Button variant="default">Default Button</Button>
<Button variant="primary">Primary Button</Button>
```

### Secondary

For secondary actions with less visual emphasis.

```tsx
<Button variant="secondary">Secondary Button</Button>
```

### Destructive

For dangerous or destructive actions like deletion.

```tsx
<Button variant="destructive">Delete Account</Button>
```

### Outline

A button with an outlined border and transparent background.

```tsx
<Button variant="outline">Outline Button</Button>
```

### Ghost

A minimal button with no background, only showing on hover.

```tsx
<Button variant="ghost">Ghost Button</Button>
```

### Link

Styled like a hyperlink with underline on hover.

```tsx
<Button variant="link">Link Button</Button>
```

## Sizes

### Small

```tsx
<Button size="sm">Small Button</Button>
```

### Default

```tsx
<Button size="default">Default Size</Button>
```

### Large

```tsx
<Button size="lg">Large Button</Button>
```

### Icon

Square button optimized for icon-only content.

```tsx
import { Home } from "lucide-react";

<Button size="icon" aria-label="Home">
  <Home className="h-4 w-4" />
</Button>
```

## Advanced Usage

### With Icons

Buttons can include icons alongside text:

```tsx
import { Mail } from "lucide-react";

<Button>
  <Mail className="h-4 w-4" />
  Send Email
</Button>
```

### Loading State

Show a loading spinner and disable interaction:

```tsx
const [loading, setLoading] = useState(false);

<Button loading={loading} onClick={handleSubmit}>
  Submit Form
</Button>
```

### Disabled State

```tsx
<Button disabled>Disabled Button</Button>
```

### Polymorphic Rendering (asChild)

Render the button as a different element while maintaining button styles:

```tsx
import { Link } from "react-router-dom";

<Button asChild>
  <Link to="/dashboard">Go to Dashboard</Link>
</Button>

<Button asChild>
  <a href="https://example.com" target="_blank" rel="noopener noreferrer">
    External Link
  </a>
</Button>
```

### Custom Styling

Merge custom classes with variant styles:

```tsx
<Button className="w-full mt-4">
  Full Width Button
</Button>

<Button variant="outline" className="border-blue-500 text-blue-500">
  Custom Colors
</Button>
```

### Form Submit Button

```tsx
<form onSubmit={handleSubmit}>
  <Button type="submit">Submit</Button>
</form>
```

### Button Group

```tsx
<div className="flex gap-2">
  <Button variant="outline">Cancel</Button>
  <Button variant="primary">Save</Button>
</div>
```

## Accessibility

The Button component follows accessibility best practices:

- **Keyboard Navigation**: Buttons are keyboard accessible via Tab and Enter/Space keys
- **Focus Management**: Clear focus-visible ring indicators for keyboard navigation
- **Screen Readers**: Proper ARIA attributes including `aria-disabled` and `aria-busy`
- **Disabled State**: Disabled buttons use `disabled` attribute and `aria-disabled` for screen readers
- **Loading State**: Loading buttons set `aria-busy="true"` and disable interaction
- **Type Attribute**: Defaults to `type="button"` to prevent unintended form submissions

### Best Practices

1. **Always provide accessible labels** for icon-only buttons:
   ```tsx
   <Button size="icon" aria-label="Close dialog">
     <X className="h-4 w-4" />
   </Button>
   ```

2. **Use semantic HTML** - The button element is used by default, which provides built-in accessibility

3. **Provide clear button text** - Button labels should clearly describe the action

4. **Use appropriate variants** - Destructive actions should use the `destructive` variant

5. **Handle loading states** - Use the `loading` prop to prevent double submissions:
   ```tsx
   const [isLoading, setIsLoading] = useState(false);
   
   const handleClick = async () => {
     setIsLoading(true);
     try {
       await submitData();
     } finally {
       setIsLoading(false);
     }
   };
   
   <Button loading={isLoading} onClick={handleClick}>
     Submit
   </Button>
   ```

## Examples

### Login Form

```tsx
function LoginForm() {
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    // ... authentication logic
    setLoading(false);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* form fields */}
      <Button type="submit" loading={loading} className="w-full">
        Sign In
      </Button>
    </form>
  );
}
```

### Confirmation Dialog

```tsx
function DeleteConfirmation() {
  return (
    <div className="flex gap-2">
      <Button variant="outline" onClick={onCancel}>
        Cancel
      </Button>
      <Button variant="destructive" onClick={onConfirm}>
        <Trash2 className="h-4 w-4" />
        Delete
      </Button>
    </div>
  );
}
```

### Navigation

```tsx
import { Link } from "react-router-dom";

function Navigation() {
  return (
    <nav className="flex gap-2">
      <Button variant="ghost" asChild>
        <Link to="/home">Home</Link>
      </Button>
      <Button variant="ghost" asChild>
        <Link to="/about">About</Link>
      </Button>
      <Button variant="ghost" asChild>
        <Link to="/contact">Contact</Link>
      </Button>
    </nav>
  );
}
```

## Styling Customization

The button uses Tailwind CSS classes and can be customized through:

1. **Tailwind Config**: Modify colors in your `tailwind.config.js`:
   ```js
   module.exports = {
     theme: {
       extend: {
         colors: {
           primary: '#your-color',
         },
       },
     },
   };
   ```

2. **Custom Variants**: Extend the `buttonVariants` in `button.tsx` to add new variants

3. **ClassName Prop**: Pass custom classes directly to the component

## TypeScript

The Button component is fully typed:

```tsx
import { Button, type ButtonProps } from "@/components/ui/button";

// Custom button wrapper
function CustomButton({ children, ...props }: ButtonProps) {
  return (
    <Button variant="primary" {...props}>
      {children}
    </Button>
  );
}
```

## Migration Guide

If you're replacing existing buttons:

1. Import the new Button component
2. Replace `<button>` tags with `<Button>`
3. Map existing classes to appropriate variants and sizes
4. Update event handlers (should work seamlessly)
5. Add accessibility attributes if missing

Before:
```tsx
<button className="bg-blue-500 text-white px-4 py-2 rounded" onClick={handleClick}>
  Click me
</button>
```

After:
```tsx
<Button variant="primary" onClick={handleClick}>
  Click me
</Button>
```

## Testing

The Button component includes comprehensive tests. Run tests with:

```bash
pnpm test button.test.tsx
```

Example test:

```tsx
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Button } from "./button";

it("should call onClick handler", async () => {
  const handleClick = vi.fn();
  render(<Button onClick={handleClick}>Click me</Button>);
  
  await userEvent.click(screen.getByRole("button"));
  
  expect(handleClick).toHaveBeenCalledTimes(1);
});
```
