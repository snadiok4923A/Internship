"use strict";

const DATA_URL = "data/internships.json";
const CURRENCY_FORMATTER = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0
});

const elements = {
  searchForm: document.querySelector(".search-form"),
  searchInput: document.querySelector("#search-input"),
  domainFilter: document.querySelector("#domain-filter"),
  locationFilter: document.querySelector("#location-filter"),
  workTypeFilter: document.querySelector("#work-type-filter"),
  stipendFilter: document.querySelector("#stipend-filter"),
  durationFilter: document.querySelector("#duration-filter"),
  sortSelect: document.querySelector("#sort-select"),
  clearFilters: document.querySelector("#clear-filters"),
  emptyClearFilters: document.querySelector("#empty-clear-filters"),
  resultCount: document.querySelector("#result-count"),
  grid: document.querySelector("#internship-grid"),
  loadingState: document.querySelector("#loading-state"),
  errorState: document.querySelector("#error-state"),
  retryLoad: document.querySelector("#retry-load"),
  emptyState: document.querySelector("#empty-state"),
  dialog: document.querySelector("#details-dialog"),
  dialogContent: document.querySelector("#dialog-content"),
  dialogClose: document.querySelector("#dialog-close"),
  menuToggle: document.querySelector(".menu-toggle"),
  navigation: document.querySelector("#primary-navigation")
};

const avatarPalettes = [
  { background: "#eef0ff", ink: "#5368dc", border: "#e0e3ff" },
  { background: "#e8f7f1", ink: "#218363", border: "#d7f0e5" },
  { background: "#fff1e8", ink: "#c87541", border: "#ffeadb" },
  { background: "#f7edff", ink: "#8d5ab9", border: "#eee0fc" },
  { background: "#eaf4ff", ink: "#3b78b8", border: "#dcecff" },
  { background: "#fff0f3", ink: "#bd5c74", border: "#ffe2e9" }
];

let internships = [];
let dialogInvoker = null;

function formatCurrency(amount) {
  return `${CURRENCY_FORMATTER.format(amount)} / mo`;
}

function formatDate(dateString) {
  const date = new Date(`${dateString}T00:00:00`);
  if (Number.isNaN(date.getTime())) {
    return dateString;
  }

  return new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric"
  }).format(date);
}

function getInitials(company) {
  return company
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0])
    .join("")
    .toUpperCase();
}

function createAvatar(company, id) {
  const palette = avatarPalettes[(Number(id) - 1) % avatarPalettes.length];
  const avatar = document.createElement("span");
  avatar.className = "company-avatar";
  avatar.setAttribute("aria-hidden", "true");
  avatar.textContent = getInitials(company);
  avatar.style.setProperty("--avatar-bg", palette.background);
  avatar.style.setProperty("--avatar-ink", palette.ink);
  avatar.style.setProperty("--avatar-border", palette.border);
  return avatar;
}

function createIcon(pathMarkup) {
  const icon = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  icon.setAttribute("viewBox", "0 0 20 20");
  icon.setAttribute("fill", "none");
  icon.setAttribute("aria-hidden", "true");

  const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
  path.setAttribute("d", pathMarkup);
  path.setAttribute("stroke", "currentColor");
  path.setAttribute("stroke-width", "1.5");
  path.setAttribute("stroke-linecap", "round");
  path.setAttribute("stroke-linejoin", "round");
  icon.append(path);
  return icon;
}

function createMetaItem(label, iconPath, extraClass = "") {
  const item = document.createElement("span");
  item.className = `meta-item${extraClass ? ` ${extraClass}` : ""}`;
  if (iconPath) {
    item.append(createIcon(iconPath));
  }
  item.append(document.createTextNode(label));
  return item;
}

function createInternshipCard(internship) {
  const article = document.createElement("article");
  article.className = "internship-card";

  const topLine = document.createElement("div");
  topLine.className = "card-topline";
  const companyLockup = document.createElement("div");
  companyLockup.className = "company-lockup";
  companyLockup.append(createAvatar(internship.company, internship.id));

  const companyName = document.createElement("span");
  companyName.className = "company-name";
  companyName.textContent = internship.company;
  companyLockup.append(companyName);

  const postedDate = document.createElement("time");
  postedDate.className = "posted-date";
  postedDate.dateTime = internship.postedDate;
  postedDate.textContent = `Posted ${formatDate(internship.postedDate)}`;
  topLine.append(companyLockup, postedDate);

  const heading = document.createElement("h3");
  heading.className = "card-heading";
  heading.textContent = internship.title;

  const domainBadge = document.createElement("span");
  domainBadge.className = "domain-badge";
  domainBadge.textContent = internship.domain;

  const metadata = document.createElement("div");
  metadata.className = "card-meta";
  metadata.append(
    createMetaItem(internship.location, "M10 17s5-4.4 5-9a5 5 0 1 0-10 0c0 4.6 5 9 5 9Z M10 9a1.6 1.6 0 1 0 0-3.2A1.6 1.6 0 0 0 10 9Z"),
    createMetaItem(internship.workType, "", "work-type"),
    createMetaItem(internship.duration, "M10 5v5l3 2 M10 2.5a7.5 7.5 0 1 0 0 15 7.5 7.5 0 0 0 0-15Z")
  );

  const bottomLine = document.createElement("div");
  bottomLine.className = "card-bottomline";
  const stipend = document.createElement("div");
  const stipendValue = document.createElement("span");
  stipendValue.className = "stipend-value";
  stipendValue.textContent = formatCurrency(internship.stipend);
  const stipendPeriod = document.createElement("span");
  stipendPeriod.className = "stipend-period";
  stipendPeriod.textContent = "Monthly stipend";
  stipend.append(stipendValue, stipendPeriod);

  const actions = document.createElement("div");
  actions.className = "card-actions";
  const detailsButton = document.createElement("button");
  detailsButton.className = "details-button";
  detailsButton.type = "button";
  detailsButton.textContent = "View details";
  detailsButton.setAttribute("aria-label", `View details for ${internship.title} at ${internship.company}`);
  detailsButton.addEventListener("click", () => openDetails(internship));

  const applyLink = document.createElement("a");
  applyLink.className = "apply-button";
  applyLink.href = createApplicationLink(internship);
  applyLink.textContent = "Apply now";
  applyLink.setAttribute("aria-label", `Apply for ${internship.title} at ${internship.company}`);
  actions.append(detailsButton, applyLink);
  bottomLine.append(stipend, actions);

  const skills = document.createElement("p");
  skills.className = "visually-hidden";
  skills.textContent = `Skills: ${internship.skills.join(", ")}`;
  article.append(topLine, domainBadge, heading, metadata, bottomLine, skills);
  return article;
}

function createApplicationLink(internship) {
  const subject = encodeURIComponent(`Application: ${internship.title}`);
  const body = encodeURIComponent(
    `Hello ${internship.company} team,\n\nI would like to apply for the ${internship.title} internship listed on InternBoard.\n\nName:\nPortfolio or LinkedIn:\n`
  );
  return `mailto:careers@${internship.company.toLowerCase().replace(/[^a-z0-9]+/g, "")}.example?subject=${subject}&body=${body}`;
}

function addFilterOptions(select, values) {
  const fragment = document.createDocumentFragment();
  [...new Set(values)].sort((a, b) => a.localeCompare(b)).forEach((value) => {
    const option = document.createElement("option");
    option.value = value;
    option.textContent = value;
    fragment.append(option);
  });
  select.append(fragment);
}

function populateFilters() {
  addFilterOptions(elements.domainFilter, internships.map((item) => item.domain));
  addFilterOptions(elements.locationFilter, internships.map((item) => item.location));
  addFilterOptions(elements.workTypeFilter, internships.map((item) => item.workType));
}

function getDurationInMonths(duration) {
  const match = duration.match(/\d+/);
  return match ? Number(match[0]) : 0;
}

function matchesStipend(stipend, range) {
  if (!range) {
    return true;
  }
  const [minimum, maximum] = range.split("-").map(Number);
  return stipend >= minimum && stipend <= maximum;
}

function getFilteredInternships() {
  const query = elements.searchInput.value.trim().toLocaleLowerCase();
  const domain = elements.domainFilter.value;
  const location = elements.locationFilter.value;
  const workType = elements.workTypeFilter.value;
  const stipendRange = elements.stipendFilter.value;
  const durationRange = elements.durationFilter.value;

  const results = internships.filter((internship) => {
    const searchableText = [
      internship.title,
      internship.company,
      internship.domain,
      internship.location,
      internship.workType,
      ...internship.skills
    ].join(" ").toLocaleLowerCase();
    const months = getDurationInMonths(internship.duration);
    const [minimumMonths, maximumMonths] = durationRange
      ? durationRange.split("-").map(Number)
      : [0, Number.POSITIVE_INFINITY];

    return (
      (!query || searchableText.includes(query)) &&
      (!domain || internship.domain === domain) &&
      (!location || internship.location === location) &&
      (!workType || internship.workType === workType) &&
      matchesStipend(internship.stipend, stipendRange) &&
      (!durationRange || (months >= minimumMonths && months <= maximumMonths))
    );
  });

  return sortInternships(results, elements.sortSelect.value);
}

function sortInternships(results, sortMode) {
  const sortedResults = [...results];
  const comparators = {
    latest: (a, b) => new Date(b.postedDate) - new Date(a.postedDate),
    oldest: (a, b) => new Date(a.postedDate) - new Date(b.postedDate),
    "stipend-high": (a, b) => b.stipend - a.stipend,
    "stipend-low": (a, b) => a.stipend - b.stipend,
    "company-az": (a, b) => a.company.localeCompare(b.company)
  };
  sortedResults.sort(comparators[sortMode] || comparators.latest);
  return sortedResults;
}

function renderInternships() {
  const results = getFilteredInternships();
  const fragment = document.createDocumentFragment();
  results.forEach((internship) => fragment.append(createInternshipCard(internship)));
  elements.grid.replaceChildren(fragment);
  elements.resultCount.replaceChildren();

  const count = document.createElement("strong");
  count.textContent = String(results.length);
  const total = document.createElement("strong");
  total.textContent = String(internships.length);
  elements.resultCount.append("Showing ", count, " of ", total, " internships");
  elements.emptyState.hidden = results.length > 0;
}

function createDialogSection(title, content) {
  const section = document.createElement("section");
  section.className = "dialog-section";
  const heading = document.createElement("h3");
  heading.textContent = title;
  section.append(heading, content);
  return section;
}

function openDetails(internship) {
  dialogInvoker = document.activeElement;
  elements.dialogContent.replaceChildren();

  const titleRow = document.createElement("div");
  titleRow.className = "dialog-title-row";
  titleRow.append(createAvatar(internship.company, internship.id));

  const titleDetails = document.createElement("div");
  const title = document.createElement("h2");
  title.id = "dialog-title";
  title.textContent = internship.title;
  const company = document.createElement("p");
  company.className = "dialog-company";
  company.textContent = internship.company;
  titleDetails.append(title, company);
  titleRow.append(titleDetails);
  elements.dialogContent.append(titleRow);

  const badges = document.createElement("div");
  badges.className = "dialog-badges";
  [
    internship.domain,
    internship.location,
    internship.workType,
    internship.duration,
    formatCurrency(internship.stipend)
  ].forEach((label) => {
    const badge = document.createElement("span");
    badge.className = "dialog-badge";
    badge.textContent = label;
    badges.append(badge);
  });
  elements.dialogContent.append(badges);

  const description = document.createElement("p");
  description.textContent = internship.description;
  elements.dialogContent.append(createDialogSection("About the internship", description));

  const responsibilities = document.createElement("ul");
  internship.responsibilities.forEach((responsibility) => {
    const item = document.createElement("li");
    item.textContent = responsibility;
    responsibilities.append(item);
  });
  elements.dialogContent.append(createDialogSection("What you’ll do", responsibilities));

  const skills = document.createElement("div");
  skills.className = "dialog-skills";
  internship.skills.forEach((skill) => {
    const item = document.createElement("span");
    item.className = "dialog-skill";
    item.textContent = skill;
    skills.append(item);
  });
  elements.dialogContent.append(createDialogSection("Skills you’ll use", skills));

  const eligibility = document.createElement("p");
  eligibility.textContent = internship.eligibility;
  elements.dialogContent.append(createDialogSection("Who can apply", eligibility));

  const footer = document.createElement("div");
  footer.className = "dialog-footer";
  const deadline = document.createElement("span");
  deadline.className = "deadline-note";
  deadline.textContent = `Apply by ${formatDate(internship.deadline)}`;
  const apply = document.createElement("a");
  apply.className = "apply-button dialog-apply";
  apply.href = createApplicationLink(internship);
  apply.textContent = "Apply for this internship";
  footer.append(deadline, apply);
  elements.dialogContent.append(footer);

  elements.dialog.showModal();
  elements.dialogClose.focus();
}

function clearFilters() {
  elements.searchInput.value = "";
  elements.domainFilter.value = "";
  elements.locationFilter.value = "";
  elements.workTypeFilter.value = "";
  elements.stipendFilter.value = "";
  elements.durationFilter.value = "";
  elements.sortSelect.value = "latest";
  renderInternships();
  elements.searchInput.focus();
}

function closeMobileMenu() {
  elements.navigation.classList.remove("is-open");
  elements.menuToggle.setAttribute("aria-expanded", "false");
  elements.menuToggle.setAttribute("aria-label", "Open navigation menu");
}

function toggleMobileMenu() {
  const isOpen = elements.menuToggle.getAttribute("aria-expanded") === "true";
  elements.menuToggle.setAttribute("aria-expanded", String(!isOpen));
  elements.menuToggle.setAttribute("aria-label", isOpen ? "Open navigation menu" : "Close navigation menu");
  elements.navigation.classList.toggle("is-open", !isOpen);
}

async function loadInternships() {
  elements.loadingState.hidden = false;
  elements.errorState.hidden = true;
  elements.emptyState.hidden = true;
  elements.grid.replaceChildren();
  elements.resultCount.textContent = "Loading internships…";
  elements.retryLoad.disabled = true;

  try {
    const response = await fetch(DATA_URL);
    if (!response.ok) {
      throw new Error(`Internship data request failed with status ${response.status}`);
    }

    const data = await response.json();
    if (!Array.isArray(data) || data.length === 0) {
      throw new Error("Internship data must be a non-empty JSON array");
    }

    internships = data;
    populateFilters();
    document.querySelector("#stat-internships").textContent = `${internships.length}+`;
    document.querySelector("#stat-companies").textContent = `${new Set(internships.map((item) => item.company)).size}+`;
    document.querySelector("#stat-domains").textContent = `${new Set(internships.map((item) => item.domain)).size}+`;
    elements.loadingState.hidden = true;
    renderInternships();
  } catch (error) {
    console.error("Unable to load internship data:", error);
    elements.loadingState.hidden = true;
    elements.errorState.hidden = false;
    elements.resultCount.textContent = "Internships are unavailable";
  } finally {
    elements.retryLoad.disabled = false;
  }
}

elements.searchForm.addEventListener("submit", (event) => {
  event.preventDefault();
  renderInternships();
  document.querySelector("#internships").scrollIntoView({ behavior: "smooth" });
});

elements.searchInput.addEventListener("input", renderInternships);
[
  elements.domainFilter,
  elements.locationFilter,
  elements.workTypeFilter,
  elements.stipendFilter,
  elements.durationFilter,
  elements.sortSelect
].forEach((control) => control.addEventListener("change", renderInternships));

elements.clearFilters.addEventListener("click", clearFilters);
elements.emptyClearFilters.addEventListener("click", clearFilters);
elements.retryLoad.addEventListener("click", loadInternships);
elements.dialogClose.addEventListener("click", () => elements.dialog.close());
elements.dialog.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    event.preventDefault();
    elements.dialog.close();
  }
});
elements.dialog.addEventListener("click", (event) => {
  if (event.target === elements.dialog) {
    elements.dialog.close();
  }
});
elements.dialog.addEventListener("close", () => {
  if (dialogInvoker instanceof HTMLElement && dialogInvoker.isConnected) {
    dialogInvoker.focus({ preventScroll: true });
  }
  dialogInvoker = null;
});
elements.menuToggle.addEventListener("click", toggleMobileMenu);
elements.navigation.addEventListener("click", (event) => {
  if (event.target.closest("a")) {
    closeMobileMenu();
  }
});
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && elements.navigation.classList.contains("is-open")) {
    closeMobileMenu();
    elements.menuToggle.focus();
  }
});

document.querySelector("#current-year").textContent = String(new Date().getFullYear());
loadInternships();
