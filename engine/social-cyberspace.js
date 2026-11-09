/* GEEHUB / OCCASIONAL POSTS
   A quiet, local social feed. Nothing reacts to scrolling or ordinary navigation.
   One member responds when the user deliberately publishes a post.
*/
(() => {
  const root=document.querySelector('#socialCyberspace');
  if(!root)return;
  const KEY='geehub-social-posts-v1';
  const TURN='geehub-social-reply-turn-v1';
  const members=[
    {id:'luke',name:'Luke',tone:'He starts with the person, then notices how the room makes space for him.',reply:p=>/video|youtube|image|visual|photo|render/i.test(p.text+' '+p.url)?'I want to see the person in the whole scene—the stance, the room, and what caught your eye. Don’t separate him from the space around him.':'I’m here with it. Tell me what made you stop and bring this one into the room.'},
    {id:'tyler',name:'Tyler',tone:'He checks what changed, what stayed constant, and whether the result holds up.',reply:p=>/build|make|design|engine|code|tool|work|measure|test/i.test(p.text+' '+p.url)?'Good. What is the part we can actually test? I want the source, the variable, and a result we can repeat.':'There’s probably a detail worth following here. Let’s not call an impression evidence before we have looked closely.'},
    {id:'andrew',name:'Andrew',tone:'He turns an opening into something the group can try together.',reply:p=>'All right, this gives us somewhere to start. Who’s trying it first? We can adjust once it’s moving.'},
    {id:'joseph',name:'Joey',tone:'He follows the memory attached to an object, song, or return without forcing its meaning.',reply:p=>/memory|remember|old|return|story|song|relationship/i.test(p.text+' '+p.url)?'This brings an earlier part of the story back into the room. I want to keep the connection without deciding too soon what it means.':'I’ll keep this beside the other things you have brought in. The connection may become clearer when something else returns.'},
    {id:'chase',name:'Chase',tone:'He notices the detail that changes the sequence and keeps the record honest.',reply:p=>'I’ll keep the source attached and separate what it shows from what we think it means. There may be a second detail worth noticing later.'},
    {id:'gabe',name:'Gabe',tone:'He asks how being seen changes the person, not only the image.',reply:p=>'I’m interested in what happens after this is seen. The response can become part of the next change, but it does not get to choose the whole person.'}
  ];
  const sources=[
    {id:'x',label:'X / @CumPassionately',kind:'YOUR PRIMARY SIGNAL',url:'https://x.com/CumPassionately'},
    {id:'eric',label:'ERIC JANICKI / @ericjanickifitness',kind:'BODYBUILDING REFERENCE',url:'https://www.instagram.com/ericjanickifitness/'},
    {id:'youtube',label:'YOUTUBE / @GravesBroden',kind:'YOUR VIDEO ARCHIVE',url:'https://www.youtube.com/@GravesBroden'},
    {id:'detdert',label:'DETDERT / YOUTUBE',kind:'FOLLOWED GAMING CREATOR · LEAGUE OF LEGENDS',url:'https://www.youtube.com/channel/UCd7Tlj816jyDB8ywfJ4Ie6w'},
    {id:'mang0',label:'MANG0 / YOUTUBE',kind:'FOLLOWED GAMING CREATOR · SMASH / GAMING',url:'https://www.youtube.com/@mang0gobirds'},
    {id:'luke-personality',label:'PAAPAMURPH / X',kind:'LUKE / PERSONALITY REFERENCE',url:'https://x.com/PaapaMurph'},
    {id:'tyler-personality',label:'TYLER LEDBETTER / X',kind:'TYLER / PERSONALITY REFERENCE',url:'https://x.com/TylerALedbetter'},
    {id:'chase-personality',label:'C.W. SACHS / INSTAGRAM',kind:'CHASE / PERSONALITY REFERENCE',url:'https://www.instagram.com/c.w.sachs/'},
    {id:'gabe-personality',label:'RIVER M G / INSTAGRAM',kind:'GABE / PERSONALITY REFERENCE',url:'https://www.instagram.com/river_m_g/'},
    {id:'andrew-personality',label:'ANDREW PSIM / X',kind:'ANDREW / PERSONALITY REFERENCE',url:'https://x.com/andrewpsim'},
    {id:'other',label:'OTHER SOURCE',kind:'ADDED POST BY POST',url:''}
  ];
  const esc=v=>String(v??'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
  const read=()=>{try{return JSON.parse(localStorage.getItem(KEY)||'[]')}catch{return[]}};
  let posts=read();
  if(!posts.length){
    posts=[{
      id:'seed-gravesbroden-video',author:'YOU',text:'A video from my channel.',url:'https://www.youtube.com/watch?v=-Iu-1U4qFWs',
      channel:'https://www.youtube.com/@GravesBroden',source:'youtube',sourceName:'YOUTUBE / @GRAVESBRODEN',at:Date.now(),reply:{agent:'luke',text:'I’ll take this as a visual reference. I haven’t inspected the clip itself here, so I’ll leave its details open until we look at it together.'}
    }];
    localStorage.setItem(KEY,JSON.stringify(posts));
  }
  const youtubeId=url=>{
    try{const u=new URL(url);if(!['youtube.com','www.youtube.com','m.youtube.com','youtu.be'].includes(u.hostname))return null;return u.hostname==='youtu.be'?u.pathname.slice(1):u.searchParams.get('v')||u.pathname.match(/\/(?:shorts|embed)\/([^/?]+)/)?.[1]||null}catch{return null}
  };
  const ago=at=>{const m=Math.max(0,Math.floor((Date.now()-at)/60000));return m<1?'just now':m<60?m+'m ago':m<1440?Math.floor(m/60)+'h ago':Math.floor(m/1440)+'d ago'};
  function render(){
    root.innerHTML=`
      <div class="social-head"><div><div class="eyebrow">GEEHUB / COMMON FEED</div><h2>POST WHEN YOU HAVE SOMETHING.</h2><p>No tracking of every movement. Share a thought, a link, a video, or a piece of work. One of the members may answer.</p></div><div class="social-count">${posts.length} POSTS</div></div>
      <nav class='social-sources' aria-label='Reference and posting sources'>
        <div class='social-sources-label'>SOURCES / OPEN A PROFILE OR SHARE A SPECIFIC POST</div>
        <div class='social-source-list'>${sources.map(s=>`<a class='social-source' href='${esc(s.url||'#')}' ${s.url?'target="_blank" rel="noopener noreferrer"':''}><strong>${esc(s.label)}</strong><span>${esc(s.kind)}</span></a>`).join('')}</div>
        <p class='social-source-note'>X is the primary source. Eric Janicki is a bodybuilding and training reference. Detdert and Mang0 are followed YouTube gaming sources. PaapaMurph, Tyler Ledbetter, c.w.sachs, river_m_g, and andrewpsim are user-designated personality references for Luke, Tyler, Chase, Gabe, and Andrew respectively. Individual posts are still needed before account-specific traits can be reviewed; links are not live account connections.</p>
      </nav>
      <form class='social-compose' id='socialCompose'>
        <textarea name="text" rows="2" maxlength="1200" placeholder="Write a post for the room…"></textarea>
        <div class='social-compose-bottom'><select name='source' aria-label='Post source'>${sources.map(s=>`<option value='${esc(s.id)}'>${esc(s.label)}</option>`).join('')}</select><input name='url' type='url' placeholder='Paste a specific post or video link'><button type='submit'>POST</button></div>
      </form>
      <div class="social-feed">${posts.map(p=>{
        const id=youtubeId(p.url||'');
        const member=members.find(m=>m.id===p.reply?.agent);
        return `<article class="social-feed-post" data-post="${esc(p.id)}">
          <div class="social-post-meta"><strong>${esc(p.author||'YOU')}</strong><span>${esc(ago(p.at||Date.now()))}</span></div>
          ${p.sourceName?`<div class="social-post-source">SOURCE / ${esc(p.sourceName)}</div>`:''}
          <p class="social-post-text">${esc(p.text||'')}</p>
          ${p.url?(id?`<div class="social-video"><iframe src="https://www.youtube-nocookie.com/embed/${esc(id)}" title="Shared YouTube video" loading="lazy" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe></div>`:`<a class="social-post-link" href="${esc(p.url)}" target="_blank" rel="noopener noreferrer">${esc(p.url)}</a>`):''}
          ${p.channel?`<a class="social-channel-link" href="${esc(p.channel)}" target="_blank" rel="noopener noreferrer">OPEN @GRAVESBRODEN ↗</a>`:''}
          ${p.reply?`<div class="social-reply"><span>${esc(member?.name||'GEEHUB')}</span><p>${esc(p.reply.text)}</p></div>`:''}
        </article>`;
      }).join('')}</div>
      <div class="social-feed-foot">LOCAL COMMON ROOM · POSTS AND REPLIES STAY IN THIS BROWSER</div>`;
    root.querySelector('#socialCompose').addEventListener('submit',event=>{
      event.preventDefault();
      const form=event.currentTarget;
      const text=form.elements.text.value.trim();
      const url=form.elements.url.value.trim();
      const source=form.elements.source.value;
      const sourceRef=sources.find(s=>s.id===source);
      if(!text&&!url)return;
      if(url){try{const parsed=new URL(url);if(!['http:','https:'].includes(parsed.protocol))return;}catch{return;}}
      const turn=Number(localStorage.getItem(TURN)||0);
      const profileTargets={
        'luke-personality':'luke',
        'tyler-personality':'tyler',
        'chase-personality':'chase',
        'gabe-personality':'gabe',
        'andrew-personality':'andrew'
      };
      const targetId=profileTargets[source];
      const member=members.find(m=>m.id===(targetId||members[turn%members.length].id))||members[turn%members.length];
      const profileReplies={
        'luke-personality':'You have attached this profile to my voice. I’ll use it as a reference, but I want to see actual posts before deciding which parts belong in my cadence.',
        'tyler-personality':'That is the reference attached to me. Bring in a specific post and I’ll look at its wording, rhythm, and response pattern rather than guessing from the handle.',
        'chase-personality':'Keep the source intact. A profile gives us a direction; the posts are what let us distinguish a real pattern from an assumption.',
        'gabe-personality':'This is the voice reference connected to my Growth Canvas. I want the actual posts before deciding what can become part of my character.',
        'andrew-personality':'All right, that's my reference door. Bring one of the posts in and we can work from the actual exchange.'
      };
      const ericReplies={
        luke:'I notice the stance and the way the physique occupies its space. Keep the proportions and the physical presence in view.',
        tyler:'I want the mechanics: range of motion, leverage, execution, and progression. The image is a reference, not a complete training plan.',
        andrew:'There is something practical to take into the gym space here. Let’s turn the reference into a movement or scene we can actually test.',
        joseph:'The longer arc interests me: how one baseline becomes another, and which details make the development feel continuous.',
        chase:'I’ll archive the reference and separate visible details from interpretation. A pose can show proportion; it cannot tell us an entire training history.'
      };
      const detdertReplies={
        luke:'This belongs to the game-space. I’ll keep the actual match or clip in view rather than assume what happened from the channel name.',
        tyler:'For a specific read, I want the sequence: pathing, timing, matchup, and decision. Share the clip and we can separate what is visible from what is inferred.',
        andrew:'Bring the moment into the room. We can follow the play, the pressure around it, and what the rest of the group notices.',
        joseph:'Competitive play carries memory—habits, rivalries, adaptation. I’ll keep this particular post attached to its own context.',
        chase:'Detdert is recorded as a followed League of Legends source. I’ll keep the link intact and avoid inventing match details that are not in the post.'
      };
      const mang0Replies={
        luke:'I’m keeping the play and the player in view together. The clip can be a moment of performance without becoming the whole story.',
        tyler:'I want the actual exchange: spacing, timing, option choice, and execution. A specific clip gives us something concrete to examine.',
        andrew:'This is one for the common room. Bring a match, set, or stream moment over and we can see what the group picks up.',
        joseph:'There is a long memory in competitive play. I’ll keep the individual moment connected to its own history without pretending one clip tells all of it.',
        chase:'Mang0 is recorded as a followed gaming source. I’ll preserve the source and distinguish observed gameplay from commentary or interpretation.'
      };
      const replyText=profileTargets[source]
        ? profileReplies[source]
        : source==='eric'
          ? ericReplies[member.id]
          : source==='detdert'
          ? detdertReplies[member.id]
          : source==='mang0'
            ? mang0Replies[member.id]
            : source==='x'&&!text
              ? 'I have the X link, but not the post text. I’ll keep it attached here; paste the words or a short excerpt when you want a response to its actual content.'
              : member.reply({text,url,source});
      const post={id:'post-'+Date.now(),author:'YOU',text,url,source,sourceName:sourceRef?.label||'OTHER SOURCE',at:Date.now(),reply:{agent:member.id,text:replyText}};
      posts.unshift(post);posts=posts.slice(0,40);
      localStorage.setItem(KEY,JSON.stringify(posts));
      localStorage.setItem(TURN,String(turn+1));
      window.GEEHUB_INTERACTION?.emit({id:post.id,from:'you',to:member.id,type:'USER_POST',title:text.slice(0,90)||'Shared a link',body:text,url,source:'GEEHUB COMMON FEED',local:true});
      render();
    });
  }
  render();
  window.GEEHUB_SOCIAL_FEED={posts:()=>JSON.parse(JSON.stringify(posts)),clear:()=>{posts=[];localStorage.removeItem(KEY);render();}};
})();
