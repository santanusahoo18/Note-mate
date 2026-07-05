// Department & subject data based on standard syllabus patterns
const data = {
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

const creditStructure = { arts: 25, science: 28, commerce: 26 };

document.addEventListener('DOMContentLoaded', () => {
  // Set up profile details and logout button
  const savedUser = localStorage.getItem('notes_user');
  const savedRole = localStorage.getItem('notes_role');
  
  const loggedUserName = document.getElementById('logged-user-name');
  const loggedUserRole = document.getElementById('logged-user-role');
  const logoutBtn = document.getElementById('logout-btn');

  if (loggedUserName && loggedUserRole) {
    loggedUserName.textContent = savedUser || '-';
    loggedUserRole.textContent = savedRole || '-';
  }

  if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
      // Log logout event on backend optionally
      fetch(window.location.origin + '/api/logs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: savedUser, action: 'logout', target: 'User Logout' })
      }).catch(e => console.error("Logout logging failed:", e));

      localStorage.removeItem('notes_user');
      localStorage.removeItem('notes_role');
      localStorage.removeItem('notes_email');
      localStorage.removeItem('notes_avatar');
      window.location.href = 'login.html';
    });
  }

  const streamSelect = document.getElementById('stream');
  const deptSelect = document.getElementById('department');
  const majorSelect = document.getElementById('major');
  const minorSelect = document.getElementById('minor');
  const gradeInput = document.getElementById('grade');
  const calcBtn = document.getElementById('calc-btn');
  const resultContainer = document.getElementById('result-container');
  const toastElement = document.getElementById('toast');

  // Load departments based on selected stream
  streamSelect.addEventListener('change', () => {
    const stream = streamSelect.value;
    
    // Reset dependant dropdowns
    deptSelect.innerHTML = '<option value="">Select Department</option>';
    majorSelect.innerHTML = '<option value="">Select Major Subject</option>';
    minorSelect.innerHTML = '<option value="">Select Minor Subject</option>';
    
    if (!stream) return;
    
    const departments = Object.keys(data[stream]);
    departments.forEach(dept => {
      const option = document.createElement('option');
      option.value = dept;
      option.textContent = dept;
      deptSelect.appendChild(option);
    });
  });

  // Load subjects based on selected department
  deptSelect.addEventListener('change', () => {
    const stream = streamSelect.value;
    const dept = deptSelect.value;
    
    majorSelect.innerHTML = '<option value="">Select Major Subject</option>';
    minorSelect.innerHTML = '<option value="">Select Minor Subject</option>';
    
    if (!dept) return;
    
    const subjects = data[stream][dept];
    subjects.forEach(sub => {
      // Add to Major
      const majorOption = document.createElement('option');
      majorOption.value = sub;
      majorOption.textContent = sub;
      majorSelect.appendChild(majorOption);
      
      // Add to Minor
      const minorOption = document.createElement('option');
      minorOption.value = sub;
      minorOption.textContent = sub;
      minorSelect.appendChild(minorOption);
    });
  });

  // Calculate SGPA and update UI
  calcBtn.addEventListener('click', () => {
    const stream = streamSelect.value;
    const dept = deptSelect.value;
    const major = majorSelect.value;
    const minor = minorSelect.value;
    const gradeVal = gradeInput.value;
    const grade = parseFloat(gradeVal);

    // Validate inputs
    if (!stream) {
      showToast('Please select an academic stream.');
      return;
    }
    if (!dept) {
      showToast('Please select your department.');
      return;
    }
    if (!major) {
      showToast('Please select your Major subject.');
      return;
    }
    if (!minor) {
      showToast('Please select your Minor subject.');
      return;
    }
    if (gradeVal === '' || isNaN(grade) || grade < 0 || grade > 10) {
      showToast('Please enter a valid Grade Point between 0 and 10.');
      return;
    }

    const sgpa = grade;
    const totalCredits = creditStructure[stream] || 0;

    // Determine performance tier & styling class
    let performance = 'Fail';
    let badgeClass = 'badge-fail';
    
    if (sgpa >= 9.0) {
      performance = 'Outstanding';
      badgeClass = 'badge-outstanding';
    } else if (sgpa >= 8.0) {
      performance = 'Excellent';
      badgeClass = 'badge-excellent';
    } else if (sgpa >= 7.0) {
      performance = 'Very Good';
      badgeClass = 'badge-excellent';
    } else if (sgpa >= 6.0) {
      performance = 'Good';
      badgeClass = 'badge-good';
    } else if (sgpa >= 4.0) {
      performance = 'Pass';
      badgeClass = 'badge-pass';
    }

    // Populate Results
    document.getElementById('result-sgpa').textContent = sgpa.toFixed(2);
    
    const performanceBadge = document.getElementById('result-performance');
    performanceBadge.textContent = performance;
    performanceBadge.className = `result-badge ${badgeClass}`;
    
    document.getElementById('detail-stream').textContent = stream.toUpperCase();
    document.getElementById('detail-dept').textContent = dept;
    document.getElementById('detail-major').textContent = major;
    document.getElementById('detail-minor').textContent = minor;
    document.getElementById('detail-credits').textContent = totalCredits;

    // Display Results Container with entry transition
    resultContainer.style.display = 'block';
    resultContainer.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  });

  // Custom Toast Message Controller
  let toastTimeout;
  function showToast(message) {
    document.getElementById('toast-text').textContent = message;
    toastElement.classList.add('show');
    
    clearTimeout(toastTimeout);
    toastTimeout = setTimeout(() => {
      toastElement.classList.remove('show');
    }, 4000);
  }
});
