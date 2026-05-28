const SERVICE_BOOKING_LIMITS = {
  name: 80,
  phone: 20,
  date: 80,
  notes: 500,
  message: 1500
};

const SERVICE_BOOKING_COPY = {
  lv: {
    monthsHeader: ["Janvāris", "Februāris", "Marts", "Aprīlis", "Maijs", "Jūnijs", "Jūlijs", "Augusts", "Septembris", "Oktobris", "Novembris", "Decembris"],
    monthsDate: ["janvāra", "februāra", "marta", "aprīļa", "maija", "jūnija", "jūlija", "augusta", "septembra", "oktobra", "novembra", "decembra"],
    freeLabel: "Brīvs",
    timePrefixes: { from: "No", until: "Līdz" },
    greeting: "Sveiki! Vēlos rezervēt ROOM Jūrmala telpu.",
    labels: {
      name: "Vārds",
      phone: "Tālrunis",
      package: "Nomas veids",
      eventType: "Pasākuma veids",
      date: "Datums",
      time: "Laiks",
      notes: "Piezīmes"
    },
    packageOptions: [
      "Izvēlieties nomas veidu...",
      "Stundas noma",
      "Dienas pakete",
      "Nedēļas pakete",
      "Mēneša abonements"
    ],
    errors: {
      required: "Lūdzu aizpildiet vārdu, tālruni, rezervācijas veidu, pasākuma veidu, datumu un laiku.",
      invalidTime: "Lūdzu ievadiet laiku formātā 14:00.",
      tooLong: "Ziņa ir pārāk gara. Saīsiniet piezīmes un mēģiniet vēlreiz."
    },
    buttonSent: "Pieprasījums nosūtīts!"
  },
  en: {
    monthsHeader: ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"],
    monthsDate: ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"],
    freeLabel: "Available",
    timePrefixes: { from: "From", until: "Until" },
    greeting: "Hello! I would like to book ROOM Jūrmala.",
    labels: {
      name: "Name",
      phone: "Phone",
      package: "Rental type",
      eventType: "Event type",
      date: "Date",
      time: "Time",
      notes: "Notes"
    },
    packageOptions: [
      "Choose rental type...",
      "Hourly rental",
      "Day package",
      "Week package",
      "Monthly subscription"
    ],
    errors: {
      required: "Please fill in your name, phone, booking type, event type, date and time.",
      invalidTime: "Please enter the time in 14:00 format.",
      tooLong: "The message is too long. Please shorten the notes and try again."
    },
    buttonSent: "Request sent!"
  },
  ru: {
    monthsHeader: ["Январь", "Февраль", "Март", "Апрель", "Май", "Июнь", "Июль", "Август", "Сентябрь", "Октябрь", "Ноябрь", "Декабрь"],
    monthsDate: ["января", "февраля", "марта", "апреля", "мая", "июня", "июля", "августа", "сентября", "октября", "ноября", "декабря"],
    freeLabel: "Свободно",
    timePrefixes: { from: "С", until: "До" },
    greeting: "Здравствуйте! Хочу забронировать зал ROOM Jūrmala.",
    labels: {
      name: "Имя",
      phone: "Телефон",
      package: "Тип аренды",
      eventType: "Формат мероприятия",
      date: "Дата",
      time: "Время",
      notes: "Примечания"
    },
    packageOptions: [
      "Выберите тип аренды...",
      "Почасовая аренда",
      "Пакет на день",
      "Пакет на неделю",
      "Месячный абонемент"
    ],
    errors: {
      required: "Пожалуйста, заполните имя, телефон, тип бронирования, формат мероприятия, дату и время.",
      invalidTime: "Пожалуйста, укажите время в формате 14:00.",
      tooLong: "Сообщение слишком длинное. Сократите примечания и попробуйте снова."
    },
    buttonSent: "Заявка отправлена!"
  }
};

const serviceBookingLang = document.documentElement.lang === "en" || document.documentElement.lang === "ru"
  ? document.documentElement.lang
  : "lv";
const serviceBookingCopy = SERVICE_BOOKING_COPY[serviceBookingLang];
const serviceBookingToday = new Date();
let serviceBookingYear = serviceBookingToday.getFullYear();
let serviceBookingMonth = serviceBookingToday.getMonth();
let serviceBookingDateParts = null;

function serviceBookingFormatDate(day, monthIndex) {
  if (serviceBookingLang === "lv") return `${day}. ${serviceBookingCopy.monthsDate[monthIndex]}`;
  return `${day} ${serviceBookingCopy.monthsDate[monthIndex]}`;
}

function serviceBookingSetDateTimeValue(timeSlot) {
  const input = document.getElementById("desiredDateTime");
  if (!input) return;
  const dateLabel = serviceBookingDateParts
    ? serviceBookingFormatDate(serviceBookingDateParts.day, serviceBookingDateParts.month)
    : "";

  if (dateLabel && timeSlot) {
    input.value = `${dateLabel}, ${timeSlot}`;
    return;
  }
  if (dateLabel) input.value = dateLabel;
  else if (timeSlot) input.value = timeSlot;
}

function serviceBookingRenderEventsPanel() {
  if (!window.RoomJurmalaCalendar) return;
  const grid = document.getElementById("calGrid");
  window.RoomJurmalaCalendar.renderPanel({
    widget: grid?.closest(".cal-widget"),
    lang: serviceBookingLang,
    selectedDateParts: serviceBookingDateParts,
    currentYear: serviceBookingYear,
    currentMonth: serviceBookingMonth,
    today: serviceBookingToday,
    formatDate: serviceBookingFormatDate
  });
}

function serviceBookingRenderCalendar() {
  const label = document.getElementById("calMonthLabel");
  const grid = document.getElementById("calGrid");
  if (!label || !grid) return;

  label.textContent = `${serviceBookingCopy.monthsHeader[serviceBookingMonth]} ${serviceBookingYear}`;
  grid.innerHTML = "";

  const firstDay = new Date(serviceBookingYear, serviceBookingMonth, 1).getDay();
  const startOffset = firstDay === 0 ? 6 : firstDay - 1;
  const daysInMonth = new Date(serviceBookingYear, serviceBookingMonth + 1, 0).getDate();

  for (let i = 0; i < startOffset; i += 1) {
    const empty = document.createElement("div");
    empty.className = "cal-cell empty";
    grid.appendChild(empty);
  }

  for (let day = 1; day <= daysInMonth; day += 1) {
    const cell = document.createElement("button");
    const isToday = day === serviceBookingToday.getDate()
      && serviceBookingMonth === serviceBookingToday.getMonth()
      && serviceBookingYear === serviceBookingToday.getFullYear();
    const isPast = new Date(serviceBookingYear, serviceBookingMonth, day)
      < new Date(serviceBookingToday.getFullYear(), serviceBookingToday.getMonth(), serviceBookingToday.getDate());
    const dateLabel = serviceBookingFormatDate(day, serviceBookingMonth);
    const dateEvents = window.RoomJurmalaCalendar?.getEventsForDate(serviceBookingYear, serviceBookingMonth, day) || [];
    const eventLabel = window.RoomJurmalaCalendar?.getCellEventLabel(dateEvents, serviceBookingLang) || "";

    cell.type = "button";
    cell.className = "cal-cell" + (isToday ? " today" : "") + (isPast ? " past" : "");
    cell.textContent = day;
    cell.setAttribute("aria-label", dateEvents.length ? `${dateLabel}: ${eventLabel}` : `${serviceBookingCopy.freeLabel} - ${dateLabel}`);
    if (dateEvents.length) {
      cell.classList.add("has-events");
    }

    if (
      serviceBookingDateParts
      && serviceBookingDateParts.day === day
      && serviceBookingDateParts.month === serviceBookingMonth
      && serviceBookingDateParts.year === serviceBookingYear
    ) {
      cell.classList.add("free-sel");
    }

    if (isPast) {
      cell.disabled = true;
      cell.style.opacity = "0.3";
    } else {
      cell.title = dateEvents.length ? `${dateLabel}\n${eventLabel}` : `${serviceBookingCopy.freeLabel} - ${dateLabel}`;
      cell.addEventListener("click", () => {
        document.querySelectorAll(".cal-cell.free-sel").forEach((node) => node.classList.remove("free-sel"));
        cell.classList.add("free-sel");
        serviceBookingDateParts = { day, month: serviceBookingMonth, year: serviceBookingYear };
        serviceBookingSetDateTimeValue("");
        serviceBookingRenderEventsPanel();
      });
    }

    grid.appendChild(cell);
  }

  serviceBookingRenderEventsPanel();
}

function serviceBookingFormatTime(value) {
  const digits = value.replace(/\D/g, "").slice(0, 4);
  if (digits.length <= 2) return digits;
  return `${digits.slice(0, 2)}:${digits.slice(2)}`;
}

function serviceBookingNormalizeTimeField(field) {
  if (!field) return "";
  const formatted = serviceBookingFormatTime(field.value);
  field.value = formatted;
  return formatted;
}

function serviceBookingIsValidTime(value) {
  if (!value) return true;
  const match = value.match(/^(\d{2}):(\d{2})$/);
  if (!match) return false;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  return hours >= 0 && hours <= 23 && minutes >= 0 && minutes <= 59;
}

function serviceBookingLimitText(value, max) {
  return (value || "").trim().slice(0, max);
}

function serviceBookingSetError(form, message, focusNode) {
  const error = form.querySelector(".booking-error") || form.parentElement?.querySelector(".booking-error");
  if (error) {
    error.textContent = message;
    error.hidden = false;
  }
  if (focusNode) focusNode.focus({ preventScroll: true });
}

function serviceBookingClearError(form) {
  const error = form.querySelector(".booking-error") || form.parentElement?.querySelector(".booking-error");
  if (error) {
    error.textContent = "";
    error.hidden = true;
  }
  form.querySelectorAll(".is-invalid").forEach((node) => node.classList.remove("is-invalid"));
}

function handleBooking(event) {
  event.preventDefault();
  const form = event.target;
  serviceBookingClearError(form);

  const nameField = document.getElementById("customerName");
  const phoneField = document.getElementById("customerPhone");
  const packageField = document.getElementById("bookingPackageSelect");
  const eventField = document.getElementById("eventTypeSelect");
  const dateField = document.getElementById("desiredDateTime");
  const notesField = document.getElementById("bookingNotes");
  const startDesktop = document.getElementById("startTimeDesktop");
  const endDesktop = document.getElementById("endTimeDesktop");

  const name = serviceBookingLimitText(nameField?.value, SERVICE_BOOKING_LIMITS.name);
  const phone = serviceBookingLimitText(phoneField?.value, SERVICE_BOOKING_LIMITS.phone);
  const bookingPackageValue = serviceBookingLimitText(packageField?.value, 80);
  const bookingPackage = serviceBookingLimitText(packageField?.selectedOptions?.[0]?.textContent || bookingPackageValue, 80);
  const eventType = serviceBookingLimitText(eventField?.value, 80);
  const bookingDate = serviceBookingLimitText(dateField?.value, SERVICE_BOOKING_LIMITS.date);
  const startTime = serviceBookingNormalizeTimeField(startDesktop);
  const endTime = serviceBookingNormalizeTimeField(endDesktop);
  const notes = serviceBookingLimitText(notesField?.value, SERVICE_BOOKING_LIMITS.notes) || "-";
  let bookingTime = "-";

  if (startTime && endTime) bookingTime = `${startTime} - ${endTime}`;
  else if (startTime) bookingTime = `${serviceBookingCopy.timePrefixes.from} ${startTime}`;
  else if (endTime) bookingTime = `${serviceBookingCopy.timePrefixes.until} ${endTime}`;

  const requiredFields = [
    [nameField, name],
    [phoneField, phone],
    [packageField, bookingPackageValue],
    [eventField, eventType],
    [dateField, bookingDate]
  ];
  const missing = requiredFields.find(([, value]) => !value);
  const invalidTimeFields = [startDesktop, endDesktop].filter((field) => field && !serviceBookingIsValidTime(field.value.trim()));

  if (missing || bookingTime === "-") {
    requiredFields.forEach(([node, value]) => {
      if (node && !value) node.classList.add("is-invalid");
    });
    if (bookingTime === "-") {
      [startDesktop, endDesktop].forEach((node) => node?.classList.add("is-invalid"));
    }
    const timeFocus = [startDesktop, endDesktop].find((node) => node && !node.disabled);
    serviceBookingSetError(form, serviceBookingCopy.errors.required, missing?.[0] || timeFocus);
    return;
  }
  if (invalidTimeFields.length) {
    invalidTimeFields.forEach((node) => node.classList.add("is-invalid"));
    serviceBookingSetError(form, serviceBookingCopy.errors.invalidTime, invalidTimeFields[0]);
    return;
  }

  const message =
    `${serviceBookingCopy.greeting}\n\n`
    + `${serviceBookingCopy.labels.name}: ${name}\n`
    + `${serviceBookingCopy.labels.phone}: ${phone}\n`
    + `${serviceBookingCopy.labels.package}: ${bookingPackage}\n`
    + `${serviceBookingCopy.labels.eventType}: ${eventType}\n`
    + `${serviceBookingCopy.labels.date}: ${bookingDate}\n`
    + `${serviceBookingCopy.labels.time}: ${bookingTime}\n`
    + `${serviceBookingCopy.labels.notes}: ${notes}`;

  if (message.length > SERVICE_BOOKING_LIMITS.message) {
    notesField?.classList.add("is-invalid");
    serviceBookingSetError(form, serviceBookingCopy.errors.tooLong, notesField);
    return;
  }

  const button = form.querySelector(".booking-btn");
  const originalText = button?.textContent || "";
  if (button) {
    button.textContent = serviceBookingCopy.buttonSent;
    button.disabled = true;
    setTimeout(() => {
      button.textContent = originalText;
      button.disabled = false;
    }, 3000);
  }

  setTimeout(() => {
    window.open(`https://wa.me/37127850380?text=${encodeURIComponent(message)}`, "_blank", "noopener,noreferrer");
  }, 350);
}

document.getElementById("prevMonth")?.addEventListener("click", () => {
  serviceBookingMonth -= 1;
  if (serviceBookingMonth < 0) {
    serviceBookingMonth = 11;
    serviceBookingYear -= 1;
  }
  serviceBookingRenderCalendar();
});

document.getElementById("nextMonth")?.addEventListener("click", () => {
  serviceBookingMonth += 1;
  if (serviceBookingMonth > 11) {
    serviceBookingMonth = 0;
    serviceBookingYear += 1;
  }
  serviceBookingRenderCalendar();
});

["startTimeDesktop", "endTimeDesktop"].forEach((id) => {
  const input = document.getElementById(id);
  input?.addEventListener("input", (event) => {
    event.target.value = serviceBookingFormatTime(event.target.value);
  });
  input?.addEventListener("blur", (event) => {
    serviceBookingNormalizeTimeField(event.target);
  });
});

serviceBookingRenderCalendar();

const serviceBookingRevealEls = document.querySelectorAll(".reveal");
if ("IntersectionObserver" in window) {
  const serviceBookingRevealObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry, index) => {
      if (!entry.isIntersecting) return;
      setTimeout(() => entry.target.classList.add("visible"), index * 60);
      serviceBookingRevealObserver.unobserve(entry.target);
    });
  }, { threshold: 0.1 });

  serviceBookingRevealEls.forEach((el) => serviceBookingRevealObserver.observe(el));
} else {
  serviceBookingRevealEls.forEach((el) => el.classList.add("visible"));
}
