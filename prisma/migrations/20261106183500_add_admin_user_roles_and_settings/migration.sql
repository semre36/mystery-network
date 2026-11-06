-- AlterTable users
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "suspensionReason" TEXT;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "suspendedAt" TIMESTAMP(3);

-- CreateTable admin_user_roles
CREATE TABLE IF NOT EXISTS "admin_user_roles" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "roleId" UUID NOT NULL,
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "admin_user_roles_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "admin_user_roles_userId_roleId_key" ON "admin_user_roles"("userId", "roleId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "admin_user_roles_userId_idx" ON "admin_user_roles"("userId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "admin_user_roles_roleId_idx" ON "admin_user_roles"("roleId");

-- AddForeignKey
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'admin_user_roles_userId_fkey'
    ) THEN
        ALTER TABLE "admin_user_roles" ADD CONSTRAINT "admin_user_roles_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

-- AddForeignKey
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'admin_user_roles_roleId_fkey'
    ) THEN
        ALTER TABLE "admin_user_roles" ADD CONSTRAINT "admin_user_roles_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "admin_roles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

-- CreateTable system_settings
CREATE TABLE IF NOT EXISTS "system_settings" (
    "key" TEXT NOT NULL,
    "value" JSONB NOT NULL,
    "description" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedById" UUID,

    CONSTRAINT "system_settings_pkey" PRIMARY KEY ("key")
);
