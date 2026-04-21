type TransactionType = "income" | "expense";
type Category =
  | "salary"
  | "freelance"
  | "food"
  | "transport"
  | "bills"
  | "shopping"
  | "health"
  | "other";

interface Transaction {
  id: string;
  description: string;
  amount: number;
  type: TransactionType;
  category: Category;
  date: string;
  createdAt: number;
}

interface Summary {
  income: number;
  expense: number;
  balance: number;
}

interface Budget {
  id: string;
  category: Category;
  limit: number;
  month: string;
  createdAt: number;
}

interface Pot {
  id: string;
  name: string;
  target: number;
  saved: number;
  createdAt: number;
}

type BillStatus = "upcoming" | "paid" | "due-soon";

interface RecurringBill {
  id: string;
  title: string;
  amount: number;
  dueDate: string;
  category: Category;
  status: BillStatus;
  createdAt: number;
}

const STORAGE_KEY = "personal-finance-app.transactions";
const BUDGET_STORAGE_KEY = "personal-finance-app.budgets";
const POT_STORAGE_KEY = "personal-finance-app.pots";
const BILL_STORAGE_KEY = "personal-finance-app.recurring-bills";

const balanceEl = document.querySelector<HTMLElement>("#overviewBalance");
const incomeEl = document.querySelector<HTMLElement>("#overviewIncome");
const expenseEl = document.querySelector<HTMLElement>("#overviewExpense");
const potsTotalEl = document.querySelector<HTMLElement>("#potsTotal");
const budgetsEmptyStateEl = document.querySelector<HTMLElement>("#budgetsEmptyState");
const budgetsPreviewEl = document.querySelector<HTMLDivElement>("#budgetsPreview");
const overviewCountLabelEl = document.querySelector<HTMLElement>("#overviewCountLabel");
const paidBillsEl = document.querySelector<HTMLElement>("#paidBillsAmount");
const upcomingBillsEl = document.querySelector<HTMLElement>("#upcomingBillsAmount");
const dueSoonBillsEl = document.querySelector<HTMLElement>("#dueSoonBillsAmount");
const logoutButton = document.querySelector<HTMLButtonElement>("#logoutButton");
const recentListEl = document.querySelector<HTMLUListElement>("#recentTransactionList");

if (
  !balanceEl ||
  !incomeEl ||
  !expenseEl ||
  !potsTotalEl ||
  !budgetsEmptyStateEl ||
  !budgetsPreviewEl ||
  !overviewCountLabelEl ||
  !paidBillsEl ||
  !upcomingBillsEl ||
  !dueSoonBillsEl ||
  !logoutButton ||
  !recentListEl
) {
  throw new Error("Overview page is missing required DOM elements.");
}

const dom = {
  balanceEl,
  incomeEl,
  expenseEl,
  potsTotalEl,
  budgetsEmptyStateEl,
  budgetsPreviewEl,
  overviewCountLabelEl,
  paidBillsEl,
  upcomingBillsEl,
  dueSoonBillsEl,
  logoutButton,
  recentListEl,
} as const;

const transactions = loadTransactions();
const budgets = loadBudgets();
const pots = loadPots();
const bills = loadBills();
renderOverview();

dom.logoutButton.addEventListener("click", () => {
  localStorage.removeItem("personal-finance-app.auth-session");
  window.location.href = "./auth.html";
});

function renderOverview(): void {
  const summary = calculateSummary(transactions);

  dom.balanceEl.textContent = formatCurrency(summary.balance);
  dom.incomeEl.textContent = formatCurrency(summary.income);
  dom.expenseEl.textContent = formatCurrency(summary.expense);
  dom.potsTotalEl.textContent = formatCurrency(calculatePotTotal(pots));
  dom.overviewCountLabelEl.textContent = transactions.length === 0 ? "No Data Provided" : `${transactions.length} transactions`;

  renderBudgetsPreview(budgets, transactions);
  renderRecurringSummary(bills);

  renderRecentTransactions(transactions);
}

function renderRecentTransactions(items: Transaction[]): void {
  dom.recentListEl.innerHTML = "";

  const recent = [...items]
    .sort((left, right) => right.date.localeCompare(left.date) || right.createdAt - left.createdAt)
    .slice(0, 5);

  if (recent.length === 0) {
    dom.recentListEl.append(createEmptyItem("No transactions yet. Add one in the transactions page."));
    return;
  }

  recent.forEach((item) => {
    const li = document.createElement("li");
    li.className = "recent-item overview-list-item";
    li.innerHTML = `
      <div>
        <p class="recent-title">${escapeHtml(item.description)}</p>
        <p class="recent-meta">${escapeHtml(item.category)} • ${escapeHtml(formatDate(item.date))}</p>
      </div>
      <p class="recent-amount ${item.type === "income" ? "amount-income" : "amount-expense"}">
        ${item.type === "income" ? "+" : "-"}${formatCurrency(item.amount)}
      </p>
    `;
    dom.recentListEl.append(li);
  });
}

function renderBudgetsPreview(items: Budget[], transactionItems: Transaction[]): void {
  dom.budgetsPreviewEl.innerHTML = "";

  if (items.length === 0) {
    dom.budgetsEmptyStateEl.textContent = "No Data Provided.";
    return;
  }

  dom.budgetsEmptyStateEl.textContent = "";

  const rows = items.slice(0, 3).map((budget) => {
    const spent = transactionItems.reduce((total, item) => {
      if (item.type !== "expense" || item.category !== budget.category) {
        return total;
      }

      return total + item.amount;
    }, 0);

    return {
      category: budget.category,
      spent,
      limit: budget.limit,
    };
  });

  rows.forEach((item) => {
    const row = document.createElement("div");
    row.className = "dashboard-mini-row";
    row.innerHTML = `
      <span>${escapeHtml(toCategoryLabel(item.category))}</span>
      <strong>${formatCurrency(item.spent)} / ${formatCurrency(item.limit)}</strong>
    `;
    dom.budgetsPreviewEl.append(row);
  });
}

function renderRecurringSummary(items: RecurringBill[]): void {
  const summary = items.reduce(
    (accumulator, item) => {
      if (item.status === "paid") {
        accumulator.paid += item.amount;
      } else if (item.status === "due-soon") {
        accumulator.dueSoon += item.amount;
      } else {
        accumulator.upcoming += item.amount;
      }

      return accumulator;
    },
    { paid: 0, upcoming: 0, dueSoon: 0 }
  );

  dom.paidBillsEl.textContent = formatCurrency(summary.paid);
  dom.upcomingBillsEl.textContent = formatCurrency(summary.upcoming);
  dom.dueSoonBillsEl.textContent = formatCurrency(summary.dueSoon);
}

function createEmptyItem(message: string): HTMLLIElement {
  const li = document.createElement("li");
  li.className = "empty-state list-empty";
  li.textContent = message;
  return li;
}

function calculateSummary(items: Transaction[]): Summary {
  return items.reduce<Summary>(
    (totals, item) => {
      if (item.type === "income") {
        totals.income += item.amount;
      } else {
        totals.expense += item.amount;
      }

      totals.balance = totals.income - totals.expense;
      return totals;
    },
    { income: 0, expense: 0, balance: 0 }
  );
}

function loadTransactions(): Transaction[] {
  const raw = localStorage.getItem(STORAGE_KEY);
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

function loadBudgets(): Budget[] {
  return loadTypedRecords(BUDGET_STORAGE_KEY, isBudget);
}

function loadPots(): Pot[] {
  return loadTypedRecords(POT_STORAGE_KEY, isPot);
}

function loadBills(): RecurringBill[] {
  return loadTypedRecords(BILL_STORAGE_KEY, isRecurringBill);
}

function loadTypedRecords<T>(storageKey: string, predicate: (value: unknown) => value is T): T[] {
  const raw = localStorage.getItem(storageKey);
  if (!raw) {
    return [];
  }

  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed.filter(predicate);
  } catch {
    return [];
  }
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
    isTransactionType(item.type) &&
    isCategory(item.category)
  );
}

function isTransactionType(value: unknown): value is TransactionType {
  return value === "income" || value === "expense";
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
    isCategory(item.category)
  );
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
    typeof item.createdAt === "number"
  );
}

function isRecurringBill(value: unknown): value is RecurringBill {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const item = value as Record<string, unknown>;
  return (
    typeof item.id === "string" &&
    typeof item.title === "string" &&
    typeof item.amount === "number" &&
    Number.isFinite(item.amount) &&
    typeof item.dueDate === "string" &&
    typeof item.createdAt === "number" &&
    isCategory(item.category) &&
    (item.status === "upcoming" || item.status === "paid" || item.status === "due-soon")
  );
}

function calculatePotTotal(items: Pot[]): number {
  return items.reduce((total, item) => total + item.saved, 0);
}

function toCategoryLabel(value: Category): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
  }).format(amount);
}

function formatDate(dateValue: string): string {
  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) {
    return dateValue;
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

function escapeHtml(input: string): string {
  return input
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
