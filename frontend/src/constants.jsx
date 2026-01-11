const models = { 1: "DeepSeek-R1", 2: "QwQ-32B", 3: "知识库" };

// ============================================
// EMAIL VERIFICATION FEATURE TOGGLE
// ============================================
// Set to false to disable email verification UI during development/testing
// Set to true to enable email verification UI (production mode)
// When disabled: verification code input is hidden and optional
// When enabled: verification code input is shown and required
// 
// TODO: When email verification is ready for production:
// 1. Set EMAIL_VERIFICATION_ENABLED = true
// 2. Ensure backend email.verification.enabled is also set to true
// ============================================
const EMAIL_VERIFICATION_ENABLED = false;

export { models, EMAIL_VERIFICATION_ENABLED };
