// Syllabus Data for dynamic dropdown population
const syllabusData = {
  arts: {
    "Political Science": ["Political Science", "History", "Economics", "Sociology"],
    "History": ["History", "Political Science", "Economics"],
    "Economics": ["Economics", "Political Science", "Mathematics"],
    "Sociology": ["Sociology", "Political Science", "Philosophy"],
    "Philosophy": ["Philosophy", "Sociology", "Political Science"]
  },
  science: {
    "Physics": ["Physics", "Mathematics", "Chemistry"],
    "Chemistry": ["Chemistry", "Physics", "Botany"],
    "Mathematics": ["Mathematics", "Physics", "Statistics"],
    "Botany": ["Botany", "Zoology", "Chemistry"],
    "Zoology": ["Zoology", "Botany", "Chemistry"]
  },
  commerce: {
    "Commerce": ["Commerce", "Economics", "Mathematics"]
  }
};

const BASE_URL = window.location.origin;

let currentUser = null;
let currentRole = null;

// Base64 file storage state
let uploadedFileName = null;
let uploadedFileData = null;

document.addEventListener('DOMContentLoaded', () => {
  // --- SELECTORS ---
  const studentPortal = document.getElementById('student-portal');
  const adminPortal = document.getElementById('admin-portal');
  const userProfile = document.getElementById('user-profile');
  const loggedUserName = document.getElementById('logged-user-name');
  const loggedUserRole = document.getElementById('logged-user-role');
  const logoutBtn = document.getElementById('logout-btn');

  // Sidebar Filters (Student)
  const filterStream = document.getElementById('filter-stream');
  const filterDept = document.getElementById('filter-dept');
  const filterSubject = document.getElementById('filter-subject');
  const searchInput = document.getElementById('search-input');
  const searchClearBtn = document.getElementById('search-clear-btn');
  const resetFiltersBtn = document.getElementById('reset-filters-btn');
  const notesGrid = document.getElementById('notes-grid');
  const notesCount = document.getElementById('notes-count');
  const noNotesMessage = document.getElementById('no-notes-message');

  // Admin Upload Note Elements
  const noteUploadForm = document.getElementById('note-upload-form');
  const editNoteId = document.getElementById('edit-note-id');
  const noteTitle = document.getElementById('note-title');
  const noteStream = document.getElementById('note-stream');
  const noteDept = document.getElementById('note-dept');
  const noteSubject = document.getElementById('note-subject');
  const noteContent = document.getElementById('note-content');
  const noteFile = document.getElementById('note-file');
  const fileLabel = document.getElementById('file-label');
  const fileInfo = document.getElementById('file-info');
  const fileInfoName = document.getElementById('file-info-name');
  const removeFileBtn = document.getElementById('remove-file-btn');
  const saveNoteBtn = document.getElementById('save-note-btn');
  const cancelEditBtn = document.getElementById('cancel-edit-btn');
  const formActionTitle = document.getElementById('form-action-title');

  // Modal Reader Elements
  const readerModal = document.getElementById('reader-modal');
  const modalStream = document.getElementById('modal-stream');
  const modalDeptSub = document.getElementById('modal-dept-sub');
  const modalTitle = document.getElementById('modal-title');
  const modalContent = document.getElementById('modal-content');
  const modalAttachmentContainer = document.getElementById('modal-attachment-container');
  const modalAttachmentName = document.getElementById('modal-attachment-name');
  const modalDownloadBtn = document.getElementById('modal-download-btn');
  const modalDate = document.getElementById('modal-date');
  const closeModalBtn = document.getElementById('close-modal-btn');

  // Toast Notification Elements
  const toast = document.getElementById('toast');
  const toastText = document.getElementById('toast-text');
  const toastIcon = document.getElementById('toast-icon');

  // Check login state from localStorage
  const checkSession = () => {
    const savedUser = localStorage.getItem('notes_user');
    const savedRole = localStorage.getItem('notes_role');
    
    if (savedUser && savedRole) {
      currentUser = savedUser;
      currentRole = savedRole;
      showPortal();
    } else {
      window.location.href = 'login.html';
    }
  };

  // --- INTERACTION / NAVIGATION FLOW ---

  // Dynamic dropdown utilities
  const populateDropdowns = (streamSelect, deptSelect, subSelect) => {
    streamSelect.addEventListener('change', () => {
      const stream = streamSelect.value;
      deptSelect.innerHTML = '<option value="">Select Department</option>';
      subSelect.innerHTML = '<option value="">Select Subject</option>';
      
      if (!stream || !syllabusData[stream]) return;
      
      Object.keys(syllabusData[stream]).forEach(dept => {
        const option = document.createElement('option');
        option.value = dept;
        option.textContent = dept;
        deptSelect.appendChild(option);
      });
      
      // If student portal, trigger notes reload on filter change
      if (streamSelect === filterStream) fetchNotes();
    });

    deptSelect.addEventListener('change', () => {
      const stream = streamSelect.value;
      const dept = deptSelect.value;
      subSelect.innerHTML = '<option value="">Select Subject</option>';
      
      if (!dept || !syllabusData[stream][dept]) return;
      
      syllabusData[stream][dept].forEach(sub => {
        const option = document.createElement('option');
        option.value = sub;
        option.textContent = sub;
        subSelect.appendChild(option);
      });
      
      if (streamSelect === filterStream) fetchNotes();
    });

    if (streamSelect === filterStream) {
      subSelect.addEventListener('change', fetchNotes);
    }
  };

  populateDropdowns(filterStream, filterDept, filterSubject);
  populateDropdowns(noteStream, noteDept, noteSubject);

  // Search input listeners
  searchInput.addEventListener('input', () => {
    if (searchInput.value.trim().length > 0) {
      searchClearBtn.style.display = 'block';
    } else {
      searchClearBtn.style.display = 'none';
    }
    fetchNotes();
  });

  searchClearBtn.addEventListener('click', () => {
    searchInput.value = '';
    searchClearBtn.style.display = 'none';
    fetchNotes();
  });

  resetFiltersBtn.addEventListener('click', () => {
    filterStream.value = '';
    filterDept.innerHTML = '<option value="">All Departments</option>';
    filterSubject.innerHTML = '<option value="">All Subjects</option>';
    searchInput.value = '';
    searchClearBtn.style.display = 'none';
    fetchNotes();
  });

  // Admin Sub Tab Switching
  document.querySelectorAll('.admin-tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.admin-tab-btn').forEach(b => b.classList.remove('active'));
      document.querySelectorAll('.admin-sub-tab').forEach(t => t.classList.remove('active'));
      
      btn.classList.add('active');
      const targetId = btn.getAttribute('data-tab');
      document.getElementById(targetId).classList.add('active');
      
      // Load respective tab datasets
      if (targetId === 'admin-manage-notes') loadAdminNotes();
      else if (targetId === 'admin-user-accounts') loadAdminUsers();
      else if (targetId === 'admin-system-logs') loadAdminLogs();
    });
  });

  // --- API COMMUNICATIONS ---

  // Logout Action
  logoutBtn.addEventListener('click', () => {
    // Log logout event on backend optionally
    fetch(`${BASE_URL}/api/logs`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: currentUser, action: 'logout', target: 'User Logout' })
    }).catch(e => console.error("Logout logging failed:", e));

    localStorage.removeItem('notes_user');
    localStorage.removeItem('notes_role');
    localStorage.removeItem('notes_email');
    localStorage.removeItem('notes_avatar');
    currentUser = null;
    currentRole = null;
    window.location.href = 'login.html';
  });

  // Fetch Notes & Populates User Grid
  async function fetchNotes() {
    const stream = filterStream.value;
    const department = filterDept.value;
    const subject = filterSubject.value;
    const search = searchInput.value.trim();
    
    let url = `${BASE_URL}/api/notes?`;
    if (stream) url += `stream=${stream}&`;
    if (department) url += `department=${department}&`;
    if (subject) url += `subject=${subject}&`;
    if (search) url += `search=${encodeURIComponent(search)}&`;

    try {
      const res = await fetch(url);
      const notes = await res.json();
      
      notesGrid.innerHTML = '';
      notesCount.textContent = notes.length;
      
      if (notes.length === 0) {
        noNotesMessage.style.display = 'block';
        return;
      }
      
      noNotesMessage.style.display = 'none';
      
      notes.forEach(note => {
        const card = document.createElement('div');
        card.className = 'note-card';
        
        let streamClass = 'stream-science';
        if (note.stream === 'arts') streamClass = 'stream-arts';
        if (note.stream === 'commerce') streamClass = 'stream-commerce';
        
        const date = new Date(note.date_uploaded).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
        
        // Clean summary for display
        const contentSummary = note.content.replace(/[#*`$\\]/g, '').substring(0, 100) + '...';
        
        card.innerHTML = `
          <div class="card-stream-badge ${streamClass}">${note.stream}</div>
          <div class="card-subject">${note.subject}</div>
          <h4>${escapeHTML(note.title)}</h4>
          <p class="card-summary">${escapeHTML(contentSummary)}</p>
          <div class="card-footer">
            <div class="card-meta">
              <span>Dept: ${escapeHTML(note.department)}</span>
              <span>Uploaded: ${date}</span>
            </div>
            <div class="card-actions">
              <button class="card-btn btn-read" data-id="${note.id}">Read</button>
              ${note.file_name ? `<button class="card-btn btn-dl" data-id="${note.id}">Files</button>` : ''}
            </div>
          </div>
        `;
        
        // Add action listeners
        card.querySelector('.btn-read').addEventListener('click', () => openNoteReader(note.id));
        const dlBtn = card.querySelector('.btn-dl');
        if (dlBtn) dlBtn.addEventListener('click', () => downloadAttachment(note.id));
        
        notesGrid.appendChild(card);
      });
    } catch (err) {
      console.error('Failed to load notes:', err);
    }
  }

  // Reader Modal triggers
  async function openNoteReader(noteId) {
    try {
      const res = await fetch(`${BASE_URL}/api/notes/${noteId}`);
      const note = await res.json();
      
      modalTitle.textContent = note.title;
      modalStream.textContent = note.stream.toUpperCase();
      modalStream.className = `badge-stream stream-${note.stream}`;
      modalDeptSub.textContent = `${note.department} / ${note.subject}`;
      
      // Simple Markdown parser
      modalContent.innerHTML = formatMarkdown(note.content);
      
      // Attachment setup
      if (note.file_name) {
        modalAttachmentContainer.style.display = 'flex';
        modalAttachmentName.textContent = note.file_name;
        
        // Remove previous listeners
        const clone = modalDownloadBtn.cloneNode(true);
        modalDownloadBtn.parentNode.replaceChild(clone, modalDownloadBtn);
        document.getElementById('modal-download-btn').addEventListener('click', () => downloadAttachment(note.id));
      } else {
        modalAttachmentContainer.style.display = 'none';
      }
      
      modalDate.textContent = new Date(note.date_uploaded).toLocaleDateString();
      readerModal.style.display = 'flex';
      
      // Log read activity on server
      await fetch(`${BASE_URL}/api/logs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: currentUser, action: 'read_note', target: note.title })
      });
    } catch (err) {
      showToast('Error opening note reader.', 'danger');
    }
  }

  // File Download logic
  async function downloadAttachment(noteId) {
    try {
      const res = await fetch(`${BASE_URL}/api/notes/${noteId}`);
      const note = await res.json();
      
      if (!note.file_data) {
        showToast('No attachment file found.', 'danger');
        return;
      }
      
      // Trigger browser download of Base64 contents
      const link = document.createElement('a');
      link.href = note.file_data;
      link.download = note.file_name;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      showToast(`Downloading: ${note.file_name}`, 'success');
      
      // Log download event
      await fetch(`${BASE_URL}/api/logs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: currentUser, action: 'download_file', target: note.file_name })
      });
    } catch (err) {
      showToast('Failed to download attachment.', 'danger');
    }
  }

  // --- FILE ATTACHMENT DRAG & DROP READER ---
  noteFile.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    if (file.size > 5 * 1024 * 1024) {
      showToast('File size exceeds the 5MB limit.', 'danger');
      noteFile.value = '';
      return;
    }
    
    uploadedFileName = file.name;
    const reader = new FileReader();
    
    reader.onload = function(evt) {
      uploadedFileData = evt.target.result; // base64 DataURL
      fileLabel.textContent = 'File attached successfully!';
      fileInfo.style.display = 'flex';
      fileInfoName.textContent = `${file.name} (${formatBytes(file.size)})`;
    };
    
    reader.readAsDataURL(file);
  });

  removeFileBtn.addEventListener('click', () => {
    noteFile.value = '';
    uploadedFileName = null;
    uploadedFileData = null;
    fileLabel.textContent = 'Choose a file or drag it here';
    fileInfo.style.display = 'none';
  });

  // --- UPLOAD / EDIT NOTE SUBMISSION ---
  noteUploadForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const title = noteTitle.value.trim();
    const stream = noteStream.value;
    const department = noteDept.value;
    const subject = noteSubject.value;
    const content = noteContent.value.trim();
    const noteId = editNoteId.value;
    
    const bodyData = {
      title, stream, department, subject, content,
      file_name: uploadedFileName,
      file_data: uploadedFileData
    };
    
    try {
      let url = `${BASE_URL}/api/notes`;
      let method = 'POST';
      
      if (noteId) {
        url = `${BASE_URL}/api/notes/${noteId}`;
        method = 'PUT';
      }
      
      const res = await fetch(url, {
        method: method,
        headers: {
          'Content-Type': 'application/json',
          'x-username': currentUser
        },
        body: JSON.stringify(bodyData)
      });
      const data = await res.json();
      
      if (!res.ok) throw new Error(data.error || 'Operation failed');
      
      showToast(noteId ? 'Note updated successfully!' : 'Note uploaded successfully!', 'success');
      
      // Reset forms and return to list
      resetNoteForm();
      document.querySelector('[data-tab="admin-manage-notes"]').click();
    } catch (err) {
      showToast(err.message, 'danger');
    }
  });

  cancelEditBtn.addEventListener('click', resetNoteForm);

  function resetNoteForm() {
    noteUploadForm.reset();
    editNoteId.value = '';
    uploadedFileName = null;
    uploadedFileData = null;
    fileLabel.textContent = 'Choose a file or drag it here';
    fileInfo.style.display = 'none';
    formActionTitle.textContent = 'Upload New Lecture Note';
    saveNoteBtn.textContent = 'Save Note';
    cancelEditBtn.style.display = 'none';
    noteDept.innerHTML = '<option value="">Select Stream First</option>';
    noteSubject.innerHTML = '<option value="">Select Department First</option>';
  }

  // --- ADMIN REPORTS LOADING ---

  // 1. Manage Notes Tab
  async function loadAdminNotes() {
    const tableBody = document.getElementById('admin-notes-table-body');
    tableBody.innerHTML = '<tr><td colspan="7" style="text-align:center;">Loading notes...</td></tr>';
    
    try {
      const res = await fetch(`${BASE_URL}/api/notes`);
      const notes = await res.json();
      
      tableBody.innerHTML = '';
      if (notes.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="7" style="text-align:center;">No notes found.</td></tr>';
        return;
      }
      
      notes.forEach(n => {
        const tr = document.createElement('tr');
        const date = new Date(n.date_uploaded).toLocaleDateString();
        
        let streamClass = 'stream-science';
        if (n.stream === 'arts') streamClass = 'stream-arts';
        if (n.stream === 'commerce') streamClass = 'stream-commerce';
        
        tr.innerHTML = `
          <td><strong>${escapeHTML(n.title)}</strong></td>
          <td><span class="badge-row-stream ${streamClass}">${n.stream}</span></td>
          <td>${escapeHTML(n.department)}</td>
          <td>${escapeHTML(n.subject)}</td>
          <td>${date}</td>
          <td>${n.file_name ? `<span style="color:var(--success);">📎 ${escapeHTML(n.file_name)}</span>` : '<span style="color:var(--text-muted);">None</span>'}</td>
          <td>
            <div class="action-buttons">
              <button class="action-btn btn-edit" title="Edit Note">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 1 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
              </button>
              <button class="action-btn btn-del" title="Delete Note">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>
              </button>
            </div>
          </td>
        `;
        
        // Attach action handlers
        tr.querySelector('.btn-edit').addEventListener('click', () => enterEditMode(n));
        tr.querySelector('.btn-del').addEventListener('click', () => deleteNote(n.id, n.title));
        
        tableBody.appendChild(tr);
      });
    } catch (err) {
      tableBody.innerHTML = '<tr><td colspan="7" style="text-align:center; color:var(--danger);">Error loading notes.</td></tr>';
    }
  }

  function enterEditMode(note) {
    formActionTitle.textContent = `Edit Note: "${note.title}"`;
    editNoteId.value = note.id;
    noteTitle.value = note.title;
    noteStream.value = note.stream;
    
    // Trigger stream change to populate departments
    noteStream.dispatchEvent(new Event('change'));
    noteDept.value = note.department;
    
    // Trigger department change to populate subjects
    noteDept.dispatchEvent(new Event('change'));
    noteSubject.value = note.subject;
    
    noteContent.value = note.content;
    
    if (note.file_name) {
      uploadedFileName = note.file_name;
      uploadedFileData = note.file_data;
      fileLabel.textContent = 'Existing file attached';
      fileInfo.style.display = 'flex';
      fileInfoName.textContent = `${note.file_name} (Attached)`;
    } else {
      uploadedFileName = null;
      uploadedFileData = null;
      fileLabel.textContent = 'Choose a file or drag it here';
      fileInfo.style.display = 'none';
    }
    
    saveNoteBtn.textContent = 'Update Note';
    cancelEditBtn.style.display = 'block';
    
    // Switch to Upload form tab
    document.querySelector('[data-tab="admin-add-note"]').click();
  }

  async function deleteNote(id, title) {
    if (!confirm(`Are you sure you want to delete the note: "${title}"?`)) return;
    
    try {
      const res = await fetch(`${BASE_URL}/api/notes/${id}`, {
        method: 'DELETE',
        headers: {
          'x-username': currentUser
        }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      
      showToast('Note deleted successfully!', 'success');
      loadAdminNotes();
    } catch (err) {
      showToast(err.message, 'danger');
    }
  }

  // 2. Registered Students Tab
  async function loadAdminUsers() {
    const tableBody = document.getElementById('admin-users-table-body');
    tableBody.innerHTML = '<tr><td colspan="4" style="text-align:center;">Loading student accounts...</td></tr>';
    
    try {
      const res = await fetch(`${BASE_URL}/api/users`, {
        headers: { 'x-username': currentUser }
      });
      const users = await res.json();
      
      tableBody.innerHTML = '';
      users.forEach(u => {
        const tr = document.createElement('tr');
        const date = new Date(u.created_at).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
        
        tr.innerHTML = `
          <td>${u.id}</td>
          <td><strong>${escapeHTML(u.username)}</strong></td>
          <td><span style="color:${u.role === 'admin' ? '#a855f7' : '#818cf8'}; font-weight:700;">${u.role.toUpperCase()}</span></td>
          <td>${date}</td>
        `;
        tableBody.appendChild(tr);
      });
    } catch (err) {
      tableBody.innerHTML = '<tr><td colspan="4" style="text-align:center; color:var(--danger);">Error loading student list.</td></tr>';
    }
  }

  // 3. System Logs Tab
  async function loadAdminLogs() {
    const tableBody = document.getElementById('admin-logs-table-body');
    tableBody.innerHTML = '<tr><td colspan="4" style="text-align:center;">Loading audit logs...</td></tr>';
    
    try {
      const res = await fetch(`${BASE_URL}/api/logs`, {
        headers: { 'x-username': currentUser }
      });
      const logs = await res.json();
      
      tableBody.innerHTML = '';
      logs.forEach(l => {
        const tr = document.createElement('tr');
        const time = new Date(l.timestamp).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', second: '2-digit' });
        const date = new Date(l.timestamp).toLocaleDateString();
        
        let actionColor = 'var(--text-primary)';
        if (l.action.includes('create') || l.action.includes('register')) actionColor = 'var(--success)';
        if (l.action.includes('delete')) actionColor = 'var(--danger)';
        if (l.action.includes('login')) actionColor = '#fbbf24';
        
        tr.innerHTML = `
          <td><span style="color:var(--text-muted);">${date}</span> ${time}</td>
          <td><strong>${escapeHTML(l.username)}</strong></td>
          <td><span style="color:${actionColor}; font-weight:600; text-transform:uppercase; font-size:0.75rem;">${l.action}</span></td>
          <td>${escapeHTML(l.target || '-')}</td>
        `;
        tableBody.appendChild(tr);
      });
    } catch (err) {
      tableBody.innerHTML = '<tr><td colspan="4" style="text-align:center; color:var(--danger);">Error loading logs.</td></tr>';
    }
  }

  // --- RENDER FLOW CONTROLLERS ---

  // Shows main dashboard panels
  function showPortal() {
    userProfile.style.display = 'flex';
    
    loggedUserName.textContent = currentUser;
    loggedUserRole.textContent = currentRole;
    
    if (currentRole === 'admin') {
      studentPortal.style.display = 'none';
      adminPortal.style.display = 'block';
      // Load initial admin page tab
      document.querySelector('[data-tab="admin-add-note"]').click();
    } else {
      adminPortal.style.display = 'none';
      studentPortal.style.display = 'block';
      // Load student notes listing
      resetFiltersBtn.click();
    }
  }

  // Modal Closing Triggers
  closeModalBtn.addEventListener('click', () => {
    readerModal.style.display = 'none';
  });

  readerModal.addEventListener('click', (e) => {
    if (e.target === readerModal) {
      readerModal.style.display = 'none';
    }
  });

  // --- GENERAL HELPER UTILITIES ---

  // Toast message controller
  let toastTimeout;
  function showToast(message, type = 'danger') {
    toastText.textContent = message;
    
    // Apply styling classes
    toast.className = `toast show toast-${type}`;
    
    // Choose appropriate SVG icon path
    if (type === 'success') {
      toastIcon.innerHTML = `<path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline>`;
    } else if (type === 'danger') {
      toastIcon.innerHTML = `<circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line>`;
    } else {
      toastIcon.innerHTML = `<circle cx="12" cy="12" r="10"></circle><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line>`;
    }

    clearTimeout(toastTimeout);
    toastTimeout = setTimeout(() => {
      toast.classList.remove('show');
    }, 4000);
  }

  // Escape HTML Strings to avoid XSS
  function escapeHTML(str) {
    if (!str) return '';
    return str.replace(/[&<>'"]/g, 
      tag => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[tag] || tag)
    );
  }

  // Human-readable bytes formatting
  function formatBytes(bytes, decimals = 2) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
  }

  // Elementary Markdown Formatter
  function formatMarkdown(md) {
    if (!md) return '';
    let html = escapeHTML(md);
    
    // Headers
    html = html.replace(/^### (.*$)/gim, '<h3>$1</h3>');
    html = html.replace(/^## (.*$)/gim, '<h2>$1</h2>');
    html = html.replace(/^# (.*$)/gim, '<h1>$1</h1>');
    
    // Bold
    html = html.replace(/\*\*(.*)\*\*/gim, '<strong>$1</strong>');
    
    // Lists
    html = html.replace(/^\* (.*$)/gim, '<li>$1</li>');
    // Wrap lists (very simple handler)
    html = html.replace(/(<li>.*<\/li>)/gim, '<ul>$1</ul>');
    html = html.replace(/<\/ul>\s*<ul>/gim, '');
    
    // Paragraph breaks
    html = html.replace(/\n\n/g, '<br><br>');
    
    return html;
  }

  // Begin Session Check
  checkSession();
});
