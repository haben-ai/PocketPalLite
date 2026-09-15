import React, {useEffect, useState} from 'react';
import {Platform, StyleSheet, Text, View} from 'react-native';
import DeviceInfo from 'react-native-device-info';
import {spacing} from '../theme';
import {useTheme} from '../theme/ThemeContext';
import {AppScreen} from '../navigation/types';
import {AIPalScaffold} from '../components/AIPalScaffold';
import {SettingSection} from '../components/SettingSection';
import {SettingRow} from '../components/SettingRow';
import {PrimaryButton} from '../components/PrimaryButton';
import {Card} from '../components/Card';
import {AppIconMark} from '../components/AppIconMark';
import packageJson from '../../package.json';

type DeviceIds = {
  applicationName: string;
  model: string;
  brand: string;
  systemVersion: string;
};

/**
 * A real "About this app" page: actual installed app identity (name,
 * version) read from the native platform via react-native-device-info, not
 * hardcoded strings that could drift from what's really installed -- plus
 * the same on-device-only privacy fact already stated in Settings.
 */
export function AppInfoScreen({onNavigate}: {onNavigate: (screen: AppScreen) => void}) {
  const {typography} = useTheme();
  const [device, setDevice] = useState<DeviceIds | null>(null);

  useEffect(() => {
    setDevice({
      applicationName: DeviceInfo.getApplicationName(),
      model: DeviceInfo.getModel(),
      brand: DeviceInfo.getBrand(),
      systemVersion: DeviceInfo.getSystemVersion(),
    });
  }, []);

  const appName = device?.applicationName ?? packageJson.name;

  return (
    <AIPalScaffold scroll onBack={() => onNavigate({name: 'chat'})}>
      <View style={styles.hero}>
        <View style={styles.iconWrap}>
          <AppIconMark size={72} />
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
            label={Platform.OS === 'android' ? 'Android version' : 'iOS version'}
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

      <SettingSection title="Legal">
        <SettingRow
          bare
          label="Open Source Licenses"
          description="Every third-party package this app is built with, and its license."
          control={
            <PrimaryButton
              label="View"
              variant="secondary"
              onPress={() => onNavigate({name: 'openSourceLicenses'})}
            />
          }
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
  iconWrap: {marginBottom: spacing.sm},
  appName: {textAlign: 'center'},
  tagline: {textAlign: 'center', marginTop: 4},
  footerCard: {marginTop: spacing.xs, marginBottom: spacing.xl},
  footerText: {lineHeight: 18, textAlign: 'center'},
});
