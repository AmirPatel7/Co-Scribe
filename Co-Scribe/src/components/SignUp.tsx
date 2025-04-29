import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiArrowLeft } from 'react-icons/fi';
// import dotenv from "dotenv";

// dotenv.config();
const BASE_URL="http://159.203.189.208"

const SignUp: React.FC = () => {
    const [displayText, setDisplayText] = useState(''); // State to hold the current text being displayed
    const [isDeleting, setIsDeleting] = useState(false); // State to track if we are deleting (true) or typing (false)
    const [typingSpeed, setTypingSpeed] = useState(200); // State to control the typing and backspacing speed
    const [step, setStep] = useState(1); // State to track the current step

    const [username, setUsername] = useState<string>('');
    const [email, setEmail] = useState<string>('');
    const [password, setPassword] = useState<string>('');
    const [showPassword, setShowPassword] = useState(false);
    const [profileImage, setProfileImage] = useState<File | null>(null);
    const [error, setError] = useState<string>(''); // State to track the error messages
    const [isSubmitting, setIsSubmitting] = useState(false); // To handle submission loading state

    const fullText = 'Co-Scribe';
    const cursor = '|';
    const navigate = useNavigate();

    // Typing animation effect
    useEffect(() => {
        const handleTyping = () => {
            let currentText = '';

            if (isDeleting) {
                currentText = fullText.substring(0, displayText.length - 1);
            } else {
                currentText = fullText.substring(0, displayText.length + 1);
            }

            setDisplayText(currentText);

            if (!isDeleting && currentText === fullText) {
                setTimeout(() => setIsDeleting(true), 2000);
            } else if (isDeleting && currentText === '') {
                setIsDeleting(false);
            }

            setTypingSpeed(isDeleting ? 100 : 200);
        };

        const typingTimeout = setTimeout(handleTyping, typingSpeed);
        return () => clearTimeout(typingTimeout);
    }, [displayText, isDeleting, typingSpeed]);

    // Username validation and continue to next step
    const handleUsername = () => {
        const trimmedUsername = username.trim();

        if (!trimmedUsername) {
            setError("Username field is required!");
        } else if (/\s/.test(trimmedUsername)) {
            setError("Username cannot contain spaces!");
        } else if (trimmedUsername.length < 4) {
            setError("Username needs to be at least 4 characters");
        } else {
            setError('');
            setStep(step + 1);
            setUsername(trimmedUsername);
        }
    };

    // Email and password validation and continue to next step
    const handleEmailAndPassword = () => {
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
            setError("Password cannot contain spaces!");
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
            setError('');
            setStep(step + 1);
            setEmail(trimmedEmail);
            setPassword(trimmedPassword);
        }
    };

    // Image upload validation
    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file && (file.type === 'image/jpeg' || file.type === 'image/png' || file.type === 'image/jpg')) {
            setProfileImage(file);
            setError('');
        } else {
            setError("Invalid file format: only accepts jpg, jpeg, or png");
            setProfileImage(null);
        }
    };

    const handleComplete = async () => {
        if (!profileImage) {
            setError("Profile Image field is required!");
        } else {
            try {
                setIsSubmitting(true);

                const requestData = {
                    email,
                    username,
                    password,
                };

                const response = await fetch(`${BASE_URL}:3000/add-user`, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify(requestData),
                });

                const data = await response.json();

                if (response.ok) {
                    sendImage();
                    navigate('/login');
                } else {
                    setError(data.message || "An error occurred during signup.");
                }
            } catch (error) {
                console.error("Error during signup:", error);
                setError("An error occurred while trying to sign up.");
            } finally {
                setIsSubmitting(false);
            }
        }
    };

    const handleSkip = async () => {
        
        try {
            setIsSubmitting(true);

            const requestData = {
                email,
                username,
                password,
            };

            const response = await fetch(`${BASE_URL}:3000/add-user`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(requestData),
            });

            const data = await response.json();

            if (response.ok) {
                navigate('/login');
            } else {
                setError(data.message || "An error occurred during signup.");
            }
        } catch (error) {
            console.error("Error during signup:", error);
            setError("An error occurred while trying to sign up.");
        } finally {
            setIsSubmitting(false);
        }

    };

    const sendImage = async () => {
        if (!profileImage) {
            alert("Profile Image field is required!");
        } else {
            try {

                const formData = new FormData();
                formData.append('profileImage', profileImage);
                formData.append('email', email);
                const response = await fetch(`${BASE_URL}:3000/add-image`, {
                    method: "POST",
                    body: formData,
                });

                const data = await response.json();

                if (response.ok) {
                    return;
                } else {
                    alert(data.message || "An error occurred during signup.");
                }
            } catch (error) {
                console.error("Error during signup:", error);
                alert("An error occurred while trying to sign up.");
            }
        }
    };
    
    const handleBack = () => {
        if (step > 1) {
            setStep(step - 1);
        }
    };

    return (
        <main className="h-screen flex flex-col items-center justify-start px-6 md:px-10 lg:px-20" style={{ background: "linear-gradient(135deg, #162A2C 0%, #2F3E46 100%)" }}>
            {/* Co-Scribe title and subtitle */}
            <div className="w-full text-center my-10">
                <h2 className="text-2xl md:text-3xl lg:text-4xl mb-2" style={{ color: '#F4EFE6', fontFamily: 'Latin Modern Roman, serif' }}>Welcome to</h2>
                <h1 className="text-4xl md:text-5xl lg:text-6xl" style={{ color: '#F4EFE6', fontFamily: 'Latin Modern Roman, serif' }}>
                    {displayText}
                    <span className="blinking-cursor">{cursor}</span>
                </h1>
                <h2 className="text-xl md:text-2xl lg:text-3xl mt-4" style={{ color: '#F4EFE6', fontFamily: 'Latin Modern Roman, serif', fontStyle: 'italic' }}>
                    A collaborative markdown tool
                </h2>
                <h2 className="text-xl md:text-2xl lg:text-3xl mt-20" style={{ color: '#F4EFE6', fontFamily: 'Latin Modern Roman, serif', fontStyle: 'italic' }}>
                    Create Account
                </h2>
            </div>

            {/* Step cards */}
            <div className="w-full max-w-lg p-8 shadow-lg relative rounded-lg mt-3" style={{ backgroundColor: '#F4EFE6', color: '#354F52' }}>
                <div className="relative z-10">

                    {step > 1 && (
                        <button className="absolute top-0 left-0 mt-2 text-xl" onClick={handleBack}>
                            <FiArrowLeft style={{ color: '#354F52' }} />
                        </button>
                    )}

                    {step === 1 && (
                        <>
                            <h3 className="text-2xl mb-6 text-center" style={{ color: '#156064', fontFamily: 'Latin Modern Roman, serif' }}>
                                Step 1: Enter a username
                            </h3>
                            <input
                                type="text"
                                placeholder="Username"
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                className="w-full p-3 mb-4 border-b-2 text-center focus:outline-none"
                                style={{ borderBottomColor: '#156064', backgroundColor: '#F4EFE6' }}
                            />
                            {error && (
                                <div className="w-full text-center text-red-600 bg-red-100 p-3 rounded mb-4">
                                    {error}
                                </div>
                            )}
                            <button
                                className="w-full py-3 rounded-lg font-bold mb-4 transition-colors duration-300"
                                style={{ backgroundColor: '#354F52', color: 'white' }}
                                onMouseOver={(e) => (e.currentTarget.style.backgroundColor = '#686867')}
                                onMouseOut={(e) => (e.currentTarget.style.backgroundColor = '#354F52')}
                                onClick={handleUsername}
                            >
                                Continue
                            </button>
                        </>
                    )}
                    {step === 2 && (
                        <>
                            <h3 className="text-2xl mb-6 text-center" style={{ color: '#156064', fontFamily: 'Latin Modern Roman, serif' }}>
                                Step 2: Enter your email and password
                            </h3>
                            <input
                                type="email"
                                placeholder="Email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="w-full p-3 pr-14 mb-4 border-b-2 text-center focus:outline-none"
                                style={{ borderBottomColor: '#156064', backgroundColor: '#F4EFE6' }}
                            />
                            <div className="relative">
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    placeholder="Password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="w-full p-3 pr-14 mb-4 border-b-2 text-center focus:outline-none"
                                    style={{ borderBottomColor: '#156064', backgroundColor: '#F4EFE6' }}
                                />
                                <button
                                    type="button"
                                    onClick={() => { setShowPassword(!showPassword) }}
                                    className="absolute right-3 top-1/3 transform -translate-y-1/2 text-base font-semibold transition-colors duration-300"
                                    style={{ color: '#156064' }}
                                >
                                    {showPassword ? 'Hide' : 'Show'}
                                </button>
                            </div>
                            {error && (
                                <div className="w-full text-center text-red-600 bg-red-100 p-3 rounded mb-4">
                                    {error}
                                </div>
                            )}
                            <button
                                className="w-full py-3 pr-10 rounded-lg font-bold mb-4 transition-colors duration-300"
                                style={{ backgroundColor: '#354F52', color: 'white' }}
                                onMouseOver={(e) => (e.currentTarget.style.backgroundColor = '#686867')}
                                onMouseOut={(e) => (e.currentTarget.style.backgroundColor = '#354F52')}
                                onClick={handleEmailAndPassword}
                            >
                                Continue
                            </button>
                        </>
                    )}
                    {step === 3 && (
                        <>
                            <h3 className="text-2xl mb-6 text-center" style={{ color: '#156064', fontFamily: 'Latin Modern Roman, serif' }}>
                                Step 3: Upload profile image
                            </h3>
                            <input
                                type="file"
                                accept=".jpg,.jpeg,.png"
                                onChange={handleImageUpload}
                                className="w-full p-3 mb-4 border-b-2 text-center focus:outline-none"
                                style={{ borderBottomColor: '#156064', backgroundColor: '#F4EFE6' }}
                            />
                            {error && (
                                <div className="w-full text-center text-red-600 bg-red-100 p-3 rounded mb-4">
                                    {error}
                                </div>
                            )}
                            <div className="flex space-x-4">

                                <button
                                    className="w-full py-3 rounded-lg font-bold mb-4 transition-colors duration-300"
                                    style={{ backgroundColor: '#354F52', color: 'white' }}
                                    onMouseOver={(e) => (e.currentTarget.style.backgroundColor = '#686867')}
                                    onMouseOut={(e) => (e.currentTarget.style.backgroundColor = '#354F52')}
                                    onClick={handleSkip}>
                                    Skip
                                </button>
                                <button
                                    className="w-full py-3 rounded-lg font-bold mb-4 transition-colors duration-300"
                                    style={{ backgroundColor: '#354F52', color: 'white' }}
                                    onMouseOver={(e) => (e.currentTarget.style.backgroundColor = '#686867')}
                                    onMouseOut={(e) => (e.currentTarget.style.backgroundColor = '#354F52')}
                                    onClick={handleComplete}
                                    disabled={isSubmitting}
                                >
                                    {isSubmitting ? 'Signing Up...' : 'Complete'}
                                </button>
                            </div>
                        </>
                    )}

                    {/* Step dots */}
                    <div className={`flex justify-center mt-4 ${step === 2 ? 'pr-10' : ''}`}>
                        {[1, 2, 3].map((dot) => (
                            <div
                                key={dot}
                                className={`h-3 w-3 rounded-full mx-1 ${step === dot ? '' : 'bg-gray-400'}`}
                                style={{
                                    backgroundColor: step === dot ? '#354F52' : 'gray',
                                    transition: 'background-color 0.3s',
                                }}
                            />
                        ))}
                    </div>
                </div>
            </div>
        </main>
    );
};

export default SignUp;









