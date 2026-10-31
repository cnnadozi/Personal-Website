import { Ionicons } from "@expo/vector-icons";
import type { ReactNode } from "react";
import { Image, Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { PROFILE } from "../constants/profile";
import { iconColors } from "../constants/theme";
import { openExternalUrl } from "../utils/linking";
import { IconTile } from "./AppIcon";

interface DesktopShortcutProps {
  label: string;
  accessibilityLabel: string;
  accessibilityRole: "button" | "link";
  onPress: () => void;
  /** The icon drawn above the label. */
  children: ReactNode;
}

/** Edge length of a desktop icon in px. */
export const DESKTOP_ICON_SIZE = 58;
/** Footprint of one shortcut (icon + label) in px. */
export const DESKTOP_SHORTCUT_WIDTH = 92;
export const DESKTOP_SHORTCUT_HEIGHT = 102;

// Black and multicolor logos stay true to their brand colors on a white tile.
// The border and soft gradient keep it visible against the white desktop.
const WHITE_TILE = {
  color: "#FFFFFF",
  gradient: "linear-gradient(160deg, #FFFFFF 0%, #F0F0F0 100%)",
  style: { borderColor: "rgba(0,0,0,0.08)" },
};

const DESKTOP_LINKS = [
  {
    label: "LinkedIn",
    href: PROFILE.links.linkedin,
    tile: { color: "#0A66C2" },
    icon: <Image source={require("../assets/images/logos/linkedin.png")} style={{ width: 48, height: 48 }} />,
  },
  {
    label: "GitHub",
    href: PROFILE.links.github,
    tile: WHITE_TILE,
    icon: <Image source={require("../assets/images/logos/github.png")} style={{ width: 40, height: 40 }} />,
  },
  {
    label: "Gmail",
    href: PROFILE.links.email,
    tile: WHITE_TILE,
    icon: <Image source={require("../assets/images/logos/gmail.png")} style={{ width: 40, height: 30 }} />,
  },
  {
    label: "Resume",
    href: PROFILE.links.cv,
    tile: { color: iconColors.light.resume },
    icon: <Ionicons name="document-text" size={30} color="#FFFFFF" />,
  },
];

/** Slots on the desktop: the links plus the Console's own shortcut. */
export const DESKTOP_SHORTCUT_COUNT = DESKTOP_LINKS.length + 1;

/** A labeled icon on the desktop. */
export function DesktopShortcut({
  label,
  accessibilityLabel,
  accessibilityRole,
  onPress,
  children,
}: DesktopShortcutProps) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole={accessibilityRole}
      accessibilityLabel={accessibilityLabel}
      style={({ hovered }) => [styles.shortcut, hovered && styles.shortcutHovered]}
    >
      {children}
      <Text style={styles.label} numberOfLines={1} selectable={false}>
        {label}
      </Text>
    </Pressable>
  );
}

/** An empty shortcut-sized gap, so a hidden shortcut doesn't shift the ones after it. */
export function DesktopShortcutSlot() {
  return <View style={styles.shortcut} />;
}

/** The shortcuts that open the profile links in a new tab. */
export function DesktopLinks() {
  return (
    <>
      {DESKTOP_LINKS.map((link) => (
        <DesktopShortcut
          key={link.label}
          label={link.label}
          accessibilityLabel={`Open ${link.label}`}
          accessibilityRole="link"
          onPress={() => openExternalUrl(link.href)}
        >
          <IconTile size={DESKTOP_ICON_SIZE} {...link.tile}>
            {link.icon}
          </IconTile>
        </DesktopShortcut>
      ))}
    </>
  );
}

const styles = StyleSheet.create({
  shortcut: {
    width: DESKTOP_SHORTCUT_WIDTH,
    height: DESKTOP_SHORTCUT_HEIGHT,
    alignItems: "center",
    paddingVertical: 10,
    paddingHorizontal: 6,
    borderRadius: 12,
    gap: 8,
    ...(Platform.OS === "web"
      ? ({ cursor: "pointer", transitionProperty: "background-color", transitionDuration: "150ms" } as unknown as object)
      : null),
  },
  shortcutHovered: {
    backgroundColor: "rgba(0,0,0,0.06)",
  },
  label: {
    color: "rgba(0,0,0,0.72)",
    fontSize: 12,
    fontWeight: "600",
    textAlign: "center",
  },
});
