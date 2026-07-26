import type { ComponentProps } from 'react';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { TAB_BAR } from '@/constants/layout';
import { theme } from '@/constants/theme';
import { haptics } from '@/lib/haptics';

function TabIcon({
  name,
  focused,
}: {
  name: ComponentProps<typeof MaterialCommunityIcons>['name'];
  focused: boolean;
}) {
  return (
    <View style={[styles.iconWrap, focused && styles.iconWrapActive]}>
      <MaterialCommunityIcons
        name={name}
        size={22}
        color={focused ? theme.colors.white : theme.colors.tabInactive}
      />
    </View>
  );
}

export default function TabLayout() {
  return (
    <Tabs
      initialRouteName="index"
      screenOptions={{
        headerShown: false,
        tabBarShowLabel: true,
        tabBarActiveTintColor: theme.colors.cedar,
        tabBarInactiveTintColor: theme.colors.tabInactive,
        tabBarLabelStyle: styles.label,
        tabBarStyle: styles.tabBar,
        tabBarItemStyle: styles.tabItem,
      }}
      screenListeners={{
        tabPress: () => {
          void haptics.select();
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ focused }) => (
            <TabIcon name={focused ? 'home-variant' : 'home-variant-outline'} focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="goals"
        options={{
          title: 'Goals',
          tabBarIcon: ({ focused }) => (
            <TabIcon name={focused ? 'bullseye-arrow' : 'bullseye'} focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Settings',
          tabBarIcon: ({ focused }) => (
            <TabIcon name={focused ? 'cog' : 'cog-outline'} focused={focused} />
          ),
        }}
      />
      {/* Hidden legacy routes — open via stack / Home AI button */}
      <Tabs.Screen name="assistant" options={{ href: null }} />
      <Tabs.Screen name="import" options={{ href: null }} />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    position: 'absolute',
    left: TAB_BAR.horizontalInset,
    right: TAB_BAR.horizontalInset,
    bottom: TAB_BAR.bottomOffset,
    height: TAB_BAR.height,
    borderRadius: 28,
    backgroundColor: theme.colors.white,
    borderTopWidth: 0,
    paddingTop: 8,
    paddingBottom: 10,
    ...theme.shadow.soft,
    shadowOpacity: 0.14,
    elevation: 10,
  },
  tabItem: {
    paddingTop: 4,
  },
  label: {
    fontSize: 11,
    fontWeight: '700',
    marginTop: 2,
  },
  iconWrap: {
    width: 42,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconWrapActive: {
    backgroundColor: theme.colors.cedar,
  },
});
