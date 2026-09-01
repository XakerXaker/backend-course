(function () {
  const toastZone = document.getElementById("trainer-toast-zone");

  if (!toastZone || typeof EventSource === "undefined") {
    return;
  }

  const authParam = new URLSearchParams(window.location.search).get("auth") || "";

  function showToast(action, trainerName) {
    const toast = document.createElement("div");
    toast.className = "trainer-toast";

    const actionMap = {
      created: "добавлен",
      updated: "обновлён",
      deleted: "удалён",
    };

    const actionText = actionMap[action] || "изменён";
    toast.textContent = `Тренер ${trainerName} ${actionText}`;

    toastZone.prepend(toast);

    window.setTimeout(function () {
      toast.remove();
    }, 4500);
  }

  // Гарантирует наличие контейнера .trainer-grid: если список был пуст,
  // на странице сейчас вместо него лежит #no-trainers-message.
  function ensureGrid() {
    let grid = document.getElementById("trainer-grid");
    if (grid) {
      return grid;
    }

    const emptyMessage = document.getElementById("no-trainers-message");
    grid = document.createElement("div");
    grid.className = "trainer-grid";
    grid.id = "trainer-grid";

    if (emptyMessage) {
      emptyMessage.replaceWith(grid);
    } else {
      document.getElementById("trainers")?.insertBefore(
        grid,
        document.querySelector(".section-footer-actions"),
      );
    }

    return grid;
  }

  // Обратная операция: если после удаления карточек не осталось, возвращаем
  // плейсхолдер "Пока нет тренеров...".
  function showEmptyMessageIfNeeded() {
    const grid = document.getElementById("trainer-grid");
    if (!grid || grid.children.length > 0) {
      return;
    }

    const emptyMessage = document.createElement("p");
    emptyMessage.id = "no-trainers-message";
    emptyMessage.textContent = "Пока нет тренеров. Добавьте первого через форму.";
    grid.replaceWith(emptyMessage);
  }

  function buildCard(trainer) {
    const article = document.createElement("article");
    article.className = "trainer-card";
    article.dataset.trainerId = trainer.id;

    const h3 = document.createElement("h3");
    h3.textContent = trainer.name;

    const experienceP = document.createElement("p");
    experienceP.innerHTML = "<strong>Стаж:</strong> ";
    experienceP.append(`${trainer.experience} лет`);

    const specializationP = document.createElement("p");
    specializationP.innerHTML = "<strong>Специализация:</strong> ";
    specializationP.append(trainer.specialization);

    const bioP = document.createElement("p");
    bioP.textContent = trainer.bio || "";

    const actions = document.createElement("div");
    actions.className = "trainer-card-actions";

    const openLink = document.createElement("a");
    openLink.href = `/trainers/${trainer.id}?auth=${authParam}`;
    openLink.textContent = "Открыть";

    const editLink = document.createElement("a");
    editLink.href = `/trainers/${trainer.id}/edit?auth=${authParam}`;
    editLink.textContent = "Изменить";

    const deleteForm = document.createElement("form");
    deleteForm.method = "post";
    deleteForm.action = `/trainers/${trainer.id}/delete?auth=${authParam}`;
    const deleteBtn = document.createElement("button");
    deleteBtn.type = "submit";
    deleteBtn.className = "delete-btn";
    deleteBtn.textContent = "Удалить";
    deleteForm.append(deleteBtn);

    actions.append(openLink, editLink, deleteForm);
    article.append(h3, experienceP, specializationP, bioP, actions);

    return article;
  }

  async function upsertCard(trainerId) {
    let trainer;
    try {
      const response = await fetch(`/api/trainers/${trainerId}`);
      if (!response.ok) return;
      trainer = await response.json();
    } catch {
      return; // Сеть подвела — карточка просто не обновится без перезагрузки.
    }

    const grid = ensureGrid();
    const newCard = buildCard(trainer);
    const existing = grid.querySelector(`[data-trainer-id="${trainerId}"]`);

    if (existing) {
      existing.replaceWith(newCard);
    } else {
      grid.prepend(newCard);
    }
  }

  function removeCard(trainerId) {
    const card = document.querySelector(`[data-trainer-id="${trainerId}"]`);
    card?.remove();
    showEmptyMessageIfNeeded();
  }

  const eventSource = new EventSource("/trainers/events");

  eventSource.onmessage = function (event) {
    try {
      const payload = JSON.parse(event.data);
      showToast(payload.action, payload.trainerName);

      if (payload.action === "deleted") {
        removeCard(payload.trainerId);
      } else {
        upsertCard(payload.trainerId);
      }
    } catch {
      // Ignored: malformed event payload should not break the page.
    }
  };

  eventSource.onerror = function () {
    // Browser will retry automatically. We keep UI calm and do not spam errors.
  };
})();
