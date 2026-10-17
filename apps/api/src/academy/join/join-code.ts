import { randomInt } from 'node:crypto';
import { ACADEMY_JOIN_CODE_ALPHABET, ACADEMY_JOIN_CODE_LENGTH } from '@dacy/shared';
import type { PrismaService } from '../../prisma/prisma.service';

/** Kriptoqrafik təsadüfi qoşulma kodu (Math.random deyil) */
export function generateJoinCode(): string {
  let s = '';
  for (let i = 0; i < ACADEMY_JOIN_CODE_LENGTH; i++)
    s += ACADEMY_JOIN_CODE_ALPHABET[randomInt(ACADEMY_JOIN_CODE_ALPHABET.length)];
  return s;
}

/** Bazada olmayan kod; toqquşma ehtimalı ~10⁻¹² olsa da yoxlanılır */
export async function uniqueJoinCode(prisma: Pick<PrismaService, 'academyGroup'>): Promise<string> {
  for (let i = 0; i < 5; i++) {
    const code = generateJoinCode();
    const taken = await prisma.academyGroup.findUnique({
      where: { joinCode: code },
      select: { id: true },
    });
    if (!taken) return code;
  }
  throw new Error('could not generate a unique join code');
}
