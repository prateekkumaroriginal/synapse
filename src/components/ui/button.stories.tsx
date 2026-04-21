import type { Meta, StoryObj } from "@storybook/react";
import { Button } from "./button";
import { Mail, Loader2, ChevronRight } from "lucide-react";

const meta: Meta<typeof Button> = {
  title: "UI/Button",
  component: Button,
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
  argTypes: {
    variant: {
      control: "select",
      options: ["primary", "secondary", "destructive", "outline", "ghost", "link"],
      description: "The visual style variant of the button",
    },
    size: {
      control: "select",
      options: ["sm", "default", "lg", "icon"],
      description: "The size of the button",
    },
    disabled: {
      control: "boolean",
      description: "Whether the button is disabled",
    },
    loading: {
      control: "boolean",
      description: "Whether the button is in a loading state",
    },
    asChild: {
      control: "boolean",
      description: "Render as a child component (polymorphic)",
    },
  },
};

export default meta;
type Story = StoryObj<typeof Button>;

export const Primary: Story = {
  args: {
    variant: "primary",
    children: "Primary Button",
  },
};

export const Secondary: Story = {
  args: {
    variant: "secondary",
    children: "Secondary Button",
  },
};

export const Destructive: Story = {
  args: {
    variant: "destructive",
    children: "Delete Account",
  },
};

export const Outline: Story = {
  args: {
    variant: "outline",
    children: "Outline Button",
  },
};

export const Ghost: Story = {
  args: {
    variant: "ghost",
    children: "Ghost Button",
  },
};

export const Link: Story = {
  args: {
    variant: "link",
    children: "Link Button",
  },
};

export const Small: Story = {
  args: {
    size: "sm",
    children: "Small Button",
  },
};

export const Default: Story = {
  args: {
    size: "default",
    children: "Default Button",
  },
};

export const Large: Story = {
  args: {
    size: "lg",
    children: "Large Button",
  },
};

export const IconButton: Story = {
  args: {
    size: "icon",
    "aria-label": "Send email",
    children: <Mail className="h-4 w-4" />,
  },
};

export const WithIcon: Story = {
  args: {
    children: (
      <>
        <Mail className="h-4 w-4" />
        Send Email
      </>
    ),
  },
};

export const WithIconRight: Story = {
  args: {
    children: (
      <>
        Continue
        <ChevronRight className="h-4 w-4" />
      </>
    ),
  },
};

export const Disabled: Story = {
  args: {
    disabled: true,
    children: "Disabled Button",
  },
};

export const Loading: Story = {
  args: {
    loading: true,
    children: "Loading...",
  },
};

export const LoadingWithIcon: Story = {
  args: {
    loading: true,
    children: "Please wait",
  },
};

export const AsLink: Story = {
  args: {
    asChild: true,
    children: <a href="https://example.com">Visit Website</a>,
  },
};

export const AllVariants: Story = {
  render: () => (
    <div className="flex flex-col gap-4">
      <div className="flex gap-2">
        <Button variant="primary">Primary</Button>
        <Button variant="secondary">Secondary</Button>
        <Button variant="destructive">Destructive</Button>
        <Button variant="outline">Outline</Button>
        <Button variant="ghost">Ghost</Button>
        <Button variant="link">Link</Button>
      </div>
    </div>
  ),
};

export const AllSizes: Story = {
  render: () => (
    <div className="flex items-center gap-2">
      <Button size="sm">Small</Button>
      <Button size="default">Default</Button>
      <Button size="lg">Large</Button>
      <Button size="icon" aria-label="Icon">
        <Mail className="h-4 w-4" />
      </Button>
    </div>
  ),
};

export const AllStates: Story = {
  render: () => (
    <div className="flex flex-col gap-4">
      <div className="flex gap-2">
        <Button>Normal</Button>
        <Button disabled>Disabled</Button>
        <Button loading>Loading</Button>
      </div>
      <div className="flex gap-2">
        <Button variant="secondary">Normal</Button>
        <Button variant="secondary" disabled>
          Disabled
        </Button>
        <Button variant="secondary" loading>
          Loading
        </Button>
      </div>
      <div className="flex gap-2">
        <Button variant="outline">Normal</Button>
        <Button variant="outline" disabled>
          Disabled
        </Button>
        <Button variant="outline" loading>
          Loading
        </Button>
      </div>
    </div>
  ),
};

export const Playground: Story = {
  args: {
    variant: "primary",
    size: "default",
    disabled: false,
    loading: false,
    children: "Playground Button",
  },
};
