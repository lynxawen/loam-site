  import Link from "next/link";
  import styles from "../legal.module.css";

  export const metadata = {
    title: "Конфиденциальность — Loam",
  };

  export default function Privacy() {
    return (
      <main className={styles.page}>
        <p>
          <Link href="/">← На главную</Link>
        </p>
        <h1>Политика конфиденциальности</h1>

        {/* Paste your Privacy text here */}
      </main>
    );
  }