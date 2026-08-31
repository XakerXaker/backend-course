(function () {
  const startTime = performance.now();

  document.addEventListener("DOMContentLoaded", function () {
    const loadTime = Math.round(performance.now() - startTime);

    const footer = document.querySelector("footer");
    if (footer) {
      const loadInfo = document.createElement("p");
      loadInfo.textContent = `Время загрузки страницы: ${loadTime} мс`;
      loadInfo.style.fontSize = "12px";
      loadInfo.style.marginTop = "10px";
      loadInfo.style.opacity = "0.8";
      footer.insertBefore(loadInfo, footer.firstChild);
    }

    highlightActiveMenuItem();
  });

  function highlightActiveMenuItem() {
    const currentPath = window.location.pathname;
    const navLinks = document.querySelectorAll(".nav-list a");

    navLinks.forEach((link) => {
      const linkPath = new URL(link.href).pathname;

      if (linkPath === currentPath) {
        link.classList.add("active");
      }

      if (currentPath.endsWith("index.html") || currentPath.endsWith("/")) {
        if (
          link.getAttribute("href") === "#about" ||
          linkPath.endsWith("index.html")
        ) {
          link.classList.add("active");
        }
      }
    });
  }
})();
