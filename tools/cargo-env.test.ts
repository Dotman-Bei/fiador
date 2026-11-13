import { describe, expect, it } from 'vitest';
import { buildCargoEnv, DEFAULT_MINGW_BIN } from './cargo-env';

describe('buildCargoEnv', () => {
  it('leaves non-Windows environments unchanged', () => {
    const env = buildCargoEnv({ platform: 'linux', env: { PATH: '/usr/bin', HOME: '/home/u' }, pathDelimiter: ':' });
    expect(env).toEqual({ PATH: '/usr/bin', HOME: '/home/u' });
  });

  it('appends the default MSYS2 bin and sets prebuilt NASM on Windows', () => {
    const env = buildCargoEnv({ platform: 'win32', env: { Path: 'C:\\Windows' }, pathDelimiter: ';' });
    expect(env['Path']).toBe(`C:\\Windows;${DEFAULT_MINGW_BIN}`);
    expect(env['AWS_LC_SYS_PREBUILT_NASM']).toBe('1');
  });

  it('honours FIADOR_MINGW_BIN and keeps the existing PATH key casing', () => {
    const env = buildCargoEnv({
      platform: 'win32',
      env: { PATH: 'C:\\a', FIADOR_MINGW_BIN: 'D:\\mingw\\bin' },
      pathDelimiter: ';',
    });
    expect(env['PATH']).toBe('C:\\a;D:\\mingw\\bin');
    expect(env['Path']).toBeUndefined();
  });

  it('drops undefined values', () => {
    const env = buildCargoEnv({ platform: 'linux', env: { A: undefined, B: 'b' }, pathDelimiter: ':' });
    expect(env).toEqual({ B: 'b' });
  });
});
