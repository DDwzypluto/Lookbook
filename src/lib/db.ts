import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

const DB_PATH = process.env.DB_PATH || (
  process.env.NODE_ENV === 'production'
    ? '/data/reader.db'
    : path.join(process.cwd(), '..', 'reader-data', 'reader.db')
);

function ensureDataDir() {
  const dir = path.dirname(DB_PATH);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

let db: Database.Database | null = null;

export function getDb(): Database.Database {
  if (!db) {
    ensureDataDir();
    db = new Database(DB_PATH);
    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = ON');
  }
  return db;
}

export function initDb() {
  const d = getDb();
  d.exec(`
    CREATE TABLE IF NOT EXISTS books (
      id              INTEGER PRIMARY KEY AUTOINCREMENT,
      title           TEXT NOT NULL,
      author          TEXT DEFAULT '',
      cover_url       TEXT DEFAULT '',
      description     TEXT DEFAULT '',
      source_id       TEXT NOT NULL,
      source_url      TEXT NOT NULL UNIQUE,
      language        TEXT DEFAULT 'zh',
      license         TEXT DEFAULT 'web-novel',
      user_id         INTEGER,
      last_chapter    TEXT DEFAULT '',
      total_chapters  INTEGER DEFAULT 0,
      is_finished     INTEGER DEFAULT 0,
      created_at      TEXT DEFAULT (datetime('now')),
      updated_at      TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS chapters (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      book_id       INTEGER NOT NULL REFERENCES books(id) ON DELETE CASCADE,
      title         TEXT NOT NULL,
      chapter_num   REAL NOT NULL,
      source_url    TEXT NOT NULL,
      content       TEXT DEFAULT '',
      is_cached     INTEGER DEFAULT 0,
      word_count    INTEGER DEFAULT 0,
      created_at    TEXT DEFAULT (datetime('now')),
      UNIQUE(book_id, chapter_num)
    );

    CREATE INDEX IF NOT EXISTS idx_chapters_book_id ON chapters(book_id);
    CREATE INDEX IF NOT EXISTS idx_chapters_book_num ON chapters(book_id, chapter_num);

    CREATE TABLE IF NOT EXISTS reading_progress (
      id              INTEGER PRIMARY KEY AUTOINCREMENT,
      book_id         INTEGER NOT NULL REFERENCES books(id) ON DELETE CASCADE,
      user_id         INTEGER DEFAULT 0,
      chapter_id      INTEGER NOT NULL REFERENCES chapters(id),
      scroll_percent  REAL DEFAULT 0,
      updated_at      TEXT DEFAULT (datetime('now')),
      UNIQUE(book_id, user_id)
    );

    CREATE TABLE IF NOT EXISTS users (
      id              INTEGER PRIMARY KEY AUTOINCREMENT,
      email           TEXT NOT NULL UNIQUE,
      name            TEXT DEFAULT '',
      password_hash   TEXT DEFAULT '',
      image           TEXT DEFAULT '',
      created_at      TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS ads (
      id              INTEGER PRIMARY KEY AUTOINCREMENT,
      type            TEXT NOT NULL DEFAULT 'image',
      title           TEXT DEFAULT '',
      url             TEXT NOT NULL,
      duration        INTEGER DEFAULT 10,
      lang            TEXT DEFAULT 'all',
      active          INTEGER DEFAULT 1,
      created_at      TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS chapter_translations (
      id              INTEGER PRIMARY KEY AUTOINCREMENT,
      chapter_id      INTEGER NOT NULL REFERENCES chapters(id) ON DELETE CASCADE,
      lang            TEXT NOT NULL,
      content         TEXT DEFAULT '',
      word_count      INTEGER DEFAULT 0,
      created_at      TEXT DEFAULT (datetime('now')),
      UNIQUE(chapter_id, lang)
    );

    CREATE TABLE IF NOT EXISTS ad_views (
      id              INTEGER PRIMARY KEY AUTOINCREMENT,
      ad_id           INTEGER NOT NULL REFERENCES ads(id),
      user_id         INTEGER DEFAULT 0,
      book_id         INTEGER DEFAULT 0,
      chapter_id      INTEGER DEFAULT 0,
      completed       INTEGER DEFAULT 0,
      viewed_at       TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS token_balances (
      user_id         INTEGER PRIMARY KEY REFERENCES users(id),
      balance         INTEGER DEFAULT 0,
      total_used      INTEGER DEFAULT 0,
      updated_at      TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS token_transactions (
      id              INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id         INTEGER NOT NULL,
      amount          INTEGER NOT NULL,
      type            TEXT NOT NULL,
      description     TEXT DEFAULT '',
      created_at      TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS payment_orders (
      id              INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id         INTEGER NOT NULL,
      order_no        TEXT NOT NULL UNIQUE,
      amount          REAL NOT NULL,
      tokens          INTEGER NOT NULL,
      method          TEXT NOT NULL DEFAULT 'alipay',
      status          TEXT DEFAULT 'pending',
      paid_at         TEXT,
      created_at      TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS bookmarks (
      id              INTEGER PRIMARY KEY AUTOINCREMENT,
      book_id         INTEGER NOT NULL REFERENCES books(id) ON DELETE CASCADE,
      chapter_id      INTEGER NOT NULL REFERENCES chapters(id),
      note            TEXT DEFAULT '',
      chapter_offset  INTEGER DEFAULT 0,
      created_at      TEXT DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_bookmarks_book_id ON bookmarks(book_id);
  `);
}

export interface BookRow {
  id: number;
  title: string;
  author: string;
  cover_url: string;
  description: string;
  source_id: string;
  source_url: string;
  last_chapter: string;
  total_chapters: number;
  is_finished: number;
  language: string;
  license: string;
  user_id: number;
  created_at: string;
  updated_at: string;
}

export interface ChapterRow {
  id: number;
  book_id: number;
  title: string;
  chapter_num: number;
  source_url: string;
  content: string;
  is_cached: number;
  word_count: number;
}

export interface UserRow {
  id: number;
  email: string;
  name: string;
  password_hash: string;
  image: string;
  created_at: string;
}

export interface ProgressRow {
  id: number;
  book_id: number;
  user_id: number;
  chapter_id: number;
  scroll_percent: number;
  updated_at: string;
}

export interface BookmarkRow {
  id: number;
  book_id: number;
  chapter_id: number;
  note: string;
  chapter_offset: number;
  created_at: string;
}

// Book CRUD
export function listBooks(): (BookRow & { progress_chapter_id?: number; progress_scroll?: number })[] {
  return getDb().prepare(`
    SELECT b.*, rp.chapter_id as progress_chapter_id, rp.scroll_percent as progress_scroll
    FROM books b
    LEFT JOIN reading_progress rp ON b.id = rp.book_id
    ORDER BY rp.updated_at DESC, b.updated_at DESC
  `).all() as any[];
}

export function getBook(id: number): BookRow | undefined {
  return getDb().prepare('SELECT * FROM books WHERE id = ?').get(id) as BookRow | undefined;
}

export function getBookBySourceUrl(sourceUrl: string): BookRow | undefined {
  return getDb().prepare('SELECT * FROM books WHERE source_url = ?').get(sourceUrl) as BookRow | undefined;
}

export function insertBook(book: Omit<BookRow, 'id' | 'created_at' | 'updated_at' | 'last_chapter' | 'total_chapters' | 'is_finished' | 'cover_url' | 'description' | 'author' | 'language' | 'license' | 'user_id'> & Partial<Pick<BookRow, 'author' | 'cover_url' | 'description' | 'language' | 'license'>>): BookRow {
  const result = getDb().prepare(`
    INSERT OR IGNORE INTO books (title, author, cover_url, description, source_id, source_url, language)
    VALUES (@title, @author, @cover_url, @description, @source_id, @source_url, @language)
  `).run({ language: 'zh', ...book });
  if (result.changes === 0) {
    return getBookBySourceUrl(book.source_url)!;
  }
  return getBook(result.lastInsertRowid as number)!;
}

export function updateBook(id: number, updates: Partial<Pick<BookRow, 'title' | 'author' | 'cover_url' | 'description' | 'last_chapter' | 'total_chapters' | 'is_finished'>>) {
  const fields = Object.keys(updates).map(k => `${k} = @${k}`).join(', ');
  getDb().prepare(`UPDATE books SET ${fields}, updated_at = datetime('now') WHERE id = @id`).run({ ...updates, id });
}

export function deleteBook(id: number) {
  getDb().prepare('DELETE FROM books WHERE id = ?').run(id);
}

// Chapter CRUD
export function listChapters(bookId: number): ChapterRow[] {
  return getDb().prepare('SELECT * FROM chapters WHERE book_id = ? ORDER BY chapter_num').all(bookId) as ChapterRow[];
}

export function getChapter(id: number): ChapterRow | undefined {
  return getDb().prepare('SELECT * FROM chapters WHERE id = ?').get(id) as ChapterRow | undefined;
}

export function getChapterByNum(bookId: number, chapterNum: number): ChapterRow | undefined {
  return getDb().prepare('SELECT * FROM chapters WHERE book_id = ? AND chapter_num = ?').get(bookId, chapterNum) as ChapterRow | undefined;
}

export function getAdjacentChapter(bookId: number, currentNum: number, direction: -1 | 1): ChapterRow | undefined {
  if (direction === 1) {
    return getDb().prepare('SELECT * FROM chapters WHERE book_id = ? AND chapter_num > ? ORDER BY chapter_num ASC LIMIT 1').get(bookId, currentNum) as ChapterRow | undefined;
  }
  return getDb().prepare('SELECT * FROM chapters WHERE book_id = ? AND chapter_num < ? ORDER BY chapter_num DESC LIMIT 1').get(bookId, currentNum) as ChapterRow | undefined;
}

export function insertChapter(chapter: Omit<ChapterRow, 'id' | 'created_at' | 'content' | 'is_cached' | 'word_count'>) {
  return getDb().prepare(`
    INSERT OR IGNORE INTO chapters (book_id, title, chapter_num, source_url)
    VALUES (@book_id, @title, @chapter_num, @source_url)
  `).run(chapter);
}

export function insertChapters(chapters: Omit<ChapterRow, 'id' | 'created_at' | 'content' | 'is_cached' | 'word_count'>[]) {
  const stmt = getDb().prepare(`
    INSERT OR IGNORE INTO chapters (book_id, title, chapter_num, source_url)
    VALUES (@book_id, @title, @chapter_num, @source_url)
  `);
  const tx = getDb().transaction(() => {
    for (const c of chapters) stmt.run(c);
  });
  tx();
}

export function updateChapterContent(id: number, content: string, wordCount: number) {
  getDb().prepare('UPDATE chapters SET content = @content, word_count = @word_count, is_cached = 1 WHERE id = @id')
    .run({ content, word_count: wordCount, id });
}

export function getUncachedChapters(bookId: number, afterChapterNum: number, limit: number): ChapterRow[] {
  return getDb().prepare(`
    SELECT * FROM chapters
    WHERE book_id = ? AND chapter_num > ? AND is_cached = 0
    ORDER BY chapter_num ASC LIMIT ?
  `).all(bookId, afterChapterNum, limit) as ChapterRow[];
}

// Progress CRUD
export function getProgress(bookId: number, userId = 0): ProgressRow | undefined {
  return getDb().prepare('SELECT * FROM reading_progress WHERE book_id = ? AND user_id = ?').get(bookId, userId) as ProgressRow | undefined;
}

export function upsertProgress(bookId: number, chapterId: number, scrollPercent: number, userId = 0) {
  getDb().prepare(`
    INSERT INTO reading_progress (book_id, user_id, chapter_id, scroll_percent, updated_at)
    VALUES (@book_id, @user_id, @chapter_id, @scroll_percent, datetime('now'))
    ON CONFLICT(book_id, user_id) DO UPDATE SET
      chapter_id = @chapter_id, scroll_percent = @scroll_percent, updated_at = datetime('now')
  `).run({ book_id: bookId, user_id: userId, chapter_id: chapterId, scroll_percent: scrollPercent });
}

// User CRUD
export function getUserByEmail(email: string): UserRow | undefined {
  return getDb().prepare('SELECT * FROM users WHERE email = ?').get(email) as UserRow | undefined;
}

export function getUserById(id: number): UserRow | undefined {
  return getDb().prepare('SELECT * FROM users WHERE id = ?').get(id) as UserRow | undefined;
}

export function createUser(email: string, name: string, passwordHash: string): UserRow {
  const result = getDb().prepare('INSERT INTO users (email, name, password_hash) VALUES (?, ?, ?)').run(email, name, passwordHash);
  return getUserById(result.lastInsertRowid as number)!;
}

// Bookmark CRUD
export function listBookmarks(bookId: number): BookmarkRow[] {
  return getDb().prepare('SELECT * FROM bookmarks WHERE book_id = ? ORDER BY created_at DESC').all(bookId) as BookmarkRow[];
}

export function insertBookmark(bookmark: Pick<BookmarkRow, 'book_id' | 'chapter_id' | 'note' | 'chapter_offset'>) {
  return getDb().prepare(`
    INSERT INTO bookmarks (book_id, chapter_id, note, chapter_offset)
    VALUES (@book_id, @chapter_id, @note, @chapter_offset)
  `).run(bookmark);
}

export function deleteBookmark(id: number) {
  getDb().prepare('DELETE FROM bookmarks WHERE id = ?').run(id);
}

// Ad CRUD
export interface AdRow {
  id: number; type: string; title: string; url: string; duration: number; lang: string; active: number;
}

export function listAds(): AdRow[] {
  return getDb().prepare('SELECT * FROM ads ORDER BY id DESC').all() as AdRow[];
}

export function getActiveAd(lang = 'all'): AdRow | undefined {
  return getDb().prepare("SELECT * FROM ads WHERE active = 1 AND (lang = ? OR lang = 'all') ORDER BY RANDOM() LIMIT 1").get(lang) as AdRow | undefined;
}

export function insertAd(ad: Omit<AdRow, 'id' | 'created_at'>) {
  getDb().prepare('INSERT INTO ads (type, title, url, duration, lang, active) VALUES (?, ?, ?, ?, ?, ?)').run(ad.type, ad.title, ad.url, ad.duration, ad.lang, ad.active);
}

export function updateAd(id: number, updates: Partial<Omit<AdRow, 'id' | 'created_at'>>) {
  const fields = Object.keys(updates).map(k => `${k} = @${k}`).join(', ');
  getDb().prepare(`UPDATE ads SET ${fields} WHERE id = @id`).run({ ...updates, id });
}

export function deleteAd(id: number) {
  getDb().prepare('DELETE FROM ads WHERE id = ?').run(id);
}

// Translation cache
export function getTranslation(chapterId: number, lang: string): { content: string; word_count: number } | undefined {
  return getDb().prepare('SELECT content, word_count FROM chapter_translations WHERE chapter_id = ? AND lang = ?').get(chapterId, lang) as any;
}

export function saveTranslation(chapterId: number, lang: string, content: string, wordCount: number) {
  getDb().prepare('INSERT OR REPLACE INTO chapter_translations (chapter_id, lang, content, word_count) VALUES (?, ?, ?, ?)').run(chapterId, lang, content, wordCount);
}

export function recordAdView(adId: number, userId = 0, bookId = 0, chapterId = 0, completed = 0) {
  getDb().prepare('INSERT INTO ad_views (ad_id, user_id, book_id, chapter_id, completed) VALUES (?, ?, ?, ?, ?)').run(adId, userId, bookId, chapterId, completed);
}

// Token system
export function getTokenBalance(userId: number): number {
  const row = getDb().prepare('SELECT balance FROM token_balances WHERE user_id = ?').get(userId) as any;
  return row?.balance || 0;
}

export function addTokens(userId: number, amount: number, description: string) {
  const tx = getDb().transaction(() => {
    getDb().prepare('INSERT OR IGNORE INTO token_balances (user_id, balance) VALUES (?, 0)').run(userId);
    getDb().prepare('UPDATE token_balances SET balance = balance + ?, updated_at = datetime(\'now\') WHERE user_id = ?').run(amount, userId);
    getDb().prepare('INSERT INTO token_transactions (user_id, amount, type, description) VALUES (?, ?, \'purchase\', ?)').run(userId, amount, description);
  });
  tx();
}

export function spendTokens(userId: number, amount: number, description: string): boolean {
  const bal = getTokenBalance(userId);
  if (bal < amount) return false;
  const tx = getDb().transaction(() => {
    getDb().prepare('UPDATE token_balances SET balance = balance - ?, total_used = total_used + ?, updated_at = datetime(\'now\') WHERE user_id = ?').run(amount, amount, userId);
    getDb().prepare('INSERT INTO token_transactions (user_id, amount, type, description) VALUES (?, ?, \'generate\', ?)').run(userId, -amount, description);
  });
  tx();
  return true;
}

export function getTokenTransactions(userId: number) {
  return getDb().prepare('SELECT * FROM token_transactions WHERE user_id = ? ORDER BY created_at DESC LIMIT 50').all(userId);
}

// Payment orders
export function createPaymentOrder(userId: number, amount: number, tokens: number, method: string) {
  const orderNo = `PAY${Date.now()}${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
  getDb().prepare('INSERT INTO payment_orders (user_id, order_no, amount, tokens, method) VALUES (?, ?, ?, ?, ?)').run(userId, orderNo, amount, tokens, method);
  return orderNo;
}

export function markOrderPaid(orderNo: string) {
  getDb().prepare("UPDATE payment_orders SET status = 'paid', paid_at = datetime('now') WHERE order_no = ?").run(orderNo);
  const order = getDb().prepare('SELECT * FROM payment_orders WHERE order_no = ?').get(orderNo) as any;
  if (order) addTokens(order.user_id, order.tokens, `充值 ${order.tokens} Token`);
  return order;
}

export function getPaymentOrder(orderNo: string) {
  return getDb().prepare('SELECT * FROM payment_orders WHERE order_no = ?').get(orderNo) as any;
}
