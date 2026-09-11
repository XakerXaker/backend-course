// Вход/регистрация/выход отправляются не на наш сервер, а напрямую на
// маршруты, которые генерирует сам SuperTokens SDK (POST /auth/signin,
// /auth/signup, /auth/signout — см. src/auth/config/supertokens.config.ts,
// AuthModule). Наши страницы (views/auth/login.hbs, register.hbs) содержат
// только разметку формы; вся логика отправки и редиректа — здесь.
document.addEventListener("DOMContentLoaded", () => {
  const FIELD_ERRORS = {
    email: "Некорректный email",
    password: "Пароль должен быть не короче 8 символов",
  };

  function readFormFields(form, ids) {
    return ids
      .map((id) => ({ id, value: form.elements.namedItem(id)?.value ?? "" }))
      .filter((field) => field.value !== "" || field.id === "email" || field.id === "password");
  }

  async function submitAuthForm(url, formFields) {
    const response = await fetch(url, {
      method: "POST",
      credentials: "same-origin",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ formFields }),
    });

    return response.json();
  }

  function describeError(result) {
    if (result.status === "WRONG_CREDENTIALS_ERROR") {
      return "Неверный email или пароль";
    }

    if (result.status === "EMAIL_ALREADY_EXISTS_ERROR") {
      return "Пользователь с таким email уже зарегистрирован";
    }

    if (result.status === "FIELD_ERROR" && Array.isArray(result.formFields)) {
      const first = result.formFields[0];
      return first?.error ?? FIELD_ERRORS[first?.id] ?? "Проверьте правильность заполнения формы";
    }

    if (result.status === "SIGN_IN_NOT_ALLOWED" || result.status === "SIGN_UP_NOT_ALLOWED") {
      return result.reason ?? "Действие временно недоступно";
    }

    return "Не удалось выполнить операцию, попробуйте ещё раз";
  }

  function showError(errorBox, message) {
    errorBox.textContent = message;
    errorBox.hidden = false;
  }

  const loginForm = document.getElementById("login-form");

  if (loginForm) {
    const errorBox = document.getElementById("login-error");

    loginForm.addEventListener("submit", async (event) => {
      event.preventDefault();
      errorBox.hidden = true;

      try {
        const result = await submitAuthForm(
          "/auth/signin",
          readFormFields(loginForm, ["email", "password"]),
        );

        if (result.status === "OK") {
          const redirectTo = new URLSearchParams(window.location.search).get("redirect");
          window.location.href = redirectTo || "/";
          return;
        }

        showError(errorBox, describeError(result));
      } catch {
        showError(errorBox, "Сервис аутентификации недоступен, попробуйте позже");
      }
    });
  }

  const registerForm = document.getElementById("register-form");

  if (registerForm) {
    const errorBox = document.getElementById("register-error");

    registerForm.addEventListener("submit", async (event) => {
      event.preventDefault();
      errorBox.hidden = true;

      try {
        const result = await submitAuthForm(
          "/auth/signup",
          readFormFields(registerForm, ["email", "password", "name", "phone"]),
        );

        if (result.status === "OK") {
          window.location.href = "/";
          return;
        }

        showError(errorBox, describeError(result));
      } catch {
        showError(errorBox, "Сервис аутентификации недоступен, попробуйте позже");
      }
    });
  }

  const logoutButton = document.getElementById("logout-btn");

  if (logoutButton) {
    logoutButton.addEventListener("click", async () => {
      try {
        await fetch("/auth/signout", { method: "POST", credentials: "same-origin" });
      } finally {
        window.location.href = "/";
      }
    });
  }
});
