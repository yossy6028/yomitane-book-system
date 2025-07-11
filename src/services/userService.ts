import { User, ReadingRecord, ReadingGoal, ReadingStreak, NotificationSettings, UserStats, ActivityLog } from '../types/User';

class UserService {
  private readonly STORAGE_KEYS = {
    USERS: 'yomitane_users',
    CURRENT_USER: 'yomitane_current_user',
    READING_RECORDS: 'yomitane_reading_records',
    READING_GOALS: 'yomitane_reading_goals',
    READING_STREAKS: 'yomitane_reading_streaks',
    NOTIFICATIONS: 'yomitane_notifications',
    ACTIVITY_LOGS: 'yomitane_activity_logs',
    ADMIN_USERS: 'yomitane_admin_users',
    SETTINGS: 'yomitane_settings'
  };

  // ユーザー管理
  createUser(userData: Omit<User, 'id' | 'createdAt' | 'lastActiveAt' | 'isActive'>): User {
    const users = this.getAllUsers();
    
    // 重複チェック
    const existingUser = users.find(u => u.username === userData.username);
    if (existingUser) {
      throw new Error('このユーザー名は既に使用されています');
    }

    const newUser: User = {
      ...userData,
      id: this.generateId(),
      createdAt: new Date().toISOString(),
      lastActiveAt: new Date().toISOString(),
      isActive: true
    };

    users.push(newUser);
    localStorage.setItem(this.STORAGE_KEYS.USERS, JSON.stringify(users));
    
    // 初期設定を作成
    this.initializeUserSettings(newUser.id);
    
    // アクティビティログ
    this.logActivity(newUser.id, 'login', { action: 'user_created' });
    
    return newUser;
  }

  loginUser(username: string): User | null {
    const users = this.getAllUsers();
    const user = users.find(u => u.username === username && u.isActive);
    
    if (user) {
      user.lastActiveAt = new Date().toISOString();
      this.updateUser(user);
      localStorage.setItem(this.STORAGE_KEYS.CURRENT_USER, JSON.stringify(user));
      this.logActivity(user.id, 'login', { username });
      return user;
    }
    
    return null;
  }

  logoutUser(): void {
    const currentUser = this.getCurrentUser();
    if (currentUser) {
      this.logActivity(currentUser.id, 'logout', {});
    }
    localStorage.removeItem(this.STORAGE_KEYS.CURRENT_USER);
  }

  getCurrentUser(): User | null {
    const stored = localStorage.getItem(this.STORAGE_KEYS.CURRENT_USER);
    return stored ? JSON.parse(stored) : null;
  }

  getAllUsers(): User[] {
    const stored = localStorage.getItem(this.STORAGE_KEYS.USERS);
    return stored ? JSON.parse(stored) : [];
  }

  updateUser(user: User): void {
    const users = this.getAllUsers();
    const index = users.findIndex(u => u.id === user.id);
    
    if (index !== -1) {
      users[index] = { ...user, lastActiveAt: new Date().toISOString() };
      localStorage.setItem(this.STORAGE_KEYS.USERS, JSON.stringify(users));
      
      // 現在のユーザーの場合は更新
      const currentUser = this.getCurrentUser();
      if (currentUser && currentUser.id === user.id) {
        localStorage.setItem(this.STORAGE_KEYS.CURRENT_USER, JSON.stringify(users[index]));
      }
    }
  }

  deleteUser(userId: string): void {
    const users = this.getAllUsers();
    const filteredUsers = users.filter(u => u.id !== userId);
    localStorage.setItem(this.STORAGE_KEYS.USERS, JSON.stringify(filteredUsers));
    
    // 関連データも削除
    this.deleteUserData(userId);
  }

  // 読書記録管理
  addReadingRecord(record: Omit<ReadingRecord, 'id' | 'createdAt' | 'updatedAt'>): ReadingRecord {
    const records = this.getAllReadingRecords();
    
    const newRecord: ReadingRecord = {
      ...record,
      id: this.generateId(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    records.push(newRecord);
    localStorage.setItem(this.STORAGE_KEYS.READING_RECORDS, JSON.stringify(records));
    
    // 読書開始のアクティビティログ
    this.logActivity(record.userId, 'start_reading', { bookId: record.bookId });
    
    // 連続記録の更新
    this.updateReadingStreak(record.userId, record.startDate);
    
    return newRecord;
  }

  updateReadingRecord(record: ReadingRecord): void {
    const records = this.getAllReadingRecords();
    const index = records.findIndex(r => r.id === record.id);
    
    if (index !== -1) {
      records[index] = { ...record, updatedAt: new Date().toISOString() };
      localStorage.setItem(this.STORAGE_KEYS.READING_RECORDS, JSON.stringify(records));
      
      // 読書完了の場合
      if (record.status === 'completed' && record.endDate) {
        this.logActivity(record.userId, 'finish_reading', { 
          bookId: record.bookId, 
          readingTime: record.readingTime,
          rating: record.rating 
        });
      }
    }
  }

  getAllReadingRecords(): ReadingRecord[] {
    const stored = localStorage.getItem(this.STORAGE_KEYS.READING_RECORDS);
    return stored ? JSON.parse(stored) : [];
  }

  getUserReadingRecords(userId: string): ReadingRecord[] {
    return this.getAllReadingRecords().filter(r => r.userId === userId);
  }

  // 目標管理
  createGoal(goal: Omit<ReadingGoal, 'id' | 'createdAt' | 'updatedAt'>): ReadingGoal {
    const goals = this.getAllGoals();
    
    const newGoal: ReadingGoal = {
      ...goal,
      id: this.generateId(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    goals.push(newGoal);
    localStorage.setItem(this.STORAGE_KEYS.READING_GOALS, JSON.stringify(goals));
    
    this.logActivity(goal.userId, 'set_goal', { goalType: goal.type, targetValue: goal.targetValue });
    
    return newGoal;
  }

  updateGoal(goal: ReadingGoal): void {
    const goals = this.getAllGoals();
    const index = goals.findIndex(g => g.id === goal.id);
    
    if (index !== -1) {
      goals[index] = { ...goal, updatedAt: new Date().toISOString() };
      localStorage.setItem(this.STORAGE_KEYS.READING_GOALS, JSON.stringify(goals));
    }
  }

  getAllGoals(): ReadingGoal[] {
    const stored = localStorage.getItem(this.STORAGE_KEYS.READING_GOALS);
    return stored ? JSON.parse(stored) : [];
  }

  getUserGoals(userId: string): ReadingGoal[] {
    return this.getAllGoals().filter(g => g.userId === userId);
  }

  // 連続記録管理
  updateReadingStreak(userId: string, readingDate: string): void {
    const streaks = this.getAllReadingStreaks();
    let userStreak = streaks.find(s => s.userId === userId);
    
    if (!userStreak) {
      userStreak = {
        id: this.generateId(),
        userId,
        currentStreak: 1,
        longestStreak: 1,
        lastReadingDate: readingDate,
        streakStartDate: readingDate,
        totalReadingDays: 1,
        streakHistory: [{
          date: readingDate,
          readingTime: 0,
          booksRead: 0,
          pagesRead: 0,
          achieved: true
        }]
      };
      streaks.push(userStreak);
    } else {
      const lastDate = new Date(userStreak.lastReadingDate);
      const currentDate = new Date(readingDate);
      const diffDays = Math.floor((currentDate.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24));
      
      if (diffDays === 1) {
        // 連続記録継続
        userStreak.currentStreak++;
        userStreak.longestStreak = Math.max(userStreak.longestStreak, userStreak.currentStreak);
      } else if (diffDays > 1) {
        // 連続記録リセット
        userStreak.currentStreak = 1;
        userStreak.streakStartDate = readingDate;
      }
      
      userStreak.lastReadingDate = readingDate;
      userStreak.totalReadingDays++;
      
      // 履歴に追加
      const existingDay = userStreak.streakHistory.find(d => d.date === readingDate);
      if (!existingDay) {
        userStreak.streakHistory.push({
          date: readingDate,
          readingTime: 0,
          booksRead: 0,
          pagesRead: 0,
          achieved: true
        });
      }
    }
    
    localStorage.setItem(this.STORAGE_KEYS.READING_STREAKS, JSON.stringify(streaks));
  }

  getAllReadingStreaks(): ReadingStreak[] {
    const stored = localStorage.getItem(this.STORAGE_KEYS.READING_STREAKS);
    return stored ? JSON.parse(stored) : [];
  }

  getUserReadingStreak(userId: string): ReadingStreak | null {
    return this.getAllReadingStreaks().find(s => s.userId === userId) || null;
  }

  // 通知設定
  getNotificationSettings(userId: string): NotificationSettings {
    const allSettings = this.getAllNotificationSettings();
    const userSettings = allSettings.find(s => s.userId === userId);
    
    if (!userSettings) {
      // デフォルト設定を作成
      const defaultSettings: NotificationSettings = {
        userId,
        readingReminder: {
          enabled: true,
          time: '19:00',
          frequency: 'daily',
          message: '📚 読書の時間です！今日はどんな本を読みましょうか？'
        },
        goalReminder: {
          enabled: true,
          frequency: 'weekly',
          time: '10:00'
        },
        coachSession: {
          enabled: true,
          autoStart: false,
          reminderTime: '20:00'
        },
        achievements: {
          enabled: true,
          celebrateStreaks: true,
          celebrateGoals: true
        }
      };
      
      allSettings.push(defaultSettings);
      localStorage.setItem(this.STORAGE_KEYS.NOTIFICATIONS, JSON.stringify(allSettings));
      return defaultSettings;
    }
    
    return userSettings;
  }

  updateNotificationSettings(settings: NotificationSettings): void {
    const allSettings = this.getAllNotificationSettings();
    const index = allSettings.findIndex(s => s.userId === settings.userId);
    
    if (index !== -1) {
      allSettings[index] = settings;
    } else {
      allSettings.push(settings);
    }
    
    localStorage.setItem(this.STORAGE_KEYS.NOTIFICATIONS, JSON.stringify(allSettings));
  }

  getAllNotificationSettings(): NotificationSettings[] {
    const stored = localStorage.getItem(this.STORAGE_KEYS.NOTIFICATIONS);
    return stored ? JSON.parse(stored) : [];
  }

  // アクティビティログ
  logActivity(userId: string, action: ActivityLog['action'], details: Record<string, any>): void {
    const logs = this.getAllActivityLogs();
    
    const newLog: ActivityLog = {
      id: this.generateId(),
      userId,
      action,
      details,
      timestamp: new Date().toISOString(),
      sessionId: this.getCurrentSessionId()
    };

    logs.push(newLog);
    
    // 最新1000件のみ保持
    if (logs.length > 1000) {
      logs.splice(0, logs.length - 1000);
    }
    
    localStorage.setItem(this.STORAGE_KEYS.ACTIVITY_LOGS, JSON.stringify(logs));
  }

  getAllActivityLogs(): ActivityLog[] {
    const stored = localStorage.getItem(this.STORAGE_KEYS.ACTIVITY_LOGS);
    return stored ? JSON.parse(stored) : [];
  }

  getUserActivityLogs(userId: string): ActivityLog[] {
    return this.getAllActivityLogs().filter(log => log.userId === userId);
  }

  // 本部集計機能
  getUserStats(): UserStats {
    const users = this.getAllUsers();
    const records = this.getAllReadingRecords();
    const goals = this.getAllGoals();
    const streaks = this.getAllReadingStreaks();
    // const logs = this.getAllActivityLogs();
    
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    
    // アクティブユーザー（過去30日間）
    const activeUsers = users.filter(u => new Date(u.lastActiveAt) > thirtyDaysAgo).length;
    
    // 今月の新規ユーザー
    const newUsersThisMonth = users.filter(u => new Date(u.createdAt) > thisMonthStart).length;
    
    // 年齢分布
    const totalAge = users.reduce((sum, u) => sum + u.age, 0);
    const averageAge = users.length > 0 ? totalAge / users.length : 0;
    
    // 読書レベル分布
    const readingLevelDistribution = users.reduce((dist, u) => {
      dist[u.readingLevel] = (dist[u.readingLevel] || 0) + 1;
      return dist;
    }, {} as Record<string, number>);
    
    // 興味分布
    const interestDistribution = users.reduce((dist, u) => {
      u.interests.forEach(interest => {
        dist[interest] = (dist[interest] || 0) + 1;
      });
      return dist;
    }, {} as Record<string, number>);
    
    // 読書統計
    const completedRecords = records.filter(r => r.status === 'completed');
    const totalBooksRead = completedRecords.length;
    const totalReadingTime = completedRecords.reduce((sum, r) => sum + r.readingTime, 0);
    const averageReadingTime = totalBooksRead > 0 ? totalReadingTime / totalBooksRead : 0;
    
    // 人気図書
    const bookPopularity = this.calculateBookPopularity(completedRecords);
    
    // 連続記録統計
    const streakStats = {
      averageStreak: streaks.length > 0 ? streaks.reduce((sum, s) => sum + s.currentStreak, 0) / streaks.length : 0,
      longestStreak: streaks.length > 0 ? Math.max(...streaks.map(s => s.longestStreak)) : 0,
      activeStreaks: streaks.filter(s => s.currentStreak > 0).length
    };
    
    // 目標統計
    const completedGoals = goals.filter(g => g.status === 'completed').length;
    const goalStats = {
      totalGoals: goals.length,
      completedGoals,
      completionRate: goals.length > 0 ? (completedGoals / goals.length) * 100 : 0
    };
    
    // テストスコア統計
    const testScores = users.reduce((scores, u) => {
      if (u.testHistory && u.testHistory.length > 0) {
        const latestTest = u.testHistory[u.testHistory.length - 1];
        scores.vocabulary.push(latestTest.vocabularyScore);
        scores.commonSense.push(latestTest.commonSenseScore);
        scores.overall.push(latestTest.overallLevel);
      }
      return scores;
    }, { vocabulary: [] as number[], commonSense: [] as number[], overall: [] as number[] });
    
    const testScoreDistribution = {
      vocabularyAverage: testScores.vocabulary.length > 0 ? testScores.vocabulary.reduce((a, b) => a + b, 0) / testScores.vocabulary.length : 0,
      commonSenseAverage: testScores.commonSense.length > 0 ? testScores.commonSense.reduce((a, b) => a + b, 0) / testScores.commonSense.length : 0,
      overallAverage: testScores.overall.length > 0 ? testScores.overall.reduce((a, b) => a + b, 0) / testScores.overall.length : 0
    };

    return {
      totalUsers: users.length,
      activeUsers,
      newUsersThisMonth,
      averageAge,
      readingLevelDistribution,
      interestDistribution,
      totalBooksRead,
      totalReadingTime,
      averageReadingTime,
      topBooks: bookPopularity.slice(0, 10),
      topGenres: [], // 後で実装
      testScoreDistribution,
      streakStats,
      goalStats,
      coachStats: {
        totalSessions: 0, // 後で実装
        averageComprehension: 0,
        mostCommonQuestions: []
      }
    };
  }

  // プライベートメソッド
  private generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }

  private getCurrentSessionId(): string {
    let sessionId = sessionStorage.getItem('yomitane_session_id');
    if (!sessionId) {
      sessionId = this.generateId();
      sessionStorage.setItem('yomitane_session_id', sessionId);
    }
    return sessionId;
  }

  private initializeUserSettings(userId: string): void {
    // 通知設定の初期化
    this.getNotificationSettings(userId);
    
    // 読書連続記録の初期化は読書開始時に自動作成
  }

  private deleteUserData(userId: string): void {
    // 読書記録を削除
    const records = this.getAllReadingRecords().filter(r => r.userId !== userId);
    localStorage.setItem(this.STORAGE_KEYS.READING_RECORDS, JSON.stringify(records));
    
    // 目標を削除
    const goals = this.getAllGoals().filter(g => g.userId !== userId);
    localStorage.setItem(this.STORAGE_KEYS.READING_GOALS, JSON.stringify(goals));
    
    // 連続記録を削除
    const streaks = this.getAllReadingStreaks().filter(s => s.userId !== userId);
    localStorage.setItem(this.STORAGE_KEYS.READING_STREAKS, JSON.stringify(streaks));
    
    // 通知設定を削除
    const notifications = this.getAllNotificationSettings().filter(n => n.userId !== userId);
    localStorage.setItem(this.STORAGE_KEYS.NOTIFICATIONS, JSON.stringify(notifications));
    
    // アクティビティログを削除
    const logs = this.getAllActivityLogs().filter(l => l.userId !== userId);
    localStorage.setItem(this.STORAGE_KEYS.ACTIVITY_LOGS, JSON.stringify(logs));
  }

  private calculateBookPopularity(records: ReadingRecord[]): any[] {
    const bookStats = records.reduce((stats, record) => {
      if (!stats[record.bookId]) {
        stats[record.bookId] = {
          readCount: 0,
          totalRating: 0,
          ratingCount: 0,
          totalReadingTime: 0,
          ageGroups: {}
        };
      }
      
      stats[record.bookId].readCount++;
      stats[record.bookId].totalReadingTime += record.readingTime;
      
      if (record.rating) {
        stats[record.bookId].totalRating += record.rating;
        stats[record.bookId].ratingCount++;
      }
      
      return stats;
    }, {} as any);
    
    return Object.entries(bookStats)
      .map(([bookId, stats]: [string, any]) => ({
        bookId,
        title: '', // 後で Book データと結合
        author: '',
        readCount: stats.readCount,
        averageRating: stats.ratingCount > 0 ? stats.totalRating / stats.ratingCount : 0,
        completionRate: 100, // 完了記録のみを対象としているため
        averageReadingTime: stats.totalReadingTime / stats.readCount,
        ageGroups: stats.ageGroups
      }))
      .sort((a, b) => b.readCount - a.readCount);
  }
}

export const userService = new UserService();