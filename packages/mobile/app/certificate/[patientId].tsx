import { useEffect, useState } from "react";
import { Text } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { DiagnosisPicker, type Diagnosis } from "../../components/diagnosis-picker";
import { DocDone } from "../../components/doc-done";
import { Body, Btn, Chips, ErrorBox, Field, Input, Row, Screen, Section, StackHeader } from "../../components/ui";
import { Colors, Fonts } from "../../constants/theme";
import { usePatient } from "../../queries/patients";
import { useCreateCertificate } from "../../queries/clinical";
import { errMsg } from "../../lib/api";
import { CERT_TYPES, addDaysYmd, fmtDateLong, hm, ymd } from "../../lib/utils";

const c = Colors.light;
type CType = "reposo" | "asistencia" | "salud";
const isYmd = (s: string) => /^\d{4}-\d{2}-\d{2}$/.test(s);
const isHm = (s: string) => /^\d{2}:\d{2}$/.test(s);

export default function NewCertificate() {
  const { patientId, consultationId } = useLocalSearchParams<{ patientId: string; consultationId?: string }>();
  const pid = Number(patientId);
  const patient = usePatient(pid);
  const create = useCreateCertificate();
  const today = ymd(new Date());
  const [type, setType] = useState<CType>("reposo");
  const [days, setDays] = useState("3");
  const [start, setStart] = useState(today);
  const [from, setFrom] = useState(hm(new Date(Date.now() - 3600000)));
  const [to, setTo] = useState(hm(new Date()));
  const [institution, setInstitution] = useState("");
  const [obs, setObs] = useState("");
  const [dx, setDx] = useState<Diagnosis[]>([]);
  const [error, setError] = useState("");
  const [done, setDone] = useState<{ id: number; code: string } | null>(null);

  useEffect(() => {
    const cons = patient.data?.consultations ?? [];
    const src = consultationId ? cons.find((x) => x.id === Number(consultationId)) : cons[0];
    if (src && !dx.length) setDx(src.diagnoses);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [patient.data]);

  const nDays = Number(days);
  const end = type === "reposo" && isYmd(start) && nDays >= 1 ? addDaysYmd(start, nDays - 1) : null;

  const save = async () => {
    setError("");
    if (type === "reposo") {
      if (!Number.isInteger(nDays) || nDays < 1 || nDays > 365) return setError("Días de reposo: entero entre 1 y 365.");
      if (!isYmd(start)) return setError("Fecha de inicio en formato AAAA-MM-DD.");
      if (!dx.length) return setError("El certificado de reposo requiere al menos un diagnóstico CIE-10.");
    }
    if (type === "asistencia" && (!isHm(from) || !isHm(to))) return setError("Horas en formato HH:MM.");
    try {
      const r = await create.mutateAsync({
        patientId: pid,
        consultationId: consultationId ? Number(consultationId) : null,
        type,
        diagnoses: dx,
        restDays: type === "reposo" ? nDays : null,
        startDate: type === "reposo" ? start : null,
        endDate: end,
        timeFrom: type === "asistencia" ? from : null,
        timeTo: type === "asistencia" ? to : null,
        institution: institution.trim(),
        observations: obs.trim(),
      });
      setDone({ id: r.id, code: r.code });
    } catch (e) {
      setError(errMsg(e));
    }
  };

  const p = patient.data?.patient;
  if (done) return <DocDone kind="certificado" id={done.id} code={done.code} patientId={pid} email={p?.email ?? ""} />;

  return (
    <Screen footer={<Btn onPress={save} loading={create.isPending} icon="checkmark">Emitir certificado</Btn>}>
      <StackHeader title="Nuevo certificado" />
      {p && (
        <Body muted size={12.5} style={{ marginBottom: 14 }}>
          Paciente: <Text style={{ color: c.ink, fontFamily: Fonts.bodyMedium }}>{p.firstName} {p.lastName}</Text> · CI {p.idNumber}
        </Body>
      )}
      {error ? <ErrorBox text={error} /> : null}
      <Field label="Tipo de certificado" hint={CERT_TYPES[type]}>
        <Chips value={type} onChange={setType} options={[{ value: "reposo", label: "Reposo" }, { value: "asistencia", label: "Asistencia" }, { value: "salud", label: "Salud" }]} />
      </Field>

      {type === "reposo" && (
        <>
          <Row gap={10}>
            <Field label="Días de reposo" style={{ width: 120 }}>
              <Input value={days} onChangeText={setDays} keyboardType="number-pad" />
            </Field>
            <Field label="Desde" style={{ flex: 1 }}>
              <Input value={start} onChangeText={setStart} placeholder="AAAA-MM-DD" maxLength={10} />
            </Field>
          </Row>
          {end && (
            <Body size={12.5} style={{ marginTop: -4, marginBottom: 12, color: c.navy }}>
              Reposo del {fmtDateLong(start)} al {fmtDateLong(end)}
            </Body>
          )}
        </>
      )}
      {type === "asistencia" && (
        <Row gap={10}>
          <Field label="Desde (hora)" style={{ flex: 1 }}>
            <Input value={from} onChangeText={setFrom} placeholder="HH:MM" maxLength={5} />
          </Field>
          <Field label="Hasta (hora)" style={{ flex: 1 }}>
            <Input value={to} onChangeText={setTo} placeholder="HH:MM" maxLength={5} />
          </Field>
        </Row>
      )}
      <Field label="Dirigido a / institución" hint="Empresa, colegio o entidad que lo solicita">
        <Input value={institution} onChangeText={setInstitution} placeholder="A quien corresponda" />
      </Field>

      <Section title="Diagnóstico (CIE-10)" style={{ marginTop: 8 }}>
        <DiagnosisPicker value={dx} onChange={setDx} />
      </Section>

      <Field label="Observaciones" style={{ marginTop: 20 }}>
        <Input value={obs} onChangeText={setObs} multiline placeholder={type === "salud" ? "Apto para actividades físicas y laborales…" : ""} />
      </Field>
    </Screen>
  );
}
