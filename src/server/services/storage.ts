import * as fs from "fs/promises";
import * as path from "path";

export interface StorageProvider {
  save(buf: Buffer | Uint8Array, dest: string): Promise<{ path: string; size: number }>;
  read(path: string): Promise<Buffer>;
  delete(path: string): Promise<void>;
  resolve(path: string): string;
}

export class LocalStorage implements StorageProvider {
  private basePath: string;

  constructor(basePath: string = process.env.STORAGE_DIR || "./uploads") {
    this.basePath = basePath;
  }

  async save(buf: Buffer | Uint8Array, dest: string): Promise<{ path: string; size: number }> {
    const fullPath = path.join(this.basePath, dest);
    const dir = path.dirname(fullPath);

    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(fullPath, buf);

    return { path: dest, size: buf.length };
  }

  async read(filePath: string): Promise<Buffer> {
    const fullPath = path.join(this.basePath, filePath);
    return await fs.readFile(fullPath);
  }

  async delete(filePath: string): Promise<void> {
    const fullPath = path.join(this.basePath, filePath);
    await fs.unlink(fullPath);
  }

  resolve(filePath: string): string {
    return path.join(this.basePath, filePath);
  }
}

export const storage = new LocalStorage();
