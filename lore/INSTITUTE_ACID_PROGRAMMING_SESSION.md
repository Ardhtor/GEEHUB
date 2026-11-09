# The Institute — The Night They Wrote From Their Own Ends

The idea began at the end of supper, when the conversation had drifted away from training and into the strange problem of making the Institute remember itself. Four men had gathered at the end of the long table with their laptops open. A fifth was drawing boxes on the back of a menu. They had been trying to connect the gymnasium's training records to the residential calendar, but every version of the system seemed to flatten the men into entries: a name, a date, a measurement, a completed session. The records could say what had happened. They could not say what it had meant to the person who had lived through it.

They had decided to take the evening away from ordinary work. They were adults, close friends, and had made their own decision to spend the night with a psychedelic experience. Nobody was being tested, persuaded, or asked to perform. They had arranged for a trusted sober friend to remain with them, cleared the evening, and agreed that the work could be abandoned at any moment. Their laptops were tools on the table, not obligations. The point was not to force a revelation out of the night. They wanted to see what ideas appeared when they stopped insisting that every person should describe the same event in the same language.

The room was the smaller programming studio above the library. Its windows looked across the dark courtyard towards the gymnasium. There were cushions along one wall, water and food on a sideboard, a lamp with a warm shade, and enough clear floor that nobody had to remain at a desk. The sober friend kept the room quiet and ordinary. He did not interpret what anyone said. If one of them wanted to stop, the session would stop.

As the evening unfolded, the familiar room became unusually vivid. The grain of the oak table seemed to have a geography of its own. The cursor blinked with a peculiar insistence. A low sound from the ventilation seemed to have a rhythm, and the men began noticing that they were approaching the same problem from entirely different directions. They laughed often, sometimes because a sentence had become unexpectedly funny, sometimes because one of them had finally found a way to explain an idea that had resisted him for weeks.

They did not write one shared programme. They wrote from their own ends.

Luke took the problem of action. He disliked systems that pretended to know what a person intended merely because they had recorded what he did. He opened a file and began with a distinction between an observed event and the person's own account of it. His first version was plain, almost stubbornly so:

~~~python
from dataclasses import dataclass, field
from datetime import datetime
from typing import Any

@dataclass
class Account:
    author: str
    account: str
    recorded_at: datetime = field(default_factory=datetime.now)
    details: dict[str, Any] = field(default_factory=dict)

@dataclass
class Event:
    event_id: str
    observed: dict[str, Any]
    accounts: list[Account] = field(default_factory=list)

    def add_account(self, account: Account) -> None:
        if not account.author.strip() or not account.account.strip():
            raise ValueError("An account needs an author and an account.")
        self.accounts.append(account)
~~~

He leaned back and read it again. "The system can record what it saw. It can't write the man's account for him."

Tyler had been watching the data structure rather than the screen. He wanted the records to remain connected without becoming interchangeable. His concern was versioning: if the body changed, the training plan changed; if the plan changed, the next session changed; but an earlier record should not be silently rewritten to fit the latest state. He began designing a sequence of immutable revisions.

~~~python
@dataclass(frozen=True)
class Revision:
    revision_id: str
    subject_id: str
    parent_revision: str | None
    changes: tuple[tuple[str, Any], ...]
    created_at: datetime

def append_revision(history: tuple[Revision, ...],
                    revision: Revision) -> tuple[Revision, ...]:
    known = {item.revision_id for item in history}
    if revision.revision_id in known:
        raise ValueError("Revision identifiers must be unique.")
    if revision.parent_revision is not None:
        if revision.parent_revision not in known:
            raise ValueError("Parent revision is not in this history.")
    return history + (revision,)
~~~

Tyler called it a memory that could grow without eating its past. He wanted the Institute to be able to look back and see not only the latest condition of a man, but the route by which he had arrived there.

Chase had filled the menu with arrows and small notes. He was interested in provenance: who had made a claim, which artifact supported it, what remained uncertain, and whether a later discovery had changed the interpretation. He did not want the archive to confuse a convincing story with a verified event.

~~~python
@dataclass
class Evidence:
    source_id: str
    source_type: str
    supports: tuple[str, ...]
    confidence: str
    notes: str = ""

@dataclass
class Claim:
    claim_id: str
    statement: str
    evidence: list[Evidence] = field(default_factory=list)
    status: str = "unresolved"

    def resolve(self, evidence: Evidence) -> None:
        self.evidence.append(evidence)
        if self.status == "unresolved":
            self.status = "under_review"
~~~

"Don't make the computer decide what is true because it has three files," he said. "Three files can all repeat the same mistake."

Gabe had barely touched his keyboard. He had been listening to the ventilation and watching the reflections in the dark window. When he finally began, he wrote a small system for recurring motifs. A phrase, a pose, a sound or a place could return without being forced to mean exactly what it had meant before. The programme would record the recurrence and leave interpretation open.

~~~python
@dataclass
class Motif:
    motif_id: str
    form: str
    appearances: list[dict[str, Any]] = field(default_factory=list)

    def recur(self, place: str, context: str, variation: str = "") -> None:
        self.appearances.append({
            "place": place,
            "context": context,
            "variation": variation,
            "sequence": len(self.appearances) + 1,
        })
~~~

He named the first motif "the_second_reflection". It had appeared in the gymnasium mirror, in the dark window beside the workshop, and once in the polished surface of the dining hall table. He did not claim that these were supernatural events. He wanted the archive to preserve the fact that the men had noticed them, and that the appearances had become connected in their minds.

Andrew was the last to start. He had spent much of the evening talking about the difference between a body measured at rest and a body understood in motion. A training record could preserve weight and circumference, but not the feeling of a difficult repetition, the adjustment of a stance, or the way a shirt moved when a man raised his arms. He began writing a movement record that could keep measurements alongside a first-person description.

~~~python
@dataclass
class MovementAccount:
    subject_id: str
    action: str
    measured_state: dict[str, float]
    first_person_note: str
    observed_by: str | None = None

    def summary(self) -> dict[str, Any]:
        return {
            "subject": self.subject_id,
            "action": self.action,
            "measurements": self.measured_state.copy(),
            "account": self.first_person_note,
            "observer": self.observed_by,
        }
~~~

He looked at the others. "You can measure the lift. You still need the guy who lifted it."

The room went quiet for a while. Not an empty quiet: keys clicked, the ventilation continued, and somewhere below them a door closed. Their separate programmes were beginning to resemble parts of one system. Luke had given the person an account. Tyler had given the account a history. Chase had given the history evidence and uncertainty. Gabe had given it recurrence and atmosphere. Andrew had given it a body in motion.

The sober friend brought them food and asked whether they wanted to continue. They did, but they agreed to stop making changes to the shared project that night. Their ideas would be preserved as separate experimental files and reviewed later, when they were rested and clear-headed. Nobody would merge code written in an altered state directly into the Institute's working branch. That decision became part of the session's record rather than an interruption of it.

They made one final document together, a small contract for the system they wanted to build:

~~~python
@dataclass
class LivingRecord:
    event: Event
    revisions: tuple[Revision, ...] = ()
    evidence: list[Evidence] = field(default_factory=list)
    motifs: list[Motif] = field(default_factory=list)
    movement: list[MovementAccount] = field(default_factory=list)

    # No subsystem may replace a person's own account.
    # No revision may erase its parent.
    # No claim becomes fact merely through repetition.
    # No recurring motif is forced to keep one meaning.
~~~

By then the courtyard had become completely dark. Across it, the gymnasium stood closed, its high windows reflecting the studio light. The men saved their work, labelled it experimental, and left the files where they could find them in the morning. They had not solved the Institute. They had found a better way to ask what it ought to remember.

The following day, each man would read the code again. Some parts would survive unchanged. Others would be simplified, corrected, or discarded. The experience belonged to the night; the programme would have to earn its place in daylight. But the central distinction remained: the Institute could gather many accounts of one shared world without claiming that any one account contained the whole of it.
