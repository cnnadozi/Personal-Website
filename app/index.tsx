import { useState } from "react";
import { HeroScreen } from "../components/HeroScreen";
import { MacWindow } from "../components/MacWindow";
import { PROFILE } from "../constants/profile";
import { type Theme } from "../constants/theme";

export default function Index() {
  const [theme, setTheme] = useState<Theme>("dark");

  return (
    <MacWindow
      title={PROFILE.appName}
      bootLabel={PROFILE.fullName}
      theme={theme}
      onToggleTheme={() => setTheme(theme === "light" ? "dark" : "light")}
    >
      <HeroScreen theme={theme} />
    </MacWindow>
  );
}
