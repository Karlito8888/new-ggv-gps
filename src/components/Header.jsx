import ggvLogo from "../assets/img/ggv.png";
import "./Header.css";

function Header() {
  return (
    <header className="header">
      <img
        src={ggvLogo}
        alt="Garden Grove Village Logo"
        className="modal-logo"
      />
    </header>
  );
}

export default Header;
