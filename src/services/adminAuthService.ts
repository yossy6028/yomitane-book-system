import { AdminUser, AdminSession, AdminLoginAttempt, AdminPermission } from '../types/User';

class AdminAuthService {
  private readonly STORAGE_KEYS = {
    ADMIN_USERS: 'yomitane_admin_users',
    ADMIN_SESSIONS: 'yomitane_admin_sessions',
    ADMIN_LOGIN_ATTEMPTS: 'yomitane_admin_login_attempts',
    CURRENT_ADMIN_SESSION: 'yomitane_current_admin_session'
  };

  private readonly DEFAULT_SESSION_TIMEOUT = 240; // 4時間（分）
  private readonly MAX_LOGIN_ATTEMPTS = 5;
  private readonly LOCKOUT_DURATION = 30; // 30分

  constructor() {
    this.initializeDefaultAdmin();
  }

  // デフォルト管理者アカウントの初期化
  private initializeDefaultAdmin(): void {
    const admins = this.getAllAdmins();
    if (admins.length === 0) {
      const defaultAdmin: AdminUser = {
        id: 'admin_001',
        username: 'admin',
        email: 'admin@yomitane.com',
        displayName: '本部管理者',
        role: 'super_admin',
        permissions: [
          { resource: 'users', actions: ['read', 'write', 'delete', 'export'] },
          { resource: 'books', actions: ['read', 'write', 'delete', 'export'] },
          { resource: 'stats', actions: ['read', 'export'] },
          { resource: 'system', actions: ['read', 'write'] },
          { resource: 'reports', actions: ['read', 'export'] }
        ],
        createdAt: new Date().toISOString(),
        lastLoginAt: new Date().toISOString(),
        isActive: true,
        department: '本部',
        passwordHash: this.simpleHash('admin123'), // 初期パスワード
        twoFactorEnabled: false,
        sessionTimeout: this.DEFAULT_SESSION_TIMEOUT
      };

      admins.push(defaultAdmin);
      localStorage.setItem(this.STORAGE_KEYS.ADMIN_USERS, JSON.stringify(admins));
      
      console.log('🔐 デフォルト管理者アカウントを作成しました');
      console.log('ユーザー名: admin, パスワード: admin123');
    }
  }

  // 簡単なハッシュ化（実際の実装では適切な暗号化を使用）
  private simpleHash(password: string): string {
    let hash = 0;
    for (let i = 0; i < password.length; i++) {
      const char = password.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // 32bit integer
    }
    return hash.toString(16);
  }

  // 管理者ログイン
  async adminLogin(username: string, password: string): Promise<{ success: boolean; admin?: AdminUser; session?: AdminSession; error?: string }> {
    const attempt: AdminLoginAttempt = {
      id: this.generateId(),
      username,
      ipAddress: this.getClientIP(),
      userAgent: navigator.userAgent,
      success: false,
      timestamp: new Date().toISOString()
    };

    try {
      // レート制限チェック
      if (this.isAccountLocked(username)) {
        attempt.failureReason = 'アカウントがロックされています';
        this.recordLoginAttempt(attempt);
        return { success: false, error: 'アカウントがロックされています。30分後に再試行してください。' };
      }

      const admins = this.getAllAdmins();
      const admin = admins.find(a => a.username === username && a.isActive);

      if (!admin) {
        attempt.failureReason = 'ユーザーが見つかりません';
        this.recordLoginAttempt(attempt);
        return { success: false, error: 'ユーザー名またはパスワードが正しくありません' };
      }

      const passwordHash = this.simpleHash(password);
      if (admin.passwordHash !== passwordHash) {
        attempt.failureReason = 'パスワードが正しくありません';
        this.recordLoginAttempt(attempt);
        return { success: false, error: 'ユーザー名またはパスワードが正しくありません' };
      }

      // ログイン成功
      attempt.success = true;
      this.recordLoginAttempt(attempt);

      // セッション作成
      const session = this.createSession(admin);
      
      // 最終ログイン時刻更新
      admin.lastLoginAt = new Date().toISOString();
      this.updateAdmin(admin);

      return { success: true, admin, session };

    } catch (error) {
      attempt.failureReason = 'システムエラー';
      this.recordLoginAttempt(attempt);
      return { success: false, error: 'システムエラーが発生しました' };
    }
  }

  // セッション作成
  private createSession(admin: AdminUser): AdminSession {
    const now = new Date();
    const expiresAt = new Date(now.getTime() + (admin.sessionTimeout || this.DEFAULT_SESSION_TIMEOUT) * 60 * 1000);

    const session: AdminSession = {
      id: this.generateId(),
      adminId: admin.id,
      createdAt: now.toISOString(),
      expiresAt: expiresAt.toISOString(),
      ipAddress: this.getClientIP(),
      userAgent: navigator.userAgent,
      isActive: true,
      lastActivity: now.toISOString()
    };

    // セッション保存
    const sessions = this.getAllSessions();
    sessions.push(session);
    localStorage.setItem(this.STORAGE_KEYS.ADMIN_SESSIONS, JSON.stringify(sessions));

    // 現在のセッションとして設定
    localStorage.setItem(this.STORAGE_KEYS.CURRENT_ADMIN_SESSION, JSON.stringify(session));

    return session;
  }

  // ログアウト
  adminLogout(): void {
    const currentSession = this.getCurrentSession();
    if (currentSession) {
      // セッションを無効化
      currentSession.isActive = false;
      this.updateSession(currentSession);
    }

    // ローカルストレージからセッション削除
    localStorage.removeItem(this.STORAGE_KEYS.CURRENT_ADMIN_SESSION);
  }

  // 現在のセッション取得
  getCurrentSession(): AdminSession | null {
    const stored = localStorage.getItem(this.STORAGE_KEYS.CURRENT_ADMIN_SESSION);
    if (!stored) return null;

    const session: AdminSession = JSON.parse(stored);
    
    // セッション有効期限チェック
    if (new Date() > new Date(session.expiresAt)) {
      this.adminLogout();
      return null;
    }

    // 最終活動時刻更新
    session.lastActivity = new Date().toISOString();
    this.updateSession(session);
    localStorage.setItem(this.STORAGE_KEYS.CURRENT_ADMIN_SESSION, JSON.stringify(session));

    return session;
  }

  // 現在のログイン管理者取得
  getCurrentAdmin(): AdminUser | null {
    const session = this.getCurrentSession();
    if (!session) return null;

    const admins = this.getAllAdmins();
    return admins.find(a => a.id === session.adminId) || null;
  }

  // アカウントロック状態チェック
  private isAccountLocked(username: string): boolean {
    const attempts = this.getLoginAttempts();
    const now = new Date();
    const lockoutTime = new Date(now.getTime() - this.LOCKOUT_DURATION * 60 * 1000);

    const recentFailures = attempts.filter(attempt => 
      attempt.username === username &&
      !attempt.success &&
      new Date(attempt.timestamp) > lockoutTime
    );

    return recentFailures.length >= this.MAX_LOGIN_ATTEMPTS;
  }

  // ログイン試行記録
  private recordLoginAttempt(attempt: AdminLoginAttempt): void {
    const attempts = this.getLoginAttempts();
    attempts.push(attempt);

    // 最新1000件のみ保持
    if (attempts.length > 1000) {
      attempts.splice(0, attempts.length - 1000);
    }

    localStorage.setItem(this.STORAGE_KEYS.ADMIN_LOGIN_ATTEMPTS, JSON.stringify(attempts));
  }

  // 権限チェック
  hasPermission(resource: AdminPermission['resource'], action: AdminPermission['actions'][0]): boolean {
    const admin = this.getCurrentAdmin();
    if (!admin) return false;

    const permission = admin.permissions.find(p => p.resource === resource);
    return permission?.actions.includes(action) || false;
  }

  // 管理者作成
  createAdmin(adminData: Omit<AdminUser, 'id' | 'createdAt' | 'lastLoginAt'>): AdminUser {
    const admins = this.getAllAdmins();
    
    // 重複チェック
    const existing = admins.find(a => a.username === adminData.username || a.email === adminData.email);
    if (existing) {
      throw new Error('ユーザー名またはメールアドレスが既に使用されています');
    }

    const newAdmin: AdminUser = {
      ...adminData,
      id: this.generateId(),
      createdAt: new Date().toISOString(),
      lastLoginAt: new Date().toISOString()
    };

    admins.push(newAdmin);
    localStorage.setItem(this.STORAGE_KEYS.ADMIN_USERS, JSON.stringify(admins));

    return newAdmin;
  }

  // 管理者更新
  updateAdmin(admin: AdminUser): void {
    const admins = this.getAllAdmins();
    const index = admins.findIndex(a => a.id === admin.id);
    
    if (index !== -1) {
      admins[index] = admin;
      localStorage.setItem(this.STORAGE_KEYS.ADMIN_USERS, JSON.stringify(admins));
    }
  }

  // 管理者削除
  deleteAdmin(adminId: string): void {
    const admins = this.getAllAdmins();
    const filtered = admins.filter(a => a.id !== adminId);
    localStorage.setItem(this.STORAGE_KEYS.ADMIN_USERS, JSON.stringify(filtered));
  }

  // 全管理者取得
  getAllAdmins(): AdminUser[] {
    const stored = localStorage.getItem(this.STORAGE_KEYS.ADMIN_USERS);
    return stored ? JSON.parse(stored) : [];
  }

  // 全セッション取得
  getAllSessions(): AdminSession[] {
    const stored = localStorage.getItem(this.STORAGE_KEYS.ADMIN_SESSIONS);
    return stored ? JSON.parse(stored) : [];
  }

  // セッション更新
  private updateSession(session: AdminSession): void {
    const sessions = this.getAllSessions();
    const index = sessions.findIndex(s => s.id === session.id);
    
    if (index !== -1) {
      sessions[index] = session;
      localStorage.setItem(this.STORAGE_KEYS.ADMIN_SESSIONS, JSON.stringify(sessions));
    }
  }

  // ログイン試行取得
  getLoginAttempts(): AdminLoginAttempt[] {
    const stored = localStorage.getItem(this.STORAGE_KEYS.ADMIN_LOGIN_ATTEMPTS);
    return stored ? JSON.parse(stored) : [];
  }

  // セキュリティ統計
  getSecurityStats(): {
    totalLogins: number;
    failedLogins: number;
    activeAdmins: number;
    activeSessions: number;
    recentFailures: AdminLoginAttempt[];
  } {
    const attempts = this.getLoginAttempts();
    const admins = this.getAllAdmins();
    const sessions = this.getAllSessions();
    
    const now = new Date();
    const last24Hours = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    
    const recentAttempts = attempts.filter(a => new Date(a.timestamp) > last24Hours);
    const recentFailures = recentAttempts.filter(a => !a.success);
    
    return {
      totalLogins: recentAttempts.filter(a => a.success).length,
      failedLogins: recentFailures.length,
      activeAdmins: admins.filter(a => a.isActive).length,
      activeSessions: sessions.filter(s => s.isActive && new Date() < new Date(s.expiresAt)).length,
      recentFailures: recentFailures.slice(-10) // 最新10件
    };
  }

  // パスワード変更
  changePassword(adminId: string, currentPassword: string, newPassword: string): boolean {
    const admins = this.getAllAdmins();
    const admin = admins.find(a => a.id === adminId);
    
    if (!admin) return false;
    
    const currentHash = this.simpleHash(currentPassword);
    if (admin.passwordHash !== currentHash) return false;
    
    admin.passwordHash = this.simpleHash(newPassword);
    this.updateAdmin(admin);
    
    return true;
  }

  // ユーティリティメソッド
  private generateId(): string {
    return 'admin_' + Date.now().toString(36) + Math.random().toString(36).substr(2);
  }

  private getClientIP(): string {
    // 実際の実装では適切な方法でIPアドレスを取得
    return '127.0.0.1';
  }
}

export const adminAuthService = new AdminAuthService();