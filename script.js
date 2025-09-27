// script.js - shared data layer and helpers for SKScoring multi-page app
const STORAGE_KEY = 'skscoring_v1';
function loadData(){ try{ const raw = localStorage.getItem(STORAGE_KEY); if(raw) return JSON.parse(raw); }catch(e){} const base = { tournaments: [], nextId: 1 }; localStorage.setItem(STORAGE_KEY, JSON.stringify(base)); return base; }
function saveData(data){ localStorage.setItem(STORAGE_KEY, JSON.stringify(data)); }
function newid(prefix='id'){ const d = loadData(); const id = `${prefix}_${d.nextId++}`; saveData(d); return id; }
function getTournamentById(id){ const d = loadData(); return d.tournaments.find(t=>t.id===id); }
function getTeamById(tid, teamId){ const t = getTournamentById(tid); return t ? t.teams.find(x=>x.id===teamId) : null; }
function getPlayerName(tid, pid){ const t = getTournamentById(tid); if(!t) return ''; for(const team of t.teams){ const p = team.players.find(x=>x.id===pid); if(p) return p.name; } return ''; }
function getTeamName(tid, teamId){ const team = getTeamById(tid, teamId); return team? team.name : ''; }
function q(name){ const url = new URL(window.location.href); return url.searchParams.get(name); }
function showModal(html){ const ov = document.getElementById('modalOverlay'); const cont = document.getElementById('modalContent'); if(!ov || !cont) return; cont.innerHTML = html; ov.style.display = 'flex'; }
function hideModal(){ const ov = document.getElementById('modalOverlay'); const cont = document.getElementById('modalContent'); if(!ov) return; ov.style.display='none'; cont.innerHTML=''; }
function exportData(){ const data = loadData(); const blob = new Blob([JSON.stringify(data,null,2)],{type:'application/json'}); const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download='skscoring_data.json'; a.click(); }
function importFile(el){ const f = el.files[0]; if(!f) return; const reader = new FileReader(); reader.onload = e => { try{ const json = JSON.parse(e.target.result); localStorage.setItem(STORAGE_KEY, JSON.stringify(json)); alert('Imported'); } catch(err){ alert('Invalid JSON'); } }; reader.readAsText(f); }