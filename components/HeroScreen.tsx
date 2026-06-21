import { Animated, Platform, StyleSheet, View } from "react-native";
import { PROFILE } from "../constants/profile";
import { themeColors, type Theme } from "../constants/theme";
import { useAnimations } from "../hooks/useAnimations";
import { useTypewriter } from "../hooks/useTypewriter";
import { styles } from "../styles";
import { IconLinkButton } from "./IconLinkButton";
import { InteractiveBackground } from "./InteractiveBackground";

/**
 * The actual page content (interactive background + name/links card). It is
 * mounted by MacWindow only once the boot splash finishes, so its entrance and
 * typewriter animations begin exactly when the app "opens".
 */
export function HeroScreen({ theme }: { theme: Theme }) {
  const typingSpeedMs = 55;
  // Start the subtitle right after the name finishes typing.
  const subtitleStartDelayMs = PROFILE.fullName.length * typingSpeedMs + 350;
  const { contentAnim, buttonsAnimStyle } = useAnimations();

  // Type the name first, then the subtitle, once the app has booted.
  const typedName = useTypewriter(PROFILE.fullName, {
    speedMs: typingSpeedMs,
    startDelayMs: 0,
  });
  const typedSubtitle = useTypewriter(PROFILE.subtitle, {
    speedMs: typingSpeedMs,
    startDelayMs: subtitleStartDelayMs,
    persistCursorAfterComplete: true,
  });
  const colors = themeColors[theme];

  return (
    <>
      {Platform.OS === "web" ? (
        <InteractiveBackground theme={theme} />
      ) : (
        <View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: colors.background }]} />
      )}

      <View style={styles.screen}>
        <Animated.View style={[styles.cardWrap, contentAnim, { backgroundColor: colors.cardBg, borderColor: colors.cardBorder }]}>
          <Animated.Text style={[styles.name, { color: colors.text }]}>{typedName}</Animated.Text>
          <Animated.Text style={[styles.subtitle, { color: colors.text }]}>{typedSubtitle}</Animated.Text>

          <Animated.View style={[styles.linkRow, buttonsAnimStyle]}>
            <IconLinkButton icon="logo-github" label="Open GitHub" tooltip="GitHub" href={PROFILE.links.github} theme={theme} />
            <IconLinkButton icon="logo-linkedin" label="Open LinkedIn" tooltip="LinkedIn" href={PROFILE.links.linkedin} theme={theme} />
            <IconLinkButton icon="document-text" label="Open Resume" tooltip="Resume" href={PROFILE.links.cv} theme={theme} />
            <IconLinkButton icon="mail" materialIcon="gmail" label="Send Email" tooltip="Email" href={PROFILE.links.email} theme={theme} />
          </Animated.View>
        </Animated.View>
      </View>
    </>
  );
}
