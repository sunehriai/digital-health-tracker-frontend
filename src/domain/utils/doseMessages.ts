/**
 * Rotating peppy messages shown after a dose is taken.
 * Each entry has a title and a body generator that accepts the medication name
 * and a showMedName flag (PHI privacy toggle).
 */

interface DoseMessage {
  title: string;
  body: (name: string, show: boolean) => string;
}

const DOSE_MESSAGES: DoseMessage[] = [
  { title: 'Nailed It!', body: (n, s) => s ? `${n} — checked off like a pro.` : 'Checked off like a pro.' },
  { title: 'Ritual Complete', body: (n, s) => s ? `${n}? Handled. You're unstoppable.` : "Handled. You're unstoppable." },
  { title: "You're On It!", body: () => 'One more step toward your best self.' },
  { title: 'Boom, Done!', body: (n, s) => s ? `${n} — done and dusted.` : 'Done and dusted.' },
  { title: 'Nice One!', body: () => 'Your body says thank you.' },
  { title: 'Crushed It!', body: () => 'Consistency is your superpower.' },
  { title: 'Keep Going!', body: (n, s) => s ? `${n} logged — keep that streak alive!` : 'Logged — keep that streak alive!' },
  { title: 'Well Played!', body: () => 'Small act, big impact.' },
  { title: 'All You!', body: () => 'Look at you being all responsible!' },
  { title: 'Locked In!', body: (n, s) => s ? `${n} — you're on a roll.` : "You're on a roll." },
  { title: 'On Fire!', body: () => 'Your future self is cheering right now.' },
  { title: 'Check!', body: (n, s) => s ? `${n} taken. One step closer.` : 'Taken. One step closer.' },
];

let lastIndex = -1;

/**
 * Returns a random dose-success message, avoiding repeating the last one shown.
 * showMedName has NO default — callers must explicitly pass the toggle value.
 */
export function getRandomDoseMessage(medicationName: string, showMedName: boolean): { title: string; body: string } {
  let index: number;
  do {
    index = Math.floor(Math.random() * DOSE_MESSAGES.length);
  } while (index === lastIndex && DOSE_MESSAGES.length > 1);
  lastIndex = index;

  const msg = DOSE_MESSAGES[index];
  return { title: msg.title, body: msg.body(medicationName, showMedName) };
}
