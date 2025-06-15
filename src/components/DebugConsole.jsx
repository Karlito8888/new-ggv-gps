import { useState, useEffect, useRef } from "react";
import "./DebugConsole.css";

const DebugConsole = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [logs, setLogs] = useState([]);
  const [logCount, setLogCount] = useState(0);
  const consoleContentRef = useRef(null);

  // Fonction pour ajouter un log
  const addLog = (type, args) => {
    const timestamp = new Date().toLocaleTimeString();
    const message = args
      .map((arg) => {
        if (typeof arg === "object") {
          try {
            return JSON.stringify(arg, null, 2);
          } catch {
            return String(arg);
          }
        }
        return String(arg);
      })
      .join(" ");

    const newLog = {
      id: Date.now() + Math.random(),
      type,
      timestamp,
      message,
    };

    setLogs((prevLogs) => {
      const updatedLogs = [...prevLogs, newLog];
      // Garder seulement les 100 derniers logs pour éviter les problèmes de performance
      return updatedLogs.slice(-100);
    });

    setLogCount((prev) => prev + 1);

    // Auto-scroll vers le bas
    setTimeout(() => {
      if (consoleContentRef.current) {
        consoleContentRef.current.scrollTop =
          consoleContentRef.current.scrollHeight;
      }
    }, 10);
  };

  // Intercepter les méthodes de console
  useEffect(() => {
    const originalLog = console.log;
    const originalWarn = console.warn;
    const originalError = console.error;
    const originalInfo = console.info;

    // Override console.log
    console.log = (...args) => {
      originalLog(...args);
      addLog("log", args);
    };

    // Override console.warn
    console.warn = (...args) => {
      originalWarn(...args);
      addLog("warn", args);
    };

    // Override console.error
    console.error = (...args) => {
      originalError(...args);
      addLog("error", args);
    };

    // Override console.info
    console.info = (...args) => {
      originalInfo(...args);
      addLog("info", args);
    };

    // Cleanup on unmount
    return () => {
      console.log = originalLog;
      console.warn = originalWarn;
      console.error = originalError;
      console.info = originalInfo;
    };
  }, []);

  // Fonction pour vider les logs
  const clearLogs = () => {
    setLogs([]);
    setLogCount(0);
  };

  // Fonction pour copier les logs dans le presse-papiers
  const copyLogs = async () => {
    const logsText = logs
      .map((log) => `[${log.timestamp}] ${log.type.toUpperCase()}: ${log.message}`)
      .join("\n");

    try {
      await navigator.clipboard.writeText(logsText);
      // Feedback visuel temporaire
      const button = document.querySelector(".debug-copy-button");
      if (button) {
        const originalText = button.textContent;
        button.textContent = "✅ Copié !";
        setTimeout(() => {
          button.textContent = originalText;
        }, 2000);
      }
    } catch (err) {
      console.error("Erreur lors de la copie:", err);
    }
  };

  return (
    <>
      {/* Bouton debug en haut à gauche */}
      <div className="debug-console-toggle">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className={`debug-toggle-button ${isOpen ? "active" : ""}`}
          title="Ouvrir/Fermer la console de débogage"
        >
          🐛
          {logCount > 0 && !isOpen && (
            <span className="debug-badge">{logCount > 99 ? "99+" : logCount}</span>
          )}
        </button>
      </div>

      {/* Console déployable */}
      {isOpen && (
        <div className="debug-console-panel">
          <div className="debug-console-header">
            <div className="debug-header-left">
              <span className="debug-title">Console Debug</span>
              <span className="debug-count">({logs.length} logs)</span>
            </div>
            <div className="debug-header-actions">
              <button
                onClick={copyLogs}
                className="debug-copy-button"
                title="Copier tous les logs"
                disabled={logs.length === 0}
              >
                📋
              </button>
              <button
                onClick={clearLogs}
                className="debug-clear-button"
                title="Vider la console"
                disabled={logs.length === 0}
              >
                🗑️
              </button>
              <button
                onClick={() => setIsOpen(false)}
                className="debug-close-button"
                title="Fermer la console"
              >
                ✕
              </button>
            </div>
          </div>

          <div className="debug-console-content" ref={consoleContentRef}>
            {logs.length === 0 ? (
              <div className="debug-empty">
                <p>Aucun log pour le moment...</p>
                <p className="debug-empty-hint">
                  Les messages console.log(), console.warn(), console.error() et console.info() apparaîtront ici.
                </p>
              </div>
            ) : (
              logs.map((log) => (
                <div key={log.id} className={`debug-log debug-${log.type}`}>
                  <div className="debug-log-header">
                    <span className="debug-timestamp">{log.timestamp}</span>
                    <span className={`debug-type debug-type-${log.type}`}>
                      {log.type.toUpperCase()}
                    </span>
                  </div>
                  <div className="debug-message">
                    <pre>{log.message}</pre>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </>
  );
};

export default DebugConsole;