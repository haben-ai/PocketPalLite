import React, {useEffect, useState} from 'react';
import {StyleSheet, Text, View} from 'react-native';
import DeviceInfo from 'react-native-device-info';
import {radius, spacing} from '../theme';
import {useTheme} from '../theme/ThemeContext';
import {AppScreen} from '../navigation/types';
import {AIPalScaffold} from '../components/AIPalScaffold';
import {SettingSection} from '../components/SettingSection';
import {SettingRow} from '../components/SettingRow';
import {Card} from '../components/Card';
import packageJson from '../../package.json';

type DeviceIds = {
  applicationName: string;
  bundleId: string;
  buildNumber: string;
  model: string;
  brand: string;
  systemVersion: string;
};

/**
 * A real "About this app" page: actual installed app identity (name,
 * version, build, package id) read from the native platform via
 * react-native-device-info, not hardcoded strings that could drift from
 * what's really installed -- plus the same on-device-only privacy fact
 * already stated in Settings, and honest credit to the underlying engine.
 */
export function AppInfoScreen({onNavigate}: {onNavigate: (screen: AppScreen) => void}) {
  const {colors, typography} = useTheme();
  const [device, setDevice] = useState<DeviceIds | null>(null);

  useEffect(() => {
    setDevice({
      applicationName: DeviceInfo.getApplicationName(),
      bundleId: DeviceInfo.getBundleId(),
      buildNumber: DeviceInfo.getBuildNumber(),
      model: DeviceInfo.getModel(),
      brand: DeviceInfo.getBrand(),
      systemVersion: DeviceInfo.getSystemVersion(),
    });
  }, []);

  const appName = device?.applicationName ?? packageJson.name;

  return (
    <AIPalScaffold scroll onBack={() => onNavigate({name: 'chat'})}>
      <View style={styles.hero}>
        <View style={[styles.iconTile, {backgroundColor: colors.surfaceContainerHigh}]}>
          <Text style={styles.iconGlyph}>🐾</Text>
        </View>
        <Text style={[typography.title, styles.appName]}>{appName}</Text>
        <Text style={[typography.caption, styles.tagline]}>
          A private, on-device AI chat companion.
        </Text>
      </View>

      <SettingSection title="Version">
        <SettingRow
          bare
          label="App version"
          control={<Text style={typography.caption}>{packageJson.version}</Text>}
        />
        {device && (
          <SettingRow
            bare
            label="Build number"
            control={<Text style={typography.caption}>{device.buildNumber}</Text>}
          />
        )}
        {device && (
          <SettingRow
            bare
            label="Package"
            control={<Text style={typography.caption}>{device.bundleId}</Text>}
          />
        )}
      </SettingSection>

      {device && (
        <SettingSection title="This device">
          <SettingRow
            bare
            label="Device"
            control={<Text style={typography.caption}>{`${device.brand} ${device.model}`}</Text>}
          />
          <SettingRow
            bare
            label="Android version"
            control={<Text style={typography.caption}>{device.systemVersion}</Text>}
          />
        </SettingSection>
      )}

      <SettingSection title="Privacy">
        <SettingRow
          bare
          label="Everything runs on-device"
          description="Chats and models never leave your phone. There is no server this app talks to for chat."
          control={<View />}
        />
      </SettingSection>

      <SettingSection title="Built with">
        <SettingRow
          bare
          label="llama.cpp"
          description="On-device inference, via the llama.rn bridge."
          control={<View />}
        />
        <SettingRow
          bare
          label="React Native"
          description="Cross-platform app framework."
          control={<View />}
        />
      </SettingSection>

      <Card style={styles.footerCard}>
        <Text style={[typography.caption, styles.footerText]}>
          Model weights are downloaded from their original publishers (e.g. Hugging Face) and run
          entirely on this device.
        </Text>
      </Card>
    </AIPalScaffold>
  );
}

const styles = StyleSheet.create({
  hero: {alignItems: 'center', marginBottom: spacing.lg, marginTop: spacing.sm},
  iconTile: {
    width: 72,
    height: 72,
    borderRadius: radius.xl,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  iconGlyph: {fontSize: 34},
  appName: {textAlign: 'center'},
  tagline: {textAlign: 'center', marginTop: 4},
  footerCard: {marginTop: spacing.xs, marginBottom: spacing.xl},
  footerText: {lineHeight: 18, textAlign: 'center'},
});
