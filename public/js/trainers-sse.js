(function () {
  const toastZone = document.getElementById("trainer-toast-zone");

  if (!toastZone || typeof EventSource === "undefined") {
    return;
  }

  const eventSource = new EventSource("/trainers/events");

  eventSource.onmessage = function (event) {
    try {
      const payload = JSON.parse(event.data);
      const toast = document.createElement("div");
      toast.className = "trainer-toast";

      const actionMap = {
        created: "добавлен",
        updated: "обновлён",
        deleted: "удалён",
      };

      const actionText = actionMap[payload.action] || "изменён";
      toast.textContent = `Тренер ${payload.trainerName} ${actionText}`;

      toastZone.prepend(toast);

      window.setTimeout(function () {
        toast.remove();
      }, 4500);
    } catch {
      // Ignored: malformed event payload should not break the page.
    }
  };

  eventSource.onerror = function () {
    // Browser will retry automatically. We keep UI calm and do not spam errors.
  };
})();
