export type SuggestedTask = {label: string; prompt: string};

export const SUGGESTED_TASKS: SuggestedTask[] = [
  {label: 'Explain something simply', prompt: 'Explain quantum computing like I\'m 12 years old.'},
  {label: 'Draft a message', prompt: 'Write a polite message asking my landlord to fix a leaking tap.'},
  {label: 'Brainstorm ideas', prompt: 'Give me 5 unique gift ideas for a friend who loves hiking.'},
  {label: 'Summarize a topic', prompt: 'Summarize the main causes of the French Revolution in 3 bullet points.'},
  {label: 'Practice a language', prompt: 'Let\'s have a simple conversation in Spanish. Start us off.'},
  {label: 'Debug some code', prompt: 'Why might a React useEffect run twice in development mode?'},
];

export const OFFLINE_CAPABILITY_CALLOUTS: {emoji: string; title: string; body: string}[] = [
  {
    emoji: '📡',
    title: 'Works with zero signal',
    body: 'Once a model is downloaded, chat works completely offline -- no wifi or data needed.',
  },
  {
    emoji: '🔒',
    title: 'Nothing leaves your phone',
    body: 'Every message stays on-device. There is no server this app talks to for chat.',
  },
  {
    emoji: '🖼️',
    title: 'Vision models read images and PDFs',
    body: 'Some models can describe photos or read a PDF page -- look for the Vision badge in Models.',
  },
];
