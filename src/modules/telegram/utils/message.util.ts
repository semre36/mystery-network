/**
 * MYSTERY NETWORK — Telegram Bot Message Templates
 */

export const TELEGRAM_MESSAGES = {
  START_WELCOME:
    "Welcome to MYSTERY NETWORK.\n\n" +
    "Every player knows something.\n" +
    "Nobody knows everything.\n\n" +
    "Enter the investigation network, discover mysterious cases, uncover hidden evidence and work with other investigators to reveal the truth.",

  START_INVITATION_DETECTED: (inviteCode: string) =>
    `\n\n🔍 Squad Invitation Detected: [${inviteCode}]\nYour clearance will be evaluated upon joining.`,

  START_CASE_DETECTED: (caseCode: string) =>
    `\n\n📁 Case Briefing Target: [${caseCode}]\nCase files are ready for investigation.`,

  HELP:
    "🕵️ *MYSTERY NETWORK — Terminal Guide*\n\n" +
    "Available operations:\n" +
    "/start — Access the network and initialize terminal\n" +
    "/play — Open the interactive investigation platform\n" +
    "/profile — Access your investigator dossier\n" +
    "/about — Learn about the collaborative investigation platform\n" +
    "/help — Display this command reference",

  ABOUT:
    "🌐 *MYSTERY NETWORK*\n\n" +
    "A global collaborative detective investigation platform.\n\n" +
    "Operatives receive asymmetric clues, encrypted documents, and intercepted transmissions. No single investigator holds the complete solution.\n\n" +
    "Form squads, cross-reference findings, solve interactive puzzles, and build collaborative evidence boards to resolve complex episodic mysteries.",

  PLAY_UNAVAILABLE:
    "⚠️ The investigation network interface is currently being prepared.\n\n" +
    "Live operations will commence shortly. Stay tuned for deployment.",

  PROFILE_INFO:
    "📂 *INVESTIGATOR PROFILE*\n\n" +
    "Your investigator dossier, clearance level, detective rank, and solved case archive will be managed directly inside the Telegram Mini App.\n\n" +
    "Launch the Mini App using /play to inspect your credentials once live.",
};
