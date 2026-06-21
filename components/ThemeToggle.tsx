import { Ionicons } from "@expo/vector-icons";
import { Platform, Pressable, StyleSheet } from "react-native";
import type { Theme } from "../constants/theme";

interface ThemeToggleProps {
  theme: Theme;
  onToggle: () => void;
}

/**
 * Compact light/dark switch designed to live on the right of the macOS title
 * bar, like a menu-bar extra. Subtle by default, with a faint hover background.
 */
export function ThemeToggle({ theme, onToggle }: ThemeToggleProps) {
  const isDark = theme === "dark";
  const iconColor = isDark ? "rgba(255,255,255,0.65)" : "rgba(0,0,0,0.6)";
  const hoverBg = isDark ? "rgba(255,255,255,0.10)" : "rgba(0,0,0,0.07)";

  return (
    <Pressable
      onPress={onToggle}
      accessibilityRole="button"
      accessibilityLabel={isDark ? "Switch to light mode" : "Switch to dark mode"}
      style={({ hovered, pressed }) => [
        styles.button,
        hovered && { backgroundColor: hoverBg },
        pressed && { opacity: 0.6 },
      ]}
    >
      <Ionicons name={isDark ? "sunny-outline" : "moon-outline"} size={16} color={iconColor} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    width: 28,
    height: 28,
    borderRadius: 7,
    alignItems: "center",
    justifyContent: "center",
    ...(Platform.OS === "web"
      ? ({
          cursor: "pointer",
          transitionProperty: "background-color, opacity",
          transitionDuration: "150ms",
        } as unknown as object)
      : null),
  },
});
