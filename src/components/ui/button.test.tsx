import * as React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi } from "vitest";
import { Button } from "./button";
import { Home } from "lucide-react";

describe("Button Component", () => {
  describe("Functional Tests", () => {
    // TC-001: Verify button renders with default props
    it("TC-001: should render with default props", () => {
      render(<Button>Click me</Button>);
      const button = screen.getByRole("button", { name: /click me/i });
      expect(button).toBeInTheDocument();
      expect(button).toHaveClass("bg-blue-600");
    });

    // TC-002: Verify button renders with custom text
    it("TC-002: should render with custom text", () => {
      render(<Button>Custom Text</Button>);
      expect(screen.getByText("Custom Text")).toBeInTheDocument();
    });

    // TC-003: Verify button onClick handler is called
    it("TC-003: should call onClick handler when clicked", async () => {
      const handleClick = vi.fn();
      render(<Button onClick={handleClick}>Click me</Button>);
      const button = screen.getByRole("button");
      await userEvent.click(button);
      expect(handleClick).toHaveBeenCalledTimes(1);
    });

    // TC-004: Verify primary variant applies correct styles
    it("TC-004: should apply primary variant styles", () => {
      render(<Button variant="primary">Primary</Button>);
      const button = screen.getByRole("button");
      expect(button).toHaveClass("bg-blue-600");
      expect(button).toHaveClass("text-white");
    });

    // TC-005: Verify secondary variant applies correct styles
    it("TC-005: should apply secondary variant styles", () => {
      render(<Button variant="secondary">Secondary</Button>);
      const button = screen.getByRole("button");
      expect(button).toHaveClass("bg-gray-200");
      expect(button).toHaveClass("text-gray-900");
    });

    // TC-006: Verify outline variant applies correct styles
    it("TC-006: should apply outline variant styles", () => {
      render(<Button variant="outline">Outline</Button>);
      const button = screen.getByRole("button");
      expect(button).toHaveClass("border");
      expect(button).toHaveClass("border-gray-300");
    });

    // TC-007: Verify ghost variant applies correct styles
    it("TC-007: should apply ghost variant styles", () => {
      render(<Button variant="ghost">Ghost</Button>);
      const button = screen.getByRole("button");
      expect(button).toHaveClass("hover:bg-gray-100");
    });

    // TC-008: Verify destructive variant applies correct styles
    it("TC-008: should apply destructive variant styles", () => {
      render(<Button variant="destructive">Delete</Button>);
      const button = screen.getByRole("button");
      expect(button).toHaveClass("bg-red-600");
      expect(button).toHaveClass("text-white");
    });

    // TC-009: Verify link variant applies correct styles
    it("TC-009: should apply link variant styles", () => {
      render(<Button variant="link">Link</Button>);
      const button = screen.getByRole("button");
      expect(button).toHaveClass("text-blue-600");
      expect(button).toHaveClass("underline-offset-4");
    });

    // TC-010: Verify small size applies correct styles
    it("TC-010: should apply small size styles", () => {
      render(<Button size="sm">Small</Button>);
      const button = screen.getByRole("button");
      expect(button).toHaveClass("h-8");
      expect(button).toHaveClass("px-3");
      expect(button).toHaveClass("text-xs");
    });

    // TC-011: Verify default size applies correct styles
    it("TC-011: should apply default size styles", () => {
      render(<Button size="default">Default</Button>);
      const button = screen.getByRole("button");
      expect(button).toHaveClass("h-10");
      expect(button).toHaveClass("px-4");
    });

    // TC-012: Verify large size applies correct styles
    it("TC-012: should apply large size styles", () => {
      render(<Button size="lg">Large</Button>);
      const button = screen.getByRole("button");
      expect(button).toHaveClass("h-12");
      expect(button).toHaveClass("px-8");
    });

    // TC-013: Verify icon size applies correct styles
    it("TC-013: should apply icon size styles", () => {
      render(
        <Button size="icon" aria-label="Home">
          <Home className="h-4 w-4" />
        </Button>
      );
      const button = screen.getByRole("button");
      expect(button).toHaveClass("h-10");
      expect(button).toHaveClass("w-10");
    });

    // TC-014: Verify disabled button does not trigger onClick
    it("TC-014: should not trigger onClick when disabled", async () => {
      const handleClick = vi.fn();
      render(
        <Button disabled onClick={handleClick}>
          Disabled
        </Button>
      );
      const button = screen.getByRole("button");
      await userEvent.click(button);
      expect(handleClick).not.toHaveBeenCalled();
    });

    // TC-015: Verify disabled button has correct attributes
    it("TC-015: should have disabled attribute when disabled", () => {
      render(<Button disabled>Disabled</Button>);
      const button = screen.getByRole("button");
      expect(button).toBeDisabled();
      expect(button).toHaveAttribute("aria-disabled", "true");
    });

    // TC-016: Verify custom className merges correctly
    it("TC-016: should merge custom className with variant classes", () => {
      render(<Button className="custom-class">Button</Button>);
      const button = screen.getByRole("button");
      expect(button).toHaveClass("custom-class");
      expect(button).toHaveClass("bg-blue-600");
    });

    // TC-017: Verify button renders with icon
    it("TC-017: should render button with icon", () => {
      render(
        <Button>
          <Home className="h-4 w-4" />
          Home
        </Button>
      );
      expect(screen.getByText("Home")).toBeInTheDocument();
    });

    // TC-018: Verify asChild prop renders as child component
    it("TC-018: should render as child component when asChild is true", () => {
      render(
        <Button asChild>
          <a href="/test">Link Button</a>
        </Button>
      );
      const link = screen.getByRole("link");
      expect(link).toBeInTheDocument();
      expect(link).toHaveAttribute("href", "/test");
      expect(link).toHaveClass("bg-blue-600");
    });

    // TC-019: Verify ref is forwarded correctly
    it("TC-019: should forward ref to button element", () => {
      const ref = React.createRef<HTMLButtonElement>();
      render(<Button ref={ref}>Button</Button>);
      expect(ref.current).toBeInstanceOf(HTMLButtonElement);
    });

    // TC-020: Verify button can be focused
    it("TC-020: should be focusable", async () => {
      render(<Button>Focusable</Button>);
      const button = screen.getByRole("button");
      await userEvent.tab();
      expect(button).toHaveFocus();
    });

    // TC-021: Verify focus-visible styles apply
    it("TC-021: should have focus-visible styles", () => {
      render(<Button>Focus</Button>);
      const button = screen.getByRole("button");
      expect(button).toHaveClass("focus-visible:outline-none");
      expect(button).toHaveClass("focus-visible:ring-2");
    });

    // TC-022: Verify type attribute defaults to button
    it("TC-022: should default type to button", () => {
      render(<Button>Button</Button>);
      const button = screen.getByRole("button");
      expect(button).toHaveAttribute("type", "button");
    });

    // TC-023: Verify custom type attribute is applied
    it("TC-023: should apply custom type attribute", () => {
      render(<Button type="submit">Submit</Button>);
      const button = screen.getByRole("button");
      expect(button).toHaveAttribute("type", "submit");
    });

    // TC-040: Verify ARIA attributes for accessibility
    it("TC-040: should have proper ARIA attributes", () => {
      render(<Button aria-label="Custom Label">Button</Button>);
      const button = screen.getByRole("button");
      expect(button).toHaveAttribute("aria-label", "Custom Label");
    });

    // TC-041: Verify disabled button has aria-disabled
    it("TC-041: should have aria-disabled when disabled", () => {
      render(<Button disabled>Disabled</Button>);
      const button = screen.getByRole("button");
      expect(button).toHaveAttribute("aria-disabled", "true");
    });

    // TC-042: Verify loading state renders spinner
    it("TC-042: should render loading spinner when loading", () => {
      render(<Button loading>Loading</Button>);
      const button = screen.getByRole("button");
      expect(button).toHaveAttribute("aria-busy", "true");
      expect(button).toBeDisabled();
      const spinner = button.querySelector(".animate-spin");
      expect(spinner).toBeInTheDocument();
    });
  });

  describe("Edge Case Tests", () => {
    // TC-024: Verify button with empty children
    it("TC-024: should render with empty children", () => {
      render(<Button></Button>);
      const button = screen.getByRole("button");
      expect(button).toBeInTheDocument();
    });

    // TC-025: Verify button with very long text
    it("TC-025: should handle very long text", () => {
      const longText = "A".repeat(200);
      render(<Button>{longText}</Button>);
      expect(screen.getByText(longText)).toBeInTheDocument();
    });

    // TC-026: Verify button with special characters
    it("TC-026: should render with special characters", () => {
      render(<Button>Click & Save!</Button>);
      expect(screen.getByText("Click & Save!")).toBeInTheDocument();
    });

    // TC-027: Verify button with multiple children elements
    it("TC-027: should render with multiple children", () => {
      render(
        <Button>
          <span>Icon</span>
          <span>Text</span>
        </Button>
      );
      expect(screen.getByText("Icon")).toBeInTheDocument();
      expect(screen.getByText("Text")).toBeInTheDocument();
    });

    // TC-028: Verify rapid clicking
    it("TC-028: should handle rapid clicking", async () => {
      const handleClick = vi.fn();
      render(<Button onClick={handleClick}>Click</Button>);
      const button = screen.getByRole("button");
      await userEvent.click(button);
      await userEvent.click(button);
      await userEvent.click(button);
      expect(handleClick).toHaveBeenCalledTimes(3);
    });

    // TC-029: Verify button with zero-width content
    it("TC-029: should render with zero-width content", () => {
      render(<Button>{""}</Button>);
      const button = screen.getByRole("button");
      expect(button).toBeInTheDocument();
    });

    // TC-030: Verify multiple variants combined
    it("TC-030: should handle variant and size together", () => {
      render(
        <Button variant="destructive" size="lg">
          Delete
        </Button>
      );
      const button = screen.getByRole("button");
      expect(button).toHaveClass("bg-red-600");
      expect(button).toHaveClass("h-12");
    });

    // TC-031: Verify button with data attributes
    it("TC-031: should accept custom data attributes", () => {
      render(<Button data-testid="custom-button">Button</Button>);
      expect(screen.getByTestId("custom-button")).toBeInTheDocument();
    });

    // TC-032: Verify button with aria-label
    it("TC-032: should accept aria-label", () => {
      render(<Button aria-label="Close dialog">X</Button>);
      const button = screen.getByLabelText("Close dialog");
      expect(button).toBeInTheDocument();
    });
  });

  describe("Negative Tests", () => {
    // TC-033: Verify undefined variant falls back to default
    it("TC-033: should fallback to default variant when undefined", () => {
      render(<Button variant={undefined}>Button</Button>);
      const button = screen.getByRole("button");
      expect(button).toHaveClass("bg-blue-600");
    });

    // TC-034: Verify undefined size falls back to default
    it("TC-034: should fallback to default size when undefined", () => {
      render(<Button size={undefined}>Button</Button>);
      const button = screen.getByRole("button");
      expect(button).toHaveClass("h-10");
    });

    // TC-035: Verify null children renders empty button
    it("TC-035: should render with null children", () => {
      render(<Button>{null}</Button>);
      const button = screen.getByRole("button");
      expect(button).toBeInTheDocument();
    });

    // TC-036: Verify undefined onClick does not throw
    it("TC-036: should not throw when onClick is undefined", async () => {
      render(<Button>Button</Button>);
      const button = screen.getByRole("button");
      expect(() => userEvent.click(button)).not.toThrow();
    });

    // TC-037: Verify button with conflicting className
    it("TC-037: should handle conflicting Tailwind classes", () => {
      render(<Button className="bg-red-500">Button</Button>);
      const button = screen.getByRole("button");
      expect(button).toBeInTheDocument();
    });

    // TC-038: Verify asChild without children doesn't crash
    it("TC-038: should handle asChild with no valid children", () => {
      const { container } = render(<Button asChild />);
      expect(container).toBeInTheDocument();
    });

    // TC-039: Verify disabled button prevents onClick completely
    it("TC-039: should prevent onClick event when disabled", () => {
      const handleClick = vi.fn();
      render(
        <Button disabled onClick={handleClick}>
          Disabled
        </Button>
      );
      const button = screen.getByRole("button");
      fireEvent.click(button);
      expect(handleClick).not.toHaveBeenCalled();
    });
  });
});
