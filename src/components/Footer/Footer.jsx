import styles from "./footer.module.css";

function Footer() {
  return (
    <footer className={styles.footer}>
      <p className={styles.footerText}>
        © {new Date().getFullYear()} Garden Grove Village
      </p>
      <p className={styles.versionText}>
        v1.0.7
      </p>
    </footer>
  );
}

export default Footer;
