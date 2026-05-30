export function getAuthToken() {
  return localStorage.getItem('token');
}

export function setAuthToken(token) {
  if (token) {
    localStorage.setItem('token', token);
  } else {
    localStorage.removeItem('token');
  }
}

export function isTokenExpired(token) {
  if (!token) return true;
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return true;
    
    const base64Url = parts[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const payloadJson = atob(base64);
    const payload = JSON.parse(payloadJson);
    
    if (!payload.exp) return false;
    
    const buffer = 10; // 10 seconds buffer
    return (payload.exp * 1000) < (Date.now() + buffer * 1000);
  } catch (e) {
    return true;
  }
}

export function checkAuth() {
  const token = getAuthToken();
  if (!token || isTokenExpired(token)) {
    setAuthToken(null);
    return false;
  }
  return true;
}
