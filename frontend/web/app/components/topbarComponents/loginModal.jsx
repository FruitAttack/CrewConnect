import { useState } from "react";
import { Modal, View, Text, StyleSheet, TextInput, Pressable, TouchableWithoutFeedback, ActivityIndicator, Image } from "react-native";
import { Ionicons } from '@expo/vector-icons';
import { useSession } from "../../../utils/ctx";
import { useRouter } from "expo-router";
import SignUpModal from "./signUpModal";
import { colors, spacing, borderRadius, shadows } from '../../../constants/theme';

/**
 * Login Modal - Okta-inspired design
 * Allows the user to sign in or navigate to sign up
 */
export default function LoginModal({ visible, onClose }) {
  const { signIn, signOut, session } = useSession();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [signUpModalVisible, setSignUpModalVisible] = useState(false);
  const [focusedInput, setFocusedInput] = useState(null);
  const router = useRouter();

  async function handleLogin() {
    if (!email || !password) {
      setErrorMsg("Please enter your email and password.");
      return;
    }
    
    try {
      setErrorMsg("");
      setIsLoading(true);
      await signIn(email, password);
      router.replace("/(app)/dashboard");
      onClose();
    } catch (err) {
      setErrorMsg(err.message);
    } finally {
      setIsLoading(false);
    }
  }

  async function handleLogout() {
    await signOut();
    router.replace("/");
    onClose();
  }

  function handleSignUp() {
    setSignUpModalVisible(true);
  }

  function handleBackToLogin() {
    setSignUpModalVisible(false);
  }

  function handleClose() {
    setEmail("");
    setPassword("");
    setErrorMsg("");
    onClose();
  }

  return (
    <>
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

                <Text style={styles.title}>
                  {session ? "Your Account" : "Welcome Back"}
                </Text>
                <Text style={styles.subtitle}>
                  {session ? "Manage your account settings" : "Sign in to continue to your dashboard"}
                </Text>

                {session ? (
                  // Logged In State
                  <View style={styles.loggedInContainer}>
                    <View style={styles.userInfo}>
                      <View style={styles.userAvatar}>
                        <Ionicons name="person" size={24} color={colors.neutral.white} />
                      </View>
                      <View>
                        <Text style={styles.userEmail}>{session.user.email}</Text>
                        <Text style={styles.userRole}>Administrator</Text>
                      </View>
                    </View>

                    <Pressable 
                      style={({ hovered }) => [styles.logoutButton, hovered && styles.logoutButtonHovered]} 
                      onPress={handleLogout}
                    >
                      <Ionicons name="log-out-outline" size={18} color={colors.semantic.error} />
                      <Text style={styles.logoutButtonText}>Sign Out</Text>
                    </Pressable>
                  </View>
                ) : (
                  // Login Form
                  <>
                    {errorMsg ? (
                      <View style={styles.errorContainer}>
                        <Ionicons name="alert-circle" size={18} color={colors.semantic.error} />
                        <Text style={styles.errorText}>{errorMsg}</Text>
                      </View>
                    ) : null}

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
                          placeholder="Enter your password"
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
                    </View>

                    <Pressable style={styles.forgotPassword}>
                      <Text style={styles.forgotPasswordText}>Forgot password?</Text>
                    </Pressable>

                    <Pressable
                      style={({ hovered }) => [
                        styles.loginButton,
                        hovered && styles.loginButtonHovered,
                        isLoading && styles.loginButtonDisabled
                      ]}
                      onPress={handleLogin}
                      disabled={isLoading}
                    >
                      {isLoading ? (
                        <ActivityIndicator size="small" color={colors.neutral.white} />
                      ) : (
                        <>
                          <Text style={styles.loginButtonText}>Sign In</Text>
                          <Ionicons name="arrow-forward" size={18} color={colors.neutral.white} />
                        </>
                      )}
                    </Pressable>

                    <View style={styles.signUpPrompt}>
                      <Text style={styles.signUpPromptText}>Don't have an account?</Text>
                      <Pressable onPress={handleSignUp}>
                        <Text style={styles.signUpLink}>Sign up</Text>
                      </Pressable>
                    </View>
                  </>
                )}
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
      <SignUpModal 
        visible={signUpModalVisible} 
        onClose={() => setSignUpModalVisible(false)} 
        onSignIn={handleBackToLogin}
      />
    </>
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
    width: 400,
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
  input: {
    flex: 1,
    fontSize: 15,
    color: colors.text.primary,
    outlineStyle: 'none',
  },
  forgotPassword: {
    alignSelf: 'flex-end',
    marginBottom: spacing.lg,
  },
  forgotPasswordText: {
    fontSize: 14,
    color: colors.primary.orange,
    fontWeight: '500',
  },
  loginButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.primary.orange,
    paddingVertical: 14,
    borderRadius: borderRadius.md,
    transitionDuration: '200ms',
  },
  loginButtonHovered: {
    backgroundColor: colors.primary.orangeLight,
  },
  loginButtonDisabled: {
    opacity: 0.7,
  },
  loginButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.neutral.white,
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
  signUpPrompt: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
    marginTop: spacing.lg,
    paddingBottom: spacing.sm,
  },
  signUpPromptText: {
    fontSize: 14,
    color: colors.text.secondary,
  },
  signUpLink: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.primary.orange,
  },
  // Logged In State
  loggedInContainer: {
    alignItems: 'center',
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.neutral.offWhite,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.lg,
    marginBottom: spacing.xl,
    width: '100%',
  },
  userAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.primary.orange,
    alignItems: 'center',
    justifyContent: 'center',
  },
  userEmail: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text.primary,
  },
  userRole: {
    fontSize: 13,
    color: colors.text.secondary,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: borderRadius.md,
    width: '100%',
    transitionDuration: '200ms',
  },
  logoutButtonHovered: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
  },
  logoutButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.semantic.error,
  },
});