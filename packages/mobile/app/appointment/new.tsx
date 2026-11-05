import { useEffect, useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Switch, Text, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Avatar, Body, Btn, Card, ErrorBox, Field, Input, Ionicons, Loading, Row, Screen, Section, StackHeader } from "../../components/ui";
import { Colors, Fonts } from "../../constants/theme";
import { useCreateAppointment, useSlots } from "../../queries/appointments";
import { usePatient, usePatients } from "../../queries/patients";
import { useProfile } from "../../queries/profile";
import { errMsg } from "../../lib/api";
import { notify } from "../../lib/notify";
import { addDaysYmd, ecDate, ymd } from "../../lib/utils";

const c = Colors.light;
const fmt = (d: string, o: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat("es-EC", { timeZone: "America/Guayaquil", ...o }).format(ecDate(d, "12:00"));

export default function NewAppointment() {
  const params = useLocalSearchParams<{ date?: string; patientId?: string }>();
  const router = useRouter();
  const today = ymd(new Date());
  const [patientId, setPatientId] = useState(Number(params.patientId) || 0);
  const [date, setDate] = useState(params.date && params.date >= today ? params.date : today);
  const [time, setTime] = useState("");
  const [manual, setManual] = useState("");
  const [reason, setReason] = useState("");
  const [notifyPatient, setNotifyPatient] = useState(true);
  const [q, setQ] = useState("");
  const [dq, setDq] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    const t = setTimeout(() => setDq(q.trim()), 250);
    return () => clearTimeout(t);
  }, [q]);
  useEffect(() => setTime(""), [date]);

  const prof = useProfile();
  const patient = usePatient(patientId);
  const search = usePatients(dq);
  const slots = useSlots(date);
  const create = useCreateAppointment();
  const days = useMemo(() => Array.from({ length: 28 }, (_, i) => addDaysYmd(today, i)), [today]);
  const chosenTime = manual || time;

  const save = async () => {
    setError("");
    if (!patientId) return setError("Selecciona un paciente.");
    if (!/^\d{2}:\d{2}$/.test(chosenTime)) return setError("Elige un horario o escribe la hora (HH:MM).");
    try {
      const r = await create.mutateAsync({ patientId, date, time: chosenTime, reason: reason.trim(), notify: notifyPatient, price: prof.data?.consultationFee });
      if (notifyPatient && r.email && !r.email.sent) notify("Cita agendada", `No se envió la confirmación: ${r.email.reason ?? "email no configurado"}`);
      router.replace(`/appointment/${r.appointment.id}`);
    } catch (e) {
      setError(errMsg(e));
    }
  };

  return (
    <Screen footer={<Btn onPress={save} loading={create.isPending} icon="checkmark" disabled={!patientId || !chosenTime}>Agendar {chosenTime ? `· ${fmt(date, { weekday: "short", day: "numeric" })} ${chosenTime}` : ""}</Btn>}>
      <StackHeader title="Nueva cita" />
      {error ? <ErrorBox text={error} /> : null}

      <Section title="Paciente" style={{ marginTop: 0 }}>
        {patientId && patient.data ? (
          <Card tone="navy">
            <Row gap={12}>
              <Avatar first={patient.data.patient.firstName} last={patient.data.patient.lastName} size={38} tone="ink" />
              <View style={{ flex: 1 }}>
                <Text style={st.name}>
                  {patient.data.patient.firstName} {patient.data.patient.lastName}
                </Text>
                <Body muted size={12}>CI {patient.data.patient.idNumber}</Body>
              </View>
              {!params.patientId && (
                <Pressable onPress={() => setPatientId(0)} hitSlop={8}>
                  <Text style={st.link}>Cambiar</Text>
                </Pressable>
              )}
            </Row>
          </Card>
        ) : patientId ? (
          <Loading />
        ) : (
          <>
            <Input value={q} onChangeText={setQ} placeholder="Buscar por nombre o cédula" autoCorrect={false} />
            <View style={{ marginTop: 6 }}>
              {(search.data ?? []).slice(0, 6).map((p) => (
                <Pressable key={p.id} onPress={() => setPatientId(p.id)} style={st.pRow}>
                  <Avatar first={p.firstName} last={p.lastName} size={32} />
                  <Text style={[st.name, { flex: 1, fontSize: 13.5 }]}>
                    {p.lastName} {p.firstName}
                  </Text>
                  <Text style={st.meta}>{p.idNumber}</Text>
                </Pressable>
              ))}
              <Pressable onPress={() => router.push("/patient/new")} style={st.pRow}>
                <Ionicons name="person-add-outline" size={16} color={c.navy} />
                <Text style={st.link}>Registrar nuevo paciente</Text>
              </Pressable>
            </View>
          </>
        )}
      </Section>

      <Section title="Fecha">
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
          {days.map((d) => {
            const on = d === date;
            return (
              <Pressable key={d} onPress={() => setDate(d)} style={[st.day, on && { backgroundColor: c.ink, borderColor: c.ink }]}>
                <Text style={[st.dow, on && { color: "#C9D0E0" }]}>{fmt(d, { weekday: "short" })}</Text>
                <Text style={[st.dnum, on && { color: "#fff" }]}>{Number(d.slice(8))}</Text>
                <Text style={[st.dow, on && { color: "#C9D0E0" }]}>{fmt(d, { month: "short" })}</Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </Section>

      <Section title="Horario disponible">
        {slots.isLoading ? (
          <Loading />
        ) : slots.data?.length ? (
          <View style={st.slots}>
            {slots.data.map((t) => {
              const on = !manual && t === time;
              return (
                <Pressable key={t} onPress={() => { setManual(""); setTime(t); }} style={[st.slot, on && { backgroundColor: c.navy, borderColor: c.navy }]}>
                  <Text style={[st.slotTxt, on && { color: "#fff" }]}>{t}</Text>
                </Pressable>
              );
            })}
          </View>
        ) : (
          <Body muted size={13}>Sin horarios libres según tu horario de atención. Puedes escribir una hora manual.</Body>
        )}
        <Field label="Hora manual (sobrecupo)" style={{ marginTop: 12 }}>
          <Input value={manual} onChangeText={setManual} placeholder="HH:MM" maxLength={5} keyboardType="numbers-and-punctuation" />
        </Field>
      </Section>

      <Field label="Motivo de consulta" style={{ marginTop: 8 }}>
        <Input value={reason} onChangeText={setReason} placeholder="Control, dolor torácico, chequeo…" />
      </Field>
      <Row style={{ justifyContent: "space-between" }}>
        <Body size={13}>Enviar confirmación por email</Body>
        <Switch value={notifyPatient} onValueChange={setNotifyPatient} trackColor={{ true: c.navy, false: c.border }} thumbColor="#fff" />
      </Row>
    </Screen>
  );
}

const st = StyleSheet.create({
  name: { fontFamily: Fonts.bodyMedium, fontSize: 14.5, color: c.ink },
  meta: { fontFamily: Fonts.body, fontSize: 11.5, color: c.mutedForeground },
  link: { fontFamily: Fonts.bodyMedium, fontSize: 13, color: c.navy },
  pRow: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: c.border },
  day: { width: 56, paddingVertical: 10, alignItems: "center", borderRadius: 18, borderWidth: 1, borderColor: c.border },
  dow: { fontFamily: Fonts.body, fontSize: 10.5, color: c.mutedForeground, textTransform: "capitalize" },
  dnum: { fontFamily: Fonts.display, fontSize: 22, color: c.ink },
  slots: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  slot: { width: "23%", height: 40, borderRadius: 999, borderWidth: 1, borderColor: c.border, alignItems: "center", justifyContent: "center" },
  slotTxt: { fontFamily: Fonts.bodyMedium, fontSize: 13, color: c.ink },
});
