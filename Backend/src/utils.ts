export const generateVerificationCode = (): string => {
    return Math.random().toString(36).substr(2, 5).toUpperCase(); // Generate a 5-character random code
};