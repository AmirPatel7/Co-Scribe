import { Link, useNavigate } from "react-router-dom";
import React, { useEffect, useState } from "react";
// import dotenv from "dotenv";

// dotenv.config();

const Login: React.FC = () => {
  const [displayText, setDisplayText] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const [typingSpeed, setTypingSpeed] = useState(200);
  const [email, setEmail] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string>(""); // Error state
  const [rememberMe, setRememberMe] = useState(false);
  const BASE_URL = "http://159.203.189.208"

  const fullText = "Co-Scribe";
  const cursor = "|";

  const navigate = useNavigate();

  useEffect(() => {
    const handleTyping = () => {
      let currentText = "";

      if (isDeleting) {
        currentText = fullText.substring(0, displayText.length - 1);
      } else {
        currentText = fullText.substring(0, displayText.length + 1);
      }

      setDisplayText(currentText);

      if (!isDeleting && currentText === fullText) {
        setTimeout(() => setIsDeleting(true), 2000);
      } else if (isDeleting && currentText === "") {
        setIsDeleting(false);
      }

      setTypingSpeed(isDeleting ? 100 : 200);
    };

    const typingTimeout = setTimeout(handleTyping, typingSpeed);
    return () => clearTimeout(typingTimeout);
  }, [displayText, isDeleting, typingSpeed]);

  const handleLogin = async () => {
    const trimmedEmail = email.trim();
    const trimmedPassword = password.trim();
    let checkEmail = true;
    let checkPassword = true;

    if (!trimmedEmail) {
      setError("Email field is required");
      checkEmail = false;
    } else if (/\s/.test(trimmedEmail)) {
      setError("Email cannot contain spaces");
      checkEmail = false;
    } else if (!/\S+@\S+\.\S+/.test(trimmedEmail)) {
      setError("Invalid Email address");
      checkEmail = false;
    } else if (!trimmedPassword) {
      setError("Password field is required");
      checkPassword = false;
    } else if (/\s/.test(trimmedPassword)) {
      setError("Password cannot contain spaces");
      checkPassword = false;
    } else if (trimmedPassword.length < 8) {
      setError("Password must be at least 8 characters");
      checkPassword = false;
    } else if (!/[A-Z]/.test(trimmedPassword)) {
      setError("Password must contain at least one uppercase letter");
      checkPassword = false;
    } else if (!/[a-z]/.test(trimmedPassword)) {
      setError("Password must contain at least one lowercase letter");
      checkPassword = false;
    } else if (!/\d/.test(trimmedPassword)) {
      setError("Password must contain at least one number");
      checkPassword = false;
    } else if (!/[^a-zA-Z0-9]/.test(trimmedPassword)) {
      setError("Password must contain at least one special character");
      checkPassword = false;
    }

    if (checkEmail && checkPassword) {
      setError(""); // Clear error if validation passes
      try {
        const response = await fetch(`${BASE_URL}:3000/login`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            email: trimmedEmail,
            password: trimmedPassword,
          }),
        });

        if (response.ok) {
          const data = await response.json();
          const token = data.token;
          if (rememberMe) {
            const response2 = await fetch(`${BASE_URL}:3000/remember-me`, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                email: trimmedEmail,
              }),
            });

            if (response2.ok) {
              const data2 = await response2.json();
              const rememberMeToken = data2.token;
              localStorage.setItem('token', rememberMeToken);  // Store token in localStorage if Remember Me is checked
              sessionStorage.setItem('token', token);  // Store token in sessionStorage otherwise
            }
          
          } else {
            sessionStorage.setItem('token', token);  // Store token in sessionStorage otherwise
          }
          navigate("/dashboard/all");
        } else {
          const errorData = await response.json();
          setError(errorData.message || "Login failed");
        }
      } catch (error) {
        console.error("Login error:", error);
        setError("An unexpected error occurred");
      }
    }
  };

  return (
    <main
      className="h-screen flex flex-col lg:flex-row items-center justify-between px-6 md:px-10 lg:px-20"
      style={{
        background: "linear-gradient(135deg, #162A2C 0%, #2F3E46 100%)",
        justifyContent: "center",
        alignItems: "center",
      }}
    >
      {/* Left section: Title */}
      <div className="title-container ml-auto w-full lg:w-1/2 lg:ml-12 lg:pr-10 mb-10 lg:mb-0 text-center lg:text-left">
        <h1
          className="text-4xl md:text-5xl lg:text-6xl"
          style={{ color: "#F4EFE6", fontFamily: "Latin Modern Roman, serif" }}
        >
          {displayText}
          <span className="blinking-cursor">{cursor}</span>
        </h1>
        <h2
          className="text-xl md:text-2xl lg:text-3xl mt-4"
          style={{
            color: "#F4EFE6",
            fontFamily: "Latin Modern Roman, serif",
            fontStyle: "italic",
          }}
        >
          A collaborative markdown tool
        </h2>
      </div>

      {/* Right section: Login form */}
      <div className="login-container w-full sm:w-4/5 md:w-3/5 lg:w-1/3 p-6 md:p-8 lg:p-10 shadow-lg relative rounded-lg bg-[#F4EFE6] text-[#354F52] lg:mt-0 mt-5 sm:mt-8 md:mt-10">
        <div className="relative z-10">
          <h3
            className="text-xl pr-10 md:text-2xl lg:text-2xl mb-6 text-center"
            style={{
              color: "#156064",
              fontFamily: "Latin Modern Roman, serif",
            }}
          >
            Login
          </h3>

          {/* Error message display */}
          {error && (
            <div
              className="w-full text-center text-red-600 bg-red-100 p-3 rounded mb-4"
              role="alert"
            >
              {error}
            </div>
          )}

          {/* Email input */}
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full p-3 pr-14 mb-4 border-b-2 text-center focus:outline-none"
            style={{ borderBottomColor: "#156064", backgroundColor: "#F4EFE6" }}
          />

          {/* Password input */}
          <div className="relative">
            <input
              type={showPassword ? "text" : "password"}
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full p-3 pr-14 mb-4 border-b-2 text-center focus:outline-none"
              style={{
                borderBottomColor: "#156064",
                backgroundColor: "#F4EFE6",
              }}
            />
            <button
              type="button"
              onClick={() => {
                setShowPassword(!showPassword);
              }}
              className="absolute right-3 top-1/3 transform -translate-y-1/2 text-base font-semibold transition-colors duration-300"
              onMouseOver={(e) => (e.currentTarget.style.color = "#686867")}
              onMouseOut={(e) => (e.currentTarget.style.color = "#156064")}
              style={{ color: "#156064" }}
            >
              {showPassword ? "Hide" : "Show"}
            </button>
          </div>

          {/* Login button */}
          <button
            className="w-full py-3 pr-10 rounded-lg font-bold mb-4 transition-colors duration-300"
            style={{ backgroundColor: "#354F52", color: "white" }}
            onMouseOver={(e) =>
              (e.currentTarget.style.backgroundColor = "#686867")
            }
            onMouseOut={(e) =>
              (e.currentTarget.style.backgroundColor = "#354F52")
            }
            onClick={handleLogin}
          >
            Login
          </button>

          <div className="flex justify-between items-center mb-5">
            {/* Remember me option */}
            <div className="input-group">
              <input
                type="checkbox"
                id="rememberMe"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="mr-2 w-4 h-4 border border-black rounded-sm"
              />
              <label htmlFor="rememberMe">Remember Me</label>
            </div>

            {/* Forgot password link */}
            <div className="text-right mb-5">
              <a
                href="ForgotPassword"
                className="font-semibold transition-colors duration-300"
                style={{ color: "#156064" }}
                onMouseOver={(e) => (e.currentTarget.style.color = "#686867")}
                onMouseOut={(e) => (e.currentTarget.style.color = "#156064")}
              >
                Forgot Password?
              </a>
            </div>
          </div>

          {/* Sign-up link */}
          <p className="text-center">
            Don't have an account?{" "}
            <Link
              to="/signup"
              className="font-semibold transition-colors duration-300"
              style={{ color: "#156064" }}
              onMouseOver={(e) => (e.currentTarget.style.color = "#686867")}
              onMouseOut={(e) => (e.currentTarget.style.color = "#156064")}
            >
              Sign Up
            </Link>
          </p>
        </div>
      </div>

      {/* Add the following media query */}
      <style>{`
        @media (max-width: 640px) {
          .login-container {
            width: 90%;
            margin-top: 2rem;
            margin-bottom: auto;
            position: relative;
          }

          .title-container {
            margin-bottom: 1.5rem;
            text-align: center;
          }

          .title-container h1 {
            font-size: 2rem;
          }

          .title-container h2 {
            font-size: 1rem;
          }
        }
      `}</style>
    </main>
  );
};

export default Login;



