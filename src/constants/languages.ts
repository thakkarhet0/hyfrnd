export type LanguageCode = 'en' | 'hi' | 'gu';

export const SUPPORTED_LANGUAGES: Record<
  LanguageCode,
  { label: string; sarvamCode: string; elevenLabsCode: string }
> = {
  en: { label: 'English', sarvamCode: 'en-IN', elevenLabsCode: 'en' },
  hi: { label: 'हिंदी', sarvamCode: 'hi-IN', elevenLabsCode: 'hi' },
  gu: { label: 'ગુજરાતી', sarvamCode: 'gu-IN', elevenLabsCode: 'gu' },
};

// Code-switched audio (Hindi-English or Gujarati-English mix) uses the user's
// primary language code with Sarvam AI — saarika:v2.5 handles code-switching
// automatically without a separate language_code value.
export const CODE_SWITCHED_SARVAM_CODE = (lang: LanguageCode): string =>
  SUPPORTED_LANGUAGES[lang].sarvamCode;

export const DEFAULT_LANGUAGE: LanguageCode = 'hi';
