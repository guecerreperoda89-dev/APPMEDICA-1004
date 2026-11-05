import { type ReactNode } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  type StyleProp,
  type TextInputProps,
  type TextStyle,
  type ViewStyle,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { Stack, useRouter } from "expo-router";
import { Colors, Fonts } from "../constants/theme";
import { APPT_STATUS } from "../lib/utils";

const c = Colors.light;
type IconName = keyof typeof Ionicons.glyphMap;

/* ───────── Layout ───────── */

/** Pantalla con SafeArea + scroll + teclado. `tab` omite el borde inferior (lo pone la tab bar). */
export function Screen({
  children,
  tab,
  scroll = true,
  padded = true,
  footer,
}: {
  children: ReactNode;
  tab?: boolean;
  scroll?: boolean;
  padded?: boolean;
  footer?: ReactNode;
}) {
  const edges = tab ? (["top", "left", "right"] as const) : (["left", "right", "bottom"] as const);
  return (
    <SafeAreaView edges={edges} style={{ flex: 1, backgroundColor: c.background }}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : "height"} keyboardVerticalOffset={0}>
        {scroll ? (
          <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={[padded && { padding: 20, paddingBottom: 40 }]}>
            {children}
          </ScrollView>
        ) : (
          <View style={[{ flex: 1 }, padded && { padding: 20 }]}>{children}</View>
        )}
        {footer && <View style={s.footer}>{footer}</View>}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

/** Cabecera de pila con título en Outfit. */
export function StackHeader({ title }: { title: string }) {
  const router = useRouter();
  return (
    <Stack.Screen
      options={{
        headerShown: true,
        title,
        headerTitleStyle: { fontFamily: Fonts.bodyMedium, fontSize: 15, color: c.ink },
        headerShadowVisible: false,
        headerStyle: { backgroundColor: c.background },
        headerLeft: () => (
          <Pressable onPress={() => (router.canGoBack() ? router.back() : router.replace("/"))} hitSlop={12} style={s.backBtn}>
            <Ionicons name="chevron-back" size={18} color={c.ink} />
          </Pressable>
        ),
      }}
    />
  );
}

/* ───────── Tipografía ───────── */

export function Eyebrow({ children, color = c.mutedForeground, style }: { children: ReactNode; color?: string; style?: StyleProp<TextStyle> }) {
  return <Text style={[s.eyebrow, { color }, style]}>{children}</Text>;
}
export function Display({ children, size = 40, style }: { children: ReactNode; size?: number; style?: StyleProp<TextStyle> }) {
  return <Text style={[s.display, { fontSize: size, lineHeight: size * 1.05, letterSpacing: -size * 0.035 }, style]}>{children}</Text>;
}
export function H2({ children, style }: { children: ReactNode; style?: StyleProp<TextStyle> }) {
  return <Text style={[s.h2, style]}>{children}</Text>;
}
export function Body({ children, muted, size = 14, style, numberOfLines }: { children: ReactNode; muted?: boolean; size?: number; style?: StyleProp<TextStyle>; numberOfLines?: number }) {
  return (
    <Text numberOfLines={numberOfLines} style={[s.body, { fontSize: size, color: muted ? c.mutedForeground : c.ink }, style]}>
      {children}
    </Text>
  );
}

/* ───────── Superficies ───────── */

export function Card({ children, style, onPress, tone }: { children: ReactNode; style?: StyleProp<ViewStyle>; onPress?: () => void; tone?: "surface" | "navy" | "crimson" }) {
  const bg = tone === "surface" ? c.surface : tone === "navy" ? c.navySoft : tone === "crimson" ? c.crimsonSoft : c.card;
  const border = tone ? "transparent" : c.border;
  if (onPress)
    return (
      <Pressable onPress={onPress} style={({ pressed }) => [s.card, { backgroundColor: bg, borderColor: border, opacity: pressed ? 0.75 : 1 }, style]}>
        {children}
      </Pressable>
    );
  return <View style={[s.card, { backgroundColor: bg, borderColor: border }, style]}>{children}</View>;
}

export function Section({ title, action, children, style }: { title: string; action?: ReactNode; children: ReactNode; style?: StyleProp<ViewStyle> }) {
  return (
    <View style={[{ marginTop: 28 }, style]}>
      <View style={s.sectionHead}>
        <Eyebrow>{title}</Eyebrow>
        {action}
      </View>
      {children}
    </View>
  );
}

export function Row({ children, style, gap = 8 }: { children: ReactNode; style?: StyleProp<ViewStyle>; gap?: number }) {
  return <View style={[{ flexDirection: "row", alignItems: "center", gap }, style]}>{children}</View>;
}

export function Divider() {
  return <View style={{ height: StyleSheet.hairlineWidth, backgroundColor: c.border, marginVertical: 12 }} />;
}

/* ───────── Controles ───────── */

export function Btn({
  children,
  onPress,
  variant = "ink",
  icon,
  loading,
  disabled,
  size = "md",
  style,
}: {
  children: ReactNode;
  onPress?: () => void;
  variant?: "ink" | "outline" | "ghost" | "navy" | "crimson" | "soft";
  icon?: IconName;
  loading?: boolean;
  disabled?: boolean;
  size?: "sm" | "md";
  style?: StyleProp<ViewStyle>;
}) {
  const v = {
    ink: { bg: c.ink, fg: "#fff", bd: c.ink },
    navy: { bg: c.navy, fg: "#fff", bd: c.navy },
    crimson: { bg: c.crimson, fg: "#fff", bd: c.crimson },
    outline: { bg: "#fff", fg: c.ink, bd: c.border },
    ghost: { bg: "transparent", fg: c.ink, bd: "transparent" },
    soft: { bg: c.surface, fg: c.ink, bd: c.surface },
  }[variant];
  const h = size === "sm" ? 36 : 48;
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        s.btn,
        { backgroundColor: v.bg, borderColor: v.bd, height: h, paddingHorizontal: size === "sm" ? 14 : 20, opacity: disabled ? 0.45 : pressed ? 0.8 : 1 },
        style,
      ]}
    >
      {loading ? <ActivityIndicator size="small" color={v.fg} /> : icon ? <Ionicons name={icon} size={size === "sm" ? 15 : 17} color={v.fg} /> : null}
      <Text style={{ color: v.fg, fontFamily: Fonts.bodyMedium, fontSize: size === "sm" ? 12.5 : 14 }}>{children}</Text>
    </Pressable>
  );
}

export function IconBtn({ icon, onPress, tone = "outline" }: { icon: IconName; onPress?: () => void; tone?: "outline" | "ink" }) {
  return (
    <Pressable
      onPress={onPress}
      hitSlop={6}
      style={({ pressed }) => [
        s.iconBtn,
        tone === "ink" ? { backgroundColor: c.ink, borderColor: c.ink } : { backgroundColor: "#fff", borderColor: c.border },
        { opacity: pressed ? 0.7 : 1 },
      ]}
    >
      <Ionicons name={icon} size={18} color={tone === "ink" ? "#fff" : c.ink} />
    </Pressable>
  );
}

export function Field({ label, hint, error, children, style }: { label: string; hint?: string; error?: string | false | null; children: ReactNode; style?: StyleProp<ViewStyle> }) {
  return (
    <View style={[{ marginBottom: 14 }, style]}>
      <Text style={s.label}>{label}</Text>
      {children}
      {error ? <Text style={[s.hint, { color: c.crimson }]}>{error}</Text> : hint ? <Text style={s.hint}>{hint}</Text> : null}
    </View>
  );
}

export function Input({ style, multiline, ...p }: TextInputProps) {
  return (
    <TextInput
      placeholderTextColor="#9AA0AE"
      multiline={multiline}
      {...p}
      style={[s.input, multiline && { minHeight: 84, paddingTop: 12, textAlignVertical: "top", borderRadius: 18 }, style]}
    />
  );
}

export function Chips<T extends string>({ value, options, onChange }: { value: T; options: { value: T; label: string }[]; onChange: (v: T) => void }) {
  return (
    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
      {options.map((o) => {
        const on = o.value === value;
        return (
          <Pressable key={o.value} onPress={() => onChange(o.value)} style={[s.chip, on && { backgroundColor: c.ink, borderColor: c.ink }]}>
            <Text style={{ fontFamily: Fonts.bodyMedium, fontSize: 12.5, color: on ? "#fff" : c.ink }}>{o.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export function Pill({ label, color = c.navy, bg }: { label: string; color?: string; bg?: string }) {
  return (
    <View style={[s.pill, { backgroundColor: bg ?? "#fff", borderColor: bg ? "transparent" : c.border }]}>
      <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: color }} />
      <Text style={{ fontFamily: Fonts.bodyMedium, fontSize: 11, color: c.ink }}>{label}</Text>
    </View>
  );
}

export function StatusPill({ status }: { status: string }) {
  const st = APPT_STATUS[status] ?? { label: status, color: c.mutedForeground };
  return <Pill label={st.label} color={st.color} />;
}

export function Avatar({ first, last, size = 40, tone = "navy" }: { first: string; last: string; size?: number; tone?: "navy" | "ink" }) {
  return (
    <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: tone === "ink" ? c.ink : c.navySoft, alignItems: "center", justifyContent: "center" }}>
      <Text style={{ fontFamily: Fonts.displayMedium, fontSize: size * 0.36, color: tone === "ink" ? "#fff" : c.navy }}>
        {(first[0] ?? "").toUpperCase()}
        {(last[0] ?? "").toUpperCase()}
      </Text>
    </View>
  );
}

export function Loading() {
  return (
    <View style={{ paddingVertical: 48, alignItems: "center" }}>
      <ActivityIndicator color={c.navy} />
    </View>
  );
}

export function Empty({ icon = "leaf-outline", title, text, action }: { icon?: IconName; title: string; text?: string; action?: ReactNode }) {
  return (
    <View style={s.empty}>
      <View style={s.emptyIcon}>
        <Ionicons name={icon} size={20} color={c.navy} />
      </View>
      <Text style={[s.h2, { fontSize: 18, textAlign: "center" }]}>{title}</Text>
      {text && <Body muted size={13} style={{ textAlign: "center", marginTop: 4 }}>{text}</Body>}
      {action && <View style={{ marginTop: 14 }}>{action}</View>}
    </View>
  );
}

export function ErrorBox({ text }: { text: string }) {
  return (
    <View style={s.errorBox}>
      <Ionicons name="alert-circle" size={16} color={c.crimson} />
      <Text style={{ flex: 1, fontFamily: Fonts.body, fontSize: 13, color: c.crimson }}>{text}</Text>
    </View>
  );
}

export { Ionicons };
export type { IconName };

const s = StyleSheet.create({
  footer: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 16, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: c.border, backgroundColor: "#fff" },
  backBtn: { width: 34, height: 34, borderRadius: 17, borderWidth: 1, borderColor: c.border, alignItems: "center", justifyContent: "center", marginLeft: Platform.OS === "web" ? 12 : 0 },
  eyebrow: { fontFamily: Fonts.bodyMedium, fontSize: 10.5, letterSpacing: 1.4, textTransform: "uppercase" },
  display: { fontFamily: Fonts.displayLight, color: c.ink },
  h2: { fontFamily: Fonts.display, fontSize: 22, color: c.ink, letterSpacing: -0.4 },
  body: { fontFamily: Fonts.body, lineHeight: 21 },
  card: { borderRadius: 20, borderWidth: 1, padding: 16 },
  sectionHead: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 10 },
  btn: { borderRadius: 999, borderWidth: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 },
  iconBtn: { width: 40, height: 40, borderRadius: 20, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  label: { fontFamily: Fonts.bodyMedium, fontSize: 12, color: c.ink, marginBottom: 6 },
  hint: { fontFamily: Fonts.body, fontSize: 11.5, color: c.mutedForeground, marginTop: 5 },
  input: { minHeight: 46, borderRadius: 999, backgroundColor: c.surface, paddingHorizontal: 16, fontFamily: Fonts.body, fontSize: 14, color: c.ink },
  chip: { paddingHorizontal: 14, height: 34, borderRadius: 999, borderWidth: 1, borderColor: c.border, alignItems: "center", justifyContent: "center", backgroundColor: "#fff" },
  pill: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 10, height: 24, borderRadius: 999, borderWidth: 1, alignSelf: "flex-start" },
  empty: { alignItems: "center", paddingVertical: 36, paddingHorizontal: 24, borderRadius: 20, borderWidth: 1, borderStyle: "dashed", borderColor: c.border },
  emptyIcon: { width: 44, height: 44, borderRadius: 22, backgroundColor: c.navySoft, alignItems: "center", justifyContent: "center", marginBottom: 12 },
  errorBox: { flexDirection: "row", gap: 8, alignItems: "center", padding: 12, borderRadius: 14, backgroundColor: c.crimsonSoft, marginBottom: 14 },
});
