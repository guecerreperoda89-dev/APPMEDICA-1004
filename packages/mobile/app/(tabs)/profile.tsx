import { useEffect, useState } from "react";
import { Image, Share, StyleSheet, Switch, Text, View } from "react-native";
import * as WebBrowser from "expo-web-browser";
import { Avatar, Body, Btn, Card, Display, ErrorBox, Eyebrow, Field, Input, Loading, Row, Screen, Section } from "../../components/ui";
import { Colors, Fonts } from "../../constants/theme";
import { useProfile, useUpdateProfile } from "../../queries/profile";
import { apiOrigin, signOut } from "../../lib/auth";
import { errMsg } from "../../lib/api";
import { confirm, notify } from "../../lib/notify";
import { fmtMoney } from "../../lib/utils";

const c = Colors.light;
const FIELDS = [
  ["title", "Título", "Dr. / Dra."],
  ["fullName", "Nombre completo", ""],
  ["specialty", "Especialidad", "Cardiología"],
  ["cedula", "Cédula", "10 dígitos"],
  ["senescytReg", "Registro SENESCYT", "1005-2020-…"],
  ["acessReg", "Registro ACESS", ""],
  ["phone", "Teléfono", "+593 …"],
  ["email", "Email de contacto", ""],
  ["address", "Dirección del consultorio", ""],
  ["city", "Ciudad", "Quito"],
] as const;
type Key = (typeof FIELDS)[number][0];

export default function Profile() {
  const prof = useProfile();
  const update = useUpdateProfile();
  const [edit, setEdit] = useState(false);
  const [f, setF] = useState<Record<Key, string>>({} as Record<Key, string>);
  const [fee, setFee] = useState("");
  const p = prof.data;

  useEffect(() => {
    if (!p) return;
    setF(Object.fromEntries(FIELDS.map(([k]) => [k, String(p[k] ?? "")])) as Record<Key, string>);
    setFee(String(p.consultationFee ?? ""));
  }, [p]);

  if (!p) return <Screen tab>{prof.isError ? <ErrorBox text={errMsg(prof.error)} /> : <Loading />}</Screen>;

  const bookingUrl = `${apiOrigin}/reservar/${p.id}`;
  const save = async () => {
    if ((f.fullName ?? "").trim().length < 2) return notify("Revisa tu nombre completo");
    try {
      await update.mutateAsync({ ...f, consultationFee: Number(fee) || 0 });
      setEdit(false);
      notify("Perfil actualizado");
    } catch (e) {
      notify("No se pudo guardar", errMsg(e));
    }
  };
  const missingReg = !p.senescytReg || !p.cedula;
  const [first, ...rest] = p.fullName.split(" ");

  return (
    <Screen tab>
      <Eyebrow>Mi perfil</Eyebrow>
      <Row gap={14} style={{ marginTop: 14 }}>
        <Avatar first={first ?? ""} last={rest.at(-1) ?? ""} size={64} tone="ink" />
        <View style={{ flex: 1 }}>
          <Display size={28}>
            {p.title} {p.fullName}
          </Display>
          <Body muted size={13}>{p.specialty || "Especialidad sin definir"}</Body>
        </View>
      </Row>

      {missingReg && !edit && (
        <Card tone="crimson" style={{ marginTop: 18 }}>
          <Text style={st.warnTitle}>Completa tus registros</Text>
          <Body size={12.5}>La cédula y el registro SENESCYT aparecen en recetas y certificados (formato MSP).</Body>
        </Card>
      )}

      <Section title="Reservas en línea">
        <Card>
          <Row style={{ justifyContent: "space-between" }}>
            <View style={{ flex: 1 }}>
              <Text style={st.strong}>Aceptar reservas públicas</Text>
              <Body muted size={12}>
                {fmtMoney(p.consultationFee)} · citas de {p.slotMinutes} min
              </Body>
            </View>
            <Switch
              value={p.bookingEnabled}
              onValueChange={(v) => update.mutate({ bookingEnabled: v })}
              trackColor={{ true: c.navy, false: c.border }}
              thumbColor="#fff"
            />
          </Row>
          <View style={st.link}>
            <Text numberOfLines={1} style={st.linkTxt}>{bookingUrl.replace(/^https?:\/\//, "")}</Text>
          </View>
          <Row>
            <Btn size="sm" icon="share-outline" onPress={() => Share.share({ message: `Agenda tu cita con ${p.title} ${p.fullName}: ${bookingUrl}`, url: bookingUrl })}>
              Compartir enlace
            </Btn>
            <Btn size="sm" variant="outline" onPress={() => WebBrowser.openBrowserAsync(bookingUrl)}>
              Ver página
            </Btn>
          </Row>
        </Card>
      </Section>

      <Section title="Datos profesionales" action={!edit && <Btn size="sm" variant="ghost" icon="create-outline" onPress={() => setEdit(true)}>Editar</Btn>}>
        {edit ? (
          <>
            {FIELDS.map(([k, label, ph]) => (
              <Field key={k} label={label}>
                <Input value={f[k]} onChangeText={(v) => setF((x) => ({ ...x, [k]: v }))} placeholder={ph} autoCapitalize={k === "email" ? "none" : "sentences"} />
              </Field>
            ))}
            <Field label="Valor de consulta (USD)">
              <Input value={fee} onChangeText={setFee} keyboardType="decimal-pad" />
            </Field>
            <Row>
              <Btn onPress={save} loading={update.isPending} style={{ flex: 1 }}>
                Guardar
              </Btn>
              <Btn variant="outline" onPress={() => setEdit(false)}>
                Cancelar
              </Btn>
            </Row>
          </>
        ) : (
          <Card>
            {FIELDS.slice(2).map(([k, label]) => (
              <Row key={k} style={st.kv}>
                <Text style={st.k}>{label}</Text>
                <Text numberOfLines={1} style={st.v}>{String(p[k] || "—")}</Text>
              </Row>
            ))}
          </Card>
        )}
      </Section>

      <Section title="Firma y sello">
        <Card tone="surface">
          <Row gap={12}>
            {[p.signatureUrl, p.stampUrl].map((u, i) => (
              <View key={i} style={st.sig}>
                {u ? <Image source={{ uri: u }} style={{ width: "100%", height: "100%" }} resizeMode="contain" /> : <Text style={st.k}>{i ? "Sin sello" : "Sin firma"}</Text>}
              </View>
            ))}
          </Row>
          <Body muted size={12} style={{ marginTop: 10 }}>
            Se cargan como imagen PNG/JPG desde el panel web (Mi perfil) y se estampan en cada PDF.
          </Body>
          <Btn size="sm" variant="outline" icon="open-outline" style={{ marginTop: 10, alignSelf: "flex-start" }} onPress={() => WebBrowser.openBrowserAsync(`${apiOrigin}/app/perfil`)}>
            Abrir panel web
          </Btn>
        </Card>
      </Section>

      {!p.emailEnabled && (
        <Body muted size={12} style={{ marginTop: 18 }}>
          El envío de correos (confirmaciones, recordatorios, recetas) se activa al configurar el servicio de email.
        </Body>
      )}

      <Btn variant="outline" icon="log-out-outline" style={{ marginTop: 28 }} onPress={() => confirm("Cerrar sesión", "¿Deseas salir de SINCRONIA?", () => void signOut(), "Salir")}>
        Cerrar sesión
      </Btn>
    </Screen>
  );
}

const st = StyleSheet.create({
  warnTitle: { fontFamily: Fonts.bodySemi, fontSize: 13, color: c.crimson, marginBottom: 2 },
  strong: { fontFamily: Fonts.bodyMedium, fontSize: 14, color: c.ink },
  link: { marginVertical: 12, borderRadius: 14, backgroundColor: c.surface, paddingHorizontal: 12, paddingVertical: 10 },
  linkTxt: { fontFamily: Fonts.mono, fontSize: 12, color: c.navy },
  kv: { justifyContent: "space-between", paddingVertical: 8, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: c.border },
  k: { fontFamily: Fonts.body, fontSize: 12.5, color: c.mutedForeground },
  v: { fontFamily: Fonts.bodyMedium, fontSize: 13, color: c.ink, flexShrink: 1, textAlign: "right", marginLeft: 12 },
  sig: { flex: 1, height: 80, borderRadius: 14, backgroundColor: "#fff", alignItems: "center", justifyContent: "center", padding: 6 },
});
