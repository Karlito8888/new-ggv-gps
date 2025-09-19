function Footer() {
  return (
    <footer className="footer">
      <p className="footer-text">
        © {new Date().getFullYear()} Garden Grove Village
      </p>
      <p className="version-text">
        v1.1.0
      </p>
    </footer>
  );
}

export default Footer;
