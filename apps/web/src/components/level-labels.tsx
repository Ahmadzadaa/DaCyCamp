'use client';
import { createContext, useContext } from 'react';
import { az, type LevelLabels } from '@dacy/shared';

const Ctx = createContext<LevelLabels>({ ...az.level });

/** Səviyyə adlarını (admin dəyişə bilir) client komponentlərinə ötürür — root layout doldurur */
export function LevelLabelsProvider({
  labels,
  children,
}: {
  labels: LevelLabels;
  children: React.ReactNode;
}) {
  return <Ctx.Provider value={labels}>{children}</Ctx.Provider>;
}
export const useLevelLabels = () => useContext(Ctx);
