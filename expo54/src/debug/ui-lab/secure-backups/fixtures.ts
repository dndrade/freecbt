const RECOVERY_KEY_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
const GROUP_LENGTH = 4;
const GROUP_COUNT = 4;

function randomGroup(): string {
  let group = "";
  for (let i = 0; i < GROUP_LENGTH; i++) {
    group += RECOVERY_KEY_ALPHABET[Math.floor(Math.random() * RECOVERY_KEY_ALPHABET.length)];
  }
  return group;
}

export function generateMockRecoveryKey(): string {
  return Array.from({ length: GROUP_COUNT }, randomGroup).join("-");
}
