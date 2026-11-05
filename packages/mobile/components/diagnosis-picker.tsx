import { useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Colors, Fonts } from "../constants/theme";
import { useCie10 } from "../queries/clinical";
import { Input, Ionicons } from "./ui";

const c = Colors.light;
export type Diagnosis = { code: string; name: string; kind: "presuntivo" | "definitivo" };

/** Buscador CIE-10 + lista de diagnósticos (PRE / DEF). */
export function DiagnosisPicker({ value, onChange }: { value: Diagnosis[]; onChange: (v: Diagnosis[]) => void }) {
  const [q, setQ] = useState("");
  const [dq, setDq] = useState("");
  useEffect(() => {
    const t = setTimeout(() => setDq(q), 220);
    return () => clearTimeout(t);
  }, [q]);
  const res = useCie10(dq);
  const options = (res.data ?? []).filter((o) => !value.some((v) => v.code === o.code)).slice(0, 6);

  return (
    <View>
      {value.map((d, i) => (
        <View key={d.code} style={s.item}>
          <Text style={s.code}>{d.code}</Text>
          <Text style={s.name} numberOfLines={2}>{d.name}</Text>
          <Pressable
            onPress={() => onChange(value.map((x, j) => (j === i ? { ...x, kind: x.kind === "presuntivo" ? "definitivo" : "presuntivo" } : x)))}
            style={[s.kind, d.kind === "definitivo" && { backgroundColor: c.navy, borderColor: c.navy }]}
          >
            <Text style={[s.kindTxt, d.kind === "definitivo" && { color: "#fff" }]}>{d.kind === "definitivo" ? "DEF" : "PRE"}</Text>
          </Pressable>
          <Pressable hitSlop={8} onPress={() => onChange(value.filter((_, j) => j !== i))}>
            <Ionicons name="close" size={16} color={c.mutedForeground} />
          </Pressable>
        </View>
      ))}
      <Input value={q} onChangeText={setQ} placeholder="Buscar CIE-10: código o nombre (ej. I10, hipertensión)" autoCorrect={false} />
      {q.trim().length >= 2 && (
        <View style={s.results}>
          {options.length ? (
            options.map((o) => (
              <Pressable
                key={o.code}
                onPress={() => {
                  onChange([...value, { ...o, kind: "presuntivo" }]);
                  setQ("");
                }}
                style={({ pressed }) => [s.opt, pressed && { backgroundColor: c.surface }]}
              >
                <Text style={s.code}>{o.code}</Text>
                <Text style={s.name} numberOfLines={2}>{o.name}</Text>
                <Ionicons name="add" size={16} color={c.navy} />
              </Pressable>
            ))
          ) : (
            <Text style={[s.name, { padding: 12, color: c.mutedForeground }]}>{res.isFetching ? "Buscando…" : "Sin coincidencias"}</Text>
          )}
        </View>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  item: { flexDirection: "row", alignItems: "center", gap: 10, padding: 10, paddingLeft: 12, borderRadius: 16, backgroundColor: c.navySoft, marginBottom: 8 },
  code: { fontFamily: Fonts.bodySemi, fontSize: 12, color: c.navy, width: 46 },
  name: { flex: 1, fontFamily: Fonts.body, fontSize: 12.5, color: c.ink },
  kind: { paddingHorizontal: 8, height: 24, borderRadius: 999, borderWidth: 1, borderColor: c.navy, alignItems: "center", justifyContent: "center" },
  kindTxt: { fontFamily: Fonts.bodySemi, fontSize: 10, color: c.navy },
  results: { marginTop: 6, borderRadius: 16, borderWidth: 1, borderColor: c.border, overflow: "hidden", backgroundColor: "#fff" },
  opt: { flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 12, paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: c.border },
});
