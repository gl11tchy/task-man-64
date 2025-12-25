import { sql, isDatabaseAvailable } from '../neon';
import { v4 as uuidv4 } from 'uuid';

const WHITEBOARD_STORAGE_KEY = 'workstation_whiteboards';

export interface WhiteboardData {
  id: string;
  projectId: string;
  documentSnapshot: object;
  sessionSnapshot: object;
  createdAt: number;
  updatedAt: number;
  user_id?: string | null;
}

export class WhiteboardStorage {
  private userId: string | null;

  constructor(userId: string | null = null) {
    this.userId = userId;
  }

  setUserId(userId: string | null) {
    this.userId = userId;
  }

  async loadWhiteboard(projectId: string): Promise<WhiteboardData | null> {
    if (this.userId && isDatabaseAvailable()) {
      return this.loadFromNeon(projectId);
    }
    return this.loadFromLocalStorage(projectId);
  }

  async saveWhiteboard(
    projectId: string,
    snapshot: { document: object; session: object }
  ): Promise<{ success: boolean; error?: Error }> {
    if (this.userId && isDatabaseAvailable()) {
      return this.saveToNeon(projectId, snapshot);
    }
    return this.saveToLocalStorage(projectId, snapshot);
  }

  async deleteWhiteboard(projectId: string): Promise<{ success: boolean; error?: Error }> {
    if (this.userId && isDatabaseAvailable()) {
      return this.deleteFromNeon(projectId);
    }
    return this.deleteFromLocalStorage(projectId);
  }

  // ============ LocalStorage Implementation ============

  private loadFromLocalStorage(projectId: string): WhiteboardData | null {
    try {
      const stored = localStorage.getItem(WHITEBOARD_STORAGE_KEY);
      const whiteboards: WhiteboardData[] = stored ? JSON.parse(stored) : [];
      return whiteboards.find(w => w.projectId === projectId) || null;
    } catch (error) {
      console.error('Failed to load whiteboard from localStorage:', error);
      return null;
    }
  }

  private saveToLocalStorage(
    projectId: string,
    snapshot: { document: object; session: object }
  ): { success: boolean; error?: Error } {
    try {
      const stored = localStorage.getItem(WHITEBOARD_STORAGE_KEY);
      const whiteboards: WhiteboardData[] = stored ? JSON.parse(stored) : [];
      const existingIndex = whiteboards.findIndex(w => w.projectId === projectId);

      const now = Date.now();
      const data: WhiteboardData = {
        id: existingIndex >= 0 ? whiteboards[existingIndex].id : uuidv4(),
        projectId,
        documentSnapshot: snapshot.document,
        sessionSnapshot: snapshot.session,
        createdAt: existingIndex >= 0 ? whiteboards[existingIndex].createdAt : now,
        updatedAt: now,
        user_id: this.userId,
      };

      if (existingIndex >= 0) {
        whiteboards[existingIndex] = data;
      } else {
        whiteboards.push(data);
      }

      localStorage.setItem(WHITEBOARD_STORAGE_KEY, JSON.stringify(whiteboards));
      return { success: true };
    } catch (error) {
      return { success: false, error: error as Error };
    }
  }

  private deleteFromLocalStorage(projectId: string): { success: boolean; error?: Error } {
    try {
      const stored = localStorage.getItem(WHITEBOARD_STORAGE_KEY);
      const whiteboards: WhiteboardData[] = stored ? JSON.parse(stored) : [];
      const filtered = whiteboards.filter(w => w.projectId !== projectId);
      localStorage.setItem(WHITEBOARD_STORAGE_KEY, JSON.stringify(filtered));
      return { success: true };
    } catch (error) {
      return { success: false, error: error as Error };
    }
  }

  // ============ Neon Implementation ============

  private async loadFromNeon(projectId: string): Promise<WhiteboardData | null> {
    if (!sql) return null;

    try {
      const rows = await sql`
        SELECT * FROM whiteboards
        WHERE project_id = ${projectId} AND user_id = ${this.userId}
        LIMIT 1
      `;

      if (rows.length === 0) return null;

      const row = rows[0];
      return {
        id: row.id,
        projectId: row.project_id,
        documentSnapshot: row.document_snapshot || {},
        sessionSnapshot: row.session_snapshot || {},
        createdAt: new Date(row.created_at).getTime(),
        updatedAt: new Date(row.updated_at).getTime(),
        user_id: row.user_id,
      };
    } catch (error) {
      console.error('Failed to load whiteboard from Neon:', error);
      return null;
    }
  }

  private async saveToNeon(
    projectId: string,
    snapshot: { document: object; session: object }
  ): Promise<{ success: boolean; error?: Error }> {
    if (!sql) return { success: false, error: new Error('Database not available') };

    try {
      await sql`
        INSERT INTO whiteboards (project_id, document_snapshot, session_snapshot, user_id)
        VALUES (
          ${projectId},
          ${JSON.stringify(snapshot.document)}::jsonb,
          ${JSON.stringify(snapshot.session)}::jsonb,
          ${this.userId}
        )
        ON CONFLICT (project_id)
        DO UPDATE SET
          document_snapshot = ${JSON.stringify(snapshot.document)}::jsonb,
          session_snapshot = ${JSON.stringify(snapshot.session)}::jsonb,
          updated_at = now()
      `;

      return { success: true };
    } catch (error) {
      console.error('Failed to save whiteboard to Neon:', error);
      return { success: false, error: error as Error };
    }
  }

  private async deleteFromNeon(projectId: string): Promise<{ success: boolean; error?: Error }> {
    if (!sql) return { success: false, error: new Error('Database not available') };

    try {
      await sql`
        DELETE FROM whiteboards
        WHERE project_id = ${projectId} AND user_id = ${this.userId}
      `;

      return { success: true };
    } catch (error) {
      console.error('Failed to delete whiteboard from Neon:', error);
      return { success: false, error: error as Error };
    }
  }
}
