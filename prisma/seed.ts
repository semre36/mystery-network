import {
  PrismaClient,
  ContentStatus,
  CaseDifficulty,
  PlayMode,
  ClueType,
  ClueStrategy,
  AssetType,
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
  const chapter2 = await prisma.caseChapter.upsert({
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

  // Benchmark Case Characters
  const existingCharacters = await prisma.caseCharacter.findMany({
    where: { caseId: benchmarkCase.id },
  });

  if (existingCharacters.length === 0) {
    await prisma.caseCharacter.createMany({
      data: [
        {
          caseId: benchmarkCase.id,
          name: "Dr. Elena Vance",
          description:
            "Senior telecommunications specialist stationed at Zurich Relay 7. Discovered the initial anomalous carrier signal before transmission dropped.",
          metadata: {
            role: "Chief Systems Architect",
            clearance: "TOP SECRET",
            location: "Zurich Relay Station",
          },
        },
        {
          caseId: benchmarkCase.id,
          name: "Marcus Thorne",
          description:
            "Logistics coordinator on duty during the 03:00 UTC blackout. Access card was recorded at terminal TERM-ZR-07 ten minutes prior to override.",
          metadata: {
            role: "Nightshift Operations Controller",
            clearance: "RESTRICTED",
            location: "Zurich Sector B",
          },
        },
      ],
    });
  }

  // ----------------------------------------------------------------------------
  // 4. Benchmark Clues & Forensic Evidence (Phase 08)
  // ----------------------------------------------------------------------------
  const benchmarkClues = [
    {
      clueCode: "EVID-ZR-01",
      chapterId: chapter1.id,
      title: "Zurich Server Terminal Log",
      description:
        "A partially corrupted console dump recovered from Zurich Relay 7 showing unauthorized access override.",
      content: {
        timestamp: "02:58:14 UTC",
        event: "OVERRIDE_AUTH_FAILURE",
        terminalId: "TERM-ZR-07",
        operatorBadge: "BADGE-REDACTED-99",
        gateway: "TRANSMISSION_PRIMARY_GATEWAY",
        subsystem: "CORE_COMM_ROUTER",
        notes: "Emergency lockout bypassed using an unregistered cryptographic dongle.",
      },
      clueType: ClueType.DOCUMENT,
      assignmentStrategy: ClueStrategy.ASYMMETRIC_EXCLUSIVE,
      visibilityConfig: { classification: "RESTRICTED", role: "LEAD_INVESTIGATOR" },
      isShareable: true,
      status: ContentStatus.PUBLISHED,
    },
    {
      clueCode: "EVID-ZR-02",
      chapterId: chapter1.id,
      title: "Sub-Station Power Telemetry Graph",
      description:
        "Forensic sensor readings indicating deliberate manual disengagement of secondary auxiliary generator.",
      content: {
        sector: "Zurich Grid 4B",
        peakDropTime: "02:59:02 UTC",
        voltageLossPercent: 94.2,
        manualOverrideTripped: true,
        auxiliaryDieselSwitchedOff: true,
        forensicNote:
          "The blackout was not an external line failure. The circuit breaker interlock was manually opened from inside Sector B.",
      },
      clueType: ClueType.PHOTOGRAPH,
      assignmentStrategy: ClueStrategy.ALL_PLAYERS,
      visibilityConfig: { classification: "CONFIDENTIAL" },
      isShareable: true,
      status: ContentStatus.PUBLISHED,
      asset: {
        assetType: AssetType.IMAGE,
        storageObjectKey: "evidence/CASE-001/EVID-ZR-02/telemetry_chart.png",
        fileName: "substation_telemetry_chart.png",
        mimeType: "image/png",
        fileSizeBytes: BigInt(245120),
        metadata: { width: 1200, height: 800, sensor: "GridSens-IV" },
      },
    },
    {
      clueCode: "EVID-ZR-03",
      chapterId: chapter1.id,
      title: "Forensic Audio Log: Relay Comm Channel 4",
      description:
        "An 18-second intercepted radio transmission on the tactical backup frequency during blackout onset.",
      content: {
        frequency: "442.850 MHz",
        recordedAt: "02:59:45 UTC",
        durationSeconds: 18,
        transcript:
          "Relay control, this is unit 4... [pneumatic hiss] ...carrier signal redirected to relay point Echo-7. Erase the buffer now.",
        voicePrintAnalysis:
          "Synthetic scrambler detected. Background acoustics match server chamber ventilation.",
      },
      clueType: ClueType.AUDIO_LOG,
      assignmentStrategy: ClueStrategy.ASYMMETRIC_EXCLUSIVE,
      visibilityConfig: { classification: "SECRET" },
      isShareable: true,
      status: ContentStatus.PUBLISHED,
      asset: {
        assetType: AssetType.AUDIO,
        storageObjectKey: "evidence/CASE-001/EVID-ZR-03/comm_channel_4.wav",
        fileName: "relay_comm_ch4_snippet.wav",
        mimeType: "audio/wav",
        fileSizeBytes: BigInt(524288),
        metadata: { duration: 18, bitrate: 256, channels: 1 },
      },
    },
    {
      clueCode: "EVID-ZR-04",
      chapterId: chapter2.id,
      title: "Badge Access Records: Sector B Corridor",
      description:
        "Electronic lock timestamps for the high-security corridor leading directly to the primary carrier relay.",
      content: {
        doorId: "DOOR-SEC-02B",
        window: "02:15:00 - 03:00:00 UTC",
        swipes: [
          {
            time: "02:15:22",
            holder: "Dr. Elena Vance",
            badge: "EV-0012",
            action: "ENTRY_GRANTED",
          },
          { time: "02:40:11", holder: "Dr. Elena Vance", badge: "EV-0012", action: "EXIT_GRANTED" },
          { time: "02:50:04", holder: "Marcus Thorne", badge: "MT-0089", action: "ENTRY_GRANTED" },
          {
            time: "02:57:33",
            holder: "UNKNOWN GUEST",
            badge: "BADGE-99-GUEST",
            action: "ENTRY_OVERRIDE",
          },
        ],
        discrepancy: "No exit swipe recorded for Marcus Thorne prior to facility lockdown.",
      },
      clueType: ClueType.DOCUMENT,
      assignmentStrategy: ClueStrategy.ALL_PLAYERS,
      visibilityConfig: { classification: "TOP_SECRET" },
      isShareable: true,
      status: ContentStatus.PUBLISHED,
    },
    {
      clueCode: "EVID-ZR-05",
      chapterId: chapter2.id,
      title: "Chemical Residue Analysis: Relay Casing",
      description:
        "Gas chromatography mass spectrometry findings from swab samples taken off terminal TERM-ZR-07.",
      content: {
        sampleId: "SWAB-ZR-07A",
        analysisMethod: "GC-MS Spectrometry",
        primaryCompound: "Fluorosilicone-VX polymer",
        application: "High-temperature military electronic waterproof sealant",
        conclusion:
          "Classified export restriction; restricted to specialized clandestine communications units.",
      },
      clueType: ClueType.FORENSIC_ITEM,
      assignmentStrategy: ClueStrategy.ASYMMETRIC_EXCLUSIVE,
      visibilityConfig: { classification: "SECRET" },
      isShareable: true,
      status: ContentStatus.PUBLISHED,
    },
  ];

  for (const c of benchmarkClues) {
    const { asset, ...clueData } = c;

    const savedClue = await prisma.clue.upsert({
      where: {
        caseId_clueCode: {
          caseId: benchmarkCase.id,
          clueCode: c.clueCode,
        },
      },
      update: {
        title: clueData.title,
        description: clueData.description,
        content: clueData.content,
        clueType: clueData.clueType,
        assignmentStrategy: clueData.assignmentStrategy,
        visibilityConfig: clueData.visibilityConfig,
        isShareable: clueData.isShareable,
        status: clueData.status,
      },
      create: {
        caseId: benchmarkCase.id,
        ...clueData,
      },
    });

    if (asset) {
      await prisma.evidenceAsset.upsert({
        where: { storageObjectKey: asset.storageObjectKey },
        update: {
          clueId: savedClue.id,
          fileName: asset.fileName,
          mimeType: asset.mimeType,
          fileSizeBytes: asset.fileSizeBytes,
          metadata: asset.metadata,
        },
        create: {
          clueId: savedClue.id,
          ...asset,
        },
      });
    }
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
