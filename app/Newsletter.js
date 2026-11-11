  "use client";
  import { useState } from "react";

  export default function Newsletter() {
    const [status, setStatus] = useState("idle");

    async function onSubmit(e) {
      e.preventDefault();
      setStatus("sending");
      const data = new FormData(e.currentTarget);
      try {
        const res = await fetch("/api/subscribe", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: data.get("email"),
            name: data.get("name"),
            consent: data.get("consent") === "on",
          }),
        });
        setStatus(res.ok ? "done" : "error");
      } catch {
        setStatus("error");
      }
    }

    if (status === "done") {
      return <p>Спасибо! Проверь почту и подтверди подписку.</p>;
    }

    return (
      <form onSubmit={onSubmit}>
        <h3>Письма о методе и новых статьях</h3>
        <p>
          <label>
            Имя (необязательно){" "}
            <input type="text" name="name" autoComplete="given-name" />
          </label>
        </p>
        <p>
          <label>
            Email{" "}
            <input type="email" name="email" required autoComplete="email" />
          </label>
        </p>
        <p>
          <label>
            <input type="checkbox" name="consent" required /> Хочу получать
            письма о методе и новых статьях. Отписаться можно в любой момент.{" "}
            <a href="/privacy">Конфиденциальность</a>
          </label>
        </p>
        <button type="submit" disabled={status === "sending"}>
          Подписаться
        </button>
        {status === "error" && <p>Не получилось. Попробуй позже.</p>}
      </form>
    );
  }