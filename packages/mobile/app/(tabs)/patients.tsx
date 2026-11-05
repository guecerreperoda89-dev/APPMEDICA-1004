import { useEffect, useState } from "react";
import { FlatList, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Avatar, Display, Empty, Eyebrow, IconBtn, Ionicons, Loading, Row } from "../../components/ui";
import { Colors, Fonts } from "../../constants/theme";
import { usePatients } from "../../queries/patients";
import { ageFrom } from "../../lib/utils";

const c = Colors.light;

export default function Patients() {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [dq, setDq] = useState("");
  useEffect(() => {
    const t = setTimeout(() => setDq(q.trim()), 250);
    return () => clearTimeout(t);
  }, [q]);
  const list = usePatients(dq);

  return (
    <SafeAreaView edges={["top", "left", "right"]} style={{ flex: 1, backgroundColor: c.background }}>
      <View style={{ paddingHorizontal: 20, paddingTop: 8 }}>
        <Row style={{ justifyContent: "space-between" }}>
          <Eyebrow>Pacientes</Eyebrow>
          <IconBtn icon="person-add" tone="ink" onPress={() => router.push("/patient/new")} />
        </Row>
        <Display size={38} style={{ marginTop: 4 }}>
          {list.data ? list.data.length : "—"} <Text style={{ color: c.mutedForeground }}>{dq ? "resultados" : "fichas"}</Text>
        </Display>
        <View style={st.search}>
          <Ionicons name="search" size={16} color={c.mutedForeground} />
          <TextInput value={q} onChangeText={setQ} placeholder="Nombre, apellido o cédula" placeholderTextColor="#9AA0AE" style={st.searchInput} autoCorrect={false} />
          {q ? (
            <Pressable onPress={() => setQ("")} hitSlop={8}>
              <Ionicons name="close-circle" size={16} color={c.mutedForeground} />
            </Pressable>
          ) : null}
        </View>
      </View>
      {list.isLoading ? (
        <Loading />
      ) : (
        <FlatList
          data={list.data ?? []}
          keyExtractor={(p) => String(p.id)}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 40 }}
          ListEmptyComponent={<Empty icon="people-outline" title={dq ? "Sin resultados" : "Aún no hay pacientes"} text={dq ? "Prueba con otro nombre o cédula." : "Registra tu primer paciente."} />}
          renderItem={({ item: p }) => {
            const age = ageFrom(p.birthDate);
            return (
              <Pressable onPress={() => router.push(`/patient/${p.id}`)} style={({ pressed }) => [st.row, { opacity: pressed ? 0.7 : 1 }]}>
                <Avatar first={p.firstName} last={p.lastName} />
                <View style={{ flex: 1 }}>
                  <Text numberOfLines={1} style={st.name}>
                    {p.lastName} {p.firstName}
                  </Text>
                  <Text style={st.meta}>
                    {p.idType === "cedula" ? "CI" : "PAS"} {p.idNumber}
                    {age !== null ? ` · ${age} años` : ""}
                    {p.insurance ? ` · ${p.insurance}` : ""}
                  </Text>
                  {p.allergies ? (
                    <Row gap={4} style={{ marginTop: 2 }}>
                      <Ionicons name="warning" size={11} color={c.crimson} />
                      <Text numberOfLines={1} style={[st.meta, { color: c.crimson, flex: 1 }]}>{p.allergies}</Text>
                    </Row>
                  ) : null}
                </View>
                <Ionicons name="chevron-forward" size={16} color="#B7BCC8" />
              </Pressable>
            );
          }}
        />
      )}
    </SafeAreaView>
  );
}

const st = StyleSheet.create({
  search: { flexDirection: "row", alignItems: "center", gap: 8, height: 46, borderRadius: 999, backgroundColor: c.surface, paddingHorizontal: 16, marginTop: 16, marginBottom: 6 },
  searchInput: { flex: 1, fontFamily: Fonts.body, fontSize: 14, color: c.ink, height: 46 },
  row: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 13, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: c.border },
  name: { fontFamily: Fonts.bodyMedium, fontSize: 14.5, color: c.ink },
  meta: { fontFamily: Fonts.body, fontSize: 12, color: c.mutedForeground },
});
