import { StyleSheet } from "react-native";

export const styles = StyleSheet.create({
  screen: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 20,
    paddingVertical: 28,
  },
  cardWrap: {
    width: "100%",
    maxWidth: 560,
    alignItems: "center",
    paddingHorizontal: 22,
    paddingVertical: 20,
  },
  name: {
    fontSize: 35,
    fontWeight: "800",
    textAlign: "center",
  },
  subtitle: {
    marginTop: 5,
    fontSize: 16,

    textAlign: "center",
    opacity: 0.6,
  },
  headline: {
    marginTop: 12,
    fontSize: 16,
    lineHeight: 24,
    fontWeight: "400",
    textAlign: "left",
    maxWidth: 460,
    opacity: 0.85,
  },
  linkRow: {
    marginTop: 18,
    flexDirection: "row",
    gap: 12,
    alignItems: "center",
    justifyContent: "center",
  },
});

