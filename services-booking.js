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
      eventType: "Pasākuma veids",
      date: "Datums",
      time: "Laiks",
      notes: "Piezīmes"
    },
    errors: {
      required: "Lūdzu aizpildiet vārdu, tālruni, pasākuma veidu, datumu un laiku.",
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
      eventType: "Event type",
      date: "Date",
      time: "Time",
      notes: "Notes"
    },
    errors: {
      required: "Please fill in your name, phone, event type, date and time.",
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
      eventType: "Формат мероприятия",
      date: "Дата",
      time: "Время",
      notes: "Примечания"
    },
    errors: {
      required: "Пожалуйста, заполните имя, телефон, формат мероприятия, дату и время.",
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

    cell.type = "button";
    cell.className = "cal-cell" + (isToday ? " today" : "") + (isPast ? " past" : "");
    cell.textContent = day;
    cell.setAttribute("aria-label", `${serviceBookingCopy.freeLabel} - ${serviceBookingFormatDate(day, serviceBookingMonth)}`);

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
      cell.title = `${serviceBookingCopy.freeLabel} - ${serviceBookingFormatDate(day, serviceBookingMonth)}`;
      cell.addEventListener("click", () => {
        document.querySelectorAll(".cal-cell.free-sel").forEach((node) => node.classList.remove("free-sel"));
        cell.classList.add("free-sel");
        serviceBookingDateParts = { day, month: serviceBookingMonth, year: serviceBookingYear };
        serviceBookingSetDateTimeValue("");
      });
    }

    grid.appendChild(cell);
  }
}

function serviceBookingFormatDesktopTime(value) {
  const digits = value.replace(/\D/g, "").slice(0, 4);
  if (digits.length <= 2) return digits;
  return `${digits.slice(0, 2)}:${digits.slice(2)}`;
}

function serviceBookingGetTimeValue(desktopId, mobileId) {
  const desktopValue = document.getElementById(desktopId)?.value.trim() || "";
  const mobileValue = document.getElementById(mobileId)?.value.trim() || "";
  return mobileValue || desktopValue;
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

function serviceBookingSyncTimeInputsForDevice() {
  ["startTimeDesktop", "endTimeDesktop"].forEach((id) => {
    const el = document.getElementById(id);
    if (el) el.disabled = false;
  });
  ["startTimeMobile", "endTimeMobile"].forEach((id) => {
    const el = document.getElementById(id);
    if (el) el.disabled = true;
  });
}

function handleBooking(event) {
  event.preventDefault();
  const form = event.target;
  serviceBookingClearError(form);

  const nameField = document.getElementById("customerName");
  const phoneField = document.getElementById("customerPhone");
  const eventField = document.getElementById("eventTypeSelect");
  const dateField = document.getElementById("desiredDateTime");
  const notesField = document.getElementById("bookingNotes");
  const startDesktop = document.getElementById("startTimeDesktop");
  const endDesktop = document.getElementById("endTimeDesktop");
  const startMobile = document.getElementById("startTimeMobile");
  const endMobile = document.getElementById("endTimeMobile");

  const name = serviceBookingLimitText(nameField?.value, SERVICE_BOOKING_LIMITS.name);
  const phone = serviceBookingLimitText(phoneField?.value, SERVICE_BOOKING_LIMITS.phone);
  const eventType = serviceBookingLimitText(eventField?.value, 80);
  const bookingDate = serviceBookingLimitText(dateField?.value, SERVICE_BOOKING_LIMITS.date);
  const startTime = serviceBookingGetTimeValue("startTimeDesktop", "startTimeMobile");
  const endTime = serviceBookingGetTimeValue("endTimeDesktop", "endTimeMobile");
  const notes = serviceBookingLimitText(notesField?.value, SERVICE_BOOKING_LIMITS.notes) || "-";
  let bookingTime = "-";

  if (startTime && endTime) bookingTime = `${startTime} - ${endTime}`;
  else if (startTime) bookingTime = `${serviceBookingCopy.timePrefixes.from} ${startTime}`;
  else if (endTime) bookingTime = `${serviceBookingCopy.timePrefixes.until} ${endTime}`;

  const requiredFields = [
    [nameField, name],
    [phoneField, phone],
    [eventField, eventType],
    [dateField, bookingDate]
  ];
  const missing = requiredFields.find(([, value]) => !value);

  if (missing || bookingTime === "-") {
    requiredFields.forEach(([node, value]) => {
      if (node && !value) node.classList.add("is-invalid");
    });
    if (bookingTime === "-") {
      [startDesktop, endDesktop, startMobile, endMobile].forEach((node) => node?.classList.add("is-invalid"));
    }
    const timeFocus = [startDesktop, startMobile, endDesktop, endMobile].find((node) => node && !node.disabled);
    serviceBookingSetError(form, serviceBookingCopy.errors.required, missing?.[0] || timeFocus);
    return;
  }

  const message =
    `${serviceBookingCopy.greeting}\n\n`
    + `${serviceBookingCopy.labels.name}: ${name}\n`
    + `${serviceBookingCopy.labels.phone}: ${phone}\n`
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
    event.target.value = serviceBookingFormatDesktopTime(event.target.value);
  });
});

serviceBookingSyncTimeInputsForDevice();
window.addEventListener("resize", serviceBookingSyncTimeInputsForDevice);
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
