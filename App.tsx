import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { SafeAreaProvider } from "react-native-safe-area-context";
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import Toast from 'react-native-toast-message';

import HomeScreen from './screens/HomeScreen';
import SettingsScreen from './screens/SettingsScreen';
import ExploreScreen from './screens/ExploreScreen';
import TransactionsScreen from './screens/TransactionsScreen';
import ImportScreen from './screens/ImportScreen';
import AssistantScreen from './screens/AssistantScreen';
import BudgetGoalsScreen from './screens/BudgetGoalsScreen';
import LoginScreen from './screens/LoginScreen';
import OnboardingScreen from "./screens/OnboardingScreen";
import ImportPDFScreen from './screens/ImportPDFScreen';

import { RootStackParamList } from './types/navigation';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator<RootStackParamList>();

function MainTabs() {
  return (
    <Tab.Navigator
      initialRouteName="Assistant" // Set Assistant as default screen
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarIcon: ({ focused, color, size }) => {
          let iconName;
          let iconSize = size; // Default size

          switch (route.name) {
            case 'Assistant':
              iconName = focused ? 'robot' : 'robot-outline';
              iconSize = size + 10; // Make Assistant icon bigger
              break;
            case 'Home':
              iconName = focused ? 'home' : 'home-outline';
              break;
            case 'Import':
              iconName = focused ? 'plus-circle' : 'plus-circle-outline';
              break;
            default:
              iconName = 'circle';
          }

          return <MaterialCommunityIcons name={iconName as any} size={iconSize} color={color} />;
        },
        tabBarActiveTintColor: '#007AFF',
        tabBarInactiveTintColor: '#666',
        tabBarStyle: {
          borderTopWidth: 0,
          elevation: 0,
          shadowOpacity: 0,
        },
      })}
    >
       <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="Assistant" component={AssistantScreen} />
      <Tab.Screen name="Import" component={ImportScreen} />
    </Tab.Navigator>
  );
}

export default function App() {
  return (
    <NavigationContainer>
      <Stack.Navigator initialRouteName="Onboarding">
        {/* Show Onboarding first */}
        <Stack.Screen 
          name="Onboarding" 
          component={OnboardingScreen} 
          options={{ headerShown: false }} 
        />

        {/* After onboarding, go to Login */}
        <Stack.Screen 
          name="Login" 
          component={LoginScreen} 
          options={{ headerShown: false }} 
        />

        {/* After login, go to the main tabs (Assistant, Home, Import) */}
        <Stack.Screen 
          name="MainTabs" 
          component={MainTabs} 
          options={{ headerShown: false }} 
        />

        {/* Other Screens */}
        <Stack.Screen name="Settings" component={SettingsScreen} />
        <Stack.Screen name="Explore" component={ExploreScreen} />
        <Stack.Screen name="Transactions" component={TransactionsScreen} />
        <Stack.Screen name="ImportPDF" component={ImportPDFScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}