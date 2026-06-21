import type { ReactNode } from "react";
import { useEffect, useRef, useState } from "react";
import { Animated, Platform, Pressable, StyleSheet, Text, View } from "react-native";
import type { Theme } from "../constants/theme";
import { AppIcon } from "./AppIcon";
import { BootScreen } from "./BootScreen";
import { ThemeToggle } from "./ThemeToggle";

interface MacWindowProps {
  /** Text shown centered in the title bar, mimicking a macOS document title. */
  title: string;
  /** Name used in the boot log's "launching session" line (defaults to title). */
  bootLabel?: string;
  theme: Theme;
  onToggleTheme: () => void;
  children: ReactNode;
}

// Standard macOS "traffic light" colors with their slightly darker rims.
const TRAFFIC_LIGHTS = [
  { key: "close", color: "#FF5F57", border: "#E0443E", glyph: "\u2715" },
  { key: "minimize", color: "#FEBC2E", border: "#DEA123", glyph: "\u2212" },
  { key: "zoom", color: "#28C840", border: "#1AAB29", glyph: "+" },
] as const;

type WindowState = "open" | "minimized" | "closed";

/**
 * Wraps the whole site in a macOS-style application window over a white
 * "desktop". The traffic lights are fully wired:
 *   - red   → closes the app (window flies out, a desktop shortcut appears)
 *   - yellow → minimizes (genie-shrinks into a Dock at the bottom)
 *   - green  → toggles a maximized size
 * Launching from the desktop icon replays the boot splash.
 */
export function MacWindow({ title, bootLabel, theme, onToggleTheme, children }: MacWindowProps) {
  const isDark = theme === "dark";
  const [windowState, setWindowState] = useState<WindowState>("open");
  const [maximized, setMaximized] = useState(false);
  const [lightsHovered, setLightsHovered] = useState(false);
  const [booting, setBooting] = useState(true);

  // `anim`: overall presence (opacity + gentle scale) for open/close.
  // `minimizeAnim`: 0 = resting, 1 = shrunk + dropped toward the Dock (genie).
  const anim = useRef(new Animated.Value(0)).current;
  const minimizeAnim = useRef(new Animated.Value(0)).current;

  // Position offset from the centered resting spot, set by dragging the title
  // bar. `offsetRef` mirrors it so a new drag continues from the last position.
  const dragOffset = useRef(new Animated.ValueXY({ x: 0, y: 0 })).current;
  const offsetRef = useRef({ x: 0, y: 0 });
  const titleBarRef = useRef<View>(null);

  // Explicit window size (px) once measured, so the corner handles can resize
  // it. `null` until the first measure, where we fall back to an 80% percentage.
  const [size, setSize] = useState<{ w: number; h: number } | null>(null);
  const [isResizing, setIsResizing] = useState(false);
  const sizeRef = useRef({ w: 0, h: 0 });
  // One handle per corner; each anchors the opposite corner while dragging.
  const handleTL = useRef<View>(null);
  const handleTR = useRef<View>(null);
  const handleBL = useRef<View>(null);
  const handleBR = useRef<View>(null);

  const resetPosition = () => {
    offsetRef.current = { x: 0, y: 0 };
    dragOffset.setValue({ x: 0, y: 0 });
  };

  const resetSize = () => {
    if (Platform.OS !== "web") return;
    const next = { w: Math.round(window.innerWidth * 0.8), h: Math.round(window.innerHeight * 0.8) };
    sizeRef.current = next;
    setSize(next);
  };

  // Establish the initial pixel size from 80% of the viewport (web only).
  useEffect(() => {
    resetSize();
  }, []);

  // Bring the window in once on first mount; the boot splash plays inside it.
  useEffect(() => {
    Animated.spring(anim, { toValue: 1, tension: 60, friction: 11, useNativeDriver: false }).start();
  }, [anim]);

  // Title-bar dragging (web). Mirrors macOS: grab the empty title-bar area to
  // move the window. Drags ignore the traffic lights / theme toggle because
  // those are real child elements, so a drag only begins when the press target
  // is the title bar itself.
  useEffect(() => {
    if (Platform.OS !== "web") return;
    const node = titleBarRef.current as unknown as HTMLElement | null;
    if (!node || windowState !== "open") return;

    let dragging = false;
    let startX = 0;
    let startY = 0;
    let baseX = 0;
    let baseY = 0;

    const clamp = (value: number, max: number) => Math.max(-max, Math.min(max, value));

    const onMove = (event: PointerEvent) => {
      if (!dragging) return;
      // Keep the window from being dragged entirely off the desktop.
      const maxX = window.innerWidth * 0.5;
      const maxY = window.innerHeight * 0.5;
      const x = clamp(baseX + (event.clientX - startX), maxX);
      const y = clamp(baseY + (event.clientY - startY), maxY);
      offsetRef.current = { x, y };
      dragOffset.setValue({ x, y });
    };

    const onUp = () => {
      dragging = false;
      document.body.style.cursor = "";
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };

    const onDown = (event: PointerEvent) => {
      // Only the bare title bar starts a drag, never its interactive children.
      if (event.target !== node) return;
      dragging = true;
      startX = event.clientX;
      startY = event.clientY;
      baseX = offsetRef.current.x;
      baseY = offsetRef.current.y;
      document.body.style.cursor = "grabbing";
      window.addEventListener("pointermove", onMove);
      window.addEventListener("pointerup", onUp);
    };

    node.addEventListener("pointerdown", onDown);
    return () => {
      node.removeEventListener("pointerdown", onDown);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
  }, [dragOffset, windowState]);

  // Corner resize (web). Each corner resizes the window while keeping the
  // OPPOSITE corner anchored. `dirX`/`dirY` (±1) say which edges that corner
  // moves; we shift the drag offset by half the actual size change to counteract
  // the center-based layout, so the anchored corner truly stays put.
  useEffect(() => {
    if (Platform.OS !== "web" || windowState !== "open" || maximized) return;

    const corners = [
      { node: handleTL.current as unknown as HTMLElement | null, dirX: -1, dirY: -1 },
      { node: handleTR.current as unknown as HTMLElement | null, dirX: 1, dirY: -1 },
      { node: handleBL.current as unknown as HTMLElement | null, dirX: -1, dirY: 1 },
      { node: handleBR.current as unknown as HTMLElement | null, dirX: 1, dirY: 1 },
    ].filter((c): c is { node: HTMLElement; dirX: number; dirY: number } => c.node != null);
    if (corners.length === 0) return;

    const minW = 360;
    const minH = 280;
    let active = false;
    let dirX = 1;
    let dirY = 1;
    let startX = 0;
    let startY = 0;
    let startW = 0;
    let startH = 0;
    let startOffX = 0;
    let startOffY = 0;

    const onMove = (event: PointerEvent) => {
      if (!active) return;
      const dx = event.clientX - startX;
      const dy = event.clientY - startY;
      const newW = Math.max(minW, Math.min(window.innerWidth, startW + dirX * dx));
      const newH = Math.max(minH, Math.min(window.innerHeight, startH + dirY * dy));
      const next = { w: Math.round(newW), h: Math.round(newH) };
      sizeRef.current = next;
      setSize(next);
      // Half the actual size change keeps the opposite corner anchored.
      const ox = startOffX + (dirX * (newW - startW)) / 2;
      const oy = startOffY + (dirY * (newH - startH)) / 2;
      offsetRef.current = { x: ox, y: oy };
      dragOffset.setValue({ x: ox, y: oy });
    };

    const onUp = () => {
      active = false;
      setIsResizing(false);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };

    const makeDown = (cornerX: number, cornerY: number) => (event: PointerEvent) => {
      active = true;
      dirX = cornerX;
      dirY = cornerY;
      setIsResizing(true);
      startX = event.clientX;
      startY = event.clientY;
      startW = sizeRef.current.w;
      startH = sizeRef.current.h;
      startOffX = offsetRef.current.x;
      startOffY = offsetRef.current.y;
      // Opposite diagonals get opposite resize cursors.
      document.body.style.cursor = cornerX * cornerY > 0 ? "nwse-resize" : "nesw-resize";
      document.body.style.userSelect = "none";
      event.preventDefault();
      event.stopPropagation();
      window.addEventListener("pointermove", onMove);
      window.addEventListener("pointerup", onUp);
    };

    const bound = corners.map((c) => ({ node: c.node, fn: makeDown(c.dirX, c.dirY) }));
    bound.forEach(({ node, fn }) => node.addEventListener("pointerdown", fn));
    return () => {
      bound.forEach(({ node, fn }) => node.removeEventListener("pointerdown", fn));
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
  }, [dragOffset, windowState, maximized]);

  const animateIn = () => {
    Animated.parallel([
      Animated.spring(anim, { toValue: 1, tension: 60, friction: 11, useNativeDriver: false }),
      Animated.timing(minimizeAnim, { toValue: 0, duration: 320, useNativeDriver: false }),
    ]).start();
  };

  const handleClose = () => {
    Animated.timing(anim, { toValue: 0, duration: 240, useNativeDriver: false }).start(() => {
      setWindowState("closed");
    });
  };

  const handleMinimize = () => {
    Animated.parallel([
      Animated.timing(anim, { toValue: 0, duration: 320, useNativeDriver: false }),
      Animated.timing(minimizeAnim, { toValue: 1, duration: 320, useNativeDriver: false }),
    ]).start(() => setWindowState("minimized"));
  };

  // Relaunch from the desktop shortcut: replay the boot splash, then reveal.
  const relaunch = () => {
    anim.setValue(0);
    minimizeAnim.setValue(0);
    resetPosition();
    resetSize();
    setMaximized(false);
    setBooting(true);
    setWindowState("open");
    animateIn();
  };

  // Restore from the Dock: genie back up, no boot replay (content stays mounted).
  const restore = () => {
    setWindowState("open");
    animateIn();
  };

  const titleBarBg = isDark ? "#323232" : "#E8E8E8";
  const borderColor = isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.10)";
  const titleColor = isDark ? "rgba(255,255,255,0.55)" : "rgba(0,0,0,0.55)";
  const contentBg = isDark ? "#171717" : "#F5F5F5";

  const sizeStyle = {
    // Use the measured pixel size when available; fall back to 80% pre-measure.
    width: maximized ? "100%" : size ? size.w : "80%",
    height: maximized ? "100%" : size ? size.h : "80%",
    // Full screen drops the rounded corners/border to truly fill the desktop.
    borderRadius: maximized ? 0 : 12,
    borderWidth: maximized ? 0 : 1,
  };

  const animatedWindowStyle = {
    opacity: anim,
    transform: [
      // Drag offset first so it reads in screen pixels, then the open/minimize
      // transforms layer on top.
      { translateX: dragOffset.x },
      { translateY: dragOffset.y },
      { translateY: minimizeAnim.interpolate({ inputRange: [0, 1], outputRange: [0, 360] }) },
      { scale: anim.interpolate({ inputRange: [0, 1], outputRange: [0.95, 1] }) },
      { scale: minimizeAnim.interpolate({ inputRange: [0, 1], outputRange: [1, 0.22] }) },
    ],
  };

  return (
    <View style={styles.desktop}>
      {/* The app window (hidden while closed). */}
      {windowState !== "closed" && (
        <Animated.View
          pointerEvents={windowState === "minimized" ? "none" : "auto"}
          style={[
            styles.window,
            sizeStyle,
            animatedWindowStyle,
            { borderColor },
            Platform.OS === "web"
              ? ({
                  boxShadow: "0 30px 80px rgba(0,0,0,0.28), 0 10px 24px rgba(0,0,0,0.14)",
                  // Animate size on maximize, but follow the cursor live while resizing.
                  transitionProperty: isResizing ? "none" : "width, height",
                  transitionDuration: "350ms",
                  transitionTimingFunction: "cubic-bezier(0.4, 0, 0.2, 1)",
                } as unknown as object)
              : null,
          ]}
        >
          {/* Title bar (drag handle) */}
          <View
            ref={titleBarRef}
            style={[styles.titleBar, { backgroundColor: titleBarBg, borderBottomColor: borderColor }]}
          >
            <Pressable
              onHoverIn={() => setLightsHovered(true)}
              onHoverOut={() => setLightsHovered(false)}
              style={styles.lights}
            >
              {TRAFFIC_LIGHTS.map((light) => (
                <Pressable
                  key={light.key}
                  accessibilityRole="button"
                  accessibilityLabel={light.key}
                  onPress={() => {
                    if (light.key === "close") handleClose();
                    else if (light.key === "minimize") handleMinimize();
                    else {
                      // Zoom re-centers the window, like macOS.
                      resetPosition();
                      setMaximized((m) => !m);
                    }
                  }}
                  style={[styles.light, { backgroundColor: light.color, borderColor: light.border }]}
                >
                  {lightsHovered && (
                    <Text style={styles.lightGlyph} selectable={false}>
                      {light.glyph}
                    </Text>
                  )}
                </Pressable>
              ))}
            </Pressable>

            <View pointerEvents="none" style={styles.titleBarSpacer} />

            <View style={styles.titleBarRight}>
              <ThemeToggle theme={theme} onToggle={onToggleTheme} />
            </View>

            <Text style={[styles.title, { color: titleColor }]} numberOfLines={1} selectable={false}>
              {title}
            </Text>
          </View>

          {/* Content area: boot splash first, then the page. */}
          <View style={[styles.content, { backgroundColor: contentBg }]}>
            {booting ? <BootScreen label={bootLabel ?? title} onFinish={() => setBooting(false)} /> : children}
          </View>

          {/* Corner resize handles (web, only when not full screen). Top corners
              are kept small so they never cover the traffic lights / theme toggle. */}
          {Platform.OS === "web" && !maximized && (
            <>
              <View ref={handleTL} style={[styles.resizeCorner, styles.resizeTL]} />
              <View ref={handleTR} style={[styles.resizeCorner, styles.resizeTR]} />
              <View ref={handleBL} style={[styles.resizeCorner, styles.resizeBL]} />
              <View ref={handleBR} style={[styles.resizeCorner, styles.resizeBR]}>
                <View
                  style={[
                    styles.resizeGrip,
                    { borderColor: isDark ? "rgba(255,255,255,0.35)" : "rgba(0,0,0,0.28)" },
                  ]}
                />
              </View>
            </>
          )}
        </Animated.View>
      )}

      {/* Desktop shortcut (visible when the app is closed). */}
      {windowState === "closed" && (
        <Pressable
          onPress={relaunch}
          accessibilityRole="button"
          accessibilityLabel={`Open ${title}`}
          style={({ hovered }) => [styles.shortcut, hovered && styles.shortcutHovered]}
        >
          <AppIcon size={58} />
          <Text style={styles.shortcutLabel} numberOfLines={2} selectable={false}>
            {title}
          </Text>
        </Pressable>
      )}

      {/* Dock (visible when minimized). */}
      {windowState === "minimized" && (
        <View style={styles.dock}>
          <Pressable
            onPress={restore}
            accessibilityRole="button"
            accessibilityLabel={`Restore ${title}`}
            style={({ hovered }) => [styles.dockItem, hovered && styles.dockItemHovered]}
          >
            <AppIcon size={46} />
          </Pressable>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  desktop: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    // The "desktop" behind the window, per the macOS metaphor.
    backgroundColor: "#FFFFFF",
  },
  window: {
    position: "relative",
    borderRadius: 12,
    borderWidth: 1,
    overflow: "hidden",
  },
  titleBar: {
    height: 40,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    borderBottomWidth: 1,
    zIndex: 2,
    // Signal the title bar is a drag handle (overridden by the buttons' cursor).
    ...(Platform.OS === "web" ? ({ cursor: "grab", userSelect: "none" } as unknown as object) : null),
  },
  titleBarSpacer: {
    flex: 1,
  },
  titleBarRight: {
    // Above the absolutely-centered title so the toggle stays clickable.
    zIndex: 3,
  },
  lights: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    zIndex: 3,
  },
  light: {
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 0.5,
    alignItems: "center",
    justifyContent: "center",
    ...(Platform.OS === "web" ? ({ cursor: "pointer" } as unknown as object) : null),
  },
  lightGlyph: {
    fontSize: 9,
    fontWeight: "700",
    lineHeight: 10,
    color: "rgba(0,0,0,0.55)",
  },
  title: {
    position: "absolute",
    left: 0,
    right: 0,
    textAlign: "center",
    fontSize: 13,
    fontWeight: "600",
    zIndex: 1,
    ...(Platform.OS === "web" ? ({ pointerEvents: "none" } as unknown as object) : null),
  },
  content: {
    flex: 1,
    position: "relative",
    overflow: "hidden",
  },
  resizeCorner: {
    position: "absolute",
    zIndex: 10,
  },
  // Top corners stay small so they clear the title-bar buttons; bottom ones are
  // a bit larger for an easier grab.
  resizeTL: {
    top: 0,
    left: 0,
    width: 12,
    height: 12,
    ...(Platform.OS === "web" ? ({ cursor: "nwse-resize" } as unknown as object) : null),
  },
  resizeTR: {
    top: 0,
    right: 0,
    width: 12,
    height: 12,
    ...(Platform.OS === "web" ? ({ cursor: "nesw-resize" } as unknown as object) : null),
  },
  resizeBL: {
    bottom: 0,
    left: 0,
    width: 16,
    height: 16,
    ...(Platform.OS === "web" ? ({ cursor: "nesw-resize" } as unknown as object) : null),
  },
  resizeBR: {
    bottom: 0,
    right: 0,
    width: 16,
    height: 16,
    alignItems: "flex-end",
    justifyContent: "flex-end",
    ...(Platform.OS === "web" ? ({ cursor: "nwse-resize" } as unknown as object) : null),
  },
  resizeGrip: {
    width: 9,
    height: 9,
    marginRight: 3,
    marginBottom: 3,
    borderRightWidth: 2,
    borderBottomWidth: 2,
  },
  shortcut: {
    position: "absolute",
    top: 28,
    left: 28,
    width: 92,
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
  shortcutLabel: {
    color: "rgba(0,0,0,0.72)",
    fontSize: 12,
    fontWeight: "600",
    textAlign: "center",
  },
  dock: {
    position: "absolute",
    bottom: 18,
    flexDirection: "row",
    alignItems: "flex-end",
    padding: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.08)",
    backgroundColor: "rgba(255,255,255,0.6)",
    ...(Platform.OS === "web"
      ? ({
          backdropFilter: "blur(20px)",
          boxShadow: "0 12px 40px rgba(0,0,0,0.18)",
        } as unknown as object)
      : { backgroundColor: "#F0F0F0" }),
  },
  dockItem: {
    padding: 4,
    borderRadius: 12,
    ...(Platform.OS === "web"
      ? ({ cursor: "pointer", transitionProperty: "transform", transitionDuration: "150ms" } as unknown as object)
      : null),
  },
  dockItemHovered: {
    ...(Platform.OS === "web" ? ({ transform: "translateY(-6px) scale(1.06)" } as unknown as object) : null),
  },
});
