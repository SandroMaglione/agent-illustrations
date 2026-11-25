# Open drawing: what was tried, and why it fails

This repository does two very different jobs.

| | Rendering | Open drawing |
|---|---|---|
| What | colour, light, value, form and materials on line art that is finished | deciding what is there: pose, shapes, hands, hair, costume, the line itself |
| State | works; approved on two drawings, exported as layered files | does not work; eleven attempts, none approved as a drawing |
| Why | the decisions are in the line art; rules and checks do the rest | nothing decides well, and nothing notices |

This is the log for whoever tries next, with a better model or a better idea.

- [`log.md`](log.md): every attempt. what was done, the verdict, what broke first, why, what to keep
- [`next.md`](next.md): small tests for a new agent, ideas not tried, what not to repeat
- [`../../archive/drawing/`](../../archive/drawing/): the code, frozen

## What broke
Three things, usually together. None has been tested alone.

1. **Execution.** A shape that is known does not survive being typed. A copied pose (4), photo references (6), an artist's sketch (8, 10) and eyes and lips (3) were all there to look at, and the copy lost them. Typed x,y at 1× loses the small turns; closed shapes cannot interlock or fade out.
2. **Decision.** With the sketch's lines kept (11), or with fluent generated lines (7), the picture still failed: nothing to look at, or an averaged design. Where the line art is open, the agent invents, and its inventions are symbols.
3. **Feedback.** Every gate passed on every rejected drawing. They measure value, ink and closure: whether it can be coloured, not whether it is good. The maker judged its own work and saw what it meant. The client was the first real check, after everything was finished.

An earlier version of our conclusion said "decision only". The log does not support that: 3, 4, 6, 8 and 10 had decisions to follow.

## What is known

| Finding | How sure |
|---|---|
| Finished, dense, closed line art is needed: 144 and 237 closed shapes when approved, 67, 20 and 3 when not | measured, five drawings |
| It is not enough: generated line art with the ink, widths and closed outline of a supplied one was rejected | measured, one drawing |
| Rendering effort does not explain the difference: 151 and 176 shadow shapes against 134, 116 and 81 | measured |
| A blind critic agrees with the client on coloured work, five of five | measured, one run |
| A blind critic spots code drawing, and does not sort generated from supplied | measured, one run |
| The maker reports too well: 4, 5, 7, 8, 10 and 11 were all shown as better than they were | seen |
| Line weight, tapers, traps and closing are solved in code | seen, said by the client |
| Thumbnails and a silhouette check improve a pose | seen, one drawing |
| References fix what overlaps what, not how it is drawn | seen, one drawing |
| Copying and deciding fail for different reasons | guess, see test 1 |

## What the client asked for
Not the fault list, the direction, in their words:
- "Agents struggle with open canvases. Indeed, humans do as well, that's why they come up with all sort of references."
- "The goal is not perfect real world resemblance, but mostly design, white space, movement towards the focal point."
- "White space and silhouette are also really important." Pose and main details clear from it alone.
- No whack-a-mole: the workflow must not need a person to name every hand, grip and strap.
- 3D is for shading. "2d illustrations don't always match actual 3d physics and shapes, intentionally for styling reasons."
- Keep the sketch's good details; do not redraw what is already drawn.
