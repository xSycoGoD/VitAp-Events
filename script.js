// ===========================
// CONFIG
// ===========================

const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbyf6pjxpYLy_LM2kMAN7SmevYd8yai9Xu0ZWsWdZOI0aoN5S9b1qdhVTLoCVDOxSUKt/exec";


// ===========================
// FETCH DATA (JSON)
// ===========================

async function fetchEvents() {
  const url = "https://script.google.com/macros/s/AKfycbyf6pjxpYLy_LM2kMAN7SmevYd8yai9Xu0ZWsWdZOI0aoN5S9b1qdhVTLoCVDOxSUKt/exec";

  const res = await fetch(url);
  if (!res.ok) throw new Error("Failed to fetch data");

  const data = await res.json();

  // Normalize field names
  return data.map(row => ({
    name: row.event_name || "",
    date: row.event_date || "",
    start: row.start_time || "",
    end: row.end_time || "",
    venue: row.venue || "",
    club: row.club || "",
    description: row.description || "",
    url: row.registration_url || "",
    od: row.od_status || "",
    type: row.type || "event",
    deadline: row.deadline || "",
    createdAt: row.created_at || ""
  }));
}



// ===========================
// DATE UTILITIES
// ===========================

function parseEventDate(dateStr) {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  return isNaN(d.getTime()) ? null : d;
}

function isExpired(event) {
  const now = new Date();

  if (event.type === "event") {
    const dateObj = parseEventDate(event.event_date);
    if (!dateObj) return false;

    const end = new Date(dateObj);

    const time = event.end_time || event.start_time;
    if (/^\d{1,2}:\d{2}/.test(time || "")) {
      const [h, m] = time.split(":").map(Number);
      end.setHours(h, m || 0, 0);
    } else {
      end.setHours(23, 59, 59);
    }

    return now > end;
  }

  if (event.type === "recruitment") {
    if (event.deadline) {
      return now > new Date(event.deadline);
    }
    return false;
  }

  return false;
}


// ===========================
// RENDER FUNCTION
// ===========================

function render(events) {
  const eventsContainer = document.querySelector(".events-container");
  const recruitmentGroup = document.querySelector(".recruitment-group");

  if (!eventsContainer || !recruitmentGroup) return;

  // Reset
  eventsContainer.innerHTML = "";
  recruitmentGroup.innerHTML = "";

  const recruitments = events.filter(e => e.type === "recruitment");
  const normalEvents = events.filter(e => e.type === "event");

  // ==========================
  // RECRUITMENT
  // ==========================

  if (recruitments.length === 0) {
    recruitmentGroup.innerHTML = `
      <div class="recruitment-empty-state">
        <p>No recruitments right now.</p>
        <small>Check back later.</small>
      </div>
    `;
  } else {
    recruitments.forEach(e => {
      const card = document.createElement("div");
      card.className = "recruitment-card";

      card.innerHTML = `
        <h3>${e.event_name}</h3>
        ${e.description ? `<p>${e.description}</p>` : ""}
        ${e.registration_url ? `<a href="${e.registration_url}" target="_blank">Register</a>` : ""}
      `;

      recruitmentGroup.appendChild(card);
    });
  }

  // ==========================
  // EVENTS
  // ==========================

  if (normalEvents.length === 0) {
    eventsContainer.innerHTML = `
      <div class="no-events">
        <h2>No events right now</h2>
        <p>Come back later for new updates.</p>
      </div>
    `;
    return;
  }

  const grouped = {};

  normalEvents.forEach(e => {
    const key = e.event_date || "__no_date__";
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(e);
  });

  Object.entries(grouped).forEach(([date, list]) => {
    const group = document.createElement("div");
    group.className = "date-group";

    const dateObj = parseEventDate(date);
    if (dateObj) {
      const heading = document.createElement("h2");
      heading.className = "date-heading";
      heading.textContent = dateObj.toLocaleDateString(undefined, {
        weekday: "long",
        day: "numeric",
        month: "long"
      });
      group.appendChild(heading);
    }

    list.forEach(e => {
      const card = document.createElement("div");
      card.className = "event-card";

      card.innerHTML = `
        <div class="event-top">
          <h3 class="event-name">${e.event_name}</h3>
          ${e.club ? `<p class="event-club">${e.club}</p>` : ""}
          ${e.description ? `<p class="event-description">${e.description}</p>` : ""}
        </div>

        <div class="event-bottom">
          <div class="event-meta">
            ${e.venue ? `<span>📍 ${e.venue}</span>` : ""}
            ${e.start_time ? `<span>🕒 ${e.start_time}${e.end_time ? " – " + e.end_time : ""}</span>` : ""}
          </div>

          <div class="event-actions">
            ${e.registration_url ? `<a href="${e.registration_url}" class="register-btn" target="_blank">Register</a>` : ""}
          </div>
        </div>
      `;

      group.appendChild(card);
    });

    eventsContainer.appendChild(group);
  });
}



// ===========================
// CALENDAR SUPPORT
// ===========================

function normalizeEndTime(start, end) {
  if (end && /^\d{1,2}:\d{2}/.test(end)) return end;
  const [h, m] = start.split(":").map(Number);
  return `${String(h + 1).padStart(2, "0")}:${String(m || 0).padStart(2, "0")}`;
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
// INITIALIZATION
// ===========================

async function initializeApp() {
  try {
    const data = await fetchEvents();
    const visible = data.filter(e => !isExpired(e));
    render(visible);
  } catch (err) {
    console.error("Fetch failed:", err);

    const eventsContainer = document.querySelector(".events-container");
    if (eventsContainer) {
      eventsContainer.innerHTML = `
        <div class="no-events">
          <h2>Unable to load events</h2>
          <p>Please try again later.</p>
        </div>
      `;
    }
  }
}


document.addEventListener("DOMContentLoaded", initializeApp);



// IF you have made it this far 
//copy this link and paste it as a url 
//you can view events that have been logged after this project has been created 
//https://docs.google.com/spreadsheets/d/19pc9UlkORblpaGOCn8qQw2yH-Afu3lSJzfeP_dzej8U/edit?usp=sharing









