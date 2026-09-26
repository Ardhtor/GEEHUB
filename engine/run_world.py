import json, os, datetime

ROOT=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
STATE=os.path.join(ROOT,"engine","state.json")
LORE=os.path.join(ROOT,"lore","AUTONOMOUS_STREAM.md")
NOVEL=os.path.join(ROOT,"novel","WORLDS.md")
WORLDS=["PYYRO ENERGY","POETRY SEEP","DEEP LORE","NOVEL ENGINE","VEY RTHALIS","THE COMPLEX"]
ACTORS=["LUKE","TYLER","KIRK","JOSEPH"]
VERBS=["entered","crossed","waited inside","returned to","walked beyond","stood within"]

os.makedirs(os.path.dirname(STATE),exist_ok=True)
os.makedirs(os.path.dirname(LORE),exist_ok=True)
if os.path.exists(STATE):
    with open(STATE) as f: state=json.load(f)
else:
    state={"pulse":0,"events":[]}

state["pulse"] += 1
pulse=state["pulse"]
now=datetime.datetime.now(datetime.timezone.utc).isoformat()
actor=ACTORS[(pulse-1)%len(ACTORS)]
world=WORLDS[(pulse-1)%len(WORLDS)]
verb=VERBS[(pulse-1)%len(VERBS)]
lines=[
    f"{actor} {verb} {world}.",
    "Nothing was explained.",
    "The room continued around them.",
]
event={"pulse":pulse,"time":now,"actor":actor,"world":world,"text":" ".join(lines)}
state["events"].append(event)
state["events"]=state["events"][-1000:]
with open(STATE,"w") as f: json.dump(state,f,indent=2); f.write("\\n")

if not os.path.exists(LORE):
    open(LORE,"w").write("# GEEHUB // AUTONOMOUS STREAM\\n\\nThe world engine writes here while nobody is watching.\\n")
with open(LORE,"a") as f:
    f.write(f"\\n### Pulse {pulse} — {now}\\n\\n{event['text']}\\n")

if not os.path.exists(NOVEL):
    open(NOVEL,"w").write("# WORLDS // AUTONOMOUS NOVEL MATERIAL\\n")
with open(NOVEL,"a") as f:
    f.write(f"\\n## Pulse {pulse}: {world}\\n\\n     {actor} {verb} {world}.\\n\\n     Nothing was explained.\\n\\n     The room continued around them.\\n")
