const $ = selector => document.querySelector(selector);
let csrf = '', onLogin = () => {}, setupToken = '', loginBusy = false;
function showLogin() {
  $('#main').hidden = true; $('#login-panel').hidden = false; $('#logout').hidden = true;
  $('#account-email').hidden = true; $('#login-email').readOnly = false;
  $('#login-title').textContent = 'Tavs pasākumu kalendārs';
  $('#login-intro').textContent = 'Ielogojies, lai pievienotu un pārvaldītu pasākumus.';
  $('#login-submit').textContent = 'Ielogoties';
  $('#login-password').autocomplete = 'current-password';
  $('#login-password').removeAttribute('minlength'); $('#password-help').hidden = true;
}
export async function request(url, options = {}) {
  const response = await fetch(url, {...options, cache:'no-store', credentials:'same-origin',
    headers:{'Content-Type':'application/json','X-Room-Admin':'1','X-CSRF-Token':csrf,...options.headers}, signal:AbortSignal.timeout(12000)});
  let result;
  try { result = await response.json(); } catch { throw new Error('Neizdevās savienoties. Mēģini vēlreiz pēc brīža.'); }
  if (!response.ok) {
    if ([401,403].includes(response.status) && !['/api/session','/api/login','/api/setup','/api/activation'].includes(url)) {
      const session = await request('/api/session');
      if (!session.authenticated) showLogin();
    }
    const error = new Error(result.error || 'Neizdevās saglabāt. Mēģini vēlreiz.'); error.fields = result.fields; error.status = response.status; throw error;
  }
  if (result.csrf) csrf = result.csrf;
  if (result.user) {
    $('#account-email').textContent = result.user.email;
    $('#account-email').hidden = false;
  }
  return result;
}
async function signedIn(local = false) {
  setupToken = ''; $('#login-panel').hidden = true; $('#main').hidden = false;
  $('#logout').hidden = local; $('#local-notice').hidden = !local;
  $('#account-email').hidden = local || !$('#account-email').textContent;
  $('#login-submit').disabled = false;
  $('#login-form').reset();
  await onLogin();
}
export async function initializeAuth(callback) {
  onLogin = callback;
  const fragment = new URLSearchParams(location.hash.slice(1));
  setupToken = fragment.get('activate') || setupToken;
  if (setupToken) history.replaceState(null, '', location.pathname);
  try {
    $('#login-retry').hidden = true; $('#login-error').hidden = true;
    $('#login-submit').disabled = true;
    const session = await request('/api/session');
    if (setupToken) {
      showLogin();
      let activation;
      try { activation = await request('/api/activation', {method:'POST', body:JSON.stringify({token:setupToken})}); }
      catch (error) {
        if (![403,409].includes(error.status)) throw error;
        setupToken = '';
        if (session.authenticated) { await signedIn(Boolean(session.local)); return; }
        $('#login-error').textContent = error.message; $('#login-error').hidden = false;
        $('#login-submit').disabled = false; return;
      }
      $('#login-title').textContent = 'Izveido savu piekļuvi';
      $('#login-intro').textContent = 'Saglabā e-pastu un paroli, ar ko turpmāk ielogosies.';
      $('#login-submit').textContent = 'Izveidot piekļuvi';
      $('#login-password').autocomplete = 'new-password';
      $('#login-password').value = '';
      $('#password-help').hidden = false; $('#login-password').minLength = 8;
      $('#login-email').value = activation.email || '';
      $('#login-email').readOnly = Boolean(activation.email);
    } else if (session.authenticated) { await signedIn(Boolean(session.local)); return; }
    else showLogin();
    $('#login-submit').disabled = false;
  } catch (error) {
    showLogin(); $('#login-error').textContent = error.message; $('#login-error').hidden = false; $('#login-retry').hidden = false;
  }
}
$('#login-form').addEventListener('submit', async event => {
  event.preventDefault(); if (loginBusy || !$('#login-form').reportValidity()) return;
  loginBusy = true; $('#login-submit').disabled = true; $('#login-error').hidden = true;
  try {
    await request(setupToken ? '/api/setup' : '/api/login', {method:'POST', body:JSON.stringify({email:$('#login-email').value,password:$('#login-password').value,...(setupToken ? {token:setupToken} : {})})});
    await signedIn();
  } catch (error) { $('#login-error').textContent = error.message; $('#login-error').hidden = false; }
  finally { loginBusy = false; $('#login-submit').disabled = false; }
});
$('#login-retry').addEventListener('click', () => initializeAuth(onLogin));
window.addEventListener('hashchange', () => {
  if (new URLSearchParams(location.hash.slice(1)).has('activate')) initializeAuth(onLogin);
});
window.addEventListener('focus', async () => {
  if ($('#main').hidden) return;
  try { if (!(await request('/api/session')).authenticated) showLogin(); } catch { /* The next action can retry. */ }
});
$('#logout').addEventListener('click', async () => {
  $('#logout').disabled = true;
  try { await request('/api/logout', {method:'POST', body:JSON.stringify({action:'logout'})}); location.reload(); }
  catch (error) { $('#toast span').textContent = error.message; $('#toast').hidden = false; }
  finally { $('#logout').disabled = false; }
});
