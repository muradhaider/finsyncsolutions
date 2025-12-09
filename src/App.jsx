// src/App.jsx
// FinSync Solutions – multi-page prototype with auth + booking + better UX
// NOTE: Auth & booking are still front-end only (localStorage + hashing).
// A real production app will need a secure backend, database, and proper auth.

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
import logo from "./assets/finsync-logo.png"; // <-- make sure this exists

// ---------- Auth context & simple storage helpers ----------

const AuthContext = createContext(null);

function useAuth() {
  return useContext(AuthContext);
}

function loadUsers() {
  const raw = localStorage.getItem("fs_users");
  return raw ? JSON.parse(raw) : [];
}

function saveUsers(users) {
  localStorage.setItem("fs_users", JSON.stringify(users));
}

function loadBookings() {
  const raw = localStorage.getItem("fs_bookings");
  return raw ? JSON.parse(raw) : [];
}

function saveBookings(bookings) {
  localStorage.setItem("fs_bookings", JSON.stringify(bookings));
}

// Simple password hashing (SHA-256 via Web Crypto).
// This only protects how passwords are stored locally and does NOT replace
// proper server-side hashing + TLS for a real production app.
async function hashPassword(password) {
  try {
    if (!window.crypto?.subtle) {
      // Fallback – not ideal, but keeps the app running on older browsers.
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

// Protects routes that need a logged-in user
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

  return (
    <div className="app-root">
      <div className="app-bg-grid" />
      <div className="app-bg-radial" />

      <div className="app-shell">
        {/* NAVBAR */}
        <header className="nav">
          <div className="nav-left">
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

          <nav className="nav-links">
            <button
              className="nav-link-btn"
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
            <button
              className="nav-link-btn nav-link-btn--primary"
              onClick={handleClientClick}
            >
              {user ? "Client Portal" : "Client Login"}
            </button>
            {user && (
              <button
                className="nav-link-btn nav-link-btn--subtle"
                onClick={handleLogoutClick}
              >
                Logout
              </button>
            )}
          </nav>
        </header>

        {/* MAIN PAGES */}
        <main>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route
              path="/client"
              element={
                <RequireAuth>
                  <ClientHomePage />
                </RequireAuth>
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

// Password input with show/hide and optional rules display
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

// Panel used on landing + client home (demo data for now)
function LandingPanel() {
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
          finsync@client-ledger • live
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
            Cash flow
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
                  ✅ Up to date
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
                ▸ week 02 ·  $8,950 · payroll + rent
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
                  Heads up
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

// HOME / LANDING PAGE
function HomePage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const handleBookCall = () => {
    if (user) {
      navigate("/book-call");
    } else {
      navigate("/login", { state: { from: "/book-call" } });
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
            Sacramento · Remote friendly
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
          light AI assistance so your statements, cash flow and
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
            onClick={handleBookCall}
          >
            Book a 20 minute call
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
            Not a CPA firm – we handle day to day bookkeeping and
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

// CLIENT HOME (after login)
function ClientHomePage() {
  const { user } = useAuth();
  const [bookings, setBookings] = useState([]);

  const navigate = useNavigate();

  useEffect(() => {
    const all = loadBookings();
    if (user) {
      setBookings(all.filter((b) => b.userId === user.id));
    }
  }, [user]);

  const goToBooking = () => {
    navigate("/book-call");
  };

  return (
    <section className="section">
      <div className="section-header">
        <h2>Welcome back, {user?.fullName || "Client"}.</h2>
        <p>
          This is your client home. From here you can book or review
          your 20 minute calls and keep your bookkeeping engagement
          with FinSync Solutions organized.
        </p>
      </div>

      <div className="section-grid client-home-grid">
        <div className="feature-card">
          <h3>Your upcoming calls</h3>
          {bookings.length === 0 && (
            <p>
              You don&apos;t have any scheduled calls yet. Use the
              button below to pick a date and time.
            </p>
          )}
          {bookings.length > 0 && (
            <ul className="simple-list">
              {bookings.map((b) => (
                <li key={b.id}>
                  {b.date} · {b.time}
                </li>
              ))}
            </ul>
          )}
          <button
            type="button"
            className="btn-primary auth-btn"
            onClick={goToBooking}
          >
            Book a 20 minute call
          </button>
        </div>

        <div className="client-panel-wrapper">
          <div className="hero-panel">
            <LandingPanel />
          </div>
        </div>
      </div>
    </section>
  );
}

// BOOK A CALL PAGE (requires login)
function BookCallPage() {
  const { user } = useAuth();
  const [selectedDate, setSelectedDate] = useState(() =>
    formatDateInput(new Date())
  );
  const [bookings, setBookings] = useState(() => loadBookings());
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

  // simple time slots, 9:00–16:30 every 30min
  const timeSlots = [];
  for (let hour = 9; hour <= 16; hour++) {
    ["00", "30"].forEach((mins) => {
      if (hour === 16 && mins === "30") return;
      const h = hour.toString().padStart(2, "0");
      timeSlots.push(`${h}:${mins}`);
    });
  }

  const isTaken = (time) =>
    bookings.some(
      (b) => b.date === selectedDate && b.time === time
    );

  const handleBook = (time) => {
    if (!user) return;
    if (isTaken(time)) {
      setMessage("That slot was just taken. Please choose another.");
      return;
    }
    const newBooking = {
      id:
        (crypto.randomUUID && crypto.randomUUID()) ||
        Date.now().toString(),
      userId: user.id,
      date: selectedDate,
      time,
    };
    const updated = [...bookings, newBooking];
    setBookings(updated);
    saveBookings(updated);
    setMessage(
      `Booked ${selectedDate} at ${time}. You’ll receive a confirmation email shortly (placeholder).`
    );
  };

  return (
    <section className="section section--bordered">
      <div className="section-header">
        <h2>Book a 20 minute call</h2>
        <p>
          Choose a date and time that works for you. Each slot can only
          be booked once, so there&apos;s no double booking.
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
            {timeSlots.map((time) => {
              const taken = isTaken(time);
              return (
                <button
                  key={time}
                  type="button"
                  className={
                    "slot-btn" + (taken ? " slot-btn--taken" : "")
                  }
                  onClick={() => handleBook(time)}
                  disabled={taken}
                >
                  {time}
                  {taken && (
                    <span className="slot-label">Booked</span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}

// ABOUT PAGE (outline; content can be expanded later)
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
              <strong>[Curtis]</strong> – background in operations and
              finance, obsessed with clean systems and clear reporting.
            </li>
            <li>
              <strong>[Murad]</strong> – background in
              engineering/automation, focused on blending human judgment
              with AI assisted workflows.
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
          Whether you&apos;re exploring a clean up project or ongoing
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
              Or log in / sign up and book a 20 minute call directly
              from your client portal.
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}

// LOGIN PAGE
function LoginPage() {
  const { user, login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
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

    const users = loadUsers();
    const existing = users.find(
      (u) => u.email.toLowerCase() === email.toLowerCase()
    );

    if (!existing) {
      setError("Invalid email or password.");
      return;
    }

    const attemptedHash = await hashPassword(password);

    const matchesHashed =
      existing.passwordHash &&
      existing.passwordHash === attemptedHash;
    const matchesLegacy =
      existing.password &&
      existing.password === password; // fallback for any pre-hash test users

    if (!matchesHashed && !matchesLegacy) {
      setError("Invalid email or password.");
      return;
    }

    login({
      id: existing.id,
      email: existing.email,
      fullName: existing.fullName,
      companyName: existing.companyName,
    });

    const from = location.state?.from || "/client";
    navigate(from, { replace: true });
  };

  const goToSignup = () => {
    const from = location.state?.from;
    navigate("/signup", { state: { from } });
  };

  return (
    <section className="section">
      <div className="auth-card">
        <h2>Client login</h2>
        <p className="auth-subtitle">
          Log in to access your client home and booking tools.
        </p>

        <form onSubmit={handleSubmit} className="auth-form">
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
            Log in
          </button>
        </form>

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

    const users = loadUsers();
    const existing = users.find(
      (u) => u.email.toLowerCase() === email.toLowerCase()
    );
    if (existing) {
      setError("An account with that email already exists.");
      return;
    }

    const passwordHash = await hashPassword(password);

    const newUser = {
      id:
        (crypto.randomUUID && crypto.randomUUID()) ||
        Date.now().toString(),
      fullName,
      companyName: companyName || null,
      email,
      passwordHash, // hashed before storage
    };

    const updatedUsers = [...users, newUser];
    saveUsers(updatedUsers);

    login({
      id: newUser.id,
      email: newUser.email,
      fullName: newUser.fullName,
      companyName: newUser.companyName,
    });

    const from = location.state?.from || "/client";
    navigate(from, { replace: true });
  };

  return (
    <section className="section">
      <div className="auth-card">
        <h2>Create your client account</h2>
        <p className="auth-subtitle">
          Sign up to access your client portal and booking tools.
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
    <BrowserRouter basename="/finsyncsolutions">
      <AuthProvider>
        <AppShell />
      </AuthProvider>
    </BrowserRouter>
  );
}
