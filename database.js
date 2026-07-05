const fs = require('fs');
const path = require('path');

let dbEngine = 'json'; // 'sqlite' or 'json'
let sqliteDb = null;
const JSON_DB_PATH = path.join(__dirname, 'notes_db.json');

// Default initial data for database seeding
const DEFAULT_USERS = [
  { id: 1, username: 'admin', password: 'admin123', role: 'admin', created_at: new Date().toISOString() },
  { id: 2, username: 'student', password: 'student123', role: 'student', created_at: new Date().toISOString() }
];

const DEFAULT_NOTES = [
  {
    id: 1,
    title: 'Introduction to Quantum Mechanics',
    stream: 'science',
    department: 'Physics',
    subject: 'Physics',
    content: `## Quantum Mechanics Overview
Quantum mechanics is a fundamental theory in physics that provides a description of the physical properties of nature at the scale of atoms and subatomic particles.

### Key Concepts:
1. **Wave-Particle Duality**: Every particle or quantum entity may be described as either a particle or a wave.
2. **Schrödinger Equation**: Predicts the future behavior of a dynamic system.
3. **Uncertainty Principle**: Developed by Werner Heisenberg, stating that it is impossible to simultaneously know both the position and momentum of a particle with absolute precision.`,
    file_name: 'quantum_intro.txt',
    file_data: 'QnJpZWYgUXVhbnR1bSBNZWNoYW5pY3MgTm90ZXM6ClBhcnRpY2xlcyBiZWhhdmUgbGlrZSB3YXZlcy4gVGhlIHdhdmUgZnVuY3Rpb24gZGVzY3JpYmVzIHByb2JhYmlsaXR5IGRpc3RyaWJ1dGlvbi4=',
    date_uploaded: new Date().toISOString()
  },
  {
    id: 2,
    title: 'Macroeconomics: Fiscal & Monetary Policy',
    stream: 'arts',
    department: 'Economics',
    subject: 'Economics',
    content: `## Fiscal vs Monetary Policy
An analysis of the two primary levers of macroeconomic stabilization.

### Fiscal Policy
Controlled by the government (Treasury / Parliament).
* **Tools**: Taxation and Government spending.
* **Expansionary**: Lower taxes, higher spending to boost demand.
* **Contractionary**: Higher taxes, lower spending to combat inflation.

### Monetary Policy
Controlled by the Central Bank (e.g., Reserve Bank of India).
* **Tools**: Interest rates, open market operations, reserve requirements.
* **Expansionary**: Lower rates to encourage borrowing.
* **Contractionary**: Higher rates to cool off economic activity.`,
    file_name: 'macro_policies.txt',
    file_data: 'TWFjcm9lY29ub21pY3MgRm9ybXVsYXM6CkdEUD0gQyArIEkgKyBHICsgKEggLSBNKQpGaXNjYWwgcG9saWN5ID0gR292ZXJubWVudCBTcGVuZGluZyAmIFRheGVzCg==',
    date_uploaded: new Date().toISOString()
  },
  {
    id: 3,
    title: 'Fundamentals of Financial Accounting',
    stream: 'commerce',
    department: 'Commerce',
    subject: 'Commerce',
    content: `## The Accounting Equation
The core foundation of modern business accounting is:

$$\\text{Assets} = \\text{Liabilities} + \\text{Owner's Equity}$$

### Key Statements:
1. **Balance Sheet**: Snapshot of financial position at a specific point.
2. **Income Statement**: Reports financial performance over an interval.
3. **Cash Flow Statement**: Tracks cash inflows and outflows from operating, investing, and financing activities.`,
    file_name: 'accounting_core.txt',
    file_data: 'QWNjb3VudGluZyBSdWxlczoKMS4gRGViaXQgd2hhdCBjb21lcyBpbiwgQ3JlZGl0IHdoYXQgZ29lcyBvdXQuCjIuIERlYml0IGFsbCBleHBlbnNlcywgQ3JlZGl0IGFsbCBpbmNvbWVzLg==',
    date_uploaded: new Date().toISOString()
  }
];

const DEFAULT_LOGS = [
  { id: 1, username: 'admin', action: 'login', target: 'Admin Portal', timestamp: new Date().toISOString() }
];

// JSON Database Engine Implementation
const jsonDb = {
  read: () => {
    try {
      if (!fs.existsSync(JSON_DB_PATH)) {
        const initial = { users: [...DEFAULT_USERS], notes: [...DEFAULT_NOTES], logs: [...DEFAULT_LOGS] };
        fs.writeFileSync(JSON_DB_PATH, JSON.stringify(initial, null, 2), 'utf8');
        return initial;
      }
      return JSON.parse(fs.readFileSync(JSON_DB_PATH, 'utf8'));
    } catch (e) {
      console.error("Failed to read JSON DB:", e);
      return { users: [], notes: [], logs: [] };
    }
  },
  write: (data) => {
    try {
      fs.writeFileSync(JSON_DB_PATH, JSON.stringify(data, null, 2), 'utf8');
      return true;
    } catch (e) {
      console.error("Failed to write JSON DB:", e);
      return false;
    }
  }
};

// Main Database Manager Export
const DB = {
  async init() {
    try {
      // Attempt to load SQLite bindings
      const sqlite3 = require('sqlite3');
      const { open } = require('sqlite');
      
      sqliteDb = await open({
        filename: path.join(__dirname, 'notes_mate.db'),
        driver: sqlite3.Database
      });
      
      dbEngine = 'sqlite';
      console.log('Successfully connected to SQLite database: notes_mate.db');
      
      // Build SQLite tables
      await sqliteDb.exec(`
        CREATE TABLE IF NOT EXISTS users (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          username TEXT UNIQUE NOT NULL,
          password TEXT NOT NULL,
          role TEXT DEFAULT 'student',
          created_at TEXT
        );
        
        CREATE TABLE IF NOT EXISTS notes (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          title TEXT NOT NULL,
          stream TEXT NOT NULL,
          department TEXT NOT NULL,
          subject TEXT NOT NULL,
          content TEXT NOT NULL,
          file_name TEXT,
          file_data TEXT,
          date_uploaded TEXT
        );
        
        CREATE TABLE IF NOT EXISTS logs (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          username TEXT NOT NULL,
          action TEXT NOT NULL,
          target TEXT,
          timestamp TEXT
        );
      `);

      // Seed default tables if empty
      const userCount = await sqliteDb.get('SELECT COUNT(*) as count FROM users');
      if (userCount.count === 0) {
        for (const u of DEFAULT_USERS) {
          await sqliteDb.run('INSERT INTO users (username, password, role, created_at) VALUES (?, ?, ?, ?)', 
            u.username, u.password, u.role, u.created_at);
        }
      }
      
      const notesCount = await sqliteDb.get('SELECT COUNT(*) as count FROM notes');
      if (notesCount.count === 0) {
        for (const n of DEFAULT_NOTES) {
          await sqliteDb.run('INSERT INTO notes (title, stream, department, subject, content, file_name, file_data, date_uploaded) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
            n.title, n.stream, n.department, n.subject, n.content, n.file_name, n.file_data, n.date_uploaded);
        }
      }
      
      const logsCount = await sqliteDb.get('SELECT COUNT(*) as count FROM logs');
      if (logsCount.count === 0) {
        for (const l of DEFAULT_LOGS) {
          await sqliteDb.run('INSERT INTO logs (username, action, target, timestamp) VALUES (?, ?, ?, ?)',
            l.username, l.action, l.target, l.timestamp);
        }
      }
      
    } catch (err) {
      console.warn('SQLite library could not load or initialize. Falling back to local JSON file-database:', err.message);
      dbEngine = 'json';
      
      // Initialize JSON DB
      jsonDb.read();
    }
  },

  // Users APIs
  async getUser(username) {
    if (dbEngine === 'sqlite') {
      return await sqliteDb.get('SELECT * FROM users WHERE username = ?', username);
    } else {
      const data = jsonDb.read();
      return data.users.find(u => u.username.toLowerCase() === username.toLowerCase());
    }
  },

  async createUser(username, password, role = 'student') {
    const created_at = new Date().toISOString();
    if (dbEngine === 'sqlite') {
      const result = await sqliteDb.run(
        'INSERT INTO users (username, password, role, created_at) VALUES (?, ?, ?, ?)',
        username, password, role, created_at
      );
      return { id: result.lastID, username, role, created_at };
    } else {
      const data = jsonDb.read();
      if (data.users.some(u => u.username.toLowerCase() === username.toLowerCase())) {
        throw new Error('Username already exists');
      }
      const newId = data.users.length > 0 ? Math.max(...data.users.map(u => u.id)) + 1 : 1;
      const newUser = { id: newId, username, password, role, created_at };
      data.users.push(newUser);
      jsonDb.write(data);
      return { id: newId, username, role, created_at };
    }
  },

  async getUsers() {
    if (dbEngine === 'sqlite') {
      return await sqliteDb.all('SELECT id, username, role, created_at FROM users ORDER BY id DESC');
    } else {
      const data = jsonDb.read();
      return data.users.map(({ password, ...u }) => u).sort((a, b) => b.id - a.id);
    }
  },

  // Notes APIs
  async getNotes(filters = {}) {
    const { stream, department, subject, search } = filters;
    
    if (dbEngine === 'sqlite') {
      let query = 'SELECT * FROM notes WHERE 1=1';
      const params = [];
      
      if (stream) {
        query += ' AND stream = ?';
        params.push(stream);
      }
      if (department) {
        query += ' AND department = ?';
        params.push(department);
      }
      if (subject) {
        query += ' AND subject = ?';
        params.push(subject);
      }
      if (search) {
        query += ' AND (title LIKE ? OR content LIKE ?)';
        params.push(`%${search}%`, `%${search}%`);
      }
      
      query += ' ORDER BY id DESC';
      return await sqliteDb.all(query, ...params);
    } else {
      const data = jsonDb.read();
      let notes = data.notes;
      
      if (stream) notes = notes.filter(n => n.stream === stream);
      if (department) notes = notes.filter(n => n.department === department);
      if (subject) notes = notes.filter(n => n.subject === subject);
      if (search) {
        const term = search.toLowerCase();
        notes = notes.filter(n => n.title.toLowerCase().includes(term) || n.content.toLowerCase().includes(term));
      }
      
      return notes.sort((a, b) => b.id - a.id);
    }
  },

  async getNote(id) {
    if (dbEngine === 'sqlite') {
      return await sqliteDb.get('SELECT * FROM notes WHERE id = ?', id);
    } else {
      const data = jsonDb.read();
      return data.notes.find(n => n.id === parseInt(id));
    }
  },

  async createNote(title, stream, department, subject, content, file_name = null, file_data = null) {
    const date_uploaded = new Date().toISOString();
    if (dbEngine === 'sqlite') {
      const result = await sqliteDb.run(
        'INSERT INTO notes (title, stream, department, subject, content, file_name, file_data, date_uploaded) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        title, stream, department, subject, content, file_name, file_data, date_uploaded
      );
      return { id: result.lastID, title, stream, department, subject, content, file_name, date_uploaded };
    } else {
      const data = jsonDb.read();
      const newId = data.notes.length > 0 ? Math.max(...data.notes.map(n => n.id)) + 1 : 1;
      const newNote = { id: newId, title, stream, department, subject, content, file_name, file_data, date_uploaded };
      data.notes.push(newNote);
      jsonDb.write(data);
      return { id: newId, title, stream, department, subject, content, file_name, date_uploaded };
    }
  },

  async updateNote(id, title, stream, department, subject, content, file_name = null, file_data = null) {
    if (dbEngine === 'sqlite') {
      if (file_name && file_data) {
        await sqliteDb.run(
          'UPDATE notes SET title = ?, stream = ?, department = ?, subject = ?, content = ?, file_name = ?, file_data = ? WHERE id = ?',
          title, stream, department, subject, content, file_name, file_data, id
        );
      } else {
        await sqliteDb.run(
          'UPDATE notes SET title = ?, stream = ?, department = ?, subject = ?, content = ? WHERE id = ?',
          title, stream, department, subject, content, id
        );
      }
      return this.getNote(id);
    } else {
      const data = jsonDb.read();
      const idx = data.notes.findIndex(n => n.id === parseInt(id));
      if (idx === -1) throw new Error('Note not found');
      
      const updatedNote = { ...data.notes[idx], title, stream, department, subject, content };
      if (file_name && file_data) {
        updatedNote.file_name = file_name;
        updatedNote.file_data = file_data;
      }
      data.notes[idx] = updatedNote;
      jsonDb.write(data);
      return updatedNote;
    }
  },

  async deleteNote(id) {
    if (dbEngine === 'sqlite') {
      const result = await sqliteDb.run('DELETE FROM notes WHERE id = ?', id);
      return result.changes > 0;
    } else {
      const data = jsonDb.read();
      const origLength = data.notes.length;
      data.notes = data.notes.filter(n => n.id !== parseInt(id));
      jsonDb.write(data);
      return data.notes.length < origLength;
    }
  },

  // Logs APIs
  async getLogs() {
    if (dbEngine === 'sqlite') {
      return await sqliteDb.all('SELECT * FROM logs ORDER BY id DESC LIMIT 200');
    } else {
      const data = jsonDb.read();
      return [...data.logs].sort((a, b) => b.id - a.id).slice(0, 200);
    }
  },

  async createLog(username, action, target = null) {
    const timestamp = new Date().toISOString();
    if (dbEngine === 'sqlite') {
      await sqliteDb.run(
        'INSERT INTO logs (username, action, target, timestamp) VALUES (?, ?, ?, ?)',
        username, action, target, timestamp
      );
    } else {
      const data = jsonDb.read();
      const newId = data.logs.length > 0 ? Math.max(...data.logs.map(l => l.id)) + 1 : 1;
      data.logs.push({ id: newId, username, action, target, timestamp });
      jsonDb.write(data);
    }
  }
};

module.exports = DB;
