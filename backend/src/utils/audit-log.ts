// Simple audit log utility (optional - can be expanded later)
// For now, we track changes through created_by and timestamps in the database

export interface AuditLogEntry {
  action: string;
  resource_type: string;
  resource_id: string;
  user_id: string;
  changes?: Record<string, any>;
  timestamp: string;
}

export class AuditLogger {
  // In a full implementation, this would write to an audit_logs table
  // For MVP, we rely on created_by/updated_at fields in existing tables
  static log(action: string, resourceType: string, resourceId: string, userId: string, changes?: Record<string, any>): void {
    const entry: AuditLogEntry = {
      action,
      resource_type: resourceType,
      resource_id: resourceId,
      user_id: userId,
      changes,
      timestamp: new Date().toISOString(),
    };

    // Log to console in development
    if (process.env.NODE_ENV === 'development') {
      console.log('[AUDIT]', JSON.stringify(entry, null, 2));
    }

    // In production, this would write to database or external logging service
  }

  static logCreate(resourceType: string, resourceId: string, userId: string, data: Record<string, any>): void {
    this.log('CREATE', resourceType, resourceId, userId, data);
  }

  static logUpdate(resourceType: string, resourceId: string, userId: string, changes: Record<string, any>): void {
    this.log('UPDATE', resourceType, resourceId, userId, changes);
  }

  static logDelete(resourceType: string, resourceId: string, userId: string): void {
    this.log('DELETE', resourceType, resourceId, userId);
  }

  static logApprove(resourceType: string, resourceId: string, userId: string, details: Record<string, any>): void {
    this.log('APPROVE', resourceType, resourceId, userId, details);
  }
}

