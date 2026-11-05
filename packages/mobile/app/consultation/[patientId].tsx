import { useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { DiagnosisPicker, type Diagnosis } from "../../components/diagnosis-picker";
import { Body, Btn, Card, ErrorBox, Eyebrow, Field, Input, Row, Screen, Section, StackHeader } from "../../components/ui";
import { Colors, Fonts } from "../../constants/theme";
import { usePatient } from "../../queries/patients";
import { useCreateConsultation } from "../../queries/clinical";
import { errMsg } from "../../lib/api";
import { notify } from "../../lib/notify";
import { ageFrom, bmi } from "../../lib/utils";

const c = Colors.light;
const VITALS = [
  ["bpSys", "PA sist.", "mmHg"],
  ["bpDia", "PA diast.", "mmHg"],
  ["heartRate", "FC", "lpm"],
  ["respRate", "FR", "rpm"],
  ["temperature", "T°", "°C"],
  ["spo2", "SpO₂", "%"],
  ["weight", "Peso", "kg"],
  ["height", "Talla", "cm"],
  ["glucose", "Glucosa", "mg/dL"],
] as const;
type VKey = (typeof VITALS)[number][0];

function warnings(v: Partial<Record<VKey, number>>) {
  const w: string[] = [];
  if (v.bpSys && v.bpSys >= 140) w.push("PA sistólica elevada");
  if (v.bpDia && v.bpDia >= 90) w.push("PA diastólica elevada");
  if (v.heartRate && (v.heartRate > 100 || v.heartRate < 50)) w.push(v.heartRate > 100 ? "Taquicardia" : "Bradicardia");
  if (v.spo2 && v.spo2 < 92) w.push("Desaturación");
  if (v.temperature && v.temperature >= 38) w.push("Fiebre");
  if (v.glucose && v.glucose >= 200) w.push("Hiperglucemia");
  return w;
}

export default function Consultation() {
  const { patientId, appointmentId } = useLocalSearchParams<{ patientId: string; appointmentId?: string }>();
  const pid = Number(patientId);
  const router = useRouter();
  const patient = usePatient(pid);
  const create = useCreateConsultation();
  const [t, setT] = useState({ reason: "", currentIllness: "", systemsReview: "", physicalExam: "", plan: "", exams: "" });
  const [v, setV] = useState<Record<VKey, string>>(Object.fromEntries(VITALS.map(([k]) => [k, ""])) as Record<VKey, string>);
  const [dx, setDx] = useState<Diagnosis[]>([]);
  const [error, setError] = useState("");
  const setTxt = (k: keyof typeof t) => (x: string) => setT((o) => ({ ...o, [k]: x }));

  const nums = Object.fromEntries(VITALS.map(([k]) => [k, v[k] ? Number(v[k].replace(",", ".")) : null])) as Record<VKey, number | null>;
  const b = bmi(nums.weight, nums.height);
  const warn = warnings(Object.fromEntries(Object.entries(nums).filter(([, x]) => x !== null)) as Partial<Record<VKey, number>>);
  const p = patient.data?.patient;

  const save = async (next?: "receta" | "certificado") => {
    setError("");
    if (!t.reason.trim()) return setError("Indica el motivo de consulta.");
    if (Object.values(nums).some((x) => x !== null && Number.isNaN(x))) return setError("Revisa los signos vitales: solo números.");
    try {
      const cn = await create.mutateAsync({ patientId: pid, appointmentId: appointmentId ? Number(appointmentId) : null, ...t, ...nums, diagnoses: dx });
      if (next) router.replace(`/${next === "receta" ? "prescription" : "certificate"}/${pid}?consultationId=${cn.id}`);
      else {
        notify("Consulta guardada", "Se registró en la historia clínica.");
        router.replace(`/patient/${pid}`);
      }
    } catch (e) {
      setError(errMsg(e));
    }
  };

  return (
    <Screen
      footer={
        <Row>
          <Btn style={{ flex: 1 }} onPress={() => save()} loading={create.isPending} icon="checkmark">
            Guardar
          </Btn>
          <Btn variant="outline" onPress={() => save("receta")} disabled={create.isPending} icon="medkit-outline">
            + Receta
          </Btn>
        </Row>
      }
    >
      <StackHeader title="Consulta · MSP 002" />
      {p && (
        <Card tone="navy" style={{ marginBottom: 16 }}>
          <Text style={st.pName}>
            {p.firstName} {p.lastName}
          </Text>
          <Body muted size={12}>
            CI {p.idNumber}
            {ageFrom(p.birthDate) !== null ? ` · ${ageFrom(p.birthDate)} años` : ""} · {p.sex}
          </Body>
          {p.allergies ? <Text style={st.allergy}>⚠ Alergias: {p.allergies}</Text> : null}
        </Card>
      )}
      {error ? <ErrorBox text={error} /> : null}

      <Field label="Motivo de consulta *">
        <Input value={t.reason} onChangeText={setTxt("reason")} placeholder="Ej. dolor torácico de 2 días" />
      </Field>
      <Field label="Enfermedad actual">
        <Input value={t.currentIllness} onChangeText={setTxt("currentIllness")} multiline placeholder="Cronología, localización, características…" />
      </Field>
      <Field label="Revisión de órganos y sistemas">
        <Input value={t.systemsReview} onChangeText={setTxt("systemsReview")} multiline />
      </Field>

      <Section title="Signos vitales y antropometría" style={{ marginTop: 12 }}>
        <View style={st.grid}>
          {VITALS.map(([k, label, unit]) => (
            <View key={k} style={st.vCell}>
              <Text style={st.vLabel}>
                {label} <Text style={{ color: c.mutedForeground }}>{unit}</Text>
              </Text>
              <Input value={v[k]} onChangeText={(x) => setV((o) => ({ ...o, [k]: x }))} keyboardType="decimal-pad" style={{ minHeight: 42, textAlign: "center" }} />
            </View>
          ))}
        </View>
        <Row gap={10} style={{ marginTop: 4, flexWrap: "wrap" }}>
          <Card tone="surface" style={{ paddingVertical: 10, paddingHorizontal: 14 }}>
            <Eyebrow style={{ fontSize: 9 }}>IMC</Eyebrow>
            <Text style={[st.bmi, b !== null && (b >= 30 || b < 18.5) && { color: c.warning }]}>{b ?? "—"}</Text>
          </Card>
          {warn.map((w) => (
            <View key={w} style={st.warn}>
              <Text style={st.warnTxt}>⚠ {w}</Text>
            </View>
          ))}
        </Row>
      </Section>

      <Field label="Examen físico" style={{ marginTop: 20 }}>
        <Input value={t.physicalExam} onChangeText={setTxt("physicalExam")} multiline />
      </Field>

      <Section title="Diagnóstico CIE-10" style={{ marginTop: 8 }}>
        <DiagnosisPicker value={dx} onChange={setDx} />
      </Section>

      <Field label="Plan de tratamiento" style={{ marginTop: 20 }}>
        <Input value={t.plan} onChangeText={setTxt("plan")} multiline />
      </Field>
      <Field label="Exámenes solicitados">
        <Input value={t.exams} onChangeText={setTxt("exams")} multiline placeholder="ECG, perfil lipídico…" />
      </Field>
    </Screen>
  );
}

const st = StyleSheet.create({
  pName: { fontFamily: Fonts.bodyMedium, fontSize: 15, color: c.ink },
  allergy: { fontFamily: Fonts.bodyMedium, fontSize: 12.5, color: c.crimson, marginTop: 6 },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  vCell: { width: "31.5%", marginBottom: 6 },
  vLabel: { fontFamily: Fonts.bodyMedium, fontSize: 11, color: c.ink, marginBottom: 4 },
  bmi: { fontFamily: Fonts.display, fontSize: 22, color: c.ink },
  warn: { paddingHorizontal: 10, height: 28, borderRadius: 999, backgroundColor: c.crimsonSoft, justifyContent: "center" },
  warnTxt: { fontFamily: Fonts.bodyMedium, fontSize: 11.5, color: c.crimson },
});
