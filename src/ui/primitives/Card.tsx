import React from 'react';
import { View, ViewStyle } from 'react-native';
import { useTheme } from '../theme/ThemeContext';

interface CardProps {
  children: React.ReactNode;
  style?: ViewStyle;
}

export default function Card({ children, style }: CardProps) {
  const { cardStyle } = useTheme();
  return (
    <View style={[cardStyle, { padding: 16 }, style]}>
      {children}
    </View>
  );
}
