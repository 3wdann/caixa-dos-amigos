export function getFirebaseAuthErrorMessage(error: unknown, fallback: string) {
  if (!(error instanceof Error)) {
    return fallback;
  }

  const message = error.message;

  if (message.includes("auth/invalid-credential")) {
    return "Email ou senha invalidos. Digite a senha correta e tente novamente.";
  }

  if (message.includes("auth/user-not-found")) {
    return "Nao encontramos uma conta com esse email.";
  }

  if (message.includes("auth/wrong-password")) {
    return "Senha invalida. Digite a senha correta e tente novamente.";
  }

  if (message.includes("auth/email-already-in-use")) {
    return "Esse email ja esta em uso. Tente entrar ou recuperar sua senha.";
  }

  if (message.includes("auth/weak-password")) {
    return "A senha esta muito fraca. Use pelo menos 6 caracteres.";
  }

  if (message.includes("auth/popup-closed-by-user")) {
    return "O popup foi fechado antes da conclusao do login.";
  }

  if (message.includes("auth/popup-blocked")) {
    return "Seu navegador bloqueou o popup de autenticacao. Libere popups e tente novamente.";
  }

  if (message.includes("auth/operation-not-allowed")) {
    return "Esse provedor ainda nao foi ativado no Firebase. Verifique a configuracao do login.";
  }

  if (message.includes("auth/account-exists-with-different-credential")) {
    return "Ja existe uma conta com este email usando outro metodo de acesso.";
  }

  if (message.includes("auth/too-many-requests")) {
    return "Muitas tentativas seguidas. Aguarde um pouco e tente novamente.";
  }

  if (message.includes("auth/invalid-email")) {
    return "Digite um email valido.";
  }

  return fallback;
}
