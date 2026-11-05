import { Alert, Platform } from "react-native";

/** Aviso simple multiplataforma (Alert no muestra nada en Expo Web). */
export function notify(title: string, message?: string) {
  if (Platform.OS === "web") globalThis.alert?.(message ? `${title}\n\n${message}` : title);
  else Alert.alert(title, message);
}

/** Confirmación sí/no multiplataforma. */
export function confirm(title: string, message: string, onYes: () => void, yes = "Confirmar") {
  if (Platform.OS === "web") {
    if (globalThis.confirm?.(`${title}\n\n${message}`)) onYes();
    return;
  }
  Alert.alert(title, message, [
    { text: "Cancelar", style: "cancel" },
    { text: yes, style: "destructive", onPress: onYes },
  ]);
}
