export function getGuestSessionId(): string {
  let sid = localStorage.getItem('guest_session_id');
  if (!sid) {
    sid = crypto.randomUUID();
    localStorage.setItem('guest_session_id', sid);
  }
  return sid;
}

export function clearGuestSession() {
  localStorage.removeItem('guest_session_id');
}
