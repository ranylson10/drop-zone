export const env = {
  baseURL:
    process.env.TEST_BASE_URL ||
    process.env.PLAYWRIGHT_BASE_URL ||
    'http://127.0.0.1:3000',
  email: process.env.TEST_EMAIL || '',
  password: process.env.TEST_PASSWORD || '',
  projectId: process.env.STREAM_PROJECT_ID || '9a3e3008-bbd3-4ac0-b305-f86a49769a94',
  streamKey: process.env.STREAM_KEY || '69024fb8fa82fb357933ccf2da7c5d8cf769',
  campeonatoId: process.env.CAMPEONATO_ID || 'fb7ab6ce-fa18-4eed-af53-76977c14d412',
  expectedTeamRegex: process.env.EXPECT_TEAM_REGEX || 'ALOE|RED WAVE|TEAM|EQUIPE',
  strictDb: process.env.EXPECT_DB_STRICT === 'true',
};

export function hasLoginCredentials() {
  return Boolean(env.email && env.password);
}

export function appUrl(path: string) {
  return new URL(path, env.baseURL).toString();
}
