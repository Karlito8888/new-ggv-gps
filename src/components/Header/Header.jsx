import ggvLogo from "../../assets/img/ggv.png";
import styles from './header.module.css';

function Header() {
  return (
    <header className={styles.header}>
      <img
        src={ggvLogo}
        alt="Garden Grove Village Logo"
        className={styles.modalLogo}
      />
    </header>
  );
}

export default Header;