import { Platform, StyleSheet, Text, View } from "react-native";

interface AppIconProps {
  /** Edge length of the (square) icon in px. */
  size?: number;
}

// Monospaced stack so the ">_" prompt reads like a real terminal glyph.
const MONO_FONT = Platform.select({
  web: "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace",
  default: "monospace",
});

/**
 * The "app" icon used across the desktop shortcut, the Dock, and the boot
 * splash. Modeled on the macOS Terminal icon (dark squircle with a top-left
 * ">_" prompt), but a touch lighter than the stock black.
 */
export function AppIcon({ size = 64 }: AppIconProps) {
  return (
    <View
      style={[
        styles.icon,
        {
          width: size,
          height: size,
          // macOS "squircle" corners are ~22.5% of the edge.
          borderRadius: size * 0.225,
          padding: size * 0.16,
        },
        Platform.OS === "web"
          ? ({
              // Lighter than the stock near-black Terminal icon.
              backgroundImage: "linear-gradient(160deg, #5A5A5E 0%, #3A3A3C 60%, #303032 100%)",
              boxShadow: "0 10px 24px rgba(0,0,0,0.30), inset 0 1px 0 rgba(255,255,255,0.18)",
            } as unknown as object)
          : { backgroundColor: "#48484A" },
      ]}
    >
      <Text
        selectable={false}
        style={[styles.glyph, { fontSize: size * 0.3, fontFamily: MONO_FONT }]}
      >
        {">_"}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  icon: {
    // Prompt sits in the top-left corner, like the Terminal icon.
    alignItems: "flex-start",
    justifyContent: "flex-start",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
  },
  glyph: {
    color: "#F2F2F2",
    fontWeight: "700",
  },
});
