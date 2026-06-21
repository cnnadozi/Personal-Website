import { useEffect, useRef, useState } from "react";
import { Animated, Easing, Platform, StyleSheet, Text, View } from "react-native";

interface BootScreenProps {
  /** Name used in the final "launching session" line. */
  label: string;
  /** Fired once the boot log has played and faded out. */
  onFinish: () => void;
}

const MONO_FONT = Platform.select({
  web: "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace",
  default: "monospace",
});

// Time each boot-log line waits before the next prints.
const STEP_MS = 240;

/**
 * A terminal-style launch sequence: boot-log lines print one-by-one with a
 * blinking cursor, then the whole screen fades to reveal the app. Fits the
 * Terminal icon and plays on first load and every relaunch.
 */
export function BootScreen({ label, onFinish }: BootScreenProps) {
  const lines = [
    { text: "system bootloader v1.0" },
    { text: "mounting /dev/curiosity", ok: true },
    { text: "loading module: builder", ok: true },
    { text: "starting window_server", ok: true },
    { text: "initializing workspace", ok: true },
    { text: `launching session: ${label}`, ok: true },
  ];

  const [visible, setVisible] = useState(0);
  const [cursorOn, setCursorOn] = useState(true);
  const fade = useRef(new Animated.Value(1)).current;
  const onFinishRef = useRef(onFinish);
  onFinishRef.current = onFinish;

  useEffect(() => {
    let i = 0;
    let holdTimer: ReturnType<typeof setTimeout> | undefined;

    const stepTimer = setInterval(() => {
      i += 1;
      setVisible(i);
      if (i >= lines.length) {
        clearInterval(stepTimer);
        holdTimer = setTimeout(() => {
          Animated.timing(fade, {
            toValue: 0,
            duration: 420,
            easing: Easing.in(Easing.quad),
            useNativeDriver: false,
          }).start(({ finished }) => {
            if (finished) onFinishRef.current();
          });
        }, 480);
      }
    }, STEP_MS);

    const blinkTimer = setInterval(() => setCursorOn((c) => !c), 480);

    return () => {
      clearInterval(stepTimer);
      clearInterval(blinkTimer);
      if (holdTimer) clearTimeout(holdTimer);
    };
    // Run once; `lines` is recreated each render but the sequence is fixed.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fade]);

  return (
    <Animated.View style={[styles.overlay, { opacity: fade }]}>
      <View style={styles.console}>
        {lines.slice(0, visible).map((line, idx) => (
          <View key={idx} style={styles.row}>
            <Text style={styles.prompt} selectable={false}>
              {">"}
            </Text>
            <Text style={styles.lineText} selectable={false}>
              {` ${line.text}`}
            </Text>
            {line.ok && (
              <Text style={styles.ok} selectable={false}>
                {"  [ ok ]"}
              </Text>
            )}
          </View>
        ))}

        {/* Prompt waiting for the next command. */}
        {visible < lines.length && (
          <View style={styles.row}>
            <Text style={styles.prompt} selectable={false}>
              {">"}
            </Text>
            <Text style={styles.cursor} selectable={false}>
              {cursorOn ? " \u258B" : "  "}
            </Text>
          </View>
        )}
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 28,
    backgroundColor: "#0A0A0A",
    zIndex: 50,
  },
  console: {
    width: "100%",
    maxWidth: 440,
    alignItems: "flex-start",
  },
  row: {
    flexDirection: "row",
    alignItems: "baseline",
    marginVertical: 2,
  },
  prompt: {
    color: "#4ADE80",
    fontFamily: MONO_FONT,
    fontSize: 13.5,
    fontWeight: "700",
  },
  lineText: {
    color: "#D4D4D8",
    fontFamily: MONO_FONT,
    fontSize: 13.5,
    lineHeight: 22,
  },
  ok: {
    color: "#4ADE80",
    fontFamily: MONO_FONT,
    fontSize: 13.5,
    fontWeight: "700",
  },
  cursor: {
    color: "#D4D4D8",
    fontFamily: MONO_FONT,
    fontSize: 13.5,
  },
});
