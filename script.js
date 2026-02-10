// ===========================
// CONFIGURATION
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
// DATA FETCHING
// ===========================
async function fetchEventsFromSheet() {
  const url = `https://docs.google.com/spreadsheets/d/${CONFIG.SHEET_ID}/export?format=csv&gid=${CONFIG.TAB_GID}`;
  const res = await fetch(url);
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
function parseCSV(csvText) {
  const rows = [];
  let row = [];
  let field = "";
  let inQuotes = false;

  for (let i = 0; i < csvText.length; i++) {
    const c = csvText[i];
    const n = csvText[i + 1];

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
// DATE UTILITIES (SAFE)
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
    const dateObj = parseEventDate(event.date);

    if (!dateObj) {
      return now > new Date(new Date(event.createdAt).getTime() + 7 * 86400000);
    }

    const end = new Date(dateObj);

    if (event.start || event.end) {
      const endTime = event.end || event.start;
      const [h, m] = endTime.split(":").map(Number);
      end.setHours(h, m || 0, 0);
    } else {
      end.setHours(23, 59, 59);
    }

    return now > new Date(end.getTime() + 86400000);
  }

  if (event.type === "recruitment") {
    if (event.deadline) {
      return now > new Date(event.deadline);
    }
    return now > new Date(new Date(event.createdAt).getTime() + 7 * 86400000);
  }

  return true;
}

// ===========================
// RENDERING
// ===========================
function renderEvents(events) {
  const container = document.querySelector(".events-section");
  if (!container) return;
  container.innerHTML = "";

  const grouped = {};

  events.forEach(e => {
    const key = e.type === "event" && e.date ? e.date : "__no_date__";
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(e);
  });

  Object.entries(grouped).forEach(([date, list]) => {
   const group = document.createElement("div");
       group.className = date === "__no_date__" ? "date-group recruitment-group" : "date-group";


    if (date !== "__no_date__") {
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
    }

    list.forEach(event => {
      const card = document.createElement("div");
      card.className = `event-card ${event.type === "recruitment" ? "recruitment-card" : ""}`;

      card.innerHTML = `
        <div class="event-top">
          <h3 class="event-name">${event.name}</h3>
          ${event.club ? `<p class="event-club">${event.club}</p>` : ""}
          ${event.description ? `<p class="event-description">${event.description}</p>` : ""}
        </div>

        <div class="event-bottom">
          <div class="event-meta">
            ${event.venue ? `<span class="meta-item">📍 ${event.venue}</span>` : ""}
            ${event.start ? `<span class="meta-item">🕒 ${event.start}${event.end ? " – " + event.end : ""}</span>` : ""}
          </div>

          <div class="event-actions">
            ${event.od === "Provided" ? `<span class="od-status od-provided">OD Provided</span>` : ""}
            ${
              event.type === "event" && event.date && event.start
                ? `<button class="calendar-btn"
                    data-name="${event.name}"
                    data-date="${event.date}"
                    data-start="${event.start}"
                    data-end="${event.end || ""}"
                    data-venue="${event.venue || ""}"
                    data-description="${event.description || ""}">
                    Add to Calendar
                  </button>`
                : ""
            }
            ${event.url ? `<a href="${event.url}" class="register-btn">Register</a>` : ""}
          </div>
        </div>
      `;

      group.appendChild(card);
    });

    container.appendChild(group);
  });

  attachEventListeners();
  setupCardAnimations();
}

// ===========================
// CALENDAR (SAFE)
// ===========================
function normalizeEndTime(start, end) {
  if (end) return end;
  const [h, m] = start.split(":").map(Number);
  const d = new Date();
  d.setHours(h + 1, m || 0, 0);
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
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

// ===========================
// EVENTS & INIT
// ===========================
function attachEventListeners() {
  document.querySelectorAll(".calendar-btn").forEach(btn => {
    btn.addEventListener("click", e => {
      e.preventDefault();
      addToCalendar(btn);
    });
  });
}

async function initializeApp() {
  const events = await fetchEventsFromSheet();

  const visible = events
    .filter(e => !isExpired(e))
    .sort((a, b) => {
      if (!a.date) return 1;
      if (!b.date) return -1;
      return parseEventDate(a.date) - parseEventDate(b.date);
    });

  if (!visible.length) {
    document.querySelector(".events-section").innerHTML = `
      <div class="no-events">
        <h2>No upcoming events</h2>
        <p>You're all caught up.</p>
      </div>`;
    return;
  }

  renderEvents(visible);
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
  document.querySelectorAll(".event-card").forEach(card => {
    card.style.opacity = "0";
    card.style.transform = "translateY(20px)";
    card.style.transition = "opacity 0.6s ease, transform 0.6s ease";
    observer.observe(card);
  });
}

// ===========================
// START
// ===========================
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initializeApp);
} else {
  initializeApp();
}




// IF you have made it this far 
//copy this link and paste it as a url 
//you can view events that have been logged after this project has been created 
//https://docs.google.com/spreadsheets/d/19pc9UlkORblpaGOCn8qQw2yH-Afu3lSJzfeP_dzej8U/edit?usp=sharing
