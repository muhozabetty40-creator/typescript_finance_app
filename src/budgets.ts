type Category =
  | "salary"
  | "freelance"
  | "food"
  | "transport"
  | "bills"
  | "shopping"
  | "health"
  | "other";

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

type TransactionType = "income" | "expense";

interface Transaction {
  id: string;
  description: string;
  amount: number;
  type: TransactionType;
  category: Category;
  date: string;
  createdAt: number;
}

interface Budget {
  id: string;
  category: Category;
  limit: number;
  month: string;
  theme?: ThemeColor;
  createdAt: number;
}

interface BudgetViewModel {
  budget: Budget;
  spent: number;
  remaining: number;
  percentUsed: number;
}

const TRANSACTION_STORAGE_KEY = "personal-finance-app.transactions";
const BUDGET_STORAGE_KEY = "personal-finance-app.budgets";

const openBudgetFormButton = document.querySelector<HTMLButtonElement>("#openBudgetFormButton");
const closeBudgetFormButton = document.querySelector<HTMLButtonElement>("#closeBudgetFormButton");
const budgetModal = document.querySelector<HTMLDivElement>("#budgetModal");
const budgetForm = document.querySelector<HTMLFormElement>("#budgetForm");
const budgetCategoryInput = document.querySelector<HTMLSelectElement>("#budgetCategory");
const budgetLimitInput = document.querySelector<HTMLInputElement>("#budgetLimit");
const budgetThemeInput = document.querySelector<HTMLSelectElement>("#budgetTheme");
const budgetMonthInput = document.querySelector<HTMLInputElement>("#budgetMonth");
const budgetFeedback = document.querySelector<HTMLParagraphElement>("#budgetFeedback");
const budgetCards = document.querySelector<HTMLDivElement>("#budgetCards");
const budgetEmptyState = document.querySelector<HTMLParagraphElement>(".budget-empty-state");

if (
  !openBudgetFormButton ||
  !closeBudgetFormButton ||
  !budgetModal ||
  !budgetForm ||
  !budgetCategoryInput ||
  !budgetLimitInput ||
  !budgetThemeInput ||
  !budgetMonthInput ||
  !budgetFeedback ||
  !budgetCards ||
  !budgetEmptyState
) {
  throw new Error("Budgets page is missing required DOM elements.");
}

const dom = {
  openBudgetFormButton,
  closeBudgetFormButton,
  budgetModal,
  budgetForm,
  budgetCategoryInput,
  budgetLimitInput,
  budgetThemeInput,
  budgetMonthInput,
  budgetFeedback,
  budgetCards,
  budgetEmptyState,
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

let budgets: Budget[] = loadBudgets();
const transactions = loadTransactions();

setDefaultMonth();
renderBudgets();

dom.openBudgetFormButton.addEventListener("click", () => {
  dom.budgetModal.classList.remove("hidden");
  dom.budgetModal.setAttribute("aria-hidden", "false");
  dom.budgetCategoryInput.focus();
});

dom.closeBudgetFormButton.addEventListener("click", () => {
  closeBudgetModal();
});

dom.budgetModal.addEventListener("click", (event) => {
  if (event.target === dom.budgetModal) {
    closeBudgetModal();
  }
});

dom.budgetForm.addEventListener("submit", (event) => {
  event.preventDefault();
  dom.budgetFeedback.textContent = "";

  const categoryValue = dom.budgetCategoryInput.value;
  const limit = Number(dom.budgetLimitInput.value);
  const themeValue = dom.budgetThemeInput.value;
  const month = dom.budgetMonthInput.value;

  if (!isCategory(categoryValue)) {
    dom.budgetFeedback.textContent = "Choose a valid category.";
    return;
  }

  if (!Number.isFinite(limit) || limit <= 0) {
    dom.budgetFeedback.textContent = "Budget limit must be greater than 0.";
    return;
  }

  if (!month) {
    dom.budgetFeedback.textContent = "Select a month.";
    return;
  }

  if (!isThemeColor(themeValue)) {
    dom.budgetFeedback.textContent = "Select a valid theme color.";
    return;
  }

  const budget: Budget = {
    id: createId(),
    category: categoryValue,
    limit: normalizeCurrency(limit),
    month,
    theme: themeValue,
    createdAt: Date.now(),
  };

  budgets = [budget, ...budgets];
  saveBudgets(budgets);
  closeBudgetModal();
  renderBudgets();
});

function closeBudgetModal(): void {
  dom.budgetModal.classList.add("hidden");
  dom.budgetModal.setAttribute("aria-hidden", "true");
  dom.budgetFeedback.textContent = "";
  dom.budgetForm.reset();
  setDefaultMonth();
}

dom.budgetCards.addEventListener("click", (event) => {
  const target = event.target;
  if (!(target instanceof HTMLButtonElement)) {
    return;
  }

  const action = target.dataset.action;
  const budgetId = target.dataset.id;

  if (action !== "delete" || !budgetId) {
    return;
  }

  budgets = budgets.filter((item) => item.id !== budgetId);
  saveBudgets(budgets);
  renderBudgets();
});

function renderBudgets(): void {
  dom.budgetCards.innerHTML = "";

  const views = budgets.map((budget) => buildBudgetViewModel(budget, transactions));

  if (views.length === 0) {
    dom.budgetEmptyState.textContent = "You haven't created a budget yet.";
    dom.budgetEmptyState.classList.remove("hidden");
    return;
  }

  dom.budgetEmptyState.classList.add("hidden");

  views.forEach((view) => {
    const card = document.createElement("article");
    card.className = "budget-card";

    const progress = Math.min(view.percentUsed, 100);
    const themeColor = getThemeColor(view.budget.theme);

    card.innerHTML = `
      <div class="budget-card-head">
        <div>
          <p class="budget-category">${escapeHtml(toCategoryLabel(view.budget.category))}</p>
          <p class="budget-month">${escapeHtml(formatMonth(view.budget.month))}</p>
        </div>
        <button class="budget-delete-btn" data-action="delete" data-id="${view.budget.id}" type="button">Delete</button>
      </div>
      <div class="budget-meta">
        <span>Spent ${formatCurrency(view.spent)}</span>
        <span>Limit ${formatCurrency(view.budget.limit)}</span>
      </div>
      <div class="progress-track" aria-hidden="true">
        <div class="progress-fill" style="width: ${progress}%; background: ${escapeHtml(themeColor)}"></div>
      </div>
      <p class="budget-remaining">${formatCurrency(view.remaining)} remaining</p>
    `;

    dom.budgetCards.append(card);
  });
}

function buildBudgetViewModel(budget: Budget, items: Transaction[]): BudgetViewModel {
  const spent = items.reduce((total, item) => {
    if (item.type !== "expense") {
      return total;
    }

    if (item.category !== budget.category) {
      return total;
    }

    if (!item.date.startsWith(budget.month)) {
      return total;
    }

    return total + item.amount;
  }, 0);

  const remaining = budget.limit - spent;
  const percentUsed = budget.limit === 0 ? 0 : (spent / budget.limit) * 100;

  return {
    budget,
    spent,
    remaining,
    percentUsed,
  };
}

function loadBudgets(): Budget[] {
  const raw = localStorage.getItem(BUDGET_STORAGE_KEY);
  if (!raw) {
    return [];
  }

  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed.filter(isBudget);
  } catch {
    return [];
  }
}

function saveBudgets(items: Budget[]): void {
  localStorage.setItem(BUDGET_STORAGE_KEY, JSON.stringify(items));
}

function loadTransactions(): Transaction[] {
  const raw = localStorage.getItem(TRANSACTION_STORAGE_KEY);
  if (!raw) {
    return [];
  }

  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed.filter(isTransaction);
  } catch {
    return [];
  }
}

function isBudget(value: unknown): value is Budget {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const item = value as Record<string, unknown>;

  return (
    typeof item.id === "string" &&
    typeof item.limit === "number" &&
    Number.isFinite(item.limit) &&
    typeof item.month === "string" &&
    typeof item.createdAt === "number" &&
    (item.theme === undefined || isThemeColor(item.theme)) &&
    isCategory(item.category)
  );
}

function isTransaction(value: unknown): value is Transaction {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const item = value as Record<string, unknown>;

  return (
    typeof item.id === "string" &&
    typeof item.description === "string" &&
    typeof item.amount === "number" &&
    Number.isFinite(item.amount) &&
    typeof item.date === "string" &&
    typeof item.createdAt === "number" &&
    (item.type === "income" || item.type === "expense") &&
    isCategory(item.category)
  );
}

function isCategory(value: unknown): value is Category {
  return (
    value === "salary" ||
    value === "freelance" ||
    value === "food" ||
    value === "transport" ||
    value === "bills" ||
    value === "shopping" ||
    value === "health" ||
    value === "other"
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

function setDefaultMonth(): void {
  if (!dom.budgetMonthInput.value) {
    const today = new Date();
    dom.budgetMonthInput.value = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}`;
  }
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

function formatMonth(monthValue: string): string {
  const date = new Date(`${monthValue}-01T00:00:00`);
  if (Number.isNaN(date.getTime())) {
    return monthValue;
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    year: "numeric",
  }).format(date);
}

function toCategoryLabel(value: Category): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function escapeHtml(input: string): string {
  return input
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
