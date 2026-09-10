import React, {useEffect, useState} from 'react';
import {StyleSheet, Text, TouchableOpacity, View} from 'react-native';
import {radius, spacing} from '../theme';
import {useTheme} from '../theme/ThemeContext';
import {AppScreen} from '../navigation/types';
import {getDownloadedModels} from '../storage/modelRegistry';
import {HomeIcon, GridIcon, MaskIcon, MoreIcon, PlusIcon} from './Icons';

/** Which tab reads as "active" for a given current screen -- everything
 * that doesn't get its own tab slot (Discover/Benchmark/Settings/App Info/
 * Open Source Licenses) falls under "more", since that's where they're
 * actually reached from. */
function activeTabFor(screenName: AppScreen['name']): 'chat' | 'models' | 'aipals' | 'more' {
  if (screenName === 'chat' || screenName === 'models' || screenName === 'aipals') {
    return screenName;
  }
  return 'more';
}

/**
 * Persistent bottom navigation: Chat / Models / New Chat (center, elevated)
 * / AIPals / More. Lives in RootNavigator as a flex sibling of whichever
 * screen is current (not absolutely positioned over it), so every screen
 * -- including Chat's own keyboard-avoiding composer -- simply gets less
 * total height to lay out in rather than needing its own bottom padding to
 * avoid being covered.
 */
export function BottomTabBar({
  current,
  onNavigate,
}: {
  current: AppScreen['name'];
  onNavigate: (screen: AppScreen) => void;
}) {
  const {colors, typography} = useTheme();
  const active = activeTabFor(current);
  const [firstDownloadedModelId, setFirstDownloadedModelId] = useState<string | null>(null);

  useEffect(() => {
    getDownloadedModels().then(models => setFirstDownloadedModelId(models[0]?.modelId ?? null));
  }, [current]);

  const handleNewChat = () => {
    if (firstDownloadedModelId) {
      // modelId with no conversationId -- ChatTabScreen's own mount effect
      // reads this as "start a fresh conversation with this model" rather
      // than resuming the most recent one.
      onNavigate({name: 'chat', modelId: firstDownloadedModelId});
    } else {
      onNavigate({name: 'models'});
    }
  };

  const tabs: {key: 'chat' | 'models' | 'aipals' | 'more'; label: string; icon: React.ReactNode; onPress: () => void}[] = [
    {
      key: 'chat',
      label: 'Chat',
      icon: <HomeIcon size={22} color={active === 'chat' ? colors.accent : colors.textSecondary} />,
      onPress: () => onNavigate({name: 'chat'}),
    },
    {
      key: 'models',
      label: 'Models',
      icon: <GridIcon size={22} color={active === 'models' ? colors.accent : colors.textSecondary} />,
      onPress: () => onNavigate({name: 'models'}),
    },
    {
      key: 'aipals',
      label: 'AIPals',
      icon: <MaskIcon size={22} color={active === 'aipals' ? colors.accent : colors.textSecondary} />,
      onPress: () => onNavigate({name: 'aipals'}),
    },
    {
      key: 'more',
      label: 'More',
      icon: <MoreIcon size={22} color={active === 'more' ? colors.accent : colors.textSecondary} />,
      onPress: () => onNavigate({name: 'more'}),
    },
  ];

  return (
    <View
      style={[
        styles.bar,
        {backgroundColor: colors.background, borderTopColor: colors.outlineVariant},
      ]}>
      {tabs.slice(0, 2).map(tab => (
        <TouchableOpacity key={tab.key} style={styles.tab} onPress={tab.onPress} hitSlop={4}>
          {tab.icon}
          <Text
            style={[typography.small, styles.label, {color: active === tab.key ? colors.accent : colors.textSecondary}]}>
            {tab.label}
          </Text>
        </TouchableOpacity>
      ))}

      <View style={styles.centerSlot}>
        <TouchableOpacity
          onPress={handleNewChat}
          activeOpacity={0.85}
          style={[styles.centerButton, {backgroundColor: colors.accent}]}
          accessibilityLabel="New chat">
          <PlusIcon size={26} color={colors.onAccent} />
        </TouchableOpacity>
      </View>

      {tabs.slice(2).map(tab => (
        <TouchableOpacity key={tab.key} style={styles.tab} onPress={tab.onPress} hitSlop={4}>
          {tab.icon}
          <Text
            style={[typography.small, styles.label, {color: active === tab.key ? colors.accent : colors.textSecondary}]}>
            {tab.label}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    borderTopWidth: 1,
    paddingTop: 6,
    paddingBottom: 6,
    paddingHorizontal: spacing.xs,
  },
  tab: {flex: 1, alignItems: 'center', justifyContent: 'center', gap: 2, paddingVertical: 4},
  label: {fontSize: 11, fontWeight: '600'},
  centerSlot: {flex: 1, alignItems: 'center', justifyContent: 'center'},
  centerButton: {
    width: 52,
    height: 52,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -20,
  },
});
