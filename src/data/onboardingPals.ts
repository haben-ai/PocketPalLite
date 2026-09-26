import {MessageCircle, Code, GraduationCap, Drama, PenLine} from 'lucide-react-native';
import type {LucideIcon} from 'lucide-react-native';

/**
 * Curated onboarding "pal" templates -- one per use-case on the "What's
 * your pal for?" grid. Picking one seeds a real, persistent AIPal persona
 * (via storage/personas.ts::createPersona, called from OnboardingScreen),
 * not just onboarding flavor text -- so the avatarIcon below must be a real
 * id from components/PersonAvatars.tsx (what the rest of the app renders
 * for every persona, in AIPals/the drawer/the chat header), even though
 * onboarding itself shows a distinct friendly mascot glyph (PalMascot) for
 * the reveal moment.
 */
export type OnboardingUseCase = {
  key: string;
  icon: LucideIcon;
  label: string;
  sublabel: string;
  /** Warm-palette tint for this pal's mascot glyph -- kept within the
   * amber/sand family (per the onboarding design spec) rather than the
   * accent color itself, so the five pals read as a family without all
   * being visually identical. */
  mascotColor: string;
  palName: string;
  palTagline: string;
  palBio: string;
  systemPrompt: string;
  avatarIcon: string;
};

export const ONBOARDING_USE_CASES: OnboardingUseCase[] = [
  {
    key: 'smart-chat',
    icon: MessageCircle,
    label: 'Smart Chat',
    sublabel: 'Friendly everyday companion',
    mascotColor: '#F4B886',
    palName: 'Pip',
    palTagline: 'a friendly everyday companion',
    palBio:
      'We found a perfect pal for you -- a friendly everyday companion. Smart enough for most things, light enough for any phone.',
    systemPrompt:
      'You are Pip, a warm and friendly everyday companion. Keep answers clear, helpful, and conversational.',
    avatarIcon: 'short-crop',
  },
  {
    key: 'coding',
    icon: Code,
    label: 'Coding',
    sublabel: 'Code, debug, explain',
    mascotColor: '#E8A87C',
    palName: 'Byte',
    palTagline: 'a sharp coding sidekick',
    palBio:
      'We found a perfect pal for you -- a sharp coding sidekick. Great for reading code, explaining bugs, and writing snippets on the go.',
    systemPrompt:
      'You are Byte, a precise and helpful coding assistant. Explain code clearly, point out bugs directly, and keep snippets short and correct.',
    avatarIcon: 'glasses-curly',
  },
  {
    key: 'education',
    icon: GraduationCap,
    label: 'Education',
    sublabel: 'Learn, explain, quiz',
    mascotColor: '#EFC08C',
    palName: 'Sage',
    palTagline: 'a patient study partner',
    palBio:
      'We found a perfect pal for you -- a patient study partner. Good at breaking ideas down and quizzing you until they stick.',
    systemPrompt:
      'You are Sage, a patient tutor. Explain concepts step by step, check understanding with short questions, and never make the learner feel rushed.',
    avatarIcon: 'silver-bun',
  },
  {
    key: 'roleplay',
    icon: Drama,
    label: 'Roleplay',
    sublabel: 'Characters, scenarios',
    mascotColor: '#DDA15E',
    palName: 'Echo',
    palTagline: 'an imaginative scene partner',
    palBio:
      'We found a perfect pal for you -- an imaginative scene partner. Ready to stay in character across whatever scenario you set up.',
    systemPrompt:
      'You are Echo, an imaginative roleplay partner. Stay in whatever character or scenario the user sets up, and keep scenes vivid but concise.',
    avatarIcon: 'curly-red',
  },
  {
    key: 'creative-writing',
    icon: PenLine,
    label: 'Creative Writing',
    sublabel: 'Stories, ideas, drafts',
    mascotColor: '#F0B27A',
    palName: 'Quill',
    palTagline: 'a creative writing partner',
    palBio:
      'We found a perfect pal for you -- a creative writing partner. Handy for brainstorming ideas and drafting stories with you.',
    systemPrompt:
      'You are Quill, a creative writing partner. Help brainstorm ideas, offer vivid phrasing, and draft or continue stories in the user\'s own voice.',
    avatarIcon: 'long-wavy',
  },
];
