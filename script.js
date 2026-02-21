// ===========================
// CONFIG
// ===========================

const SCRIPT_URL = "https://script.google.com/macros/s/AKfycby9HsaqGKzZt61L2ofJTcdrp1FqiMqCJIJcy-e7AqBxjeDSn60LhQv9chhbmxRPrsw/exec";


// ===========================
// FETCH EVENTS
// ===========================

async function fetchEvents() {
  const res = await fetch(SCRIPT_URL, { cache: "no-store" });
  if (!res.ok) throw new Error("Failed to fetch data");

  const data = await res.json();

  return data.map(row => ({
    name: row.event_name ?? "",
    date: row.event_date ?? "",
    start: row.start_time ?? "",
    end: row.end_time ?? "",
    venue: row.venue ?? "",
    club: row.club ?? "",
    description: row.description ?? "",
    url: row.url ?? "",
    od: row.od ?? "",
    type: row.type ?? "event",
    deadline: row.deadline ?? "",
    createdAt: row.created ?? ""
  }));
}


// ===========================
// DATE + TIME UTILITIES
// ===========================

function parseDate(dateStr) {
  const d = new Date(dateStr);
  return isNaN(d.getTime()) ? null : d;
}

function convertTo24Hour(timeStr) {
  if (!timeStr) return null;

  const match = timeStr.match(/(\d{1,2})(?::(\d{2}))?\s?(AM|PM|am|pm)/);
  if (!match) return null;

  let hour = parseInt(match[1]);
  const minutes = match[2] ? parseInt(match[2]) : 0;
  const period = match[3].toLowerCase();

  if (period === "pm" && hour !== 12) hour += 12;
  if (period === "am" && hour === 12) hour = 0;

  return {
    hour: String(hour).padStart(2, "0"),
    minute: String(minutes).padStart(2, "0")
  };
}

function isExpired(event) {
  const now = new Date();

  if (event.type === "event") {
    const dateObj = parseDate(event.date);
    if (!dateObj) return true;

    const end = new Date(dateObj);
    const time = event.end || event.start;
    const t = convertTo24Hour(time);

    if (t) {
      end.setHours(parseInt(t.hour), parseInt(t.minute), 0);
    } else {
      end.setDate(end.getDate() + 3);
      end.setHours(23, 59, 59);
    }

    return now > end;
  }

  if (event.type === "recruitment") {
    if (event.deadline) {
      return now > new Date(event.deadline);
    }

    const base = new Date(event.date || event.createdAt || now);
    base.setDate(base.getDate() + 7);
    base.setHours(23, 59, 59);

    return now > base;
  }

  return true;
}


// ===========================
// CARD BUILDERS
// ===========================

function cleanDescription(text) {
  if (!text) return "";
  return text.replace(/\[image:[^\]]+\]/gi, "").trim();
}

function createRecruitmentCard(e) {
  const card = document.createElement("div");
  card.className = "recruitment-card";

  const title = document.createElement("h3");
  title.textContent = e.name;
  card.appendChild(title);

  const cleanDesc = cleanDescription(e.description);

  if (cleanDesc) {
    const p = document.createElement("p");
    p.textContent = cleanDesc;
    card.appendChild(p);
  }

  if (e.url) {
    const a = document.createElement("a");
    a.href = e.url;
    a.target = "_blank";
    a.rel = "noopener noreferrer";
    a.textContent = "Register";
    card.appendChild(a);
  }

  return card;
}

function createEventCard(e) {
  const card = document.createElement("div");
  card.className = "event-card";

  const top = document.createElement("div");
  top.className = "event-top";

  const name = document.createElement("h3");
  name.className = "event-name";
  name.textContent = e.name;
  top.appendChild(name);

  if (e.club) {
    const club = document.createElement("p");
    club.className = "event-club";
    club.textContent = e.club;
    top.appendChild(club);
  }

  const cleanDesc = cleanDescription(e.description);

  if (cleanDesc) {
    const desc = document.createElement("p");
    desc.className = "event-description";
    desc.textContent = cleanDesc;
    top.appendChild(desc);
  }

  const bottom = document.createElement("div");
  bottom.className = "event-bottom";

  const meta = document.createElement("div");
  meta.className = "event-meta";

  if (e.venue) {
    const venue = document.createElement("span");
    venue.textContent = `📍 ${e.venue}`;
    meta.appendChild(venue);
  }

  if (e.start) {
    const time = document.createElement("span");
    time.textContent = `🕒 ${e.start}${e.end ? " – " + e.end : ""}`;
    meta.appendChild(time);
  }

  const actions = document.createElement("div");
  actions.className = "event-actions";

  if (e.url) {
    const link = document.createElement("a");
    link.href = e.url;
    link.className = "register-btn";
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    link.textContent = "Register";
    actions.appendChild(link);
  }

  if (e.date && e.start) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "calendar-btn";
    btn.textContent = "Add to Calendar";
    btn.addEventListener("click", () => addToCalendar(e));
    actions.appendChild(btn);
  }

  bottom.appendChild(meta);
  bottom.appendChild(actions);

  card.appendChild(top);
  card.appendChild(bottom);

  return card;
}


// ===========================
// RENDERING
// ===========================

function renderRecruitments(events) {
  const container = document.querySelector(".recruitment-group");
  if (!container) return;

  container.innerHTML = "";

  if (events.length === 0) {
    container.innerHTML = `
      <div class="recruitment-empty-state">
        No recruitments right now.
      </div>
    `;
    return;
  }

  events.forEach(e => {
    container.appendChild(createRecruitmentCard(e));
  });
}

function renderToday(events) {
  const container = document.querySelector(".today-container");
  if (!container) return;

  container.innerHTML = "";

  if (events.length === 0) {
    container.innerHTML = `
      <div class="no-events">
        <p>No events today.</p>
      </div>
    `;
    return;
  }

  events.forEach(e => {
    container.appendChild(createEventCard(e));
  });
}

function renderFuture(events) {
  const container = document.querySelector(".events-container");
  if (!container) return;

  container.innerHTML = "";

  if (events.length === 0) {
    container.innerHTML = `
      <div class="no-events">
        <h2>No upcoming events</h2>
        <p>Check back later for updates.</p>
      </div>
    `;
    return;
  }

  const grouped = new Map();

  events.forEach(e => {
    const key = e.date || "__no_date__";
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key).push(e);
  });

  const sortedDates = [...grouped.keys()].sort((a, b) => {
    if (a === "__no_date__") return 1;
    if (b === "__no_date__") return -1;
    return new Date(a) - new Date(b);
  });

  sortedDates.forEach(date => {
    const group = document.createElement("div");
    group.className = "date-group";

    if (date !== "__no_date__") {
      const heading = document.createElement("h2");
      heading.className = "date-heading";

      const dateObj = new Date(date);
      heading.textContent = dateObj.toLocaleDateString(undefined, {
        weekday: "long",
        day: "numeric",
        month: "long"
      });

      group.appendChild(heading);
    }

    grouped.get(date).forEach(e => {
      group.appendChild(createEventCard(e));
    });

    container.appendChild(group);
  });
}


// ===========================
// GOOGLE CALENDAR
// ===========================

function addToCalendar(event) {
  const startParts = convertTo24Hour(event.start);
  if (!startParts) return;

  const endParts = convertTo24Hour(event.end) || {
    hour: String(parseInt(startParts.hour) + 1).padStart(2, "0"),
    minute: startParts.minute
  };

  const [y, m, d] = event.date.split("-");

  const startDT = `${y}${m}${d}T${startParts.hour}${startParts.minute}00`;
  const endDT = `${y}${m}${d}T${endParts.hour}${endParts.minute}00`;

  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: event.name,
    dates: `${startDT}/${endDT}`,
    details: event.description,
    location: event.venue
  });

  window.open(
    `https://calendar.google.com/calendar/render?${params}`,
    "_blank"
  );
}


// ===========================
// INIT
// ===========================

async function initializeApp() {
  try {
    const data = await fetchEvents();
    const visible = data.filter(e => !isExpired(e));

    if (visible.length === 0) {
      document.querySelector(".today-container").innerHTML = "";
      document.querySelector(".events-container").innerHTML = `
        <div class="no-events">
          <h2>No upcoming events</h2>
          <p>Check back later for updates.</p>
        </div>
      `;
      renderRecruitments([]);
      return;
    }

    const todayStr = new Date().toISOString().split("T")[0];

    const todayEvents = visible.filter(
      e => e.type === "event" && e.date === todayStr
    );

    const futureEvents = visible.filter(
      e => e.type === "event" && e.date !== todayStr
    );

    const recruitments = visible.filter(
      e => e.type === "recruitment"
    );

    renderRecruitments(recruitments);
    renderToday(todayEvents);
    renderFuture(futureEvents);

  } catch (err) {
    console.error(err);

    document.querySelector(".events-container").innerHTML = `
      <div class="no-events">
        <h2>Unable to load events</h2>
        <p>Please try again later.</p>
      </div>
    `;
  }
}

document.addEventListener("DOMContentLoaded", initializeApp);
// IF you have made it this far 
//copy this link and paste it as a url 
//you can view events that have been logged after this project has been created 
//https://docs.google.com/spreadsheets/d/1-IfC9mjG1i9iNp07HLXQ3gBw1suSxVekQ42UUOwzTJs/edit?usp=sharing
























