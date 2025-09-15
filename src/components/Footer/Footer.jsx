import styles from "./footer.module.css";

function Footer() {
  return (
    <footer className={styles.footer}>
      <p className={styles.footerText}>
        © {new Date().getFullYear()} Garden Grove Village
      </p>
      <p className={styles.versionText}>
        V.1.0.2
      </p>
    </footer>
  );
}

export default Footer;
