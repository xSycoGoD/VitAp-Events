// ===========================
// CONFIGURATION
// ===========================
const CONFIG = {
    SHEET_ID: "19pc9UlkORblpaGOCn8qQw2yH-Afu3lSJzfeP_dzej8U",
    TAB_GID: "0" // Default first sheet, change if using a different tab
};

// ===========================
// GOOGLE SHEETS DATA INTEGRATION
// ===========================

/**
 * Fetches event data from Google Sheets (public read-only access via CSV export)
 */
async function fetchEventsFromSheet() {
    try {
        const url = `https://docs.google.com/spreadsheets/d/${CONFIG.SHEET_ID}/export?format=csv&gid=${CONFIG.TAB_GID}`;
        const response = await fetch(url);

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const csvText = await response.text();
        const rows = parseCSV(csvText);

        const events = rows.slice(1).map(row => {
            const eventDate = row[1] || '';

            return {
                event_name: row[0] || 'TBA',
                event_date: eventDate,
                event_day: eventDate
                    ? new Date(eventDate).toLocaleDateString(undefined, {
                        weekday: 'long',
                        day: 'numeric',
                        month: 'long'
                      })
                    : 'TBA',

                start_time: row[2] || '',
                end_time: row[3] || '',
                venue: row[4] || 'TBA',
                club: row[5] || '',
                description: row[6] || '',
                register_url: row[7] || '#',
                od_status: row[8] || 'Not Mentioned',
                source_email: row[9] || '',
                gmail_message_id: row[10] || '',
                created_at: row[11] || ''
            };
        }).filter(e => e.event_name && e.event_name !== 'TBA');

        // Sort by event date + start time
        events.sort((a, b) => {
            const aDate = a.event_date ? new Date(`${a.event_date} ${a.start_time}`) : new Date('9999-12-31');
            const bDate = b.event_date ? new Date(`${b.event_date} ${b.start_time}`) : new Date('9999-12-31');
            return aDate - bDate;
        });

        return events;
    } catch (error) {
        console.error('Error fetching events:', error);
        return [];
    }
}


/**
 * Parses CSV text into array of arrays
 * Handles quoted fields and commas within quotes
 */
function parseCSV(csvText) {
    const rows = [];
    let currentRow = [];
    let currentField = '';
    let insideQuotes = false;

    for (let i = 0; i < csvText.length; i++) {
        const char = csvText[i];
        const nextChar = csvText[i + 1];

        if (char === '"') {
            if (insideQuotes && nextChar === '"') {
                // Escaped quote
                currentField += '"';
                i++; // Skip next quote
            } else {
                // Toggle quote state
                insideQuotes = !insideQuotes;
            }
        } else if (char === ',' && !insideQuotes) {
            // End of field
            currentRow.push(currentField.trim());
            currentField = '';
        } else if ((char === '\n' || char === '\r') && !insideQuotes) {
            // End of row
            if (char === '\r' && nextChar === '\n') {
                i++; // Skip \n in \r\n
            }
            if (currentField || currentRow.length > 0) {
                currentRow.push(currentField.trim());
                rows.push(currentRow);
                currentRow = [];
                currentField = '';
            }
        } else {
            currentField += char;
        }
    }

    // Add last field and row if exists
    if (currentField || currentRow.length > 0) {
        currentRow.push(currentField.trim());
        rows.push(currentRow);
    }

    return rows;
}

/**
 * Groups events by date
 */
function groupEventsByDate(events) {
    const grouped = {};
    events.forEach(event => {
        const dateKey = event.event_date || 'TBA';
        if (!grouped[dateKey]) {
            grouped[dateKey] = [];
        }
        grouped[dateKey].push(event);
    });
    return grouped;
}

/**
 * Formats OD status class name
 */
function getODStatusClass(status) {
    const statusLower = (status || '').toLowerCase();
    if (statusLower.includes('provided') || statusLower.includes('yes')) {
        return 'od-provided';
    } else if (statusLower.includes('not provided') || statusLower.includes('no')) {
        return 'od-not-provided';
    } else {
        return 'od-not-mentioned';
    }
}

/**
 * Formats OD status display text
 */
function getODStatusText(status) {
    const statusLower = (status || '').toLowerCase();
    if (statusLower.includes('provided') || statusLower.includes('yes')) {
        return 'OD Provided';
    } else if (statusLower.includes('not provided') || statusLower.includes('no')) {
        return 'Not Provided';
    } else {
        return 'Not Mentioned';
    }
}
/**
 * Renders events to the DOM
 */
function renderEvents(events) {
    const eventsSection = document.querySelector('.events-section');
    if (!eventsSection) return;

    // Clear existing content
    eventsSection.innerHTML = '';

    // Group events by date
    const groupedEvents = groupEventsByDate(events);

    // Render each date group
    Object.entries(groupedEvents).forEach(([date, dateEvents]) => {
        const dateGroup = document.createElement('div');
        dateGroup.className = 'date-group';

        // Create date heading
        const dateHeading = document.createElement('h2');
        dateHeading.className = 'date-heading';
        dateHeading.textContent = dateEvents[0].event_day || date;
        dateGroup.appendChild(dateHeading);

        // Render each event in this date group
        dateEvents.forEach(event => {
           const startDateTime = {
                    date: event.event_date,
                    time: event.start_time
                                };
            const endDateTime = {
                    date: event.event_date,
                    time: event.end_time
                              };


            const eventCard = document.createElement('div');
            eventCard.className = `event-card ${event.status === 'recent' ? 'event-recent' : ''}`;
            eventCard.innerHTML = `
                <div class="event-top">
                    <h3 class="event-name">${event.event_name}</h3>
                    <p class="event-description">${event.description}</p>
                </div>
                <div class="event-bottom">
                    <div class="event-meta">
                        <span class="meta-item">
                            <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
                                <circle cx="12" cy="10" r="3"></circle>
                            </svg>
                            ${event.venue}
                        </span>
                        <span class="meta-item">
                            <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <circle cx="12" cy="12" r="10"></circle>
                                <polyline points="12 6 12 12 16 14"></polyline>
                            </svg>
                            ${event.start_time}${event.end_time ? ' – ' + event.end_time : ''}
                        </span>
                    </div>
                    <div class="event-actions">
                        <span class="od-status ${getODStatusClass(event.od_status)}">${getODStatusText(event.od_status)}</span>
                        <button class="calendar-btn" 
                            data-event-name="${event.event_name}"
                            data-event-date="${startDateTime.date}"
                            data-start-time="${startDateTime.time}"
                            data-end-time="${endDateTime.time}"
                            data-venue="${event.venue}"
                            data-description="${event.description}">Add to Calendar</button>
                        <a href="${event.register_url}" class="register-btn">Register</a>
                    </div>
                </div>
            `;

            dateGroup.appendChild(eventCard);
        });

        eventsSection.appendChild(dateGroup);
    });

    // Re-attach event listeners to dynamically created buttons
    attachEventListeners();

    // Set up fade-in animations for event cards
    setupCardAnimations();
}

/**
 * Initializes the application
 */
function classifyVisibleEvents(events) {
    const now = new Date();

    return events
        .map(event => {
            if (!event.event_date || !event.end_time) {
                return { ...event, status: 'upcoming' };
            }

            const eventEnd = new Date(`${event.event_date} ${event.end_time}`);
            const diffHours = (now - eventEnd) / (1000 * 60 * 60);

            if (diffHours < 0) return { ...event, status: 'upcoming' };
            if (diffHours <= 24) return { ...event, status: 'recent' };

            return null;
        })
        .filter(Boolean);
}

async function initializeApp() {
    const events = await fetchEventsFromSheet();
    const visibleEvents = classifyVisibleEvents(events);

    if (visibleEvents.length > 0) {
        renderEvents(visibleEvents);
    } else {
        const eventsSection = document.querySelector('.events-section');
        eventsSection.innerHTML = `
            <div class="no-events">
                <h2>No upcoming events</h2>
                <p>You're all caught up! New events will appear here as soon as clubs announce them.</p>
            </div>
        `;
    }
}



// ===========================
// CALENDAR INTEGRATION
// ===========================

/**
 * Formats date and time for calendar URLs
 * @param {string} date - Date in YYYY-MM-DD format
 * @param {string} time - Time in HH:MM format
 * @returns {string} - Formatted datetime string
 */
function formatDateTime(date, time) {
    const [year, month, day] = date.split('-');
    const [hours, minutes] = time.split(':');
    return `${year}${month}${day}T${hours}${minutes}00`;
}

/**
 * Detects user's platform/browser
 * @returns {string} - Platform identifier
 */
function detectPlatform() {
    const userAgent = navigator.userAgent.toLowerCase();
    const platform = navigator.platform.toLowerCase();

    // Check for Apple devices
    if (platform.includes('mac') || platform.includes('iphone') || platform.includes('ipad') ||
        userAgent.includes('safari') && !userAgent.includes('chrome')) {
        return 'apple';
    }

    // Check for Outlook/Windows
    if (platform.includes('win') || userAgent.includes('outlook') || userAgent.includes('office')) {
        return 'outlook';
    }

    // Default to Google Calendar (most universal)
    return 'google';
}

/**
 * Generates Google Calendar URL
 */
function generateGoogleCalendarURL(eventData) {
    const startDateTime = formatDateTime(eventData.date, eventData.startTime);
    const endDateTime = formatDateTime(eventData.date, eventData.endTime);

    const params = new URLSearchParams({
        action: 'TEMPLATE',
        text: eventData.name,
        dates: `${startDateTime}/${endDateTime}`,
        details: eventData.description,
        location: eventData.venue
    });

    return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

/**
 * Generates Outlook Calendar URL
 */
function generateOutlookCalendarURL(eventData) {
    const startDateTime = `${eventData.date}T${eventData.startTime}:00`;
    const endDateTime = `${eventData.date}T${eventData.endTime}:00`;

    const params = new URLSearchParams({
        path: '/calendar/action/compose',
        rru: 'addevent',
        subject: eventData.name,
        startdt: startDateTime,
        enddt: endDateTime,
        body: eventData.description,
        location: eventData.venue
    });

    return `https://outlook.live.com/calendar/0/deeplink/compose?${params.toString()}`;
}

/**
 * Generates Apple Calendar (iCal) URL
 */
function generateAppleCalendarURL(eventData) {
    // For Apple, we use webcal protocol with Google Calendar as it's most compatible
    // Apple devices will automatically open in their native calendar app
    return generateGoogleCalendarURL(eventData);
}

/**
 * Opens calendar based on detected platform
 */
function addToCalendar(button) {
    const eventData = {
        name: button.dataset.eventName,
        date: button.dataset.eventDate,
        startTime: button.dataset.startTime,
        endTime: button.dataset.endTime,
        venue: button.dataset.venue,
        description: button.dataset.description
    };

    const platform = detectPlatform();
    let calendarURL;

    switch (platform) {
        case 'apple':
            calendarURL = generateAppleCalendarURL(eventData);
            break;
        case 'outlook':
            calendarURL = generateOutlookCalendarURL(eventData);
            break;
        case 'google':
        default:
            calendarURL = generateGoogleCalendarURL(eventData);
            break;
    }

    // Open calendar in new tab
    window.open(calendarURL, '_blank');
}

/**
 * Attaches event listeners to calendar and register buttons
 * Called after dynamic rendering and on initial page load
 */
function attachEventListeners() {
    // Calendar button listeners
    document.querySelectorAll('.calendar-btn').forEach(button => {
        button.addEventListener('click', function (e) {
            e.preventDefault();

            // Add subtle click effect
            this.style.transform = 'scale(0.95)';
            setTimeout(() => {
                this.style.transform = '';
            }, 150);

            // Open calendar
            addToCalendar(this);
        });
    });

    // Register button listeners
    document.querySelectorAll('.register-btn').forEach(button => {
        button.addEventListener('click', function (e) {
            e.preventDefault();

            // Add a subtle click effect
            this.style.transform = 'scale(0.95)';
            setTimeout(() => {
                this.style.transform = '';
            }, 150);

            // In a real application, this would navigate to registration page
            console.log('Register button clicked for event');
        });
    });
}

// ===========================
// EXISTING FUNCTIONALITY
// ===========================

// Add intersection observer for fade-in animations
const observerOptions = {
    threshold: 0.1,
    rootMargin: '0px 0px -50px 0px'
};

const cardObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.style.opacity = '1';
            entry.target.style.transform = 'translateY(0)';
        }
    });
}, observerOptions);

/**
 * Sets up fade-in animations for event cards
 * Called after dynamic rendering and on initial page load
 */
function setupCardAnimations() {
    document.querySelectorAll('.event-card').forEach(card => {
        card.style.opacity = '0';
        card.style.transform = 'translateY(20px)';
        card.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
        cardObserver.observe(card);
    });
}


// Handle responsive logo sizing on scroll (optional enhancement)
let lastScroll = 0;
window.addEventListener('scroll', () => {
    const currentScroll = window.pageYOffset;

    // Add subtle shadow to logo when scrolled
    const logo = document.querySelector('.logo-container');
    if (currentScroll > 100) {
        logo.style.filter = 'drop-shadow(0 4px 12px rgba(0, 0, 0, 0.15))';
    } else {
        logo.style.filter = 'drop-shadow(0 2px 8px rgba(0, 0, 0, 0.1))';
    }

    lastScroll = currentScroll;
});

// ===========================
// INITIALIZE APPLICATION
// ===========================

// Load events when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeApp);
} else {
    initializeApp();
}
