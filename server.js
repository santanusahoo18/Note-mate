const express = require('express');
const cors = require('cors');
const path = require('path');
const DB = require('./database');

const app = express();
const PORT = process.env.PORT || 3000;

// Enable CORS and increase body limit for base64 file uploads
app.use(cors());
app.use(express.json({ limit: '12mb' }));
app.use(express.urlencoded({ limit: '12mb', extended: true }));

// Serve static frontend files from current directory
app.use(express.static(__dirname));

// Simple authorization middleware
const verifyAdmin = async (req, res, next) => {
  const username = req.headers['x-username'] || '';
  const user = await DB.getUser(username);
  
  if (user && user.role === 'admin') {
    next();
  } else {
    res.status(403).json({ error: 'Access Denied: Admin authorization required.' });
  }
};

// --- AUTHENTICATION ROUTES ---

app.post('/api/auth/register', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required.' });
  }
  
  try {
    const existing = await DB.getUser(username);
    if (existing) {
      return res.status(400).json({ error: 'Username already registered.' });
    }
    
    const user = await DB.createUser(username, password, 'student');
    await DB.createLog(username, 'register', 'Student Account Created');
    res.status(201).json({ message: 'User registered successfully', user });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/auth/login', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required.' });
  }
  
  try {
    const user = await DB.getUser(username);
    if (!user || user.password !== password) {
      return res.status(401).json({ error: 'Invalid username or password.' });
    }
    
    await DB.createLog(username, 'login', `${user.role.toUpperCase()} Portal Access`);
    res.json({ message: 'Login successful', username: user.username, role: user.role });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- NOTES API ROUTES ---

app.get('/api/notes', async (req, res) => {
  const { stream, department, subject, search } = req.query;
  try {
    const notes = await DB.getNotes({ stream, department, subject, search });
    res.json(notes);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/notes/:id', async (req, res) => {
  try {
    const note = await DB.getNote(req.params.id);
    if (!note) return res.status(404).json({ error: 'Note not found.' });
    res.json(note);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/notes', verifyAdmin, async (req, res) => {
  const { title, stream, department, subject, content, file_name, file_data } = req.body;
  
  if (!title || !stream || !department || !subject || !content) {
    return res.status(400).json({ error: 'Missing required note fields.' });
  }
  
  try {
    const note = await DB.createNote(title, stream, department, subject, content, file_name, file_data);
    const adminUser = req.headers['x-username'];
    await DB.createLog(adminUser, 'create_note', `Note: "${title}" added to ${stream.toUpperCase()}`);
    res.status(201).json(note);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/notes/:id', verifyAdmin, async (req, res) => {
  const { title, stream, department, subject, content, file_name, file_data } = req.body;
  const noteId = req.params.id;
  
  if (!title || !stream || !department || !subject || !content) {
    return res.status(400).json({ error: 'Missing required note fields.' });
  }
  
  try {
    const updated = await DB.updateNote(noteId, title, stream, department, subject, content, file_name, file_data);
    const adminUser = req.headers['x-username'];
    await DB.createLog(adminUser, 'update_note', `Note: "${title}" updated`);
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/notes/:id', verifyAdmin, async (req, res) => {
  const noteId = req.params.id;
  try {
    const note = await DB.getNote(noteId);
    if (!note) return res.status(404).json({ error: 'Note not found.' });
    
    await DB.deleteNote(noteId);
    const adminUser = req.headers['x-username'];
    await DB.createLog(adminUser, 'delete_note', `Note: "${note.title}" removed`);
    res.json({ message: 'Note deleted successfully.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- ADMIN REPORTS & LOGGING ROUTES ---

app.get('/api/users', verifyAdmin, async (req, res) => {
  try {
    const users = await DB.getUsers();
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/logs', verifyAdmin, async (req, res) => {
  try {
    const logs = await DB.getLogs();
    res.json(logs);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/logs', async (req, res) => {
  const { username, action, target } = req.body;
  if (!username || !action) {
    return res.status(400).json({ error: 'Username and action are required.' });
  }
  
  try {
    await DB.createLog(username, action, target);
    res.status(201).json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Fallback index.html path routing
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// Initialize database before starting HTTP listener
DB.init().then(() => {
  app.listen(PORT, () => {
    console.log(`===============================================`);
    console.log(`Notes Mate Backend listening on port ${PORT}`);
    console.log(`Access user portal at http://localhost:${PORT}/notes.html`);
    console.log(`===============================================`);
  });
}).catch(err => {
  console.error('Failed to initialize database:', err);
  process.exit(1);
});
