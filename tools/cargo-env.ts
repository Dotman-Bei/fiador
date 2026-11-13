export interface CargoEnvInput {
  platform: string;
  env: Record<string, string | undefined>;
  pathDelimiter: string;
}

/** MSYS2's mingw64 bin holds dlltool.exe, as.exe and gcc.exe, which host unit tests need on the Windows GNU host. */
export const DEFAULT_MINGW_BIN = 'C:\\msys64\\mingw64\\bin';

/**
 * The environment for a cargo child process. On Windows it APPENDS the MSYS2 bin to PATH (so it never shadows
 * rustup's cargo or rustc) and sets AWS_LC_SYS_PREBUILT_NASM=1 because NASM is not installed. Elsewhere it is a copy.
 */
export function buildCargoEnv(input: CargoEnvInput): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [key, value] of Object.entries(input.env)) {
    if (value !== undefined) out[key] = value;
  }
  if (input.platform !== 'win32') return out;
  const configured = out['FIADOR_MINGW_BIN'];
  const mingw = configured !== undefined && configured.length > 0 ? configured : DEFAULT_MINGW_BIN;
  const pathKey = Object.keys(out).find((k) => k.toUpperCase() === 'PATH') ?? 'Path';
  const current = out[pathKey] ?? '';
  out[pathKey] = current.length > 0 ? `${current}${input.pathDelimiter}${mingw}` : mingw;
  out['AWS_LC_SYS_PREBUILT_NASM'] = '1';
  return out;
}
