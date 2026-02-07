import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthContext, useAuthProvider } from './ui/hooks/useAuth';
import { AIUploadProvider } from './data/contexts/AIUploadContext';
import AppNavigator from './ui/navigation/AppNavigator';

export default function App() {
  const auth = useAuthProvider();

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <AuthContext.Provider value={auth}>
          <AIUploadProvider>
            <AppNavigator />
            {/* Environment Indicator */}
            <View style={styles.envIndicator}>
              <Text style={styles.envText}>I am using React Native</Text>
            </View>
          </AIUploadProvider>
        </AuthContext.Provider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  envIndicator: {
    position: 'absolute',
    top: 50,
    right: 8,
    backgroundColor: 'rgba(0, 209, 255, 0.2)',
    borderWidth: 1,
    borderColor: 'rgba(0, 209, 255, 0.4)',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
    zIndex: 9999,
  },
  envText: {
    fontFamily: 'Inter',
    fontSize: 10,
    fontWeight: '600',
    color: '#00D1FF',
    letterSpacing: 0.5,
  },
});
