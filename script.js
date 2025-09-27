// script.js - SKScoringCric Pro (updated: opening selector, ® swap, next-batsman filter, recent balls, undo)
(function(){
  const $ = id => document.getElementById(id);

  // Elements
  const playerName = $('playerName'), playerSide = $('playerSide'), addPlayerBtn = $('addPlayerBtn');
  const teamAList = $('teamAList'), teamBList = $('teamBList');
  const teamAbtn = $('teamAbtn'), teamBbtn = $('teamBbtn');
  const startMatchBtn = $('startMatchBtn'), oversInput = $('oversInput'), tossWinner = $('tossWinner'), batChoice = $('batChoice');
  const currentMatchInfo = $('currentMatchInfo');
  const scoringPanel = $('scoringPanel'), matchHeadline = $('matchHeadline');
  const onStrikeSelect = $('onStrikeSelect'), nonStrikeSelect = $('nonStrikeSelect'), bowlerSelect = $('bowlerSelect'), setPlayersBtn = $('setPlayersBtn');
  const liveScore = $('liveScore'), oversText = $('oversText'), targetText = $('targetText'), teamShort = $('teamShort');
  const strikeName = $('strikeName'), nonstrikeName = $('nonstrikeName'), bowlerName = $('bowlerName');
  const recentBalls = $('recentBalls');
  const modalOverlay = $('modalOverlay'), modalContent = $('modalContent');
  const exportBtn = $('exportBtn'), importBtn = $('importBtn'), importFile = $('importFile');
  const teamACount = $('teamACount'), teamBCount = $('teamBCount');
  const needText = $('needText');
  const swapStrikeBtn = $('swapStrikeBtn');

  const tabs = document.querySelectorAll('.tab-btn');
  const tabMap = {scorecard: $('scorecardTab'), bowling: $('bowlingTab'), info: $('infoTab'), commentary: $('commTab')};

  let teams = {A:[], B:[]};
  let match = null;
  let historyStack = [];

  // local storage
  function saveTeams(){ localStorage.setItem('sk_teams_v1', JSON.stringify(teams)); }
  function loadTeams(){ const raw = localStorage.getItem('sk_teams_v1'); if(raw) teams = JSON.parse(raw); renderTeams(); }
  function renderTeams(){
    teamAList.innerHTML = teams.A.map((p,i)=>`<li>${p} <button class="btn" onclick="removePlayer('A',${i})">X</button></li>`).join('');
    teamBList.innerHTML = teams.B.map((p,i)=>`<li>${p} <button class="btn" onclick="removePlayer('B',${i})">X</button></li>`).join('');
    teamACount.innerText = teams.A.length; teamBCount.innerText = teams.B.length;
  }
  window.removePlayer = function(side,idx){ teams[side].splice(idx,1); saveTeams(); renderTeams(); }

  addPlayerBtn.addEventListener('click', ()=>{
    const name = playerName.value.trim(); const side = playerSide.value;
    if(!name) return alert('Enter player name');
    teams[side].push(name); playerName.value=''; saveTeams(); renderTeams();
  });

  // squad modal
  teamAbtn.addEventListener('click', ()=> showSquad('A'));
  teamBbtn.addEventListener('click', ()=> showSquad('B'));
  function showSquad(side){
    const list = teams[side].map(p=>`<li>${p}</li>`).join('');
    modalShow(`<h3>Team ${side} Squad (${teams[side].length})</h3><ul>${list}</ul><div style="margin-top:12px"><button id="closeSquad" class="btn primary">Close</button></div>`);
    document.getElementById('closeSquad').addEventListener('click', modalHide);
  }

  // Start match -> toss modal -> opening selection modal
  startMatchBtn.addEventListener('click', ()=>{
    if(teams.A.length<2 || teams.B.length<2) return alert('Add at least 2 players per team');
    const overs = parseInt(oversInput.value)||5; const toss = tossWinner.value; const choice = batChoice.value;
    modalShow(`<h3>Toss</h3><p>Who won toss?</p><select id="tossSel"><option value="A">Team A</option><option value="B">Team B</option></select><p>Choose to:</p><select id="tossOpt"><option value="bat">Bat</option><option value="bowl">Bowl</option></select><div style="margin-top:12px"><button id="applyToss" class="btn primary">Apply</button></div>`);
    document.getElementById('tossSel').value = toss; document.getElementById('tossOpt').value = choice;
    document.getElementById('applyToss').addEventListener('click', ()=>{
      const tossWinnerVal = document.getElementById('tossSel').value;
      const tossOpt = document.getElementById('tossOpt').value;
      modalHide();
      const battingFirst = tossOpt==='bat' ? tossWinnerVal : (tossWinnerVal==='A'?'B':'A');
      match = createNewMatch(battingFirst, overs, {tossWinner: tossWinnerVal, tossOpt});
      currentMatchInfo.innerText = `${match.battingSide} batting first • Overs: ${overs}`;
      updateTossInfo();
      // open opening selector
      showOpeningSelector();
    });
  });

  function updateTossInfo(){ if(!match) return $('tossInfo').innerText = `Toss: ${match.toss.tossWinner} won and chose to ${match.toss.tossOpt}`; }

  function createNewMatch(battingFirst, overs, toss){
    const m = {
      oversPerInnings: overs, innings:1,
      battingSide:battingFirst, bowlingSide: battingFirst==='A'?'B':'A',
      score:0,wickets:0,balls:0,oversComplete:0,
      batsmenStats:{}, bowlerStats:{},
      striker:null, nonStriker:null, nextBatsmanIdx:0,
      currentBowler:null, firstInningsScore:null, finished:false,
      toss: toss, commentary:[]
    };
    // initialize stats and set nextBatsmanIdx to 0 (we'll choose opening)
    teams.A.concat(teams.B).forEach(p=>{
      m.batsmenStats[p] = {runs:0,balls:0,fours:0,sixes:0,status:'not out'};
      m.bowlerStats[p] = {balls:0,runs:0,wkts:0,recent:[]};
    });
    m.nextBatsmanIdx = 0;
    return m;
  }

  // Opening selector modal
  function showOpeningSelector(){
    const batArr = teams[match.battingSide].map(p=>`<option value="${p}">${p}</option>`).join('');
    const bowlArr = teams[match.bowlingSide].map(p=>`<option value="${p}">${p}</option>`).join('');
    modalShow(`<h3>Choose Opening Players (${match.battingSide} batting)</h3>
      <label>Batsman 1</label><select id="openB1">${batArr}</select>
      <label>Batsman 2</label><select id="openB2">${batArr}</select>
      <label>Opening Bowler</label><select id="openBow">${bowlArr}</select>
      <div style="margin-top:12px"><button id="applyOpen" class="btn primary">Start Match</button></div>`);
    document.getElementById('applyOpen').addEventListener('click', ()=>{
      const b1 = $('openB1').value, b2 = $('openB2').value, bow = $('openBow').value;
      if(b1===b2) return alert('Select two different opening batsmen');
      match.striker = b1; match.nonStriker = b2;
      // set nextBatsmanIdx to first player not in opening pair (so nextBatsman list doesn't include striker/nonStriker/out)
      match.nextBatsmanIdx = teams[match.battingSide].findIndex(p=>p!==b1 && p!==b2);
      if(match.nextBatsmanIdx===-1) match.nextBatsmanIdx = 2;
      match.currentBowler = bow;
      modalHide();
      showScoringPanel();
      updateMatchUI();
    }, {once:true});
  }

  function showScoringPanel(){ scoringPanel.style.display='block'; tabSelect('scorecard'); modalHide(); populateSelectors(); }

  function populateSelectors(){
    const bat = teams[match.battingSide], bowl = teams[match.bowlingSide];
    // populate hidden selects (used only if user wants to override)
    onStrikeSelect && (onStrikeSelect.innerHTML = bat.map(p=>`<option value="${p}">${p}</option>`).join(''));
    nonStrikeSelect && (nonStrikeSelect.innerHTML = bat.map(p=>`<option value="${p}">${p}</option>`).join(''));
    bowlerSelect && (bowlerSelect.innerHTML = bowl.map(p=>`<option value="${p}">${p}</option>`).join(''));
    onStrikeSelect && (onStrikeSelect.value = match.striker);
    nonStrikeSelect && (nonStrikeSelect.value = match.nonStriker);
    bowlerSelect && (bowlerSelect.value = match.currentBowler);
  }

  setPlayersBtn.addEventListener('click', ()=>{ match.striker = onStrikeSelect.value; match.nonStriker = nonStrikeSelect.value; match.currentBowler = bowlerSelect.value; updateMatchUI(); });

  // tabs
  tabs.forEach(t=> t.addEventListener('click', ()=> tabSelect(t.dataset.tab)));
  function tabSelect(name){
    tabs.forEach(x=>x.classList.remove('active'));
    document.querySelector(`.tab-btn[data-tab="${name}"]`).classList.add('active');
    Object.keys(tabMap).forEach(k=> tabMap[k].style.display = (k===name?'block':'none'));
  }

  // buttons
  document.querySelectorAll('.btn.run').forEach(b=>b.addEventListener('click', ()=> handleRun(parseInt(b.dataset.run))));
  document.querySelector('.btn.wicket').addEventListener('click', ()=> handleWicketFlow());
  document.querySelectorAll('.btn.extra').forEach(b=>b.addEventListener('click', ()=> handleExtraFlow(b.dataset.extra)));
  document.querySelector('.btn.undo').addEventListener('click', undoLast);
  document.querySelector('.btn.ball').addEventListener('click', ()=> handleDot());
  swapStrikeBtn.addEventListener('click', ()=> { if(!match) return; [match.striker,match.nonStriker]=[match.nonStriker,match.striker]; updateMatchUI(); });

  // export/import
  exportBtn.addEventListener('click', ()=>{ if(!match) return alert('No active match'); const data={teams,match}; const blob=new Blob([JSON.stringify(data,null,2)],{type:'application/json'}); const url=URL.createObjectURL(blob); const a=document.createElement('a'); a.href=url; a.download='SKScoring_match.json'; a.click(); URL.revokeObjectURL(url); });
  importBtn.addEventListener('click', ()=> importFile.click());
  importFile.addEventListener('change', (e)=>{ const f=e.target.files[0]; if(!f) return; const reader=new FileReader(); reader.onload=ev=>{ try{ const data=JSON.parse(ev.target.result); if(data.teams) teams = data.teams; saveTeams(); renderTeams(); if(data.match){ match = data.match; showScoringPanel(); updateMatchUI(); } }catch(err){ alert('Invalid JSON'); } }; reader.readAsText(f); });

  // history push (for undo)
  function pushHistory(action){
    historyStack.push(JSON.stringify({action, match: JSON.parse(JSON.stringify(match))}));
    if(historyStack.length>60) historyStack.shift();
  }

  // scoring handlers
  function handleRun(r){
    if(!match || match.finished) return;
    pushHistory({type:'run', r});
    match.score += r;
    match.batsmenStats[match.striker].runs += r;
    match.batsmenStats[match.striker].balls += 1;
    if(r===4) match.batsmenStats[match.striker].fours += 1;
    if(r===6) match.batsmenStats[match.striker].sixes += 1;
    match.bowlerStats[match.currentBowler].runs += r;
    match.bowlerStats[match.currentBowler].balls += 1;
    match.bowlerStats[match.currentBowler].recent = addRecent(match.bowlerStats[match.currentBowler].recent, r);
    match.balls += 1;
    match.commentaryPush = match.commentaryPush || function(s){ match.commentary.push(s); if(match.commentary.length>300) match.commentary.shift(); };
    match.commentaryPush(`${r} run(s)`);
    if(r%2===1) [match.striker,match.nonStriker]=[match.nonStriker,match.striker];
    checkEndOfOverOrInnings();
    updateMatchUI();
  }

  function handleDot(){ if(!match || match.finished) return; pushHistory({type:'dot'}); match.balls += 1; match.bowlerStats[match.currentBowler].balls += 1; match.bowlerStats[match.currentBowler].recent = addRecent(match.bowlerStats[match.currentBowler].recent, 0); match.commentaryPush('Dot ball'); checkEndOfOverOrInnings(); updateMatchUI(); }

  function addRecent(arr, val){ arr = arr || []; arr.unshift(val); if(arr.length>10) arr.pop(); return arr; }

  // extras
  function handleExtraFlow(type){
    if(!match || match.finished) return;
    if(type==='wd'){
      modalShow(`<h3>Wide</h3><p>Enter bye runs (0-6) in addition to wide:</p><input id="wideBy" type="number" min="0" max="6" value="0"><div style="margin-top:12px"><button id="applyWide" class="btn primary">Apply Wide</button></div>`);
      document.getElementById('applyWide').addEventListener('click', ()=>{ const by = parseInt($('wideBy').value)||0; const extra = 1 + by; pushHistory({type:'wide', extra}); match.score += extra; match.bowlerStats[match.currentBowler].runs += extra; match.bowlerStats[match.currentBowler].recent = addRecent(match.bowlerStats[match.currentBowler].recent, 'wd'); match.commentaryPush(`Wide +${by}`); modalHide(); updateMatchUI(); });
    } else if(type==='nb'){
      modalShow(`<h3>No Ball</h3><p>Batsman runs (0-6):</p><input id="nbBat" type="number" min="0" max="6" value="0"><p>By/LegBy extras (0-6):</p><input id="nbBy" type="number" min="0" max="6" value="0"><div style="margin-top:12px"><button id="applyNb" class="btn primary">Apply No Ball</button></div>`);
      document.getElementById('applyNb').addEventListener('click', ()=>{ const bat = parseInt($('nbBat').value)||0; const by = parseInt($('nbBy').value)||0; pushHistory({type:'nb', bat, by}); match.score += 1 + bat + by; match.batsmenStats[match.striker].runs += bat; if(bat>0) match.batsmenStats[match.striker].balls += 1; match.bowlerStats[match.currentBowler].runs += 1 + by + bat; match.bowlerStats[match.currentBowler].recent = addRecent(match.bowlerStats[match.currentBowler].recent, 'nb'); match.commentaryPush(`No-ball: bat ${bat}, by ${by}`); modalHide(); updateMatchUI(); });
    }
  }

  // wicket flows
  function handleWicketFlow(){
    if(!match || match.finished) return;
    const bowlArr = teams[match.bowlingSide];
    const fielderOpts = bowlArr.map(p=>`<option value="${p}">${p}</option>`).join('');
    modalShow(`<h3>Wicket</h3><div class="row"><label>Type:</label><select id="wType"><option value="bowled">Bowled</option><option value="caught">Caught</option><option value="runout">Run Out</option><option value="stumped">Stumped</option><option value="obstruction">Rule Out</option></select></div><div class="row" id="fielderRow" style="display:none"><label>Fielder:</label><select id="fielderSelect">${fielderOpts}</select></div><div class="row"><button id="applyW" class="btn primary">Apply</button></div>`);
    const wType = $('wType');
    wType.addEventListener('change', ()=> { $('fielderRow').style.display = (wType.value==='caught' || wType.value==='runout' || wType.value==='stumped')?'block':'none'; });
    document.getElementById('applyW').addEventListener('click', ()=>{ const type = $('wType').value; const f = $('fielderSelect')? $('fielderSelect').value : ''; pushHistory({type:'wicket', wicketType:type, fielder:f}); applyWicket(type, f); modalHide(); });
  }

  function applyWicket(type, fielder){
    match.wickets += 1;
    match.batsmenStats[match.striker].balls += 1;
    match.batsmenStats[match.striker].status = `out (${type}${fielder? ' - '+fielder:''})`;
    // credit bowler for certain types
    if(type==='bowled' || type==='caught' || type==='stumped'){ match.bowlerStats[match.currentBowler].wkts += 1; match.bowlerStats[match.currentBowler].balls += 1; }
    else { match.bowlerStats[match.currentBowler].balls += 1; }
    match.balls += 1;
    match.bowlerStats[match.currentBowler].recent = addRecent(match.bowlerStats[match.currentBowler].recent, 'W');
    match.commentaryPush(`Wicket: ${type}${fielder? ' by '+fielder:''}`);
    // next batsman selector (filter out players already out or already batting)
    showNextBatsmanSelector();
    updateMatchUI();
  }

  function showNextBatsmanSelector(){
    // compute remaining players who are not 'out' and not currently batting
    const all = teams[match.battingSide];
    const remaining = all.filter(p => match.batsmenStats[p].status !== 'out' && p !== match.striker && p !== match.nonStriker);
    if(remaining.length===0){ checkEndOfOverOrInnings(true); return; }
    const opts = remaining.map(p=>`<option value="${p}">${p}</option>`).join('');
    modalShow(`<h3>Select Next Batsman</h3><div class="row"><select id="nextBatsman">${opts}</select></div><div class="row"><label>Place at:</label><select id="pos"><option value="strike">On Strike</option><option value="non">Non Strike</option></select></div><div class="row"><button id="setBat" class="btn primary">Set Batsman</button></div>`);
    document.getElementById('setBat').addEventListener('click', ()=>{ const name=$('nextBatsman').value; const pos=$('pos').value; match.batsmenStats[name].status='not out'; if(pos==='strike') match.striker = name; else match.nonStriker = name; modalHide(); updateMatchUI(); });
  }

  // over end -> next bowler
  function promptNextBowler(){
    const remaining = teams[match.bowlingSide];
    const opts = remaining.map(p=>`<option value="${p}">${p}</option>`).join('');
    modalShow(`<h3>Select Next Bowler</h3><div class="row"><select id="nextBowler">${opts}</select></div><div class="row"><button id="setBow" class="btn primary">Set Bowler</button></div>`);
    document.getElementById('setBow').addEventListener('click', ()=>{ match.currentBowler = $('nextBowler').value; modalHide(); updateMatchUI(); });
  }

  // undo
  function undoLast(){
    if(historyStack.length===0) return alert('Nothing to undo');
    const raw = historyStack.pop();
    const parsed = JSON.parse(raw);
    match = parsed.match;
    updateMatchUI();
    alert('Last action undone');
  }

  // end of over / innings
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
      match.score=0; match.wickets=0; match.balls=0; match.oversComplete=0;
      // show opening selection for 2nd innings as well
      showOpeningSelector();
      modalShow(`<h3>Innings over</h3><p>Target: ${match.firstInningsScore.score+1}</p><div style="margin-top:12px"><button id="closeIn" class="btn primary">Continue</button></div>`);
      document.getElementById('closeIn').addEventListener('click', ()=>{ modalHide(); showScoringPanel(); updateMatchUI(); }, {once:true});
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

  // update UI
  function updateMatchUI(){
    if(!match) return;
    matchHeadline.innerText = `${match.battingSide} vs ${match.bowlingSide}`;
    $('teamShort').innerText = match.battingSide;
    liveScore.innerText = `${match.score}/${match.wickets}`;
    oversText.innerText = `${Math.floor(match.balls/6)}.${match.balls%6} overs of ${match.oversPerInnings}`;
    targetText.innerText = match.innings===2 && match.firstInningsScore ? `Target: ${match.firstInningsScore.score+1}` : '';
    if(match.innings===2 && match.firstInningsScore){
      const target = match.firstInningsScore.score+1;
      const ballsLeft = match.oversPerInnings*6 - match.balls;
      const need = Math.max(0, target - match.score);
      needText.innerText = `${match.battingSide} need ${need} runs in ${ballsLeft} balls`;
    } else needText.innerText = '';

    strikeName.innerText = match.striker || '-'; nonstrikeName.innerText = match.nonStriker || '-'; bowlerName.innerText = match.currentBowler || '-';
    // recent balls
    const recent = (match.currentBowler && match.bowlerStats[match.currentBowler]) ? match.bowlerStats[match.currentBowler].recent||[] : [];
    recentBalls.innerHTML = recent.map(x=>`<div class="ball">${x}</div>`).join('');

    // scorecard single-line
    const sPlayer = match.striker ? match.batsmenStats[match.striker] : {runs:0,balls:0};
    $('batLine').innerText = (match.striker?match.striker:'-') + (match.striker?' *':'');
    $('batR').innerText = sPlayer.runs; $('batB').innerText = sPlayer.balls;
    $('bowLine').innerText = match.currentBowler || '-';
    const b = match.currentBowler ? match.bowlerStats[match.currentBowler] : {runs:0,wkts:0,balls:0};
    $('bowRW').innerText = `${b.runs}/${b.wkts}`; $('bowO').innerText = `${Math.floor(b.balls/6)}.${b.balls%6}`;

    // bowling table
    const tbody = $('bowlingTable').querySelector('tbody'); tbody.innerHTML = '';
    teams[match.bowlingSide].forEach(name=>{
      const bx = match.bowlerStats[name]; tbody.innerHTML += `<tr><td>${name}</td><td>${Math.floor(bx.balls/6)}.${bx.balls%6}</td><td>${bx.runs}</td><td>${bx.wkts}</td></tr>`;
    });

    // commentary
    $('commBox').innerText = (match.commentary||[]).join('\n');
  }

  // helper add commentary
  function addCommentary(text){ match.commentary.push(text); if(match.commentary.length>300) match.commentary.shift(); }

  // modal
  function modalShow(html){ modalContent.innerHTML = html; modalOverlay.style.display='flex'; }
  function modalHide(){ modalOverlay.style.display='none'; modalContent.innerHTML=''; }

  // init
  loadTeams();
  window.__sk = {teams, match, updateMatchUI};

})();
