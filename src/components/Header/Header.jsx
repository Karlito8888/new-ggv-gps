import ggvLogo from "../../assets/img/ggv.png";
import styles from './header.module.css';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

function Header() {
  const insets = useSafeAreaInsets();

  return (
    <header 
      className={styles.header}
      style={{
        paddingTop: insets.top,
      }}
    >
      <img
        src={ggvLogo}
        alt="Garden Grove Village Logo"
        className={styles.modalLogo}
      />
    </header>
  );
}

export default Header;