import { useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { Body, Btn, Display, ErrorBox, Eyebrow, Field, Input, Screen } from "../components/ui";
import { Colors, Fonts } from "../constants/theme";
import { authClient } from "../lib/auth";

const c = Colors.light;

export default function SignIn() {
  const router = useRouter();
  const [mode, setMode] = useState<"in" | "up">("in");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState<"email" | "google" | null>(null);
  const [error, setError] = useState("");

  const submit = async () => {
    setError("");
    if (!email.trim() || password.length < 8) return setError("Ingresa tu correo y una contraseña de al menos 8 caracteres.");
    if (mode === "up" && !name.trim()) return setError("Ingresa tu nombre completo.");
    setBusy("email");
    const res =
      mode === "in"
        ? await authClient.signIn.email({ email: email.trim().toLowerCase(), password })
        : await authClient.signUp.email({ email: email.trim().toLowerCase(), password, name: name.trim() });
    setBusy(null);
    if (res.error) return setError(res.error.message ?? "No se pudo iniciar sesión");
    router.replace("/");
  };

  const google = async () => {
    setError("");
    setBusy("google");
    const r = await authClient.managedAuth.signIn({ provider: "google" });
    setBusy(null);
    if (r.error && r.error.code !== "AUTH_SESSION_DISMISSED") setError(r.error.message);
  };

  return (
    <Screen tab>
      <View style={st.hero}>
        <View style={[st.blob, { backgroundColor: "#C9D6F5", top: -40, left: -30 }]} />
        <View style={[st.blob, { backgroundColor: "#F7E3E8", top: 30, right: -50, width: 180, height: 180 }]} />
        <View style={[st.blob, { backgroundColor: "#E8EEFF", bottom: -60, left: 80 }]} />
        <View style={st.logoRow}>
          <View style={st.logoMark}>
            <Text style={{ color: "#fff", fontFamily: Fonts.displayMedium, fontSize: 15 }}>S</Text>
          </View>
          <View>
            <Text style={{ fontFamily: Fonts.bodySemi, fontSize: 13, letterSpacing: 2, color: c.navy }}>SINCRONIA</Text>
            <Text style={{ fontFamily: Fonts.body, fontSize: 10.5, color: c.mutedForeground }}>Cardiología Integral</Text>
          </View>
        </View>
        <Eyebrow style={{ marginTop: 56 }}>Acceso médico</Eyebrow>
        <Display size={48} style={{ marginTop: 8 }}>
          {mode === "in" ? "Tu consulta,\nen sincronía." : "Crea tu\ncuenta médica."}
        </Display>
      </View>

      <View style={{ marginTop: 28 }}>
        {error ? <ErrorBox text={error} /> : null}
        {mode === "up" && (
          <Field label="Nombre completo">
            <Input value={name} onChangeText={setName} placeholder="Dra. Ana Pérez" autoCapitalize="words" />
          </Field>
        )}
        <Field label="Correo electrónico">
          <Input value={email} onChangeText={setEmail} placeholder="medico@sincronia.ec" autoCapitalize="none" keyboardType="email-address" autoComplete="email" />
        </Field>
        <Field label="Contraseña">
          <Input value={password} onChangeText={setPassword} placeholder="Mínimo 8 caracteres" secureTextEntry autoComplete="password" onSubmitEditing={submit} />
        </Field>
        <Btn onPress={submit} loading={busy === "email"} icon="arrow-forward" style={{ marginTop: 4 }}>
          {mode === "in" ? "Ingresar" : "Crear cuenta"}
        </Btn>
        <View style={st.or}>
          <View style={st.line} />
          <Body muted size={12}>o</Body>
          <View style={st.line} />
        </View>
        <Btn variant="outline" icon="logo-google" onPress={google} loading={busy === "google"}>
          Continuar con Google
        </Btn>
        <Btn variant="ghost" size="sm" style={{ marginTop: 16 }} onPress={() => setMode(mode === "in" ? "up" : "in")}>
          {mode === "in" ? "¿Nuevo en SINCRONIA? Crear cuenta" : "Ya tengo cuenta · Ingresar"}
        </Btn>
      </View>
    </Screen>
  );
}

const st = StyleSheet.create({
  hero: { borderRadius: 28, overflow: "hidden", padding: 22, paddingBottom: 28, backgroundColor: "#F6F8FD", marginTop: 8 },
  blob: { position: "absolute", width: 220, height: 220, borderRadius: 110, opacity: 0.85 },
  logoRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  logoMark: { width: 34, height: 34, borderRadius: 17, backgroundColor: c.navy, alignItems: "center", justifyContent: "center", borderBottomWidth: 3, borderBottomColor: c.crimson },
  or: { flexDirection: "row", alignItems: "center", gap: 10, marginVertical: 16 },
  line: { flex: 1, height: StyleSheet.hairlineWidth, backgroundColor: c.border },
});
