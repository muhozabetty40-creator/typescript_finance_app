export function setupSidebar(): void {
  const sidebar = document.querySelector<HTMLElement>(".sidebar");
  const minimizeButton = document.querySelector<HTMLButtonElement>(".sidebar-minimize");

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