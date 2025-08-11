import { Moon, Sun } from "lucide-react";
import { Button } from "~/components/ui/button";
import { useTheme } from "~/hooks/use-theme";

export function ThemeToggle({ title }: { title?: string }) {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === "dark";
  return (
    <Button
      variant="secondary"
      size="icon"
      onClick={toggleTheme}
      title={title ?? (isDark ? "Switch to light mode" : "Switch to dark mode")}
      className="w-full"
   >
      {isDark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
    </Button>
  );
}


