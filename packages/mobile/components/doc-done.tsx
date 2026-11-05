import { Share, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import { Colors, Fonts } from "../constants/theme";
import { useEmailCertificate, useEmailPrescription } from "../queries/clinical";
import { errMsg, pdfUrl } from "../lib/api";
import { notify } from "../lib/notify";
import { Body, Btn, Display, Eyebrow, Ionicons, Screen, StackHeader } from "./ui";

const c = Colors.light;

/** Pantalla final tras emitir receta / certificado: ver PDF, compartir, enviar por email. */
export function DocDone({ kind, id, code, patientId, email }: { kind: "receta" | "certificado"; id: number; code: string; patientId: number; email: string }) {
  const router = useRouter();
  const rx = useEmailPrescription();
  const cert = useEmailCertificate();
  const url = pdfUrl(kind, code);
  const busy = rx.isPending || cert.isPending;

  const send = async () => {
    try {
      const r = kind === "receta" ? await rx.mutateAsync({ id }) : await cert.mutateAsync({ id });
      if (r.sent) notify("Enviado", `Documento enviado a ${email}`);
      else notify("No se envió", r.reason ?? "Servicio de email no configurado");
    } catch (e) {
      notify("Error", errMsg(e));
    }
  };

  return (
    <Screen>
      <StackHeader title={kind === "receta" ? "Receta emitida" : "Certificado emitido"} />
      <View style={st.badge}>
        <Ionicons name="checkmark" size={28} color="#fff" />
      </View>
      <Eyebrow style={{ marginTop: 24 }}>{kind === "receta" ? "Receta médica" : "Certificado médico"}</Eyebrow>
      <Display size={40} style={{ marginTop: 6 }}>Documento{"\n"}listo.</Display>
      <View style={st.code}>
        <Text style={st.codeLbl}>Código de verificación</Text>
        <Text style={st.codeVal}>{code}</Text>
        <Body muted size={12}>El PDF incluye firma, sello y un QR que valida su autenticidad.</Body>
      </View>
      <View style={{ gap: 10, marginTop: 24 }}>
        <Btn icon="document-outline" onPress={() => WebBrowser.openBrowserAsync(url)}>
          Ver / descargar PDF
        </Btn>
        <Btn variant="outline" icon="share-outline" onPress={() => Share.share({ message: `${kind === "receta" ? "Receta" : "Certificado"} ${code}: ${url}`, url })}>
          Compartir enlace
        </Btn>
        <Btn variant="outline" icon="mail-outline" loading={busy} disabled={!email} onPress={send}>
          {email ? `Enviar a ${email}` : "Paciente sin email"}
        </Btn>
        <Btn variant="ghost" onPress={() => router.replace(`/patient/${patientId}`)}>
          Volver a la ficha
        </Btn>
      </View>
    </Screen>
  );
}

const st = StyleSheet.create({
  badge: { width: 60, height: 60, borderRadius: 30, backgroundColor: c.navy, alignItems: "center", justifyContent: "center", marginTop: 12, borderBottomWidth: 4, borderBottomColor: c.crimson },
  code: { marginTop: 24, padding: 18, borderRadius: 20, backgroundColor: c.surface, gap: 4 },
  codeLbl: { fontFamily: Fonts.bodyMedium, fontSize: 11, color: c.mutedForeground, letterSpacing: 1, textTransform: "uppercase" },
  codeVal: { fontFamily: Fonts.display, fontSize: 30, color: c.ink, letterSpacing: 1 },
});
