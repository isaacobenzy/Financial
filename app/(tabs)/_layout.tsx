import type { ComponentProps } from 'react';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import { Platform, StyleSheet, View } from 'react-native';
import { TAB_BAR } from '@/constants/layout';
import { theme } from '@/constants/theme';
import { haptics } from '@/lib/haptics';
import { useTabBarHidden } from '@/lib/tabBarVisibility';

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
        size={focused ? 22 : 21}
        color={focused ? theme.colors.cedar : theme.colors.tabInactive}
      />
    </View>
  );
}

export default function TabLayout() {
  const tabBarHidden = useTabBarHidden();

  return (
    <Tabs
      initialRouteName="index"
      screenOptions={{
        headerShown: false,
        tabBarShowLabel: true,
        tabBarActiveTintColor: theme.colors.cedar,
        tabBarInactiveTintColor: theme.colors.tabInactive,
        tabBarLabelStyle: styles.label,
        tabBarStyle: tabBarHidden ? styles.tabBarHidden : styles.tabBar,
        tabBarItemStyle: styles.tabItem,
        tabBarHideOnKeyboard: true,
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
      {/* Hidden legacy route — open via stack / Home actions */}
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
    borderRadius: Platform.OS === 'web' ? 22 : 26,
    backgroundColor: theme.colors.white,
    borderTopWidth: 0,
    borderWidth: 1,
    borderColor: theme.colors.line,
    paddingTop: Platform.OS === 'web' ? 6 : 8,
    paddingBottom: Platform.OS === 'web' ? 8 : 10,
    ...theme.shadow.soft,
    shadowOpacity: Platform.OS === 'web' ? 0.1 : 0.14,
    shadowRadius: Platform.OS === 'web' ? 18 : 16,
    elevation: 10,
  },
  tabBarHidden: {
    display: 'none',
    height: 0,
    opacity: 0,
    overflow: 'hidden',
    borderWidth: 0,
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: -200,
    elevation: 0,
  },
  tabItem: {
    paddingTop: 2,
  },
  label: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.2,
    marginTop: 1,
  },
  iconWrap: {
    width: 44,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconWrapActive: {
    backgroundColor: theme.colors.sage,
  },
});
