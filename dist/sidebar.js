export function setupSidebar() {
    const sidebar = document.querySelector(".sidebar");
    const minimizeButton = document.querySelector(".sidebar-minimize");
    if (!sidebar || !minimizeButton) {
        return;
    }
    if (!minimizeButton.dataset.iconReady) {
        minimizeButton.dataset.iconReady = "true";
        minimizeButton.textContent = `☰ ${minimizeButton.textContent?.trim() ?? "Menu"}`;
        minimizeButton.setAttribute("aria-label", "Toggle sidebar menu");
    }
    minimizeButton.addEventListener("click", () => {
        document.body.classList.toggle("sidebar-collapsed");
    });
}
//# sourceMappingURL=sidebar.js.map