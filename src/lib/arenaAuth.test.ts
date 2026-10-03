import { describe, expect, it } from 'vitest';
import { arenaReturnPath } from './arenaAuth';

describe('Arena return destinations', () => {
  it.each(['https://evil.example','//evil.example','/\\evil.example','/cyber-arena/../../settings','/cyber-arena/%2e%2e/settings','/settings','/cyber-arena/login','/cyber-arena/reset-password?code=secret',null])('rejects unsafe or looping return: %s', raw => {
    expect(arenaReturnPath(raw)).toBe('/cyber-arena/lobby');
  });
  it('preserves the requested private page and its safe query', () => {
    expect(arenaReturnPath('/cyber-arena/profile?tab=avatar')).toBe('/cyber-arena/profile?tab=avatar');
  });
  it.each(['/cyber-arena/%6cogin', '/cyber-arena/LOGIN', '/cyber-arena/%256cogin', '/cyber-arena/%2e%2e%2fsettings', '/cyber-arena/%'])('rejects encoded auth loops and malformed destinations: %s', raw => {
    expect(arenaReturnPath(raw)).toBe('/cyber-arena/lobby');
  });
});
