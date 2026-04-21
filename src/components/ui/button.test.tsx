import * as React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { Button } from "./button";
import { Mail } from "lucide-react";

describe("Button Component - Functional Tests", () => {
  // TC-001: Default rendering
  it("TC-001: should render a button element by default", () => {
    render(<Button>Click me</Button>);
    const button = screen.getByRole("button", { name: /click me/i });
    expect(button).toBeInTheDocument();
    expect(button.tagName).toBe("BUTTON");
  });

  // TC-002: Children rendering
  it("TC-002: should render children content correctly", () => {
    render(<Button>Test Button</Button>);
    expect(screen.getByText("Test Button")).toBeInTheDocument();
  });

  // TC-003: onClick handler
  it("TC-003: should call onClick handler when clicked", () => {
    const handleClick = vi.fn();
    render(<Button onClick={handleClick}>Click me</Button>);
    fireEvent.click(screen.getByRole("button"));
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  // TC-004: Primary variant
  it("TC-004: should apply primary variant styles", () => {
    render(<Button variant="primary">Primary</Button>);
    const button = screen.getByRole("button");
    expect(button).toHaveClass("bg-primary");
  });

  // TC-005: Secondary variant
  it("TC-005: should apply secondary variant styles", () => {
    render(<Button variant="secondary">Secondary</Button>);
    const button = screen.getByRole("button");
    expect(button).toHaveClass("bg-secondary");
  });

  // TC-006: Destructive variant
  it("TC-006: should apply destructive variant styles", () => {
    render(<Button variant="destructive">Delete</Button>);
    const button = screen.getByRole("button");
    expect(button).toHaveClass("bg-destructive");
  });

  // TC-007: Outline variant
  it("TC-007: should apply outline variant styles", () => {
    render(<Button variant="outline">Outline</Button>);
    const button = screen.getByRole("button");
    expect(button).toHaveClass("border", "border-input");
  });

  // TC-008: Ghost variant
  it("TC-008: should apply ghost variant styles", () => {
    render(<Button variant="ghost">Ghost</Button>);
    const button = screen.getByRole("button");
    expect(button).toHaveClass("hover:bg-accent");
  });

  // TC-009: Link variant
  it("TC-009: should apply link variant styles", () => {
    render(<Button variant="link">Link</Button>);
    const button = screen.getByRole("button");
    expect(button).toHaveClass("underline-offset-4");
  });

  // TC-010: Small size
  it("TC-010: should apply small size styles", () => {
    render(<Button size="sm">Small</Button>);
    const button = screen.getByRole("button");
    expect(button).toHaveClass("h-9", "text-xs");
  });

  // TC-011: Default size
  it("TC-011: should apply default size styles", () => {
    render(<Button size="default">Default</Button>);
    const button = screen.getByRole("button");
    expect(button).toHaveClass("h-10");
  });

  // TC-012: Large size
  it("TC-012: should apply large size styles", () => {
    render(<Button size="lg">Large</Button>);
    const button = screen.getByRole("button");
    expect(button).toHaveClass("h-11", "text-base");
  });

  // TC-013: Icon size
  it("TC-013: should apply icon size styles", () => {
    render(
      <Button size="icon" aria-label="Icon button">
        <Mail className="h-4 w-4" />
      </Button>
    );
    const button = screen.getByRole("button");
    expect(button).toHaveClass("h-10", "w-10");
  });

  // TC-014: Disabled state
  it("TC-014: should apply disabled attribute and styles", () => {
    render(<Button disabled>Disabled</Button>);
    const button = screen.getByRole("button");
    expect(button).toBeDisabled();
    expect(button).toHaveClass("disabled:opacity-50");
  });

  // TC-015: Disabled button prevents click
  it("TC-015: should not call onClick when disabled", () => {
    const handleClick = vi.fn();
    render(
      <Button disabled onClick={handleClick}>
        Disabled
      </Button>
    );
    fireEvent.click(screen.getByRole("button"));
    expect(handleClick).not.toHaveBeenCalled();
  });

  // TC-016: Custom className
  it("TC-016: should merge custom className with default styles", () => {
    render(<Button className="custom-class">Custom</Button>);
    const button = screen.getByRole("button");
    expect(button).toHaveClass("custom-class", "inline-flex");
  });

  // TC-017: Icon with text
  it("TC-017: should render icon with text correctly", () => {
    render(
      <Button>
        <Mail className="h-4 w-4" />
        Send Email
      </Button>
    );
    expect(screen.getByText("Send Email")).toBeInTheDocument();
  });

  // TC-018: AsChild prop
  it("TC-018: should render as child component when asChild is true", () => {
    render(
      <Button asChild>
        <a href="/test">Link Button</a>
      </Button>
    );
    const link = screen.getByRole("link", { name: /link button/i });
    expect(link).toBeInTheDocument();
    expect(link.tagName).toBe("A");
    expect(link).toHaveAttribute("href", "/test");
  });

  // TC-019: Ref forwarding
  it("TC-019: should forward ref correctly", () => {
    const ref = React.createRef<HTMLButtonElement>();
    render(<Button ref={ref}>Button</Button>);
    expect(ref.current).toBeInstanceOf(HTMLButtonElement);
  });

  // TC-020: Focus visible styles
  it("TC-020: should apply focus-visible styles", () => {
    render(<Button>Focus</Button>);
    const button = screen.getByRole("button");
    expect(button).toHaveClass("focus-visible:ring-2");
  });

  // TC-021: Keyboard interaction
  it("TC-021: should be keyboard accessible", () => {
    const handleClick = vi.fn();
    render(<Button onClick={handleClick}>Keyboard</Button>);
    const button = screen.getByRole("button");
    button.focus();
    expect(button).toHaveFocus();
  });

  // TC-022: Type attribute
  it("TC-022: should accept custom type attribute", () => {
    render(<Button type="submit">Submit</Button>);
    const button = screen.getByRole("button");
    expect(button).toHaveAttribute("type", "submit");
  });

  // TC-023: Default type is button
  it("TC-023: should default type to button", () => {
    render(<Button>Default Type</Button>);
    const button = screen.getByRole("button");
    expect(button).toHaveAttribute("type", "button");
  });

  // TC-040: ARIA attributes
  it("TC-040: should have proper ARIA attributes", () => {
    render(<Button aria-label="Custom label">Button</Button>);
    const button = screen.getByRole("button", { name: /custom label/i });
    expect(button).toBeInTheDocument();
  });

  // TC-041: Disabled ARIA
  it("TC-041: should have aria-disabled when disabled", () => {
    render(<Button disabled>Disabled</Button>);
    const button = screen.getByRole("button");
    expect(button).toHaveAttribute("aria-disabled", "true");
  });

  // TC-042: Loading state
  it("TC-042: should display loading spinner and disable button when loading", () => {
    const handleClick = vi.fn();
    render(
      <Button loading onClick={handleClick}>
        Loading
      </Button>
    );
    const button = screen.getByRole("button");
    expect(button).toBeDisabled();
    expect(button).toHaveAttribute("aria-busy", "true");
    expect(button.querySelector(".animate-spin")).toBeInTheDocument();
    fireEvent.click(button);
    expect(handleClick).not.toHaveBeenCalled();
  });
});

describe("Button Component - Edge Cases", () => {
  // TC-024: Empty children
  it("TC-024: should handle empty children gracefully", () => {
    render(<Button aria-label="Empty button"></Button>);
    const button = screen.getByRole("button", { name: /empty button/i });
    expect(button).toBeInTheDocument();
  });

  // TC-025: Long text
  it("TC-025: should handle long text content", () => {
    const longText = "This is a very long button text that might cause layout issues";
    render(<Button>{longText}</Button>);
    expect(screen.getByText(longText)).toBeInTheDocument();
  });

  // TC-026: Multiple children
  it("TC-026: should render multiple children elements", () => {
    render(
      <Button>
        <span>Icon</span>
        <span>Text</span>
      </Button>
    );
    expect(screen.getByText("Icon")).toBeInTheDocument();
    expect(screen.getByText("Text")).toBeInTheDocument();
  });

  // TC-027: Variant and size combination
  it("TC-027: should apply both variant and size correctly", () => {
    render(
      <Button variant="destructive" size="lg">
        Large Destructive
      </Button>
    );
    const button = screen.getByRole("button");
    expect(button).toHaveClass("bg-destructive", "h-11");
  });

  // TC-028: Rapid clicking
  it("TC-028: should handle rapid clicking", () => {
    const handleClick = vi.fn();
    render(<Button onClick={handleClick}>Rapid Click</Button>);
    const button = screen.getByRole("button");
    fireEvent.click(button);
    fireEvent.click(button);
    fireEvent.click(button);
    expect(handleClick).toHaveBeenCalledTimes(3);
  });

  // TC-029: Complex children
  it("TC-029: should render complex nested children", () => {
    render(
      <Button>
        <div>
          <span>Nested</span>
          <strong>Content</strong>
        </div>
      </Button>
    );
    expect(screen.getByText("Nested")).toBeInTheDocument();
    expect(screen.getByText("Content")).toBeInTheDocument();
  });

  //TC-030: Special characters
  it("TC-030: should handle special characters in text", () => {
    render(<Button>Click & Save • Test → Done</Button>);
    expect(screen.getByText(/click & save • test → done/i)).toBeInTheDocument();
  });

  // TC-031: All props together
  it("TC-031: should handle all props simultaneously", () => {
    const handleClick = vi.fn();
    const ref = React.createRef<HTMLButtonElement>();
    render(
      <Button
        ref={ref}
        variant="outline"
        size="sm"
        className="extra-class"
        onClick={handleClick}
        type="submit"
        aria-label="Complex button"
      >
        Complex
      </Button>
    );
    const button = screen.getByRole("button");
    expect(button).toHaveClass("border", "h-9", "extra-class");
    expect(button).toHaveAttribute("type", "submit");
    expect(ref.current).toBe(button);
  });

  // TC-032: AsChild with event handlers
  it("TC-032: should preserve event handlers with asChild", () => {
    const handleClick = vi.fn();
    render(
      <Button asChild onClick={handleClick}>
        <a href="#">Link with handler</a>
      </Button>
    );
    const link = screen.getByRole("link");
    fireEvent.click(link);
    expect(handleClick).toHaveBeenCalledTimes(1);
  });
});

describe("Button Component - Negative Tests", () => {
  // TC-033: Invalid variant
  it("TC-033: should handle invalid variant gracefully", () => {
    render(
      <Button variant={"invalid" as any}>Invalid Variant</Button>
    );
    const button = screen.getByRole("button");
    expect(button).toBeInTheDocument();
  });

  // TC-034: Invalid size
  it("TC-034: should handle invalid size gracefully", () => {
    render(
      <Button size={"invalid" as any}>Invalid Size</Button>
    );
    const button = screen.getByRole("button");
    expect(button).toBeInTheDocument();
  });

  // TC-035: Null children
  it("TC-035: should handle null children", () => {
    render(<Button aria-label="Null children">{null}</Button>);
    const button = screen.getByRole("button", { name: /null children/i });
    expect(button).toBeInTheDocument();
  });

  // TC-036: Undefined onClick
  it("TC-036: should not error when onClick is undefined", () => {
    render(<Button>No handler</Button>);
    const button = screen.getByRole("button");
    expect(() => fireEvent.click(button)).not.toThrow();
  });

  // TC-037: AsChild without children
  it("TC-037: should handle asChild with no valid child", () => {
    render(
      <Button asChild aria-label="Empty asChild">
        {null}
      </Button>
    );
    expect(screen.queryByRole("button")).toBeInTheDocument();
  });

  // TC-038: Conflicting className
  it("TC-038: should handle conflicting Tailwind classes", () => {
    render(<Button className="bg-red-500 h-20">Conflicting</Button>);
    const button = screen.getByRole("button");
    expect(button).toBeInTheDocument();
  });

  // TC-039: Disabled with onClick
  it("TC-039: should not trigger onClick when disabled", () => {
    const handleClick = vi.fn();
    render(
      <Button disabled onClick={handleClick}>
        Disabled Click
      </Button>
    );
    const button = screen.getByRole("button");
    fireEvent.click(button);
    fireEvent.mouseDown(button);
    expect(handleClick).not.toHaveBeenCalled();
  });
});
