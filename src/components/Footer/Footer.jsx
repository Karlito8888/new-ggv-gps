import styles from "./footer.module.css";
import { useSafeAreaInsets } from 'react-native-safe-area-context';

function Footer() {
  const insets = useSafeAreaInsets();

  return (
    <footer 
      className={styles.footer}
      style={{
        paddingBottom: insets.bottom,
      }}
    >
      <p className={styles.footerText}>
        © {new Date().getFullYear()} Garden Grove Village
      </p>
      <p className={styles.versionText}>
        v1.0.4
      </p>
    </footer>
  );
}

export default Footer;
