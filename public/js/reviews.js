document.addEventListener("DOMContentLoaded", () => {
  const reviewForm = document.getElementById("reviewForm");
  const reviewsContainer = document.getElementById("reviews-container");
  const reviewTemplate = document.getElementById("review-template");
  const noReviewsMsg = document.getElementById("no-reviews-msg");
  const submitBtn = document.getElementById("submit-btn");
  const reviewIdInput = document.getElementById("review-id");

  const LS_KEY = "powergit_reviews";

  loadReviews();

  reviewForm.addEventListener("submit", (e) => {
    e.preventDefault();

    const nameInput = document.getElementById("review-name");
    const textInput = document.getElementById("review-text");

    const name = nameInput.value.trim();
    const text = textInput.value.trim();
    const id = reviewIdInput.value;

    if (!validateReview(name, text)) return;

    const isEditing = !!id;

    const reviewData = {
      id: id || Date.now().toString(),
      name,
      text,
      date: new Date().toLocaleDateString("ru-RU"),
    };

    saveReview(reviewData);
    reviewForm.reset();
    resetFormMode();
    loadReviews();

    Toastify({
      text: isEditing ? "Отзыв успешно обновлён!" : "Отзыв опубликован!",
      duration: 3000,
      gravity: "bottom",
      position: "right",
      style: {
        background: "var(--primary)",
        borderLeft: "4px solid var(--accent)",
        fontFamily: "'Science Gothic', Arial, sans-serif",
        fontSize: "15px",
      },
    }).showToast();
  });

  function validateReview(name, text) {
    if (name.length === 0 || text.length === 0) {
      Toastify({
        text: " Заполните все поля формы.",
        duration: 4000,
        gravity: "bottom",
        position: "right",
        style: {
          background: "var(--secondary)",
          borderLeft: "4px solid #c0392b",
          fontFamily: "'Science Gothic', Arial, sans-serif",
          fontSize: "15px",
        },
      }).showToast();
      return false;
    }
    if (name.length < 2) {
      Toastify({
        text: " Имя слишком короткое! Минимум 2 символа.",
        duration: 4000,
        gravity: "bottom",
        position: "right",
        style: {
          background: "var(--secondary)",
          borderLeft: "4px solid #c0392b",
          fontFamily: "'Science Gothic', Arial, sans-serif",
          fontSize: "15px",
        },
      }).showToast();
      return false;
    }
    if (text.length > 20) {
      Toastify({
        text: " Спам запрещён!",
        duration: 4000,
        gravity: "bottom",
        position: "right",
        style: {
          background: "var(--secondary)",
          borderLeft: "4px solid #c0392b",
          fontFamily: "'Science Gothic', Arial, sans-serif",
          fontSize: "15px",
        },
      }).showToast();
      return false;
    }
    return true;
  }

  function saveReview(newReview) {
    const reviews = getReviewsFromLS();
    const existingIndex = reviews.findIndex((r) => r.id === newReview.id);
    if (existingIndex >= 0) {
      reviews[existingIndex] = newReview;
    } else {
      reviews.push(newReview);
    }
    localStorage.setItem(LS_KEY, JSON.stringify(reviews));
  }

  function getReviewsFromLS() {
    const reviewsJSON = localStorage.getItem(LS_KEY);
    return reviewsJSON ? JSON.parse(reviewsJSON) : [];
  }

  function loadReviews() {
    reviewsContainer.innerHTML = "";
    const reviews = getReviewsFromLS();

    if (reviews.length === 0) {
      noReviewsMsg.style.display = "block";
    } else {
      noReviewsMsg.style.display = "none";
      reviews.forEach((review) => {
        const clone = reviewTemplate.content.cloneNode(true);
        clone.querySelector(".review-author").textContent = review.name;
        clone.querySelector(".review-content").textContent = review.text;
        clone.querySelector(".review-date").textContent = review.date;

        const deleteBtn = clone.querySelector(".delete-btn");
        deleteBtn.addEventListener("click", () =>
          deleteReview(review.id, review.name),
        );

        const editBtn = clone.querySelector(".edit-btn");
        editBtn.addEventListener("click", () => editReview(review));

        reviewsContainer.appendChild(clone);
      });
    }
  }

  function deleteReview(id, authorName) {
    if (!confirm(`Удалить отзыв от «${authorName}»?`)) return;

    let reviews = getReviewsFromLS();
    reviews = reviews.filter((r) => r.id !== id);
    localStorage.setItem(LS_KEY, JSON.stringify(reviews));
    loadReviews();

    Toastify({
      text: " Отзыв удалён.",
      duration: 2500,
      gravity: "bottom",
      position: "right",
      style: {
        background: "var(--primary)",
        borderLeft: "4px solid var(--secondary)",
        fontFamily: "'Science Gothic', Arial, sans-serif",
        fontSize: "15px",
      },
    }).showToast();
  }

  function editReview(review) {
    document.getElementById("review-name").value = review.name;
    document.getElementById("review-text").value = review.text;
    document.getElementById("review-id").value = review.id;

    submitBtn.textContent = "Сохранить изменения";
    reviewForm.scrollIntoView({ behavior: "smooth" });

    Toastify({
      text: ` Редактирование отзыва от «${review.name}»`,
      duration: 3500,
      gravity: "bottom",
      position: "center",
      style: {
        background: "var(--accent)",
        color: "var(--dark)",
        fontFamily: "'Science Gothic', Arial, sans-serif",
        fontSize: "15px",
        fontWeight: "bold",
      },
    }).showToast();
  }

  function resetFormMode() {
    reviewIdInput.value = "";
    submitBtn.textContent = "Опубликовать отзыв";
  }
});
