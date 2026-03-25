import { useState } from "react";
import { Modal, View, Text, StyleSheet, TextInput, Pressable, TouchableWithoutFeedback, ActivityIndicator, Image } from "react-native";
import { Ionicons } from '@expo/vector-icons';
import { useSession } from "../../../utils/ctx";
import { useRouter } from "expo-router";
import { signUpWithCompany } from '../../../utils/api';
import { colors, spacing, borderRadius, shadows } from '../../../constants/theme';

/**
 * Sign Up Modal - Okta-inspired design
 * Allows the user to create a new account
 */
export default function SignUpModal({ visible, onClose, onSignIn }) {
  const { signIn } = useSession();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [focusedInput, setFocusedInput] = useState(null);
  const [companyName, setCompanyName] = useState("");
  const [fullName, setFullName] = useState("");
  const router = useRouter();


  async function handleSignUp() {
    setErrorMsg("");

    if (!fullName) {
      setErrorMsg("Please enter your full name.");
      return;
    }
    if (!companyName) {
      setErrorMsg("Please enter your company name.");
      return;
    }
    if (!email) {
      setErrorMsg("Please enter your email address.");
      return;
    }
    if (password !== confirmPassword) {
      setErrorMsg("Passwords do not match.");
      return;
    }
    if (!password || password.length < 6) {
      setErrorMsg("Password must be at least 6 characters.");
      return;
    }

    try {
      setIsLoading(true);

      const res = await signUpWithCompany(email, password, companyName, fullName);

      if (!res.success) {
        throw new Error(res.message);
      }

      await signIn(email, password);

      setFullName("");
      setCompanyName("");
      setEmail("");
      setPassword("");
      setConfirmPassword("");
      onClose();

      router.replace("/(app)/dashboard");

    } catch (err) {
      setErrorMsg(err.message || "Sign up failed. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }

  function handleClose() {
    setCompanyName("");
    setFullName("");
    setEmail("");
    setPassword("");
    setConfirmPassword("");
    setErrorMsg("");
    onClose();
  }

  function handleSignIn() {
    handleClose();
    if (onSignIn) onSignIn();
  }

  const passwordStrength = () => {
    if (!password) return null;
    if (password.length < 6) return { label: 'Too short', color: colors.semantic.error };
    if (password.length < 8) return { label: 'Weak', color: colors.semantic.warning };
    if (password.length >= 8 && /[A-Z]/.test(password) && /[0-9]/.test(password)) {
      return { label: 'Strong', color: colors.semantic.success };
    }
    return { label: 'Medium', color: colors.semantic.warning };
  };

  const strength = passwordStrength();

  return (
    <Modal transparent animationType="fade" visible={visible} onRequestClose={handleClose}>
      <TouchableWithoutFeedback onPress={handleClose}>
        <View style={styles.overlay}>
          <TouchableWithoutFeedback onPress={() => {}}>
            <View style={styles.modalContainer}>
              {/* Close Button */}
              <Pressable style={styles.closeButton} onPress={handleClose}>
                <Ionicons name="close" size={24} color={colors.text.secondary} />
              </Pressable>

              {/* Logo/Brand */}
              <View style={styles.brandContainer}>
                <Image 
                  source={require('../../../assets/images/CC_logo_nobackground.png')} 
                  style={styles.logoIcon}
                  resizeMode="contain"
                />
                <Text style={styles.logoText}>CrewConnect</Text>
              </View>

              <Text style={styles.title}>Create Account</Text>
              <Text style={styles.subtitle}>Start your 14-day free trial. No credit card required.</Text>

              {errorMsg ? (
                <View style={styles.errorContainer}>
                  <Ionicons name="alert-circle" size={18} color={colors.semantic.error} />
                  <Text style={styles.errorText}>{errorMsg}</Text>
                </View>
              ) : null}

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Company Name</Text>
                <View style={[
                  styles.inputContainer,
                  focusedInput === 'company' && styles.inputContainerFocused
                ]}>
                  <Ionicons
                    name="business-outline"
                    size={18}
                    color={focusedInput === 'company' ? colors.primary.orange : colors.text.tertiary}
                  />
                  <TextInput
                    placeholder="Your company name"
                    placeholderTextColor={colors.text.tertiary}
                    style={styles.input}
                    value={companyName}
                    onChangeText={setCompanyName}
                    editable={!isLoading}
                    onFocus={() => setFocusedInput('company')}
                    onBlur={() => setFocusedInput(null)}
                  />
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Full Name</Text>
                <View style={[
                  styles.inputContainer,
                  focusedInput === 'fullName' && styles.inputContainerFocused
                ]}>
                  <Ionicons
                    name="person-outline"
                    size={18}
                    color={focusedInput === 'fullName' ? colors.primary.orange : colors.text.tertiary}
                  />
                  <TextInput
                    placeholder="Your full name"
                    placeholderTextColor={colors.text.tertiary}
                    style={styles.input}
                    value={fullName}
                    onChangeText={setFullName}
                    editable={!isLoading}
                    onFocus={() => setFocusedInput('fullName')}
                    onBlur={() => setFocusedInput(null)}
                  />
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Email</Text>
                <View style={[
                  styles.inputContainer,
                  focusedInput === 'email' && styles.inputContainerFocused
                ]}>
                  <Ionicons name="mail-outline" size={18} color={focusedInput === 'email' ? colors.primary.orange : colors.text.tertiary} />
                  <TextInput
                    placeholder="you@company.com"
                    placeholderTextColor={colors.text.tertiary}
                    style={styles.input}
                    value={email}
                    onChangeText={setEmail}
                    autoCapitalize="none"
                    keyboardType="email-address"
                    editable={!isLoading}
                    onFocus={() => setFocusedInput('email')}
                    onBlur={() => setFocusedInput(null)}
                  />
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Password</Text>
                <View style={[
                  styles.inputContainer,
                  focusedInput === 'password' && styles.inputContainerFocused
                ]}>
                  <Ionicons name="lock-closed-outline" size={18} color={focusedInput === 'password' ? colors.primary.orange : colors.text.tertiary} />
                  <TextInput
                    placeholder="Create a password"
                    placeholderTextColor={colors.text.tertiary}
                    secureTextEntry
                    style={styles.input}
                    value={password}
                    onChangeText={setPassword}
                    editable={!isLoading}
                    onFocus={() => setFocusedInput('password')}
                    onBlur={() => setFocusedInput(null)}
                  />
                </View>
                {strength && (
                  <View style={styles.strengthContainer}>
                    <View style={styles.strengthBar}>
                      <View style={[
                        styles.strengthFill,
                        { 
                          width: password.length < 6 ? '25%' : password.length < 8 ? '50%' : '100%',
                          backgroundColor: strength.color 
                        }
                      ]} />
                    </View>
                    <Text style={[styles.strengthText, { color: strength.color }]}>{strength.label}</Text>
                  </View>
                )}
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Confirm Password</Text>
                <View style={[
                  styles.inputContainer,
                  focusedInput === 'confirm' && styles.inputContainerFocused,
                  confirmPassword && password !== confirmPassword && styles.inputContainerError
                ]}>
                  <Ionicons 
                    name="lock-closed-outline" 
                    size={18} 
                    color={
                      confirmPassword && password !== confirmPassword 
                        ? colors.semantic.error 
                        : focusedInput === 'confirm' 
                          ? colors.primary.orange 
                          : colors.text.tertiary
                    } 
                  />
                  <TextInput
                    placeholder="Confirm your password"
                    placeholderTextColor={colors.text.tertiary}
                    secureTextEntry
                    style={styles.input}
                    value={confirmPassword}
                    onChangeText={setConfirmPassword}
                    editable={!isLoading}
                    onFocus={() => setFocusedInput('confirm')}
                    onBlur={() => setFocusedInput(null)}
                  />
                  {confirmPassword && password === confirmPassword && (
                    <Ionicons name="checkmark-circle" size={20} color={colors.semantic.success} />
                  )}
                </View>
              </View>

              <Pressable
                style={({ hovered }) => [
                  styles.signUpButton,
                  hovered && styles.signUpButtonHovered,
                  isLoading && styles.signUpButtonDisabled
                ]}
                onPress={handleSignUp}
                disabled={isLoading}
              >
                {isLoading ? (
                  <ActivityIndicator size="small" color={colors.neutral.white} />
                ) : (
                  <>
                    <Text style={styles.signUpButtonText}>Create Account</Text>
                    <Ionicons name="arrow-forward" size={18} color={colors.neutral.white} />
                  </>
                )}
              </Pressable>

              <Text style={styles.termsText}>
                By signing up, you agree to our{' '}
                <Text style={styles.termsLink}>Terms of Service</Text>
                {' '}and{' '}
                <Text style={styles.termsLink}>Privacy Policy</Text>
              </Text>

              <View style={styles.loginPrompt}>
                <Text style={styles.loginPromptText}>Already have an account?</Text>
                <Pressable onPress={handleSignIn}>
                  <Text style={styles.loginLink}>Sign in</Text>
                </Pressable>
              </View>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContainer: {
    width: 420,
    maxWidth: '90%',
    backgroundColor: colors.neutral.white,
    borderRadius: borderRadius.xl,
    padding: 32,
    position: 'relative',
    ...shadows.xl,
  },
  closeButton: {
    position: 'absolute',
    top: 16,
    right: 16,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.neutral.offWhite,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },
  brandContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    marginBottom: spacing.lg,
  },
  logoIcon: {
    width: 36,
    height: 36,
  },
  logoText: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text.primary,
    letterSpacing: -0.3,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.text.primary,
    textAlign: 'center',
    marginBottom: spacing.xs,
  },
  subtitle: {
    fontSize: 15,
    color: colors.text.secondary,
    textAlign: 'center',
    marginBottom: spacing.xl,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: borderRadius.md,
    marginBottom: spacing.lg,
  },
  errorText: {
    flex: 1,
    fontSize: 14,
    color: colors.semantic.error,
  },
  inputGroup: {
    marginBottom: spacing.md,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.text.primary,
    marginBottom: spacing.xs,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.neutral.offWhite,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.08)',
    borderRadius: borderRadius.md,
    paddingHorizontal: 14,
    height: 48,
    gap: 10,
    transitionDuration: '200ms',
  },
  inputContainerFocused: {
    borderColor: colors.primary.orange,
    backgroundColor: colors.neutral.white,
  },
  inputContainerError: {
    borderColor: colors.semantic.error,
  },
  input: {
    flex: 1,
    fontSize: 15,
    color: colors.text.primary,
    outlineStyle: 'none',
  },
  strengthContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  strengthBar: {
    flex: 1,
    height: 4,
    backgroundColor: 'rgba(0, 0, 0, 0.08)',
    borderRadius: 2,
    overflow: 'hidden',
  },
  strengthFill: {
    height: '100%',
    borderRadius: 2,
    transitionDuration: '300ms',
  },
  strengthText: {
    fontSize: 12,
    fontWeight: '500',
  },
  signUpButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.primary.orange,
    paddingVertical: 14,
    borderRadius: borderRadius.md,
    marginTop: spacing.sm,
    transitionDuration: '200ms',
  },
  signUpButtonHovered: {
    backgroundColor: colors.primary.orangeLight,
  },
  signUpButtonDisabled: {
    opacity: 0.7,
  },
  signUpButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.neutral.white,
  },
  termsText: {
    fontSize: 12,
    color: colors.text.tertiary,
    textAlign: 'center',
    marginTop: spacing.md,
    lineHeight: 18,
  },
  termsLink: {
    color: colors.primary.orange,
    fontWeight: '500',
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: spacing.lg,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.08)',
  },
  dividerText: {
    fontSize: 13,
    color: colors.text.tertiary,
    marginHorizontal: spacing.md,
  },
  loginPrompt: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
  },
  loginPromptText: {
    fontSize: 14,
    color: colors.text.secondary,
  },
  loginLink: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.primary.orange,
  },
});