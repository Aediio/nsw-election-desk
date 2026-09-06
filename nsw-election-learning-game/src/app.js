  (() => {
    "use strict";

    const DATA = window.NSW_GAME_DATA;
    const D3 = window.d3;
    const L = window.Learning;
    const gemini = new window.GeminiService({getItem:key=>localStorage.getItem(key),setItem:(key,value)=>localStorage.setItem(key,value),removeItem:key=>localStorage.removeItem(key)}, window.fetch.bind(window));
    const STORAGE_KEY = "nswElectionDesk.v1";
    const PARTY_NAMES = {
      ALP: "Labor", LIB: "Liberal", NAT: "Nationals", GRN: "Greens", IND: "Independent",
      ON: "One Nation", SFF: "Shooters, Fishers and Farmers", LCNSW: "Legalise Cannabis",
      AJP: "Animal Justice", LDP: "Libertarian", SAP: "Sustainable Australia"
    };
    const PARTY_ORDER = ["ALP", "LIB", "NAT", "IND", "GRN", "ON", "SFF", "LCNSW", "AJP", "LDP"];
    const PARTY_VARS = {
      ALP: "var(--party-alp)", LIB: "var(--party-lib)", NAT: "var(--party-nat)",
      GRN: "var(--party-grn)", IND: "var(--party-ind)", ON: "var(--party-on)"
    };
    const sourceById = Object.fromEntries(DATA.sources.map(source => [source.id, source]));
    const seatByName = Object.fromEntries(DATA.seats.map(seat => [seat.name, seat]));
    const allPeople = [...DATA.membersLA, ...DATA.membersLC];
    const $ = (selector, root = document) => root.querySelector(selector);
    const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];

    let state = loadState();
    let cards = buildCards();
    if (new Set(cards.map(card => card.id)).size !== cards.length) throw new Error("Duplicate flashcard IDs detected");
    let cardById = Object.fromEntries(cards.map(card => [card.id, card]));
    state.cards = L.reconcile(state.cards,cards,todayISO());
    let session = null;
    let activeDirectoryTab = "seats";
    let activeDeskTab = "watch";
    let toastTimer = null;
    let mapState = { selected: null, quiz: null, feedback: null, renderedRegion: null };

    function escapeHTML(value) {
      return String(value ?? "").replace(/[&<>'"]/g, character => ({
        "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;"
      })[character]);
    }

    function slugify(value) {
      return String(value).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
    }

    function partyName(code) { return PARTY_NAMES[code] || code || "Other"; }

    function partyBadge(code) {
      return `<span class="party" data-party="${escapeHTML(code)}">${escapeHTML(code)}</span>`;
    }

    function formatNumber(value) {
      return new Intl.NumberFormat("en-AU").format(value);
    }

    function formatPct(value, digits = 1) {
      return Number(value).toFixed(digits) + "%";
    }

    function formatDate(iso) {
      return new Intl.DateTimeFormat("en-AU", { day: "numeric", month: "short", year: "numeric" }).format(new Date(iso + "T12:00:00"));
    }

    function todayISO() {
      const now = new Date();
      const year = now.getFullYear();
      const month = String(now.getMonth() + 1).padStart(2, "0");
      const day = String(now.getDate()).padStart(2, "0");
      return `${year}-${month}-${day}`;
    }

    function addDaysISO(days) {
      const date = new Date(todayISO() + "T12:00:00");
      date.setDate(date.getDate() + days);
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, "0");
      const day = String(date.getDate()).padStart(2, "0");
      return `${year}-${month}-${day}`;
    }

    function defaultState() {
      return {
        version: 1,
        cards: {},
        activity: {
          sessions: 0, totalReviews: 0, successfulReviews: 0, highConfidenceMisses: 0,
          lastStudy: null,
          confidence: { "1": { reviews: 0, successes: 0 }, "2": { reviews: 0, successes: 0 }, "3": { reviews: 0, successes: 0 } }
        },
        settings: { theme: "system", difficulty: "standard", sessionLength: 10, confidencePrompts: true, mapAssistance: true },
        notes: {}
      };
    }

    function loadState() {
      try {
        const stored = JSON.parse(localStorage.getItem(STORAGE_KEY));
        if (!stored || stored.version !== 1) return defaultState();
        return L.importState(stored, defaultState());
      } catch (error) {
        return defaultState();
      }
    }

    function saveState() {
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); }
      catch (error) { showToast("Progress could not be saved in this browser."); }
    }

    function sourceLinks(ids = []) {
      const unique = [...new Set(ids)].map(id => sourceById[id]).filter(Boolean);
      if (!unique.length) return "";
      return `<div class="source-links">${unique.map(source => `<a href="${escapeHTML(source.url)}" target="_blank" rel="noopener">${escapeHTML(source.label)}</a>`).join("")}</div>`;
    }

    function buildCards() {
      const generated = DATA.staticCards.map(card => ({ ...card, kind: "static", tags: card.tags || [] }));

      DATA.seats.forEach(seat => {
        const watchTags = seat.watchTier ? ["watch", `tier${seat.watchTier}`] : [];
        const commonTags = [seat.name, seat.region, seat.currentParty, ...watchTags];
        generated.push({
          id: `seat-holder-${seat.slug}`,
          kind: "holder",
          domain: "Seats & people",
          prompt: `Who currently represents ${seat.name}, and for which party?`,
          answer: `${seat.currentMember} — ${partyName(seat.currentParty)} (${seat.currentParty}).`,
          explanation: seat.changedSince2023 ? `The current party differs from the official 2023 winning party, ${seat.winner2023.party}. Keep the two dated baselines separate.` : `${seat.currentMember} is the current Legislative Assembly member for ${seat.name}.`,
          sourceIds: ["parliament-members"],
          priority: seat.watchTier === 1 ? 5 : 3,
          tags: commonTags
        });
        generated.push({
          id: `member-seat-${seat.slug}`,
          kind: "member",
          domain: "Seats & people",
          prompt: `Which electorate does ${seat.currentMember} represent?`,
          answer: `${seat.name} — ${partyName(seat.currentParty)} (${seat.currentParty}).`,
          explanation: seat.region,
          sourceIds: ["parliament-members"],
          priority: seat.watchTier ? 4 : 2,
          tags: commonTags
        });
        generated.push({
          id: `result-2023-${seat.slug}`,
          kind: "result",
          domain: "2023 results",
          prompt: `Who won ${seat.name} in 2023, and what was the final margin?`,
          answer: `${seat.winner2023.display} (${seat.winner2023.party}) won with ${formatPct(seat.winner2023.finalPct, 2)} TCP — a ${formatPct(seat.margin2023, 2)} margin over ${seat.opponent2023.display} (${seat.opponent2023.party}).`,
          explanation: `Winner's primary: ${formatPct(seat.primary2023, 2)}. Turnout: ${formatPct(seat.turnout2023, 2)}; informal: ${formatPct(seat.informal2023, 2)}.`,
          sourceIds: ["nswec-results-2023"],
          priority: seat.watchTier ? 5 : 2,
          tags: commonTags
        });
        generated.push({
          id: `region-${seat.slug}`,
          kind: "region",
          domain: "Electorate map",
          prompt: `Which reporting region contains ${seat.name}?`,
          answer: seat.region,
          explanation: `Use the map to learn its shape and neighbouring electorates. This reporting region is an editorial grouping, not an official boundary.`,
          sourceIds: ["spatial-boundaries"],
          priority: seat.watchTier ? 4 : 2,
          tags: commonTags
        });
        if (seat.watchTier) {
          generated.push({
            id: `current-margin-${seat.slug}`,
            kind: "margin",
            domain: "Margin watch",
            prompt: `What is the current analyst pendulum position for ${seat.name}?`,
            answer: `${seat.currentMarginBasis}, margin ${formatPct(seat.currentMargin)}.`,
            explanation: `Snapshot dated ${formatDate(seat.currentMarginSourceAsOf)}. It is a baseline for questions, not a forecast.`,
            sourceIds: ["tallyroom-pendulum"],
            priority: seat.watchTier === 1 ? 5 : 4,
            tags: commonTags
          });
        }
      });

      DATA.membersLA.forEach(member => {
        [...member.office, ...member.ministry].forEach(role => {
          generated.push({
            id: `role-${member.memberId}-${slugify(role)}`,
            kind: "role",
            domain: "Who's who",
            prompt: `Who is ${role}?`,
            answer: `${member.name} (${member.partyCode}), member for ${member.electorate}.`,
            explanation: `Current Parliament of NSW listing as at ${formatDate(DATA.meta.contentAsOf)}.`,
            sourceIds: ["parliament-members"],
            priority: /Premier|Leader|Speaker|Treasurer|Attorney General/.test(role) ? 5 : 3,
            tags: [member.name, member.electorate, member.partyCode, role]
          });
        });
      });

      DATA.membersLC.forEach(member => {
        generated.push({
          id: `lc-member-${member.memberId}`,
          kind: "lc-member",
          domain: "Who's who",
          prompt: `Which house and party does ${member.name} belong to?`,
          answer: `Legislative Council — ${partyName(member.partyCode)} (${member.partyCode}).`,
          explanation: [...member.office, ...member.ministry].join("; ") || "Current member of the NSW upper house.",
          sourceIds: ["parliament-members"],
          priority: member.office.length || member.ministry.length ? 4 : 2,
          tags: [member.name, member.partyCode, "Legislative Council"]
        });
        [...member.office, ...member.ministry].forEach(role => {
          generated.push({
            id: `lc-role-${member.memberId}-${slugify(role)}`,
            kind: "role",
            domain: "Who's who",
            prompt: `Who is ${role}?`,
            answer: `${member.name} (${member.partyCode}), Legislative Council.`,
            explanation: `Current Parliament of NSW listing as at ${formatDate(DATA.meta.contentAsOf)}.`,
            sourceIds: ["parliament-members"],
            priority: /President|Leader|Minister|Whip/.test(role) ? 5 : 3,
            tags: [member.name, member.partyCode, role, "Legislative Council"]
          });
        });
      });

      DATA.campaignLedger.forEach(item => generated.push({
        id: `campaign-${item.id}`,
        kind: "campaign",
        domain: "Campaign ledger",
        prompt: `What did ${item.actor} put forward in “${item.title}”?`,
        answer: item.summary,
        explanation: `${item.status}. Verification: ${item.verification}`,
        sourceIds: item.sourceIds,
        priority: 4,
        tags: [item.party, item.status, item.title]
      }));

      DATA.interstateLens.forEach(item => generated.push({
        id: `interstate-${item.id}`,
        kind: "interstate",
        domain: "Interstate history",
        prompt: `What is the useful NSW reporting lesson from ${item.title}?`,
        answer: item.nswLens,
        explanation: `${item.facts} Caveat: ${item.caveat}`,
        sourceIds: item.sourceIds,
        priority: 3,
        tags: [item.title, "interstate"]
      }));

      DATA.newsroomScenarios.forEach(item => generated.push({
        id: item.id,
        kind: "scenario",
        domain: `Newsroom: ${item.category}`,
        prompt: item.prompt,
        answer: item.answer,
        explanation: `Checklist: ${item.checklist.join(" · ")}`,
        sourceIds: [],
        priority: 5,
        tags: [item.category, "scenario"]
      }));

      Object.entries(DATA.compositionLA).forEach(([party, count]) => generated.push({
        id: `composition-la-${party.toLowerCase()}`,
        kind: "composition",
        domain: "Parliament",
        prompt: `How many current Legislative Assembly members are listed for ${partyName(party)}?`,
        answer: `${count} of 93 seats.`,
        explanation: `Current Parliament listing as at ${formatDate(DATA.meta.contentAsOf)}; majority line 47.`,
        sourceIds: ["parliament-members"],
        priority: ["ALP", "LIB", "NAT"].includes(party) ? 5 : 3,
        tags: [party, "composition"]
      }));

      const transport=DATA.campaignLedger.find(x=>x.id==='labor-transport-affordability-2026');
      if(transport)generated.push({id:'number-transport-magnitude',kind:'number',domain:'Numbers',prompt:'What is the scale of the transport affordability package?',answer:transport.costing,explanation:'Treat the package cost as attributed Budget material; check the underlying time period and components.',tags:['budget'],sourceIds:transport.sourceIds,priority:4,numeric:{type:'magnitude',value:561.4,unit:' million dollars',tolerance:100,asOf:transport.date,context:'Attributed NSW Budget transport affordability package',prompt:'What is the approximate scale of the transport package?'}});
      generated.push({id:'number-trend-practice',kind:'number',domain:'Numbers',prompt:'Practice: a hypothetical service measure changes from 100 to 102. What is the trend if ±3 counts as broadly unchanged?',answer:'Broadly unchanged: the hypothetical measure rose from 100 to 102, within the stated ±3 threshold.',explanation:'Practice figures, not actual NSW statistics. Always establish the baseline, unit, period and meaningful-change threshold.',tags:['practice'],sourceIds:[],priority:3,numeric:{type:'trend',value:102,previous:100,tolerance:3,unit:' units',asOf:'practice example',context:'Hypothetical, not NSW data',prompt:'Practice: 100 units last period and 102 this period; ±3 means broadly unchanged. What is the trend?'}});
      const roles=generated.filter(c=>c.kind==='role');
      const roleCounts=Object.fromEntries(roles.map(c=>[c.prompt,roles.filter(x=>x.prompt===c.prompt).length]));
      roles.forEach(card=>{if(roleCounts[card.prompt]>1){const person=allPeople.find(p=>card.answer.startsWith(p.name+' ('));if(person){const role=card.prompt.slice(7,-1);card.prompt='Which of these is a listed parliamentary office of '+person.name+'?';card.answer=role;card.kind='shared-office';card.distractors=[...new Set(allPeople.flatMap(personRoles))].filter(r=>!personRoles(person).includes(r)).slice(0,8);}}});
      generated.forEach(card => {
        const seat=DATA.seats.find(s=>card.tags.includes(s.name));
        card.neighbours=seat?.neighbours||[];
        card.contentDifficulty=card.priority>=5?1:card.kind==='scenario'?5:3;
        card.factId=card.id;
        if(['margin','result'].includes(card.kind)&&seat){const historical=card.kind==='result',field=historical?'margin2023':'currentMargin';
          card.numeric={value:seat[field],unit:'%',tolerance:0.5,name:seat.name,asOf:historical?'2023-03-25':seat.currentMarginSourceAsOf,context:historical?'Official 2023 TCP margin':'Tally Room analyst margin; not a forecast',prompt:'How marginal is '+seat.name+' on the '+(historical?'official 2023 result?':'dated analyst pendulum?'),comparisons:DATA.seats.filter(x=>x.name!==seat.name&&x[field]!==seat[field]).sort((a,b)=>Math.abs(a[field]-seat[field])-Math.abs(b[field]-seat[field])).filter((x,i,a)=>a.findIndex(y=>y[field]===x[field])===i).slice(0,2).map(x=>({name:x.name,value:x[field]}))};
        }
      });
      return generated;
    }

    function cardState(cardId) {
      return state.cards[cardId] || null;
    }

    function dueCards() {
      const today = todayISO();
      return cards.filter(card => {
        const progress = cardState(card.id);
        return progress && progress.due <= today;
      });
    }

    function shuffled(values) {
      const copy = [...values];
      for (let index = copy.length - 1; index > 0; index -= 1) {
        const swap = Math.floor(Math.random() * (index + 1));
        [copy[index], copy[swap]] = [copy[swap], copy[index]];
      }
      return copy;
    }

    function modeCards(mode) {
      switch (mode) {
        case "updated": return cards.filter(card => cardState(card.id)?.updated);
        case "weakest": return cards.filter(card => (cardState(card.id)?.lapses||0)>0).sort((a,b)=>(cardState(b.id).lapses||0)-(cardState(a.id).lapses||0));
        case "basics": return cards.filter(card => card.kind === "static" || card.kind === "number");
        case "marginals": return cards.filter(card => card.tags.includes("watch"));
        case "results": return cards.filter(card => card.kind === "result" || card.kind === "margin");
        case "people": return cards.filter(card => ["holder", "member", "role", "shared-office", "lc-member"].includes(card.kind));
        case "parliament": return cards.filter(card => card.domain === "Parliament" || card.kind === "composition");
        case "campaign": return cards.filter(card => ["campaign", "interstate"].includes(card.kind));
        case "scenarios": return cards.filter(card => card.kind === "scenario");
        default: return cards;
      }
    }

    function chooseSessionCards(mode, size) {
      const today = todayISO();
      let pool = modeCards(mode);
      if(state.settings.difficulty==='beginner'&&!['updated','weakest'].includes(mode))pool=pool.filter(c=>c.contentDifficulty<=3);
      const due = pool.filter(card => cardState(card.id)?.due <= today).sort((left, right) => {
        const a = cardState(left.id); const b = cardState(right.id);
        return a.due.localeCompare(b.due) || (b.lapses || 0) - (a.lapses || 0) || (right.priority || 0) - (left.priority || 0);
      });
      const unseen = shuffled(pool.filter(card => !cardState(card.id))).sort((left, right) => (right.priority || 0) - (left.priority || 0));
      const future = shuffled(pool.filter(card => cardState(card.id) && cardState(card.id).due > today));
      const selected = [];
      for (const card of [...due, ...unseen, ...future]) {
        if (selected.some(existing => existing.id === card.id)) continue;
        selected.push(card);
        if (selected.length >= size) break;
      }
      if(mode==='daily'&&selected.length>=5){
        const additions=[pool.find(c=>c.kind==='region'),pool.find(c=>c.kind==='scenario'),pool.find(c=>cardState(c.id)?.updated)].filter(Boolean);
        additions.forEach((c,i)=>{if(!selected.some(x=>x.id===c.id))selected[selected.length-1-i]=c;});
      }
      return interleaveDomains(selected);
    }

    function interleaveDomains(values) {
      const groups = new Map();
      values.forEach(card => {
        if (!groups.has(card.domain)) groups.set(card.domain, []);
        groups.get(card.domain).push(card);
      });
      const output = [];
      while ([...groups.values()].some(group => group.length)) {
        [...groups.values()].forEach(group => { if (group.length) output.push(group.shift()); });
      }
      return output;
    }

    function startSession(mode = "daily") {
      const size = mode === "scenarios" ? 5 : state.settings.sessionLength;
      const selected = chooseSessionCards(mode, size);
      session = {
        mode,
        cards: selected,
        index: 0,
        confidence: null,
        revealed: false,
        ratings: { again: 0, hard: 0, good: 0 },
        repeated: new Set()
      };
      switchView("drill");
      renderDrill();
    }

    function renderDrill() {
      const area = $("#drill-area");
      if (!session) {
        area.innerHTML = `<article class="card empty"><h2>Pick a deck above</h2><p>Daily 10 mixes overdue material with high-priority new cards. Other decks let you target one reporting skill.</p></article>`;
        return;
      }
      if (session.index >= session.cards.length) {
        if (!session.completed) state.activity.sessions += 1;
        session.completed = true;
        state.activity.lastStudy = todayISO();
        saveState();
        const reviewed = session.ratings.again + session.ratings.hard + session.ratings.good;
        const stable = session.ratings.good;
        area.innerHTML = `<article class="card session-complete">
          <div class="eyebrow">Run complete</div><h2>${escapeHTML(modeLabel(session.mode))}</h2>
          <p class="muted">Short retrieval sessions work best when repeated after some forgetting. Your due dates have been updated on this device.</p>
          <div class="stat-grid"><div class="stat"><span class="stat-value">${reviewed}</span><span class="stat-label">reviews</span></div><div class="stat"><span class="stat-value">${stable}</span><span class="stat-label">got it</span></div><div class="stat"><span class="stat-value">${session.ratings.again}</span><span class="stat-label">to revisit</span></div></div>
          <button class="button primary block" type="button" data-restart-session>Run another ${escapeHTML(modeLabel(session.mode))}</button>
        </article>`;
        renderToday();
        return;
      }

      const card = session.cards[session.index];
      const difficulty = L.difficulty(state.settings.difficulty, cardState(card.id)||{});
      session.question=L.question(card,difficulty,cards,cardState(card.id)||{});
      session.startedAt=Date.now(); session.selectedAnswer=null; session.order=[]; session.correct=null;
      const q=session.question;
      const total = session.cards.length;
      const position = session.index + 1;
      area.innerHTML = `<div class="small muted tabular">Card ${position} of ${total}</div>
        <div class="progress-line" role="progressbar" aria-label="Session progress" aria-valuemin="0" aria-valuemax="${total}" aria-valuenow="${session.index}"><div class="progress-fill" style="width:${(session.index / total) * 100}%"></div></div>
        <article class="flashcard card">
          <div class="eyebrow">${escapeHTML(card.domain)} · ${escapeHTML(difficulty)} ${cardState(card.id)?.updated ? "· UPDATED" : ""}</div>
          <h2 class="flash-prompt">${escapeHTML(q.prompt)}</h2>
          ${questionHTML(q)}
          <span class="recall-label">How sure are you?</span>
          <div class="confidence-grid" aria-label="Confidence">
            <button class="button" type="button" data-confidence="1" aria-pressed="false">Guessing</button>
            <button class="button" type="button" data-confidence="2" aria-pressed="false">Fairly sure</button>
            <button class="button" type="button" data-confidence="3" aria-pressed="false">Certain</button>
          </div>
          <button class="button primary block reveal" id="reveal-button" type="button" disabled>Reveal answer</button>
          <div class="answer-panel" id="answer-panel" hidden aria-live="polite">
            <div class="small muted">Answer</div>
            <p id="answer-verdict" role="status"></p>
            <div class="answer-text">${escapeHTML(card.answer)}</div>
            ${q.exact ? `<p class="notice">Exact value: ${escapeHTML(q.exact)}</p>` : ""}
            <p class="muted">${escapeHTML(card.explanation || "")}</p>
            ${sourceLinks(card.sourceIds)}
            <button class="button" type="button" data-ai-card>Memory clue / explain</button><div id="ai-card-result" aria-live="polite"></div>
            <span class="recall-label">How did recall go?</span>
            <div class="rating-grid">
              <button class="button" type="button" data-rating="again">Again</button>
              <button class="button" type="button" data-rating="hard">Hard</button>
              <button class="button primary" type="button" data-rating="good">Got it</button>
            </div>
          </div>
        </article>`;
      if(!state.settings.confidencePrompts){session.confidence=1;$(".confidence-grid",area).hidden=true;updateCommitButton();}
    }

    function modeLabel(mode) {
      return ({ updated: "Updated facts", weakest: "Weakest knowledge", daily: "Daily mission", basics: "Core facts", marginals: "Margin watch", results: "2023 results", people: "Who's who", parliament: "Parliament", campaign: "Campaign", scenarios: "Newsroom five" })[mode] || mode;
    }

    function setConfidence(value) {
      if (!session || session.revealed) return;
      session.confidence = Number(value);
      $$("[data-confidence]").forEach(button => button.setAttribute("aria-pressed", String(Number(button.dataset.confidence) === session.confidence)));
      updateCommitButton();
    }

    function revealAnswer() {
      if (!session || session.revealed || !session.confidence) return;
      const q=session.question;
      if(['choice','ordering'].includes(q.format)&&!session.selectedAnswer)return;
      const typed=$('#recall-note')?.value?.trim()||'';
      if(q.format==='estimate'&&!typed)return;
      session.correct=q.format==='estimate'?L.estimate(typed,Number(q.answer),q.tolerance):q.format==='choice'||q.format==='ordering'?session.selectedAnswer===q.answer:null;
      session.wrongAnswer=session.selectedAnswer||typed;
      session.revealed = true;
      $('#answer-verdict').textContent=session.correct===null?'Compare your recall with the model answer.':session.correct?'Correct.':'Not quite — you chose '+session.wrongAnswer+'. Review the sourced answer below.';
      if(session.correct===false){$('[data-rating="good"]').disabled=true;$('[data-rating="hard"]').disabled=true;}
      $$('[data-choice], [data-order], #recall-note').forEach(el=>el.disabled=true);
      $("#answer-panel").hidden = false;
      $("#reveal-button").hidden = true;
      $$("[data-confidence]").forEach(button => button.disabled = true);
      $("#answer-panel").scrollIntoView({ behavior: "smooth", block: "end" });
    }

    function rateCurrentCard(rating) {
      if (!session || !session.revealed) return;
      const card = session.cards[session.index];
      const confidence = session.confidence;
      const success = session.correct===false?false:rating!=='again';
      if(!success)rating='again';
      state.cards[card.id]=L.review(state.cards[card.id],{day:todayISO(),correct:success,confidence,level:session.question.level,wrongAnswer:session.wrongAnswer,contentVersion:L.version(card),responseTime:Date.now()-session.startedAt});
      state.activity.totalReviews += 1;
      state.activity.successfulReviews += success ? 1 : 0;
      state.activity.lastStudy = todayISO();
      state.activity.confidence[String(confidence)].reviews += 1;
      state.activity.confidence[String(confidence)].successes += success ? 1 : 0;
      if (rating === "again" && confidence === 3) state.activity.highConfidenceMisses += 1;
      session.ratings[rating] += 1;

      if (rating === "again" && !session.repeated.has(card.id)) {
        session.repeated.add(card.id);
        session.cards.splice(Math.min(session.index + 3, session.cards.length), 0, card);
      }

      session.index += 1;
      session.confidence = null;
      session.revealed = false;
      saveState();
      renderDrill();
    }

    function daysToElection() {
      const now = new Date();
      const election = new Date(DATA.meta.electionDate + "T08:00:00");
      return Math.max(0, Math.ceil((election - now) / 86400000));
    }

    function renderToday() {
      $("#days-count").textContent = daysToElection();
      const due = dueCards().length;
      const seen = Object.keys(state.cards).filter(id => cardById[id]).length;
      const stable = Object.entries(state.cards).filter(([id, progress]) => cardById[id] && progress.mastery === "mastered").length;
      $("#today-stats").innerHTML = `<div class="stat"><span class="stat-value">${due}</span><span class="stat-label">due now</span></div><div class="stat"><span class="stat-value">${seen}</span><span class="stat-label">cards seen</span></div><div class="stat"><span class="stat-value">${stable}</span><span class="stat-label">mastered recall</span></div>`;
      const watch = DATA.seats.filter(seat => seat.watchTier === 1).sort((a, b) => a.currentMargin - b.currentMargin).slice(0, 6);
      $("#today-watchlist").innerHTML = watch.map(seatRow).join("");
      const latest = [...DATA.campaignLedger].sort((a, b) => b.date.localeCompare(a.date))[0];
      $("#today-campaign").innerHTML = renderLedgerCard(latest, true);
      const updated=cards.filter(c=>cardState(c.id)?.updated).length;
      $('#learning-summary').innerHTML='<p>'+escapeHTML(state.settings.difficulty)+' difficulty · '+state.settings.sessionLength+' cards per mission · '+updated+' updated facts</p><button class="button" data-start-mode="updated">Review updated facts</button> <button class="button" data-start-mode="weakest">Weakest knowledge</button><p class="small muted">Snapshot '+formatDate(DATA.meta.contentAsOf)+' · '+(Date.now()-Date.parse(DATA.meta.contentAsOf)>14*86400000?'Stale: review current sources':'Within 14-day review window')+'.</p>';

    }

    function seatRow(seat) {
      return `<button class="list-row" type="button" data-open-seat="${escapeHTML(seat.name)}">
        <span><strong>${escapeHTML(seat.name)}</strong><span class="row-sub">${escapeHTML(seat.currentMember)} · ${escapeHTML(seat.region)}</span></span>
        <span class="row-end">${partyBadge(seat.currentParty)}<strong>${formatPct(seat.currentMargin)} margin</strong></span>
      </button>`;
    }

    function renderLedgerCard(item, compact = false) {
      return `<article class="ledger-card card">
        <div class="ledger-head"><div><div class="ledger-meta">${formatDate(item.date)} · ${escapeHTML(item.actor)}</div><h3>${escapeHTML(item.title)}</h3></div>${partyBadge(item.party)}</div>
        <p>${escapeHTML(item.summary)}</p>
        ${compact ? "" : `<div class="ledger-detail"><p><strong>Status:</strong> ${escapeHTML(item.status)}</p><p><strong>Costing:</strong> ${escapeHTML(item.costing)}</p><p><strong>Geography:</strong> ${escapeHTML(item.geography)}</p><p><strong>Verification:</strong> ${escapeHTML(item.verification)}</p></div>${sourceLinks(item.sourceIds)}`}
      </article>`;
    }

    function populateFilters() {
      const seatParties = [...new Set(DATA.seats.map(seat => seat.currentParty))].sort((a, b) => PARTY_ORDER.indexOf(a) - PARTY_ORDER.indexOf(b));
      $("#seat-party").insertAdjacentHTML("beforeend", seatParties.map(code => `<option value="${escapeHTML(code)}">${escapeHTML(partyName(code))} (${escapeHTML(code)})</option>`).join(""));
      const peopleParties = [...new Set(allPeople.map(person => person.partyCode))].sort((a, b) => partyName(a).localeCompare(partyName(b)));
      $("#people-party").insertAdjacentHTML("beforeend", peopleParties.map(code => `<option value="${escapeHTML(code)}">${escapeHTML(partyName(code))} (${escapeHTML(code)})</option>`).join(""));
      $("#map-region").innerHTML = `<option value="">All NSW</option>` + DATA.regions.map(region => `<option value="${escapeHTML(region)}">${escapeHTML(region)}</option>`).join("");
    }

    function renderSeats() {
      const query = $("#seat-search").value.trim().toLowerCase();
      const party = $("#seat-party").value;
      const focus = $("#seat-focus").value;
      const results = DATA.seats.filter(seat => {
        const haystack = `${seat.name} ${seat.currentMember} ${seat.region}`.toLowerCase();
        if (query && !haystack.includes(query)) return false;
        if (party && seat.currentParty !== party) return false;
        if (focus === "tier1" && seat.watchTier !== 1) return false;
        if (focus === "tier2" && !seat.watchTier) return false;
        if (focus === "changed" && !seat.changedSince2023) return false;
        return true;
      });
      $("#seat-count").textContent = `${results.length} of 93 seats`;
      $("#seat-list").innerHTML = results.length ? results.map(seatRow).join("") : `<div class="card empty">No seats match those filters.</div>`;
    }

    function personRoles(person) {
      return [...(person.office || []), ...(person.ministry || [])];
    }

    function renderPeople() {
      const query = $("#people-search").value.trim().toLowerCase();
      const house = $("#people-house").value;
      const party = $("#people-party").value;
      const results = allPeople.filter(person => {
        const haystack = `${person.name} ${person.electorate || ""} ${person.party} ${personRoles(person).join(" ")}`.toLowerCase();
        return (!query || haystack.includes(query)) && (!house || person.house === house) && (!party || person.partyCode === party);
      }).sort((a, b) => a.name.localeCompare(b.name));
      $("#people-count").textContent = `${results.length} current members`;
      $("#people-list").innerHTML = results.length ? results.map(person => {
        const role = personRoles(person)[0] || (person.house === "Legislative Assembly" ? `Member for ${person.electorate}` : "Member of the Legislative Council");
        return `<button class="list-row" type="button" data-open-person="${escapeHTML(person.memberId)}"><span><strong>${escapeHTML(person.name)}</strong><span class="row-sub">${escapeHTML(role)}</span></span><span class="row-end">${partyBadge(person.partyCode)}<span class="row-sub">${person.house === "Legislative Assembly" ? "Assembly" : "Council"}</span></span></button>`;
      }).join("") : `<div class="card empty">No people match those filters.</div>`;
    }

    function compositionHTML(composition, total) {
      const entries = Object.entries(composition).sort(([a], [b]) => PARTY_ORDER.indexOf(a) - PARTY_ORDER.indexOf(b));
      return `<div class="composition-bar" role="img" aria-label="${entries.map(([party, count]) => `${partyName(party)} ${count}`).join(", ")}">${entries.map(([party, count]) => `<span class="composition-segment" data-party="${escapeHTML(party)}" style="width:${count / total * 100}%" title="${escapeHTML(partyName(party))}: ${count}"></span>`).join("")}</div><div class="composition-key">${entries.map(([party, count]) => `<span><i class="legend-swatch" data-party="${escapeHTML(party)}" style="--swatch:var(--party-color)"></i>${escapeHTML(partyName(party))} ${count}</span>`).join("")}</div>`;
    }

    function renderParliament() {
      const keyPattern = /^(Premier|Deputy Premier|Speaker|President|Leader of the Opposition|Leader of the Government|Leader of the House|Leader of the Nationals)/;
      const keyPeople = allPeople.flatMap(person => personRoles(person).filter(role => keyPattern.test(role)).map(role => ({ person, role }))).sort((a, b) => a.role.localeCompare(b.role));
      $("#parliament-content").innerHTML = `
        <div class="notice">Current composition is calculated from the Parliament of NSW member directory dated ${formatDate(DATA.meta.contentAsOf)}. It can differ from the 2023 election result after by-elections or party changes.</div>
        <section class="section"><div class="section-title"><h2>Legislative Assembly</h2><span class="small muted">93 seats · majority 47</span></div><article class="card info-card">${compositionHTML(DATA.compositionLA, 93)}</article></section>
        <section class="section"><div class="section-title"><h2>Legislative Council</h2><span class="small muted">42 members · 21 elected in 2027</span></div><article class="card info-card">${compositionHTML(DATA.compositionLC, 42)}</article></section>
        <section class="section"><div class="section-title"><h2>How the two houses differ</h2></div><div class="info-grid">
          <article class="card info-card"><h3>Assembly · lower house</h3><p>Government is formed here. One member represents each of 93 districts for four years under optional preferential voting.</p></article>
          <article class="card info-card"><h3>Council · upper house</h3><p>Members represent NSW statewide for eight years under proportional representation. Half — 21 — face election each ordinary cycle.</p></article>
          <article class="card info-card"><h3>Executive</h3><p>The Premier and ministers administer government through portfolios. Their authority is political and statutory; departments and agencies deliver programs.</p></article>
          <article class="card info-card"><h3>Scrutiny</h3><p>Questions, committees, estimates, independent officers and the Council test legislation and administration. The Council has broad co-equal law-making power except for some money bills.</p></article>
        </div>${sourceLinks(["parliament-assembly", "parliament-council", "nswec-voting"])}</section>
        <section class="section"><div class="section-title"><h2>Power and delivery chain</h2></div><article class="card info-card"><ol class="power-chain">
          <li><strong>NSW electors</strong><span>Choose one local Assembly member and vote in the statewide Council contest.</span></li>
          <li><strong>Parliament</strong><span>The Assembly determines who can form government; both houses make laws and scrutinise administration.</span></li>
          <li><strong>Premier, ministers and Cabinet</strong><span>Set political priorities and exercise portfolio responsibilities; formal Executive Council processes give effect to some decisions.</span></li>
          <li><strong>Departments and agencies</strong><span>Public servants administer laws, advise ministers and deliver programs. Political offices and the non-partisan public service are different institutions.</span></li>
          <li><strong>Accountability network</strong><span>Opposition, crossbench, committees, courts and independent integrity and audit bodies test decisions through different powers.</span></li>
        </ol></article></section>
        <section class="section"><div class="section-title"><h2>Party and campaign structure</h2></div><div class="info-grid">
          <article class="card info-card"><h3>Parliamentary wing</h3><p>Leaders, deputies, ministers or shadow ministers, whips and the party room coordinate parliamentary strategy and discipline.</p></article>
          <article class="card info-card"><h3>Organisational wing</h3><p>Branches, state executives, conferences and party administration shape rules, preselections, membership and campaign support. Exact powers differ by party.</p></article>
          <article class="card info-card"><h3>Central campaign</h3><p>Leader's office, party headquarters, campaign directors, research, media, digital, field and fundraising teams allocate scarce resources across seats.</p></article>
          <article class="card info-card"><h3>Local campaigns</h3><p>Candidates, electorate offices, volunteers and local networks gather intelligence and execute field plans; third-party campaigners sit outside this chain.</p></article>
        </div></section>
        <section class="section"><div class="section-title"><h2>Key parliamentary offices</h2></div><div class="list">${keyPeople.map(({person, role}) => `<button class="list-row" type="button" data-open-person="${escapeHTML(person.memberId)}"><span><strong>${escapeHTML(role)}</strong><span class="row-sub">${escapeHTML(person.name)}${person.electorate ? ` · ${escapeHTML(person.electorate)}` : ""}</span></span>${partyBadge(person.partyCode)}</button>`).join("")}</div></section>`;
    }

    function openSeat(name) {
      const seat = seatByName[name];
      if (!seat) return;
      const change = seat.changedSince2023 ? `<div class="notice">Current holder: ${partyName(seat.currentParty)}. Official 2023 winner: ${partyName(seat.winner2023.party)}. These are intentionally shown as separate dated facts.</div>` : "";
      const candidates = [...seat.candidates2023].sort((a, b) => b.primaryPct - a.primaryPct);
      const notes = state.notes[seat.name] || "";
      openDialog(seat.name, `
        <div class="ledger-head"><div><div class="ledger-meta">${escapeHTML(seat.region)}</div><h3>${escapeHTML(seat.currentMember)} ${partyBadge(seat.currentParty)}</h3></div>${seat.watchTier ? `<span class="watch-badge">Watch tier ${seat.watchTier}</span>` : ""}</div>
        <div class="fact-grid">
          <div class="fact"><span>Current analyst margin</span><strong>${escapeHTML(seat.currentMarginBasis)} · ${formatPct(seat.currentMargin)}</strong></div>
          <div class="fact"><span>Official 2023 margin</span><strong>${seat.winner2023.party} · ${formatPct(seat.margin2023, 2)}</strong></div>
          <div class="fact"><span>2023 winner primary</span><strong>${formatPct(seat.primary2023, 2)}</strong></div>
          <div class="fact"><span>2023 enrolment</span><strong>${formatNumber(seat.enrolled2023)}</strong></div>
          <div class="fact"><span>2023 turnout</span><strong>${formatPct(seat.turnout2023, 2)}</strong></div>
          <div class="fact"><span>2023 informal</span><strong>${formatPct(seat.informal2023, 2)}</strong></div>
        </div>
        ${change}
        ${seat.watchReasons.length ? `<section class="section"><h3>Why it is on the watchlist</h3><ul>${seat.watchReasons.map(reason => `<li>${escapeHTML(reason)}</li>`).join("")}</ul><p class="small muted">Watch tier is an editorial attention flag, not a prediction.</p></section>` : ""}
        <section class="section"><h3>Official 2023 final pair</h3><p><strong>${escapeHTML(seat.winner2023.display)} (${escapeHTML(seat.winner2023.party)})</strong> ${formatPct(seat.winner2023.finalPct, 2)} · ${escapeHTML(seat.opponent2023.display)} (${escapeHTML(seat.opponent2023.party)}) ${formatPct(seat.opponent2023.finalPct, 2)}</p></section>
        <section class="section"><h3>2023 first preferences</h3><table class="candidate-table"><thead><tr><th>Candidate</th><th>Party</th><th>Primary</th></tr></thead><tbody>${candidates.map(candidate => `<tr><td>${escapeHTML(candidate.name)}</td><td>${escapeHTML(candidate.party)}</td><td>${formatPct(candidate.primaryPct, 2)}</td></tr>`).join("")}</tbody></table></section>
        <section class="section"><h3>Adjacent districts</h3><div class="chip-row">${seat.neighbours.length ? seat.neighbours.map(neighbour => `<button class="chip" type="button" data-dialog-seat="${escapeHTML(neighbour)}">${escapeHTML(neighbour)}</button>`).join("") : `<span class="muted small">No shared land-boundary match in the simplified map.</span>`}</div></section>
        <section class="section"><label class="field" for="seat-note">Private reporting notes<textarea id="seat-note" data-seat-note="${escapeHTML(seat.name)}" placeholder="Contacts, visits, local issues, questions…">${escapeHTML(notes)}</textarea></label><button class="button" type="button" data-save-seat-note="${escapeHTML(seat.name)}">Save note on this device</button></section>
        <div class="notice section">Candidate lists and campaign intensity are not inferred here. Add them only when sourced. The current margin is an analyst snapshot dated ${formatDate(seat.currentMarginSourceAsOf)}.</div>
        ${sourceLinks(["parliament-members", "nswec-results-2023", "tallyroom-pendulum", "spatial-boundaries"])}
      `);
    }

    function openPerson(memberId) {
      const person = allPeople.find(member => member.memberId === String(memberId));
      if (!person) return;
      const roles = personRoles(person);
      openDialog(person.name, `
        <div class="ledger-head"><div><div class="ledger-meta">${escapeHTML(person.house)}</div><h3>${person.electorate ? `Member for ${escapeHTML(person.electorate)}` : "Statewide upper-house member"}</h3></div>${partyBadge(person.partyCode)}</div>
        <p>${escapeHTML(person.party)}</p>
        <section class="section"><h3>Current listed roles</h3>${roles.length ? `<ul>${roles.map(role => `<li>${escapeHTML(role)}</li>`).join("")}</ul>` : `<p class="muted">No ministry or parliamentary office is listed in the current directory record.</p>`}</section>
        ${person.electorate ? `<button class="button" type="button" data-dialog-seat="${escapeHTML(person.electorate)}">Open ${escapeHTML(person.electorate)} profile</button>` : ""}
        ${sourceLinks(["parliament-members"])}
      `);
    }

    function openDialog(title, html) {
      $("#dialog-title").textContent = title;
      $("#dialog-body").innerHTML = html;
      const dialog = $("#detail-dialog");
      if (typeof dialog.showModal === "function") dialog.showModal();
      else dialog.setAttribute("open", "");
    }

    function closeDialog() {
      const dialog = $("#detail-dialog");
      if (typeof dialog.close === "function") dialog.close();
      else dialog.removeAttribute("open");
    }

    function setDirectoryTab(tab) {
      activeDirectoryTab = tab;
      $$('[data-directory-tab]').forEach(button => button.setAttribute("aria-selected", String(button.dataset.directoryTab === tab)));
      ["seats", "people", "parliament"].forEach(name => $("#directory-" + name).hidden = name !== tab);
      if (tab === "seats") renderSeats();
      if (tab === "people") renderPeople();
      if (tab === "parliament") renderParliament();
    }

    function renderWatch() {
      const watched = DATA.seats.filter(seat => seat.watchTier).sort((a, b) => a.watchTier - b.watchTier || a.currentMargin - b.currentMargin || a.name.localeCompare(b.name));
      $("#watch-content").innerHTML = `<div class="notice">This watchlist ranks editorial attention from current margin, non-classic contest and holder-change signals. It does not claim a party is campaigning hard without observed evidence, and it is not a seat forecast.</div>
        <section class="section"><div class="section-title"><h2>Tier 1 · immediate baseline</h2><span class="small muted">Usually ≤4 points</span></div><div class="list">${watched.filter(seat => seat.watchTier === 1).map(seatRow).join("")}</div></section>
        <section class="section"><div class="section-title"><h2>Tier 2 · structural watch</h2><span class="small muted">Close or non-classic</span></div><div class="list">${watched.filter(seat => seat.watchTier === 2).map(seatRow).join("")}</div></section>
        <section class="section"><article class="card info-card"><h3>Campaign-intensity log</h3><p class="muted">For each watched seat, record dated leader visits, candidate launches, staffing, paid advertising, direct mail, local promises and defensive responses. Seat notes are stored on this device inside each profile.</p></article></section>`;
    }

    function renderCampaign() {
      const entries = [...DATA.campaignLedger].sort((a, b) => b.date.localeCompare(a.date));
      $("#campaign-content").innerHTML = `<div class="notice">Snapshot current to ${formatDate(DATA.meta.contentAsOf)}. “Budget measure” and “election pitch” are different statuses; claims are summarised, not endorsed.</div><div class="section">${entries.map(item => renderLedgerCard(item)).join("")}</div>`;
    }

    function renderInterstate() {
      $("#interstate-content").innerHTML = `<div class="notice">Interstate results are comparison prompts, not templates. Electoral systems, party systems and local contexts differ.</div><div class="section">${[...DATA.interstateLens].sort((a, b) => b.date.localeCompare(a.date)).map(item => `<article class="ledger-card card"><div class="ledger-meta">${formatDate(item.date)}</div><h3>${escapeHTML(item.title)}</h3><p><strong>Result:</strong> ${escapeHTML(item.facts)}</p><div class="ledger-detail"><p><strong>NSW lens:</strong> ${escapeHTML(item.nswLens)}</p><p><strong>Caveat:</strong> ${escapeHTML(item.caveat)}</p></div>${sourceLinks(item.sourceIds)}</article>`).join("")}</div>`;
    }

    function renderKit() {
      $("#kit-content").innerHTML = `<div class="notice">The useful habit is to attach a date, denominator, geography, source and comparison basis to every number.</div><div class="section">${DATA.reportingDomains.map(domain => `<details><summary>${escapeHTML(domain.title)} — ${escapeHTML(domain.why)}</summary><div class="details-body"><h3>Track</h3><ul>${domain.metrics.map(metric => `<li>${escapeHTML(metric)}</li>`).join("")}</ul><h3>Ask</h3><ul>${domain.reporterQuestions.map(question => `<li>${escapeHTML(question)}</li>`).join("")}</ul></div></details>`).join("")}</div>`;
    }

    function domainProgress() {
      const groups = {};
      cards.forEach(card => {
        if (!groups[card.domain]) groups[card.domain] = { seen: 0, total: 0, score: 0 };
        groups[card.domain].total += 1;
        const progress = cardState(card.id);
        if (progress) {
          groups[card.domain].seen += 1;
          groups[card.domain].score += ({mastered:1,learned:0.5,familiar:0.2,learning:0}[progress.mastery]||0);
        }
      });
      return groups;
    }

    function renderProgress() {
      const activity = state.activity;
      const accuracy = activity.totalReviews ? Math.round(activity.successfulReviews / activity.totalReviews * 100) : 0;
      const domains = Object.entries(domainProgress()).sort((a, b) => b[1].seen - a[1].seen);
      const calibration = [1, 2, 3].map(level => {
        const bucket = activity.confidence[String(level)];
        const result = bucket.reviews ? Math.round(bucket.successes / bucket.reviews * 100) + "% successful" : "No reviews yet";
        return `<div class="stat"><span class="stat-value">${bucket.reviews}</span><span class="stat-label">${["guessing", "fairly sure", "certain"][level - 1]} · ${result}</span></div>`;
      }).join("");
      $("#progress-content").innerHTML = `
        <div class="stat-grid"><div class="stat"><span class="stat-value">${activity.totalReviews}</span><span class="stat-label">total reviews</span></div><div class="stat"><span class="stat-value">${accuracy}%</span><span class="stat-label">not marked “again”</span></div><div class="stat"><span class="stat-value">${activity.highConfidenceMisses}</span><span class="stat-label">confident misses</span></div></div>
        <section class="section"><div class="section-title"><h2>Confidence calibration</h2></div><div class="stat-grid">${calibration}</div><p class="small muted">Confident misses are especially useful: they expose facts that feel known but are not yet retrievable.</p></section>
        <section class="section"><div class="section-title"><h2>Spacing by domain</h2></div>${domains.map(([name, progress]) => { const percent = progress.total ? Math.round(progress.score / progress.total * 100) : 0; return `<div class="mastery-row"><div class="mastery-head"><span>${escapeHTML(name)}</span><span>${progress.seen}/${progress.total} seen · ${percent}% spaced</span></div><div class="meter" role="progressbar" aria-label="${escapeHTML(name)} spacing" aria-valuenow="${percent}" aria-valuemin="0" aria-valuemax="100"><span style="width:${percent}%"></span></div></div>`; }).join("")}</section>
        <section class="section"><div class="section-title"><h2>Keep your data</h2></div><div class="info-grid"><article class="card info-card"><h3>Export</h3><p class="muted">Download progress and private seat notes before clearing browser data or moving devices.</p><button class="button" type="button" data-export-progress>Export progress</button></article><article class="card info-card"><h3>Import</h3><p class="muted">Restore a progress JSON created by this game.</p><label class="button" style="display:inline-flex;align-items:center">Choose file<input type="file" accept="application/json" data-import-progress hidden></label></article></div><button class="button danger section" type="button" data-reset-progress>Reset all local progress</button></section>`;
    }

    function setDeskTab(tab) {
      activeDeskTab = tab;
      $$('[data-desk-tab]').forEach(button => button.setAttribute("aria-selected", String(button.dataset.deskTab === tab)));
      ["watch", "campaign", "interstate", "kit", "progress"].forEach(name => $("#desk-" + name).hidden = name !== tab);
      if (tab === "watch") renderWatch();
      if (tab === "campaign") renderCampaign();
      if (tab === "interstate") renderInterstate();
      if (tab === "kit") renderKit();
      if (tab === "progress") renderProgress();
    }

    function mapFill(seat, layer) {
      if($('#map-mode').value==='locate'&&['hard','expert'].includes(L.difficulty(state.settings.difficulty)))return 'var(--surface-3)';
      if (layer === "current") return PARTY_VARS[seat.currentParty] || "var(--party-other)";
      if (layer === "result2023") return PARTY_VARS[seat.winner2023.party] || "var(--party-other)";
      if (layer === "watch") {
        if (seat.currentMargin <= 2) return "var(--danger)";
        if (seat.currentMargin <= 4) return "var(--accent)";
        if (seat.currentMargin <= 8) return "var(--warn)";
        return "var(--surface-3)";
      }
      if (seat.turnout2023 >= 90) return "var(--brand)";
      if (seat.turnout2023 >= 87) return "var(--brand-2)";
      if (seat.turnout2023 >= 84) return "var(--good)";
      return "var(--warn)";
    }

    function renderMapLegend(layer) {
      let entries;
      if (layer === "current" || layer === "result2023") {
        entries = [["ALP", "Labor"], ["LIB", "Liberal"], ["NAT", "Nationals"], ["GRN", "Greens"], ["IND", "Independent"], ["OTHER", "Other"]].map(([code, label]) => [PARTY_VARS[code] || "var(--party-other)", label]);
      } else if (layer === "watch") {
        entries = [["var(--danger)", "≤2 points"], ["var(--accent)", "2.1–4"], ["var(--warn)", "4.1–8"], ["var(--surface-3)", ">8 points"]];
      } else {
        entries = [["var(--brand)", "90%+"], ["var(--brand-2)", "87–89.9%"], ["var(--good)", "84–86.9%"], ["var(--warn)", "below 84%"]];
      }
      $("#map-legend").innerHTML = entries.map(([color, label]) => `<span class="legend-item"><i class="legend-swatch" style="--swatch:${color}"></i>${escapeHTML(label)}</span>`).join("");
    }

    function renderMap() {
      if (!D3) {
        $("#map-detail").innerHTML = `<p>Map library failed to load.</p>`;
        return;
      }
      const host = $("#map-host");
      const width = Math.max(300, Math.floor(host.getBoundingClientRect().width));
      const height = width < 620 ? Math.max(430, Math.min(590, Math.round(width * 1.22))) : 620;
      const region = $("#map-region").value;
      const layer = $("#map-layer").value;
      const features = region ? DATA.boundaries.features.filter(feature => seatByName[feature.properties.name].region === region) : DATA.boundaries.features;
      const collection = { type: "FeatureCollection", features };
      const svg = D3.select("#electorate-map");
      svg.attr("viewBox", `0 0 ${width} ${height}`).attr("height", height);
      svg.selectAll("*").remove();
      svg.append("title").attr("id", "map-title").text(region ? `${region} state electoral districts` : "NSW state electoral districts");
      svg.append("desc").attr("id", "map-desc").text(`Interactive ${layer === "current" ? "current-holder" : layer} map with ${features.length} selectable districts.`);
      const projection = D3.geoMercator().fitExtent([[13, 13], [width - 13, height - 13]], collection);
      const path = D3.geoPath(projection);
      const group = svg.append("g");
      if(mapState.renderedRegion!==region)mapState.transform=D3.zoomIdentity;
      const zoom=D3.zoom().scaleExtent([1,64]).extent([[0,0],[width,height]]).translateExtent([[-width,-height],[width*2,height*2]]).clickDistance(8).tapDistance(12).on('zoom',event=>{mapState.transform=event.transform;group.attr('transform',event.transform);});
      mapState.zoom=zoom;svg.call(zoom).call(zoom.transform,mapState.transform||D3.zoomIdentity);
      svg.on('keydown.zoom-controls',event=>{if(event.key==='+'||event.key==='=')svg.call(zoom.scaleBy,1.5);if(event.key==='-')svg.call(zoom.scaleBy,1/1.5);});

      group.selectAll("path").data(features, feature => feature.properties.name).join("path")
        .attr("class", feature => {
          const name = feature.properties.name;
          return `map-seat${mapState.selected === name ? " is-selected" : ""}${mapState.feedback?.name === name ? ` is-${mapState.feedback.kind}` : ""}`;
        })
        .attr("d", path)
        .attr("fill", feature => mapFill(seatByName[feature.properties.name], layer))
        .attr("stroke-width", region ? 1.3 : 0.7)
        .attr("tabindex", 0)
        .attr("role", "button")
        .attr("aria-label", feature => mapAriaLabel(seatByName[feature.properties.name], layer))
        .on("click", (event, feature) => {if(!event.defaultPrevented && Date.now()>(mapState.suppressUntil||0))selectMapSeat(feature.properties.name);})
        .on("keydown", (event, feature) => {
          if (event.key === "Enter" || event.key === " ") { event.preventDefault(); selectMapSeat(feature.properties.name); }
        })
        .append("title").text(feature => mapAriaLabel(seatByName[feature.properties.name], layer));
      if(state.settings.mapAssistance&&L.difficulty(state.settings.difficulty)==='beginner'){
        group.selectAll('text').data([...new Set(features.map(f=>seatByName[f.properties.name].region))]).join('text').attr('x',r=>path.centroid(features.find(f=>seatByName[f.properties.name].region===r))[0]).attr('y',r=>path.centroid(features.find(f=>seatByName[f.properties.name].region===r))[1]).attr('fill','var(--ink)').attr('font-size',9).attr('pointer-events','none').text(r=>r);
      }
      renderMapLegend(layer);
      const index = $("#map-seat-index");
      if (region && $("#map-mode").value === "explore") {
        index.hidden = false;
        index.innerHTML = `<div class="chip-row" aria-label="Seats in ${escapeHTML(region)}">${features.map(feature => feature.properties.name).sort().map(name => `<button class="chip" type="button" data-map-seat="${escapeHTML(name)}" aria-pressed="${mapState.selected === name}">${escapeHTML(name)}</button>`).join("")}</div>`;
      } else {
        index.hidden = true;
        index.innerHTML = "";
      }
      mapState.renderedRegion = region;
    }

    function mapAriaLabel(seat, layer) {
      if ($("#map-mode").value === "locate" && !mapState.quiz?.complete) return `District ${DATA.seats.indexOf(seat)+1}; select by geography`;
      if (layer === "result2023") return `${seat.name}: ${partyName(seat.winner2023.party)} won in 2023, ${formatPct(seat.margin2023, 2)} margin`;
      if (layer === "watch") return `${seat.name}: ${seat.currentMarginBasis}, ${formatPct(seat.currentMargin)} current analyst margin`;
      if (layer === "turnout") return `${seat.name}: ${formatPct(seat.turnout2023, 2)} turnout in 2023`;
      return `${seat.name}: currently ${partyName(seat.currentParty)}, represented by ${seat.currentMember}`;
    }

    function selectMapSeat(name) {
      const mode = $("#map-mode").value;
      if(mapState.quiz?.locked)return;
      if (mode === "locate" && mapState.quiz && !mapState.quiz.complete) {
        const correct = name === mapState.quiz.target;
        mapState.feedback = { name, kind: correct ? "correct" : "wrong" };
        if (correct) {
          mapState.quiz.locked = true;
          if(!mapState.quiz.missed)mapState.quiz.score += 1;
          state.cards["map-"+seatByName[name].slug]=L.review(state.cards["map-"+seatByName[name].slug],{day:todayISO(),correct:!mapState.quiz.missed,confidence:2,level:L.difficulty(state.settings.difficulty),wrongAnswer:mapState.quiz.wrongAnswer,contentVersion:DATA.meta.contentAsOf,responseTime:Date.now()-mapState.quiz.startedAt});saveState();
          mapState.quiz.answered += 1;
          showMapSeat(name);
          if (mapState.quiz.answered >= 5) {
            mapState.quiz.complete = true;
            $("#map-prompt").innerHTML = `<strong>Map sprint complete: ${mapState.quiz.score}/5 first try</strong><span class="small">Choose “Locate five seats” again or change region for another run.</span>`;
          } else {
            $("#map-prompt").innerHTML = `<strong>Located ${escapeHTML(name)}.</strong><button class="button" type="button" data-next-map>Next electorate</button>`;
          }
        } else {
          mapState.quiz.missed=true;mapState.quiz.wrongAnswer=name;
          $("#map-prompt").innerHTML = `<strong>Not ${escapeHTML(name)} — keep looking for ${escapeHTML(mapState.quiz.target)}</strong><span class="small">Use the region outline and neighbouring shapes as cues.</span>`;
        }
        renderMap();
        return;
      }
      mapState.selected = name;
      mapState.feedback = null;
      showMapSeat(name);
      renderMap();
    }

    function showMapSeat(name) {
      const seat = seatByName[name];
      $("#map-detail").innerHTML = `<div class="ledger-head"><div><div class="ledger-meta">${escapeHTML(seat.region)}</div><h3>${escapeHTML(seat.name)}</h3></div>${partyBadge(seat.currentParty)}</div><p>${escapeHTML(seat.currentMember)} · current analyst margin ${formatPct(seat.currentMargin)} (${escapeHTML(seat.currentMarginBasis)})</p><button class="button" type="button" data-open-seat="${escapeHTML(seat.name)}">Full seat profile</button>`;
    }

    function startMapQuiz() {
      if (!$("#map-region").value) $("#map-region").value = DATA.regions[Math.floor(Math.random() * DATA.regions.length)];
      $("#map-mode").value = "locate";
      mapState.selected=null;
      $("#map-detail").innerHTML="<p class='muted'>Locate the requested district. Zoom and pan for a closer view.</p>";
      mapState.quiz = { score: 0, answered: 0, target: null, used: [], complete: false };
      mapState.feedback = null;
      nextMapTarget();
      renderMap();
    }

    function nextMapTarget() {
      const region = $("#map-region").value;
      const pool = DATA.seats.filter(seat => !region || seat.region === region).filter(seat => !mapState.quiz.used.includes(seat.name));
      if (!pool.length) mapState.quiz.used = [];
      const available = DATA.seats.filter(seat => (!region || seat.region === region) && !mapState.quiz.used.includes(seat.name));
      const seat = available[Math.floor(Math.random() * available.length)];
      mapState.quiz.target = seat.name;
      mapState.quiz.locked=false;mapState.quiz.missed=false;mapState.quiz.startedAt=Date.now();
      mapState.quiz.used.push(seat.name);
      $("#map-prompt").hidden = false;
      $("#map-prompt").innerHTML = `<strong>Find ${escapeHTML(seat.name)}</strong><span class="small">${mapState.quiz.answered} of 5 located · ${escapeHTML(seat.region)}</span>`;
    }

    function handleMapMode() {
      if ($("#map-mode").value === "locate") startMapQuiz();
      else {
        mapState.quiz = null;
        mapState.feedback = null;
        $("#map-prompt").hidden = true;
        renderMap();
      }
    }

    function switchView(view, updateHash = true) {
      const valid = ["today", "drill", "map", "directory", "desk"];
      if (!valid.includes(view)) view = "today";
      $$(".view").forEach(section => section.hidden = section.dataset.view !== view);
      $$('[data-nav-view]').forEach(button => {
        if (button.dataset.navView === view) button.setAttribute("aria-current", "page");
        else button.removeAttribute("aria-current");
      });
      if (updateHash && location.hash !== `#${view}`) history.replaceState(null, "", `#${view}`);
      if (view === "today") renderToday();
      if (view === "drill") renderDrill();
      if (view === "directory") setDirectoryTab(activeDirectoryTab);
      if (view === "desk") setDeskTab(activeDeskTab);
      if (view === "map") window.requestAnimationFrame(renderMap);
      window.scrollTo({ top: 0, behavior: "auto" });
    }

    function showToast(message) {
      const toast = $("#toast");
      toast.textContent = message;
      toast.classList.add("show");
      clearTimeout(toastTimer);
      toastTimer = setTimeout(() => toast.classList.remove("show"), 2200);
    }

    function applyTheme() {
      const theme = state.settings.theme;
      if (theme === "system") document.documentElement.removeAttribute("data-theme");
      else document.documentElement.setAttribute("data-theme", theme);
      $("#theme-button").setAttribute("aria-label", `Colour theme: ${theme}. Activate to change.`);
      $("#theme-button").textContent = theme === "dark" ? "☾" : theme === "light" ? "☀" : "◐";
      if (!$("#view-map").hidden) window.requestAnimationFrame(renderMap);
    }

    function cycleTheme() {
      const order = ["system", "light", "dark"];
      state.settings.theme = order[(order.indexOf(state.settings.theme) + 1) % order.length];
      saveState();
      applyTheme();
      showToast(`Theme: ${state.settings.theme}`);
    }

    function exportProgress() {
      const blob = new Blob([JSON.stringify(L.importState(state,defaultState()), null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `nsw-election-desk-progress-${todayISO()}.json`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    }

    async function importProgress(file) {
      try {
        const incoming = JSON.parse(await file.text());
        if (!incoming || incoming.version !== 1 || typeof incoming.cards !== "object") throw new Error("Unrecognised progress file");
        state = L.importState(incoming, defaultState());
        state.cards=L.reconcile(state.cards,cards,todayISO());
        session=null;applyTheme();
        saveState();
        renderProgress();
        renderToday();
        showToast("Progress imported.");
      } catch (error) { showToast("That file is not valid game progress."); }
    }

    function resetProgress() {
      if (!confirm("Reset every review, confidence record and private seat note stored by this game on this device?")) return;
      const settings=state.settings; state = defaultState();state.settings=settings;session=null;
      saveState();
      applyTheme();
      renderProgress();
      renderToday();
      showToast("Local progress reset.");
    }

    function saveSeatNote(name) {
      const textarea = $(`[data-seat-note="${CSS.escape(name)}"]`);
      state.notes[name] = textarea?.value || "";
      saveState();
      showToast(`Note saved for ${name}.`);
    }

    function questionHTML(q){
      if(q.format==='choice')return `<div class="list" aria-label="Answer choices">${q.options.map(x=>`<button class="button answer-option" data-choice="${escapeHTML(x)}" aria-pressed="false">${escapeHTML(x)}</button>`).join('')}</div>`;
      if(q.format==='ordering')return `<p class="small muted">Select in order, smallest margin first.</p><div class="list">${q.options.map(x=>`<button class="button" data-order="${escapeHTML(x)}">${escapeHTML(x)}</button>`).join('')}</div><p id="order-answer" aria-live="polite"></p>`;
      return `<label class="recall-label" for="recall-note">${q.format==='estimate'?'Your estimate (tolerance ±'+q.tolerance+(q.unit==='%'?' percentage points':q.unit)+')':'Recall in your own words; compare with the model answer'}</label><textarea id="recall-note" ${q.format==='estimate'?'inputmode="decimal"':''} placeholder="${q.format==='estimate'?'e.g. 3.1':'Think, type or say your answer.'}"></textarea>`;
    }
    function updateCommitButton(){if(!session||session.revealed)return;const q=session.question;$('#reveal-button').disabled= !session.confidence || (['choice','ordering'].includes(q.format)?!session.selectedAnswer:q.format==='estimate'?!$('#recall-note').value.trim():false);}
    function openSettings(){
      const config=gemini.config(),settings=state.settings;
      openDialog('Settings',`<h3>Learning</h3><label class="field">Difficulty<select id="setting-difficulty">${[...L.levels,'adaptive'].map(x=>`<option value="${x}" ${x===settings.difficulty?'selected':''}>${x[0].toUpperCase()+x.slice(1)}</option>`).join('')}</select></label><label class="field section">Session length<select id="setting-length">${[5,10,12,20].map(x=>`<option ${x===settings.sessionLength?'selected':''}>${x}</option>`).join('')}</select></label><p class="small muted">Confidence is recorded before feedback. Adaptive moves from recognition to recall using spaced successes. Changing difficulty preserves progress.</p><label class="field">Confidence prompts<input type="checkbox" id="setting-confidence" ${settings.confidencePrompts?"checked":""}></label><label class="field">Beginner map region labels<input type="checkbox" id="setting-map-assistance" ${settings.mapAssistance?"checked":""}></label><button class="button primary" data-save-settings>Save learning settings</button>
      <section class="section"><h3>AI / Gemini</h3><p class="small muted">Optional. Your key stays in this browser's storage, separate from progress exports. Requests go to Google only when you use an AI action. Anyone with access to this browser's storage could read the key.</p><label class="field">Gemini API key<input id="gemini-key" type="password" autocomplete="off" placeholder="${config.key?'Saved on this device — enter replacement':'Paste key on this device'}"></label><label class="field section">Gemini model<select id="gemini-model">${['gemini-3.6-flash','gemini-2.5-flash','gemini-2.5-pro'].map(x=>`<option ${x===config.model?'selected':''}>${x}</option>`).join('')}</select></label><label class="field section">AI enabled<input type="checkbox" id="gemini-enabled" ${config.enabled?'checked':''}></label><div class="chip-row"><button class="button" data-ai-save>Save / Update</button><button class="button" data-ai-test>Test connection</button><button class="button danger" data-ai-remove>Remove API key</button></div><p id="ai-status" role="status">${config.key?'Key saved on this device.':'No key configured. Core learning works without AI.'}</p>
      <label class="field">Research, compare or fact-check<textarea id="ai-query" placeholder="e.g. Compare the political context of two NSW seats"></textarea></label><button class="button" data-ai-research>Research with sources</button><div id="ai-research-result" aria-live="polite"></div></section>
      <section class="section"><h3>Data health</h3><p>Content version: ${escapeHTML(DATA.meta.contentVersion||DATA.meta.contentAsOf)}. Approved snapshot: ${formatDate(DATA.meta.contentAsOf)}.</p><p class="small muted">Freshness reports when a snapshot needs review; it does not verify that every fact is still current. Historical 2023 results are immutable except for official corrections.</p>${(DATA.manifest?.datasets||[]).map(d=>`<p class="small"><strong>${escapeHTML(d.file)}</strong> · ${escapeHTML(d.authority)} · retrieved ${escapeHTML(d.retrieved)} · ${Date.now()-Date.parse(d.retrieved)>(d.maxAgeDays||36500)*86400000?'stale':'within review window'}</p>`).join('')}${sourceLinks(DATA.sources.map(s=>s.id))}</section>
      <section class="section"><h3>Local data</h3><button class="button" data-export-progress>Export progress</button><label class="field section">Import progress<input type="file" accept="application/json" data-import-progress></label><button class="button danger" data-reset-progress>Reset all local progress</button></section>`);
    }
    function saveSettings(){state.settings.difficulty=$('#setting-difficulty').value;state.settings.sessionLength=Number($('#setting-length').value);state.settings.confidencePrompts=$('#setting-confidence').checked;state.settings.mapAssistance=$('#setting-map-assistance').checked;saveState();renderToday();showToast('Learning settings saved. Applied to your next question.');}
    function saveAI(){try{gemini.save({key:$('#gemini-key').value.trim(),model:$('#gemini-model').value,enabled:$('#gemini-enabled').checked});$('#gemini-key').value='';$('#ai-status').textContent='Saved on this device. Key is hidden and excluded from exports.';}catch{$('#ai-status').textContent='Browser storage unavailable. Key could not be saved.';}}
    async function runAI(selector,action){const target=$(selector);if(!target)return;target.textContent='Working…';try{const result=await action();target.innerHTML=`<p class="notice">AI research / explanation · not approved application knowledge</p><p style="white-space:pre-wrap">${escapeHTML(result.text)}</p><div class="source-links">${result.sources.map(s=>`<a href="${escapeHTML(s.uri)}" target="_blank" rel="noopener noreferrer">${escapeHTML(s.title||s.uri)}</a>`).join('')}</div><p class="small muted">${result.sources.length?'Verify these sources before using a factual change.':'No grounded sources returned; verify factual claims independently.'}</p>`;}catch(error){target.textContent=error.message;}}

    document.addEventListener("click", event => {
      const choice=event.target.closest('[data-choice]');if(choice&&!session.revealed){session.selectedAnswer=choice.dataset.choice;$$('[data-choice]').forEach(b=>b.setAttribute('aria-pressed',String(b===choice)));updateCommitButton();return;}
      const order=event.target.closest('[data-order]');if(order&&!session.revealed){session.order.push(order.dataset.order);order.disabled=true;$('#order-answer').textContent=session.order.join(' → ');if(session.order.length===session.question.options.length)session.selectedAnswer=session.order.join(' → ');updateCommitButton();return;}
      if(event.target.closest('[data-next-map]')){mapState.feedback=null;nextMapTarget();renderMap();return;}
      const zoom=event.target.closest('[data-map-zoom]');if(zoom&&mapState.zoom){const svg=D3.select('#electorate-map');if(zoom.dataset.mapZoom==='reset')svg.call(mapState.zoom.transform,D3.zoomIdentity);else svg.call(mapState.zoom.scaleBy,Number(zoom.dataset.mapZoom));return;}
      if(event.target.closest('[data-settings]'))return openSettings();
      if(event.target.closest('[data-save-settings]'))return saveSettings();
      if(event.target.closest('[data-ai-save]'))return saveAI();
      if(event.target.closest('[data-ai-remove]')){gemini.remove();$('#gemini-key').value='';$('#ai-status').textContent='Key removed from this device.';return;}
      if(event.target.closest('[data-ai-test]'))return runAI('#ai-status',()=>gemini.testConnection());
      if(event.target.closest('[data-ai-research]'))return runAI('#ai-research-result',()=>gemini.research($('#ai-query').value.trim()||'Explain the difference between official 2023 results and current representation.'));
      if(event.target.closest('[data-ai-card]'))return runAI('#ai-card-result',()=>gemini.explain(session.cards[session.index],session.cards[session.index].kind==='scenario'?'Give a 30-second briefing model and three reporter questions, using only the supplied facts.':'Explain why this fact matters, give a memory clue and distinguish plausible confusions.'));

      const nav = event.target.closest("[data-nav-view]");
      if (nav) return switchView(nav.dataset.navView);
      const start = event.target.closest("[data-start-mode]");
      if (start) return startSession(start.dataset.startMode);
      const mapSprint = event.target.closest("[data-map-sprint]");
      if (mapSprint) { switchView("map"); return startMapQuiz(); }
      const confidence = event.target.closest("[data-confidence]");
      if (confidence) return setConfidence(confidence.dataset.confidence);
      if (event.target.closest("#reveal-button")) return revealAnswer();
      const rating = event.target.closest("[data-rating]");
      if (rating) return rateCurrentCard(rating.dataset.rating);
      if (event.target.closest("[data-restart-session]")) return startSession(session.mode);
      const seat = event.target.closest("[data-open-seat]");
      if (seat) return openSeat(seat.dataset.openSeat);
      const mapSeat = event.target.closest("[data-map-seat]");
      if (mapSeat) return selectMapSeat(mapSeat.dataset.mapSeat);
      const person = event.target.closest("[data-open-person]");
      if (person) return openPerson(person.dataset.openPerson);
      const dialogSeat = event.target.closest("[data-dialog-seat]");
      if (dialogSeat) return openSeat(dialogSeat.dataset.dialogSeat);
      const directoryTab = event.target.closest("[data-directory-tab]");
      if (directoryTab) return setDirectoryTab(directoryTab.dataset.directoryTab);
      const deskTab = event.target.closest("[data-desk-tab]");
      if (deskTab) return setDeskTab(deskTab.dataset.deskTab);
      const openDesk = event.target.closest("[data-open-desk]");
      if (openDesk) { activeDeskTab = openDesk.dataset.openDesk; switchView("desk"); return setDeskTab(activeDeskTab); }
      if (event.target.closest(".dialog-close")) return closeDialog();
      if (event.target.closest("#theme-button")) return cycleTheme();
      if (event.target.closest("[data-export-progress]")) return exportProgress();
      if (event.target.closest("[data-reset-progress]")) return resetProgress();
      const saveNote = event.target.closest("[data-save-seat-note]");
      if (saveNote) return saveSeatNote(saveNote.dataset.saveSeatNote);
    });

    document.addEventListener('input',event=>{if(event.target.id==='recall-note')updateCommitButton();});
    let mapPointer=null;
    $('#electorate-map').addEventListener('pointerdown',e=>{mapPointer={x:e.clientX,y:e.clientY};});
    $('#electorate-map').addEventListener('pointermove',e=>{if(mapPointer&&Math.hypot(e.clientX-mapPointer.x,e.clientY-mapPointer.y)>8)mapState.suppressUntil=Date.now()+350;});
    $('#electorate-map').addEventListener('pointerup',()=>{mapPointer=null;});
    $("#detail-dialog").addEventListener("click", event => {
      if (event.target === $("#detail-dialog")) closeDialog();
    });

    ["seat-search", "seat-party", "seat-focus"].forEach(id => $("#" + id).addEventListener(id === "seat-search" ? "input" : "change", renderSeats));
    ["people-search", "people-house", "people-party"].forEach(id => $("#" + id).addEventListener(id === "people-search" ? "input" : "change", renderPeople));
    $("#map-region").addEventListener("change", () => { mapState.selected = null; if ($("#map-mode").value === "locate") startMapQuiz(); else renderMap(); });
    $("#map-layer").addEventListener("change", renderMap);
    $("#map-mode").addEventListener("change", handleMapMode);
    document.addEventListener("change", event => { if (event.target.matches("[data-import-progress]") && event.target.files[0]) importProgress(event.target.files[0]); });
    window.addEventListener("resize", () => { if (!$("#view-map").hidden) renderMap(); });
    window.addEventListener("hashchange", () => switchView(location.hash.slice(1), false));

    $("#as-of-label").textContent = `Content current to ${formatDate(DATA.meta.contentAsOf)} · ${DATA.meta.seatCount} seats`;
    saveState();
    if(location.protocol!=="file:"&&!/^(localhost|127\.0\.0\.1)$/.test(location.hostname)&&"serviceWorker" in navigator)navigator.serviceWorker.register("./sw.js").catch(()=>{});
    populateFilters();
    applyTheme();
    renderToday();
    renderSeats();
    renderPeople();
    renderParliament();
    renderWatch();
    renderCampaign();
    renderInterstate();
    renderKit();
    renderProgress();
    switchView(location.hash.slice(1) || "today", false);
  })();
