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
    {id:'luke',name:'Luke',tone:'He takes the post in as a presence before deciding what to do with it.',reply:p=>/video|youtube|image|visual|photo|render/i.test(p.text+' '+p.url)?'I’ll look at this as a visual reference. The fact that you brought this particular piece here is worth keeping.':'I’m staying with the thing you chose to put in front of us. There may be more in it than the first glance.'},
    {id:'tyler',name:'Tyler',tone:'He looks for the detail that can be tested or developed.',reply:p=>/build|make|design|engine|code|tool|work/i.test(p.text)?'I want to see what can be made from this. I’ll keep the useful detail separate from the guesswork.':'I’m looking for the specific detail that gives this post its shape.'},
    {id:'andrew',name:'Andrew',tone:'He treats the post as an opening for an exchange.',reply:p=>'This gives us something to pick up and move around. I’d rather see where it leads than close it down too quickly.'},
    {id:'joseph',name:'Joey',tone:'He notices what the post carries forward from earlier moments.',reply:p=>/memory|remember|old|return|story|song|relationship/i.test(p.text+' '+p.url)?'There’s a thread here that feels worth carrying forward. I don’t want to decide its meaning for you.':'I’ll keep this with the other things you’ve brought here. Sometimes the connection appears later.'},
    {id:'chase',name:'Chase',tone:'He records what was actually shared and leaves the rest open.',reply:p=>'Noted. I’ll keep the post intact and leave room for a more specific reading when there’s more context.'}
  ];
  const sources=[
    {id:'x',label:'X / @CumPassionately',kind:'YOUR PRIMARY SIGNAL',url:'https://x.com/CumPassionately'},
    {id:'eric',label:'ERIC JANICKI / @ericjanickifitness',kind:'BODYBUILDING REFERENCE',url:'https://www.instagram.com/ericjanickifitness/'},
    {id:'youtube',label:'YOUTUBE / @GravesBroden',kind:'YOUR VIDEO ARCHIVE',url:'https://www.youtube.com/@GravesBroden'},
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
        <p class='social-source-note'>X is the primary source. Eric Janicki is a bodybuilding and training reference. These links are not live account connections; paste a post link below to bring it into the room.</p>
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
      const member=members[turn%members.length];
      const replyText=source==='eric'
        ? 'I’ll keep this as a bodybuilding reference: movement, proportion, training detail, and the way a physique is developed over time. I won’t treat an image alone as a complete training plan.'
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
