'use client';
import { createContext, useContext } from 'react';
import type { Role } from '@dacy/shared';

interface AdminCtx {
  role: Role;
  isAdmin: boolean;
}
const Ctx = createContext<AdminCtx>({ role: 'INSTRUCTOR', isAdmin: false });

/** Cari istifadəçinin rolunu admin UI-nin client hissələrinə ötürür */
export function AdminProvider({ role, children }: { role: Role; children: React.ReactNode }) {
  return <Ctx.Provider value={{ role, isAdmin: role === 'ADMIN' }}>{children}</Ctx.Provider>;
}
export const useAdmin = () => useContext(Ctx);
