'use server';

import { decrypt } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { cookies } from 'next/headers';
import { hasPermission, isAdmin } from '@/lib/utils';
import type { PermissionKey } from '@/lib/type';
import { revalidatePath } from 'next/cache';
import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs';
import path from 'path';

const execAsync = promisify(exec);

const BACKUP_DIR = path.join(process.cwd(), 'public', 'uploads', 'backups');

async function getCurrentSessionUser() {
    try {
        const session = cookies().get('skynova')?.value;
        if (!session) return null;
        const decoded = await decrypt(session);
        if (!decoded?.userId) return null;
        return await prisma.user.findUnique({
            where: { id: String(decoded.userId) },
            include: { permission: true },
        });
    } catch {
        return null;
    }
}

function requirePermission(user: any, permission: PermissionKey) {
    if (!isAdmin(user) && !hasPermission(user, permission)) {
        throw new Error('غير مصرح لك بتنفيذ هذا الإجراء');
    }
}

function ensureBackupDir() {
    if (!fs.existsSync(BACKUP_DIR)) {
        fs.mkdirSync(BACKUP_DIR, { recursive: true });
    }
}

function formatFileSize(bytes: number) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${Number((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}

export async function getBackups() {
    const user = await getCurrentSessionUser();
    if (!user || (!isAdmin(user) && !hasPermission(user, 'viewBackups'))) {
        return { success: false, error: 'غير مصرح لك بعرض النسخ الاحتياطية' };
    }
    try {
        ensureBackupDir();
        const files = fs.readdirSync(BACKUP_DIR).filter((f) => f.endsWith('.dump') || f.endsWith('.sql'));
        const dbLogs = await prisma.backupLog.findMany({ orderBy: { createdAt: 'desc' }, take: 100 });
        const logMap = new Map(dbLogs.map((log) => [path.basename(log.fileUrl || ''), log]));
        const backups = files.map((file) => {
            const filePath = path.join(BACKUP_DIR, file);
            const stats = fs.statSync(filePath);
            const log = logMap.get(file);
            return {
                id: log?.id || file,
                name: log?.name || file,
                fileUrl: `/uploads/backups/${file}`,
                filePath: filePath,
                fileSize: formatFileSize(stats.size),
                rawSize: stats.size,
                status: log?.status || 'SUCCESS',
                errorMessage: log?.errorMessage || null,
                createdAt: log?.createdAt ? new Date(log.createdAt) : stats.mtime,
            };
        });
        backups.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        return { success: true, data: backups };
    } catch (error: any) {
        console.error('getBackups error:', error);
        return { success: false, error: 'تعذر تحميل النسخ الاحتياطية' };
    }
}

export async function createBackup(name?: string) {
    const user = await getCurrentSessionUser();
    if (!user) return { success: false, error: 'غير مصرح' };
    requirePermission(user, 'manageBackups');

    const dbUrl = process.env.DATABASE_URL;
    if (!dbUrl) return { success: false, error: 'لم يتم العثور على رابط قاعدة البيانات' };

    ensureBackupDir();
    const timestamp = Date.now();
    const fileName = `backup_${timestamp}.dump`;
    const filePath = path.join(BACKUP_DIR, fileName);
    const displayName = name || `نسخة احتياطية ${new Date().toLocaleString('ar-EG')}`;

    const log = await prisma.backupLog.create({
        data: {
            name: displayName,
            fileUrl: `/uploads/backups/${fileName}`,
            status: 'PENDING',
            createdById: user.id,
        },
    });

    try {
        const pgDumpPath = '"C:/Program Files/PostgreSQL/18/bin/pg_dump"';
        const command = `${pgDumpPath} --dbname="${dbUrl}" --format=custom --file="${filePath}"`;
        await execAsync(command, { env: { ...process.env, PGPASSWORD: '' } });
        const stats = fs.statSync(filePath);
        await prisma.backupLog.update({
            where: { id: log.id },
            data: { status: 'SUCCESS', fileSize: stats.size },
        });
        revalidatePath('/dashboard/backups');
        return { success: true, data: log, filePath: `/uploads/backups/${fileName}` };
    } catch (error: any) {
        console.error('createBackup error:', error);
        await prisma.backupLog.update({
            where: { id: log.id },
            data: { status: 'FAILED', errorMessage: error?.message || 'فشل إنشاء النسخة الاحتياطية' },
        });
        return { success: false, error: 'فشل إنشاء النسخة الاحتياطية' };
    }
}

export async function restoreBackup(backupId: string) {
    const user = await getCurrentSessionUser();
    if (!user) return { success: false, error: 'غير مصرح' };
    requirePermission(user, 'manageBackups');

    const dbUrl = process.env.DATABASE_URL;
    if (!dbUrl) return { success: false, error: 'لم يتم العثور على رابط قاعدة البيانات' };

    try {
        let fileUrl: string | null = null;
        const log = await prisma.backupLog.findUnique({ where: { id: backupId } });
        if (log?.fileUrl) fileUrl = log.fileUrl;
        else {
            const backups = await getBackups();
            if (!backups.success) return backups;
            const found = (backups.data as any[]).find((b) => b.id === backupId || b.fileUrl === backupId);
            if (found) fileUrl = found.fileUrl;
        }
        if (!fileUrl) return { success: false, error: 'النسخة الاحتياطية غير موجودة' };

        const fileName = path.basename(fileUrl);
        const filePath = path.join(BACKUP_DIR, fileName);
        if (!fs.existsSync(filePath)) return { success: false, error: 'ملف النسخة الاحتياطية غير موجود' };

        const pgRestorePath = '"C:/Program Files/PostgreSQL/18/bin/pg_restore"';
        const command = `${pgRestorePath} --dbname="${dbUrl}" --clean --if-exists --format=custom "${filePath}"`;
        await execAsync(command, { env: { ...process.env, PGPASSWORD: '' } });

        revalidatePath('/dashboard/backups');
        return { success: true };
    } catch (error: any) {
        console.error('restoreBackup error:', error);
        return { success: false, error: error?.message || 'فشل استعادة النسخة الاحتياطية' };
    }
}

export async function deleteBackup(backupId: string) {
    const user = await getCurrentSessionUser();
    if (!user) return { success: false, error: 'غير مصرح' };
    requirePermission(user, 'manageBackups');

    try {
        const log = await prisma.backupLog.findUnique({ where: { id: backupId } });
        let filePath: string | null = null;
        if (log?.fileUrl) filePath = path.join(BACKUP_DIR, path.basename(log.fileUrl));
        else {
            const backups = await getBackups();
            if (backups.success) {
                const found = (backups.data as any[]).find((b) => b.id === backupId || b.fileUrl === backupId);
                if (found?.filePath) filePath = found.filePath;
            }
        }
        if (filePath && fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
        }
        await prisma.backupLog.delete({ where: { id: backupId } }).catch(() => {});
        revalidatePath('/dashboard/backups');
        return { success: true };
    } catch (error: any) {
        console.error('deleteBackup error:', error);
        return { success: false, error: 'تعذر حذف النسخة الاحتياطية' };
    }
}
