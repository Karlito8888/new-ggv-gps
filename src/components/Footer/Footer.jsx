import styles from './footer.module.css';

function Footer() {
  return (
    <footer className={styles.footer}>
      <p className={styles.footerText}>
        © {new Date().getFullYear()} Garden Grove Village Y
      </p>
    </footer>
  );
}

export default Footer;