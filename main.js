const API_BASE = "http://localhost:5000/api/courses";

const STATUS_OPTIONS = ["Not Started", "In Progress", "Completed"];

const STATUS_BADGE_CLASS = {
  "Not Started": "badge-not-started",
  "In Progress": "badge-in-progress",
  "Completed": "badge-completed",
};

const app = document.getElementById("app");

let courses = [];
let isSubmitting = false;
let isModalSubmitting = false;
let editingCourse = null;

// ---------- Rendering ----------

function render() {
  app.innerHTML = `
    <header class="header">
      <h1>CodeCraftHub: Your Learning Management Platform</h1>
      <p>Plan, track, and complete your learning journey</p>
    </header>

    <main class="container">
      <section class="card" id="form-card">
        <div class="card-header">Add New Course</div>
        <div class="card-body">
          <form id="course-form" novalidate>
            <div class="form-grid">
              <div class="form-group full">
                <label for="f-name">Course Name</label>
                <input type="text" id="f-name" name="name" placeholder="e.g. Advanced JavaScript" />
              </div>
              <div class="form-group full">
                <label for="f-description">Description</label>
                <textarea id="f-description" name="description" placeholder="What will you learn?"></textarea>
              </div>
              <div class="form-group">
                <label for="f-target_date">Target Date</label>
                <input type="date" id="f-target_date" name="target_date" />
              </div>
              <div class="form-group">
                <label for="f-status">Status</label>
                <select id="f-status" name="status">
                  <option value="">Select status...</option>
                  ${STATUS_OPTIONS.map((s) => `<option value="${s}">${s}</option>`).join("")}
                </select>
              </div>
            </div>
            <div class="form-actions">
              <button type="submit" class="btn btn-primary" id="submit-btn">
                <span id="submit-label">Add Course</span>
              </button>
              <button type="button" class="btn btn-ghost" id="reset-btn">Reset</button>
            </div>
            <div class="alert" id="form-alert"></div>
          </form>
        </div>
      </section>

      <section class="card">
        <div class="card-header">Your Courses</div>
        <div class="card-body" id="courses-container">
          <div class="loading-overlay">
            <div class="spinner"></div>
            <p>Loading courses...</p>
          </div>
        </div>
        <div class="alert alert-error" id="list-alert"></div>
      </section>
    </main>

    <div class="modal-backdrop" id="edit-modal">
      <div class="modal">
        <div class="modal-header">
          <span>Edit Course</span>
          <button class="modal-close" id="modal-close">&times;</button>
        </div>
        <div class="modal-body">
          <form id="edit-form" novalidate>
            <div class="form-grid">
              <div class="form-group full">
                <label for="e-name">Course Name</label>
                <input type="text" id="e-name" name="name" />
              </div>
              <div class="form-group full">
                <label for="e-description">Description</label>
                <textarea id="e-description" name="description"></textarea>
              </div>
              <div class="form-group">
                <label for="e-target_date">Target Date</label>
                <input type="date" id="e-target_date" name="target_date" />
              </div>
              <div class="form-group">
                <label for="e-status">Status</label>
                <select id="e-status" name="status">
                  ${STATUS_OPTIONS.map((s) => `<option value="${s}">${s}</option>`).join("")}
                </select>
              </div>
            </div>
          </form>
        </div>
        <div class="modal-footer">
          <button class="btn btn-ghost" id="modal-cancel">Cancel</button>
          <button class="btn btn-success" id="modal-save">
            <span id="modal-save-label">Save Changes</span>
          </button>
        </div>
      </div>
    </div>
  `;

  attachListeners();
  fetchCourses();
}

// ---------- API helpers ----------

async function apiRequest(method, path, body) {
  const options = {
    method,
    headers: { "Content-Type": "application/json" },
  };
  if (body) options.body = JSON.stringify(body);

  const res = await fetch(`${API_BASE}${path}`, options);
  if (!res.ok) {
    let msg = `Request failed (${res.status})`;
    try {
      const err = await res.json();
      if (err.error || err.message) msg = err.error || err.message;
    } catch (_) {}
    throw new Error(msg);
  }
  if (res.status === 204) return null;
  return res.json();
}

// ---------- CRUD ----------

async function fetchCourses() {
  const container = document.getElementById("courses-container");
  const listAlert = document.getElementById("list-alert");
  listAlert.classList.remove("show");

  container.innerHTML = `
    <div class="loading-overlay">
      <div class="spinner"></div>
      <p>Loading courses...</p>
    </div>
  `;

  try {
    courses = await apiRequest("GET", "");
    renderCourses();
  } catch (err) {
    container.innerHTML = "";
    showListAlert(err.message);
  }
}

function renderCourses() {
  const container = document.getElementById("courses-container");

  if (!courses || courses.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="icon">📚</div>
        <p>No courses yet. Add your first course above!</p>
      </div>
    `;
    return;
  }

  container.innerHTML = `
    <div class="course-table-wrap">
      <table class="course-table">
        <thead>
          <tr>
            <th>ID</th>
            <th>Course</th>
            <th>Target Date</th>
            <th>Status</th>
            <th>Created</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          ${courses.map(courseRow).join("")}
        </tbody>
      </table>
    </div>
  `;
}

function courseRow(c) {
  const created = c.created_at ? formatDate(c.created_at) : "—";
  const target = c.target_date || "—";
  const badge = STATUS_BADGE_CLASS[c.status] || "badge-not-started";

  return `
    <tr>
      <td class="id-cell">${escapeHtml(String(c.id ?? ""))}</td>
      <td>
        <div class="course-name">${escapeHtml(c.name || "")}</div>
        <div class="course-desc">${escapeHtml(c.description || "")}</div>
      </td>
      <td class="date-cell">${escapeHtml(target)}</td>
      <td><span class="badge ${badge}">${escapeHtml(c.status || "")}</span></td>
      <td class="date-cell">${created}</td>
      <td>
        <div class="row-actions">
          <button class="btn btn-ghost btn-sm" onclick="openEditModal('${c.id}')">Edit</button>
          <button class="btn btn-danger btn-sm" onclick="deleteCourse('${c.id}')">Remove</button>
        </div>
      </td>
    </tr>
  `;
}

async function createCourse(data) {
  if (isSubmitting) return;
  setSubmitting(true);
  hideFormAlert();

  try {
    await apiRequest("POST", "", data);
    showFormAlert("Course added successfully!", "success");
    document.getElementById("course-form").reset();
    await fetchCourses();
  } catch (err) {
    showFormAlert(err.message, "error");
  } finally {
    setSubmitting(false);
  }
}

async function updateCourse(id, data) {
  if (isModalSubmitting) return;
  setModalSubmitting(true);
  hideModalAlert();

  try {
    await apiRequest("PUT", `/${id}`, data);
    closeModal();
    await fetchCourses();
  } catch (err) {
    showModalAlert(err.message);
  } finally {
    setModalSubmitting(false);
  }
}

async function deleteCourse(id) {
  if (!confirm("Are you sure you want to remove this course?")) return;

  try {
    await apiRequest("DELETE", `/${id}`);
    await fetchCourses();
  } catch (err) {
    showListAlert(err.message);
  }
}

// ---------- Modal ----------

function openEditModal(id) {
  const course = courses.find((c) => String(c.id) === String(id));
  if (!course) return;

  editingCourse = course;
  document.getElementById("e-name").value = course.name || "";
  document.getElementById("e-description").value = course.description || "";
  document.getElementById("e-target_date").value = course.target_date || "";
  document.getElementById("e-status").value = course.status || STATUS_OPTIONS[0];

  hideModalAlert();
  document.getElementById("edit-modal").classList.add("show");
}

function closeModal() {
  document.getElementById("edit-modal").classList.remove("show");
  editingCourse = null;
  hideModalAlert();
}

// ---------- Validation ----------

function validateForm(formId) {
  const form = document.getElementById(formId);
  const name = form.elements["name"].value.trim();
  const description = form.elements["description"].value.trim();
  const target_date = form.elements["target_date"].value.trim();
  const status = form.elements["status"].value.trim();

  const errors = [];
  if (!name) errors.push("Course name is required.");
  if (!description) errors.push("Description is required.");
  if (!target_date) errors.push("Target date is required.");
  if (!status) errors.push("Status is required.");
  if (target_date && !/^\d{4}-\d{2}-\d{2}$/.test(target_date)) {
    errors.push("Target date must be in YYYY-MM-DD format.");
  }

  return { valid: errors.length === 0, errors, data: { name, description, target_date, status } };
}

// ---------- UI helpers ----------

function setSubmitting(val) {
  isSubmitting = val;
  const btn = document.getElementById("submit-btn");
  const label = document.getElementById("submit-label");
  btn.disabled = val;
  label.innerHTML = val ? `<span class="spinner"></span> Saving...` : "Add Course";
}

function setModalSubmitting(val) {
  isModalSubmitting = val;
  const btn = document.getElementById("modal-save");
  const label = document.getElementById("modal-save-label");
  btn.disabled = val;
  label.innerHTML = val ? `<span class="spinner"></span> Saving...` : "Save Changes";
}

function showFormAlert(message, type) {
  const alert = document.getElementById("form-alert");
  alert.className = `alert show alert-${type}`;
  alert.textContent = message;
  if (type === "success") {
    setTimeout(hideFormAlert, 4000);
  }
}

function hideFormAlert() {
  const alert = document.getElementById("form-alert");
  alert.classList.remove("show");
}

function showListAlert(message) {
  const alert = document.getElementById("list-alert");
  alert.className = "alert alert-error show";
  alert.textContent = message;
}

function showModalAlert(message) {
  let alert = document.getElementById("modal-alert");
  if (!alert) {
    alert = document.createElement("div");
    alert.id = "modal-alert";
    alert.className = "alert alert-error show";
    document.querySelector(".modal-body").appendChild(alert);
  }
  alert.className = "alert alert-error show";
  alert.textContent = message;
}

function hideModalAlert() {
  const alert = document.getElementById("modal-alert");
  if (alert) alert.classList.remove("show");
}

function formatDate(dateStr) {
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    return dateStr;
  }
}

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}

// ---------- Event listeners ----------

function attachListeners() {
  document.getElementById("course-form").addEventListener("submit", (e) => {
    e.preventDefault();
    const result = validateForm("course-form");
    if (!result.valid) {
      showFormAlert(result.errors.join(" "), "error");
      return;
    }
    createCourse(result.data);
  });

  document.getElementById("reset-btn").addEventListener("click", () => {
    document.getElementById("course-form").reset();
    hideFormAlert();
  });

  document.getElementById("modal-close").addEventListener("click", closeModal);
  document.getElementById("modal-cancel").addEventListener("click", closeModal);
  document.getElementById("edit-modal").addEventListener("click", (e) => {
    if (e.target.id === "edit-modal") closeModal();
  });

  document.getElementById("modal-save").addEventListener("click", () => {
    if (!editingCourse) return;
    const result = validateForm("edit-form");
    if (!result.valid) {
      showModalAlert(result.errors.join(" "));
      return;
    }
    updateCourse(editingCourse.id, result.data);
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeModal();
  });
}

// Expose for inline onclick handlers
window.openEditModal = openEditModal;
window.deleteCourse = deleteCourse;

render();
