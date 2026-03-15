import type { Config } from '../types/config.js';

export function resolveUser(config: Config): string {
  return config.user;
}
