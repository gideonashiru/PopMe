import { Tabs, usePathname, useRouter } from "expo-router";
import React, { useState } from "react";
import { View } from "react-native";
import { PillTabBar } from "@/components/PillTabBar";
import { Colors } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";

export const TabBarHeightContext = React.createContext<number>(0);

export default function TabLayout() {
  const colorScheme = useColorScheme();
  const pathname = usePathname();
  const router = useRouter();

  const [tabBarHeight, setTabBarHeight] = useState(0);

  // Parse active tab from pathname
  const activeTab = pathname.includes("completed") ? "completed" : "index";

  return (
    <TabBarHeightContext.Provider value={tabBarHeight}>
      <View style={{ flex: 1 }}>
        <Tabs
          screenOptions={{
            tabBarActiveTintColor: Colors[colorScheme ?? "light"].tint,
            headerShown: false,
            tabBarStyle: {
              display: "none",
            },
          }}
        >
          <Tabs.Screen name="index" options={{ title: "Home" }} />
          <Tabs.Screen name="completed" options={{ title: "Completed" }} />
        </Tabs>

        <PillTabBar
          activeTab={activeTab}
          onTabPress={(tab) => {
            if (tab === "index") {
              router.push("/");
            } else {
              router.push("/completed");
            }
          }}
          onLayout={setTabBarHeight}
        />
      </View>
    </TabBarHeightContext.Provider>
  );
}
