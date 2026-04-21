type BillStatus = "upcoming" | "paid" | "due-soon";
type Category = "bills" | "food" | "transport" | "shopping" | "health" | "other";
type SortBy = "latest" | "oldest" | "highest" | "lowest";

interface RecurringBill {
  id: string;
  title: string;
  amount: number;
  dueDate: string;
  category: Category;
  status: BillStatus;
  createdAt: number;
}

interface RecurringSummary {
  total: number;
  paid: number;
  upcoming: number;
  dueSoon: number;
}

const STORAGE_KEY = "personal-finance-app.recurring-bills";
const ITEMS_PER_PAGE = 8;

const openBillFormButton = document.querySelector<HTMLButtonElement>("#openBillFormButton");
const cancelBillFormButton = document.querySelector<HTMLButtonElement>("#cancelBillFormButton");
const billForm = document.querySelector<HTMLFormElement>("#billForm");
const billTitleInput = document.querySelector<HTMLInputElement>("#billTitle");
const billAmountInput = document.querySelector<HTMLInputElement>("#billAmount");
const billDueDateInput = document.querySelector<HTMLInputElement>("#billDueDate");
const billCategoryInput = document.querySelector<HTMLSelectElement>("#billCategory");
const billStatusInput = document.querySelector<HTMLSelectElement>("#billStatus");
const billFeedback = document.querySelector<HTMLParagraphElement>("#billFeedback");
const billSearchText = document.querySelector<HTMLInputElement>("#billSearchText");
const billSortBy = document.querySelector<HTMLSelectElement>("#billSortBy");
const billBody = document.querySelector<HTMLTableSectionElement>("#billBody");
const billEmptyStateTemplate = document.querySelector<HTMLTemplateElement>("#billEmptyStateTemplate");
const prevBillPageButton = document.querySelector<HTMLButtonElement>("#prevBillPageButton");
const nextBillPageButton = document.querySelector<HTMLButtonElement>("#nextBillPageButton");
const billPageInfo = document.querySelector<HTMLParagraphElement>("#billPageInfo");
const totalBillsAmount = document.querySelector<HTMLElement>("#totalBillsAmount");
const paidBillsAmount = document.querySelector<HTMLElement>("#paidBillsAmount");
const upcomingBillsAmount = document.querySelector<HTMLElement>("#upcomingBillsAmount");
const dueSoonBillsAmount = document.querySelector<HTMLElement>("#dueSoonBillsAmount");

if (
  !openBillFormButton ||
  !cancelBillFormButton ||
  !billForm ||
  !billTitleInput ||
  !billAmountInput ||
  !billDueDateInput ||
  !billCategoryInput ||
  !billStatusInput ||
  !billFeedback ||
  !billSearchText ||
  !billSortBy ||
  !billBody ||
  !billEmptyStateTemplate ||
  !prevBillPageButton ||
  !nextBillPageButton ||
  !billPageInfo ||
  !totalBillsAmount ||
  !paidBillsAmount ||
  !upcomingBillsAmount ||
  !dueSoonBillsAmount
) {
  throw new Error("Recurring bills page is missing required DOM elements.");
}

const dom = {
  openBillFormButton,
  cancelBillFormButton,
  billForm,
  billTitleInput,
  billAmountInput,
  billDueDateInput,
  billCategoryInput,
  billStatusInput,
  billFeedback,
  billSearchText,
  billSortBy,
  billBody,
  billEmptyStateTemplate,
  prevBillPageButton,
  nextBillPageButton,
  billPageInfo,
  totalBillsAmount,
  paidBillsAmount,
  upcomingBillsAmount,
  dueSoonBillsAmount,
} as const;

let bills: RecurringBill[] = loadBills();
let currentPage = 1;

setDefaultDueDate();
render();

dom.openBillFormButton.addEventListener("click", () => {
  dom.billForm.classList.remove("hidden");
  dom.billTitleInput.focus();
});

dom.cancelBillFormButton.addEventListener("click", () => {
  dom.billForm.classList.add("hidden");
  dom.billFeedback.textContent = "";
  dom.billForm.reset();
  setDefaultDueDate();
});

dom.billForm.addEventListener("submit", (event) => {
  event.preventDefault();
  dom.billFeedback.textContent = "";

  const title = dom.billTitleInput.value.trim();
  const amount = Number(dom.billAmountInput.value);
  const dueDate = dom.billDueDateInput.value;
  const categoryValue = dom.billCategoryInput.value;
  const statusValue = dom.billStatusInput.value;

  if (!title) {
    dom.billFeedback.textContent = "Bill title is required.";
    return;
  }

  if (!Number.isFinite(amount) || amount <= 0) {
    dom.billFeedback.textContent = "Amount must be greater than 0.";
    return;
  }

  if (!dueDate) {
    dom.billFeedback.textContent = "Due date is required.";
    return;
  }

  if (!isCategory(categoryValue) || !isBillStatus(statusValue)) {
    dom.billFeedback.textContent = "Choose a valid category and status.";
    return;
  }

  const bill: RecurringBill = {
    id: createId(),
    title,
    amount: normalizeCurrency(amount),
    dueDate,
    category: categoryValue,
    status: statusValue,
    createdAt: Date.now(),
  };

  bills = [bill, ...bills];
  saveBills(bills);
  dom.billForm.reset();
  dom.billForm.classList.add("hidden");
  setDefaultDueDate();
  currentPage = 1;
  render();
});

dom.billSearchText.addEventListener("input", () => {
  currentPage = 1;
  render();
});

dom.billSortBy.addEventListener("change", () => {
  currentPage = 1;
  render();
});

dom.prevBillPageButton.addEventListener("click", () => {
  if (currentPage > 1) {
    currentPage -= 1;
    render();
  }
});

dom.nextBillPageButton.addEventListener("click", () => {
  const pages = getTotalPages(getVisibleBills().length);
  if (currentPage < pages) {
    currentPage += 1;
    render();
  }
});

dom.billBody.addEventListener("click", (event) => {
  const target = event.target;
  if (!(target instanceof HTMLButtonElement)) {
    return;
  }

  const action = target.dataset.action;
  const billId = target.dataset.id;
  if (!action || !billId) {
    return;
  }

  const bill = bills.find((item) => item.id === billId);
  if (!bill) {
    return;
  }

  if (action === "delete") {
    bills = bills.filter((item) => item.id !== billId);
  } else if (action === "toggle-paid") {
    bill.status = bill.status === "paid" ? "upcoming" : "paid";
  } else if (action === "toggle-soon") {
    bill.status = bill.status === "due-soon" ? "upcoming" : "due-soon";
  }

  saveBills(bills);
  render();
});

function render(): void {
  renderSummary();
  renderBills();
  renderPagination();
}

function renderSummary(): void {
  const summary = calculateSummary(bills);
  dom.totalBillsAmount.textContent = formatCurrency(summary.total);
  dom.paidBillsAmount.textContent = formatCurrency(summary.paid);
  dom.upcomingBillsAmount.textContent = formatCurrency(summary.upcoming);
  dom.dueSoonBillsAmount.textContent = formatCurrency(summary.dueSoon);
}

function renderBills(): void {
  dom.billBody.innerHTML = "";
  const visible = getVisibleBills();
  const pageItems = getPageItems(visible, currentPage, ITEMS_PER_PAGE);

  if (pageItems.length === 0) {
    const clone = dom.billEmptyStateTemplate.content.cloneNode(true);
    dom.billBody.append(clone);
    return;
  }

  pageItems.forEach((bill) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${escapeHtml(bill.title)}</td>
      <td>${escapeHtml(formatDate(bill.dueDate))}</td>
      <td class="amount-col-cell">${formatCurrency(bill.amount)}</td>
      <td>
        <span class="bill-status bill-status-${bill.status}">${escapeHtml(formatStatusLabel(bill.status))}</span>
        <div class="bill-row-actions">
          <button class="bill-action-btn" data-action="toggle-paid" data-id="${bill.id}" type="button">Paid</button>
          <button class="bill-action-btn bill-action-btn-alt" data-action="toggle-soon" data-id="${bill.id}" type="button">Soon</button>
          <button class="bill-delete-btn" data-action="delete" data-id="${bill.id}" type="button">Delete</button>
        </div>
      </td>
    `;
    dom.billBody.append(tr);
  });
}

function renderPagination(): void {
  const totalItems = getVisibleBills().length;
  const pages = getTotalPages(totalItems);
  if (currentPage > pages) {
    currentPage = pages;
  }

  dom.prevBillPageButton.disabled = currentPage <= 1;
  dom.nextBillPageButton.disabled = currentPage >= pages;
  dom.billPageInfo.textContent = `Page ${currentPage} of ${pages}`;
}

function getVisibleBills(): RecurringBill[] {
  const query = dom.billSearchText.value.trim().toLowerCase();
  const sortBy = isSortBy(dom.billSortBy.value) ? dom.billSortBy.value : "latest";

  const filtered = bills.filter((bill) => {
    if (query.length === 0) {
      return true;
    }

    return bill.title.toLowerCase().includes(query) || bill.category.toLowerCase().includes(query);
  });

  return filtered.sort((left, right) => {
    if (sortBy === "latest") {
      return right.dueDate.localeCompare(left.dueDate) || right.createdAt - left.createdAt;
    }

    if (sortBy === "oldest") {
      return left.dueDate.localeCompare(right.dueDate) || left.createdAt - right.createdAt;
    }

    if (sortBy === "highest") {
      return right.amount - left.amount;
    }

    return left.amount - right.amount;
  });
}

function calculateSummary(items: RecurringBill[]): RecurringSummary {
  return items.reduce<RecurringSummary>(
    (summary, item) => {
      summary.total += item.amount;

      if (item.status === "paid") {
        summary.paid += item.amount;
      } else if (item.status === "due-soon") {
        summary.dueSoon += item.amount;
      } else {
        summary.upcoming += item.amount;
      }

      return summary;
    },
    { total: 0, paid: 0, upcoming: 0, dueSoon: 0 }
  );
}

function getPageItems(items: RecurringBill[], page: number, pageSize: number): RecurringBill[] {
  const start = (page - 1) * pageSize;
  return items.slice(start, start + pageSize);
}

function getTotalPages(totalItems: number): number {
  const pages = Math.ceil(totalItems / ITEMS_PER_PAGE);
  return pages > 0 ? pages : 1;
}

function loadBills(): RecurringBill[] {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    return [];
  }

  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed.filter(isRecurringBill);
  } catch {
    return [];
  }
}

function saveBills(items: RecurringBill[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
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
    isBillStatus(item.status)
  );
}

function isCategory(value: unknown): value is Category {
  return value === "bills" || value === "food" || value === "transport" || value === "shopping" || value === "health" || value === "other";
}

function isBillStatus(value: unknown): value is BillStatus {
  return value === "upcoming" || value === "paid" || value === "due-soon";
}

function isSortBy(value: unknown): value is SortBy {
  return value === "latest" || value === "oldest" || value === "highest" || value === "lowest";
}

function setDefaultDueDate(): void {
  if (!dom.billDueDateInput.value) {
    const today = new Date();
    const isoDate = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(
      today.getDate()
    ).padStart(2, "0")}`;
    dom.billDueDateInput.value = isoDate;
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

function formatStatusLabel(value: BillStatus): string {
  if (value === "due-soon") {
    return "Due Soon";
  }

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
