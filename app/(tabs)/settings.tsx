import { StyleSheet, Switch, Text, TouchableOpacity, View } from "react-native";
import { useTheme } from "@/context/ThemeContext";
import { useThemeColors } from "@/hooks/useThemeColors";
import { useState } from "react";

export default function Settings() {
  const { themePreference, setThemePreference, activeTheme } = useTheme();
  const colors = useThemeColors();
  const [showSubtasks, setShowSubtasks] = useState(true);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Text style={[styles.header, { color: colors.text }]}>Settings</Text>

      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.icon }]}>
          Appearance
        </Text>
        <View style={[styles.row, { borderColor: colors.border }]}>
          <Text style={[styles.label, { color: colors.text }]}>Dark Mode</Text>
          <Switch
            value={activeTheme === "dark"}
            onValueChange={(val) => setThemePreference(val ? "dark" : "light")}
          />
        </View>
        <View style={[styles.row, { borderColor: colors.border }]}>
          <Text style={[styles.label, { color: colors.text }]}>See Subtasks on Home Screen</Text>
          <Switch
            value={showSubtasks}
            onValueChange={(val) => { setShowSubtasks(!val) }}
          />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
    paddingTop: 80,
  },
  header: {
    fontSize: 32,
    fontWeight: "700",
    marginBottom: 32,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 16,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  label: {
    fontSize: 16,
    fontWeight: "500",
  },
  systemButton: {
    paddingVertical: 16,
  },
  systemText: {
    fontSize: 15,
  },
});
