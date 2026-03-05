type MedicationEventType =
  | 'medication_created'
  | 'medication_paused'
  | 'medication_resumed'
  | 'medication_deleted'
  | 'medication_archived'
  | 'medication_restored'
  | 'medication_updated'
  | 'dose_taken'
  | 'dose_reverted'
  | 'all_data_deleted';

type EventCallback = (medicationId: string) => void;

const listeners: Map<MedicationEventType, Set<EventCallback>> = new Map();

export const medicationEvents = {
  on(event: MedicationEventType, callback: EventCallback): () => void {
    if (!listeners.has(event)) {
      listeners.set(event, new Set());
    }
    listeners.get(event)!.add(callback);
    return () => {
      listeners.get(event)?.delete(callback);
    };
  },

  emit(event: MedicationEventType, medicationId: string): void {
    const callbacks = listeners.get(event);
    if (callbacks) {
      callbacks.forEach((cb) => cb(medicationId));
    }
  },

  off(event: MedicationEventType, callback: EventCallback): void {
    listeners.get(event)?.delete(callback);
  },
};
