export async function confirmMutation(message: string) {
  if (window.prompt(`${message}\n\nType YES I WANT TO DO IT to continue.`) !== 'YES I WANT TO DO IT') return null;
  const password = window.prompt('Enter the Super Admin password to approve this change:');
  return password ? { confirmationPhrase: 'YES I WANT TO DO IT', superAdminPassword: password } : null;
}
