document.addEventListener("DOMContentLoaded", () => {
  const container = document.getElementById("external-reviews-container");
  const template = document.getElementById("external-review-template");
  const preloader = document.getElementById("preloader");
  const errorMsg = document.getElementById("fetch-error-msg");
  const loadBtn = document.getElementById("load-external-btn");

  const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

  function fetchRandomReviews() {
    container.innerHTML = "";
    errorMsg.style.display = "none";
    preloader.style.display = "block";

    const randomPostId = Math.floor(Math.random() * 100) + 1;
    const url = `https://jsonplaceholder.typicode.com/comments?postId=${randomPostId}&_limit=3`;

    delay(800) // Чуть увеличил задержку, чтобы насладиться спиннером
      .then(() => fetch(url))
      .then(async (response) => {
        if (!response.ok) {
          const errorText = await response.text().catch(() => "Нет описания");
          if (response.status === 404)
            throw new Error("Ресурс не найден (404).");
          if (response.status >= 500)
            throw new Error("Сервер недоступен (500).");
          throw new Error(`Ошибка ${response.status}: ${errorText}`);
        }
        return response.json();
      })
      .then((data) => {
        if (!Array.isArray(data) || data.length === 0) {
          throw new Error("Сервер вернул пустой список данных.");
        }
        renderReviews(data);
      })
      .catch((error) => {
        console.error("Ошибка Fetch:", error);
        let message = error.message;
        // Если ошибка сетевая (например, нет VPN), браузер кидает TypeError с общим текстом
        if (error.name === "TypeError") {
          message =
            "Сетевая ошибка. Проверьте подключение к интернету или VPN.";
        }
        errorMsg.innerHTML = `<strong> Не удалось загрузить отзывы:</strong> ${message}`;
        errorMsg.style.display = "block";
      })
      .finally(() => {
        preloader.style.display = "none";
      });
  }

  function renderReviews(reviews) {
    reviews.forEach((review) => {
      const clone = template.content.cloneNode(true);
      clone.querySelector(".review-author").textContent =
        review.email.toLowerCase();

      const currentDate = new Date().toLocaleDateString("ru-RU");

      clone.querySelector(".review-date").textContent = currentDate;

      clone.querySelector(".review-content").textContent = review.body;

      container.appendChild(clone);
    });
  }

  loadBtn.addEventListener("click", fetchRandomReviews);
  fetchRandomReviews();
});
