const STORAGE_KEY = "personal-finance-app.transactions";
const BUDGET_STORAGE_KEY = "personal-finance-app.budgets";
const POT_STORAGE_KEY = "personal-finance-app.pots";
const BILL_STORAGE_KEY = "personal-finance-app.recurring-bills";
const balanceEl = document.querySelector("#overviewBalance");
const incomeEl = document.querySelector("#overviewIncome");
const expenseEl = document.querySelector("#overviewExpense");
const potsTotalEl = document.querySelector("#potsTotal");
const budgetsEmptyStateEl = document.querySelector("#budgetsEmptyState");
const budgetsPreviewEl = document.querySelector("#budgetsPreview");
const overviewCountLabelEl = document.querySelector("#overviewCountLabel");
const paidBillsEl = document.querySelector("#paidBillsAmount");
const upcomingBillsEl = document.querySelector("#upcomingBillsAmount");
const dueSoonBillsEl = document.querySelector("#dueSoonBillsAmount");
const logoutButton = document.querySelector("#logoutButton");
const recentListEl = document.querySelector("#recentTransactionList");
if (!balanceEl ||
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
    !recentListEl) {
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
};
const transactions = loadTransactions();
const budgets = loadBudgets();
const pots = loadPots();
const bills = loadBills();
renderOverview();
dom.logoutButton.addEventListener("click", () => {
    localStorage.removeItem("personal-finance-app.auth-session");
    window.location.href = "./auth.html";
});
function renderOverview() {
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
function renderRecentTransactions(items) {
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
function renderBudgetsPreview(items, transactionItems) {
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
function renderRecurringSummary(items) {
    const summary = items.reduce((accumulator, item) => {
        if (item.status === "paid") {
            accumulator.paid += item.amount;
        }
        else if (item.status === "due-soon") {
            accumulator.dueSoon += item.amount;
        }
        else {
            accumulator.upcoming += item.amount;
        }
        return accumulator;
    }, { paid: 0, upcoming: 0, dueSoon: 0 });
    dom.paidBillsEl.textContent = formatCurrency(summary.paid);
    dom.upcomingBillsEl.textContent = formatCurrency(summary.upcoming);
    dom.dueSoonBillsEl.textContent = formatCurrency(summary.dueSoon);
}
function createEmptyItem(message) {
    const li = document.createElement("li");
    li.className = "empty-state list-empty";
    li.textContent = message;
    return li;
}
function calculateSummary(items) {
    return items.reduce((totals, item) => {
        if (item.type === "income") {
            totals.income += item.amount;
        }
        else {
            totals.expense += item.amount;
        }
        totals.balance = totals.income - totals.expense;
        return totals;
    }, { income: 0, expense: 0, balance: 0 });
}
function loadTransactions() {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
        return [];
    }
    try {
        const parsed = JSON.parse(raw);
        if (!Array.isArray(parsed)) {
            return [];
        }
        return parsed.filter(isTransaction);
    }
    catch {
        return [];
    }
}
function loadBudgets() {
    return loadTypedRecords(BUDGET_STORAGE_KEY, isBudget);
}
function loadPots() {
    return loadTypedRecords(POT_STORAGE_KEY, isPot);
}
function loadBills() {
    return loadTypedRecords(BILL_STORAGE_KEY, isRecurringBill);
}
function loadTypedRecords(storageKey, predicate) {
    const raw = localStorage.getItem(storageKey);
    if (!raw) {
        return [];
    }
    try {
        const parsed = JSON.parse(raw);
        if (!Array.isArray(parsed)) {
            return [];
        }
        return parsed.filter(predicate);
    }
    catch {
        return [];
    }
}
function isTransaction(value) {
    if (typeof value !== "object" || value === null) {
        return false;
    }
    const item = value;
    return (typeof item.id === "string" &&
        typeof item.description === "string" &&
        typeof item.amount === "number" &&
        Number.isFinite(item.amount) &&
        typeof item.date === "string" &&
        typeof item.createdAt === "number" &&
        isTransactionType(item.type) &&
        isCategory(item.category));
}
function isTransactionType(value) {
    return value === "income" || value === "expense";
}
function isCategory(value) {
    return (value === "salary" ||
        value === "freelance" ||
        value === "food" ||
        value === "transport" ||
        value === "bills" ||
        value === "shopping" ||
        value === "health" ||
        value === "other");
}
function isBudget(value) {
    if (typeof value !== "object" || value === null) {
        return false;
    }
    const item = value;
    return (typeof item.id === "string" &&
        typeof item.limit === "number" &&
        Number.isFinite(item.limit) &&
        typeof item.month === "string" &&
        typeof item.createdAt === "number" &&
        isCategory(item.category));
}
function isPot(value) {
    if (typeof value !== "object" || value === null) {
        return false;
    }
    const item = value;
    return (typeof item.id === "string" &&
        typeof item.name === "string" &&
        typeof item.target === "number" &&
        Number.isFinite(item.target) &&
        typeof item.saved === "number" &&
        Number.isFinite(item.saved) &&
        typeof item.createdAt === "number");
}
function isRecurringBill(value) {
    if (typeof value !== "object" || value === null) {
        return false;
    }
    const item = value;
    return (typeof item.id === "string" &&
        typeof item.title === "string" &&
        typeof item.amount === "number" &&
        Number.isFinite(item.amount) &&
        typeof item.dueDate === "string" &&
        typeof item.createdAt === "number" &&
        isCategory(item.category) &&
        (item.status === "upcoming" || item.status === "paid" || item.status === "due-soon"));
}
function calculatePotTotal(items) {
    return items.reduce((total, item) => total + item.saved, 0);
}
function toCategoryLabel(value) {
    return value.charAt(0).toUpperCase() + value.slice(1);
}
function formatCurrency(amount) {
    return new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
        minimumFractionDigits: 2,
    }).format(amount);
}
function formatDate(dateValue) {
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
function escapeHtml(input) {
    return input
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/\"/g, "&quot;")
        .replace(/'/g, "&#039;");
}
export {};
//# sourceMappingURL=overview.js.map