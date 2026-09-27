export function setupStatus(env: Record<string, string | undefined>): {
  checks: { name: string; configured: boolean }[];
  configurationComplete: boolean;
  endToEndVerified: false;
};
