const $ = selector => document.querySelector(selector);
let resetToken = '', recoveryBusy = false;
let csrf = '', onLogin = () => {}, setupToken = '', loginBusy = false;
function showLogin() {
  $('#recovery-panel').hidden = true; $('#forgot-password').hidden = false;
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
    if ([401,403].includes(response.status) && !['/api/session','/api/login','/api/setup','/api/activation','/api/password/forgot','/api/password/check','/api/password/reset'].includes(url)) {
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
  setupToken = ''; resetToken = ''; $('#recovery-panel').hidden = true; $('#login-panel').hidden = true; $('#main').hidden = false;
  $('#logout').hidden = local; $('#local-notice').hidden = !local;
  $('#account-email').hidden = local || !$('#account-email').textContent;
  $('#login-submit').disabled = false;
  $('#login-form').reset();
  await onLogin();
}
export async function initializeAuth(callback) {
  onLogin = callback;
  const fragment = new URLSearchParams(location.hash.slice(1));
  resetToken = fragment.get('reset') || resetToken;
  setupToken = fragment.get('activate') || setupToken;
  if (setupToken || resetToken) history.replaceState(null, '', location.pathname);
  try {
    $('#login-retry').hidden = true; $('#login-error').hidden = true;
    $('#login-submit').disabled = true;
    const session = await request('/api/session');
    if (resetToken) {
      showRecovery(true);
      $('#reset-form').hidden = true;
      $('#recovery-intro').textContent = 'Pārbauda atjaunošanas saiti…';
      try {
        await request('/api/password/check', {method:'POST',body:JSON.stringify({token:resetToken})});
        $('#reset-form').hidden = false; $('#recovery-intro').textContent = 'Izvēlies jaunu paroli savam vadības panelim.';
      } catch (error) {
        $('#recovery-error').textContent = error.message; $('#recovery-error').hidden = false;
        $('#recovery-intro').textContent = 'Lai atjaunotu paroli, nepieciešama derīga saite.';
        $('#request-new-reset').hidden = false;
      }
      return;
    }
    if (setupToken) {
      showLogin(); $('#forgot-password').hidden = true;
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
  if (['activate','reset'].some(key => new URLSearchParams(location.hash.slice(1)).has(key))) initializeAuth(onLogin);
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

function showRecovery(resetting = false) {
  $('#main').hidden = true; $('#login-panel').hidden = true; $('#logout').hidden = true;
  $('#recovery-panel').hidden = false;
  $('#recovery-title').textContent = resetting ? 'Jauna parole' : 'Aizmirsi paroli?';
  $('#recovery-intro').textContent = 'Ievadi savu e-pastu. Nosūtīsim saiti jaunas paroles izveidei.';
  $('#forgot-form').hidden = resetting; $('#reset-form').hidden = !resetting;
  $('#recovery-error').hidden = true; $('#recovery-message').hidden = true; $('#request-new-reset').hidden = true;
  $('#recovery-title').focus();
}
$('#forgot-password').addEventListener('click', () => {
  resetToken = ''; setupToken = ''; $('#recovery-email').value = $('#login-email').value;
  showRecovery(); $('#recovery-email').focus();
});
$('#request-new-reset').addEventListener('click', () => { resetToken = ''; showRecovery(); $('#recovery-email').focus(); });
$('#back-to-login').addEventListener('click', () => {
  if (recoveryBusy) return;
  resetToken = ''; setupToken = ''; $('#reset-form').reset();
  showLogin(); $('#login-submit').disabled = false; $('#login-error').hidden = true; $('#login-email').focus();
});
function recoveryPending(value) {
  recoveryBusy = value;
  $('#send-reset').disabled = value; $('#save-password').disabled = value; $('#back-to-login').disabled = value;
  $('#send-reset').textContent = value ? 'Nosūta…' : 'Nosūtīt saiti';
  $('#save-password').textContent = value ? 'Saglabā…' : 'Saglabāt jauno paroli';
}
$('#forgot-form').addEventListener('submit', async event => {
  event.preventDefault(); if (recoveryBusy || !$('#forgot-form').reportValidity()) return;
  recoveryPending(true); $('#recovery-error').hidden = true; $('#recovery-message').hidden = true;
  try {
    await request('/api/session');
    const result = await request('/api/password/forgot', {method:'POST',body:JSON.stringify({email:$('#recovery-email').value})});
    $('#recovery-message').textContent = result.message; $('#recovery-message').hidden = false;
    $('#forgot-form').hidden = true;
    $('#recovery-intro').textContent = 'Pārbaudi savu e-pastu.';
    $('#request-new-reset').hidden = false;
  } catch (error) { $('#recovery-error').textContent = error.message; $('#recovery-error').hidden = false; }
  finally { recoveryPending(false); }
});
$('#confirm-password').addEventListener('input', () => $('#confirm-password').setCustomValidity(''));
$('#new-password').addEventListener('input', () => $('#confirm-password').setCustomValidity(''));
$('#reset-form').addEventListener('submit', async event => {
  event.preventDefault(); if (recoveryBusy) return;
  $('#confirm-password').setCustomValidity($('#new-password').value === $('#confirm-password').value ? '' : 'Paroles nesakrīt. Ievadi tās vēlreiz.');
  if (!$('#reset-form').reportValidity()) return;
  recoveryPending(true); $('#recovery-error').hidden = true;
  try {
    await request('/api/session');
    const result = await request('/api/password/reset', {method:'POST',body:JSON.stringify({token:resetToken,password:$('#new-password').value})});
    resetToken = ''; $('#reset-form').reset(); $('#reset-form').hidden = true;
    $('#recovery-title').textContent = 'Parole atjaunota'; $('#recovery-intro').textContent = result.message;
    $('#back-to-login').textContent = 'Ielogoties'; $('#request-new-reset').hidden = true;
    $('#recovery-title').focus();
  } catch (error) {
    $('#recovery-error').textContent = error.message; $('#recovery-error').hidden = false;
    $('#request-new-reset').hidden = false;
  } finally { recoveryPending(false); }
});
