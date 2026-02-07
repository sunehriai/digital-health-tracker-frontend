import React, { useCallback, useMemo, useRef } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import GorhomBottomSheet, { BottomSheetBackdrop, BottomSheetView } from '@gorhom/bottom-sheet';
import type { BottomSheetBackdropProps } from '@gorhom/bottom-sheet';
import { colors } from '../theme/colors';

interface BottomSheetProps {
  title?: string;
  snapPoints?: (string | number)[];
  children: React.ReactNode;
  onClose?: () => void;
}

export default React.forwardRef<GorhomBottomSheet, BottomSheetProps>(function BottomSheet(
  { title, snapPoints: customSnapPoints, children, onClose },
  ref,
) {
  const snapPoints = useMemo(() => customSnapPoints || ['40%', '70%'], [customSnapPoints]);

  const renderBackdrop = useCallback(
    (props: BottomSheetBackdropProps) => (
      <BottomSheetBackdrop {...props} disappearsOnIndex={-1} appearsOnIndex={0} opacity={0.6} />
    ),
    [],
  );

  return (
    <GorhomBottomSheet
      ref={ref}
      index={-1}
      snapPoints={snapPoints}
      enablePanDownToClose
      backdropComponent={renderBackdrop}
      onChange={(index) => { if (index === -1) onClose?.(); }}
      backgroundStyle={styles.background}
      handleIndicatorStyle={styles.indicator}
    >
      <BottomSheetView style={styles.content}>
        {title && <Text style={styles.title}>{title}</Text>}
        {children}
      </BottomSheetView>
    </GorhomBottomSheet>
  );
});

const styles = StyleSheet.create({
  background: {
    backgroundColor: colors.bgCard,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
  indicator: { backgroundColor: colors.textMuted, width: 40 },
  content: { padding: 20 },
  title: { color: colors.textPrimary, fontSize: 18, fontWeight: '600', marginBottom: 16 },
});
