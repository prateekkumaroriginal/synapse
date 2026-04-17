import { Monitor, Moon, Sun, type LucideIcon } from "lucide-react";

import type { ThemePreference } from "@/components/theme-context";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useTheme } from "@/hooks/use-theme";

const PREFERENCE_ICONS: Record<ThemePreference, LucideIcon> = {
  system: Monitor,
  light: Sun,
  dark: Moon,
};

export function ThemeToggle() {
  const { preference, setPreference } = useTheme();
  const PreferenceIcon = PREFERENCE_ICONS[preference];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="rounded-full"
          aria-label="Choose color theme"
          aria-haspopup="menu"
        >
          <PreferenceIcon className="size-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-40 rounded-xl">
        <DropdownMenuRadioGroup
          value={preference}
          onValueChange={(value) => {
            setPreference(value as ThemePreference);
          }}
        >
          <DropdownMenuRadioItem
            value="system"
            className="cursor-pointer gap-2 rounded-lg"
          >
            <Monitor className="size-4 shrink-0 text-muted-foreground" />
            System
          </DropdownMenuRadioItem>
          <DropdownMenuRadioItem
            value="light"
            className="cursor-pointer gap-2 rounded-lg"
          >
            <Sun className="size-4 shrink-0 text-muted-foreground" />
            Light
          </DropdownMenuRadioItem>
          <DropdownMenuRadioItem
            value="dark"
            className="cursor-pointer gap-2 rounded-lg"
          >
            <Moon className="size-4 shrink-0 text-muted-foreground" />
            Dark
          </DropdownMenuRadioItem>
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
