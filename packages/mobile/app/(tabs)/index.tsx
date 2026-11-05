import { RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { ApptRow } from "../../components/appt-row";
import { Body, Btn, Card, Display, Empty, Eyebrow, IconBtn, Loading, Row, Section } from "../../components/ui";
import { Colors, Fonts } from "../../constants/theme";
import { useDashboard } from "../../queries/reports";
import { useProfile } from "../../queries/profile";
import { fmtDateLong, fmtMoney, hm } from "../../lib/utils";

const c = Colors.light;

function greeting() {
  const h = Number(hm(new Date()).slice(0, 2));
  return h < 12 ? "Buenos días" : h < 19 ? "Buenas tardes" : "Buenas noches";
}

export default function Today() {
  const router = useRouter();
  const dash = useDashboard();
  const prof = useProfile();
  const d = dash.data;
  const today = d?.today ?? [];
  const pending = today.filter((a) => a.status === "agendada" || a.status === "confirmada");
  const next = pending.find((a) => new Date(a.endsAt).getTime() > Date.now()) ?? pending[0];
  const done = today.filter((a) => a.status === "atendida").length;
  const first = prof.data?.fullName?.split(" ")[0] ?? "";

  return (
    <SafeAreaView edges={["top", "left", "right"]} style={{ flex: 1, backgroundColor: c.background }}>
      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 40 }} refreshControl={<RefreshControl refreshing={dash.isRefetching} onRefresh={() => dash.refetch()} tintColor={c.navy} />}>
        <Row style={{ justifyContent: "space-between" }}>
          <Eyebrow>{fmtDateLong(new Date())}</Eyebrow>
          <IconBtn icon="add" tone="ink" onPress={() => router.push("/appointment/new")} />
        </Row>
        <Display size={44} style={{ marginTop: 6 }}>
          {greeting()},{"\n"}
          <Text style={{ color: c.navy }}>{prof.data ? `${prof.data.title} ${first}` : "doctor"}.</Text>
        </Display>

        <View style={st.hero}>
          <View style={[st.blob, { backgroundColor: "#C9D6F5", top: -50, left: -40 }]} />
          <View style={[st.blob, { backgroundColor: "#F7E3E8", bottom: -70, right: -40 }]} />
          <Eyebrow color={c.navy}>Próximo paciente</Eyebrow>
          {dash.isLoading ? (
            <Loading />
          ) : next ? (
            <>
              <Text style={st.heroTime}>{hm(new Date(next.startsAt))}</Text>
              <Text style={st.heroName}>
                {next.patient.firstName} {next.patient.lastName}
              </Text>
              <Body muted size={13}>{next.reason || "Consulta"}</Body>
              <Row style={{ marginTop: 14 }}>
                <Btn size="sm" icon="pulse" onPress={() => router.push(`/consultation/${next.patient.id}?appointmentId=${next.id}`)}>
                  Atender
                </Btn>
                <Btn size="sm" variant="outline" onPress={() => router.push(`/patient/${next.patient.id}`)}>
                  Ficha
                </Btn>
              </Row>
            </>
          ) : (
            <>
              <Text style={[st.heroName, { marginTop: 10 }]}>Sin pacientes pendientes</Text>
              <Body muted size={13}>Tu agenda de hoy está libre.</Body>
            </>
          )}
        </View>

        <Row gap={10} style={{ marginTop: 14 }}>
          <Kpi label="Citas hoy" value={String(today.length)} sub={`${done} atendidas`} />
          <Kpi label="Caja hoy" value={fmtMoney(d?.todayRevenue ?? 0)} sub={d?.todayPending ? `${fmtMoney(d.todayPending)} pend.` : "al día"} accent />
          <Kpi label="Pacientes" value={String(d?.totalPatients ?? 0)} sub="registrados" />
        </Row>

        <Section title="Agenda de hoy" action={<Btn size="sm" variant="ghost" onPress={() => router.push("/agenda")}>Ver agenda</Btn>}>
          {dash.isLoading ? <Loading /> : today.length ? today.map((a) => <ApptRow key={a.id} a={a} />) : <Empty icon="calendar-clear-outline" title="Sin citas hoy" text="Agenda una cita o comparte tu enlace de reserva." />}
        </Section>

        {!!d?.upcoming.length && (
          <Section title="Próximos días">
            {d.upcoming.map((a) => (
              <ApptRow key={a.id} a={a} showDate={new Intl.DateTimeFormat("es-EC", { timeZone: "America/Guayaquil", weekday: "short", day: "numeric" }).format(new Date(a.startsAt))} />
            ))}
          </Section>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function Kpi({ label, value, sub, accent }: { label: string; value: string; sub: string; accent?: boolean }) {
  return (
    <Card style={{ flex: 1, padding: 12 }}>
      <Eyebrow style={{ fontSize: 9 }}>{label}</Eyebrow>
      <Text numberOfLines={1} adjustsFontSizeToFit style={{ fontFamily: Fonts.display, fontSize: 22, color: accent ? c.crimson : c.ink, marginTop: 6, letterSpacing: -0.6 }}>
        {value}
      </Text>
      <Text numberOfLines={1} style={{ fontFamily: Fonts.body, fontSize: 10.5, color: c.mutedForeground }}>{sub}</Text>
    </Card>
  );
}

const st = StyleSheet.create({
  hero: { marginTop: 22, borderRadius: 26, padding: 20, overflow: "hidden", backgroundColor: "#F3F6FD" },
  blob: { position: "absolute", width: 200, height: 200, borderRadius: 100, opacity: 0.8 },
  heroTime: { fontFamily: Fonts.displayLight, fontSize: 56, color: c.navy, letterSpacing: -2, marginTop: 4, lineHeight: 60 },
  heroName: { fontFamily: Fonts.bodyMedium, fontSize: 17, color: c.ink },
});
