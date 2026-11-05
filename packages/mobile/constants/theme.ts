import { Platform } from "react-native";

/** Paleta SINCRONIA (ver design.md). La app usa un único esquema claro. */
const light = {
  background: "#FFFFFF",
  foreground: "#151B2E",
  card: "#FFFFFF",
  cardForeground: "#151B2E",
  primary: "#1F3263",
  primaryForeground: "#FFFFFF",
  secondary: "#F4F5F8",
  secondaryForeground: "#151B2E",
  muted: "#F4F5F8",
  mutedForeground: "#6B7280",
  accent: "#A51C30",
  accentForeground: "#FFFFFF",
  border: "#E6E8EF",
  destructive: "#A51C30",
  success: "#2F7D5B",
  warning: "#B7791F",
  ink: "#151B2E",
  navy: "#1F3263",
  navySoft: "#E8EEFF",
  crimson: "#A51C30",
  crimsonSoft: "#F7E3E8",
  surface: "#F4F5F8",
};

export const Colors = { light, dark: light } as const;

export type ColorScheme = keyof typeof Colors;
export type ThemeColors = typeof light;

/** Familias cargadas en app/_layout.tsx con useFonts. */
export const Fonts = {
  displayLight: "Outfit_200ExtraLight",
  display: "Outfit_300Light",
  displayMedium: "Outfit_500Medium",
  body: "Poppins_400Regular",
  bodyMedium: "Poppins_500Medium",
  bodySemi: "Poppins_600SemiBold",
  mono: Platform.select({ ios: "Menlo", android: "monospace", default: "monospace" }) as string,
};
