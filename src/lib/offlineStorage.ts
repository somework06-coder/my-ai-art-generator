import { appDataDir, join } from '@tauri-apps/api/path';
import { mkdir, readDir, readTextFile, writeTextFile, remove, exists } from '@tauri-apps/plugin-fs';

export interface CachedShader {
    id: string; // Map to jobId or database ID
    title: string;
    fragmentCode: string;
    aspectRatio: string;
    prompt: string;
    createdAt: number;
    metadata?: import('@/types').StockMetadata;
}

const GALLERY_FOLDER = 'gallery';

class OfflineStorage {
    /**
     * Get the gallery directory for a specific user.
     * Structure: appDataDir/gallery/{userId}/
     * If no userId is provided, uses a shared 'anonymous' folder.
     */
    private async getGalleryDir(userId?: string): Promise<string> {
        const appData = await appDataDir();
        const userFolder = userId || 'anonymous';
        const galleryDir = await join(appData, GALLERY_FOLDER, userFolder);

        // Ensure the directory exists
        const dirExists = await exists(galleryDir);
        if (!dirExists) {
            await mkdir(galleryDir, { recursive: true });
        }

        return galleryDir;
    }

    private async getFilePath(id: string, userId?: string): Promise<string> {
        const dir = await this.getGalleryDir(userId);
        return await join(dir, `${id}.json`);
    }

    async saveShader(shader: CachedShader, userId?: string): Promise<void> {
        try {
            const filePath = await this.getFilePath(shader.id, userId);
            const data = JSON.stringify(shader, null, 2);
            await writeTextFile(filePath, data);
        } catch (error) {
            console.error('Failed to save shader to native FS:', error);
            throw error;
        }
    }

    async getAllShaders(userId?: string): Promise<CachedShader[]> {
        try {
            const dir = await this.getGalleryDir(userId);
            const entries = await readDir(dir);

            const shaders: CachedShader[] = [];

            for (const entry of entries) {
                if (entry.isFile && entry.name.endsWith('.json')) {
                    try {
                        const filePath = await join(dir, entry.name);
                        const fileContent = await readTextFile(filePath);
                        const shader = JSON.parse(fileContent) as CachedShader;
                        shaders.push(shader);
                    } catch (err) {
                        console.error(`Failed to read or parse gallery file ${entry.name}:`, err);
                        // Skip corrupted files
                    }
                }
            }

            // Sort by createdAt descending (newest first)
            return shaders.sort((a, b) => b.createdAt - a.createdAt);

        } catch (error) {
            console.error('Failed to get all shaders from native FS:', error);
            return [];
        }
    }

    async deleteShader(id: string, userId?: string): Promise<void> {
        try {
            const filePath = await this.getFilePath(id, userId);
            const fileExists = await exists(filePath);
            if (fileExists) {
                await remove(filePath);
            }
        } catch (error) {
            console.error(`Failed to delete shader ${id} from native FS:`, error);
            throw error;
        }
    }
}

// Export a singleton instance
export const offlineStorage = new OfflineStorage();
