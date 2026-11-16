/**
 * Test Database Fixtures & State Isolation Utilities
 * Supports deterministic data resets between tests without wiping curriculum questions.
 * Reference: TEST_INFRA.md, PROJECT.md
 */
import { TestUser, PRIMARY_TEST_USER, SECONDARY_TEST_USER } from './mock-users';

export interface SeededReviewCard {
  id: string;
  userId: string;
  questionId: string;
  stage: number;
  intervalDays: number;
  easeFactor: number;
  dueDate: Date;
  lapses: number;
  consecutiveCorrect: number;
}

export interface SeededQuizSession {
  id: string;
  userId: string;
  subunitId: string;
  mode: 'practice' | 'exam';
  questionIds: string[];
  currentIndex: number;
  isCompleted: boolean;
  score: number;
  startedAt: Date;
}

/**
 * In-memory fallback / mock store for tests when Prisma client has not yet run migrations
 */
class InMemoryTestDbStore {
  users: Map<string, any> = new Map();
  reviewCards: Map<string, SeededReviewCard> = new Map();
  quizSessions: Map<string, SeededQuizSession> = new Map();
  bookmarks: Map<string, any> = new Map();
  notes: Map<string, any> = new Map();
  streaks: Map<string, any> = new Map();

  reset() {
    this.reviewCards.clear();
    this.quizSessions.clear();
    this.bookmarks.clear();
    this.notes.clear();
    this.streaks.clear();
  }

  resetUser(userId: string) {
    Array.from(this.reviewCards.entries()).forEach(([key, card]) => {
      if (card.userId === userId) this.reviewCards.delete(key);
    });
    Array.from(this.quizSessions.entries()).forEach(([key, session]) => {
      if (session.userId === userId) this.quizSessions.delete(key);
    });
    Array.from(this.bookmarks.entries()).forEach(([key, bm]) => {
      if (bm.userId === userId) this.bookmarks.delete(key);
    });
    Array.from(this.notes.entries()).forEach(([key, note]) => {
      if (note.userId === userId) this.notes.delete(key);
    });
    this.streaks.delete(userId);
  }
}

export const inMemoryDb = new InMemoryTestDbStore();

/**
 * Cleans all transactional test data for a given user while leaving static curriculum intact
 */
export async function cleanUserTestData(userId: string, prismaClient?: any): Promise<void> {
  if (prismaClient) {
    try {
      // If Prisma client is connected to test.db, delete user-scoped records
      await prismaClient.$transaction?.([
        prismaClient.quizSessionAnswer?.deleteMany({ where: { session: { userId } } }),
        prismaClient.quizSession?.deleteMany({ where: { userId } }),
        prismaClient.userQuestionReview?.deleteMany({ where: { userId } }),
        prismaClient.userBookmark?.deleteMany({ where: { userId } }),
        prismaClient.userNote?.deleteMany({ where: { userId } }),
        prismaClient.userDailyActivity?.deleteMany({ where: { userId } }),
        prismaClient.userStreak?.deleteMany({ where: { userId } }),
      ]);
    } catch {
      // Fallback to in-memory store if DB is unavailable or tables not yet migrated
      inMemoryDb.resetUser(userId);
    }
  } else {
    inMemoryDb.resetUser(userId);
  }
}

/**
 * Seeds a deterministic due review card for SuperMemo SM-2 verification
 */
export async function seedDueReviewCard(
  userId: string,
  questionId: string,
  stage: number = 1,
  intervalDays: number = 1,
  prismaClient?: any
): Promise<SeededReviewCard> {
  const card: SeededReviewCard = {
    id: `card-${userId}-${questionId}`,
    userId,
    questionId,
    stage,
    intervalDays,
    easeFactor: 2.5,
    dueDate: new Date(Date.now() - 3600 * 1000), // Due 1 hour ago
    lapses: 0,
    consecutiveCorrect: stage,
  };

  if (prismaClient?.userQuestionReview) {
    try {
      await prismaClient.userQuestionReview.upsert({
        where: { userId_questionId: { userId, questionId } },
        update: card,
        create: card,
      });
      return card;
    } catch {
      inMemoryDb.reviewCards.set(card.id, card);
      return card;
    }
  }

  inMemoryDb.reviewCards.set(card.id, card);
  return card;
}

/**
 * Seeds an active practice quiz session
 */
export async function seedActiveQuizSession(
  userId: string,
  subunitId: string,
  count: number = 10,
  prismaClient?: any
): Promise<SeededQuizSession> {
  const sessionId = `session-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
  const sessionData: SeededQuizSession = {
    id: sessionId,
    userId,
    subunitId,
    mode: 'practice',
    questionIds: Array.from({ length: count }, (_, i) => `q-test-${subunitId}-${i + 1}`),
    currentIndex: 0,
    isCompleted: false,
    score: 0,
    startedAt: new Date(),
  };

  if (prismaClient?.quizSession) {
    try {
      await prismaClient.quizSession.create({
        data: {
          id: sessionId,
          userId,
          title: `Luyện tập Subunit ${subunitId}`,
          mode: 'PRACTICE',
          filterScope: JSON.stringify({ subunitId }),
          totalQuestions: count,
          completedQuestions: 0,
          correctCount: 0,
          status: 'IN_PROGRESS',
          startedAt: sessionData.startedAt,
        },
      });
      return sessionData;
    } catch (error) {
      console.error(`Failed to seed quiz session into database:`, error);
      inMemoryDb.quizSessions.set(sessionData.id, sessionData);
      return sessionData;
    }
  }

  inMemoryDb.quizSessions.set(sessionData.id, sessionData);
  return sessionData;
}

/**
 * Seeds default primary and secondary test users into database or memory
 */
export async function seedDefaultTestUsers(prismaClient?: any): Promise<void> {
  const users = [PRIMARY_TEST_USER, SECONDARY_TEST_USER];
  for (const u of users) {
    const role = u.role === 'ADMIN' ? 'ADMIN' : 'STUDENT';
    if (prismaClient?.user) {
      try {
        await prismaClient.user.upsert({
          where: { email: u.email },
          update: {
            id: u.id,
            fullName: u.name,
            role,
            targetExamDate: new Date(Date.now() + 60 * 86400000),
          },
          create: {
            id: u.id,
            email: u.email,
            passwordHash: '$2a$10$X7vQjXkYV9Z4X0l8F1k3weL7U9p0kY1Q3Z4X0l8F1k3weL7U9p0kY', // pre-hashed 'Password123!'
            fullName: u.name,
            role,
            targetExamDate: new Date(Date.now() + 60 * 86400000),
          },
        });
      } catch (error) {
        console.error(`Failed to seed user ${u.email} into database:`, error);
        inMemoryDb.users.set(u.id, u);
        throw error;
      }
    } else {
      inMemoryDb.users.set(u.id, u);
    }
  }
}
