import {
  DarkTheme,
  DefaultTheme,
  ThemeProvider,
} from "@react-navigation/native";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import "react-native-reanimated";
import { GestureHandlerRootView } from "react-native-gesture-handler";

import { useColorScheme } from "@/hooks/use-color-scheme";
import { CompletedProvider } from "@/store/completed-context";
import { TasksProvider } from "@/store/tasks-context";
import { ThemeProvider as AppThemeProvider } from "@/context/ThemeContext";

export const unstable_settings = {
  anchor: "(tabs)",
};

export default function RootLayout() {
  const colorScheme = useColorScheme();

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <AppThemeProvider>
        <ThemeProvider value={colorScheme === "dark" ? DarkTheme : DefaultTheme}>
          <TasksProvider>
            <CompletedProvider>
              <Stack>
                <Stack.Screen name="(tabs)" options={{ headerShown: false }} />

              </Stack>
              <StatusBar style="auto" animated={true} />
            </CompletedProvider>
          </TasksProvider>
        </ThemeProvider>
      </AppThemeProvider>
    </GestureHandlerRootView>
  );
}
