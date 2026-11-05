import { useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { DiagnosisPicker, type Diagnosis } from "../../components/diagnosis-picker";
import { DocDone } from "../../components/doc-done";
import { Body, Btn, Card, Chips, ErrorBox, Field, Input, Ionicons, Row, Screen, Section, StackHeader } from "../../components/ui";
import { Colors, Fonts } from "../../constants/theme";
import { usePatient } from "../../queries/patients";
import { useCreatePrescription } from "../../queries/clinical";
import { errMsg } from "../../lib/api";
import { numberToWords } from "../../lib/utils";

const c = Colors.light;
type Item = {
  genericName: string;
  concentration: string;
  form: string;
  quantity: number;
  quantityWords: string;
  route: string;
  dose: string;
  frequency: string;
  duration: string;
  instructions: string;
};
const FORMS = ["Tableta", "Cápsula", "Jarabe", "Ampolla", "Crema", "Gotas", "Inhalador"];
const ROUTES = ["Oral", "IM", "IV", "Tópica", "Inhalada", "Sublingual"] as const;
const blank = { genericName: "", concentration: "", form: "Tableta", quantity: "", route: "Oral", dose: "", frequency: "", duration: "", instructions: "" };

export default function NewPrescription() {
  const { patientId, consultationId } = useLocalSearchParams<{ patientId: string; consultationId?: string }>();
  const pid = Number(patientId);
  const patient = usePatient(pid);
  const create = useCreatePrescription();
  const [items, setItems] = useState<Item[]>([]);
  const [draft, setDraft] = useState(blank);
  const [dx, setDx] = useState<Diagnosis[]>([]);
  const [rec, setRec] = useState("");
  const [warn, setWarn] = useState("");
  const [error, setError] = useState("");
  const [done, setDone] = useState<{ id: number; code: string } | null>(null);
  const set = (k: keyof typeof blank) => (v: string) => setDraft((d) => ({ ...d, [k]: v }));

  // Precarga diagnósticos de la consulta de origen (o de la última).
  useEffect(() => {
    const cons = patient.data?.consultations ?? [];
    const src = consultationId ? cons.find((x) => x.id === Number(consultationId)) : cons[0];
    if (src && !dx.length) setDx(src.diagnoses);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [patient.data]);

  const qty = Number(draft.quantity);
  const addItem = () => {
    setError("");
    if (!draft.genericName.trim()) return setError("Escribe el nombre genérico (DCI) del medicamento.");
    if (!Number.isInteger(qty) || qty < 1) return setError("La cantidad debe ser un número entero mayor a 0.");
    setItems((x) => [...x, { ...draft, genericName: draft.genericName.trim(), quantity: qty, quantityWords: numberToWords(qty) }]);
    setDraft(blank);
  };

  const save = async () => {
    setError("");
    if (!items.length) return setError("Agrega al menos un medicamento.");
    try {
      const r = await create.mutateAsync({ patientId: pid, consultationId: consultationId ? Number(consultationId) : null, diagnoses: dx, items, recommendations: rec, warningSigns: warn });
      setDone({ id: r.id, code: r.code });
    } catch (e) {
      setError(errMsg(e));
    }
  };

  const p = patient.data?.patient;
  if (done) return <DocDone kind="receta" id={done.id} code={done.code} patientId={pid} email={p?.email ?? ""} />;

  return (
    <Screen footer={<Btn onPress={save} loading={create.isPending} icon="checkmark" disabled={!items.length}>Emitir receta · {items.length} {items.length === 1 ? "ítem" : "ítems"}</Btn>}>
      <StackHeader title="Nueva receta" />
      {p && (
        <Body muted size={12.5} style={{ marginBottom: 12 }}>
          Paciente: <Text style={{ color: c.ink, fontFamily: Fonts.bodyMedium }}>{p.firstName} {p.lastName}</Text> · CI {p.idNumber}
          {p.allergies ? <Text style={{ color: c.crimson }}>{`  ⚠ ${p.allergies}`}</Text> : null}
        </Body>
      )}
      {error ? <ErrorBox text={error} /> : null}

      {items.map((it, i) => (
        <Card key={i} style={{ marginBottom: 8 }}>
          <Row style={{ alignItems: "flex-start" }}>
            <Text style={st.idx}>{i + 1}</Text>
            <View style={{ flex: 1 }}>
              <Text style={st.itName}>
                {it.genericName} {it.concentration}
              </Text>
              <Body muted size={12}>
                {it.form} · #{it.quantity} ({it.quantityWords}) · {it.route}
              </Body>
              <Body size={12.5}>{[it.dose, it.frequency, it.duration].filter(Boolean).join(" · ")}</Body>
              {it.instructions ? <Body muted size={12}>{it.instructions}</Body> : null}
            </View>
            <Pressable hitSlop={8} onPress={() => setItems((x) => x.filter((_, j) => j !== i))}>
              <Ionicons name="trash-outline" size={16} color={c.crimson} />
            </Pressable>
          </Row>
        </Card>
      ))}

      <Card tone="surface" style={{ marginTop: 4 }}>
        <Text style={[st.itName, { marginBottom: 10 }]}>Agregar medicamento</Text>
        <Field label="Nombre genérico (DCI) *">
          <Input value={draft.genericName} onChangeText={set("genericName")} placeholder="Losartán" style={st.white} />
        </Field>
        <Row gap={8}>
          <Field label="Concentración" style={{ flex: 1 }}>
            <Input value={draft.concentration} onChangeText={set("concentration")} placeholder="50 mg" style={st.white} />
          </Field>
          <Field label="Cantidad *" hint={qty > 0 ? numberToWords(qty) : undefined} style={{ width: 110 }}>
            <Input value={draft.quantity} onChangeText={set("quantity")} keyboardType="number-pad" placeholder="30" style={st.white} />
          </Field>
        </Row>
        <Field label="Forma farmacéutica">
          <Chips value={draft.form} onChange={set("form")} options={FORMS.map((f) => ({ value: f, label: f }))} />
        </Field>
        <Field label="Vía">
          <Chips value={draft.route} onChange={set("route")} options={ROUTES.map((f) => ({ value: f, label: f }))} />
        </Field>
        <Row gap={8}>
          <Field label="Dosis" style={{ flex: 1 }}>
            <Input value={draft.dose} onChangeText={set("dose")} placeholder="1 tableta" style={st.white} />
          </Field>
          <Field label="Frecuencia" style={{ flex: 1 }}>
            <Input value={draft.frequency} onChangeText={set("frequency")} placeholder="cada 12 h" style={st.white} />
          </Field>
        </Row>
        <Field label="Duración">
          <Input value={draft.duration} onChangeText={set("duration")} placeholder="30 días" style={st.white} />
        </Field>
        <Field label="Indicaciones">
          <Input value={draft.instructions} onChangeText={set("instructions")} placeholder="Tomar después del desayuno" style={st.white} />
        </Field>
        <Btn variant="navy" size="sm" icon="add" onPress={addItem} style={{ alignSelf: "flex-start" }}>
          Agregar a la receta
        </Btn>
      </Card>

      <Section title="Diagnóstico (CIE-10)">
        <DiagnosisPicker value={dx} onChange={setDx} />
      </Section>
      <Field label="Recomendaciones" style={{ marginTop: 20 }}>
        <Input value={rec} onChangeText={setRec} multiline placeholder="Dieta hiposódica, actividad física…" />
      </Field>
      <Field label="Signos de alarma">
        <Input value={warn} onChangeText={setWarn} multiline placeholder="Acudir a emergencias si presenta…" />
      </Field>
    </Screen>
  );
}

const st = StyleSheet.create({
  idx: { fontFamily: Fonts.display, fontSize: 20, color: c.navy, width: 22 },
  itName: { fontFamily: Fonts.bodyMedium, fontSize: 14, color: c.ink },
  white: { backgroundColor: "#fff" },
});
