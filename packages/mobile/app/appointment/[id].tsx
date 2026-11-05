import { useState } from "react";
import { Linking, StyleSheet, Text, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Avatar, Body, Btn, Card, Chips, Display, ErrorBox, Eyebrow, Field, Input, Ionicons, Loading, Row, Screen, Section, StackHeader, StatusPill } from "../../components/ui";
import { Colors, Fonts } from "../../constants/theme";
import { useAppointment, useCreatePayment, useRemind, useUpdateAppointment } from "../../queries/appointments";
import { errMsg } from "../../lib/api";
import { confirm, notify } from "../../lib/notify";
import { PAY_METHODS, fmtDateLong, fmtMoney, hm } from "../../lib/utils";

const c = Colors.light;
type Method = "efectivo" | "transferencia" | "tarjeta" | "seguro";

export default function AppointmentDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const q = useAppointment(Number(id));
  const update = useUpdateAppointment();
  const remind = useRemind();
  const pay = useCreatePayment();
  const [payOpen, setPayOpen] = useState(false);
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState<Method>("efectivo");

  if (q.isLoading) return <Screen><StackHeader title="Cita" /><Loading /></Screen>;
  if (!q.data) return <Screen><StackHeader title="Cita" /><ErrorBox text={errMsg(q.error)} /></Screen>;
  const a = q.data;
  const start = new Date(a.startsAt);
  const closed = a.status === "cancelada" || a.status === "atendida";

  const setStatus = async (status: "confirmada" | "no_asistio" | "cancelada" | "agendada") => {
    try {
      await update.mutateAsync({ id: a.id, status });
      await q.refetch();
    } catch (e) {
      notify("Error", errMsg(e));
    }
  };
  const sendReminder = async () => {
    try {
      const r = await remind.mutateAsync({ id: a.id });
      if (r.sent) notify("Recordatorio enviado", `Se envió a ${a.patient.email}`);
      else notify("No se envió", r.reason ?? "Servicio de email no configurado");
    } catch (e) {
      notify("Error", errMsg(e));
    }
  };
  const savePay = async () => {
    const n = Number(amount || a.price || 0);
    if (!(n >= 0)) return notify("Monto no válido");
    try {
      await pay.mutateAsync({ patientId: a.patient.id, appointmentId: a.id, amount: n, method, status: "pagado", concept: a.reason || "Consulta médica" });
      setPayOpen(false);
      await q.refetch();
      notify("Pago registrado", `${fmtMoney(n)} · ${PAY_METHODS[method]}`);
    } catch (e) {
      notify("Error", errMsg(e));
    }
  };

  return (
    <Screen>
      <StackHeader title="Cita" />
      <Eyebrow>{fmtDateLong(start)}</Eyebrow>
      <Display size={56} style={{ color: c.navy, marginTop: 2 }}>
        {hm(start)}
        <Text style={{ fontSize: 22, color: c.mutedForeground }}> – {hm(new Date(a.endsAt))}</Text>
      </Display>
      <Row style={{ marginTop: 8 }}>
        <StatusPill status={a.status} />
        {a.source === "online" && <Body muted size={12}>Reserva online</Body>}
      </Row>

      <Card style={{ marginTop: 20 }} onPress={() => router.push(`/patient/${a.patient.id}`)}>
        <Row gap={12}>
          <Avatar first={a.patient.firstName} last={a.patient.lastName} />
          <View style={{ flex: 1 }}>
            <Text style={st.name}>
              {a.patient.firstName} {a.patient.lastName}
            </Text>
            <Body muted size={12}>CI {a.patient.idNumber}{a.patient.phone ? ` · ${a.patient.phone}` : ""}</Body>
          </View>
          <Ionicons name="chevron-forward" size={16} color="#B7BCC8" />
        </Row>
        {a.patient.allergies ? <Text style={st.allergy}>⚠ Alergias: {a.patient.allergies}</Text> : null}
      </Card>

      {(a.reason || a.notes) && (
        <Section title="Motivo">
          <Body>{a.reason || "—"}</Body>
          {a.notes ? <Body muted size={12.5} style={{ marginTop: 4 }}>Nota: {a.notes}</Body> : null}
        </Section>
      )}

      {!closed && (
        <Btn icon="pulse" style={{ marginTop: 24 }} onPress={() => router.push(`/consultation/${a.patient.id}?appointmentId=${a.id}`)}>
          Iniciar consulta
        </Btn>
      )}

      <Section title="Estado">
        <Row gap={8} style={{ flexWrap: "wrap" }}>
          {a.status !== "confirmada" && !closed && <Btn size="sm" variant="outline" icon="checkmark-circle-outline" loading={update.isPending} onPress={() => setStatus("confirmada")}>Confirmar</Btn>}
          {!closed && <Btn size="sm" variant="outline" icon="person-remove-outline" onPress={() => setStatus("no_asistio")}>No asistió</Btn>}
          {!closed && <Btn size="sm" variant="outline" icon="close-circle-outline" onPress={() => confirm("Cancelar cita", "La cita quedará cancelada.", () => void setStatus("cancelada"), "Cancelar cita")}>Cancelar</Btn>}
          {(a.status === "cancelada" || a.status === "no_asistio") && <Btn size="sm" variant="outline" icon="refresh" onPress={() => setStatus("agendada")}>Reactivar</Btn>}
        </Row>
        {a.status === "atendida" && <Body muted size={12}>Cita atendida. La consulta quedó registrada en la historia clínica.</Body>}
      </Section>

      <Section title="Comunicación">
        <Row gap={8} style={{ flexWrap: "wrap" }}>
          <Btn size="sm" variant="soft" icon="mail-outline" loading={remind.isPending} disabled={!a.patient.email} onPress={sendReminder}>
            {a.reminderSentAt ? "Reenviar recordatorio" : "Enviar recordatorio"}
          </Btn>
          {a.patient.phone ? (
            <Btn size="sm" variant="soft" icon="logo-whatsapp" onPress={() => Linking.openURL(`https://wa.me/${a.patient.phone.replace(/\D/g, "").replace(/^0/, "593")}`)}>
              WhatsApp
            </Btn>
          ) : null}
        </Row>
        {!a.patient.email && <Body muted size={12} style={{ marginTop: 6 }}>El paciente no tiene email registrado.</Body>}
      </Section>

      <Section title="Caja">
        {a.payment ? (
          <Card tone="surface">
            <Row style={{ justifyContent: "space-between" }}>
              <Text style={st.name}>{fmtMoney(a.payment.amount)}</Text>
              <Body muted size={12}>{PAY_METHODS[a.payment.method]} · {a.payment.status}</Body>
            </Row>
          </Card>
        ) : payOpen ? (
          <Card>
            <Field label="Monto (USD)">
              <Input value={amount} onChangeText={setAmount} placeholder={String(a.price ?? 0)} keyboardType="decimal-pad" />
            </Field>
            <Field label="Método">
              <Chips value={method} onChange={setMethod} options={Object.entries(PAY_METHODS).map(([value, label]) => ({ value: value as Method, label }))} />
            </Field>
            <Row>
              <Btn size="sm" onPress={savePay} loading={pay.isPending} icon="checkmark">Registrar</Btn>
              <Btn size="sm" variant="ghost" onPress={() => setPayOpen(false)}>Cancelar</Btn>
            </Row>
          </Card>
        ) : (
          <Btn size="sm" variant="outline" icon="cash-outline" style={{ alignSelf: "flex-start" }} onPress={() => setPayOpen(true)}>
            Registrar pago {a.price ? `· ${fmtMoney(a.price)}` : ""}
          </Btn>
        )}
      </Section>
    </Screen>
  );
}

const st = StyleSheet.create({
  name: { fontFamily: Fonts.bodyMedium, fontSize: 15, color: c.ink },
  allergy: { fontFamily: Fonts.bodyMedium, fontSize: 12.5, color: c.crimson, marginTop: 10 },
});
