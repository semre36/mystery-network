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
  // 1. Administrative Roles & Permissions (Phase 13)
  // ----------------------------------------------------------------------------
  const permissions = [
    { action: "DASHBOARD_VIEW", description: "View administrative overview dashboard and metrics" },
    { action: "USER_VIEW", description: "Inspect registered player dossiers and profiles" },
    { action: "USER_UPDATE", description: "Update player operational metadata and settings" },
    { action: "USER_SUSPEND", description: "Temporarily suspend player investigation access" },
    { action: "USER_BAN", description: "Permanently ban malicious actors from the platform" },
    { action: "ROLE_VIEW", description: "Inspect administrative roles and assignments" },
    { action: "ROLE_CREATE", description: "Define new operational administrator roles" },
    { action: "ROLE_UPDATE", description: "Modify role permissions and parameters" },
    {
      action: "ROLE_ASSIGN",
      description: "Assign or revoke administrative roles on user accounts",
    },
    { action: "CAMPAIGN_VIEW", description: "Inspect published and draft campaigns" },
    { action: "CAMPAIGN_CREATE", description: "Author new campaign story arcs" },
    { action: "CAMPAIGN_UPDATE", description: "Edit campaign metadata, briefing, and covers" },
    { action: "CAMPAIGN_PUBLISH", description: "Publish or unpublish campaigns on the network" },
    { action: "CAMPAIGN_ARCHIVE", description: "Archive completed or decommissioned campaigns" },
    { action: "CASE_VIEW", description: "Inspect all cases including drafts and review states" },
    { action: "CASE_CREATE", description: "Author new mystery case scenarios" },
    {
      action: "CASE_UPDATE",
      description: "Edit case briefings, difficulty, duration, and structure",
    },
    {
      action: "CASE_MANAGE_SOLUTION",
      description: "Read, edit, and configure protected case solution configs and answers",
    },
    { action: "CASE_PUBLISH", description: "Publish cases to the operative network" },
    { action: "CASE_ARCHIVE", description: "Archive cases from public discovery" },
    { action: "CHAPTER_MANAGE", description: "Create, reorder, and configure case acts/chapters" },
    {
      action: "CHARACTER_MANAGE",
      description: "Author fictional case suspects and persons of interest",
    },
    { action: "EVIDENCE_VIEW", description: "Inspect forensic clues and evidence distribution" },
    { action: "EVIDENCE_CREATE", description: "Author new forensic clues and attach media assets" },
    {
      action: "EVIDENCE_UPDATE",
      description: "Edit clue parameters, types, and distribution policies",
    },
    { action: "EVIDENCE_DELETE", description: "Decommission or delete unassigned forensic clues" },
    {
      action: "PUZZLE_VIEW",
      description: "Inspect interactive ciphers, codes, and logic challenges",
    },
    {
      action: "PUZZLE_CREATE",
      description: "Author new interactive puzzle minigames and multi-stage challenges",
    },
    { action: "PUZZLE_UPDATE", description: "Configure puzzle cipher text, hints, and parameters" },
    {
      action: "PUZZLE_MANAGE_SECRET",
      description: "Inspect and update protected puzzle secret configurations and answer hashes",
    },
    { action: "PUZZLE_DELETE", description: "Delete puzzle challenges from chapters" },
    {
      action: "INVESTIGATION_VIEW",
      description: "Monitor active and completed investigation sessions",
    },
    {
      action: "INVESTIGATION_MANAGE",
      description: "Manage investigation states and operational overrides",
    },
    {
      action: "ACHIEVEMENT_MANAGE",
      description: "Configure platform milestone accolades and criteria",
    },
    {
      action: "REWARD_MANAGE",
      description: "Inspect XP ledgers and execute audited XP adjustments",
    },
    {
      action: "ANALYTICS_VIEW",
      description: "Inspect aggregated operational analytics and telemetry",
    },
    { action: "AUDIT_LOG_VIEW", description: "Audit administrative actions and security history" },
    {
      action: "SYSTEM_SETTINGS_MANAGE",
      description: "Configure platform operational parameters and maintenance modes",
    },
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
    update: { description: "Unrestricted platform governance & all permissions" },
    create: {
      name: "SUPER_ADMIN",
      description: "Unrestricted platform governance & all permissions",
    },
  });

  const caseAuthorRole = await prisma.adminRole.upsert({
    where: { name: "CASE_AUTHOR" },
    update: {
      description: "Storyline architect: author campaigns, cases, chapters, clues, and puzzles",
    },
    create: {
      name: "CASE_AUTHOR",
      description: "Storyline architect: author campaigns, cases, chapters, clues, and puzzles",
    },
  });

  const moderatorRole = await prisma.adminRole.upsert({
    where: { name: "MODERATOR" },
    update: {
      description: "Community moderator: manage players, view sessions, and monitor audit logs",
    },
    create: {
      name: "MODERATOR",
      description: "Community moderator: manage players, view sessions, and monitor audit logs",
    },
  });

  const allPerms = await prisma.adminPermission.findMany();
  for (const perm of allPerms) {
    // SUPER_ADMIN gets all permissions
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

    // CASE_AUTHOR gets CMS creation permissions (excluding protected solution secrets)
    if (
      (perm.action.startsWith("CAMPAIGN_") ||
        perm.action.startsWith("CASE_") ||
        perm.action === "CHAPTER_MANAGE" ||
        perm.action === "CHARACTER_MANAGE" ||
        perm.action.startsWith("EVIDENCE_") ||
        perm.action.startsWith("PUZZLE_") ||
        perm.action === "DASHBOARD_VIEW") &&
      perm.action !== "CASE_MANAGE_SOLUTION" &&
      perm.action !== "PUZZLE_MANAGE_SECRET"
    ) {
      await prisma.adminRolePermission.upsert({
        where: {
          roleId_permissionId: {
            roleId: caseAuthorRole.id,
            permissionId: perm.id,
          },
        },
        update: {},
        create: {
          roleId: caseAuthorRole.id,
          permissionId: perm.id,
        },
      });
    }

    // MODERATOR gets player management and monitoring permissions
    if (
      perm.action.startsWith("USER_") ||
      perm.action.startsWith("INVESTIGATION_") ||
      perm.action === "AUDIT_LOG_VIEW" ||
      perm.action === "DASHBOARD_VIEW"
    ) {
      await prisma.adminRolePermission.upsert({
        where: {
          roleId_permissionId: {
            roleId: moderatorRole.id,
            permissionId: perm.id,
          },
        },
        update: {},
        create: {
          roleId: moderatorRole.id,
          permissionId: perm.id,
        },
      });
    }
  }

  // Seed default system settings
  const defaultSettings = [
    {
      key: "maintenance_mode",
      value: { enabled: false, message: "System is undergoing scheduled maintenance." },
      description: "Toggles network-wide maintenance mode lock",
    },
    {
      key: "platform_config",
      value: {
        platformName: "MYSTERY NETWORK",
        defaultCaseVisibility: "PUBLISHED",
        allowPublicRegistration: true,
      },
      description: "Global operational settings and defaults",
    },
  ];

  for (const setting of defaultSettings) {
    await prisma.systemSetting.upsert({
      where: { key: setting.key },
      update: { description: setting.description },
      create: setting,
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
    {
      code: "FIRST_CASE_SOLVED",
      title: "Case Closed",
      description: "Successfully solve your first operational mystery case.",
      category: AchievementCategory.DEDUCTION,
      criteria: { type: "CASES_SOLVED", count: 1 },
    },
    {
      code: "PERFECT_INVESTIGATION",
      title: "Mastermind Deduction",
      description: "Achieve a perfect score of 90+ on an official case indictment.",
      category: AchievementCategory.DEDUCTION,
      criteria: { type: "SCORE_THRESHOLD", minScore: 90 },
    },
    {
      code: "EVIDENCE_EXPERT",
      title: "Forensic Mastery",
      description:
        "Cite all essential supporting clues and account for all contradictory evidence.",
      category: AchievementCategory.DEDUCTION,
      criteria: { type: "EVIDENCE_ACCURACY", fullMatch: true },
    },
    {
      code: "MASTER_DETECTIVE",
      title: "Senior Operative",
      description: "Attain Senior Detective rank clearance (Level 7+).",
      category: AchievementCategory.DEDUCTION,
      criteria: { type: "MIN_LEVEL", level: 7 },
    },
    {
      code: "TEAM_PLAYER",
      title: "Taskforce Victorious",
      description: "Close a criminal conspiracy in cooperative squad play.",
      category: AchievementCategory.TEAMWORK,
      criteria: { type: "COOPERATIVE_SOLVE", count: 1 },
    },
    {
      code: "PUZZLE_SPECIALIST",
      title: "Cryptographic Vanguard",
      description: "Successfully solve all security cipher challenges in an investigation.",
      category: AchievementCategory.PUZZLES,
      criteria: { type: "ALL_PUZZLES_SOLVED", count: 1 },
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

  // Seed Phase 12 Solution Configuration on benchmark case
  const primeSuspect = await prisma.caseCharacter.findFirst({
    where: { caseId: benchmarkCase.id, name: "Marcus Thorne" },
  });

  if (primeSuspect) {
    await prisma.case.update({
      where: { id: benchmarkCase.id },
      data: {
        solutionConfig: {
          primaryCharacterId: primeSuspect.id,
          primaryCharacterName: "Marcus Thorne",
          motiveKeywords: [
            "sabotage",
            "carrier redirect",
            "rogue network",
            "blackout",
            "exfiltration",
          ],
          methodKeywords: [
            "terminal override",
            "cryptographic dongle",
            "breaker interlock",
            "sector b",
            "manual override",
          ],
          timelineKeywords: ["02:50", "02:58", "03:00", "02:59"],
          requiredSupportingClueCodes: ["EVID-ZR-01", "EVID-ZR-02", "EVID-ZR-04"],
          requiredContradictingClueCodes: ["EVID-ZR-03"],
          scoringCriteria: {
            primarySuspectWeight: 30,
            motiveWeight: 15,
            methodWeight: 15,
            timelineWeight: 15,
            supportingEvidenceWeight: 15,
            contradictingEvidenceWeight: 10,
            maxScore: 100,
            passScore: 60,
            perfectScore: 90,
          },
          rewards: {
            baseXP: 250,
            perfectBonusXP: 150,
            firstSolveBonusXP: 100,
          },
        },
      },
    });
  }
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

  // ----------------------------------------------------------------------------
  // 5. Benchmark Interactive Puzzles & Investigation Challenges (Phase 10)
  // ----------------------------------------------------------------------------
  console.log("🧩 Seeding benchmark puzzles and challenge stages for CASE-001...");

  // Import hashing utility dynamically for seed execution
  const { hashAnswer, normalizeAnswer } = await import("../src/modules/puzzles/utils/crypto.util");

  const benchmarkPuzzles = [
    {
      caseId: benchmarkCase.id,
      chapterId: chapter1.id,
      title: "The Shifted Message",
      description: "Decipher the intercepted transmission by rotating the characters.",
      instructions:
        "A short intercepted message from Zurich Relay 7. The frequency technician noted that the sender uses a standard Caesar cipher rotation.",
      puzzleType: PuzzleType.CAESAR_CIPHER,
      difficulty: CaseDifficulty.EASY,
      order: 1,
      isMultiStage: false,
      maxAttempts: 5,
      publicConfiguration: {
        ciphertext: "KHOOR ZRUOG",
        shiftHint: "A classical 3-step Caesar offset.",
        notes: "Intercepted at 02:58 UTC on the maintenance frequency.",
      },
      secretConfiguration: {
        shift: 3,
        solution: "HELLO WORLD",
      },
      solutionHash: hashAnswer(
        normalizeAnswer("HELLO WORLD", { stripPunctuation: true, collapseWhitespace: true })
      ),
      status: ContentStatus.PUBLISHED,
      hints: [
        {
          hintOrder: 1,
          title: "Historical Context",
          content:
            "Julius Caesar favored this simple offset technique to protect military communications.",
          unlockConditions: { minAttempts: 1 },
        },
        {
          hintOrder: 2,
          title: "Shift Direction",
          content:
            "Try shifting each letter backwards by 3 positions in the alphabet (e.g. K -> H, H -> E, O -> L).",
          unlockConditions: { minAttempts: 2 },
        },
      ],
    },
    {
      caseId: benchmarkCase.id,
      chapterId: chapter1.id,
      title: "The Broken Alphabet",
      description:
        "Crack the monoalphabetic substitution cipher extracted from the relay RAM buffer.",
      instructions:
        "The intruder scrambled the buffer using a 1-to-1 character substitution. Frequency analysis indicates common single words and standard English patterns.",
      puzzleType: PuzzleType.SUBSTITUTION_CIPHER,
      difficulty: CaseDifficulty.MEDIUM,
      order: 2,
      isMultiStage: false,
      maxAttempts: 5,
      publicConfiguration: {
        ciphertext: "ZIT JXOEA WKGVF YGB",
        substitutionHint:
          "A monoalphabetic substitution where each character consistently maps to another letter.",
        partialClues: { Z: "T", I: "H", T: "E" },
      },
      secretConfiguration: {
        solution: "THE QUICK BROWN FOX",
        substitutionAlphabet: "QWERTYUIOPASDFGHJKLZXCVBNM",
      },
      solutionHash: hashAnswer(
        normalizeAnswer("THE QUICK BROWN FOX", { stripPunctuation: true, collapseWhitespace: true })
      ),
      status: ContentStatus.PUBLISHED,
      hints: [
        {
          hintOrder: 1,
          title: "Common Digraphs",
          content:
            "The three-letter word 'ZIT' translates to the most common English article 'THE'.",
          unlockConditions: { minAttempts: 1 },
        },
        {
          hintOrder: 2,
          title: "Pangram Motif",
          content: "The decoded sentence is a famous English pangram starting with 'THE QUICK...'.",
          unlockConditions: { minAttempts: 2 },
        },
      ],
    },
    {
      caseId: benchmarkCase.id,
      chapterId: chapter2.id,
      title: "The Operator's Key",
      description:
        "A polyalphabetic cipher protecting the emergency comms channel. Decrypt using the operative's callsign.",
      instructions:
        "A Vigenère cipher was employed to scramble the backup dispatch channel. Intelligence reports indicate the passphrase is the callsign of the rogue operator.",
      puzzleType: PuzzleType.VIGENERE_CIPHER,
      difficulty: CaseDifficulty.HARD,
      order: 3,
      isMultiStage: false,
      maxAttempts: 5,
      publicConfiguration: {
        ciphertext: "SATDQG SADDKJ",
        keywordLength: 6,
        keywordHint:
          "The keyword is the operative's tactical callsign, meaning a dark silhouette cast by light.",
      },
      secretConfiguration: {
        keyword: "SHADOW",
        solution: "ATTACK AT DAWN",
      },
      solutionHash: hashAnswer(
        normalizeAnswer("ATTACK AT DAWN", { stripPunctuation: true, collapseWhitespace: true })
      ),
      status: ContentStatus.PUBLISHED,
      hints: [
        {
          hintOrder: 1,
          title: "Keyword Length",
          content: "The keyword contains 6 letters. Every 6th letter uses the same shift.",
          unlockConditions: { minAttempts: 1 },
        },
        {
          hintOrder: 2,
          title: "Callsign Decrypted",
          content:
            "The keyword is 'SHADOW'. Apply Vigenère decryption with SHADOW to recover the command 'ATTACK AT DAWN'.",
          unlockConditions: { minAttempts: 2 },
        },
      ],
    },
    {
      caseId: benchmarkCase.id,
      chapterId: chapter2.id,
      title: "The Midnight Sequence",
      description:
        "Reconstruct the chronological timeline of suspects entering Sector B based on physical sensor telemetry.",
      instructions:
        "Sensor logs were scrambled during the power surge. Review the physical evidence timestamps and order the suspects in the exact sequence they crossed the Sector B perimeter.",
      puzzleType: PuzzleType.LOGIC_CHALLENGE,
      difficulty: CaseDifficulty.MEDIUM,
      order: 4,
      isMultiStage: false,
      maxAttempts: 5,
      publicConfiguration: {
        items: [
          { id: "SUSPECT_A", label: "Suspect A (Dr. Elena Vance - Systems Architect)" },
          { id: "SUSPECT_B", label: "Suspect B (Relay Technician - Night Shift)" },
          { id: "SUSPECT_C", label: "Suspect C (Unidentified Courier - Guest Badge)" },
          { id: "SUSPECT_D", label: "Suspect D (Marcus Thorne - Operations Controller)" },
        ],
        clues: [
          "The Relay Technician (B) was logged on site first to conduct routine diagnostics.",
          "Marcus Thorne (D) entered Sector B immediately following the technician.",
          "Dr. Vance (A) checked in after Thorne to investigate telemetry anomalies.",
          "The Unidentified Courier (C) forced entry last right before the blackout at 02:57 UTC.",
        ],
      },
      secretConfiguration: {
        targetSequence: ["SUSPECT_B", "SUSPECT_D", "SUSPECT_A", "SUSPECT_C"],
        solution: "SUSPECT_B,SUSPECT_D,SUSPECT_A,SUSPECT_C",
      },
      solutionHash: hashAnswer(
        normalizeAnswer("SUSPECT_B,SUSPECT_D,SUSPECT_A,SUSPECT_C", { stripWhitespace: true })
      ),
      status: ContentStatus.PUBLISHED,
      hints: [
        {
          hintOrder: 1,
          title: "Initial Access",
          content: "Suspect B entered first during routine diagnostics.",
          unlockConditions: { minAttempts: 1 },
        },
        {
          hintOrder: 2,
          title: "Breach Timeline",
          content:
            "The final entry was the unidentified courier (Suspect C) just prior to the blackout. Sequence: B -> D -> A -> C.",
          unlockConditions: { minAttempts: 2 },
        },
      ],
    },
    {
      caseId: benchmarkCase.id,
      chapterId: chapter2.id,
      title: "The Classified Terminal",
      description:
        "A multi-layered defense gateway on the main server console. Overcome the security layers in sequence.",
      instructions:
        "The terminal TERM-ZR-07 is locked behind a two-stage cryptographic gate. Pass the security PIN verification in Stage 1, then authorize the terminal using the master token in Stage 2.",
      puzzleType: PuzzleType.MULTI_STAGE,
      difficulty: CaseDifficulty.HARD,
      order: 5,
      isMultiStage: true,
      maxAttempts: 5,
      publicConfiguration: {
        totalStages: 2,
        terminalId: "TERM-ZR-07",
        securityProtocol: "DEFENSE-GATEWAY-V3",
      },
      secretConfiguration: {
        finalGate: true,
      },
      solutionHash: "MULTI_STAGE_PUZZLE",
      status: ContentStatus.PUBLISHED,
      hints: [
        {
          hintOrder: 1,
          title: "Telemetry Inspection",
          content:
            "Check the telemetry graph metadata: the voltage loss percent was 94.2 and grid sector was 4B.",
          unlockConditions: { minAttempts: 1 },
        },
        {
          hintOrder: 2,
          title: "Token Suffix",
          content: "The terminal token format begins with 'TRM-' followed by 9921.",
          unlockConditions: { minAttempts: 2 },
        },
      ],
      stages: [
        {
          stageOrder: 1,
          title: "Stage 1: Security PIN Override",
          instructions:
            "Enter the 4-digit auxiliary generator emergency PIN deduced from the telemetry report.",
          puzzleType: PuzzleType.ACCESS_CODE,
          publicConfiguration: {
            prompt: "Enter 4-digit numeric override PIN.",
            codeFormat: "####",
          },
          secretConfiguration: {
            solution: "7492",
            codeFormat: "PIN",
          },
          solutionHash: hashAnswer(normalizeAnswer("7492")),
          maxAttempts: 5,
        },
        {
          stageOrder: 2,
          title: "Stage 2: Mainframe Terminal Token",
          instructions: "Provide the alphanumeric authorization code assigned to terminal ZR-07.",
          puzzleType: PuzzleType.ACCESS_CODE,
          publicConfiguration: {
            prompt: "Enter alphanumeric authorization token in format TRM-XXXX.",
            codeFormat: "TRM-####",
          },
          secretConfiguration: {
            solution: "TRM-9921",
            codeFormat: "ALPHANUMERIC",
          },
          solutionHash: hashAnswer(
            normalizeAnswer("TRM-9921", { stripPunctuation: false, collapseWhitespace: true })
          ),
          maxAttempts: 5,
        },
      ],
    },
  ];

  for (const p of benchmarkPuzzles) {
    const { hints, stages, ...puzzleData } = p as any;
    puzzleData.configuration = puzzleData.publicConfiguration ?? {};

    let existing = await prisma.puzzle.findFirst({
      where: {
        caseId: p.caseId,
        title: p.title,
      },
    });

    let puzzleRecord;
    if (existing) {
      puzzleRecord = await prisma.puzzle.update({
        where: { id: existing.id },
        data: puzzleData,
      });
    } else {
      puzzleRecord = await prisma.puzzle.create({
        data: puzzleData,
      });
    }

    // Seed hints
    if (hints && hints.length > 0) {
      for (const hint of hints) {
        await prisma.puzzleHint.upsert({
          where: {
            puzzleId_hintOrder: {
              puzzleId: puzzleRecord.id,
              hintOrder: hint.hintOrder,
            },
          },
          update: {
            title: hint.title,
            content: hint.content,
            unlockConditions: hint.unlockConditions,
          },
          create: {
            puzzleId: puzzleRecord.id,
            hintOrder: hint.hintOrder,
            title: hint.title,
            content: hint.content,
            unlockConditions: hint.unlockConditions,
          },
        });
      }
    }

    // Seed stages for multi-stage puzzles
    if (stages && stages.length > 0) {
      for (const stg of stages) {
        await prisma.puzzleStage.upsert({
          where: {
            puzzleId_stageOrder: {
              puzzleId: puzzleRecord.id,
              stageOrder: stg.stageOrder,
            },
          },
          update: {
            title: stg.title,
            instructions: stg.instructions,
            puzzleType: stg.puzzleType,
            publicConfiguration: stg.publicConfiguration,
            secretConfiguration: stg.secretConfiguration,
            solutionHash: stg.solutionHash,
            maxAttempts: stg.maxAttempts,
          },
          create: {
            puzzleId: puzzleRecord.id,
            stageOrder: stg.stageOrder,
            title: stg.title,
            instructions: stg.instructions,
            puzzleType: stg.puzzleType,
            publicConfiguration: stg.publicConfiguration,
            secretConfiguration: stg.secretConfiguration,
            solutionHash: stg.solutionHash,
            maxAttempts: stg.maxAttempts,
          },
        });
      }
    }
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
