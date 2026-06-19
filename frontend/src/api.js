export const BASE = 'http://127.0.0.1:8000/api';

const json = (res) => { if (!res.ok) throw new Error(res.statusText); return res.json(); };

export const api = {
  login:        (body)            => fetch(`${BASE}/login`,         { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(body) }).then(json),
  users:        ()                => fetch(`${BASE}/users`).then(json),
  inbox:        (uid)             => fetch(`${BASE}/inbox?user_id=${uid}`).then(json),
  sent:         (uid)             => fetch(`${BASE}/sent?user_id=${uid}`).then(json),
  thread:       (id)              => fetch(`${BASE}/thread?id=${id}`).then(json),
  markRead:     (message_id)      => fetch(`${BASE}/mark_read`,     { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({message_id}) }).then(json),
  sendMessage:  (body)            => fetch(`${BASE}/send_message`,  { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(body) }).then(json),
  sendReply:    (body)            => fetch(`${BASE}/send_reply`,    { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(body) }).then(json),
  hideMessages: (ids, user_id)    => fetch(`${BASE}/hide_messages`, { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({ids, user_id}) }).then(json),
  hideSent:     (ids, user_id)    => fetch(`${BASE}/hide_sent`,     { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({ids, user_id}) }).then(json),
};

export const fmtDate = (s) => {
  if (!s) return '';
  const d = new Date(s), now = new Date(), diff = Math.floor((now - d) / 60000);
  if (diff < 1) return 'Just now';
  if (diff < 60) return `${diff}m ago`;
  if (diff < 1440 && d.getDate() === now.getDate()) return d.toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'});
  const yest = new Date(now); yest.setDate(now.getDate()-1);
  if (d.toDateString() === yest.toDateString()) return 'Yesterday';
  return d.toLocaleDateString([],{day:'numeric',month:'short'});
};

export const DEMO = [
  { name:'Alice',   email:'alice@example.com',   password:'password123', color:'bg-indigo-500' },
  { name:'Bob',     email:'bob@example.com',     password:'password456', color:'bg-emerald-500' },
  { name:'Charlie', email:'charlie@example.com', password:'password789', color:'bg-amber-500' },
];
