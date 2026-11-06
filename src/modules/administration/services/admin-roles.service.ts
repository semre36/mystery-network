import { prisma } from "@/server/infrastructure/database";
import { AppError } from "@/lib/errors/app-error";
import { DEFAULT_ADMIN_ROLES } from "../constants/admin-permissions";
import { AdminGuard } from "../guards/admin.guard";
import { AdminAuditService } from "./audit.service";
import type { SafeAdminRoleDto, SafeAdminPermissionDto } from "../types/admin.types";

export class AdminRolesService {
  /**
   * Retrieves all roles with their assigned permissions and active user counts.
   */
  public static async listRoles(): Promise<SafeAdminRoleDto[]> {
    const roles = await prisma.adminRole.findMany({
      include: {
        permissions: {
          include: { permission: true },
        },
        userAssignments: true,
      },
      orderBy: { name: "asc" },
    });

    return roles.map((r) => ({
      id: r.id,
      name: r.name,
      description: r.description,
      createdAt: r.createdAt.toISOString(),
      updatedAt: r.updatedAt.toISOString(),
      permissions: r.permissions.map((rp) => ({
        id: rp.permission.id,
        action: rp.permission.action,
        description: rp.permission.description,
      })),
      userCount: r.userAssignments.length,
    }));
  }

  /**
   * Retrieves all registered system permissions.
   */
  public static async listPermissions(): Promise<SafeAdminPermissionDto[]> {
    const permissions = await prisma.adminPermission.findMany({
      orderBy: { action: "asc" },
    });

    return permissions.map((p) => ({
      id: p.id,
      action: p.action,
      description: p.description,
    }));
  }

  /**
   * Creates a new administrative role with optional initial permissions.
   */
  public static async createRole(
    actorId: string,
    params: { name: string; description?: string; permissionIds?: string[] }
  ): Promise<SafeAdminRoleDto> {
    const cleanName = params.name.trim().toUpperCase().replace(/\s+/g, "_");

    // Privilege escalation check
    if (actorId) {
      const actor = await AdminGuard.requireAdmin(actorId);
      if (!actor.isSuperAdmin && params.permissionIds && params.permissionIds.length > 0) {
        const requestedPerms = await prisma.adminPermission.findMany({
          where: { id: { in: params.permissionIds } },
        });
        const unpossessed = requestedPerms
          .map((p) => p.action)
          .filter((a) => !actor.permissions.has(a));
        if (unpossessed.length > 0) {
          throw new AppError(
            `Privilege escalation denied: You cannot create a role with permissions you do not possess (${unpossessed.join(", ")})`,
            403,
            "PRIVILEGE_ESCALATION_DENIED"
          );
        }
      }
    }

    const existing = await prisma.adminRole.findUnique({ where: { name: cleanName } });
    if (existing) {
      throw new AppError(`Role '${cleanName}' already exists`, 409, "ROLE_EXISTS");
    }

    const role = await prisma.$transaction(async (tx) => {
      const created = await tx.adminRole.create({
        data: {
          name: cleanName,
          description: params.description?.trim() || null,
          permissions:
            params.permissionIds && params.permissionIds.length > 0
              ? {
                  create: params.permissionIds.map((pId) => ({
                    permissionId: pId,
                  })),
                }
              : undefined,
        },
        include: {
          permissions: { include: { permission: true } },
          userAssignments: true,
        },
      });

      await AdminAuditService.recordAction(
        {
          actorId,
          action: "ROLE_CREATE",
          resourceType: "AdminRole",
          resourceId: created.id,
          metadata: { name: created.name, permissionsCount: created.permissions.length },
        },
        tx
      );

      return created;
    });

    return {
      id: role.id,
      name: role.name,
      description: role.description,
      createdAt: role.createdAt.toISOString(),
      updatedAt: role.updatedAt.toISOString(),
      permissions: role.permissions.map((rp) => ({
        id: rp.permission.id,
        action: rp.permission.action,
        description: rp.permission.description,
      })),
      userCount: 0,
    };
  }

  /**
   * Updates an administrative role's description and assigned permissions.
   */
  public static async updateRole(
    actorId: string,
    roleId: string,
    params: { description?: string; permissionIds?: string[] }
  ): Promise<SafeAdminRoleDto> {
    const role = await prisma.adminRole.findUnique({
      where: { id: roleId },
      include: { permissions: true },
    });

    if (!role) {
      throw new AppError("Administrative role not found", 404, "ROLE_NOT_FOUND");
    }

    // Privilege escalation check
    if (actorId) {
      const actor = await AdminGuard.requireAdmin(actorId);

      // Non-SUPER_ADMIN cannot modify the SUPER_ADMIN role
      if (role.name === DEFAULT_ADMIN_ROLES.SUPER_ADMIN && !actor.isSuperAdmin) {
        throw new AppError(
          "Privilege escalation denied: Only a Super Administrator can modify the SUPER_ADMIN role",
          403,
          "PRIVILEGE_ESCALATION_DENIED"
        );
      }

      if (!actor.isSuperAdmin && params.permissionIds && params.permissionIds.length > 0) {
        const requestedPerms = await prisma.adminPermission.findMany({
          where: { id: { in: params.permissionIds } },
        });
        const unpossessed = requestedPerms
          .map((p) => p.action)
          .filter((a) => !actor.permissions.has(a));
        if (unpossessed.length > 0) {
          throw new AppError(
            `Privilege escalation denied: You cannot grant permissions to a role that you do not possess (${unpossessed.join(", ")})`,
            403,
            "PRIVILEGE_ESCALATION_DENIED"
          );
        }
      }
    }

    // Protect SUPER_ADMIN from permission stripping
    if (role.name === DEFAULT_ADMIN_ROLES.SUPER_ADMIN && params.permissionIds) {
      const allPermCount = await prisma.adminPermission.count();
      if (params.permissionIds.length < allPermCount) {
        throw new AppError(
          "Critical security rule: SUPER_ADMIN permissions cannot be restricted or removed",
          400,
          "SUPER_ADMIN_RESTRICTION_FORBIDDEN"
        );
      }
    }

    await prisma.$transaction(async (tx) => {
      // Serialize operations that affect SUPER_ADMIN privileges
      if (role.name === DEFAULT_ADMIN_ROLES.SUPER_ADMIN) {
        await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext('super_admin_invariant_lock'))`;
      }
      if (params.description !== undefined) {
        await tx.adminRole.update({
          where: { id: roleId },
          data: { description: params.description },
        });
      }

      if (params.permissionIds) {
        // Delete current mappings
        await tx.adminRolePermission.deleteMany({
          where: { roleId },
        });

        // Insert new mappings
        if (params.permissionIds.length > 0) {
          await tx.adminRolePermission.createMany({
            data: params.permissionIds.map((pId) => ({
              roleId,
              permissionId: pId,
            })),
            skipDuplicates: true,
          });
        }
      }

      await AdminAuditService.recordAction(
        {
          actorId,
          action: "ROLE_UPDATE",
          resourceType: "AdminRole",
          resourceId: roleId,
          metadata: {
            roleName: role.name,
            permissionsAssigned: params.permissionIds?.length,
          },
        },
        tx
      );
    });

    const updated = await prisma.adminRole.findUniqueOrThrow({
      where: { id: roleId },
      include: {
        permissions: { include: { permission: true } },
        userAssignments: true,
      },
    });

    return {
      id: updated.id,
      name: updated.name,
      description: updated.description,
      createdAt: updated.createdAt.toISOString(),
      updatedAt: updated.updatedAt.toISOString(),
      permissions: updated.permissions.map((rp) => ({
        id: rp.permission.id,
        action: rp.permission.action,
        description: rp.permission.description,
      })),
      userCount: updated.userAssignments.length,
    };
  }

  /**
   * Assigns an administrative role to a target user.
   * Strictly enforces privilege escalation guards and transactional consistency.
   */
  public static async assignRoleToUser(
    actorId: string,
    targetUserId: string,
    roleId: string
  ): Promise<void> {
    const actor = await AdminGuard.requireAdmin(actorId);
    const [user, role] = await Promise.all([
      prisma.user.findUnique({ where: { id: targetUserId }, include: { profile: true } }),
      prisma.adminRole.findUnique({
        where: { id: roleId },
        include: { permissions: { include: { permission: true } } },
      }),
    ]);

    if (!user) throw new AppError("Target user not found", 404, "USER_NOT_FOUND");
    if (!role) throw new AppError("Administrative role not found", 404, "ROLE_NOT_FOUND");

    // Privilege escalation guard: Non-SUPER_ADMIN cannot assign SUPER_ADMIN or roles with unpossessed permissions
    if (!actor.isSuperAdmin) {
      if (role.name === DEFAULT_ADMIN_ROLES.SUPER_ADMIN) {
        throw new AppError(
          "Privilege escalation denied: Only a Super Administrator can assign the SUPER_ADMIN role",
          403,
          "PRIVILEGE_ESCALATION_DENIED"
        );
      }

      const rolePermissions = role.permissions.map((rp) => rp.permission.action);
      const unpossessed = rolePermissions.filter((p) => !actor.permissions.has(p));
      if (unpossessed.length > 0) {
        throw new AppError(
          `Privilege escalation denied: You cannot assign a role granting permissions you do not possess (${unpossessed.join(", ")})`,
          403,
          "PRIVILEGE_ESCALATION_DENIED"
        );
      }
    }

    await prisma.$transaction(async (tx) => {
      // Serialize role assignments affecting SUPER_ADMIN
      if (role.name === DEFAULT_ADMIN_ROLES.SUPER_ADMIN) {
        await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext('super_admin_invariant_lock'))`;
      }

      await tx.adminUserRole.upsert({
        where: {
          userId_roleId: {
            userId: targetUserId,
            roleId,
          },
        },
        update: {},
        create: {
          userId: targetUserId,
          roleId,
        },
      });

      await AdminAuditService.recordAction(
        {
          actorId,
          action: "ROLE_ASSIGN",
          resourceType: "AdminUserRole",
          resourceId: targetUserId,
          metadata: {
            targetUserCodename: user.profile?.codename,
            assignedRole: role.name,
          },
        },
        tx
      );
    });
  }

  /**
   * Revokes an administrative role from a user.
   * Transactionally protects the last active SUPER_ADMIN against revocation.
   */
  public static async revokeRoleFromUser(
    actorId: string,
    targetUserId: string,
    roleId: string
  ): Promise<void> {
    const actor = await AdminGuard.requireAdmin(actorId);
    const role = await prisma.adminRole.findUnique({
      where: { id: roleId },
      include: { permissions: { include: { permission: true } } },
    });
    if (!role) throw new AppError("Role not found", 404, "ROLE_NOT_FOUND");

    // Only SUPER_ADMIN can revoke the SUPER_ADMIN role
    if (role.name === DEFAULT_ADMIN_ROLES.SUPER_ADMIN && !actor.isSuperAdmin) {
      throw new AppError(
        "Privilege escalation denied: Only a Super Administrator can revoke the SUPER_ADMIN role",
        403,
        "PRIVILEGE_ESCALATION_DENIED"
      );
    }

    // Non-SUPER_ADMIN cannot revoke a role granting permissions they do not possess
    if (!actor.isSuperAdmin) {
      const rolePermissions = role.permissions.map((rp) => rp.permission.action);
      const unpossessed = rolePermissions.filter((p) => !actor.permissions.has(p));
      if (unpossessed.length > 0) {
        throw new AppError(
          `Privilege escalation denied: You cannot revoke a role granting permissions you do not possess (${unpossessed.join(", ")})`,
          403,
          "PRIVILEGE_ESCALATION_DENIED"
        );
      }
    }

    await prisma.$transaction(async (tx) => {
      // If revoking SUPER_ADMIN, transactionally ensure target is not the last remaining active super admin
      if (role.name === DEFAULT_ADMIN_ROLES.SUPER_ADMIN) {
        await AdminGuard.assertNotDemotingLastSuperAdmin(targetUserId, tx);
      }

      await tx.adminUserRole.deleteMany({
        where: {
          userId: targetUserId,
          roleId,
        },
      });

      await AdminAuditService.recordAction(
        {
          actorId,
          action: "ROLE_REVOKE",
          resourceType: "AdminUserRole",
          resourceId: targetUserId,
          metadata: {
            revokedRole: role.name,
          },
        },
        tx
      );
    });
  }
}
