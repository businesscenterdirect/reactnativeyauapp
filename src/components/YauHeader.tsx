import React from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';

interface YauHeaderProps {
  subtitle?: string;
}

export function YauHeader({ subtitle }: YauHeaderProps) {
  return (
    <View style={styles.container}>
      <View style={styles.logoRow}>
        <Image
          source={require('../../assets/favicon.png')}
          style={styles.logoIcon}
          resizeMode="contain"
        />
        <Text style={styles.logoText}>YAU SPORTS</Text>
      </View>
      {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    paddingTop: 16,
    paddingBottom: 16,
  },
  logoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  logoIcon: {
    width: 44,
    height: 44,
  },
  logoText: {
    fontSize: 26,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 1,
  },
  subtitle: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 13,
    fontWeight: '500',
    marginTop: 4,
  },
});
