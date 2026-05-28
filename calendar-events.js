(function () {
  const EVENT_COPY = {
    lv: {
      upcomingTitle: "Tuvākās nodarbības",
      selectedTitle: "Nodarbības izvēlētajā datumā",
      noEventsSelected: "Šajā datumā nav ieplānotu nodarbību.",
      noEventsMonth: "Šajā mēnesī nav ieplānotu nodarbību.",
      eventMarker: "Ieplānotas nodarbības"
    },
    en: {
      upcomingTitle: "Upcoming classes",
      selectedTitle: "Classes on the selected date",
      noEventsSelected: "No classes are scheduled for this date.",
      noEventsMonth: "No classes are scheduled this month.",
      eventMarker: "Scheduled classes"
    },
    ru: {
      upcomingTitle: "Ближайшие занятия",
      selectedTitle: "Занятия в выбранную дату",
      noEventsSelected: "На эту дату занятия не запланированы.",
      noEventsMonth: "В этом месяце занятия не запланированы.",
      eventMarker: "Запланированные занятия"
    }
  };

  const EVENTS = [
    {
      type: "weekly",
      weekdays: [3, 5],
      start: "2026-06-01",
      time: "09:00-16:00",
      title: {
        lv: "Nodarbības grūtniecēm, jaunajām māmiņām un bērniem līdz 3 gadu vecumam",
        en: "Classes for pregnant women, new mothers and children up to 3 years old",
        ru: "Занятия для беременных, молодых мам и детей до 3 лет"
      }
    },
    {
      type: "weekly",
      weekdays: [2],
      start: "2026-06-01",
      time: "19:00-20:30",
      title: {
        lv: "Jogas nodarbības",
        en: "Yoga classes",
        ru: "Занятия йогой"
      }
    }
  ];

  function padDatePart(value) {
    return String(value).padStart(2, "0");
  }

  function toDateKey(year, monthIndex, day) {
    return `${year}-${padDatePart(monthIndex + 1)}-${padDatePart(day)}`;
  }

  function eventMatchesDate(event, date, dateKey) {
    if (event.date) return event.date === dateKey;
    if (!event.weekdays || !event.weekdays.includes(date.getDay())) return false;
    if (event.start && dateKey < event.start) return false;
    if (event.end && dateKey > event.end) return false;
    return true;
  }

  function getEventsForDate(year, monthIndex, day) {
    const date = new Date(year, monthIndex, day);
    const dateKey = toDateKey(year, monthIndex, day);
    return EVENTS
      .filter((event) => eventMatchesDate(event, date, dateKey))
      .sort((a, b) => a.time.localeCompare(b.time));
  }

  function getMonthEvents(year, monthIndex, today) {
    const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
    const startDay = today && year === today.getFullYear() && monthIndex === today.getMonth()
      ? today.getDate()
      : 1;
    const monthEvents = [];

    for (let day = startDay; day <= daysInMonth; day += 1) {
      getEventsForDate(year, monthIndex, day).forEach((event) => {
        monthEvents.push({ day, event });
      });
    }

    return monthEvents;
  }

  function resolveCopy(lang) {
    return EVENT_COPY[lang] || EVENT_COPY.lv;
  }

  function resolveLocalized(value, lang) {
    if (!value || typeof value === "string") return value || "";
    return value[lang] || value.lv || value.en || value.ru || "";
  }

  function ensurePanel(widget) {
    if (!widget) return null;
    let panel = widget.querySelector(".cal-events");
    if (!panel) {
      panel = document.createElement("div");
      panel.className = "cal-events";
      widget.appendChild(panel);
    }
    return panel;
  }

  function createEventItem(event, dateLabel, lang) {
    const item = document.createElement("li");
    item.className = "cal-event-item";

    const meta = document.createElement("div");
    meta.className = "cal-event-meta";
    meta.textContent = dateLabel ? `${dateLabel} · ${event.time}` : event.time;

    const title = document.createElement("div");
    title.className = "cal-event-title";
    title.textContent = resolveLocalized(event.title, lang);

    item.append(meta, title);
    if (event.description) {
      const description = document.createElement("p");
      description.className = "cal-event-description";
      description.textContent = resolveLocalized(event.description, lang);
      item.appendChild(description);
    }

    return item;
  }

  function renderPanel(options) {
    const panel = ensurePanel(options.widget);
    if (!panel) return;

    const copy = resolveCopy(options.lang);
    const hasSelectedDate = options.selectedDateParts
      && options.selectedDateParts.year === options.currentYear
      && options.selectedDateParts.month === options.currentMonth;

    panel.innerHTML = "";

    const title = document.createElement("div");
    title.className = "cal-events-title";
    title.textContent = hasSelectedDate ? copy.selectedTitle : copy.upcomingTitle;
    panel.appendChild(title);

    const list = document.createElement("ul");
    list.className = "cal-event-list";

    if (hasSelectedDate) {
      const day = options.selectedDateParts.day;
      const events = getEventsForDate(options.currentYear, options.currentMonth, day);
      if (!events.length) {
        const empty = document.createElement("p");
        empty.className = "cal-events-empty";
        empty.textContent = copy.noEventsSelected;
        panel.appendChild(empty);
        return;
      }

      const dateLabel = options.formatDate(day, options.currentMonth);
      events.forEach((event) => list.appendChild(createEventItem(event, dateLabel, options.lang)));
      panel.appendChild(list);
      return;
    }

    const monthEvents = getMonthEvents(options.currentYear, options.currentMonth, options.today).slice(0, 6);
    if (!monthEvents.length) {
      const empty = document.createElement("p");
      empty.className = "cal-events-empty";
      empty.textContent = copy.noEventsMonth;
      panel.appendChild(empty);
      return;
    }

    monthEvents.forEach(({ day, event }) => {
      list.appendChild(createEventItem(event, options.formatDate(day, options.currentMonth), options.lang));
    });
    panel.appendChild(list);
  }

  function getCellEventLabel(events, lang) {
    return events.map((event) => `${event.time} ${resolveLocalized(event.title, lang)}`).join("; ");
  }

  window.RoomJurmalaCalendar = {
    copy: EVENT_COPY,
    events: EVENTS,
    getEventsForDate,
    getCellEventLabel,
    renderPanel,
    resolveCopy,
    resolveLocalized
  };
})();
