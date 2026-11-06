import crypto from "crypto";
import { prisma } from "@/server/infrastructure/database";
import { logger } from "@/lib/logger";
import { AppError } from "@/lib/errors/app-error";
import { DEFAULT_PLAYER_LEVEL, DEFAULT_PLAYER_XP } from "../constants/auth.constants";
import type { ValidatedTelegramAuth } from "../types/auth.types";
import type { User, PlayerProfile } from "@prisma/client";

export type UserWithProfile = User & { profile: PlayerProfile | null };

export class PlayerProvisioningService {
  /**
   * Generates a distinct investigator callsign/codename based on verified Telegram data.
   */
  private static generateInitialCodename(
    telegramUsername?: string,
    telegramIdStr?: string
  ): string {
    const base = telegramUsername
      ? telegramUsername.replace(/[^a-zA-Z0-9]/g, "").toUpperCase()
      : `OPERATIVE_${(telegramIdStr ?? "000000").slice(-6)}`;

    return `AGENT_${base}`;
  }

  /**
   * Resolves or provisions a player identity inside an isolated database transaction.
   * Handles concurrent first-time logins and uniqueness collisions safely.
   */
  public static async findOrCreatePlayer(
    authData: ValidatedTelegramAuth
  ): Promise<UserWithProfile> {
    const telegramIdBigInt = BigInt(authData.user.id);
    const telegramIdStr = authData.user.id.toString();

    // 1. Lookup Existing User
    const existingUser = await prisma.user.findUnique({
      where: { telegramId: telegramIdBigInt },
      include: { profile: true },
    });

    if (existingUser) {
      if (existingUser.status === "BANNED" || existingUser.status === "SUSPENDED") {
        throw new AppError(
          `Account access denied: Account status is ${existingUser.status}`,
          403,
          "ACCOUNT_INACTIVE"
        );
      }

      // Returning player: update only safe identity attributes and lastActiveAt.
      // NEVER overwrite custom codename, preferences, xp, or level.
      const updatedUser = await prisma.user.update({
        where: { id: existingUser.id },
        data: {
          lastActiveAt: new Date(),
          telegramUsername: authData.user.username ?? existingUser.telegramUsername,
          firstName: authData.user.first_name,
          lastName: authData.user.last_name ?? existingUser.lastName,
          languageCode: authData.user.language_code ?? existingUser.languageCode,
        },
        include: { profile: true },
      });

      logger.info("Returning player authenticated successfully", {
        userId: updatedUser.id,
        telegramId: telegramIdStr,
        hasProfile: !!updatedUser.profile,
      });

      return updatedUser;
    }

    // 2. First-Time Player: Provision User and PlayerProfile in a single transaction
    const baseCodename = this.generateInitialCodename(authData.user.username, telegramIdStr);

    const displayName = authData.user.last_name
      ? `${authData.user.first_name} ${authData.user.last_name}`
      : authData.user.first_name;

    try {
      const newUser = await prisma.$transaction(async (tx) => {
        // Double-check inside transaction to avoid race conditions
        const inTxExisting = await tx.user.findUnique({
          where: { telegramId: telegramIdBigInt },
          include: { profile: true },
        });

        if (inTxExisting) {
          return inTxExisting;
        }

        // Determine unique codename
        let codename = baseCodename;
        const codenameExists = await tx.playerProfile.findUnique({
          where: { codename },
        });

        if (codenameExists) {
          const suffix = crypto.randomBytes(2).toString("hex").toUpperCase();
          codename = `${baseCodename}_${suffix}`;
        }

        const createdUser = await tx.user.create({
          data: {
            telegramId: telegramIdBigInt,
            telegramUsername: authData.user.username,
            firstName: authData.user.first_name,
            lastName: authData.user.last_name,
            languageCode: authData.user.language_code,
            lastActiveAt: new Date(),
            profile: {
              create: {
                codename,
                displayName,
                xp: DEFAULT_PLAYER_XP,
                level: DEFAULT_PLAYER_LEVEL,
                preferences: {},
              },
            },
          },
          include: { profile: true },
        });

        return createdUser;
      });

      logger.info("New investigator account provisioned successfully", {
        userId: newUser.id,
        telegramId: telegramIdStr,
        codename: newUser.profile?.codename,
      });

      return newUser;
    } catch (err) {
      // In high-concurrency race condition where unique constraint on telegramId fired,
      // fetch and return the winner record cleanly.
      logger.warn("Encountered race condition during account creation, recovering record", {
        telegramId: telegramIdStr,
        error: err instanceof Error ? err.message : String(err),
      });

      const recoveredUser = await prisma.user.findUnique({
        where: { telegramId: telegramIdBigInt },
        include: { profile: true },
      });

      if (recoveredUser) {
        return recoveredUser;
      }

      throw err;
    }
  }
}
