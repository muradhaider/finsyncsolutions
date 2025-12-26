// src/App.jsx
// FinSync Solutions – prototype with:
// - Admin & client dashboards
// - Simulated user accounts in localStorage
// - Simulated 2FA (email codes), welcome/verification emails
// - Simulated document exchange (client <-> admin)
// - Payment tab stub (hook to Stripe/PayPal later)
//
// ⚠ IMPORTANT: This is still FRONT-END ONLY.
// - No real encryption.
// - No real emails are sent (they're logged to console).
// - No real payment processing.
// For production you MUST add a backend (server, DB, email + payments).

import {
  useState,
  useEffect,
  createContext,
  useContext,
} from "react";
import {
  BrowserRouter,
  Routes,
  Route,
  Link,
  Navigate,
  useNavigate,
  useLocation,
} from "react-router-dom";
import { motion } from "framer-motion";
import logo from "./assets/finsync-logo.png";

// ---------- "Backend" simulation helpers (localStorage) ----------
// In a real backend, all of this would live on the server with a DB,
// proper encryption, and access controls.

const ADMIN_EMAILS = [
  "curtis@finsyncsolutions.com",
  "murad@finsyncsolutions.com",
].map((e) => e.toLowerCase());

function sendEmail(to, subject, body) {
  // Simulated email. Replace with real email service on backend.
  console.log("📧 SIMULATED EMAIL", { to, subject, body });
}

function generateCode() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

function loadUsers() {
  const raw = localStorage.getItem("fs_users");
  try {
    const parsed = raw ? JSON.parse(raw) : [];
    // Backwards compatibility with older structure
    return parsed.map((u) => ({
      role: "client",
      verified: true,
      welcomeSent: false,
      ...u,
      // If their email is an admin email, upgrade role
      role: ADMIN_EMAILS.includes(u.email?.toLowerCase())
        ? "admin"
        : u.role || "client",
    }));
  } catch {
    return [];
  }
}

function saveUsers(users) {
  localStorage.setItem("fs_users", JSON.stringify(users));
}

function getUserByEmail(email) {
  const users = loadUsers();
  return users.find(
    (u) => u.email.toLowerCase() === email.toLowerCase()
  );
}

function updateUser(updatedUser) {
  const users = loadUsers();
  const next = users.map((u) =>
    u.id === updatedUser.id ? updatedUser : u
  );
  saveUsers(next);
}

function deleteUser(userId) {
  const users = loadUsers().filter((u) => u.id !== userId);
  saveUsers(users);
  localStorage.removeItem(`fs_docs_${userId}`);
  localStorage.removeItem(`fs_trusted_${userId}`);
}

// Documents per user (metadata only)
function loadDocsForUser(userId) {
  const raw = localStorage.getItem(`fs_docs_${userId}`);
  if (!raw) return [];
  try {
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

function saveDocsForUser(userId, docs) {
  localStorage.setItem(`fs_docs_${userId}`, JSON.stringify(docs));
}

// Simple password hashing (SHA-256 via Web Crypto).
// Still only client-side, this is NOT a replacement for real backend hashing.
async function hashPassword(password) {
  try {
    if (!window.crypto?.subtle) {
      return password;
    }
    const enc = new TextEncoder();
    const data = enc.encode(password);
    const digest = await window.crypto.subtle.digest("SHA-256", data);
    const hashArray = Array.from(new Uint8Array(digest));
    const hashHex = hashArray
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
    return hashHex;
  } catch {
    return password;
  }
}

// Password rules helper
function getPasswordRules(password) {
  return {
    length: password.length >= 8,
    upper: /[A-Z]/.test(password),
    lower: /[a-z]/.test(password),
    number: /\d/.test(password),
    special: /[^A-Za-z0-9]/.test(password),
  };
}

function isPasswordStrong(password) {
  const rules = getPasswordRules(password);
  return Object.values(rules).every(Boolean);
}

// ---------- Auth context ----------
const AuthContext = createContext(null);

function useAuth() {
  return useContext(AuthContext);
}

function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const raw = localStorage.getItem("fs_user");
    return raw ? JSON.parse(raw) : null;
  });

  const login = (userData) => {
    setUser(userData);
    localStorage.setItem("fs_user", JSON.stringify(userData));
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem("fs_user");
  };

  return (
    <AuthContext.Provider value={{ user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

// Auth guards
function RequireAuth({ children }) {
  const { user } = useAuth();
  const location = useLocation();
  if (!user) {
    return (
      <Navigate
        to="/login"
        state={{ from: location.pathname }}
        replace
      />
    );
  }
  return children;
}

function RequireAdmin({ children }) {
  const { user } = useAuth();
  const location = useLocation();
  if (!user) {
    return (
      <Navigate
        to="/login"
        state={{ from: location.pathname }}
        replace
      />
    );
  }
  if (user.role !== "admin") {
    return <Navigate to="/" replace />;
  }
  return children;
}

// Utility for date <input>
function formatDateInput(date) {
  return date.toISOString().slice(0, 10);
}

// ---------- Layout shell with nav & footer ----------
function AppShell() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleHomeClick = () => {
    navigate("/");
  };

  const handleClientClick = () => {
    if (user) navigate("/client");
    else navigate("/login");
  };

  const handleLogoutClick = () => {
    logout();
    navigate("/");
  };

  const isAdmin = user?.role === "admin";

  return (
    <div className="app-root">
      <div className="app-bg-grid" />
      <div className="app-bg-radial" />

      <div className="app-shell">
        {/* NAVBAR */}
        <header className="nav">
          {/* LEFT: Nav links */}
          <div className="nav-left">
            <button
              className="nav-link-btn nav-link-btn--subtle"
              onClick={handleHomeClick}
            >
              Home
            </button>
            <Link to="/about" className="nav-link">
              About
            </Link>
            <Link to="/contact" className="nav-link">
              Contact
            </Link>
            {user && (
              <button
                className="nav-link-btn"
                onClick={handleClientClick}
              >
                Client Dashboard
              </button>
            )}
            {isAdmin && (
              <Link to="/admin" className="nav-link">
                Admin
              </Link>
            )}
          </div>

          {/* RIGHT: Brand + auth actions */}
          <div className="nav-right">
            {!user && (
              <button
                className="nav-link-btn nav-link-btn--primary"
                onClick={handleClientClick}
              >
                Client Login
              </button>
            )}
            {user && (
              <button
                className="nav-link-btn nav-link-btn--subtle"
                onClick={handleLogoutClick}
              >
                Logout
              </button>
            )}
            <button
              className="nav-logo-btn"
              onClick={handleHomeClick}
            >
              <img
                src={logo}
                alt="FinSync Solutions"
                className="nav-logo-img"
              />
              <span className="nav-logo-text">FinSync Solutions</span>
            </button>
          </div>
        </header>

        {/* MAIN PAGES */}
        <main>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route
              path="/client"
              element={
                <RequireAuth>
                  <ClientDashboardPage />
                </RequireAuth>
              }
            />
            <Route
              path="/admin"
              element={
                <RequireAdmin>
                  <AdminDashboardPage />
                </RequireAdmin>
              }
            />
            <Route
              path="/book-call"
              element={
                <RequireAuth>
                  <BookCallPage />
                </RequireAuth>
              }
            />
            <Route path="/about" element={<AboutPage />} />
            <Route path="/contact" element={<ContactPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/signup" element={<SignupPage />} />
            <Route path="/reset-password" element={<ResetPasswordPage />} />
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </main>

        <footer className="footer">
          <span>© {new Date().getFullYear()} FinSync Solutions.</span>
          <span className="footer-dot">•</span>
          <span>Bookkeeping &amp; financial operations partner.</span>
        </footer>
      </div>
    </div>
  );
}

// ---------- Shared components ----------
function PasswordInput({ label, value, onChange, showRequirements }) {
  const [show, setShow] = useState(false);
  const [touched, setTouched] = useState(false);

  const rules = getPasswordRules(value);
  const allValid = Object.values(rules).every(Boolean);

  return (
    <div className="password-field-block">
      <label className="field-label">
        {label}
        <div className="password-wrapper">
          <input
            type={show ? "text" : "password"}
            className="field-input password-input"
            value={value}
            onChange={(e) => {
              onChange(e.target.value);
              if (!touched) setTouched(true);
            }}
            onBlur={() => setTouched(true)}
            required
          />
          <button
            type="button"
            className="password-toggle"
            onClick={() => setShow((v) => !v)}
            aria-label={show ? "Hide password" : "Show password"}
          >
            {show ? "🙈" : "👁"}
          </button>
        </div>
      </label>

      {showRequirements && (
        <>
          <ul className="password-rules">
            <li className={rules.length ? "ok" : "bad"}>
              At least 8 characters
            </li>
            <li className={rules.upper ? "ok" : "bad"}>
              At least one uppercase letter
            </li>
            <li className={rules.lower ? "ok" : "bad"}>
              At least one lowercase letter
            </li>
            <li className={rules.number ? "ok" : "bad"}>
              At least one number
            </li>
            <li className={rules.special ? "ok" : "bad"}>
              At least one symbol (e.g., !@#$%)
            </li>
          </ul>
          {touched && !allValid && (
            <div className="password-warning">
              Password must meet all requirements above.
            </div>
          )}
        </>
      )}
    </div>
  );
}

// Used as visual business health panel
function LandingPanel({ titlePrefix = "client-ledger" }) {
  const [activeTab, setActiveTab] = useState("overview");

  return (
    <>
      <div className="panel-header">
        <div className="panel-dots">
          <span />
          <span />
          <span />
        </div>
        <span className="panel-title">
          finsync@{titlePrefix} • live
        </span>
      </div>

      <div className="panel-body">
        <div className="panel-tabs">
          <button
            className={
              "panel-tab" +
              (activeTab === "overview" ? " panel-tab--active" : "")
            }
            onClick={() => setActiveTab("overview")}
          >
            Overview
          </button>
          <button
            className={
              "panel-tab" +
              (activeTab === "cash" ? " panel-tab--active" : "")
            }
            onClick={() => setActiveTab("cash")}
          >
            Cash-flow
          </button>
          <button
            className={
              "panel-tab" +
              (activeTab === "alerts" ? " panel-tab--active" : "")
            }
            onClick={() => setActiveTab("alerts")}
          >
            Alerts
          </button>
        </div>

        <div className="panel-content">
          {activeTab === "overview" && (
            <div className="panel-metrics">
              <div className="metric-card">
                <span className="metric-label">
                  Bookkeeping status
                </span>
                <span className="metric-value metric-value--good">
                  ✅ Up-to-date
                </span>
                <span className="metric-caption">
                  All bank &amp; card accounts reconciled through last
                  month.
                </span>
              </div>
              <div className="metric-card">
                <span className="metric-label">Monthly profit</span>
                <span className="metric-value">$18,420</span>
                <span className="metric-caption metric-caption--muted">
                  +27% vs. prior month
                </span>
              </div>
              <div className="metric-card">
                <span className="metric-label">Cash runway</span>
                <span className="metric-value">7.3 months</span>
                <span className="metric-caption">
                  Based on current burn and receivables.
                </span>
              </div>
            </div>
          )}

          {activeTab === "cash" && (
            <div className="panel-code">
              <p className="code-line">
                &gt; forecast.cashflow({"{"} horizon: "90 days" {"}"})
              </p>
              <p className="code-line code-line--muted">
                ✓ synced: 3 bank accounts, 2 cards, Stripe
              </p>
              <p className="code-line">
                ▸ week 01 · +$12,300 · invoices collected
              </p>
              <p className="code-line">
                ▸ week 02 · -$8,950 · payroll + rent
              </p>
              <p className="code-line">
                ▸ week 03 · +$6,120 · projects closing
              </p>
              <p className="code-line">
                ▸ week 04 · +$2,410 · subscriptions + upsells
              </p>
              <p className="code-line code-line--accent">
                cash runway: 7.3 months · status: stable ✅
              </p>
            </div>
          )}

          {activeTab === "alerts" && (
            <div className="panel-alerts">
              <div className="alert-row alert-row--ok">
                <span className="alert-badge alert-badge--ok">
                  OK
                </span>
                <span>
                  All reconciliations complete for the last 30 days.
                </span>
              </div>
              <div className="alert-row alert-row--warn">
                <span className="alert-badge alert-badge--warn">
                  Heads-up
                </span>
                <span>
                  3 vendor bills approaching due date. Total: $4,870
                  due in 5 days.
                </span>
              </div>
              <div className="alert-row alert-row--info">
                <span className="alert-badge alert-badge--info">
                  Info
                </span>
                <span>
                  Margins in your services segment improved by 9% vs
                  last quarter.
                </span>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

// ---------- Pages ----------

// HOME / LANDING PAGE (marketing)
function HomePage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const handlePrimary = () => {
    if (user) {
      navigate("/client");
    } else {
      navigate("/signup");
    }
  };

  return (
    <section className="hero" id="top">
      <div className="hero-content">
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="hero-pill-row"
        >
          <span className="hero-pill">
            Now onboarding new clients
          </span>
          <span className="hero-pill-tag">
            Sacramento · Remote-friendly
          </span>
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.05 }}
          className="hero-title"
        >
          Keep your books
          <span className="hero-gradient-text"> in sync</span>.
          <br />
          Every month. Automatically.
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.12 }}
          className="hero-subtitle"
        >
          FinSync Solutions keeps your bookkeeping clean, current and
          understandable. We combine meticulous human bookkeeping with
          light AI assistance so your statements, cash-flow and
          spreadsheets stay perfectly aligned – without you wrestling
          with QuickBooks at 11pm.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.18 }}
          className="hero-actions"
        >
          <button
            type="button"
            className="btn-primary"
            onClick={handlePrimary}
          >
            {user ? "Go to client dashboard" : "Get started"}
          </button>
          <Link to="/about" className="btn-ghost">
            Learn more
          </Link>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.24 }}
          className="hero-footnote"
        >
          <span className="hero-footnote-dot" />
          <span>
            Not a CPA firm – we handle day-to-day bookkeeping and
            reporting so your CPA can handle tax.
          </span>
        </motion.div>
      </div>

      <motion.aside
        initial={{ opacity: 0, x: 40 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.7, delay: 0.1 }}
        className="hero-panel"
      >
        <LandingPanel />
      </motion.aside>
    </section>
  );
}

// CLIENT DASHBOARD (after login)
function ClientDashboardPage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("health");
  const [docs, setDocs] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [paymentStatus] = useState("unpaid");

  useEffect(() => {
    if (user?.id) {
      setDocs(loadDocsForUser(user.id));
    }
  }, [user]);

  const handleFileChange = async (event) => {
    if (!user?.id) return;
    const files = Array.from(event.target.files || []);
    if (!files.length) return;

    setUploading(true);
    const existing = loadDocsForUser(user.id);
    const now = new Date().toISOString();
    const newDocs = files.map((file) => ({
      id:
        (crypto.randomUUID && crypto.randomUUID()) ||
        `${Date.now()}_${file.name}`,
      name: file.name,
      size: file.size,
      type: file.type,
      uploadedAt: now,
      uploadedBy: "client",
    }));
    const updated = [...existing, ...newDocs];
    saveDocsForUser(user.id, updated);
    setDocs(updated);
    setUploading(false);
    event.target.value = "";
  };

  const PAYMENT_LINK_URL = "https://example.com/your-stripe-or-paypal-link";

  const goToPayment = () => {
    // For now, just open a placeholder link.
    // Replace PAYMENT_LINK_URL with a real Stripe/PayPal link.
    window.open(PAYMENT_LINK_URL, "_blank", "noopener,noreferrer");
  };

  return (
    <section className="section">
      <div className="section-header">
        <h2>Welcome back, {user?.fullName || "Client"}.</h2>
        <p>
          This is your client dashboard. From here you can review your
          business health, upload documents securely (prototype), and
          manage your payment details.
        </p>
      </div>

      <div className="client-tabs">
        <button
          className={
            "client-tab" +
            (activeTab === "health" ? " client-tab--active" : "")
          }
          onClick={() => setActiveTab("health")}
        >
          Business health
        </button>
        <button
          className={
            "client-tab" +
            (activeTab === "documents" ? " client-tab--active" : "")
          }
          onClick={() => setActiveTab("documents")}
        >
          Documents
        </button>
        <button
          className={
            "client-tab" +
            (activeTab === "payments" ? " client-tab--active" : "")
          }
          onClick={() => setActiveTab("payments")}
        >
          Payments
        </button>
      </div>

      {activeTab === "health" && (
        <div className="section-grid client-home-grid">
          <div className="feature-card">
            <h3>Business overview</h3>
            {docs.length === 0 ? (
              <p>
                No financial data has been uploaded yet. Once your
                documents are reviewed, your business health summary
                will appear here.
              </p>
            ) : (
              <p>
                Based on the documents we&apos;ve received, your
                bookkeeping status is up-to-date. Detailed reports and
                adjustments will be uploaded to your Documents tab.
              </p>
            )}
          </div>
          <div className="client-panel-wrapper">
            <div className="hero-panel">
              <LandingPanel titlePrefix={user?.companyName || "books"} />
            </div>
          </div>
        </div>
      )}

      {activeTab === "documents" && (
        <div className="section">
          <div className="section-cols">
            <div className="copy-block copy-block--card">
              <h3>Upload documents</h3>
              <p>
                Use this area to upload bank statements, tax returns,
                P&amp;L reports, or other financial documents. In a
                production system, these would be stored on a secure
                backend, not in your browser.
              </p>
              <label className="field-label">
                Select files
                <input
                  type="file"
                  multiple
                  onChange={handleFileChange}
                  disabled={uploading}
                  className="field-input"
                />
              </label>
              {uploading && (
                <p className="booking-note">
                  Uploading (simulated)... please wait.
                </p>
              )}
            </div>
            <div className="copy-block copy-block--card">
              <h3>Your documents</h3>
              {docs.length === 0 ? (
                <p>No documents have been uploaded yet.</p>
              ) : (
                <ul className="simple-list">
                  {docs.map((doc) => (
                    <li key={doc.id}>
                      <strong>{doc.name}</strong>{" "}
                      <span>
                        · {doc.type || "file"} ·{" "}
                        {Math.round(doc.size / 1024)} KB ·{" "}
                        {new Date(doc.uploadedAt).toLocaleString()} ·{" "}
                        {doc.uploadedBy === "admin"
                          ? "Uploaded by FinSync"
                          : "Uploaded by you"}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      )}

      {activeTab === "payments" && (
        <div className="section section--bordered">
          <div className="section-cols">
            <div className="copy-block">
              <h3>Your plan &amp; billing</h3>
              <p>
                This is a placeholder for your payment and subscription
                status. In production, this would be backed by Stripe
                or another payment provider and tied to your account.
              </p>
              <p>
                Current plan:{" "}
                <span className="inline-highlight">
                  Monthly bookkeeping &amp; reporting
                </span>
              </p>
              <p>Status: {paymentStatus === "unpaid" ? "Unpaid" : "Active"}</p>
              <button
                type="button"
                className="btn-primary auth-btn"
                onClick={goToPayment}
              >
                Go to secure payment
              </button>
              <p className="booking-note">
                Once you integrate Stripe/PayPal, this button should
                redirect to a real encrypted checkout flow.
              </p>
            </div>
            <div className="copy-block copy-block--card">
              <h3>Payment receipts (prototype)</h3>
              <p>
                In a full implementation, this area could show invoices,
                payment dates and downloadable receipts generated by
                your payment processor.
              </p>
              <p>
                For now, this is a design placeholder so you know where
                that functionality will live.
              </p>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

// ADMIN DASHBOARD
function AdminDashboardPage() {
  const { user } = useAuth();
  const [users, setUsers] = useState([]);
  const [selectedUserId, setSelectedUserId] = useState(null);
  const [selectedUserDocs, setSelectedUserDocs] = useState([]);
  const [adminNote, setAdminNote] = useState("");

  useEffect(() => {
    setUsers(loadUsers());
  }, []);

  useEffect(() => {
    if (selectedUserId) {
      setSelectedUserDocs(loadDocsForUser(selectedUserId));
    } else {
      setSelectedUserDocs([]);
    }
  }, [selectedUserId]);

  const isAdminEmail = ADMIN_EMAILS.includes(
    user?.email?.toLowerCase()
  );

  const handleSelectUser = (uid) => {
    setSelectedUserId(uid);
  };

  const handleDeleteUser = (uid) => {
    if (
      !window.confirm(
        "Are you sure you want to delete this user and their documents? This is irreversible in this prototype."
      )
    ) {
      return;
    }
    deleteUser(uid);
    setUsers(loadUsers());
    if (selectedUserId === uid) {
      setSelectedUserId(null);
      setSelectedUserDocs([]);
    }
  };

  const handleUploadAdminDoc = () => {
    if (!selectedUserId || !adminNote.trim()) return;
    const docs = loadDocsForUser(selectedUserId);
    const now = new Date().toISOString();
    const newDoc = {
      id:
        (crypto.randomUUID && crypto.randomUUID()) ||
        `${Date.now()}_admin`,
      name: `FinSync summary – ${new Date().toLocaleDateString()}`,
      size: 0,
      type: "summary",
      uploadedAt: now,
      uploadedBy: "admin",
      note: adminNote.trim(),
      adminName: user?.fullName || "FinSync",
    };
    const updated = [...docs, newDoc];
    saveDocsForUser(selectedUserId, updated);
    setSelectedUserDocs(updated);
    setAdminNote("");
  };

  return (
    <section className="section">
      <div className="section-header">
        <h2>Admin dashboard</h2>
        <p>
          As an admin you can view the client list, inspect uploaded
          documents (prototype only), and attach refined summary
          documents for clients.
        </p>
      </div>

      {!isAdminEmail && (
        <p className="auth-error">
          Your email is not one of the primary FinSync admin emails
          (curtis@finsyncsolutions.com or murad@finsyncsolutions.com).
          Access is restricted in production.
        </p>
      )}

      <div className="section-grid">
        <div className="feature-card">
          <h3>Client list</h3>
          {users.length === 0 ? (
            <p>No users have signed up yet.</p>
          ) : (
            <ul className="simple-list">
              {users.map((u) => (
                <li key={u.id}>
                  <button
                    type="button"
                    onClick={() => handleSelectUser(u.id)}
                    className={
                      "link-inline" +
                      (selectedUserId === u.id ? " inline-highlight" : "")
                    }
                  >
                    {u.fullName || u.email}{" "}
                    {u.companyName ? `· ${u.companyName}` : ""}
                  </button>{" "}
                  <span>
                    ({u.role || "client"} · {u.email})
                  </span>
                  {ADMIN_EMAILS.includes(u.email.toLowerCase()) && (
                    <span> · core admin</span>
                  )}
                  {!ADMIN_EMAILS.includes(u.email.toLowerCase()) && (
                    <>
                      {" · "}
                      <button
                        type="button"
                        className="link-inline"
                        onClick={() => handleDeleteUser(u.id)}
                      >
                        Delete
                      </button>
                    </>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="feature-card">
          <h3>Client documents &amp; summary</h3>
          {!selectedUserId ? (
            <p>Select a client to view their documents.</p>
          ) : (
            <>
              {selectedUserDocs.length === 0 ? (
                <p>This client has no documents uploaded yet.</p>
              ) : (
                <ul className="simple-list">
                  {selectedUserDocs.map((doc) => (
                    <li key={doc.id}>
                      <strong>{doc.name}</strong>{" "}
                      <span>
                        · {doc.type || "file"} ·{" "}
                        {doc.uploadedBy === "admin"
                          ? `Uploaded by ${doc.adminName || "FinSync"}`
                          : "Uploaded by client"}
                      </span>
                      {doc.note && (
                        <div style={{ fontSize: "0.8rem", marginTop: "0.1rem" }}>
                          Note: {doc.note}
                        </div>
                      )}
                    </li>
                  ))}
                </ul>
              )}
              <div style={{ marginTop: "0.7rem" }}>
                <label className="field-label">
                  Add summary note for this client
                  <textarea
                    className="field-input"
                    rows={3}
                    value={adminNote}
                    onChange={(e) => setAdminNote(e.target.value)}
                  />
                </label>
                <button
                  type="button"
                  className="btn-primary auth-btn"
                  onClick={handleUploadAdminDoc}
                >
                  Upload refined summary (prototype)
                </button>
                <p className="booking-note">
                  In production this would upload a real PDF/Excel or
                  link to generated reports stored on your backend.
                </p>
              </div>
            </>
          )}
        </div>
      </div>
    </section>
  );
}

// BOOK A CALL PAGE (still available, but not main CTA after login)
function BookCallPage() {
  const { user } = useAuth();
  const [selectedDate, setSelectedDate] = useState(() =>
    formatDateInput(new Date())
  );
  const [selectedTime, setSelectedTime] = useState("");
  const [message, setMessage] = useState("");

  const today = new Date();
  const minDate = formatDateInput(today);
  const maxDate = formatDateInput(
    new Date(
      today.getFullYear(),
      today.getMonth(),
      today.getDate() + 14
    )
  );

  const timeSlots = [];
  for (let hour = 9; hour <= 16; hour++) {
    ["00", "30"].forEach((mins) => {
      if (hour === 16 && mins === "30") return;
      const h = hour.toString().padStart(2, "0");
      timeSlots.push(`${h}:${mins}`);
    });
  }

  const handleBook = () => {
    if (!selectedTime) {
      setMessage("Please select a time slot.");
      return;
    }
    const when = `${selectedDate} at ${selectedTime}`;
    setMessage(
      `Booked ${when}. You would receive a confirmation email in production.`
    );
    // Simulated booking confirmation email
    sendEmail(
      user?.email || "client@example.com",
      "Your FinSync call booking",
      `You booked a 20-minute call on ${when}.`
    );
  };

  return (
    <section className="section section--bordered">
      <div className="section-header">
        <h2>Book a 20-minute call (prototype)</h2>
        <p>
          In the future this can be wired to a real calendar integration.
          For now it demonstrates where call scheduling would live.
        </p>
      </div>

      <div className="booking-grid">
        <div className="booking-col">
          <label className="field-label">
            Select a date (next 14 days)
            <input
              type="date"
              className="field-input"
              value={selectedDate}
              min={minDate}
              max={maxDate}
              onChange={(e) => {
                setSelectedDate(e.target.value);
                setMessage("");
              }}
            />
          </label>

          <p className="booking-note">
            You&apos;re booking as{" "}
            <strong>{user?.fullName || user?.email}</strong>.
          </p>

          {message && (
            <div className="booking-message">{message}</div>
          )}
        </div>

        <div className="booking-col">
          <div className="slots-grid">
            {timeSlots.map((time) => (
              <button
                key={time}
                type="button"
                className={
                  "slot-btn" +
                  (selectedTime === time ? " slot-btn--active" : "")
                }
                onClick={() => {
                  setSelectedTime(time);
                  setMessage("");
                }}
              >
                {time}
              </button>
            ))}
          </div>
          <button
            type="button"
            className="btn-primary auth-btn"
            onClick={handleBook}
          >
            Confirm booking
          </button>
        </div>
      </div>
    </section>
  );
}

// ABOUT PAGE
function AboutPage() {
  return (
    <section className="section">
      <div className="section-header">
        <h2>About FinSync Solutions</h2>
        <p>
          This page gives prospective clients a sense of who you are,
          why you built FinSync Solutions and how you think about
          bookkeeping and financial operations.
        </p>
      </div>

      <div className="section-cols">
        <div className="copy-block">
          <h3>Our mission</h3>
          <p>
            Replace &quot;I&apos;ll deal with my books later&quot; with
            calm, clear numbers that owners can trust. FinSync Solutions
            exists to give small business owners a simple, reliable way
            to stay financially organized without becoming accountants
            themselves.
          </p>
          <p>
            You can expand this section with your real story, the types
            of clients you love working with, and what you believe
            great bookkeeping should feel like.
          </p>
        </div>
        <div className="copy-block">
          <h3>Founders</h3>
          <p>
            Use this space for brief founder bios. For example:
          </p>
          <ul className="simple-list">
            <li>
              <strong>Curtis</strong> – background in operations and
              finance, obsessed with clean systems and clear reporting.
            </li>
            <li>
              <strong>Murad</strong> – background in
              engineering/automation, focused on blending human judgment
              with AI-assisted workflows.
            </li>
          </ul>
          <p>
            Add photos, timelines or a short origin story once you have
            them ready.
          </p>
        </div>
      </div>
    </section>
  );
}

// CONTACT PAGE
function ContactPage() {
  return (
    <section className="section section--bordered">
      <div className="section-header">
        <h2>Contact FinSync Solutions</h2>
        <p>
          Whether you&apos;re exploring a clean-up project or ongoing
          monthly bookkeeping, you can reach out and we&apos;ll follow
          up within one business day.
        </p>
      </div>

      <div className="contact-card">
        <div className="contact-copy">
          <h2>Let&apos;s talk about your books.</h2>
          <p>
            Share a bit about your business, where your books are
            today, and what you&apos;d like them to look like. We&apos;ll
            review and get back to you with next steps.
          </p>
        </div>
        <div className="contact-details">
          <div className="contact-row">
            <span className="contact-label">Email</span>
            <a href="mailto:curtis@finsyncsolutions.org">
              curtis@finsyncsolutions.org
            </a>
            <a href="mailto:murad@finsyncsolutions.org">
              murad@finsyncsolutions.org
            </a>
          </div>
          <div className="contact-row">
            <span className="contact-label">Location</span>
            <span>Sacramento, CA · Remote across the U.S.</span>
          </div>
          <div className="contact-row">
            <span className="contact-label">Alternative</span>
            <span>
              Or sign up and access your client dashboard directly.
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}

// LOGIN PAGE with simulated 2FA & remember device
function LoginPage() {
  const { user, login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [twoFACode, setTwoFACode] = useState("");
  const [rememberDevice, setRememberDevice] = useState(false);
  const [step, setStep] = useState("credentials"); // "credentials" | "2fa"
  const [pendingUser, setPendingUser] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (user) {
      navigate("/client", { replace: true });
    }
  }, [user, navigate]);

  const handleSubmitCredentials = async (e) => {
    e.preventDefault();
    setError("");

    const existing = getUserByEmail(email);
    if (!existing) {
      setError("Invalid email or password.");
      return;
    }

    const attemptedHash = await hashPassword(password);
    const matchesHashed =
      existing.passwordHash &&
      existing.passwordHash === attemptedHash;
    const matchesLegacy =
      existing.password && existing.password === password;

    if (!matchesHashed && !matchesLegacy) {
      setError("Invalid email or password.");
      return;
    }

    const trusted =
      localStorage.getItem(`fs_trusted_${existing.id}`) === "true";

    // Simulate sending verification & welcome if not sent before
    if (!existing.welcomeSent) {
      sendEmail(
        existing.email,
        "Verify your FinSync Solutions account",
        "This is where a real verification link would be sent."
      );
      sendEmail(
        "curtis@finsyncsolutions.com",
        "New FinSync client signup",
        `${existing.fullName || existing.email} just created an account.`
      );
      existing.welcomeSent = true;
      updateUser(existing);
    }

    if (trusted) {
      // Skip 2FA if this device is trusted
      login({
        id: existing.id,
        email: existing.email,
        fullName: existing.fullName,
        companyName: existing.companyName,
        role: existing.role || "client",
      });
      const from = location.state?.from || "/client";
      navigate(from, { replace: true });
      return;
    }

    // Generate and "send" 2FA code
    const code = generateCode();
    sendEmail(
      existing.email,
      "Your FinSync login code",
      `Your login code is: ${code}`
    );

    setPendingUser(existing);
    setTwoFACode("");
    setStep("2fa");
    setError("");
  };

  const handleSubmit2FA = (e) => {
    e.preventDefault();
    if (!pendingUser) {
      setError("Session expired. Please log in again.");
      setStep("credentials");
      return;
    }

    // In a real system, you'd verify this code server-side
    // and NOT store it client-side. Here we simply accept "123456"
    // as a dev shortcut or the one we logged to console.
    if (!twoFACode || twoFACode.length < 6) {
      setError("Please enter the 6-digit code.");
      return;
    }

    // For the prototype, any 6-digit code works; in dev, you can read the console.
    if (rememberDevice) {
      localStorage.setItem(`fs_trusted_${pendingUser.id}`, "true");
    }

    login({
      id: pendingUser.id,
      email: pendingUser.email,
      fullName: pendingUser.fullName,
      companyName: pendingUser.companyName,
      role: pendingUser.role || "client",
    });

    const from = location.state?.from || "/client";
    navigate(from, { replace: true });
  };

  const goToSignup = () => {
    const from = location.state?.from;
    navigate("/signup", { state: { from } });
  };

  const goToReset = () => {
    navigate("/reset-password");
  };

  return (
    <section className="section">
      <div className="auth-card">
        <h2>Client login</h2>
        <p className="auth-subtitle">
          Log in to access your client dashboard.
        </p>

        {step === "credentials" && (
          <form
            onSubmit={handleSubmitCredentials}
            className="auth-form"
          >
            <label className="field-label">
              Email
              <input
                type="email"
                className="field-input"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </label>

            <PasswordInput
              label="Password"
              value={password}
              onChange={setPassword}
              showRequirements={false}
            />

            {error && <div className="auth-error">{error}</div>}

            <button type="submit" className="btn-primary auth-btn">
              Continue
            </button>
          </form>
        )}

        {step === "2fa" && (
          <form onSubmit={handleSubmit2FA} className="auth-form">
            <p className="booking-note">
              We&apos;ve sent a 6-digit login code to your email
              (simulated). Enter it below to complete login.
            </p>
            <label className="field-label">
              6-digit code
              <input
                type="text"
                className="field-input"
                maxLength={6}
                value={twoFACode}
                onChange={(e) => setTwoFACode(e.target.value)}
                required
              />
            </label>
            <label className="field-label" style={{ flexDirection: "row", gap: "0.4rem" }}>
              <input
                type="checkbox"
                checked={rememberDevice}
                onChange={(e) =>
                  setRememberDevice(e.target.checked)
                }
              />
              <span style={{ fontSize: "0.82rem" }}>
                Don&apos;t ask for a code again on this device.
              </span>
            </label>

            {error && <div className="auth-error">{error}</div>}

            <button type="submit" className="btn-primary auth-btn">
              Complete login
            </button>
          </form>
        )}

        <p className="auth-footer">
          Don&apos;t have an account yet?{" "}
          <button
            type="button"
            className="link-inline"
            onClick={goToSignup}
          >
            Sign up
          </button>
        </p>
        <p className="auth-footer">
          Forgot your password?{" "}
          <button
            type="button"
            className="link-inline"
            onClick={goToReset}
          >
            Reset it
          </button>
        </p>
      </div>
    </section>
  );
}

// SIGNUP PAGE
function SignupPage() {
  const { user, login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [fullName, setFullName] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (user) {
      navigate("/client", { replace: true });
    }
  }, [user, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!isPasswordStrong(password)) {
      setError("Please choose a stronger password.");
      return;
    }

    const existing = getUserByEmail(email);
    if (existing) {
      setError("An account with that email already exists.");
      return;
    }

    const passwordHash = await hashPassword(password);
    const isAdmin = ADMIN_EMAILS.includes(email.toLowerCase());

    const newUser = {
      id:
        (crypto.randomUUID && crypto.randomUUID()) ||
        Date.now().toString(),
      fullName,
      companyName: companyName || null,
      email,
      passwordHash,
      role: isAdmin ? "admin" : "client",
      verified: true, // In real app, set to false until email verified.
      welcomeSent: false,
      createdAt: new Date().toISOString(),
    };

    const users = loadUsers();
    saveUsers([...users, newUser]);

    // Simulated verification + welcome email
    sendEmail(
      email,
      "Welcome to FinSync Solutions",
      "Thanks for signing up. This is where a real welcome/verification email would go."
    );

    login({
      id: newUser.id,
      email: newUser.email,
      fullName: newUser.fullName,
      companyName: newUser.companyName,
      role: newUser.role,
    });

    const from = location.state?.from || "/client";
    navigate(from, { replace: true });
  };

  return (
    <section className="section">
      <div className="auth-card">
        <h2>Create your client account</h2>
        <p className="auth-subtitle">
          Sign up to access your client dashboard.
        </p>

        <form onSubmit={handleSubmit} className="auth-form">
          <label className="field-label">
            Full name
            <input
              type="text"
              className="field-input"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
            />
          </label>

          <label className="field-label">
            Company name (optional)
            <input
              type="text"
              className="field-input"
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
            />
          </label>

          <label className="field-label">
            Email
            <input
              type="email"
              className="field-input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </label>

          <PasswordInput
            label="Password"
            value={password}
            onChange={setPassword}
            showRequirements={true}
          />

          {error && <div className="auth-error">{error}</div>}

          <button type="submit" className="btn-primary auth-btn">
            Sign up
          </button>
        </form>

        <p className="auth-footer">
          Already have an account?{" "}
          <Link to="/login" className="link-inline">
            Log in
          </Link>
        </p>
      </div>
    </section>
  );
}

// RESET PASSWORD PAGE (prototype)
function ResetPasswordPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const handleReset = async (e) => {
    e.preventDefault();
    setError("");
    setMessage("");

    const userRecord = getUserByEmail(email);
    if (!userRecord) {
      setError("No account found with that email.");
      return;
    }

    if (!isPasswordStrong(newPassword)) {
      setError("New password does not meet requirements.");
      return;
    }

    const passwordHash = await hashPassword(newPassword);
    userRecord.passwordHash = passwordHash;
    updateUser(userRecord);

    sendEmail(
      email,
      "Your FinSync password was reset",
      "In a real system this email confirms your password change."
    );

    setMessage("Password updated. You can now log in.");
  };

  const goToLogin = () => navigate("/login");

  return (
    <section className="section">
      <div className="auth-card">
        <h2>Reset password</h2>
        <p className="auth-subtitle">
          In production, this would come from a secure email link. Here
          we simulate the same outcome.
        </p>

        <form onSubmit={handleReset} className="auth-form">
          <label className="field-label">
            Account email
            <input
              type="email"
              className="field-input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </label>

          <PasswordInput
            label="New password"
            value={newPassword}
            onChange={setNewPassword}
            showRequirements={true}
          />

          {error && <div className="auth-error">{error}</div>}
          {message && (
            <div className="booking-message">{message}</div>
          )}

          <button type="submit" className="btn-primary auth-btn">
            Update password
          </button>
        </form>

        <p className="auth-footer">
          Ready to log in?{" "}
          <button
            type="button"
            className="link-inline"
            onClick={goToLogin}
          >
            Back to login
          </button>
        </p>
      </div>
    </section>
  );
}

// NOT FOUND
function NotFoundPage() {
  return (
    <section className="section">
      <div className="section-header">
        <h2>Page not found</h2>
        <p>
          The page you&apos;re looking for doesn&apos;t exist.
          Use the navigation above to get back on track.
        </p>
      </div>
    </section>
  );
}

// ---------- Root App ----------
export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppShell />
      </AuthProvider>
    </BrowserRouter>
  );
}
