import React, { createContext, useContext, useState, useCallback } from 'react';
import CustomAlert from '../components/CustomAlert';

export type AlertType = 'success' | 'error' | 'warning' | 'info' | 'confirm' | 'destructive';

export interface AlertOptions {
  title: string;
  message?: string;
  messageContent?: React.ReactNode;
  type?: AlertType;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm?: () => void;
  onCancel?: () => void;
}

interface AlertContextValue {
  showAlert: (options: AlertOptions) => void;
}

const AlertContext = createContext<AlertContextValue | null>(null);

export function useAlert(): AlertContextValue {
  const ctx = useContext(AlertContext);
  if (!ctx) {
    throw new Error('useAlert must be used within AlertProvider');
  }
  return ctx;
}

export function AlertProvider({ children }: { children: React.ReactNode }) {
  const [visible, setVisible] = useState(false);
  const [options, setOptions] = useState<AlertOptions | null>(null);

  const showAlert = useCallback((opts: AlertOptions) => {
    setOptions(opts);
    setVisible(true);
  }, []);

  const handleConfirm = useCallback(() => {
    setVisible(false);
    options?.onConfirm?.();
    setOptions(null);
  }, [options]);

  const handleCancel = useCallback(() => {
    setVisible(false);
    options?.onCancel?.();
    setOptions(null);
  }, [options]);

  const handleDismiss = useCallback(() => {
    setVisible(false);
    // For notification-type alerts (no onConfirm), treat dismiss same as confirm
    // For confirmation alerts, treat dismiss as cancel
    if (options?.onConfirm) {
      options?.onCancel?.();
    }
    setOptions(null);
  }, [options]);

  // Determine if this is a confirmation-style alert (has onConfirm callback)
  const isConfirmation = !!options?.onConfirm;

  return (
    <AlertContext.Provider value={{ showAlert }}>
      {children}
      <CustomAlert
        visible={visible}
        title={options?.title ?? ''}
        message={options?.message}
        messageContent={options?.messageContent}
        type={options?.type ?? 'info'}
        confirmLabel={options?.confirmLabel}
        cancelLabel={options?.cancelLabel}
        isConfirmation={isConfirmation}
        onConfirm={handleConfirm}
        onCancel={handleCancel}
        onDismiss={handleDismiss}
      />
    </AlertContext.Provider>
  );
}
