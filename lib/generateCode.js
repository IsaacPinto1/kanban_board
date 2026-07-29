// Generates short, human-typeable board codes: 6 characters, uppercase
// letters + digits, with visually ambiguous characters removed
// (0/O, 1/I/L) so codes are easy to read aloud and type on a phone.
const ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
const CODE_LENGTH = 6;

export function generateBoardCode() {
  let code = '';
  for (let i = 0; i < CODE_LENGTH; i++) {
    code += ALPHABET[Math.floor(Math.random() * ALPHABET.length)];
  }
  return code;
}

// Use when creating a board: keep generating until you get one that
// doesn't already exist (collisions are rare at 32^6 ≈ 1B combinations,
// but check anyway since it's cheap).
export async function generateUniqueBoardCode(supabase) {
  for (let attempt = 0; attempt < 5; attempt++) {
    const code = generateBoardCode();
    const { data } = await supabase
      .from('boards')
      .select('id')
      .eq('code', code)
      .maybeSingle();
    if (!data) return code;
  }
  throw new Error('Could not generate a unique board code, try again');
}
