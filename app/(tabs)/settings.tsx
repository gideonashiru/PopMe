import { StyleSheet, Switch, Text, TouchableOpacity, View } from "react-native";
import { useTheme } from "@/context/ThemeContext";
import { Colors } from "@/constants/theme";

export default function Settings() {
    const { themePreference, setThemePreference, activeTheme } = useTheme();

    return (
        <View style={styles.container}>
            <Text style={styles.header}>Settings</Text>

            <View style={styles.section}>
                <Text style={styles.sectionTitle}>Appearance</Text>
                <View style={styles.row}>
                    <Text style={styles.label}>Dark Mode</Text>
                    <Switch
                        value={activeTheme === 'dark'}
                        onValueChange={(val) => setThemePreference(val ? 'dark' : 'light')}
                    />
                </View>
                <TouchableOpacity 
                    style={styles.systemButton} 
                    onPress={() => setThemePreference('system')}
                >
                    <Text style={[styles.systemText, themePreference === 'system' && styles.systemTextActive]}>
                        Use system default
                    </Text>
                </TouchableOpacity>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        padding: 24,
        paddingTop: 80, // Safe area approximation
    },
    header: {
        fontSize: 32,
        fontWeight: '700',
        marginBottom: 32,
    },
    section: {
        marginBottom: 24,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: Colors.light.icon,
        marginBottom: 16,
    },
    row: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 12,
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderColor: Colors.light.border,
    },
    label: {
        fontSize: 16,
        fontWeight: '500',
    },
    systemButton: {
        paddingVertical: 16,
    },
    systemText: {
        fontSize: 15,
        color: Colors.light.icon,
    },
    systemTextActive: {
        color: Colors.light.tint,
        fontWeight: '600',
    }
});