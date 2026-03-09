/**
 * Rotating peppy messages shown after a dose is taken.
 * Each entry has a title and a body generator that accepts the medication name.
 */

interface DoseMessage {
  title: string;
  body: (name: string) => string;
}

const DOSE_MESSAGES: DoseMessage[] = [
  { title: 'Nailed It!', body: (n) => `${n} — checked off like a pro.` },
  { title: 'Ritual Complete', body: (n) => `${n}? Handled. You're unstoppable.` },
  { title: "You're On It!", body: () => 'One more step toward your best self.' },
  { title: 'Boom, Done!', body: (n) => `${n} — done and dusted.` },
  { title: 'Nice One!', body: () => 'Your body says thank you.' },
  { title: 'Crushed It!', body: () => 'Consistency is your superpower.' },
  { title: 'Keep Going!', body: (n) => `${n} logged — keep that streak alive!` },
  { title: 'Well Played!', body: () => 'Small act, big impact.' },
  { title: 'All You!', body: () => 'Look at you being all responsible!' },
  { title: 'Locked In!', body: (n) => `You + ${n} = dream team.` },
  { title: 'On Fire!', body: () => 'Your future self is cheering right now.' },
  { title: 'Check!', body: (n) => `${n} taken. One step closer.` },
];

let lastIndex = -1;

/**
 * Returns a random dose-success message, avoiding repeating the last one shown.
 */
export function getRandomDoseMessage(medicationName: string): { title: string; body: string } {
  let index: number;
  do {
    index = Math.floor(Math.random() * DOSE_MESSAGES.length);
  } while (index === lastIndex && DOSE_MESSAGES.length > 1);
  lastIndex = index;

  const msg = DOSE_MESSAGES[index];
  return { title: msg.title, body: msg.body(medicationName) };
}
