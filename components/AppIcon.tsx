import type { ReactNode } from "react";
import { Platform, StyleSheet, Text, View, type StyleProp, type ViewStyle } from "react-native";

interface AppIconProps {
  /** Edge length of the (square) icon in px. */
  size?: number;
}

interface IconTileProps {
  /** Edge length of the (square) tile in px. */
  size: number;
  /** Solid fill. This is the whole look on native, which has no CSS gradients. */
  color: string;
  /** Web-only CSS gradient painted over `color`. */
  gradient?: string;
  style?: StyleProp<ViewStyle>;
  children: ReactNode;
}

// Monospaced stack so the ">_" prompt reads like a real terminal glyph.
const MONO_FONT = Platform.select({
  web: "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace",
  default: "monospace",
});

// Light-to-dark sheen that gives any flat brand color the same depth as a Mac icon.
const DEFAULT_SHEEN =
  "linear-gradient(160deg, rgba(255,255,255,0.22) 0%, rgba(255,255,255,0) 55%, rgba(0,0,0,0.18) 100%)";

/** The macOS-style squircle behind every desktop and Dock icon. */
export function IconTile({ size, color, gradient = DEFAULT_SHEEN, style, children }: IconTileProps) {
  return (
    <View
      style={[
        styles.tile,
        {
          width: size,
          height: size,
          // macOS "squircle" corners are ~22.5% of the edge.
          borderRadius: size * 0.225,
          backgroundColor: color,
        },
        Platform.OS === "web"
          ? ({
              backgroundImage: gradient,
              boxShadow: "0 10px 24px rgba(0,0,0,0.30), inset 0 1px 0 rgba(255,255,255,0.18)",
            } as unknown as object)
          : null,
        style,
      ]}
    >
      {children}
    </View>
  );
}

/**
 * The "app" icon used on the desktop shortcut and the Dock. Modeled on the
 * macOS Terminal icon (dark squircle with a top-left ">_" prompt), but a touch
 * lighter than the stock black.
 */
export function AppIcon({ size = 64 }: AppIconProps) {
  return (
    <IconTile
      size={size}
      color="#48484A"
      // Lighter than the stock near-black Terminal icon.
      gradient="linear-gradient(160deg, #5A5A5E 0%, #3A3A3C 60%, #303032 100%)"
      style={[styles.terminal, { padding: size * 0.16 }]}
    >
      <Text
        selectable={false}
        style={[styles.glyph, { fontSize: size * 0.3, fontFamily: MONO_FONT }]}
      >
        {">_"}
      </Text>
    </IconTile>
  );
}

const styles = StyleSheet.create({
  tile: {
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
  },
  terminal: {
    // Prompt sits in the top-left corner, like the Terminal icon.
    alignItems: "flex-start",
    justifyContent: "flex-start",
  },
  glyph: {
    color: "#F2F2F2",
    fontWeight: "700",
  },
});
