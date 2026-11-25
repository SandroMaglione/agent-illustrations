# For the next agent

Read [`README.md`](README.md) first. Do not start with a figure.

## Tests, smallest first
Each can fail, and says which of the three causes it is about. Judge them blind: fresh agent, names removed, one known good and one known bad mixed in. If it cannot sort those two, its verdict does not count. Then the client.

| # | Test | Passes when | Says |
|---|---|---|---|
| 1 | **Copy.** Redraw one hand and one eye of a supplied line art (`public/tape.png`) with the agent's own tools, looking at it | shown beside the original at 300%, a critic cannot name the copy twice out of three | execution, alone |
| 2 | **Finish.** Erase one area of a finished line art (a sleeve, a lock, the folds of a trouser leg) and fill it | it is not picked as the repaired one | execution and a small decision, everything round it right |
| 3 | **Choose.** Six designs for one empty area as thumbnails; the agent ranks them, the client ranks them blind | the top of both lists agrees, three areas out of four | taste, alone, nothing to draw |
| 4 | **Judge.** Sort the line arts and renders in the log into approved and rejected | all of them, and it names where | feedback, alone |
| 5 | **Vary.** Redesign one worn thing on a finished drawing (a jacket, a bag) in the same pose | better or equal to the original for a blind critic and the client | decision |
| 6 | **One head**, from a brief | stands beside the head of `public/tape.png` | all of it, small |
| 7 | **One figure**, from a brief | stands beside `visor` and `maren` after rendering | all of it |

Stop at the first one that fails, and work there. Nobody has run 1 to 3: the attempts started at 6 and 7.

## Critic's brief
What was used for the comparison in the log. Change it when it misses.

> You are an experienced game splash-art director. Three targets are the quality bar; the candidates are unordered and of unknown origin, do not assume any is good or bad. Score each 0 to 10 for standing beside the targets, and rank. Pass or fail as a piece you would show a client. For each, what makes or breaks it, split strictly into drawing (pose, anatomy, shapes, hands, hair, costume), line, rendering, and density (how much there is to look at, big empty areas); the single biggest cause, with its place. The one pattern that separates better from worse. For the worst two, could better colouring alone rescue them?

For line art alone, ask also: how generic is it, apart from skill, and what tells you.

## Ideas not tried

| Idea | Smallest test | Wrong if |
|---|---|---|
| Open tapered strokes that end at a crease, with a 400% view and numbered curve handles to nudge; one piece, five rounds | one head and collar, against `public/tape.png` | after five rounds eye, jaw, hair and rhythm still look typed |
| A real anime-proportioned rig with finger bones, posed as an illustrator's 3D doll; project the points, draw stylised 2D over them | one hand round a bow grip, with the forearm | it reads as traced 3D, or posing each grip becomes its own whack-a-mole |
| Stylised line art made in 3D: sculpted model, line modifier, weights painted by vertex | one ready-made open head, exported as vectors, no redrawing | it reads as a toon shader at 1× |
| Trace of a person's line art, then edit in small steps, keeping every line not touched | test 2 | the edit shows |
| A library of drawn pieces (hands, folds, hair clumps) from line art the owner has, fitted and bent into place | one hand onto a supplied figure | it needs a new piece each time |
| A model made for line art, or vector output, instead of a language model typing points | test 1 | fails as typed points do |

The first three come from the other thread's closing list (Gemini 4 Neon), with its tests.

## Do not repeat
- A whole figure before one piece has passed.
- Typing outlines for a figure at 1×.
- Closed white shapes as the line.
- Capsule mannequins.
- Generated images or reference boards, unless the client asks again.
- A better way of extracting lines when the sketch does not define the shape. Three methods in a row went there.
- Guessing a shape: ask.
- Ink share, stroke widths, closed outlines or value gates as proof of quality.
- Letting the maker be the judge, or telling the judge what was meant.
- Saying it works before someone else said so.
- A new method after one rejection without naming which of the three causes broke.
