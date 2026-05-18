import { useState, useEffect, useRef, useCallback } from "react";

// ── Constants ─────────────────────────────────────────────────────────────────
const FILES = ["a","b","c","d","e","f","g","h"];
const RANKS = [8,7,6,5,4,3,2,1];
const INITIAL_FEN = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";

// Explicit piece colors — fixes black pieces blending into dark squares
const PIECE_RENDER = {
  K:{sym:"♚",color:"#f5ede0",shadow:"-1px -1px 0 #2a1a08, 1px -1px 0 #2a1a08, -1px 1px 0 #2a1a08, 1px 1px 0 #2a1a08, 0 0 6px rgba(0,0,0,0.8)"},
  Q:{sym:"♛",color:"#f5ede0",shadow:"-1px -1px 0 #2a1a08, 1px -1px 0 #2a1a08, -1px 1px 0 #2a1a08, 1px 1px 0 #2a1a08, 0 0 6px rgba(0,0,0,0.8)"},
  R:{sym:"♜",color:"#f5ede0",shadow:"-1px -1px 0 #2a1a08, 1px -1px 0 #2a1a08, -1px 1px 0 #2a1a08, 1px 1px 0 #2a1a08, 0 0 6px rgba(0,0,0,0.8)"},
  B:{sym:"♝",color:"#f5ede0",shadow:"-1px -1px 0 #2a1a08, 1px -1px 0 #2a1a08, -1px 1px 0 #2a1a08, 1px 1px 0 #2a1a08, 0 0 6px rgba(0,0,0,0.8)"},
  N:{sym:"♞",color:"#f5ede0",shadow:"-1px -1px 0 #2a1a08, 1px -1px 0 #2a1a08, -1px 1px 0 #2a1a08, 1px 1px 0 #2a1a08, 0 0 6px rgba(0,0,0,0.8)"},
  P:{sym:"♟",color:"#f5ede0",shadow:"-1px -1px 0 #2a1a08, 1px -1px 0 #2a1a08, -1px 1px 0 #2a1a08, 1px 1px 0 #2a1a08, 0 0 6px rgba(0,0,0,0.8)"},
  k:{sym:"♚",color:"#1c1208",shadow:"-1px -1px 0 #d4b870, 1px -1px 0 #d4b870, -1px 1px 0 #d4b870, 1px 1px 0 #d4b870, 0 0 4px rgba(200,160,80,0.4)"},
  q:{sym:"♛",color:"#1c1208",shadow:"-1px -1px 0 #d4b870, 1px -1px 0 #d4b870, -1px 1px 0 #d4b870, 1px 1px 0 #d4b870, 0 0 4px rgba(200,160,80,0.4)"},
  r:{sym:"♜",color:"#1c1208",shadow:"-1px -1px 0 #d4b870, 1px -1px 0 #d4b870, -1px 1px 0 #d4b870, 1px 1px 0 #d4b870, 0 0 4px rgba(200,160,80,0.4)"},
  b:{sym:"♝",color:"#1c1208",shadow:"-1px -1px 0 #d4b870, 1px -1px 0 #d4b870, -1px 1px 0 #d4b870, 1px 1px 0 #d4b870, 0 0 4px rgba(200,160,80,0.4)"},
  n:{sym:"♞",color:"#1c1208",shadow:"-1px -1px 0 #d4b870, 1px -1px 0 #d4b870, -1px 1px 0 #d4b870, 1px 1px 0 #d4b870, 0 0 4px rgba(200,160,80,0.4)"},
  p:{sym:"♟",color:"#1c1208",shadow:"-1px -1px 0 #d4b870, 1px -1px 0 #d4b870, -1px 1px 0 #d4b870, 1px 1px 0 #d4b870, 0 0 4px rgba(200,160,80,0.4)"},
};

// ── Chess Engine ──────────────────────────────────────────────────────────────
function fenToBoard(fen) {
  return fen.split(" ")[0].split("/").map(row => {
    const rank = [];
    for (const ch of row) {
      if (isNaN(ch)) rank.push(ch);
      else for (let i=0;i<parseInt(ch);i++) rank.push(null);
    }
    return rank;
  });
}

function parsePGN(pgn) {
  const clean = pgn
    .replace(/\[.*?\]/g,"")
    .replace(/\{[^}]*\}/g,"")
    .replace(/\([^)]*\)/g,"")
    .trim();
  return clean.split(/\s+/).filter(t=>t&&!t.match(/^\d+\.+/)&&!t.match(/^(1-0|0-1|1\/2-1\/2|\*)$/));
}

function isPathClear(board,fr,fc,tr,tc){
  const sr=Math.sign(tr-fr),sc=Math.sign(tc-fc);
  let r=fr+sr,c=fc+sc;
  while(r!==tr||c!==tc){if(board[r][c])return false;r+=sr;c+=sc;}
  return true;
}

function canReach(board,fr,fc,tr,tc,piece,turn){
  const p=piece.toUpperCase(),dr=tr-fr,dc=tc-fc;
  if(p==="P"){
    const dir=turn==="w"?-1:1;
    if(dc===0){
      if(dr===dir&&!board[tr][tc])return true;
      if(dr===2*dir&&!board[fr+dir][fc]&&!board[tr][tc]&&(turn==="w"?fr===6:fr===1))return true;
    }else if(Math.abs(dc)===1&&dr===dir)return true;
    return false;
  }
  if(p==="N")return(Math.abs(dr)===2&&Math.abs(dc)===1)||(Math.abs(dr)===1&&Math.abs(dc)===2);
  if(p==="K")return Math.abs(dr)<=1&&Math.abs(dc)<=1;
  if(p==="R"){if(dr!==0&&dc!==0)return false;return isPathClear(board,fr,fc,tr,tc);}
  if(p==="B"){if(Math.abs(dr)!==Math.abs(dc))return false;return isPathClear(board,fr,fc,tr,tc);}
  if(p==="Q"){if(dr===0||dc===0||Math.abs(dr)===Math.abs(dc))return isPathClear(board,fr,fc,tr,tc);return false;}
  return false;
}

function applyMove(board,moveStr,turn){
  const b=board.map(r=>[...r]);
  const raw=moveStr.replace(/[+#!?]/g,"");
  if(raw==="O-O"||raw==="O-O-O"){
    const rank=turn==="w"?7:0,piece=turn==="w"?"K":"k",rook=turn==="w"?"R":"r";
    if(raw==="O-O"){b[rank][4]=null;b[rank][7]=null;b[rank][6]=piece;b[rank][5]=rook;}
    else{b[rank][4]=null;b[rank][0]=null;b[rank][2]=piece;b[rank][3]=rook;}
    return b;
  }
  let pieceChar=turn==="w"?"P":"p",rest=raw;
  if("KQRBN".includes(raw[0])){pieceChar=turn==="w"?raw[0]:raw[0].toLowerCase();rest=raw.slice(1);}
  let promotion=null;
  if(rest.includes("=")){const[bf,af]=rest.split("=");promotion=turn==="w"?af[0]:af[0].toLowerCase();rest=bf;}
  rest=rest.replace("x","");
  const toFile=FILES.indexOf(rest[rest.length-2]),toRank=8-parseInt(rest[rest.length-1]);
  const disambig=rest.slice(0,rest.length-2);
  let fromR=-1,fromC=-1;
  outer:for(let r=0;r<8;r++)for(let c=0;c<8;c++){
    if(b[r][c]!==pieceChar)continue;
    if(disambig.length===1){
      if(!isNaN(disambig)){if(8-r!==parseInt(disambig))continue;}
      else{if(FILES[c]!==disambig)continue;}
    }else if(disambig.length===2){if(FILES[c]!==disambig[0]||8-r!==parseInt(disambig[1]))continue;}
    if(canReach(b,r,c,toRank,toFile,pieceChar,turn)){fromR=r;fromC=c;break outer;}
  }
  if(fromR===-1)return b;
  b[toRank][toFile]=promotion||b[fromR][fromC];
  b[fromR][fromC]=null;
  return b;
}

function buildAllBoards(moves){
  const boards=[fenToBoard(INITIAL_FEN)];
  let board=fenToBoard(INITIAL_FEN),turn="w";
  for(const move of moves){
    board=applyMove(board,move,turn);
    boards.push(board.map(r=>[...r]));
    turn=turn==="w"?"b":"w";
  }
  return boards;
}

// ── Opening detection ─────────────────────────────────────────────────────────
function detectOpening(moves){
  const m=moves.slice(0,8).join(" ");
  if(m.startsWith("e4 e5 Nf3 Nc6 Bb5"))return"Ruy López";
  if(m.startsWith("e4 e5 Nf3 Nc6 Bc4"))return"Italian Game";
  if(m.startsWith("e4 e5 f4"))return"King's Gambit";
  if(m.startsWith("e4 c5"))return"Sicilian Defense";
  if(m.startsWith("e4 e6"))return"French Defense";
  if(m.startsWith("e4 c6"))return"Caro-Kann Defense";
  if(m.startsWith("d4 d5 c4"))return"Queen's Gambit";
  if(m.startsWith("d4 Nf6 c4 g6"))return"King's Indian Defense";
  if(m.startsWith("d4 Nf6 c4 e6 Nc3 Bb4"))return"Nimzo-Indian Defense";
  if(m.includes("Bf4")&&m.startsWith("d4"))return"London System";
  if(m.startsWith("e4 e5"))return"Open Game";
  if(m.startsWith("d4 d5"))return"Closed Game";
  if(m.startsWith("d4"))return"Queen's Pawn Game";
  if(m.startsWith("e4"))return"King's Pawn Game";
  if(m.startsWith("c4"))return"English Opening";
  if(m.startsWith("Nf3"))return"Réti Opening";
  return null;
}

// ── Drama detection ───────────────────────────────────────────────────────────
function detectDrama(moveStr){
  const flags=[];
  if(moveStr.includes("#"))flags.push("CHECKMATE");
  else if(moveStr.includes("++"))flags.push("DOUBLE CHECK");
  else if(moveStr.includes("+"))flags.push("CHECK");
  if(moveStr.includes("!!"))flags.push("BRILLIANT");
  else if(moveStr.includes("??"))flags.push("BLUNDER");
  else if(moveStr.includes("!?"))flags.push("INTERESTING");
  else if(moveStr.includes("?!"))flags.push("DUBIOUS");
  if(moveStr.includes("x"))flags.push("CAPTURE");
  const r=moveStr.replace(/[+#!?]/g,"");
  if(r==="O-O"||r==="O-O-O")flags.push("CASTLING");
  if(moveStr.includes("="))flags.push("PROMOTION");
  return flags;
}

// ── Commentary trigger — only commentate on meaningful moments ────────────────
function shouldCommentate(idx, moves, prevOpening, newOpening){
  if(idx===0)return true;
  if(idx===1)return true;
  const move=moves[idx];
  const drama=detectDrama(move);
  if(drama.some(d=>["CHECKMATE","CHECK","DOUBLE CHECK","BRILLIANT","BLUNDER","CAPTURE","CASTLING","PROMOTION"].includes(d)))return true;
  if(newOpening&&newOpening!==prevOpening)return true;
  if(idx===10||idx===Math.floor(moves.length*0.6))return true;
  if(idx>0&&idx%8===0)return true;
  if(idx===moves.length-1)return true;
  return false;
}

// ── ELO personas ──────────────────────────────────────────────────────────────
const ELO_PERSONAS={
  800:{
    label:"Beginner · 800",color:"#4ade80",
    system:`You are ChessCaster — a chess hype commentator for beginners. Think Twitch streamer meets sports anchor.

STYLE: Short. Punchy. Excited. One or two sentences MAX. Never more.
LANGUAGE: Plain English. If a chess term comes up, sneak the definition in naturally — never lecture.
VIBE: "Oh that's a CHECK — White's king has to move right now." "The queen is out early. Dangerous." "London System. Classic safe setup."
DRAMA: Big moments get big reactions. One punchy line. "He blundered the queen. It's over." "CHECKMATE. What a finish."
QUIET MOVES: Still keep it tight. "Developing the knight. Standard stuff." "Castling — king safe, rook active."
NEVER: More than 2 sentences. Paragraphs. Definitions that sound like a textbook. Filler phrases like "It's worth noting that" or "In this position we can observe".
GOAL: Sound like someone live-reacting on stream, not writing an essay.`
  },
  1200:{
    label:"Club Player · 1200",color:"#60a5fa",
    system:`You are ChessCaster — live chess commentary for club players. Think Gotham Chess on a tight deadline.

STYLE: 1-3 sentences MAX. Punchy. Direct. Like live Twitch commentary, not a lecture.
VIBE: "London confirmed. White wants a slow squeeze." "That capture opens the d-file — and Black is ready for it." "Queen check! White has to deal with this right now."
DRAMA LINES (use these as inspiration, not verbatim): "Oh he walked into that." "The blunder everyone saw coming." "Brilliant — or completely insane. We'll find out." "That's the move. Clean."
QUIET MOVES: One line. "Knight to f3. Keeps options open." "Solid. Nothing flashy."
OPENING CALLOUTS: Drop the name like a commentator. "Sicilian. We're in for a fight." "Queen's Gambit accepted. Bold."
NEVER: More than 3 sentences. Academic tone. Hedging. Filler.`
  },
  1800:{
    label:"Advanced · 1800",color:"#f59e0b",
    system:`You are ChessCaster — sharp chess commentary for strong players. Think GM commentator, one take, no fluff.

STYLE: 1-3 sentences. Dense. Every word earns its place. Dry wit welcome.
VIBE: "Prophylaxis. White stops the b5 break before it starts." "That trade releases the tension too early — Black had a grip here." "Interesting. Slightly anti-positional but it creates real problems."
DRAMA: Controlled reaction. "There it is. The exchange sac everyone was thinking about." "He found it. Clinical." "That's a blunder. The structure collapses."
QUIET MOVES: One incisive line. "Improving the knight. Long-term thinking." "Forced. Not ideal but necessary."
HISTORY: One short reference when genuinely relevant. "Tal would approve." Not required.
NEVER: More than 3 sentences. Padding. Phrases like "It's important to note" or "In this position".`
  },
};

// ── API ───────────────────────────────────────────────────────────────────────
async function generateCommentary(moveData,eloLevel){
  const persona=ELO_PERSONAS[eloLevel];
  const isFinal=moveData.drama.includes("CHECKMATE");
  const prompt=`Game situation:
Move ${moveData.moveNumber}${moveData.turn==="black"?"...":"."} ${moveData.move} — just played by ${moveData.turn}
Opening: ${moveData.opening||"Not yet identified"}
Game phase: ${moveData.phase}
Recent moves for context: ${moveData.recentHistory}
Drama flags: ${moveData.drama.length?moveData.drama.join(", "):"none — quiet move"}
Position context: ${moveData.positionNotes}

${isFinal?"THIS IS THE FINAL MOVE OF THE GAME. Make it a moment. Deliver the broadcast finish.":moveData.drama.includes("BRILLIANT")?"A brilliant move was just played. Convey the excitement.":moveData.drama.includes("BLUNDER")?"A serious mistake was just made. React to it.":""}

Deliver your commentary now.`;

  const response=await fetch("https://api.anthropic.com/v1/messages",{
    method:"POST",
    headers:{"Content-Type":"application/json"},
    body:JSON.stringify({
      model:"claude-sonnet-4-20250514",
      max_tokens:1000,
      system:persona.system,
      messages:[{role:"user",content:prompt}],
    }),
  });
  if(!response.ok){const e=await response.json().catch(()=>({}));throw new Error(e.error?.message||`API ${response.status}`);}
  const data=await response.json();
  if(data.content?.[0]?.text)return data.content[0].text;
  throw new Error("Empty API response");
}

// ── Sample games ──────────────────────────────────────────────────────────────
const SAMPLE_GAMES={
  "The Immortal Game · 1851":`[Event "London"]
[White "Adolf Anderssen"]
[Black "Lionel Kieseritzky"]
[Result "1-0"]
1. e4 e5 2. f4 exf4 3. Bc4 Qh4+ 4. Kf1 b5 5. Bxb5 Nf6 6. Nf3 Qh6 7. d3 Nh5 8. Nh4 Qg5 9. Nf5 c6 10. g4 Nf6 11. Rg1 cxb5 12. h4 Qg6 13. h5 Qg5 14. Qf3 Ng8 15. Bxf4 Qf6 16. Nc3 Bc5 17. Nd5 Qxb2 18. Bd6 Bxg1 19. e5 Qxa1+ 20. Ke2 Na6 21. Nxg7+ Kd8 22. Qf6+ Nxf6 23. Be7# 1-0`,
  "Opera Game · 1858":`[Event "Paris Opera"]
[White "Paul Morphy"]
[Black "Duke Karl / Count Isouard"]
[Result "1-0"]
1. e4 e5 2. Nf3 d6 3. d4 Bg4 4. dxe5 Bxf3 5. Qxf3 dxe5 6. Bc4 Nf6 7. Qb3 Qe7 8. Nc3 c6 9. Bg5 b5 10. Nxb5 cxb5 11. Bxb5+ Nbd7 12. O-O-O Rd8 13. Rxd7 Rxd7 14. Rd1 Qe6 15. Bxd7+ Nxd7 16. Qb8+ Nxb8 17. Rd8# 1-0`,
  "London System · Example":`[Event "Sample Game"]
[White "London Player"]
[Black "Challenger"]
[Result "*"]
1. d4 d5 2. Nf3 Nf6 3. Bf4 e6 4. e3 c5 5. c3 Nc6 6. Nbd2 Bd6 7. Bg3 O-O 8. Bd3 b6 9. O-O Bb7 10. Ne5 Nxe5 11. dxe5 Bxg3 12. hxg3 Nd7 13. f4 c4 14. Bc2 b5 15. Nf3 a5 *`,
};

// ── Helpers ───────────────────────────────────────────────────────────────────
function sqColor(r,c,hl){const l=(r+c)%2===0;return hl?(l?"#f6f669":"#baca2b"):(l?"#f0d9b5":"#b58863");}

function badgeStyle(type){
  if(["CHECKMATE","BRILLIANT"].includes(type))return{color:"#ffd700",border:"1px solid #ffd70050"};
  if(["BLUNDER","DUBIOUS"].includes(type))return{color:"#ff4444",border:"1px solid #ff444450"};
  if(["CHECK","DOUBLE CHECK"].includes(type))return{color:"#ff9900",border:"1px solid #ff990050"};
  if(["CAPTURE","CASTLING","PROMOTION","INTERESTING"].includes(type))return{color:"#60a5fa",border:"1px solid #60a5fa50"};
  return{color:"#666",border:"1px solid #44444450"};
}

// ── Game Review Component ─────────────────────────────────────────────────────
function GameReview({eloLevel, ELO_PERSONAS}){
  const[pgn,setPgn]=useState("");
  const[loading,setLoading]=useState(false);
  const[review,setReview]=useState(null);
  const[error,setError]=useState("");
  const[selectedGame,setSelectedGame]=useState("");
  const[selectedMoment,setSelectedMoment]=useState(null);

  function getMoveSquares(moves, moveIndex){
    try{
      const boards=buildAllBoards(moves.slice(0,moveIndex+1));
      const beforeBoard=boards[moveIndex];
      const afterBoard=boards[moveIndex+1];
      if(!beforeBoard||!afterBoard)return null;
      let fromR=-1,fromC=-1,toR=-1,toC=-1;
      for(let r=0;r<8;r++){
        for(let c=0;c<8;c++){
          const before=beforeBoard[r][c];
          const after=afterBoard[r][c];
          if(before&&!after&&fromR===-1){fromR=r;fromC=c;}
          else if(before&&!after){fromR=r;fromC=c;}
        }
      }
      const turn=moveIndex%2===0?"w":"b";
      const moveStr=moves[moveIndex];
      const raw=moveStr.replace(/[+#!?]/g,"");
      if(raw==="O-O"){
        const rank=turn==="w"?7:0;
        return{fromR:rank,fromC:4,toR:rank,toC:6};
      }
      if(raw==="O-O-O"){
        const rank=turn==="w"?7:0;
        return{fromR:rank,fromC:4,toR:rank,toC:2};
      }
      let rest=raw;
      if("KQRBN".includes(raw[0]))rest=raw.slice(1);
      if(rest.includes("="))rest=rest.split("=")[0];
      rest=rest.replace("x","");
      const toFile=FILES.indexOf(rest[rest.length-2]);
      const toRank=8-parseInt(rest[rest.length-1]);
      if(toFile<0||isNaN(toRank))return null;
      toR=toRank;toC=toFile;
      for(let r=0;r<8;r++){
        for(let c=0;c<8;c++){
          if(beforeBoard[r][c]&&!afterBoard[r][c]&&!(r===toR&&c===toC)){
            const p=beforeBoard[r][c];
            const isWhitePiece=p===p.toUpperCase();
            if((turn==="w"&&isWhitePiece)||(turn==="b"&&!isWhitePiece)){
              fromR=r;fromC=c;
            }
          }
        }
      }
      if(fromR===-1)return null;
      return{fromR,fromC,toR,toC};
    }catch{return null;}
  }

  function MiniBoard({moves,momentIdx}){
    const boards=buildAllBoards(moves.slice(0,momentIdx+1));
    const board=boards[momentIdx+1]||boards[momentIdx];
    const sq=getMoveSquares(moves,momentIdx);
    const SQ=46;
    const toSet=new Set(sq?[`${sq.toR},${sq.toC}`]:[]);
    const fromSet=new Set(sq?[`${sq.fromR},${sq.fromC}`]:[]);

    const arrowSvg=sq?((()=>{
      const x1=sq.fromC*SQ+SQ/2, y1=sq.fromR*SQ+SQ/2;
      const x2=sq.toC*SQ+SQ/2,   y2=sq.toR*SQ+SQ/2;
      const dx=x2-x1, dy=y2-y1;
      const len=Math.sqrt(dx*dx+dy*dy);
      const shorten=SQ*0.38;
      const ex=x2-dx/len*shorten, ey=y2-dy/len*shorten;
      return(
        <svg style={{position:"absolute",top:0,left:0,pointerEvents:"none",zIndex:10}}
          width={8*SQ} height={8*SQ}>
          <defs>
            <marker id="ah" markerWidth="6" markerHeight="6" refX="3" refY="3" orient="auto">
              <polygon points="0 0, 6 3, 0 6" fill="rgba(20,180,80,0.92)"/>
            </marker>
          </defs>
          <line x1={x1} y1={y1} x2={ex} y2={ey}
            stroke="rgba(20,180,80,0.85)" strokeWidth="5"
            strokeLinecap="round" markerEnd="url(#ah)"/>
        </svg>
      );
    })()):(null);

    return(
      <div style={{position:"relative",display:"inline-block",border:"2px solid #3a3245",boxShadow:"0 8px 32px rgba(0,0,0,0.6)"}}>
        <div style={{display:"grid",gridTemplateColumns:`repeat(8,${SQ}px)`,gridTemplateRows:`repeat(8,${SQ}px)`}}>
          {RANKS.map((_,ri)=>FILES.map((_,fi)=>{
            const piece=board?.[ri]?.[fi]||null;
            const pr=piece?PIECE_RENDER[piece]:null;
            const isTo=toSet.has(`${ri},${fi}`);
            const isFrom=fromSet.has(`${ri},${fi}`);
            const light=(ri+fi)%2===0;
            let bg=light?"#f0d9b5":"#b58863";
            if(isFrom)bg=light?"#f6f240":"#d4c020";
            if(isTo)bg=light?"#cff0a0":"#88c040";
            return(
              <div key={`${ri},${fi}`} style={{width:SQ,height:SQ,background:bg,display:"flex",alignItems:"center",justifyContent:"center",userSelect:"none"}}>
                {pr&&<span style={{fontSize:28,lineHeight:1,color:pr.color,textShadow:pr.shadow}}>{pr.sym}</span>}
              </div>
            );
          }))}
        </div>
        {arrowSvg}
      </div>
    );
  }

  const runReview=async(pgnText)=>{
    const p=pgnText||pgn;
    if(!p.trim())return;
    setError("");setReview(null);setLoading(true);setSelectedMoment(null);
    const moves=parsePGN(p);
    if(!moves.length){setError("No moves found.");setLoading(false);return;}
    const opening=detectOpening(moves);
    const totalMoves=moves.length;

    const annotated=moves.map((m,i)=>{
      const drama=detectDrama(m);
      const turn=i%2===0?"White":"Black";
      const num=Math.floor(i/2)+1;
      return `${num}${turn==="White"?".":"..."} ${m}${drama.length?" ["+drama.join(",")+"]":""}`;
    }).join(" ");

    const prompt=`You are ChessCaster analyzing a complete chess game for a ${eloLevel} ELO player.

Full game PGN moves with drama flags:
${annotated}

Opening detected: ${opening||"Unknown"}
Total moves: ${totalMoves}

Return ONLY a valid JSON object with exactly this structure — no markdown, no explanation, just raw JSON:
{
  "opening": {
    "name": "Opening name",
    "assessment": "One punchy line about how the opening went"
  },
  "keyMoments": [
    {
      "moveIndex": 0,
      "move": "move notation",
      "side": "White or Black",
      "type": "TURNING_POINT or BLUNDER or BRILLIANT or MOMENTUM_SHIFT or MISSED_CHANCE",
      "headline": "Short punchy headline — max 6 words",
      "detail": "1-2 sentences. Snappy. What happened and why it mattered."
    }
  ],
  "phases": {
    "opening": "One line — how did the opening go?",
    "middlegame": "One line — what was the story of the middlegame?",
    "endgame": "One line — how did it end? Or 'No endgame reached.' if game ended early."
  },
  "biggestMistake": {
    "moveIndex": 0,
    "move": "move notation",
    "side": "White or Black",
    "detail": "1-2 sentences. What went wrong."
  },
  "verdict": "2-3 sentences max. Overall game story. Who played well, who cracked, what was the decisive factor.",
  "takeaway": "One sentence. The single most important lesson from this game for a ${eloLevel} ELO player."
}

Rules for keyMoments: Include 3-6 moments only. Only the genuinely important ones. Not every capture.
Tune all language for ${eloLevel} ELO — ${eloLevel<=900?"plain English, no jargon":eloLevel<=1400?"club player language":"advanced chess vocabulary"}.`;

    try{
      const resp=await fetch("https://api.anthropic.com/v1/messages",{
        method:"POST",
        headers:{"Content-Type":"application/json"},
        body:JSON.stringify({
          model:"claude-sonnet-4-20250514",
          max_tokens:4000,
          system:"You are a chess game analyzer. Always respond with valid JSON only. No markdown fences, no explanation text, just the raw JSON object.",
          messages:[{role:"user",content:prompt}],
        }),
      });
      if(!resp.ok)throw new Error(`API ${resp.status}`);
      const data=await resp.json();
      const raw=data.content?.[0]?.text||"";
      const clean=raw.replace(/```json|```/g,"").trim();
      const parsed=JSON.parse(clean);
      setReview({...parsed,moves,totalMoves,opening});
    }catch(e){
      setError("Analysis failed: "+e.message);
    }finally{setLoading(false);}
  };

  const momentColors={TURNING_POINT:"#f59e0b",BLUNDER:"#ff4444",BRILLIANT:"#ffd700",MOMENTUM_SHIFT:"#60a5fa",MISSED_CHANCE:"#c084fc"};
  const momentIcons={TURNING_POINT:"⚡",BLUNDER:"💀",BRILLIANT:"✨",MOMENTUM_SHIFT:"📈",MISSED_CHANCE:"😬"};

  return(
    <div style={{flex:1,display:"flex",overflow:"hidden"}}>

      {/* Left: input */}
      <div style={{width:340,flexShrink:0,borderRight:"1px solid #1e1c28",padding:20,display:"flex",flexDirection:"column",gap:14,overflowY:"auto"}}>
        <div style={{fontSize:11,letterSpacing:2,color:"#b8904a",textTransform:"uppercase"}}>Game Review</div>
        <div style={{fontSize:12,color:"#6a6070",lineHeight:1.6}}>Paste a game and get a breakdown of key moments, turning points, and your main takeaway.</div>
        <div style={{fontSize:10,letterSpacing:2,color:"#4a4258",textTransform:"uppercase",marginBottom:2}}>Sample Games</div>
        {Object.keys(SAMPLE_GAMES).map(name=>(
          <button key={name} onClick={()=>{setSelectedGame(name);setPgn(SAMPLE_GAMES[name]);}} style={{
            padding:"10px 14px",borderRadius:5,textAlign:"left",cursor:"pointer",
            border:selectedGame===name?"1px solid #b8904a":"1px solid #2a2235",
            background:selectedGame===name?"rgba(184,144,74,0.1)":"#0e0d14",
            color:selectedGame===name?"#d4a55a":"#5a4a38",fontSize:12,transition:"all 0.2s",
          }}>{name}</button>
        ))}
        <div style={{borderTop:"1px solid #1e1c28",paddingTop:14}}>
          <div style={{fontSize:10,letterSpacing:2,color:"#4a4258",textTransform:"uppercase",marginBottom:8}}>Or Paste PGN</div>
          <textarea value={pgn} onChange={e=>{setPgn(e.target.value);setSelectedGame("");}} placeholder="Paste any PGN here..." rows={8} style={{
            width:"100%",boxSizing:"border-box",background:"#0a090f",border:"1px solid #2a2235",
            borderRadius:4,color:"#b8904a",padding:"10px 12px",fontSize:11,fontFamily:"monospace",
            resize:"vertical",outline:"none",lineHeight:1.6,
          }}/>
          {error&&<div style={{color:"#ff5555",fontSize:11,marginTop:6}}>{error}</div>}
          <button onClick={()=>runReview()} disabled={loading||!pgn.trim()} style={{
            marginTop:12,width:"100%",padding:"12px",
            background:loading?"#1a1828":"linear-gradient(135deg,#c8a050,#9a6a28)",
            border:"none",borderRadius:4,color:loading?"#5a5060":"#0c0b10",
            fontSize:13,fontWeight:700,cursor:loading?"not-allowed":"pointer",
            letterSpacing:1.5,textTransform:"uppercase",transition:"all 0.3s",
          }}>{loading?"⟳ Analyzing...":"Run Game Review →"}</button>
        </div>
      </div>

      {/* Middle: results */}
      <div style={{flex:1,overflowY:"auto",padding:24,minWidth:0}}>
        {!review&&!loading&&(
          <div style={{height:"100%",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:12,color:"#4a4258"}}>
            <div style={{fontSize:48}}>🔍</div>
            <div style={{fontSize:13,letterSpacing:2,textTransform:"uppercase"}}>Load a game to analyze</div>
            <div style={{fontSize:11,color:"#3a3248"}}>Key moments · turning points · your takeaway</div>
          </div>
        )}
        {loading&&(
          <div style={{height:"100%",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:16,color:"#6a6070"}}>
            <div style={{fontSize:32,animation:"spin 1.5s linear infinite",display:"inline-block"}}>♟</div>
            <div style={{fontSize:13,letterSpacing:2,textTransform:"uppercase"}}>Reading the game…</div>
          </div>
        )}
        {review&&(
          <div style={{display:"flex",flexDirection:"column",gap:20,maxWidth:620}}>

            {/* Opening */}
            <div style={{background:"#0e0d14",border:"1px solid #2a2235",borderRadius:8,padding:"16px 18px"}}>
              <div style={{fontSize:9,letterSpacing:3,color:"#b8904a",textTransform:"uppercase",marginBottom:6}}>Opening</div>
              <div style={{fontSize:16,fontWeight:700,color:"#e8dfc8",marginBottom:4}}>{review.opening?.name||"Unknown Opening"}</div>
              <div style={{fontSize:12,color:"#9a8878",lineHeight:1.6}}>{review.opening?.assessment}</div>
            </div>

            {/* Phase grid */}
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:10}}>
              {[{label:"Opening",text:review.phases?.opening,icon:"📖"},{label:"Middlegame",text:review.phases?.middlegame,icon:"⚔️"},{label:"Endgame",text:review.phases?.endgame,icon:"🏁"}].map(({label,text,icon})=>(
                <div key={label} style={{background:"#0e0d14",border:"1px solid #2a2235",borderRadius:6,padding:"12px 14px"}}>
                  <div style={{fontSize:9,letterSpacing:2,color:"#6a6070",textTransform:"uppercase",marginBottom:5}}>{icon} {label}</div>
                  <div style={{fontSize:11,color:"#9a8878",lineHeight:1.6}}>{text||"—"}</div>
                </div>
              ))}
            </div>

            {/* Key moments */}
            {review.keyMoments?.length>0&&(
              <div>
                <div style={{fontSize:9,letterSpacing:3,color:"#b8904a",textTransform:"uppercase",marginBottom:12}}>Key Moments — click to view position</div>
                {/* Timeline bar */}
                <div style={{position:"relative",height:6,background:"#1a1828",borderRadius:3,marginBottom:16,cursor:"pointer"}}>
                  {review.keyMoments.map((m,i)=>{
                    const pct=(m.moveIndex/review.totalMoves)*100;
                    const col=momentColors[m.type]||"#888";
                    const isSel=selectedMoment?.moveIndex===m.moveIndex;
                    return(
                      <div key={i} onClick={()=>setSelectedMoment(isSel?null:m)}
                        style={{position:"absolute",left:`${pct}%`,top:-6,
                          width:18,height:18,borderRadius:"50%",
                          background:col,border:isSel?"3px solid #fff":"2px solid #0c0b10",
                          transform:"translateX(-50%)",boxShadow:`0 0 10px ${col}90`,
                          cursor:"pointer",transition:"all 0.15s",
                        }} title={m.headline}/>
                    );
                  })}
                </div>
                {/* Cards */}
                <div style={{display:"flex",flexDirection:"column",gap:8}}>
                  {review.keyMoments.map((m,i)=>{
                    const col=momentColors[m.type]||"#888";
                    const icon=momentIcons[m.type]||"·";
                    const moveNum=Math.floor(m.moveIndex/2)+1;
                    const turn=m.moveIndex%2===0?"White":"Black";
                    const isSel=selectedMoment?.moveIndex===m.moveIndex;
                    return(
                      <div key={i} onClick={()=>setSelectedMoment(isSel?null:m)}
                        style={{background:isSel?"#161428":"#0e0d14",borderRadius:6,padding:"12px 14px",
                          borderLeft:`3px solid ${col}`,display:"flex",gap:12,alignItems:"flex-start",
                          cursor:"pointer",transition:"background 0.2s",
                          outline:isSel?`1px solid ${col}40`:"none",
                        }}>
                        <div style={{fontSize:18,flexShrink:0}}>{icon}</div>
                        <div style={{flex:1,minWidth:0}}>
                          <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:4,flexWrap:"wrap"}}>
                            <span style={{fontSize:11,fontFamily:"monospace",color:col}}>
                              {moveNum}{turn==="White"?".":"..."} {m.move}
                            </span>
                            <span style={{fontSize:9,letterSpacing:1.5,fontFamily:"monospace",color:col,
                              border:`1px solid ${col}40`,padding:"1px 5px",borderRadius:3,textTransform:"uppercase"}}>
                              {m.type.replace("_"," ")}
                            </span>
                          </div>
                          <div style={{fontSize:13,fontWeight:600,color:"#e8dfc8",marginBottom:3}}>{m.headline}</div>
                          <div style={{fontSize:11,color:"#9a8878",lineHeight:1.5}}>{m.detail}</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Biggest mistake */}
            {review.biggestMistake&&(
              <div style={{background:"#0e0d14",border:"1px solid #ff444440",borderRadius:8,padding:"16px 18px"}}>
                <div style={{fontSize:9,letterSpacing:3,color:"#ff4444",textTransform:"uppercase",marginBottom:6}}>💀 Biggest Mistake</div>
                <div style={{fontSize:12,fontFamily:"monospace",color:"#ff8888",marginBottom:6}}>
                  Move {Math.floor(review.biggestMistake.moveIndex/2)+1}{review.biggestMistake.moveIndex%2===0?".":"..."} {review.biggestMistake.move} — {review.biggestMistake.side}
                </div>
                <div style={{fontSize:12,color:"#9a8878",lineHeight:1.6}}>{review.biggestMistake.detail}</div>
              </div>
            )}

            {/* Verdict */}
            {review.verdict&&(
              <div style={{background:"#0e0d14",border:"1px solid #2a2235",borderRadius:8,padding:"16px 18px"}}>
                <div style={{fontSize:9,letterSpacing:3,color:"#b8904a",textTransform:"uppercase",marginBottom:6}}>Verdict</div>
                <div style={{fontSize:13,color:"#c8b888",lineHeight:1.75}}>{review.verdict}</div>
              </div>
            )}

            {/* Takeaway */}
            {review.takeaway&&(
              <div style={{background:"rgba(184,144,74,0.08)",border:"1px solid #b8904a40",borderRadius:8,padding:"16px 18px"}}>
                <div style={{fontSize:9,letterSpacing:3,color:"#b8904a",textTransform:"uppercase",marginBottom:6}}>🎯 Your Takeaway</div>
                <div style={{fontSize:14,color:"#e8dfc8",lineHeight:1.75,fontStyle:"italic"}}>{review.takeaway}</div>
              </div>
            )}

          </div>
        )}
      </div>

      {/* Right: board panel — appears when a moment is selected */}
      {selectedMoment&&review&&(
        <div style={{width:420,flexShrink:0,borderLeft:"1px solid #1e1c28",padding:20,display:"flex",flexDirection:"column",gap:16,background:"#0a090f"}}>
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between"}}>
            <div>
              <div style={{fontSize:9,letterSpacing:3,color:"#b8904a",textTransform:"uppercase",marginBottom:4}}>Position After Move</div>
              <div style={{fontSize:13,fontFamily:"monospace",color:"#e8dfc8"}}>
                {Math.floor(selectedMoment.moveIndex/2)+1}{selectedMoment.moveIndex%2===0?".":"..."} {selectedMoment.move}
              </div>
            </div>
            <button onClick={()=>setSelectedMoment(null)} style={{
              background:"transparent",border:"1px solid #2a2235",borderRadius:4,
              color:"#6a6070",fontSize:16,cursor:"pointer",padding:"4px 10px",lineHeight:1,
            }}>×</button>
          </div>
          <MiniBoard moves={review.moves} momentIdx={selectedMoment.moveIndex}/>
          <div style={{fontSize:9,letterSpacing:2,color:"#4a4258",textTransform:"uppercase"}}>
            {momentIcons[selectedMoment.type]||""} {(selectedMoment.type||"").replace("_"," ")}
          </div>
          <div style={{fontSize:13,fontWeight:600,color:"#e8dfc8"}}>{selectedMoment.headline}</div>
          <div style={{fontSize:12,color:"#9a8878",lineHeight:1.6}}>{selectedMoment.detail}</div>
        </div>
      )}

    </div>
  );
}

// ── Coach Review Component ────────────────────────────────────────────────────
function CoachReview({eloLevel, ELO_PERSONAS}){
  const[pgn,setPgn]=useState("");
  const[loading,setLoading]=useState(false);
  const[report,setReport]=useState(null);
  const[error,setError]=useState("");
  const[selectedGame,setSelectedGame]=useState("");
  const[selectedMoment,setSelectedMoment]=useState(null);

  function getMoveSquares(moves,moveIndex){
    try{
      const boards=buildAllBoards(moves.slice(0,moveIndex+1));
      const beforeBoard=boards[moveIndex];
      const afterBoard=boards[moveIndex+1];
      if(!beforeBoard||!afterBoard)return null;
      const turn=moveIndex%2===0?"w":"b";
      const moveStr=moves[moveIndex];
      const raw=moveStr.replace(/[+#!?]/g,"");
      if(raw==="O-O"){const rank=turn==="w"?7:0;return{fromR:rank,fromC:4,toR:rank,toC:6};}
      if(raw==="O-O-O"){const rank=turn==="w"?7:0;return{fromR:rank,fromC:4,toR:rank,toC:2};}
      let rest=raw;
      if("KQRBN".includes(raw[0]))rest=raw.slice(1);
      if(rest.includes("="))rest=rest.split("=")[0];
      rest=rest.replace("x","");
      const toFile=FILES.indexOf(rest[rest.length-2]);
      const toRank=8-parseInt(rest[rest.length-1]);
      if(toFile<0||isNaN(toRank))return null;
      let fromR=-1,fromC=-1;
      for(let r=0;r<8;r++){
        for(let c=0;c<8;c++){
          if(beforeBoard[r][c]&&!afterBoard[r][c]&&!(r===toRank&&c===toFile)){
            const p=beforeBoard[r][c];
            const isWhitePiece=p===p.toUpperCase();
            if((turn==="w"&&isWhitePiece)||(turn==="b"&&!isWhitePiece)){fromR=r;fromC=c;}
          }
        }
      }
      if(fromR===-1)return null;
      return{fromR,fromC,toR:toRank,toC:toFile};
    }catch{return null;}
  }

  function MiniBoard({moves,momentIdx,arrowColor}){
    const boards=buildAllBoards(moves.slice(0,momentIdx+1));
    const board=boards[momentIdx+1]||boards[momentIdx];
    const sq=getMoveSquares(moves,momentIdx);
    const SQ=44;
    const toSet=new Set(sq?[`${sq.toR},${sq.toC}`]:[]);
    const fromSet=new Set(sq?[`${sq.fromR},${sq.fromC}`]:[]);
    const col=arrowColor||"rgba(20,180,80,0.9)";
    const arrowSvg=sq?(()=>{
      const x1=sq.fromC*SQ+SQ/2,y1=sq.fromR*SQ+SQ/2;
      const x2=sq.toC*SQ+SQ/2,y2=sq.toR*SQ+SQ/2;
      const dx=x2-x1,dy=y2-y1,len=Math.sqrt(dx*dx+dy*dy);
      const sh=SQ*0.36;
      const ex=x2-dx/len*sh,ey=y2-dy/len*sh;
      return(
        <svg style={{position:"absolute",top:0,left:0,pointerEvents:"none",zIndex:10}} width={8*SQ} height={8*SQ}>
          <defs><marker id={`ah_${momentIdx}`} markerWidth="6" markerHeight="6" refX="3" refY="3" orient="auto">
            <polygon points="0 0, 6 3, 0 6" fill={col}/>
          </marker></defs>
          <line x1={x1} y1={y1} x2={ex} y2={ey} stroke={col} strokeWidth="5" strokeLinecap="round" markerEnd={`url(#ah_${momentIdx})`}/>
        </svg>
      );
    })():null;

    return(
      <div style={{position:"relative",display:"inline-block",border:"2px solid #3a3245",boxShadow:"0 4px 20px rgba(0,0,0,0.5)"}}>
        <div style={{display:"grid",gridTemplateColumns:`repeat(8,${SQ}px)`,gridTemplateRows:`repeat(8,${SQ}px)`}}>
          {RANKS.map((_,ri)=>FILES.map((_,fi)=>{
            const piece=board?.[ri]?.[fi]||null;
            const pr=piece?PIECE_RENDER[piece]:null;
            const isTo=toSet.has(`${ri},${fi}`);
            const isFrom=fromSet.has(`${ri},${fi}`);
            const light=(ri+fi)%2===0;
            let bg=light?"#f0d9b5":"#b58863";
            if(isFrom)bg=light?"#f6f240":"#d4c020";
            if(isTo)bg=light?"#cff0a0":"#88c040";
            return(
              <div key={`${ri},${fi}`} style={{width:SQ,height:SQ,background:bg,display:"flex",alignItems:"center",justifyContent:"center",userSelect:"none"}}>
                {pr&&<span style={{fontSize:27,lineHeight:1,color:pr.color,textShadow:pr.shadow}}>{pr.sym}</span>}
              </div>
            );
          }))}
        </div>
        {arrowSvg}
      </div>
    );
  }

  const runCoach=async(pgnText)=>{
    const p=pgnText||pgn;
    if(!p.trim())return;
    setError("");setReport(null);setLoading(true);setSelectedMoment(null);
    const moves=parsePGN(p);
    if(!moves.length){setError("No moves found.");setLoading(false);return;}
    const opening=detectOpening(moves);
    const totalMoves=moves.length;

    const annotated=moves.map((m,i)=>{
      const drama=detectDrama(m);
      const turn=i%2===0?"White":"Black";
      const num=Math.floor(i/2)+1;
      return `${num}${turn==="White"?".":"..."} ${m}${drama.length?" ["+drama.join(",")+"]":""}`;
    }).join(" ");

    const eloDesc=eloLevel<=900?"beginner (~"+eloLevel+" ELO)":eloLevel<=1400?"intermediate club player (~"+eloLevel+" ELO)":"advanced player (~"+eloLevel+" ELO)";

    const prompt=`You are a chess coach reviewing a game played by a ${eloDesc}.

Game moves with annotations:
${annotated}

Opening: ${opening||"Unknown"}
Total moves: ${totalMoves}

Your job: identify the moments that most affected this player's result and explain the CONCEPT behind each one — not just the move, but the idea they missed or misunderstood. Tune all explanations to ${eloLevel} ELO.

Return ONLY valid JSON with exactly this structure:

{
  "playerSummary": "2-3 sentences. What kind of player does this game reveal? What are their tendencies? Encouraging but honest.",
  "fixFirst": [
    {
      "moveIndex": 0,
      "move": "move notation",
      "side": "White or Black",
      "conceptName": "Short name for the pattern/concept e.g. 'Hanging piece', 'Back rank weakness', 'Knight fork'",
      "what": "One sentence: what went wrong on this move.",
      "why": "1-2 sentences: the chess concept behind the mistake. Why is this bad positionally or tactically?",
      "remember": "One sentence: the rule or pattern to remember for next time. Make it sticky.",
      "severity": "critical or significant"
    }
  ],
  "missedChances": [
    {
      "moveIndex": 0,
      "move": "move notation",
      "side": "White or Black",
      "conceptName": "e.g. 'Discovered attack', 'Pawn promotion', 'Skewer'",
      "what": "One sentence: what was available here that they didn't take.",
      "why": "1-2 sentences: why this opportunity existed and what it would have achieved.",
      "remember": "One sentence: the pattern to drill."
    }
  ],
  "theoryGaps": [
    {
      "topic": "e.g. 'London System bishop placement', 'King safety before attacking', 'Rook on open file'",
      "context": "One sentence: where in the game this came up.",
      "lesson": "2-3 sentences: the concept explained for ${eloLevel} ELO. Practical and concrete.",
      "studyFocus": "One sentence: what to go study or drill to fix this."
    }
  ],
  "advantageSwings": [
    {
      "moveIndex": 0,
      "move": "move notation",
      "side": "White or Black",
      "description": "One sentence: what happened to the balance of the game here."
    }
  ],
  "studyPlan": [
    "Study item 1 — specific and actionable",
    "Study item 2",
    "Study item 3"
  ],
  "coachSignoff": "One encouraging sentence to close. Specific to what they showed in this game."
}

Rules:
- fixFirst: 2-4 items max. Only the moves that actually hurt them most.
- missedChances: 1-3 items. Real missed tactics or positional ideas, not every suboptimal move.
- theoryGaps: 1-3 items. Concepts that keep coming up in this game.
- advantageSwings: 2-4 moments where the eval shifted significantly.
- studyPlan: exactly 3 items. Specific, not generic ("Study tactics" is bad. "Drill knight fork patterns on Chess.com puzzles" is good).
- All language tuned for ${eloLevel} ELO. ${eloLevel<=900?"Avoid jargon. Be encouraging. Very plain language.":eloLevel<=1400?"Some chess terms OK. Focus on patterns.":"Full chess vocabulary. Be direct and analytical."}`;

    try{
      const resp=await fetch("https://api.anthropic.com/v1/messages",{
        method:"POST",
        headers:{"Content-Type":"application/json"},
        body:JSON.stringify({
          model:"claude-sonnet-4-20250514",
          max_tokens:4000,
          system:"You are an expert chess coach. Always respond with valid JSON only. No markdown, no explanation, just the raw JSON object.",
          messages:[{role:"user",content:prompt}],
        }),
      });
      if(!resp.ok)throw new Error(`API ${resp.status}`);
      const data=await resp.json();
      const raw=data.content?.[0]?.text||"";
      const clean=raw.replace(/```json|```/g,"").trim();
      const parsed=JSON.parse(clean);
      setReport({...parsed,moves,totalMoves,opening});
    }catch(e){
      setError("Coach failed: "+e.message);
    }finally{setLoading(false);}
  };

  const severityColor={critical:"#ff4444",significant:"#f59e0b"};
  const SectionHeader=({icon,label,color})=>(
    <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:14}}>
      <span style={{fontSize:18}}>{icon}</span>
      <div style={{fontSize:10,letterSpacing:3,color:color||"#b8904a",textTransform:"uppercase",fontWeight:700}}>{label}</div>
      <div style={{flex:1,height:1,background:color?`${color}30`:"#2a2235"}}/>
    </div>
  );

  const ConceptCard=({item,color,showSeverity,onClick,isSelected})=>(
    <div onClick={onClick} style={{
      background:isSelected?"#141228":"#0e0d14",
      border:`1px solid ${isSelected?color+"60":"#2a2235"}`,
      borderLeft:`3px solid ${color}`,
      borderRadius:6,padding:"14px 16px",cursor:onClick?"pointer":"default",
      transition:"all 0.2s",marginBottom:8,
    }}>
      <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between",gap:8,marginBottom:8}}>
        <div style={{display:"flex",alignItems:"center",gap:8,flexWrap:"wrap"}}>
          <span style={{fontSize:11,fontFamily:"monospace",color:color}}>
            {item.moveIndex!==undefined&&`${Math.floor(item.moveIndex/2)+1}${item.moveIndex%2===0?".":"..."} ${item.move}`}
          </span>
          <span style={{fontSize:11,fontWeight:700,color:"#e8dfc8"}}>{item.conceptName||item.topic}</span>
          {showSeverity&&item.severity&&(
            <span style={{fontSize:9,letterSpacing:1,fontFamily:"monospace",
              color:severityColor[item.severity]||"#888",
              border:`1px solid ${(severityColor[item.severity]||"#888")}40`,
              padding:"1px 6px",borderRadius:3,textTransform:"uppercase"}}>
              {item.severity}
            </span>
          )}
        </div>
        {onClick&&<span style={{fontSize:11,color:"#4a4258",flexShrink:0}}>{isSelected?"▲":"▼ view board"}</span>}
      </div>
      <div style={{fontSize:12,color:"#c8b888",marginBottom:6,lineHeight:1.6}}>{item.what||item.context}</div>
      <div style={{fontSize:12,color:"#9a8878",marginBottom:6,lineHeight:1.6}}>{item.why||item.lesson}</div>
      {(item.remember||item.studyFocus)&&(
        <div style={{
          fontSize:11,color:"#a0c0a0",lineHeight:1.5,
          background:"rgba(100,180,100,0.06)",border:"1px solid rgba(100,180,100,0.15)",
          borderRadius:4,padding:"6px 10px",marginTop:4,
        }}>
          💡 {item.remember||item.studyFocus}
        </div>
      )}
      {isSelected&&item.moveIndex!==undefined&&(
        <div style={{marginTop:14}}>
          <MiniBoard moves={report.moves} momentIdx={item.moveIndex} arrowColor={color+"ee"}/>
        </div>
      )}
    </div>
  );

  return(
    <div style={{flex:1,display:"flex",overflow:"hidden"}}>

      {/* Left: input */}
      <div style={{width:300,flexShrink:0,borderRight:"1px solid #1e1c28",padding:20,display:"flex",flexDirection:"column",gap:14,overflowY:"auto"}}>
        <div style={{fontSize:11,letterSpacing:2,color:"#b8904a",textTransform:"uppercase"}}>Coach Review</div>
        <div style={{fontSize:12,color:"#6a6070",lineHeight:1.6}}>Upload your game. Get a narrated coaching session — what went wrong, what you missed, and what to study.</div>
        <div style={{fontSize:10,letterSpacing:2,color:"#4a4258",textTransform:"uppercase",marginBottom:2}}>Sample Games</div>
        {Object.keys(SAMPLE_GAMES).map(name=>(
          <button key={name} onClick={()=>{setSelectedGame(name);setPgn(SAMPLE_GAMES[name]);}} style={{
            padding:"9px 12px",borderRadius:5,textAlign:"left",cursor:"pointer",
            border:selectedGame===name?"1px solid #b8904a":"1px solid #2a2235",
            background:selectedGame===name?"rgba(184,144,74,0.1)":"#0e0d14",
            color:selectedGame===name?"#d4a55a":"#5a4a38",fontSize:11,transition:"all 0.2s",
          }}>{name}</button>
        ))}
        <div style={{borderTop:"1px solid #1e1c28",paddingTop:14}}>
          <div style={{fontSize:10,letterSpacing:2,color:"#4a4258",textTransform:"uppercase",marginBottom:6}}>Or Paste PGN</div>
          <textarea value={pgn} onChange={e=>{setPgn(e.target.value);setSelectedGame("");}} placeholder="Paste your game PGN..." rows={7} style={{
            width:"100%",boxSizing:"border-box",background:"#0a090f",border:"1px solid #2a2235",
            borderRadius:4,color:"#b8904a",padding:"8px 10px",fontSize:11,fontFamily:"monospace",
            resize:"vertical",outline:"none",lineHeight:1.6,
          }}/>
          {error&&<div style={{color:"#ff5555",fontSize:11,marginTop:6}}>{error}</div>}
          <button onClick={()=>runCoach()} disabled={loading||!pgn.trim()} style={{
            marginTop:10,width:"100%",padding:"11px",
            background:loading?"#1a1828":"linear-gradient(135deg,#6060c0,#404090)",
            border:"none",borderRadius:4,color:loading?"#5a5060":"#e0e0ff",
            fontSize:12,fontWeight:700,cursor:loading?"not-allowed":"pointer",
            letterSpacing:1.5,textTransform:"uppercase",transition:"all 0.3s",
          }}>{loading?"⟳ Coaching...":"Get Coaching →"}</button>
        </div>
      </div>

      {/* Right: coaching report */}
      <div style={{flex:1,overflowY:"auto",padding:24}}>
        {!report&&!loading&&(
          <div style={{height:"100%",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:12,color:"#4a4258"}}>
            <div style={{fontSize:48}}>🎓</div>
            <div style={{fontSize:13,letterSpacing:2,textTransform:"uppercase"}}>Ready to coach</div>
            <div style={{fontSize:11,color:"#3a3248"}}>Paste your game and get a narrated coaching session</div>
          </div>
        )}
        {loading&&(
          <div style={{height:"100%",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:16,color:"#6a6070"}}>
            <div style={{fontSize:32,animation:"spin 1.5s linear infinite",display:"inline-block"}}>♟</div>
            <div style={{fontSize:13,letterSpacing:2,textTransform:"uppercase"}}>Coach is reviewing your game…</div>
            <div style={{fontSize:11,color:"#4a4258"}}>This takes a moment</div>
          </div>
        )}

        {report&&(
          <div style={{display:"flex",flexDirection:"column",gap:28,maxWidth:780}}>

            {/* Player summary */}
            <div style={{background:"linear-gradient(135deg,rgba(96,96,192,0.12),rgba(64,64,144,0.06))",border:"1px solid #6060c040",borderRadius:8,padding:"18px 20px"}}>
              <div style={{fontSize:9,letterSpacing:3,color:"#a0a0e0",textTransform:"uppercase",marginBottom:8}}>🎓 Coach's Read</div>
              <div style={{fontSize:14,color:"#d0d0f0",lineHeight:1.8}}>{report.playerSummary}</div>
            </div>

            {/* Advantage swings timeline */}
            {report.advantageSwings?.length>0&&(
              <div>
                <SectionHeader icon="📊" label="Advantage Swings" color="#60a5fa"/>
                <div style={{position:"relative",height:6,background:"#1a1828",borderRadius:3,marginBottom:16}}>
                  {report.advantageSwings.map((s,i)=>{
                    const pct=(s.moveIndex/report.totalMoves)*100;
                    return(
                      <div key={i} style={{position:"absolute",left:`${pct}%`,top:-5,
                        width:16,height:16,borderRadius:"50%",
                        background:s.side==="White"?"#f0e0c0":"#4a4060",
                        border:"2px solid #60a5fa",transform:"translateX(-50%)",
                        boxShadow:"0 0 8px #60a5fa60",cursor:"default"
                      }} title={s.description}/>
                    );
                  })}
                </div>
                <div style={{display:"flex",flexDirection:"column",gap:6}}>
                  {report.advantageSwings.map((s,i)=>(
                    <div key={i} style={{display:"flex",gap:10,alignItems:"flex-start",
                      background:"#0e0d14",borderRadius:5,padding:"10px 14px",
                      borderLeft:"2px solid #60a5fa40"}}>
                      <span style={{fontSize:10,fontFamily:"monospace",color:"#60a5fa",flexShrink:0,marginTop:1}}>
                        {Math.floor(s.moveIndex/2)+1}{s.moveIndex%2===0?".":"..."} {s.move}
                      </span>
                      <span style={{fontSize:12,color:"#9a8878",lineHeight:1.5}}>{s.description}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Fix First */}
            {report.fixFirst?.length>0&&(
              <div>
                <SectionHeader icon="🔴" label="Fix These First" color="#ff6b6b"/>
                {report.fixFirst.map((item,i)=>(
                  <ConceptCard key={i} item={item} color={severityColor[item.severity]||"#ff6b6b"}
                    showSeverity={true}
                    onClick={()=>setSelectedMoment(selectedMoment?.moveIndex===item.moveIndex&&selectedMoment?.section==="fix"?null:{...item,section:"fix"})}
                    isSelected={selectedMoment?.moveIndex===item.moveIndex&&selectedMoment?.section==="fix"}
                  />
                ))}
              </div>
            )}

            {/* Missed Chances */}
            {report.missedChances?.length>0&&(
              <div>
                <SectionHeader icon="🟡" label="Missed Opportunities" color="#f59e0b"/>
                {report.missedChances.map((item,i)=>(
                  <ConceptCard key={i} item={item} color="#f59e0b"
                    onClick={()=>setSelectedMoment(selectedMoment?.moveIndex===item.moveIndex&&selectedMoment?.section==="missed"?null:{...item,section:"missed"})}
                    isSelected={selectedMoment?.moveIndex===item.moveIndex&&selectedMoment?.section==="missed"}
                  />
                ))}
              </div>
            )}

            {/* Theory Gaps */}
            {report.theoryGaps?.length>0&&(
              <div>
                <SectionHeader icon="📚" label="Theory Gaps" color="#a78bfa"/>
                {report.theoryGaps.map((item,i)=>(
                  <ConceptCard key={i} item={item} color="#a78bfa"/>
                ))}
              </div>
            )}

            {/* Study Plan */}
            {report.studyPlan?.length>0&&(
              <div style={{background:"rgba(96,192,96,0.06)",border:"1px solid rgba(96,192,96,0.2)",borderRadius:8,padding:"18px 20px"}}>
                <SectionHeader icon="🟢" label="Your 3-Item Study Plan" color="#4ade80"/>
                <div style={{display:"flex",flexDirection:"column",gap:10}}>
                  {report.studyPlan.map((item,i)=>(
                    <div key={i} style={{display:"flex",gap:12,alignItems:"flex-start"}}>
                      <div style={{width:22,height:22,borderRadius:"50%",background:"rgba(74,222,128,0.15)",
                        border:"1px solid #4ade8040",display:"flex",alignItems:"center",justifyContent:"center",
                        fontSize:11,color:"#4ade80",fontWeight:700,flexShrink:0}}>
                        {i+1}
                      </div>
                      <div style={{fontSize:13,color:"#c8e0c8",lineHeight:1.6,paddingTop:2}}>{item}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Coach sign-off */}
            {report.coachSignoff&&(
              <div style={{textAlign:"center",padding:"16px 20px",borderTop:"1px solid #1e1c28"}}>
                <div style={{fontSize:13,color:"#8a8098",lineHeight:1.7,fontStyle:"italic"}}>{report.coachSignoff}</div>
              </div>
            )}

          </div>
        )}
      </div>
    </div>
  );
}


function CtrlBtn({onClick,disabled,title}){
  return(
    <button onClick={onClick} disabled={disabled} style={{
      padding:"8px 12px",background:"transparent",border:"1px solid #2a2235",
      borderRadius:4,color:"#7a6a58",fontSize:13,cursor:"pointer",
      fontFamily:"monospace",transition:"all 0.15s",
    }}>{title}</button>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function ChessCaster(){
  const[pgn,setPgn]=useState("");
  const[moves,setMoves]=useState([]);
  const[boards,setBoards]=useState([]);
  const[currentMove,setCurrentMove]=useState(-1);
  const[commentary,setCommentary]=useState({});
  const[loadingIdx,setLoadingIdx]=useState(null);
  const[apiError,setApiError]=useState(null);
  const[eloLevel,setEloLevel]=useState(1200);
  const[activeTab,setActiveTab]=useState("broadcast");
  const[phase,setPhase]=useState("setup");
  const[opening,setOpening]=useState(null);
  const[isAutoPlaying,setIsAutoPlaying]=useState(false);
  const[selectedGame,setSelectedGame]=useState("");
  const[parseError,setParseError]=useState("");
  const commentaryRef=useRef(null);
  const autoTimerRef=useRef(null);
  const isAutoRef=useRef(false);
  const currentMoveRef=useRef(-1);
  const[voiceEnabled,setVoiceEnabled]=useState(false);
  const voiceRef=useRef(null);

  useEffect(()=>{
    const pick=()=>{
      const voices=window.speechSynthesis.getVoices();
      if(!voices.length)return;
      const preferred=['Google UK English Male','Microsoft David','Alex','Daniel','Fred','Ralph','Albert'];
      for(const name of preferred){
        const v=voices.find(v=>v.name===name);
        if(v){voiceRef.current=v;return;}
      }
      const eng=voices.find(v=>v.lang.startsWith('en'));
      voiceRef.current=eng||voices[0]||null;
    };
    pick();
    window.speechSynthesis.onvoiceschanged=pick;
    return()=>{window.speechSynthesis.onvoiceschanged=null;};
  },[]);

  const currentBoard=boards[currentMove+1]||boards[0]||fenToBoard(INITIAL_FEN);

  useEffect(()=>{isAutoRef.current=isAutoPlaying;},[isAutoPlaying]);
  useEffect(()=>{currentMoveRef.current=currentMove;},[currentMove]);

  const speak=useCallback((text)=>{
    if(!voiceEnabled)return;
    window.speechSynthesis.cancel();
    const utt=new SpeechSynthesisUtterance(text);
    if(voiceRef.current)utt.voice=voiceRef.current;
    utt.rate=2.0;
    utt.pitch=0.88;
    utt.volume=1;
    window.speechSynthesis.speak(utt);
  },[voiceEnabled]);

  const stopSpeaking=useCallback(()=>{
    window.speechSynthesis.cancel();
  },[]);

  const loadGame=useCallback(()=>{
    if(!pgn.trim())return;
    setParseError("");
    try{
      const parsed=parsePGN(pgn);
      if(!parsed.length){setParseError("No moves found. Check PGN format.");return;}
      setMoves(parsed);
      setBoards(buildAllBoards(parsed));
      setCurrentMove(-1);
      setCommentary({});
      setOpening(null);
      setIsAutoPlaying(false);
      setPhase("playing");
    }catch{setParseError("Could not parse PGN.");}
  },[pgn]);

  const fetchCommentary=useCallback(async(idx,movesArr,openingStr)=>{
    const moveStr=movesArr[idx];
    const turn=idx%2===0?"white":"black";
    const moveNumber=Math.floor(idx/2)+1;
    const playedSoFar=movesArr.slice(0,idx+1);
    const det=detectOpening(playedSoFar);
    if(det)setOpening(det);
    const gamePhase=idx<10?"opening":idx<movesArr.length*0.6?"middlegame":"endgame";
    const drama=detectDrama(moveStr);
    const recentHistory=movesArr.slice(Math.max(0,idx-5),idx).join(" ")||"Opening move";
    const captures=playedSoFar.filter(m=>m.includes("x")).length;
    let positionNotes=det?`Opening: ${det}. `:(openingStr?`Opening: ${openingStr}. `:"");
    if(gamePhase==="endgame")positionNotes+="Endgame reached. ";
    if(captures>8)positionNotes+="Sharp tactical game.";
    else if(captures===0&&idx>10)positionNotes+="Quiet positional game so far.";
    const moveData={move:moveStr,moveNumber,turn,opening:det||openingStr,phase:gamePhase,recentHistory,drama,positionNotes};
    setLoadingIdx(idx);setApiError(null);
    try{
      const text=await generateCommentary(moveData,eloLevel);
      setCommentary(prev=>({...prev,[idx]:{text,move:moveStr,moveNumber,turn,drama}}));
      speak(text);
    }catch(e){
      setApiError(e.message);
      setCommentary(prev=>({...prev,[idx]:{text:"⚠ Commentary unavailable for this move.",move:moveStr,moveNumber,turn,drama}}));
    }finally{setLoadingIdx(null);}
  },[eloLevel,speak]);

  const goToMove=useCallback(async(idx,movesArr,openingStr)=>{
    const arr=movesArr||moves;
    const op=openingStr||opening;
    if(idx<-1||idx>=arr.length)return;
    setCurrentMove(idx);
    if(idx===-1)return;
    const newOp=detectOpening(arr.slice(0,idx+1));
    if(newOp)setOpening(newOp);
    setCommentary(prev=>{
      if(prev[idx]!==undefined)return prev;
      if(shouldCommentate(idx,arr,op,newOp||op))fetchCommentary(idx,arr,newOp||op);
      return prev;
    });
  },[moves,opening,fetchCommentary]);

  const stopAutoPlay=useCallback(()=>{
    isAutoRef.current=false;
    setIsAutoPlaying(false);
    clearTimeout(autoTimerRef.current);
    window.speechSynthesis.cancel();
  },[]);

  const scheduleNext=useCallback((fromIdx,movesArr,op)=>{
    clearTimeout(autoTimerRef.current);
    autoTimerRef.current=setTimeout(async()=>{
      if(!isAutoRef.current)return;
      const next=fromIdx+1;
      if(next>=(movesArr||moves).length){stopAutoPlay();return;}
      setCurrentMove(next);
      const arr=movesArr||moves;
      const openingStr=op||opening;
      const newOp=detectOpening(arr.slice(0,next+1))||openingStr;
      if(newOp)setOpening(newOp);
      setCommentary(prev=>{
        if(prev[next]===undefined&&shouldCommentate(next,arr,openingStr,newOp))fetchCommentary(next,arr,newOp);
        return prev;
      });
      scheduleNext(next,arr,openingStr);
    },6500);
  },[moves,opening,fetchCommentary,stopAutoPlay]);

  const startAutoPlay=useCallback(()=>{
    const cur=currentMoveRef.current;
    if(cur>=(moves.length-1))return;
    isAutoRef.current=true;
    setIsAutoPlaying(true);
    scheduleNext(cur,moves,opening);
  },[moves,opening,scheduleNext]);

  useEffect(()=>()=>clearTimeout(autoTimerRef.current),[]);

  const canGoNext=currentMove<moves.length-1;
  const canGoPrev=currentMove>-1;

  const stepForward=useCallback(()=>{if(canGoNext)goToMove(currentMove+1);},[canGoNext,currentMove,goToMove]);
  const stepBack=useCallback(()=>{if(canGoPrev){stopAutoPlay();setCurrentMove(p=>p-1);}},[canGoPrev,stopAutoPlay]);

  useEffect(()=>{
    const handler=(e)=>{
      if(phase!=="playing")return;
      if(e.key==="ArrowRight"){stopAutoPlay();stepForward();}
      if(e.key==="ArrowLeft"){stopAutoPlay();stepBack();}
      if(e.key===" "){e.preventDefault();isAutoPlaying?stopAutoPlay():startAutoPlay();}
    };
    window.addEventListener("keydown",handler);
    return()=>window.removeEventListener("keydown",handler);
  },[phase,stepForward,stepBack,isAutoPlaying,startAutoPlay,stopAutoPlay]);

  const resetToSetup=()=>{
    stopAutoPlay();
    stopSpeaking();
    setPhase("setup");setMoves([]);setBoards([]);setCurrentMove(-1);
    setCommentary({});setOpening(null);setSelectedGame("");setPgn("");setApiError(null);
  };

  const hlSet=new Set();
  if(currentMove>=0&&moves[currentMove]){
    const raw=moves[currentMove].replace(/[+#!?=KQRBN]/g,"").replace("x","");
    if(raw.length>=2){const fc=FILES.indexOf(raw[raw.length-2]),fr=8-parseInt(raw[raw.length-1]);if(fc>=0&&fr>=0)hlSet.add(`${fr},${fc}`);}
  }

  const persona=ELO_PERSONAS[eloLevel];
  const progressPct=moves.length?((currentMove+1)/moves.length)*100:0;

  return(
    <div style={{minHeight:"100vh",background:"#0c0b10",color:"#e2d9c8",fontFamily:"'Georgia','Times New Roman',serif",display:"flex",flexDirection:"column"}}>

      {/* Header */}
      <header style={{padding:"16px 24px",borderBottom:"1px solid #1e1c28",display:"flex",alignItems:"center",justifyContent:"space-between",background:"#0e0d14"}}>
        <div>
          <div style={{display:"flex",alignItems:"baseline",gap:10}}>
            <span style={{fontSize:24,fontWeight:700,color:"#f0e0c0",letterSpacing:"-0.5px"}}>♟ ChessCaster</span>
            <span style={{fontSize:9,letterSpacing:3,color:phase==="playing"?"#ff4444":"#b8904a",fontFamily:"monospace",textTransform:"uppercase"}}>
              {phase==="playing"?"● ON AIR":"BROADCAST"}
            </span>
          </div>
          <div style={{fontSize:11,color:"#3a3230",letterSpacing:1,marginTop:1}}>AI Sports Commentary for Chess</div>
        </div>
        <div style={{display:"flex",alignItems:"center",gap:16}}>
          {/* Tab switcher */}
          <div style={{display:"flex",gap:2,background:"#0a090f",borderRadius:6,padding:3,border:"1px solid #2a2235"}}>
            {[["broadcast","📡 Broadcast"],["review","🔍 Game Review"],["coach","🎓 Coach"]].map(([tab,label])=>(
              <button key={tab} onClick={()=>setActiveTab(tab)} style={{
                padding:"6px 16px",borderRadius:4,fontSize:11,fontFamily:"monospace",cursor:"pointer",
                border:"none",
                background:activeTab===tab?"rgba(184,144,74,0.2)":"transparent",
                color:activeTab===tab?"#c8a050":"#5a5060",
                fontWeight:activeTab===tab?700:400,
                transition:"all 0.2s",letterSpacing:0.5,
              }}>{label}</button>
            ))}
          </div>
          <div style={{width:1,height:24,background:"#2a2235"}}/>
          {activeTab==="broadcast"&&<>
            <span style={{fontSize:10,color:"#4a4258",letterSpacing:1}}>LEVEL</span>
            {Object.entries(ELO_PERSONAS).map(([elo,p])=>(
              <button key={elo} onClick={()=>{setEloLevel(parseInt(elo));setCommentary({});}} style={{
                padding:"5px 12px",borderRadius:4,fontSize:11,fontFamily:"monospace",cursor:"pointer",
                border:eloLevel===parseInt(elo)?`1px solid ${p.color}`:"1px solid #2a2235",
                background:eloLevel===parseInt(elo)?`${p.color}18`:"transparent",
                color:eloLevel===parseInt(elo)?p.color:"#7a6a58",
                transition:"all 0.2s",
              }}>{p.label}</button>
            ))}
          </>}
        </div>
      </header>

      {activeTab==="broadcast"&&(
        <div style={{display:"flex",flex:1,overflow:"hidden"}}>

          {/* Left panel */}
          <div style={{width:420,flexShrink:0,borderRight:"1px solid #1e1c28",display:"flex",flexDirection:"column",overflowY:"auto",padding:20,gap:16}}>

            {phase==="setup"&&(
              <>
                <div style={{fontSize:11,letterSpacing:2,color:"#b8904a",textTransform:"uppercase",marginBottom:4}}>Select a Game</div>
                {Object.keys(SAMPLE_GAMES).map(name=>(
                  <button key={name} onClick={()=>{setSelectedGame(name);setPgn(SAMPLE_GAMES[name]);}} style={{
                    padding:"12px 16px",borderRadius:6,textAlign:"left",cursor:"pointer",
                    border:selectedGame===name?"1px solid #b8904a":"1px solid #2a2235",
                    background:selectedGame===name?"rgba(184,144,74,0.12)":"#0e0d14",
                    color:selectedGame===name?"#d4a55a":"#5a4a38",fontSize:13,transition:"all 0.2s",
                  }}>{name}</button>
                ))}
                <div style={{borderTop:"1px solid #1e1c28",paddingTop:16}}>
                  <div style={{fontSize:10,letterSpacing:2,color:"#4a4238",textTransform:"uppercase",marginBottom:8}}>Or Paste PGN</div>
                  <textarea value={pgn} onChange={e=>setPgn(e.target.value)} placeholder="Paste any PGN here..." rows={7} style={{
                    width:"100%",boxSizing:"border-box",background:"#0a090f",border:"1px solid #2a2235",
                    borderRadius:4,color:"#b8904a",padding:"10px 12px",fontSize:12,fontFamily:"monospace",
                    resize:"vertical",outline:"none",lineHeight:1.6,
                  }}/>
                  {parseError&&<div style={{color:"#ff5555",fontSize:12,marginTop:6}}>{parseError}</div>}
                  <button onClick={loadGame} style={{
                    marginTop:12,width:"100%",padding:"12px",
                    background:"linear-gradient(135deg, #c8a050, #9a6a28)",
                    border:"none",borderRadius:4,color:"#0c0b10",
                    fontSize:13,fontWeight:700,cursor:"pointer",letterSpacing:1.5,textTransform:"uppercase",
                  }}>Start Broadcast →</button>
                </div>
              </>
            )}

            {phase==="playing"&&(
              <>
                {/* Board */}
                <div style={{alignSelf:"center"}}>
                  <div style={{display:"flex",alignItems:"flex-start",gap:6}}>
                    <div style={{display:"flex",flexDirection:"column",paddingTop:0}}>
                      {RANKS.map(r=>(
                        <div key={r} style={{height:44,display:"flex",alignItems:"center",justifyContent:"center",fontSize:10,color:"#4a4238",fontFamily:"monospace",width:12}}>{r}</div>
                      ))}
                    </div>
                    <div style={{display:"grid",gridTemplateColumns:"repeat(8, 44px)",gridTemplateRows:"repeat(8, 44px)",border:"2px solid #2a2235",boxShadow:"0 4px 40px rgba(0,0,0,0.7)"}}>
                      {RANKS.map((_,ri)=>FILES.map((_,fi)=>{
                        const piece=currentBoard[ri]?.[fi]||null;
                        const pr=piece?PIECE_RENDER[piece]:null;
                        const hl=hlSet.has(`${ri},${fi}`);
                        return(
                          <div key={`${ri},${fi}`} style={{width:44,height:44,background:sqColor(ri,fi,hl),display:"flex",alignItems:"center",justifyContent:"center",userSelect:"none"}}>
                            {pr&&<span style={{fontSize:30,lineHeight:1,color:pr.color,textShadow:pr.shadow}}>{pr.sym}</span>}
                          </div>
                        );
                      }))}
                    </div>
                  </div>
                  <div style={{display:"flex",paddingLeft:18,marginTop:3}}>
                    {FILES.map(f=><div key={f} style={{width:44,textAlign:"center",fontSize:10,color:"#4a4238",fontFamily:"monospace"}}>{f}</div>)}
                  </div>
                </div>

                {/* Controls */}
                <div style={{background:"#0e0d14",border:"1px solid #1e1c28",borderRadius:6,padding:"12px 16px"}}>
                  {opening&&<div style={{fontSize:10,color:"#b8904a",letterSpacing:1.5,textTransform:"uppercase",marginBottom:6}}>♟ {opening}</div>}
                  <div style={{display:"flex",justifyContent:"space-between",fontSize:11,color:"#4a4238",fontFamily:"monospace",marginBottom:8}}>
                    <span>Move {Math.max(0,currentMove+1)} / {moves.length}</span>
                    <span style={{color:"#6a5a48"}}>{currentMove>=0?moves[currentMove]:"—"}</span>
                  </div>
                  <div style={{height:2,background:"#1e1c28",borderRadius:1,marginBottom:12}}>
                    <div style={{height:"100%",borderRadius:1,background:"linear-gradient(90deg,#c8a050,#ffd700)",width:`${progressPct}%`,transition:"width 0.3s"}}/>
                  </div>
                  <div style={{display:"flex",gap:6,marginBottom:6}}>
                    <CtrlBtn onClick={()=>{stopAutoPlay();setCurrentMove(-1);}} title="⏮"/>
                    <CtrlBtn onClick={stepBack} disabled={!canGoPrev} title="◀"/>
                    <button onClick={isAutoPlaying?stopAutoPlay:startAutoPlay} style={{
                      flex:1,padding:"8px",borderRadius:4,fontSize:11,cursor:"pointer",fontFamily:"monospace",
                      letterSpacing:1,textTransform:"uppercase",transition:"all 0.2s",
                      border:isAutoPlaying?"1px solid #b8904a":"1px solid #2a2235",
                      background:isAutoPlaying?"rgba(184,144,74,0.15)":"transparent",
                      color:isAutoPlaying?"#b8904a":"#5a4a38",
                    }}>{isAutoPlaying?"⏸ Pause":"▶ Auto"}</button>
                    <CtrlBtn onClick={stepForward} disabled={!canGoNext} title="▶"/>
                    <CtrlBtn onClick={()=>{stopAutoPlay();goToMove(moves.length-1);}} title="⏭"/>
                  </div>
                  <div style={{fontSize:9,color:"#6a6070",textAlign:"center",letterSpacing:1}}>← → ARROW KEYS · SPACE TO AUTO-PLAY</div>
                </div>

                {/* Move list */}
                <div style={{background:"#0e0d14",border:"1px solid #1e1c28",borderRadius:6,padding:"12px 14px",maxHeight:170,overflowY:"auto"}}>
                  <div style={{fontSize:9,letterSpacing:2,color:"#7a6a58",textTransform:"uppercase",marginBottom:8}}>Moves</div>
                  <div style={{display:"flex",flexWrap:"wrap",gap:2}}>
                    {moves.map((move,i)=>{
                      const isW=i%2===0;
                      return(
                        <span key={i} style={{display:"inline-flex",alignItems:"center",gap:1}}>
                          {isW&&<span style={{fontSize:9,color:"#6a6070",fontFamily:"monospace"}}>{Math.floor(i/2)+1}.</span>}
                          <span onClick={()=>{stopAutoPlay();goToMove(i);}} style={{
                            padding:"2px 5px",borderRadius:3,fontSize:11,fontFamily:"monospace",cursor:"pointer",transition:"all 0.15s",
                            background:currentMove===i?"rgba(184,144,74,0.2)":"transparent",
                            color:currentMove===i?"#b8904a":commentary[i]?"#7a6a58":"#4a4050",
                            border:currentMove===i?"1px solid rgba(184,144,74,0.3)":"1px solid transparent",
                          }}>{move}</span>
                        </span>
                      );
                    })}
                  </div>
                </div>

                <button onClick={resetToSetup} style={{padding:"8px",background:"transparent",border:"1px solid #1e1c28",borderRadius:4,color:"#3a3228",fontSize:11,cursor:"pointer",letterSpacing:1}}>← New Game</button>
              </>
            )}
          </div>

          {/* Commentary panel */}
          <div style={{flex:1,display:"flex",flexDirection:"column",overflow:"hidden"}}>
            <div style={{padding:"14px 24px",borderBottom:"1px solid #1e1c28",display:"flex",alignItems:"center",gap:12,background:"#0e0d14",flexShrink:0}}>
              <div style={{width:8,height:8,borderRadius:"50%",background:phase==="playing"?"#ff3333":"#2a2235",boxShadow:phase==="playing"?"0 0 10px #ff3333":"none"}}/>
              <span style={{fontSize:10,letterSpacing:3,color:"#b8904a",textTransform:"uppercase"}}>{phase==="playing"?"Live Commentary":"ChessCaster"}</span>
              <span style={{marginLeft:"auto",fontSize:10,color:"#7a6a58",fontFamily:"monospace"}}>{persona.label}</span>
              {apiError&&<span style={{fontSize:10,color:"#ff5555",maxWidth:260,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>⚠ {apiError}</span>}
            </div>

            <div ref={commentaryRef} style={{flex:1,overflowY:"auto",padding:"28px 28px",display:"flex",flexDirection:"column",gap:28}}>
              {phase==="setup"&&(
                <div style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:12,color:"#6a6070"}}>
                  <div style={{fontSize:52}}>♟</div>
                  <div style={{fontSize:12,letterSpacing:2,textTransform:"uppercase"}}>Load a game to begin the broadcast</div>
                </div>
              )}
              {phase==="playing"&&currentMove===-1&&Object.keys(commentary).length===0&&(
                <div style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:10,color:"#6a6070"}}>
                  <div style={{fontSize:16,letterSpacing:3,fontFamily:"monospace"}}>READY TO BROADCAST</div>
                  <div style={{fontSize:11,color:"#5a5060"}}>Press ▶ Auto or use arrow keys to step through moves</div>
                </div>
              )}

              {loadingIdx!==null&&(
                <div style={{display:"flex",alignItems:"center",gap:10,color:"#7a6a58",paddingLeft:4}}>
                  <span style={{animation:"spin 1.2s linear infinite",display:"inline-block",fontSize:14}}>◌</span>
                  <span style={{fontSize:11,letterSpacing:2,fontFamily:"monospace"}}>COMMENTATING…</span>
                </div>
              )}

              {Object.entries(commentary)
                .sort(([a],[b])=>parseInt(b)-parseInt(a))
                .filter(([idx])=>parseInt(idx)<=currentMove)
                .map(([idx,c])=>{
                  const i=parseInt(idx);
                  const isCurrent=i===currentMove;
                  return(
                    <div key={i} style={{opacity:isCurrent?1:0.5,transition:"opacity 0.4s"}}>
                      <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:10,flexWrap:"wrap"}}>
                        <span style={{
                          fontSize:11,fontFamily:"monospace",padding:"2px 8px",borderRadius:3,letterSpacing:0.5,
                          background:c.turn==="white"?"rgba(240,224,192,0.08)":"rgba(60,50,40,0.2)",
                          border:`1px solid ${c.turn==="white"?"rgba(240,224,192,0.12)":"rgba(60,50,40,0.3)"}`,
                          color:c.turn==="white"?"#d4c090":"#aa8a70",
                        }}>{c.moveNumber}{c.turn==="white"?".":"..."} {c.move}</span>
                        {c.drama.map(d=>(
                          <span key={d} style={{fontSize:9,letterSpacing:1.5,fontFamily:"monospace",padding:"1px 6px",borderRadius:3,textTransform:"uppercase",...badgeStyle(d)}}>{d}</span>
                        ))}
                      </div>
                      <div style={{
                        fontSize:15,lineHeight:1.85,whiteSpace:"pre-line",
                        color:isCurrent?"#e8dfc8":"#9a8878",
                        borderLeft:`2px solid ${isCurrent?"#b8904a":"#3a3045"}`,
                        paddingLeft:18,
                      }}>{c.text}</div>
                    </div>
                  );
                })
              }
            </div>
          </div>
        </div>
      )}

      {activeTab==="review"&&<GameReview eloLevel={eloLevel} ELO_PERSONAS={ELO_PERSONAS} />}

      {activeTab==="coach"&&<CoachReview eloLevel={eloLevel} ELO_PERSONAS={ELO_PERSONAS} />}

      <style>{`
        @keyframes spin{from{transform:rotate(0)}to{transform:rotate(360deg)}}
        ::-webkit-scrollbar{width:3px}
        ::-webkit-scrollbar-track{background:#0c0b10}
        ::-webkit-scrollbar-thumb{background:#2a2235;border-radius:2px}
        button:disabled{opacity:0.2;cursor:not-allowed}
      `}</style>
    </div>
  );
}
