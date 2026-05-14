export function getFirebaseAuthErrorMessage(error: unknown, fallback: string) {
  if (!(error instanceof Error)) {
    return fallback;
  }

  const message = error.message;

  if (message.includes("auth/invalid-credential")) {
    return "E-mail ou senha inválidos. Digite a senha correta e tente novamente.";
  }

  if (message.includes("auth/user-not-found")) {
    return "Não encontramos uma conta com esse e-mail.";
  }

  if (message.includes("auth/wrong-password")) {
    return "Senha inválida. Digite a senha correta e tente novamente.";
  }

  if (message.includes("auth/email-already-in-use")) {
    return "Esse e-mail já está em uso. Tente entrar ou recuperar sua senha.";
  }

  if (message.includes("auth/weak-password")) {
    return "A senha está muito fraca. Use pelo menos 6 caracteres.";
  }

  if (message.includes("auth/popup-closed-by-user")) {
    return "O popup foi fechado antes da conclusao do login.";
  }

  if (message.includes("auth/popup-blocked")) {
    return "Seu navegador bloqueou o pop-up de autenticação. Libere pop-ups e tente novamente.";
  }

  if (message.includes("auth/operation-not-allowed")) {
    return "Esse provedor ainda não foi ativado no Firebase. Verifique a configuração do login.";
  }

  if (message.includes("auth/unauthorized-domain")) {
    return "Este domínio não está autorizado no Firebase para login com Google. Use localhost ou adicione este domínio nas configurações do Firebase Auth.";
  }

  if (message.includes("auth/cancelled-popup-request")) {
    return "Outra janela de login já estava aberta. Feche o pop-up anterior e tente novamente.";
  }

  if (message.includes("auth/account-exists-with-different-credential")) {
    return "Já existe uma conta com este e-mail usando outro método de acesso.";
  }

  if (message.includes("auth/too-many-requests")) {
    return "Muitas tentativas seguidas. Aguarde um pouco e tente novamente.";
  }

  if (message.includes("auth/invalid-email")) {
    return "Digite um e-mail válido.";
  }

  return fallback;
}
