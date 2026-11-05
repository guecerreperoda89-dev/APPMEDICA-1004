import { useState } from "react";
import { useRouter } from "expo-router";
import { Btn, Chips, ErrorBox, Field, Input, Row, Screen, Section, StackHeader } from "../../components/ui";
import { useCreatePatient } from "../../queries/patients";
import { errMsg } from "../../lib/api";
import { isValidCedula } from "../../lib/utils";

export default function NewPatient() {
  const router = useRouter();
  const create = useCreatePatient();
  const [idType, setIdType] = useState<"cedula" | "pasaporte">("cedula");
  const [f, setF] = useState({
    idNumber: "",
    firstName: "",
    lastName: "",
    birthDate: "",
    phone: "",
    email: "",
    city: "",
    insurance: "",
    bloodType: "",
    allergies: "",
    personalHistory: "",
    currentMedications: "",
  });
  const [sex, setSex] = useState<"F" | "M">("F");
  const [error, setError] = useState("");
  const set = (k: keyof typeof f) => (v: string) => setF((x) => ({ ...x, [k]: v }));
  const cedErr = idType === "cedula" && f.idNumber.length === 10 && !isValidCedula(f.idNumber) ? "Cédula no válida (verificación módulo 10)" : null;
  const dateErr = f.birthDate && !/^\d{4}-\d{2}-\d{2}$/.test(f.birthDate) ? "Formato AAAA-MM-DD" : null;

  const save = async () => {
    setError("");
    if (!f.firstName.trim() || !f.lastName.trim()) return setError("Nombres y apellidos son obligatorios.");
    if (idType === "cedula" && !isValidCedula(f.idNumber)) return setError("Ingresa una cédula ecuatoriana válida.");
    if (idType === "pasaporte" && f.idNumber.trim().length < 3) return setError("Ingresa el número de pasaporte.");
    if (dateErr) return setError("Revisa la fecha de nacimiento.");
    try {
      const p = await create.mutateAsync({
        ...f,
        idType,
        sex,
        idNumber: f.idNumber.trim().toUpperCase(),
        firstName: f.firstName.trim(),
        lastName: f.lastName.trim(),
        email: f.email.trim().toLowerCase(),
        birthDate: f.birthDate || null,
      });
      router.replace(`/patient/${p.id}`);
    } catch (e) {
      setError(errMsg(e));
    }
  };

  return (
    <Screen footer={<Btn onPress={save} loading={create.isPending} icon="checkmark">Guardar paciente</Btn>}>
      <StackHeader title="Nuevo paciente" />
      {error ? <ErrorBox text={error} /> : null}
      <Field label="Identificación">
        <Chips value={idType} onChange={setIdType} options={[{ value: "cedula", label: "Cédula" }, { value: "pasaporte", label: "Pasaporte" }]} />
      </Field>
      <Field label={idType === "cedula" ? "Número de cédula" : "Número de pasaporte"} error={cedErr}>
        <Input value={f.idNumber} onChangeText={set("idNumber")} keyboardType={idType === "cedula" ? "number-pad" : "default"} maxLength={idType === "cedula" ? 10 : 20} autoCapitalize="characters" />
      </Field>
      <Row gap={10}>
        <Field label="Nombres" style={{ flex: 1 }}>
          <Input value={f.firstName} onChangeText={set("firstName")} autoCapitalize="words" />
        </Field>
        <Field label="Apellidos" style={{ flex: 1 }}>
          <Input value={f.lastName} onChangeText={set("lastName")} autoCapitalize="words" />
        </Field>
      </Row>
      <Row gap={10} style={{ alignItems: "flex-start" }}>
        <Field label="Nacimiento" error={dateErr} style={{ flex: 1 }}>
          <Input value={f.birthDate} onChangeText={set("birthDate")} placeholder="AAAA-MM-DD" maxLength={10} />
        </Field>
        <Field label="Sexo" style={{ flex: 1 }}>
          <Chips value={sex} onChange={setSex} options={[{ value: "F", label: "F" }, { value: "M", label: "M" }]} />
        </Field>
      </Row>
      <Row gap={10}>
        <Field label="Teléfono" style={{ flex: 1 }}>
          <Input value={f.phone} onChangeText={set("phone")} keyboardType="phone-pad" placeholder="09…" />
        </Field>
        <Field label="Ciudad" style={{ flex: 1 }}>
          <Input value={f.city} onChangeText={set("city")} />
        </Field>
      </Row>
      <Field label="Email" hint="Para confirmaciones, recordatorios y recetas">
        <Input value={f.email} onChangeText={set("email")} keyboardType="email-address" autoCapitalize="none" />
      </Field>
      <Row gap={10}>
        <Field label="Seguro / convenio" style={{ flex: 2 }}>
          <Input value={f.insurance} onChangeText={set("insurance")} placeholder="IESS, privado…" />
        </Field>
        <Field label="Grupo sang." style={{ flex: 1 }}>
          <Input value={f.bloodType} onChangeText={set("bloodType")} placeholder="O+" autoCapitalize="characters" />
        </Field>
      </Row>
      <Section title="Antecedentes" style={{ marginTop: 10 }}>
        <Field label="Alergias">
          <Input value={f.allergies} onChangeText={set("allergies")} placeholder="Penicilina, AINEs…" />
        </Field>
        <Field label="Antecedentes personales">
          <Input value={f.personalHistory} onChangeText={set("personalHistory")} multiline />
        </Field>
        <Field label="Medicación habitual">
          <Input value={f.currentMedications} onChangeText={set("currentMedications")} multiline />
        </Field>
      </Section>
    </Screen>
  );
}
