import {
  PrismaClient,
  ContentStatus,
  CaseDifficulty,
  PlayMode,
  ClueType,
  ClueStrategy,
  PuzzleType,
  AchievementCategory,
} from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Starting idempotent database seeding for MYSTERY NETWORK...");

  // ----------------------------------------------------------------------------
  // 1. Administrative Roles & Permissions
  // ----------------------------------------------------------------------------
  const permissions = [
    { action: "cases:create", description: "Author new mystery case definitions" },
    { action: "cases:publish", description: "Publish cases to the live network" },
    { action: "users:moderate", description: "Suspend or review player accounts" },
    { action: "audit:view", description: "Inspect administrative audit logs" },
  ];

  for (const perm of permissions) {
    await prisma.adminPermission.upsert({
      where: { action: perm.action },
      update: { description: perm.description },
      create: perm,
    });
  }

  const superAdminRole = await prisma.adminRole.upsert({
    where: { name: "SUPER_ADMIN" },
    update: { description: "Unrestricted platform governance" },
    create: {
      name: "SUPER_ADMIN",
      description: "Unrestricted platform governance",
    },
  });

  const allPerms = await prisma.adminPermission.findMany();
  for (const perm of allPerms) {
    await prisma.adminRolePermission.upsert({
      where: {
        roleId_permissionId: {
          roleId: superAdminRole.id,
          permissionId: perm.id,
        },
      },
      update: {},
      create: {
        roleId: superAdminRole.id,
        permissionId: perm.id,
      },
    });
  }

  // ----------------------------------------------------------------------------
  // 2. Platform Core Achievements
  // ----------------------------------------------------------------------------
  const achievements = [
    {
      code: "FIRST_LEAD",
      title: "First Contact",
      description: "Inspect and examine your first forensic clue in any investigation.",
      category: AchievementCategory.DEDUCTION,
      criteria: { type: "CLUES_VIEWED", count: 1 },
    },
    {
      code: "CIPHER_BREAKER",
      title: "Cryptanalyst",
      description: "Successfully solve an encrypted terminal or cipher minigame.",
      category: AchievementCategory.PUZZLES,
      criteria: { type: "PUZZLES_SOLVED", count: 1 },
    },
    {
      code: "SQUAD_SYNERGY",
      title: "Shared Intelligence",
      description: "Share classified evidence with a fellow squad investigator.",
      category: AchievementCategory.TEAMWORK,
      criteria: { type: "EVIDENCE_SHARED", count: 1 },
    },
    {
      code: "MASTER_SLEUTH",
      title: "Flawless Indictment",
      description: "Submit a case theory achieving 100% deduction accuracy.",
      category: AchievementCategory.DEDUCTION,
      criteria: { type: "ACCURACY_PERFECT", count: 1 },
    },
  ];

  for (const ach of achievements) {
    await prisma.achievement.upsert({
      where: { code: ach.code },
      update: {
        title: ach.title,
        description: ach.description,
        category: ach.category,
        criteria: ach.criteria,
      },
      create: ach,
    });
  }

  // ----------------------------------------------------------------------------
  // 3. Fictional Showcase Campaign & Case Content
  // ----------------------------------------------------------------------------
  const campaign = await prisma.campaign.upsert({
    where: { slug: "project-midnight" },
    update: {
      title: "Project Midnight: The Syndicate Archives",
      description:
        "A series of connected espionage cases tracking an unidentified rogue intelligence network.",
      status: ContentStatus.PUBLISHED,
    },
    create: {
      slug: "project-midnight",
      title: "Project Midnight: The Syndicate Archives",
      description:
        "A series of connected espionage cases tracking an unidentified rogue intelligence network.",
      status: ContentStatus.PUBLISHED,
    },
  });

  const benchmarkCase = await prisma.case.upsert({
    where: { caseCode: "CASE-001-MIDNIGHT-PROTOCOL" },
    update: {
      campaignId: campaign.id,
      title: "The Midnight Protocol",
      description:
        "At 03:00 UTC, a secure relay station in Zurich stopped broadcasting. Investigators must decipher fragmented logs and uncover the mole.",
      difficulty: CaseDifficulty.MEDIUM,
      estimatedDurationMinutes: 45,
      minPlayers: 1,
      maxPlayers: 4,
      supportedPlayModes: [PlayMode.SOLO, PlayMode.COOPERATIVE],
      status: ContentStatus.PUBLISHED,
      publishedAt: new Date("2026-01-15T00:00:00Z"),
    },
    create: {
      caseCode: "CASE-001-MIDNIGHT-PROTOCOL",
      campaignId: campaign.id,
      title: "The Midnight Protocol",
      description:
        "At 03:00 UTC, a secure relay station in Zurich stopped broadcasting. Investigators must decipher fragmented logs and uncover the mole.",
      difficulty: CaseDifficulty.MEDIUM,
      estimatedDurationMinutes: 45,
      minPlayers: 1,
      maxPlayers: 4,
      supportedPlayModes: [PlayMode.SOLO, PlayMode.COOPERATIVE],
      status: ContentStatus.PUBLISHED,
      publishedAt: new Date("2026-01-15T00:00:00Z"),
    },
  });

  // Chapter 1: The Zurich Blackout
  const chapter1 = await prisma.caseChapter.upsert({
    where: {
      caseId_chapterOrder: {
        caseId: benchmarkCase.id,
        chapterOrder: 1,
      },
    },
    update: {
      title: "Chapter 1: The Zurich Blackout",
      description: "Analyze the initial telemetry and determine the vector of infiltration.",
      status: ContentStatus.PUBLISHED,
    },
    create: {
      caseId: benchmarkCase.id,
      chapterOrder: 1,
      title: "Chapter 1: The Zurich Blackout",
      description: "Analyze the initial telemetry and determine the vector of infiltration.",
      status: ContentStatus.PUBLISHED,
    },
  });

  // Chapter 2: Echoes in the Static
  await prisma.caseChapter.upsert({
    where: {
      caseId_chapterOrder: {
        caseId: benchmarkCase.id,
        chapterOrder: 2,
      },
    },
    update: {
      title: "Chapter 2: Echoes in the Static",
      description: "Cross-reference the employee access logs with the emergency power logs.",
      status: ContentStatus.PUBLISHED,
      unlockConfig: { requiredChapter: 1 },
    },
    create: {
      caseId: benchmarkCase.id,
      chapterOrder: 2,
      title: "Chapter 2: Echoes in the Static",
      description: "Cross-reference the employee access logs with the emergency power logs.",
      status: ContentStatus.PUBLISHED,
      unlockConfig: { requiredChapter: 1 },
    },
  });

  // Benchmark Clue
  const existingClues = await prisma.clue.findMany({
    where: { caseId: benchmarkCase.id, title: "Zurich Server Terminal Log" },
  });

  if (existingClues.length === 0) {
    await prisma.clue.create({
      data: {
        caseId: benchmarkCase.id,
        chapterId: chapter1.id,
        title: "Zurich Server Terminal Log",
        description: "A partially corrupted console dump recovered from Zurich Relay 7.",
        content: {
          timestamp: "02:58:14 UTC",
          event: "OVERRIDE_AUTH_FAILURE",
          terminalId: "TERM-ZR-07",
          operatorBadge: "BADGE-REDACTED-99",
        },
        clueType: ClueType.DOCUMENT,
        assignmentStrategy: ClueStrategy.ASYMMETRIC_EXCLUSIVE,
        isShareable: true,
        status: ContentStatus.PUBLISHED,
      },
    });
  }

  // Benchmark Puzzle
  const existingPuzzles = await prisma.puzzle.findMany({
    where: { caseId: benchmarkCase.id, title: "Relay Console Cipher" },
  });

  if (existingPuzzles.length === 0) {
    await prisma.puzzle.create({
      data: {
        caseId: benchmarkCase.id,
        chapterId: chapter1.id,
        title: "Relay Console Cipher",
        description: "A 4-step Caesar rotation found scribbled on the terminal casing.",
        puzzleType: PuzzleType.CIPHER,
        difficulty: CaseDifficulty.EASY,
        configuration: {
          cipherType: "CAESAR",
          shift: 4,
          encodedPrompt: "LIPPS ASVPH",
        },
        solutionHash: "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
        status: ContentStatus.PUBLISHED,
      },
    });
  }

  console.log("✅ Idempotent database seeding completed successfully.");
}

main()
  .catch((e) => {
    console.error("❌ Seeding failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
