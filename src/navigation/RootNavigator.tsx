import React from 'react';
import {Text} from 'react-native';
import {enableScreens} from 'react-native-screens';
import {createBottomTabNavigator} from '@react-navigation/bottom-tabs';
import {colors} from '../theme';
import {RootTabParamList} from './types';
import {ChatTabScreen} from '../screens/ChatTabScreen';
import {ModelsTabScreen} from '../screens/ModelsTabScreen';
import {AIPalsTabScreen} from '../screens/AIPalsTabScreen';
import {DiscoverTabScreen} from '../screens/DiscoverTabScreen';
import {SettingsTabScreen} from '../screens/SettingsTabScreen';

enableScreens();

const Tab = createBottomTabNavigator<RootTabParamList>();

const TAB_ICONS: Record<keyof RootTabParamList, string> = {
  Chat: '💬',
  Models: '📦',
  AIPals: '🎭',
  Discover: '✨',
  Settings: '⚙️',
};

export function RootNavigator() {
  return (
    <Tab.Navigator
      screenOptions={({route}) => ({
        headerShown: false,
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarStyle: {
          backgroundColor: colors.surfaceContainerLow,
          borderTopColor: colors.outlineVariant,
          borderTopWidth: 1,
        },
        tabBarIcon: ({color}) => (
          <Text style={{fontSize: 20, color}}>
            {TAB_ICONS[route.name as keyof RootTabParamList]}
          </Text>
        ),
      })}>
      <Tab.Screen name="Chat" component={ChatTabScreen} />
      <Tab.Screen name="Models" component={ModelsTabScreen} />
      <Tab.Screen name="AIPals" component={AIPalsTabScreen} />
      <Tab.Screen name="Discover" component={DiscoverTabScreen} />
      <Tab.Screen name="Settings" component={SettingsTabScreen} />
    </Tab.Navigator>
  );
}
