import { useMemo, useState } from "react";
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { ApptRow } from "../../components/appt-row";
import { Btn, Display, Empty, Eyebrow, IconBtn, Loading, Row } from "../../components/ui";
import { Colors, Fonts } from "../../constants/theme";
import { useAppointments } from "../../queries/appointments";
import { addDaysYmd, ecDate, ymd } from "../../lib/utils";

const c = Colors.light;
const fmt = (d: string, o: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat("es-EC", { timeZone: "America/Guayaquil", ...o }).format(ecDate(d, "12:00"));

/** Lunes de la semana de `d` */
function monday(d: string) {
  const wd = ecDate(d, "12:00").getUTCDay();
  return addDaysYmd(d, wd === 0 ? -6 : 1 - wd);
}

export default function Agenda() {
  const router = useRouter();
  const today = ymd(new Date());
  const [date, setDate] = useState(today);
  const week = useMemo(() => {
    const m = monday(date);
    return Array.from({ length: 7 }, (_, i) => addDaysYmd(m, i));
  }, [date]);
  const wk = useAppointments(week[0], week[6]);
  const list = (wk.data ?? []).filter((a) => ymd(new Date(a.startsAt)) === date);
  const countFor = (d: string) => (wk.data ?? []).filter((a) => ymd(new Date(a.startsAt)) === d && a.status !== "cancelada").length;
  const active = list.filter((a) => a.status !== "cancelada");

  return (
    <SafeAreaView edges={["top", "left", "right"]} style={{ flex: 1, backgroundColor: c.background }}>
      <View style={{ paddingHorizontal: 20, paddingTop: 8 }}>
        <Row style={{ justifyContent: "space-between" }}>
          <Eyebrow>Agenda</Eyebrow>
          <Row>
            {date !== today && (
              <Btn size="sm" variant="outline" onPress={() => setDate(today)}>
                Hoy
              </Btn>
            )}
            <IconBtn icon="add" tone="ink" onPress={() => router.push(`/appointment/new?date=${date}`)} />
          </Row>
        </Row>
        <Display size={38} style={{ marginTop: 4, textTransform: "capitalize" }}>
          {fmt(date, { month: "long" })} <Text style={{ color: c.mutedForeground }}>{date.slice(0, 4)}</Text>
        </Display>

        <Row gap={4} style={{ marginTop: 16 }}>
          <Pressable hitSlop={8} onPress={() => setDate(addDaysYmd(date, -7))} style={st.nav}>
            <Text style={st.navTxt}>‹</Text>
          </Pressable>
          {week.map((d) => {
            const on = d === date;
            const n = countFor(d);
            return (
              <Pressable key={d} onPress={() => setDate(d)} style={[st.day, on && { backgroundColor: c.ink }]}>
                <Text style={[st.dow, on && { color: "#C9D0E0" }]}>{fmt(d, { weekday: "narrow" })}</Text>
                <Text style={[st.dnum, on && { color: "#fff" }, d === today && !on && { color: c.crimson }]}>{Number(d.slice(8))}</Text>
                <View style={[st.dot, { backgroundColor: n ? (on ? "#fff" : c.navy) : "transparent" }]} />
              </Pressable>
            );
          })}
          <Pressable hitSlop={8} onPress={() => setDate(addDaysYmd(date, 7))} style={st.nav}>
            <Text style={st.navTxt}>›</Text>
          </Pressable>
        </Row>
      </View>

      <ScrollView contentContainerStyle={{ padding: 20, paddingTop: 12, paddingBottom: 40 }} refreshControl={<RefreshControl refreshing={wk.isRefetching} onRefresh={() => wk.refetch()} tintColor={c.navy} />}>
        <Row style={{ justifyContent: "space-between", marginBottom: 4 }}>
          <Text style={st.dayTitle}>{fmt(date, { weekday: "long", day: "numeric" })}</Text>
          <Text style={st.count}>
            {active.length} {active.length === 1 ? "cita" : "citas"}
          </Text>
        </Row>
        {wk.isLoading ? (
          <Loading />
        ) : list.length ? (
          list.map((a) => <ApptRow key={a.id} a={a} />)
        ) : (
          <Empty icon="calendar-clear-outline" title="Día libre" text="No hay citas para este día." action={<Btn size="sm" icon="add" onPress={() => router.push(`/appointment/new?date=${date}`)}>Agendar cita</Btn>} />
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const st = StyleSheet.create({
  nav: { width: 22, alignItems: "center" },
  navTxt: { fontSize: 22, color: c.mutedForeground, fontFamily: Fonts.display },
  day: { flex: 1, alignItems: "center", paddingVertical: 8, borderRadius: 999 },
  dow: { fontFamily: Fonts.bodyMedium, fontSize: 10.5, color: c.mutedForeground, textTransform: "uppercase" },
  dnum: { fontFamily: Fonts.display, fontSize: 19, color: c.ink, marginTop: 2 },
  dot: { width: 4, height: 4, borderRadius: 2, marginTop: 3 },
  dayTitle: { fontFamily: Fonts.bodyMedium, fontSize: 13, color: c.ink, textTransform: "capitalize" },
  count: { fontFamily: Fonts.body, fontSize: 12, color: c.mutedForeground },
});
