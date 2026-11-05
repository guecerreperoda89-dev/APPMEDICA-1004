import { useState } from "react";
import { Linking, Pressable, StyleSheet, Text, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import { Avatar, Body, Card, Chips, Display, Empty, ErrorBox, Eyebrow, IconBtn, Ionicons, Loading, Pill, Row, Screen, Section, StackHeader, StatusPill, type IconName } from "../../components/ui";
import { Colors, Fonts } from "../../constants/theme";
import { usePatient } from "../../queries/patients";
import { useEmailCertificate, useEmailPrescription } from "../../queries/clinical";
import { errMsg, pdfUrl } from "../../lib/api";
import { notify } from "../../lib/notify";
import { CERT_TYPES, ageFrom, bmi, fmtDateLong, fmtDateShort, hm } from "../../lib/utils";

const c = Colors.light;
type Tab = "historia" | "documentos" | "citas" | "ficha";

export default function PatientDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const pid = Number(id);
  const router = useRouter();
  const q = usePatient(pid);
  const [tab, setTab] = useState<Tab>("historia");
  const emailRx = useEmailPrescription();
  const emailCert = useEmailCertificate();

  if (q.isLoading) return <Screen><StackHeader title="Paciente" /><Loading /></Screen>;
  if (!q.data) return <Screen><StackHeader title="Paciente" /><ErrorBox text={errMsg(q.error)} /></Screen>;
  const { patient: p, consultations, prescriptions, certificates, appointments } = q.data;
  const age = ageFrom(p.birthDate);

  const sendMail = async (kind: "receta" | "certificado", docId: number) => {
    try {
      const r = kind === "receta" ? await emailRx.mutateAsync({ id: docId }) : await emailCert.mutateAsync({ id: docId });
      if (r.sent) notify("Documento enviado", `Se envió a ${p.email}`);
      else notify("No se envió", r.reason ?? "Servicio de email no configurado");
    } catch (e) {
      notify("Error", errMsg(e));
    }
  };

  const docs = [
    ...prescriptions.map((r) => ({ kind: "receta" as const, id: r.id, code: r.code, date: new Date(r.date), title: "Receta médica", sub: r.items.map((i) => i.genericName).join(", ") })),
    ...certificates.map((r) => ({ kind: "certificado" as const, id: r.id, code: r.code, date: new Date(r.date), title: CERT_TYPES[r.type] ?? "Certificado", sub: r.restDays ? `${r.restDays} días de reposo` : r.institution || "" })),
  ].sort((a, b) => b.date.getTime() - a.date.getTime());

  return (
    <Screen>
      <StackHeader title="Ficha clínica" />
      <Row gap={14} style={{ alignItems: "flex-start" }}>
        <Avatar first={p.firstName} last={p.lastName} size={56} />
        <View style={{ flex: 1 }}>
          <Display size={28}>
            {p.firstName} {p.lastName}
          </Display>
          <Body muted size={12.5}>
            {p.idType === "cedula" ? "CI" : "PAS"} {p.idNumber}
            {age !== null ? ` · ${age} años` : ""} · {p.sex === "F" ? "Femenino" : "Masculino"}
            {p.bloodType ? ` · ${p.bloodType}` : ""}
          </Body>
        </View>
        {p.phone ? <IconBtn icon="call-outline" onPress={() => Linking.openURL(`tel:${p.phone}`)} /> : null}
      </Row>

      {p.allergies ? (
        <Card tone="crimson" style={{ marginTop: 16, flexDirection: "row", gap: 10, alignItems: "center", padding: 12 }}>
          <Ionicons name="warning" size={16} color={c.crimson} />
          <Text style={{ flex: 1, fontFamily: Fonts.bodyMedium, fontSize: 13, color: c.crimson }}>Alergias: {p.allergies}</Text>
        </Card>
      ) : null}

      <Row gap={8} style={{ marginTop: 18 }}>
        <Action icon="pulse" label="Consulta" onPress={() => router.push(`/consultation/${p.id}`)} primary />
        <Action icon="medkit-outline" label="Receta" onPress={() => router.push(`/prescription/${p.id}`)} />
        <Action icon="document-text-outline" label="Certificado" onPress={() => router.push(`/certificate/${p.id}`)} />
        <Action icon="calendar-outline" label="Cita" onPress={() => router.push(`/appointment/new?patientId=${p.id}`)} />
      </Row>

      <View style={{ marginTop: 22 }}>
        <Chips
          value={tab}
          onChange={setTab}
          options={[
            { value: "historia", label: `Historia · ${consultations.length}` },
            { value: "documentos", label: `Docs · ${docs.length}` },
            { value: "citas", label: `Citas · ${appointments.length}` },
            { value: "ficha", label: "Ficha" },
          ]}
        />
      </View>

      {tab === "historia" && (
        <View style={{ marginTop: 16 }}>
          {consultations.length ? (
            consultations.map((cn, i) => {
              const b = bmi(cn.weight, cn.height);
              return (
                <View key={cn.id} style={st.tl}>
                  <View style={st.tlRail}>
                    <View style={[st.tlDot, i === 0 && { backgroundColor: c.crimson }]} />
                    {i < consultations.length - 1 && <View style={st.tlLine} />}
                  </View>
                  <Card style={{ flex: 1, marginBottom: 12 }}>
                    <Eyebrow>{fmtDateLong(new Date(cn.date))}</Eyebrow>
                    <Text style={st.cTitle}>{cn.reason || "Consulta"}</Text>
                    {cn.diagnoses.map((d) => (
                      <Text key={d.code} style={st.dx}>
                        <Text style={{ fontFamily: Fonts.bodySemi, color: c.navy }}>{d.code}</Text> {d.name} · {d.kind === "definitivo" ? "DEF" : "PRE"}
                      </Text>
                    ))}
                    <Row gap={6} style={{ flexWrap: "wrap", marginTop: 8 }}>
                      {cn.bpSys ? <Pill label={`PA ${cn.bpSys}/${cn.bpDia ?? "—"}`} color={cn.bpSys >= 140 ? c.crimson : c.navy} /> : null}
                      {cn.heartRate ? <Pill label={`FC ${cn.heartRate}`} /> : null}
                      {cn.spo2 ? <Pill label={`SpO₂ ${cn.spo2}%`} color={cn.spo2 < 92 ? c.crimson : c.navy} /> : null}
                      {b ? <Pill label={`IMC ${b}`} color={b >= 30 || b < 18.5 ? c.warning : c.success} /> : null}
                    </Row>
                    {cn.plan ? <Body muted size={12.5} style={{ marginTop: 8 }} numberOfLines={3}>Plan: {cn.plan}</Body> : null}
                  </Card>
                </View>
              );
            })
          ) : (
            <Empty icon="pulse-outline" title="Sin consultas" text="Registra la primera atención (formulario MSP 002)." />
          )}
        </View>
      )}

      {tab === "documentos" && (
        <View style={{ marginTop: 16 }}>
          {docs.length ? (
            docs.map((d) => (
              <Card key={d.code} style={{ marginBottom: 10 }}>
                <Row style={{ justifyContent: "space-between" }}>
                  <Eyebrow color={d.kind === "receta" ? c.navy : c.crimson}>{d.kind === "receta" ? "Receta" : "Certificado"} · {d.code}</Eyebrow>
                  <Text style={st.meta}>{fmtDateShort(d.date)}</Text>
                </Row>
                <Text style={st.cTitle}>{d.title}</Text>
                {d.sub ? <Body muted size={12.5} numberOfLines={2}>{d.sub}</Body> : null}
                <Row style={{ marginTop: 10 }}>
                  <DocBtn icon="document-outline" label="Ver PDF" onPress={() => WebBrowser.openBrowserAsync(pdfUrl(d.kind, d.code))} />
                  <DocBtn icon="mail-outline" label="Enviar" disabled={!p.email} onPress={() => sendMail(d.kind, d.id)} />
                </Row>
              </Card>
            ))
          ) : (
            <Empty icon="document-text-outline" title="Sin documentos" text="Emite una receta o un certificado." />
          )}
        </View>
      )}

      {tab === "citas" && (
        <View style={{ marginTop: 16 }}>
          {appointments.length ? (
            appointments.map((a) => (
              <Pressable key={a.id} onPress={() => router.push(`/appointment/${a.id}`)} style={st.apptRow}>
                <View style={{ flex: 1 }}>
                  <Text style={st.cTitle}>
                    {fmtDateShort(new Date(a.startsAt))} · {hm(new Date(a.startsAt))}
                  </Text>
                  <Body muted size={12.5}>{a.reason || "Consulta"}</Body>
                </View>
                <StatusPill status={a.status} />
              </Pressable>
            ))
          ) : (
            <Empty icon="calendar-outline" title="Sin citas" />
          )}
        </View>
      )}

      {tab === "ficha" && (
        <Section title="Datos del paciente" style={{ marginTop: 16 }}>
          <Card>
            {(
              [
                ["Teléfono", p.phone],
                ["Email", p.email],
                ["Nacimiento", p.birthDate ? fmtDateShort(p.birthDate) : ""],
                ["Ciudad", p.city],
                ["Seguro", p.insurance],
                ["Ocupación", p.occupation],
                ["Contacto emergencia", [p.emergencyContact, p.emergencyPhone].filter(Boolean).join(" · ")],
                ["Ant. personales", p.personalHistory],
                ["Ant. quirúrgicos", p.surgicalHistory],
                ["Ant. familiares", p.familyHistory],
                ["Hábitos", p.habits],
                ["Medicación", p.currentMedications],
              ] as const
            ).map(([k, v]) => (
              <View key={k} style={st.kv}>
                <Text style={st.meta}>{k}</Text>
                <Text style={st.kvV}>{v || "—"}</Text>
              </View>
            ))}
          </Card>
        </Section>
      )}
    </Screen>
  );
}

function Action({ icon, label, onPress, primary }: { icon: IconName; label: string; onPress: () => void; primary?: boolean }) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [st.action, primary && { backgroundColor: c.ink, borderColor: c.ink }, { opacity: pressed ? 0.75 : 1 }]}>
      <Ionicons name={icon} size={19} color={primary ? "#fff" : c.ink} />
      <Text style={[st.actionTxt, primary && { color: "#fff" }]}>{label}</Text>
    </Pressable>
  );
}

function DocBtn({ icon, label, onPress, disabled }: { icon: IconName; label: string; onPress: () => void; disabled?: boolean }) {
  return (
    <Pressable onPress={onPress} disabled={disabled} style={[st.docBtn, disabled && { opacity: 0.4 }]}>
      <Ionicons name={icon} size={14} color={c.ink} />
      <Text style={{ fontFamily: Fonts.bodyMedium, fontSize: 12, color: c.ink }}>{label}</Text>
    </Pressable>
  );
}

const st = StyleSheet.create({
  action: { flex: 1, alignItems: "center", gap: 6, paddingVertical: 14, borderRadius: 20, borderWidth: 1, borderColor: c.border, backgroundColor: "#fff" },
  actionTxt: { fontFamily: Fonts.bodyMedium, fontSize: 11.5, color: c.ink },
  tl: { flexDirection: "row", gap: 12 },
  tlRail: { width: 12, alignItems: "center", paddingTop: 20 },
  tlDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: c.navy },
  tlLine: { flex: 1, width: 1, backgroundColor: c.border, marginTop: 4 },
  cTitle: { fontFamily: Fonts.bodyMedium, fontSize: 14.5, color: c.ink, marginTop: 4 },
  dx: { fontFamily: Fonts.body, fontSize: 12.5, color: c.ink, marginTop: 3 },
  meta: { fontFamily: Fonts.body, fontSize: 11.5, color: c.mutedForeground },
  docBtn: { flexDirection: "row", alignItems: "center", gap: 6, height: 32, paddingHorizontal: 12, borderRadius: 999, backgroundColor: c.surface },
  apptRow: { flexDirection: "row", alignItems: "center", paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: c.border },
  kv: { paddingVertical: 8, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: c.border },
  kvV: { fontFamily: Fonts.body, fontSize: 13.5, color: c.ink, marginTop: 1 },
});
