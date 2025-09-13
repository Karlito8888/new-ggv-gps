import styles from './footer.module.css';

function Footer() {
  return (
    <footer className={styles.footer}>
      <p className={styles.footerText}>
        © {new Date().getFullYear()} Garden Grove Village A
      </p>
    </footer>
  );
}

export default Footer;