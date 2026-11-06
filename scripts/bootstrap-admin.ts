#!/usr/bin/env tsx
try {
  process.loadEnvFile?.();
} catch {}

/**
 * MYSTERY NETWORK — Initial Super Administrator Bootstrap CLI
 *
 * Usage:
 *   npm run admin:bootstrap <telegramId | userId | codename>
 *
 * Security:
 * - One-time bootstrap mechanism.
 * - Permanently disables once an active SUPER_ADMIN exists in the database.
 * - Records an immutable audit log upon successful bootstrap.
 */
import { AdminBootstrapService } from "../src/modules/administration/services/bootstrap.service";
import { prisma } from "../src/server/infrastructure/database";

async function runBootstrap() {
  const target = process.argv[2];

  if (!target || target.trim().length === 0) {
    console.error("❌ Error: Target identifier required.");
    console.log("Usage: npm run admin:bootstrap <telegramId | userId | codename>");
    process.exit(1);
  }

  console.log(`🔒 Initializing Super Admin bootstrap for target: '${target}'...`);

  try {
    const result = await AdminBootstrapService.bootstrapInitialSuperAdmin({
      targetIdentifier: target.trim(),
      bootstrapSecret: process.env.ADMIN_BOOTSTRAP_SECRET,
    });

    console.log("✅ Super Administrator bootstrap successful!");
    console.log(`   User ID:     ${result.userId}`);
    console.log(`   Telegram ID: ${result.telegramId}`);
    console.log(`   Role:        ${result.role}`);
    console.log("   Bootstrap procedure is now permanently disabled.");
  } catch (err: any) {
    console.error(`❌ Bootstrap failed: ${err.message}`);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

runBootstrap();
