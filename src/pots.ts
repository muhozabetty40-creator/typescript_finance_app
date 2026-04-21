type ThemeColor =
  | "green"
  | "teal"
  | "blue"
  | "navy"
  | "cyan"
  | "mint"
  | "lime"
  | "yellow"
  | "amber"
  | "orange"
  | "coral"
  | "red"
  | "rose"
  | "pink"
  | "magenta"
  | "purple"
  | "violet"
  | "indigo"
  | "brown"
  | "slate"
  | "gray"
  | "black";

interface Pot {
  id: string;
  name: string;
  target: number;
  saved: number;
  theme?: ThemeColor;
  createdAt: number;
}

const STORAGE_KEY = "personal-finance-app.pots";

const openPotFormButton = document.querySelector<HTMLButtonElement>("#openPotFormButton");
const closePotFormButton = document.querySelector<HTMLButtonElement>("#closePotFormButton");
const potModal = document.querySelector<HTMLDivElement>("#potModal");
const potForm = document.querySelector<HTMLFormElement>("#potForm");
const potNameInput = document.querySelector<HTMLInputElement>("#potName");
const potTargetInput = document.querySelector<HTMLInputElement>("#potTarget");
const potSavedInput = document.querySelector<HTMLInputElement>("#potSaved");
const potThemeInput = document.querySelector<HTMLSelectElement>("#potTheme");
const potFeedback = document.querySelector<HTMLParagraphElement>("#potFeedback");
const potCards = document.querySelector<HTMLDivElement>("#potCards");
const potsEmptyState = document.querySelector<HTMLParagraphElement>("#potsEmptyState");

if (
  !openPotFormButton ||
  !closePotFormButton ||
  !potModal ||
  !potForm ||
  !potNameInput ||
  !potTargetInput ||
  !potSavedInput ||
  !potThemeInput ||
  !potFeedback ||
  !potCards ||
  !potsEmptyState
) {
  throw new Error("Pots page is missing required DOM elements.");
}

const dom = {
  openPotFormButton,
  closePotFormButton,
  potModal,
  potForm,
  potNameInput,
  potTargetInput,
  potSavedInput,
  potThemeInput,
  potFeedback,
  potCards,
  potsEmptyState,
} as const;

const THEME_COLORS: Record<ThemeColor, string> = {
  green: "#2a9083",
  teal: "#1f9d94",
  blue: "#3f82ff",
  navy: "#27366f",
  cyan: "#2fb7d8",
  mint: "#3bbf9b",
  lime: "#8abf2f",
  yellow: "#d0ad28",
  amber: "#d78c1f",
  orange: "#db8f2f",
  coral: "#e77c6a",
  red: "#d45454",
  rose: "#c85e7e",
  pink: "#d46aa8",
  magenta: "#b650af",
  purple: "#8652cb",
  violet: "#6c55d9",
  indigo: "#4e61d4",
  brown: "#9a6b4f",
  slate: "#596375",
  gray: "#8b96a9",
  black: "#2a2d36",
};

let pots: Pot[] = loadPots();

renderPots();

dom.openPotFormButton.addEventListener("click", () => {
  dom.potModal.classList.remove("hidden");
  dom.potModal.setAttribute("aria-hidden", "false");
  dom.potNameInput.focus();
});

dom.closePotFormButton.addEventListener("click", () => {
  closePotModal();
});

dom.potModal.addEventListener("click", (event) => {
  if (event.target === dom.potModal) {
    closePotModal();
  }
});

dom.potForm.addEventListener("submit", (event) => {
  event.preventDefault();
  dom.potFeedback.textContent = "";

  const name = dom.potNameInput.value.trim();
  const target = Number(dom.potTargetInput.value);
  const saved = Number(dom.potSavedInput.value || 0);
  const themeValue = dom.potThemeInput.value;

  if (!name) {
    dom.potFeedback.textContent = "Pot name is required.";
    return;
  }

  if (!Number.isFinite(target) || target <= 0) {
    dom.potFeedback.textContent = "Target amount must be greater than 0.";
    return;
  }

  if (!Number.isFinite(saved) || saved < 0) {
    dom.potFeedback.textContent = "Starting savings cannot be negative.";
    return;
  }

  if (!isThemeColor(themeValue)) {
    dom.potFeedback.textContent = "Select a valid theme color.";
    return;
  }

  const pot: Pot = {
    id: createId(),
    name,
    target: normalizeCurrency(target),
    saved: Math.min(normalizeCurrency(saved), normalizeCurrency(target)),
    theme: themeValue,
    createdAt: Date.now(),
  };

  pots = [pot, ...pots];
  savePots(pots);
  closePotModal();
  renderPots();
});

function closePotModal(): void {
  dom.potModal.classList.add("hidden");
  dom.potModal.setAttribute("aria-hidden", "true");
  dom.potFeedback.textContent = "";
  dom.potForm.reset();
  dom.potSavedInput.value = "0";
}

dom.potCards.addEventListener("click", (event) => {
  const target = event.target;
  if (!(target instanceof HTMLButtonElement)) {
    return;
  }

  const action = target.dataset.action;
  const potId = target.dataset.id;
  if (!action || !potId) {
    return;
  }

  const pot = pots.find((item) => item.id === potId);
  if (!pot) {
    return;
  }

  if (action === "delete") {
    pots = pots.filter((item) => item.id !== potId);
  } else if (action === "deposit") {
    const amount = Number(window.prompt(`How much would you like to deposit into ${pot.name}?`, "0"));
    if (!Number.isFinite(amount) || amount <= 0) {
      return;
    }

    pot.saved = Math.min(normalizeCurrency(pot.saved + amount), pot.target);
  } else if (action === "withdraw") {
    const amount = Number(window.prompt(`How much would you like to withdraw from ${pot.name}?`, "0"));
    if (!Number.isFinite(amount) || amount <= 0) {
      return;
    }

    pot.saved = Math.max(normalizeCurrency(pot.saved - amount), 0);
  }

  savePots(pots);
  renderPots();
});

function renderPots(): void {
  dom.potCards.innerHTML = "";

  if (pots.length === 0) {
    dom.potsEmptyState.textContent = "You don't have a pot account yet.";
    dom.potsEmptyState.classList.remove("hidden");
    return;
  }

  dom.potsEmptyState.classList.add("hidden");

  pots.forEach((pot) => {
    const card = document.createElement("article");
    card.className = "budget-card pot-card";

    const progress = pot.target === 0 ? 0 : Math.min((pot.saved / pot.target) * 100, 100);
    const themeColor = getThemeColor(pot.theme);

    card.innerHTML = `
      <div class="budget-card-head">
        <div>
          <p class="budget-category">${escapeHtml(pot.name)}</p>
          <p class="budget-month">Target ${formatCurrency(pot.target)}</p>
        </div>
        <button class="budget-delete-btn" data-action="delete" data-id="${pot.id}" type="button">Delete</button>
      </div>
      <div class="budget-meta">
        <span>Saved ${formatCurrency(pot.saved)}</span>
        <span>${progress.toFixed(0)}%</span>
      </div>
      <div class="progress-track" aria-hidden="true">
        <div class="progress-fill pot-progress" style="width: ${progress}%; background: ${escapeHtml(themeColor)}"></div>
      </div>
      <div class="pot-actions">
        <button class="pot-action-btn" data-action="deposit" data-id="${pot.id}" type="button">Deposit</button>
        <button class="pot-action-btn pot-action-btn-alt" data-action="withdraw" data-id="${pot.id}" type="button">Withdraw</button>
      </div>
    `;

    dom.potCards.append(card);
  });
}

function loadPots(): Pot[] {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    return [];
  }

  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed.filter(isPot);
  } catch {
    return [];
  }
}

function savePots(items: Pot[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
}

function isPot(value: unknown): value is Pot {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const item = value as Record<string, unknown>;
  return (
    typeof item.id === "string" &&
    typeof item.name === "string" &&
    typeof item.target === "number" &&
    Number.isFinite(item.target) &&
    typeof item.saved === "number" &&
    Number.isFinite(item.saved) &&
    (item.theme === undefined || isThemeColor(item.theme)) &&
    typeof item.createdAt === "number"
  );
}

function isThemeColor(value: unknown): value is ThemeColor {
  return (
    value === "green" ||
    value === "teal" ||
    value === "blue" ||
    value === "navy" ||
    value === "cyan" ||
    value === "mint" ||
    value === "lime" ||
    value === "yellow" ||
    value === "amber" ||
    value === "orange" ||
    value === "coral" ||
    value === "red" ||
    value === "rose" ||
    value === "pink" ||
    value === "magenta" ||
    value === "purple" ||
    value === "violet" ||
    value === "indigo" ||
    value === "brown" ||
    value === "slate" ||
    value === "gray" ||
    value === "black"
  );
}

function getThemeColor(theme: ThemeColor | undefined): string {
  if (!theme) {
    return THEME_COLORS.green;
  }

  return THEME_COLORS[theme] ?? THEME_COLORS.green;
}

function createId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function normalizeCurrency(value: number): number {
  return Math.round(value * 100) / 100;
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
  }).format(amount);
}

function escapeHtml(input: string): string {
  return input
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
