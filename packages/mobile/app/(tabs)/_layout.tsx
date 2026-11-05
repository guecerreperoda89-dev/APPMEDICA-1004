import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useColors } from "../../hooks/use-colors";
import { Fonts } from "../../constants/theme";

type IconName = keyof typeof Ionicons.glyphMap;
const tab = (title: string, on: IconName, off: IconName) => ({
  title,
  tabBarIcon: ({ color, size, focused }: { color: string; size: number; focused: boolean }) => <Ionicons name={focused ? on : off} size={size - 2} color={color} />,
});

export default function TabLayout() {
  const colors = useColors();
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.ink,
        tabBarInactiveTintColor: "#9AA0AE",
        tabBarLabelStyle: { fontFamily: Fonts.bodyMedium, fontSize: 10.5 },
        tabBarStyle: { backgroundColor: colors.background, borderTopColor: colors.border },
      }}
    >
      <Tabs.Screen name="index" options={tab("Hoy", "sunny", "sunny-outline")} />
      <Tabs.Screen name="agenda" options={tab("Agenda", "calendar", "calendar-outline")} />
      <Tabs.Screen name="patients" options={tab("Pacientes", "people", "people-outline")} />
      <Tabs.Screen name="profile" options={tab("Perfil", "person-circle", "person-circle-outline")} />
    </Tabs>
  );
}
