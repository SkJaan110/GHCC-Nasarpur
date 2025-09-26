// script.js - SKScoringCric Advanced (with modals, extras, wicket types)
(function(){
  const $ = id => document.getElementById(id);

  // Elements
  const playerName = $('playerName'), playerSide = $('playerSide'), addPlayerBtn = $('addPlayerBtn');
  const teamAList = $('teamAList'), teamBList = $('teamBList');
  const startMatchBtn = $('startMatchBtn'), oversInput = $('oversInput'), tossWinner = $('tossWinner'), batChoice = $('batChoice');
  const currentMatchInfo = $('currentMatchInfo');
  const scoringPanel = $('scoringPanel'), matchHeader = $('matchHeader');
  const onStrikeSelect = $('onStrikeSelect'), nonStrikeSelect = $('nonStrikeSelect'), bowlerSelect = $('bowlerSelect'), setPlayersBtn = $('setPlayersBtn');
  const liveScore = $('liveScore'), oversText = $('oversText'), targetText = $('targetText');
  const battingTable = $('battingTable').querySelector('tbody'), bowlingTable = $('bowlingTable').querySelector('tbody');
  const modalOverlay = $('modalOverlay'), modalContent = $('modalContent');
  const exportBtn = $('exportBtn'), importBtn = $('importBtn'), importFile = $('importFile');

  let teams = {A:[], B:[]};
  let match = null;

  function saveTeams(){ localStorage.setItem('sk_teams_v1', JSON.stringify(teams)); }
  function loadTeams(){ const raw = localStorage.getItem('sk_teams_v1'); if(raw) teams = JSON.parse(raw); renderTeams(); }
  function renderTeams(){
    teamAList.innerHTML = teams.A.map((p,i)=>`<li>${p} <button class="btn" onclick="removePlayer('A',${i})">X</button></li>`).join('');
    teamBList.innerHTML = teams.B.map((p,i)=>`<li>${p} <button class="btn" onclick="removePlayer('B',${i})">X</button></li>`).join('');
    tossWinner.innerHTML = `<option value="A">Team A</option><option value="B">Team B</option>`;
  }
  window.removePlayer = function(side,idx){ teams[side].splice(idx,1); saveTeams(); renderTeams(); }

  addPlayerBtn.addEventListener('click', ()=>{
    const name = playerName.value.trim();
    const side = playerSide.value;
    if(!name) return alert('Enter player name');
    teams[side].push(name);
    playerName.value='';
    saveTeams(); renderTeams();
  });

  // Start match
  startMatchBtn.addEventListener('click', ()=>{
    if(!teams.A.length || !teams.B.length) return alert('Add players for both teams first');
    const overs = parseInt(oversInput.value)||5;
    const toss = tossWinner.value;
    const choice = batChoice.value;
    let battingFirst = (choice==='bat')?toss:(toss==='A'?'B':'A');
    if(teams[battingFirst].length<2) return alert('Batting team needs at least 2 players');
    match = createNewMatch(battingFirst, overs);
    currentMatchInfo.innerText = `${match.battingSide} batting first • Overs: ${overs}`;
    showScoringPanel();
    updateMatchUI();
  });

  function createNewMatch(battingFirst, overs){
    const m = {
      oversPerInnings: overs,
      innings:1,
      battingSide: battingFirst,
      bowlingSide: battingFirst==='A'?'B':'A',
      score:0,wickets:0,balls:0,oversComplete:0,
      batsmenStats:{}, bowlerStats:{},
      striker: teams[battingFirst][0],
      nonStriker: teams[battingFirst][1],
      nextBatsmanIdx:2, currentBowler: teams[battingFirst==='A'?'B':'A'][0],
      firstInningsScore:null, finished:false
    };
    teams.A.concat(teams.B).forEach(p=>{
      m.batsmenStats[p] = {runs:0,balls:0,fours:0,sixes:0,status:'not out'};
      m.bowlerStats[p] = {balls:0,runs:0,wkts:0};
    });
    return m;
  }

  function showScoringPanel(){ scoringPanel.style.display='block'; modalHide(); populateSelectors(); }

  function populateSelectors(){
    const batArr = teams[match.battingSide], bowlArr = teams[match.bowlingSide];
    onStrikeSelect.innerHTML = batArr.map(p=>`<option value="${p}">${p}</option>`).join('');
    nonStrikeSelect.innerHTML = batArr.map(p=>`<option value="${p}">${p}</option>`).join('');
    bowlerSelect.innerHTML = bowlArr.map(p=>`<option value="${p}">${p}</option>`).join('');
    onStrikeSelect.value = match.striker; nonStrikeSelect.value = match.nonStriker; bowlerSelect.value = match.currentBowler;
  }

  setPlayersBtn.addEventListener('click', ()=>{ match.striker = onStrikeSelect.value; match.nonStriker = nonStrikeSelect.value; match.currentBowler = bowlerSelect.value; updateMatchUI(); });

  // Buttons
  document.querySelectorAll('.btn.run').forEach(b=>b.addEventListener('click', ()=> handleRun(parseInt(b.dataset.run))));
  document.querySelector('.btn.wicket').addEventListener('click', ()=> handleWicketFlow());
  document.querySelectorAll('.btn.extra').forEach(b=>b.addEventListener('click', ()=> handleExtraFlow(b.dataset.extra)));
  document.querySelector('.btn.ball').addEventListener('click', ()=> handleDot());

  // Export/Import
  exportBtn.addEventListener('click', ()=>{ if(!match) return alert('No active match'); const data={teams,match}; const blob=new Blob([JSON.stringify(data,null,2)],{type:'application/json'}); const url=URL.createObjectURL(blob); const a=document.createElement('a'); a.href=url; a.download='SKScoring_match.json'; a.click(); URL.revokeObjectURL(url); });
  importBtn.addEventListener('click', ()=> importFile.click());
  importFile.addEventListener('change', (e)=>{ const f=e.target.files[0]; if(!f) return; const reader=new FileReader(); reader.onload=ev=>{ try{ const data=JSON.parse(ev.target.result); if(data.teams) teams=data.teams; saveTeams(); renderTeams(); if(data.match){ match=data.match; showScoringPanel(); updateMatchUI(); } }catch(err){ alert('Invalid JSON'); } }; reader.readAsText(f); });

  // Scoring handlers
  function handleRun(r){
    if(!match || match.finished) return;
    match.score += r;
    match.batsmenStats[match.striker].runs += r;
    match.batsmenStats[match.striker].balls += 1;
    if(r===4) match.batsmenStats[match.striker].fours += 1;
    if(r===6) match.batsmenStats[match.striker].sixes += 1;
    match.bowlerStats[match.currentBowler].runs += r;
    match.bowlerStats[match.currentBowler].balls += 1;
    match.balls += 1;
    if(r%2===1) [match.striker,match.nonStriker]=[match.nonStriker,match.striker];
    checkEndOfOverOrInnings();
    updateMatchUI();
  }

  function handleDot(){ if(!match || match.finished) return; match.balls += 1; match.bowlerStats[match.currentBowler].balls += 1; checkEndOfOverOrInnings(); updateMatchUI(); }

  function handleExtraFlow(type){
    if(!match || match.finished) return;
    if(type==='wd'){
      modalShow(`<h3>Wide ball</h3><p>Enter bye runs (0-6) scored in addition to wide (these are extras)</p><div class="row"><input id="wideBy" type="number" min="0" max="6" value="0"></div><div class="row"><button id="doWide" class="btn primary">Apply Wide</button></div>`);
      $('doWide').addEventListener('click', ()=>{ const by = parseInt($('wideBy').value)||0; const extra = 1 + by; match.score += extra; match.bowlerStats[match.currentBowler].runs += extra; modalHide(); updateMatchUI(); });
    } else if(type==='nb'){
      modalShow(`<h3>No Ball</h3><p>If bat hit, enter batsman runs (0-6). For by/legby enter as extras.</p><div class="row"><label>Batsman runs:</label><input id="nbBat" type="number" min="0" max="6" value="0"></div><div class="row"><label>By/LegBy (extras):</label><input id="nbBy" type="number" min="0" max="6" value="0"></div><div class="row"><button id="doNb" class="btn primary">Apply No Ball</button></div>`);
      $('doNb').addEventListener('click', ()=>{ const bat = parseInt($('nbBat').value)||0; const by = parseInt($('nbBy').value)||0; match.score += 1 + bat + by; match.batsmenStats[match.striker].runs += bat; if(bat>0) match.batsmenStats[match.striker].balls += 1; match.bowlerStats[match.currentBowler].runs += 1 + by + bat; modalHide(); updateMatchUI(); });
    }
  }

  function handleWicketFlow(){
    if(!match || match.finished) return;
    const bowlArr = teams[match.bowlingSide];
    const fielderOpts = bowlArr.map(p=>`<option value="${p}">${p}</option>`).join('');
    modalShow(`<h3>Wicket</h3><div class="row"><label>Type:</label><select id="wType"><option value="bowled">Bowled</option><option value="caught">Caught</option><option value="runout">Run Out</option><option value="stumped">Stumped</option><option value="obstruction">Rule Out</option></select></div><div class="row" id="fielderRow" style="display:none"><label>Fielder:</label><select id="fielderSelect">${fielderOpts}</select></div><div class="row"><button id="applyW" class="btn primary">Apply Wicket</button></div>`);
    const wType = $('wType');
    wType.addEventListener('change', ()=> { $('fielderRow').style.display = (wType.value==='caught' || wType.value==='runout' || wType.value==='stumped')?'block':'none'; });
    $('applyW').addEventListener('click', ()=> { const type = $('wType').value; const fielder = $('fielderSelect'? 'fielderSelect' : ''); const f = $('fielderSelect') ? $('fielderSelect').value : ''; applyWicket(type, f); modalHide(); });
  }

  function applyWicket(type, fielder){
    match.wickets += 1;
    match.batsmenStats[match.striker].balls += 1;
    match.batsmenStats[match.striker].status = `out (${type}${fielder? ' - '+fielder:''})`;
    if(type==='bowled' || type==='caught' || type==='stumped'){
      match.bowlerStats[match.currentBowler].wkts += 1;
      match.bowlerStats[match.currentBowler].balls += 1;
    } else if(type==='runout' || type==='obstruction'){
      match.bowlerStats[match.currentBowler].balls += 1;
    } else {
      match.bowlerStats[match.currentBowler].balls += 1;
    }
    match.balls += 1;
    showNextBatsmanSelector();
    updateMatchUI();
  }

  function showNextBatsmanSelector(){
    const remaining = teams[match.battingSide].slice(match.nextBatsmanIdx);
    if(remaining.length===0){ checkEndOfOverOrInnings(true); return; }
    const opts = remaining.map(p=>`<option value="${p}">${p}</option>`).join('');
    modalShow(`<h3>Select Next Batsman</h3><div class="row"><select id="nextBatsman">${opts}</select></div><div class="row"><label>Place at:</label><select id="pos"><option value="strike">On Strike</option><option value="non">Non Strike</option></select></div><div class="row"><button id="setBat" class="btn primary">Set Batsman</button></div>`);
    $('setBat').addEventListener('click', ()=>{ const name=$('nextBatsman').value; const pos=$('pos').value; const idx=teams[match.battingSide].indexOf(name); match.nextBatsmanIdx = Math.max(match.nextBatsmanIdx, idx+1); if(pos==='strike') match.striker = name; else match.nonStriker = name; modalHide(); updateMatchUI(); });
  }

  function promptNextBowler(){
    const remaining = teams[match.bowlingSide];
    const opts = remaining.map(p=>`<option value="${p}">${p}</option>`).join('');
    modalShow(`<h3>End of Over - Select Next Bowler</h3><div class="row"><select id="nextBowler">${opts}</select></div><div class="row"><button id="setBow" class="btn primary">Set Bowler</button></div>`);
    $('setBow').addEventListener('click', ()=>{ match.currentBowler = $('nextBowler').value; modalHide(); updateMatchUI(); });
  }

  function checkEndOfOverOrInnings(forceEnd=false){
    if(match.balls % 6 === 0 || forceEnd){
      match.oversComplete = Math.floor(match.balls/6);
      [match.striker,match.nonStriker]=[match.nonStriker,match.striker];
      if(match.oversComplete >= match.oversPerInnings || match.wickets >= teams[match.battingSide].length-1 || forceEnd){ endInnings(); }
      else { promptNextBowler(); }
    }
  }

  function endInnings(){
    if(match.innings===1){
      match.firstInningsScore = {score:match.score,wickets:match.wickets,overs: `${Math.floor(match.balls/6)}.${match.balls%6}`};
      match.innings=2;
      const prev = match.battingSide; match.battingSide = match.bowlingSide; match.bowlingSide = prev;
      match.score=0; match.wickets=0; match.balls=0; match.oversComplete=0; match.nextBatsmanIdx=2;
      match.striker = teams[match.battingSide][0]; match.nonStriker = teams[match.battingSide][1];
      match.currentBowler = teams[match.bowlingSide][0];
      updateMatchUI();
      alert('Innings over. 2nd innings started. Target: '+(match.firstInningsScore.score+1));
    } else {
      match.finished=true;
      const target = match.firstInningsScore.score+1;
      let result='';
      if(match.score>=target) result = `${match.battingSide} won by ${teams[match.battingSide].length - match.wickets} wickets`;
      else result = `${(match.battingSide==='A'?'B':'A')} won by ${match.firstInningsScore.score - match.score} runs`;
      $('matchSummary').innerText = result + '\n\nFirst Innings: ' + match.firstInningsScore.score + '/' + match.firstInningsScore.wickets + '\nSecond Innings: ' + match.score + '/' + match.wickets;
      $('summaryPanel').style.display='block'; scoringPanel.style.display='none';
    }
  }

  function updateMatchUI(){
    if(!match) return;
    matchHeader.innerText = `Innings ${match.innings} • ${match.battingSide} batting`;
    liveScore.innerText = `${match.score}/${match.wickets}`;
    oversText.innerText = `${Math.floor(match.balls/6)}.${match.balls%6} overs of ${match.oversPerInnings}`;
    targetText.innerText = match.innings===2 ? `Target: ${match.firstInningsScore.score+1}` : '';

    if(onStrikeSelect) onStrikeSelect.value = match.striker;
    if(nonStrikeSelect) nonStrikeSelect.value = match.nonStriker;
    if(bowlerSelect) bowlerSelect.value = match.currentBowler;

    battingTable.innerHTML=''; teams[match.battingSide].forEach(name=>{ const s=match.batsmenStats[name]; const star = name===match.striker ? ' ⭐' : ''; battingTable.innerHTML += `<tr><td style="text-align:left">${name}${star}</td><td>${s.runs}</td><td>${s.balls}</td><td>${s.fours}</td><td>${s.sixes}</td></tr>`; });

    bowlingTable.innerHTML=''; teams[match.bowlingSide].forEach(name=>{ const b=match.bowlerStats[name]; const oversBowled = `${Math.floor(b.balls/6)}.${b.balls%6}`; bowlingTable.innerHTML += `<tr><td style="text-align:left">${name}${name===match.currentBowler?' ⭐':''}</td><td>${oversBowled}</td><td>${b.runs}</td><td>${b.wkts}</td></tr>`; });
  }

  function modalShow(html){ modalContent.innerHTML = html; modalOverlay.style.display='flex'; }
  function modalHide(){ modalOverlay.style.display='none'; modalContent.innerHTML=''; }

  $('newMatchBtn') && $('newMatchBtn').addEventListener('click', ()=> { match=null; scoringPanel.style.display='none'; $('summaryPanel').style.display='none'; $('currentMatchInfo').innerText='No active match'; });

  loadTeams();
  window.__sk={teams,match,updateMatchUI};
})();
