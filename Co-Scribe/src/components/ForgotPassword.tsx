import React, { useState } from 'react';
import { FiArrowLeft } from 'react-icons/fi';
import { useNavigate } from 'react-router-dom';

const ForgotPassword: React.FC = () => {
    const [step, setStep] = useState(1);
    const [email, setEmail] = useState<string>('');
    const [verificationCode, setVerificationCode] = useState<string>('');
    const [newPassword, setNewPassword] = useState<string>('');
    const [confirmPassword, setConfirmPassword] = useState<string>('');
    const [showNewPassword, setShowNewPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [error, setError] = useState<string>('');

    const BASE_URL = "http://159.203.189.208";

    const navigate = useNavigate();

    // Email Alert
    const handleEmailSubmit = async () => {
        if (!/\S+@\S+\.\S+/.test(email)) {
            setError('Please enter a valid email address');
        } else {
            try {
                const response = await fetch(`${BASE_URL}:3000/forgot-password`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email }),
                });
                
                if (response.ok) {
                    setStep(2);  // Move to the next step to enter verification code
                } else {
                    setError('Error sending verification email');
                }
            } catch (error) {
                setError('Failed to send verification email');
            }
            setStep(2);
        }
    };

    // Verification Alert
    const handleCodeSubmit = async () => {
        if (verificationCode.trim() === '') {
            setError('Please enter the verification code');
        } else {

            // Call the verification endpoint
            const response = await fetch(`${BASE_URL}:3000/verify-code`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    email, 
                    code: verificationCode,
                }),
            });

            const data = await response.json();

            if (response.ok) {
                // If verification is successful, proceed to the next step
                setError('');
                setStep(3);
            } else {
                // If verification fails, show the error message returned by the backend
                setError(data.message || 'Verification failed. Please try again.');
            }
        }
    };

    // Password Alert
    const handlePasswordSubmit = async () => {
        if (!newPassword || newPassword.length < 8) {
            setError('Password must be at least 8 characters long');
        } else if (newPassword !== confirmPassword) {
            setError('Passwords do not match');
        } else if (!/[A-Z]/.test(newPassword)) {
            setError('Password must contain at least one uppercase letter');
        } else if (!/[a-z]/.test(newPassword)) {
            setError('Password must contain at least one lowercase letter');
        } else if (!/\d/.test(newPassword)) {
            setError('Password must contain at least one number');
        } else if (!/[^a-zA-Z0-9]/.test(newPassword)) {
            setError('Password must contain at least one special character');
        } else {
            try {
                const response = await fetch(`${BASE_URL}:3000/reset-password`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        email,
                        newPassword,
                    }),
                });
        
                if (response.ok) {
                    navigate('/login');
                } else {
                    setError('Invalid verification code or error resetting password');
                }
            } catch (error) {
                setError('Server error resetting password');
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
            {/* Forgot Password Title */}
            <div className="w-full text-center my-10">
                <h2 className="text-2xl md:text-3xl lg:text-4xl mb-2" style={{ color: '#F4EFE6', fontFamily: 'Latin Modern Roman, serif' }}>Forgot Your Password?</h2>
                <h3 className="text-xl md:text-2xl lg:text-2xl mt-4" style={{ color: '#F4EFE6', fontFamily: 'Latin Modern Roman, serif', fontStyle: 'italic' }}>
                    Just follow these 3 Easy Steps
                </h3>
            </div>

            {/* Step Blocks*/}
            <div className="w-full max-w-lg p-8 shadow-lg relative rounded-lg mt-3" style={{ backgroundColor: '#F4EFE6', color: '#354F52' }}>
                <div className="relative z-10">

                    {step > 1 && (
                        <button className="absolute top-0 left-0 mt-2 text-xl" onClick={handleBack}>
                            <FiArrowLeft style={{ color: '#354F52' }} />
                        </button>
                    )}

                    {/* Step 1: Email Input */}
                    {step === 1 && (
                        <>
                            <h3 className="text-2xl mb-6 text-center" style={{ color: '#156064', fontFamily: 'Latin Modern Roman, serif' }}>
                                Step 1: Enter Your Email
                            </h3>
                            <input
                                type="email"
                                placeholder="Enter Email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="w-full p-3 mb-4 border-b-2 text-center focus:outline-none"
                                style={{ borderBottomColor: '#156064', backgroundColor: '#F4EFE6' }}
                            />
                            {/* Display email error if any */}
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
                                onClick={handleEmailSubmit}
                            >
                                Continue
                            </button>
                        </>
                    )}

                    {/* Step 2: Verification Code Input */}
                    {step === 2 && (
                        <>
                            <h3 className="text-2xl mb-6 text-center" style={{ color: '#156064', fontFamily: 'Latin Modern Roman, serif' }}>
                                Step 2: Enter Verification Code
                            </h3>
                            <input
                                type="text"
                                placeholder="Enter Verification Code"
                                value={verificationCode}
                                onChange={(e) => setVerificationCode(e.target.value)}
                                className="w-full p-3 mb-4 border-b-2 text-center focus:outline-none"
                                style={{ borderBottomColor: '#156064', backgroundColor: '#F4EFE6' }}
                            />
                            {/* Display verification code error if any */}
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
                                onClick={handleCodeSubmit}
                            >
                                Continue
                            </button>
                        </>
                    )}

                    {/* Step 3: New Password + Confirm Password Input */}
                    {step === 3 && (
                        <>
                            <h3 className="text-2xl mb-6 text-center" style={{ color: '#156064', fontFamily: 'Latin Modern Roman, serif' }}>
                                Step 3: Enter New Password
                            </h3>
                            <div className="relative">
                                <input
                                    type={showNewPassword ? 'text' : 'password'}
                                    placeholder="New Password"
                                    value={newPassword}
                                    onChange={(e) => setNewPassword(e.target.value)}
                                    className="w-full p-3 mb-4 border-b-2 text-center focus:outline-none"
                                    style={{ borderBottomColor: '#156064', backgroundColor: '#F4EFE6' }}
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowNewPassword(!showNewPassword)}
                                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-sm font-semibold transition-colors duration-300"
                                    style={{ color: '#156064' }}
                                >
                                    {showNewPassword ? 'Hide' : 'Show'}
                                </button>
                            </div>

                            {/* Confirm Password */}
                            <div className="relative">
                                <input
                                    type={showConfirmPassword ? 'text' : 'password'}
                                    placeholder="Confirm New Password"
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    className="w-full p-3 mb-4 border-b-2 text-center focus:outline-none"
                                    style={{ borderBottomColor: '#156064', backgroundColor: '#F4EFE6' }}
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-sm font-semibold transition-colors duration-300"
                                    style={{ color: '#156064' }}
                                >
                                    {showConfirmPassword ? 'Hide' : 'Show'}
                                </button>
                            </div>

                            {/* Display password error */}
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
                                onClick={handlePasswordSubmit}
                            >
                                Reset Password
                            </button>
                        </>
                    )}

                    {/* Step indicators */}
                    <div className={`flex justify-center mt-4 ${step === 2 || step === 3 ? 'pr-10' : ''}`}>
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

export default ForgotPassword;





