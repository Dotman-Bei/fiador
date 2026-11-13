export function flag(argv: readonly string[], name: string): string | undefined {
  const i = argv.indexOf(`--${name}`);
  if (i < 0) return undefined;
  const value = argv[i + 1];
  if (value === undefined || value.startsWith('--')) throw new Error(`--${name} needs a value`);
  return value;
}

export function hasFlag(argv: readonly string[], name: string): boolean {
  return argv.includes(`--${name}`);
}
