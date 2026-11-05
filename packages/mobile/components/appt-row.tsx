import { StyleSheet, Text, View, Pressable } from "react-native";
import { useRouter } from "expo-router";
import { Colors, Fonts } from "../constants/theme";
import { APPT_STATUS, hm } from "../lib/utils";
import { Ionicons } from "./ui";

const c = Colors.light;

export type ApptLite = {
  id: number;
  startsAt: Date;
  endsAt: Date;
  status: string;
  reason: string;
  source?: string | null;
  patient: { id: number; firstName: string; lastName: string; allergies?: string | null };
};

/** Fila de cita estilo timeline: hora · barra de estado · paciente. */
export function ApptRow({ a, showDate }: { a: ApptLite; showDate?: string }) {
  const router = useRouter();
  const st = APPT_STATUS[a.status] ?? { label: a.status, color: c.mutedForeground };
  const faded = a.status === "cancelada" || a.status === "atendida";
  return (
    <Pressable onPress={() => router.push(`/appointment/${a.id}`)} style={({ pressed }) => [s.row, { opacity: pressed ? 0.7 : 1 }]}>
      <View style={s.time}>
        {showDate ? <Text style={s.date}>{showDate}</Text> : null}
        <Text style={[s.hour, faded && { color: c.mutedForeground }]}>{hm(new Date(a.startsAt))}</Text>
        <Text style={s.end}>{hm(new Date(a.endsAt))}</Text>
      </View>
      <View style={[s.bar, { backgroundColor: st.color }]} />
      <View style={{ flex: 1, gap: 2 }}>
        <Text numberOfLines={1} style={[s.name, a.status === "cancelada" && { textDecorationLine: "line-through", color: c.mutedForeground }]}>
          {a.patient.lastName} {a.patient.firstName}
        </Text>
        <Text numberOfLines={1} style={s.reason}>
          {a.reason || "Consulta"}
          {a.source === "online" ? " · Reserva online" : ""}
        </Text>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginTop: 2 }}>
          <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: st.color }} />
          <Text style={s.status}>{st.label}</Text>
          {a.patient.allergies ? (
            <>
              <Ionicons name="warning" size={11} color={c.crimson} />
              <Text style={[s.status, { color: c.crimson }]}>Alergias</Text>
            </>
          ) : null}
        </View>
      </View>
      <Ionicons name="chevron-forward" size={16} color="#B7BCC8" />
    </Pressable>
  );
}

const s = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 14, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: c.border },
  time: { width: 52 },
  date: { fontFamily: Fonts.bodyMedium, fontSize: 10, color: c.crimson, textTransform: "uppercase", letterSpacing: 0.6 },
  hour: { fontFamily: Fonts.display, fontSize: 20, color: c.ink, letterSpacing: -0.5 },
  end: { fontFamily: Fonts.body, fontSize: 11, color: c.mutedForeground },
  bar: { width: 3, alignSelf: "stretch", borderRadius: 2 },
  name: { fontFamily: Fonts.bodyMedium, fontSize: 14.5, color: c.ink },
  reason: { fontFamily: Fonts.body, fontSize: 12.5, color: c.mutedForeground },
  status: { fontFamily: Fonts.body, fontSize: 11, color: c.mutedForeground },
});
