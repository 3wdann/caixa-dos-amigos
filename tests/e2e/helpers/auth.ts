export function getManagerTestCredentials() {
  const email = process.env.E2E_MANAGER_EMAIL;
  const password = process.env.E2E_MANAGER_PASSWORD;

  if (!email || !password) {
    return null;
  }

  return { email, password };
}

export function getMemberTestCredentials() {
  const email = process.env.E2E_MEMBER_EMAIL;
  const password = process.env.E2E_MEMBER_PASSWORD;

  if (!email || !password) {
    return null;
  }

  return { email, password };
}

export function getSecondMemberTestCredentials() {
  const email = process.env.E2E_SECOND_MEMBER_EMAIL;
  const password = process.env.E2E_SECOND_MEMBER_PASSWORD;

  if (!email || !password) {
    return null;
  }

  return { email, password };
}
