// ===========================
// CONFIG
// ===========================
const CONFIG = {
  SHEET_ID: "19pc9UlkORblpaGOCn8qQw2yH-Afu3lSJzfeP_dzej8U",
  TAB_GID: "0"
};

const COL = {
  name: 0,
  date: 1,
  start: 2,
  end: 3,
  venue: 4,
  club: 5,
  description: 6,
  url: 7,
  od: 8,
  type: 9,
  deadline: 10,
  createdAt: 11,
  gmailId: 12
};

// ===========================
// DATA FETCH
// ===========================
async function fetchEventsFromSheet() {
  const url =
    `https://docs.google.com/spreadsheets/d/${CONFIG.SHEET_ID}/export` +
    `?format=csv&gid=${CONFIG.TAB_GID}&_=${Date.now()}`;

  const res = await fetch(url);
  if (!res.ok) throw new Error("Failed to fetch sheet");

  const text = await res.text();
  const rows = parseCSV(text).slice(1);

  return rows.map(row => ({
    name: row[COL.name] || "",
    date: row[COL.date] || "",
    start: row[COL.start] || "",
    end: row[COL.end] || "",
    venue: row[COL.venue] || "",
    club: row[COL.club] || "",
    description: row[COL.description] || "",
    url: row[COL.url] || "",
    od: row[COL.od] || "",
    type: row[COL.type] || "event",
    deadline: row[COL.deadline] || "",
    createdAt: row[COL.createdAt] || ""
  }));
}

// ===========================
// CSV PARSER
// ===========================
function parseCSV(text) {
  const rows = [];
  let row = [];
  let field = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    const n = text[i + 1];

    if (c === '"') {
      if (inQuotes && n === '"') {
        field += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (c === ',' && !inQuotes) {
      row.push(field.trim());
      field = "";
    } else if ((c === '\n' || c === '\r') && !inQuotes) {
      if (field || row.length) {
        row.push(field.trim());
        rows.push(row);
        row = [];
        field = "";
      }
    } else {
      field += c;
    }
  }

  if (field || row.length) {
    row.push(field.trim());
    rows.push(row);
  }

  return rows;
}

// ===========================
// DATE UTILITIES
// ===========================
function parseEventDate(dateStr) {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  return isNaN(d.getTime()) ? null : d;
}

// ===========================
// EXPIRY LOGIC
// ===========================
function isExpired(event) {
  const now = new Date();

  if (event.type === "event") {
    const d = parseEventDate(event.date);

    if (!d) {
      if (!event.createdAt) return false;
      return now > new Date(new Date(event.createdAt).getTime() + 7 * 86400000);
    }

    const end = new Date(d);
    const time = event.end || event.start;

    if (/^\d{1,2}:\d{2}$/.test(time || "")) {
      const [h, m] = time.split(":").map(Number);
      end.setHours(h, m, 0);
    } else {
      end.setHours(23, 59, 59);
    }

    return now > new Date(end.getTime() + 86400000);
  }

  if (event.type === "recruitment") {
    if (event.deadline) return now > new Date(event.deadline);
    if (!event.createdAt) return false;
    return now > new Date(new Date(event.createdAt).getTime() + 7 * 86400000);
  }

  return false;
}

// ===========================
// RENDER
// ===========================
function render(events) {
  const eventsSection = document.querySelector(".events-section");
  const recruitmentRail = document.querySelector(".recruitment-group");
  const emptyState = document.getElementById("events-empty");

  if (!eventsSection || !recruitmentRail) return;

  const recruitments = events.filter(e => e.type === "recruitment");
  const normalEvents = events.filter(e => e.type === "event");

  // Clear previous render
  recruitmentRail.innerHTML = "";
  eventsSection.querySelectorAll(".date-group").forEach(g => g.remove());

  // ---------- Recruitment ----------
  if (!recruitments.length) {
    recruitmentRail.innerHTML =
      `<div class="recruitment-empty-state">
         <p>No new recruitments right now.</p>
       </div>`;
  } else {
    recruitments.forEach(e => {
      const card = document.createElement("div");
      card.className = "recruitment-card";

      card.innerHTML = `
        <h3>${e.name}</h3>
        ${e.description ? `<p>${e.description}</p>` : ""}
        ${e.url ? `<a href="${e.url}" target="_blank">Register</a>` : ""}
      `;

      recruitmentRail.appendChild(card);
    });
  }

  // ---------- Events ----------
  if (!normalEvents.length) {
    if (emptyState) emptyState.style.display = "block";
    return;
  }

  if (emptyState) emptyState.style.display = "none";

  const grouped = {};
  normalEvents.forEach(e => {
    const key = e.date || "__no_date__";
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(e);
  });

  Object.entries(grouped).forEach(([date, list]) => {
    const group = document.createElement("div");
    group.className = "date-group";

    const d = parseEventDate(date);
    if (d) {
      const h = document.createElement("h2");
      h.className = "date-heading";
      h.textContent = d.toLocaleDateString(undefined, {
        weekday: "long",
        day: "numeric",
        month: "long"
      });
      group.appendChild(h);
    }

    list.forEach(e => {
      const card = document.createElement("div");
      card.className = "event-card";

      card.innerHTML = `
        <div class="event-top">
          <h3 class="event-name">${e.name}</h3>
          ${e.club ? `<p class="event-club">${e.club}</p>` : ""}
          ${e.description ? `<p class="event-description">${e.description}</p>` : ""}
        </div>

        <div class="event-bottom">
          <div class="event-meta">
            ${e.venue ? `<span>📍 ${e.venue}</span>` : ""}
            ${e.start ? `<span>🕒 ${e.start}${e.end ? " – " + e.end : ""}</span>` : ""}
          </div>

          <div class="event-actions">
            ${e.od === "Provided" ? `<span class="od-status od-provided">OD Provided</span>` : ""}
            ${
              /^\d{4}-\d{2}-\d{2}$/.test(e.date) &&
              /^\d{1,2}:\d{2}$/.test(e.start)
                ? `<button class="calendar-btn"
                    data-name="${e.name}"
                    data-date="${e.date}"
                    data-start="${e.start}"
                    data-end="${e.end || ""}"
                    data-venue="${e.venue || ""}"
                    data-description="${e.description || ""}">
                    Add to Calendar
                  </button>`
                : ""
            }
            ${e.url ? `<a href="${e.url}" class="register-btn" target="_blank">Register</a>` : ""}
          </div>
        </div>
      `;

      group.appendChild(card);
    });

    eventsSection.appendChild(group);
  });

  attachCalendarListeners();
  setupCardAnimations();
}

// ===========================
// CALENDAR
// ===========================
function normalizeEndTime(start, end) {
  if (end && /^\d{1,2}:\d{2}$/.test(end)) return end;
  const [h, m] = start.split(":").map(Number);
  return `${String(h + 1).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

function formatDateTime(date, time) {
  const [y, m, d] = date.split("-");
  const [h, min] = time.split(":");
  return `${y}${m}${d}T${h}${min}00`;
}

function addToCalendar(btn) {
  const start = btn.dataset.start;
  const end = normalizeEndTime(start, btn.dataset.end);

  const startDT = formatDateTime(btn.dataset.date, start);
  const endDT = formatDateTime(btn.dataset.date, end);

  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: btn.dataset.name,
    dates: `${startDT}/${endDT}`,
    details: btn.dataset.description,
    location: btn.dataset.venue
  });

  window.open(`https://calendar.google.com/calendar/render?${params}`, "_blank");
}

function attachCalendarListeners() {
  document.querySelectorAll(".calendar-btn").forEach(btn => {
    btn.onclick = e => {
      e.preventDefault();
      addToCalendar(btn);
    };
  });
}

// ===========================
// ANIMATIONS
// ===========================
const observer = new IntersectionObserver(entries => {
  entries.forEach(e => {
    if (e.isIntersecting) {
      e.target.style.opacity = "1";
      e.target.style.transform = "translateY(0)";
    }
  });
}, { threshold: 0.1 });

function setupCardAnimations() {
  document.querySelectorAll(".event-card, .recruitment-card").forEach(card => {
    card.style.opacity = "0";
    card.style.transform = "translateY(20px)";
    card.style.transition = "opacity 0.6s ease, transform 0.6s ease";
    observer.observe(card);
  });
}

// ===========================
// START
// ===========================
async function initializeApp() {
  try {
    const events = await fetchEventsFromSheet();
    const visible = events.filter(e => !isExpired(e));
    render(visible);
  } catch (err) {
    console.error("Initialization failed:", err);
  }
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initializeApp);
} else {
  initializeApp();
}




// IF you have made it this far 
//copy this link and paste it as a url 
//you can view events that have been logged after this project has been created 
//https://docs.google.com/spreadsheets/d/19pc9UlkORblpaGOCn8qQw2yH-Afu3lSJzfeP_dzej8U/edit?usp=sharing





