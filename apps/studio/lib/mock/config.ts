// True when running against the in-app mock backend (no Supabase platform, no external captcha).
export const IS_MOCK_BACKEND = process.env.NEXT_PUBLIC_MOCK_BACKEND === 'true'
