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
type SortBy = "latest" | "oldest" | "highest" | "lowest";

interface Transaction {
  id: string;
  description: string;
  amount: number;
  type: TransactionType;
  category: Category;
  recurring?: boolean;
  date: string;
  createdAt: number;
}

const STORAGE_KEY = "personal-finance-app.transactions";
const ITEMS_PER_PAGE = 8;

const transactionForm = document.querySelector<HTMLFormElement>("#transactionForm");
const transactionModal = document.querySelector<HTMLDivElement>("#transactionModal");
const openFormButton = document.querySelector<HTMLButtonElement>("#openFormButton");
const cancelFormButton = document.querySelector<HTMLButtonElement>("#cancelFormButton");
const closeFormButton = document.querySelector<HTMLButtonElement>("#closeFormButton");
const descriptionInput = document.querySelector<HTMLInputElement>("#description");
const amountInput = document.querySelector<HTMLInputElement>("#amount");
const typeInput = document.querySelector<HTMLSelectElement>("#type");
const isRecurringInput = document.querySelector<HTMLInputElement>("#isRecurring");
const categoryInput = document.querySelector<HTMLSelectElement>("#category");
const dateInput = document.querySelector<HTMLInputElement>("#date");
const formFeedback = document.querySelector<HTMLParagraphElement>("#formFeedback");

const searchTextEl = document.querySelector<HTMLInputElement>("#searchText");
const sortByEl = document.querySelector<HTMLSelectElement>("#sortBy");
const filterCategoryEl = document.querySelector<HTMLSelectElement>("#filterCategory");

const transactionBody = document.querySelector<HTMLTableSectionElement>("#transactionBody");
const emptyStateTemplate = document.querySelector<HTMLTemplateElement>("#emptyStateTemplate");

const prevPageButton = document.querySelector<HTMLButtonElement>("#prevPageButton");
const nextPageButton = document.querySelector<HTMLButtonElement>("#nextPageButton");
const pageInfo = document.querySelector<HTMLParagraphElement>("#pageInfo");

if (
  !transactionForm ||
  !transactionModal ||
  !openFormButton ||
  !cancelFormButton ||
  !closeFormButton ||
  !descriptionInput ||
  !amountInput ||
  !typeInput ||
  !isRecurringInput ||
  !categoryInput ||
  !dateInput ||
  !formFeedback ||
  !searchTextEl ||
  !sortByEl ||
  !filterCategoryEl ||
  !transactionBody ||
  !emptyStateTemplate ||
  !prevPageButton ||
  !nextPageButton ||
  !pageInfo
) {
  throw new Error("Transactions page is missing required DOM elements.");
}

const dom = {
  transactionForm,
  transactionModal,
  openFormButton,
  cancelFormButton,
  closeFormButton,
  descriptionInput,
  amountInput,
  typeInput,
  isRecurringInput,
  categoryInput,
  dateInput,
  formFeedback,
  searchTextEl,
  sortByEl,
  filterCategoryEl,
  transactionBody,
  emptyStateTemplate,
  prevPageButton,
  nextPageButton,
  pageInfo,
} as const;

let transactions: Transaction[] = loadTransactions();
let currentPage = 1;

setDefaultDate();
render();

dom.openFormButton.addEventListener("click", () => {
  dom.transactionModal.classList.remove("hidden");
  dom.transactionModal.setAttribute("aria-hidden", "false");
  dom.descriptionInput.focus();
});

dom.cancelFormButton.addEventListener("click", () => {
  closeTransactionModal();
});

dom.closeFormButton.addEventListener("click", () => {
  closeTransactionModal();
});

dom.transactionModal.addEventListener("click", (event) => {
  if (event.target === dom.transactionModal) {
    closeTransactionModal();
  }
});

dom.transactionForm.addEventListener("submit", (event) => {
  event.preventDefault();
  dom.formFeedback.textContent = "";

  const description = dom.descriptionInput.value.trim();
  const amount = Number(dom.amountInput.value);
  const date = dom.dateInput.value;
  const typeValue = dom.typeInput.value;
  const recurring = dom.isRecurringInput.checked;
  const categoryValue = dom.categoryInput.value;

  if (!description) {
    dom.formFeedback.textContent = "Recipient / Sender is required.";
    return;
  }

  if (!Number.isFinite(amount) || amount <= 0) {
    dom.formFeedback.textContent = "Amount must be greater than 0.";
    return;
  }

  if (!isTransactionType(typeValue) || !isCategory(categoryValue)) {
    dom.formFeedback.textContent = "Select a valid type and category.";
    return;
  }

  if (!date) {
    dom.formFeedback.textContent = "Transaction date is required.";
    return;
  }

  const transaction: Transaction = {
    id: createId(),
    description,
    amount: normalizeCurrency(amount),
    type: typeValue,
    category: categoryValue,
    recurring,
    date,
    createdAt: Date.now(),
  };

  transactions = [transaction, ...transactions];
  saveTransactions(transactions);

  closeTransactionModal();
  currentPage = 1;
  render();
});

function closeTransactionModal(): void {
  dom.transactionModal.classList.add("hidden");
  dom.transactionModal.setAttribute("aria-hidden", "true");
  dom.formFeedback.textContent = "";
  dom.transactionForm.reset();
  setDefaultDate();
}

dom.searchTextEl.addEventListener("input", () => {
  currentPage = 1;
  render();
});

dom.sortByEl.addEventListener("change", () => {
  currentPage = 1;
  render();
});

dom.filterCategoryEl.addEventListener("change", () => {
  currentPage = 1;
  render();
});

dom.prevPageButton.addEventListener("click", () => {
  if (currentPage > 1) {
    currentPage -= 1;
    render();
  }
});

dom.nextPageButton.addEventListener("click", () => {
  const pages = getTotalPages(getVisibleTransactions().length);
  if (currentPage < pages) {
    currentPage += 1;
    render();
  }
});

function render(): void {
  renderTransactions();
  renderPagination();
}

function renderTransactions(): void {
  dom.transactionBody.innerHTML = "";

  const visible = getVisibleTransactions();
  const paged = getPageItems(visible, currentPage, ITEMS_PER_PAGE);

  if (paged.length === 0) {
    const clone = dom.emptyStateTemplate.content.cloneNode(true);
    dom.transactionBody.append(clone);
    return;
  }

  paged.forEach((item) => {
    const tr = document.createElement("tr");

    const amountClass = item.type === "income" ? "amount-income" : "amount-expense";
    const sign = item.type === "income" ? "+" : "-";

    tr.innerHTML = `
      <td>${escapeHtml(item.description)}</td>
      <td>${escapeHtml(toCategoryLabel(item.category))}</td>
      <td>${escapeHtml(formatDate(item.date))}</td>
      <td class="amount-col-cell">
        <span class="${amountClass}">${sign}${formatCurrency(item.amount)}</span>
      </td>
    `;

    dom.transactionBody.append(tr);
  });
}

function renderPagination(): void {
  const totalItems = getVisibleTransactions().length;
  const pages = getTotalPages(totalItems);

  if (currentPage > pages) {
    currentPage = pages;
  }

  dom.prevPageButton.disabled = currentPage <= 1;
  dom.nextPageButton.disabled = currentPage >= pages;
  dom.pageInfo.textContent = `Page ${currentPage} of ${pages}`;
}

function getVisibleTransactions(): Transaction[] {
  const query = dom.searchTextEl.value.trim().toLowerCase();
  const sortBy = isSortBy(dom.sortByEl.value) ? dom.sortByEl.value : "latest";
  const selectedCategory = dom.filterCategoryEl.value;

  const filtered = transactions.filter((item) => {
    const byQuery =
      query.length === 0 ||
      item.description.toLowerCase().includes(query) ||
      item.category.toLowerCase().includes(query);

    const byCategory = selectedCategory === "all" || item.category === selectedCategory;

    return byQuery && byCategory;
  });

  return filtered.sort((left, right) => {
    if (sortBy === "latest") {
      return right.date.localeCompare(left.date) || right.createdAt - left.createdAt;
    }

    if (sortBy === "oldest") {
      return left.date.localeCompare(right.date) || left.createdAt - right.createdAt;
    }

    if (sortBy === "highest") {
      return right.amount - left.amount;
    }

    return left.amount - right.amount;
  });
}

function getPageItems(items: Transaction[], page: number, pageSize: number): Transaction[] {
  const start = (page - 1) * pageSize;
  const end = start + pageSize;
  return items.slice(start, end);
}

function getTotalPages(totalItems: number): number {
  const pages = Math.ceil(totalItems / ITEMS_PER_PAGE);
  return pages > 0 ? pages : 1;
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

function saveTransactions(items: Transaction[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
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

function isSortBy(value: unknown): value is SortBy {
  return value === "latest" || value === "oldest" || value === "highest" || value === "lowest";
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

function setDefaultDate(): void {
  if (!dom.dateInput.value) {
    const today = new Date();
    const isoDate = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(
      today.getDate()
    ).padStart(2, "0")}`;
    dom.dateInput.value = isoDate;
  }
}

function createId(): string {
  const random = Math.random().toString(36).slice(2, 8);
  return `${Date.now()}-${random}`;
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

function formatDate(dateValue: string): string {
  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) {
    return dateValue;
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "2-digit",
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
