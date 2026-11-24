import type { ScreenInput } from './screens.dto.js';

export const SCREENS_REPOSITORY = Symbol('ScreensRepository');
export type Screen = ScreenInput & { id: number };

export interface ScreensRepository {
  screens(): Promise<Screen[]>;
  screen(key: string): Promise<Screen | undefined>;
  addScreen(input: ScreenInput): Promise<number | null>;
}
