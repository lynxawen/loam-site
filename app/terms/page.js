  import Link from "next/link";
  import styles from "../legal.module.css";

  export const metadata = {
    title: "Условия — Loam",
  };

  export default function Terms() {
    return (
      <main className={styles.page}>
        <p>
          <Link href="/">← На главную</Link>
        </p>
        <h1>Условия и положения оказания услуг</h1>

        <h2>1. Формат занятий и бронирование</h2>
        <p>1.1. Каждое занятие длится 50 минут.</p>
        <p>1.2. Занятия проводятся онлайн через Zoom.</p>

        {/* Paste the rest of your Terms here, section by section */}
      </main>
    );
  }