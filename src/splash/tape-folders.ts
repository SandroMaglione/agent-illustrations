import type { Folders } from "./engine.ts"

/** The folders of the layered file for the headphones line art, furthest first (`src/layers/arrange.ts`). */
export const FOLDERS: Folders = [
  ["Hair back", "hairB", "fine"], ["Skin", "neck armL armR"], ["Trousers", "pants pocket tabP"], ["Belt", "belt loopB beltT"], ["Top", "top turtle trimT"], ["Jacket", "lining jackL jackR trimL trimR flap tab cuffL cuffR"], ["Strap", "strap"],
  ["Player", "dev devF devP devW devH lug cass reel btn knob"], ["Buckles and snaps", "buckS clipS buckle snap"], ["Ear", "ear", "fine"], ["Face", "face", "fine"], ["Hair front/Side left", "hairF:sideL", "fine"], ["Hair front/Side right", "hairF:sideR", "fine"], ["Hair front/Fringe", "hairF", "fine"], ["Hair front/Ahoge", "hairF:ahoge", "fine"], ["Earrings", "earr"], ["Headphones", "band hinge pad cup disc"], ["Hands", "handL handR"],
]
/** The front hair in groups: "x,y" points and whole lines ("s17", "-s17" backwards). What is in none of them stays hairF. */
export const SPLITS: Readonly<Record<string, ReadonlyArray<readonly [string, string]>>> = {
  hairF: [
    ["ahoge", "360,62 384,30 440,4 530,2 552,30 541,57 523,52 514,35 494,22 452,20 404,42"],
    ["sideL", "523,52 513,100 s17 285,384 298,316 321,272 326,293 340,317 352,319 372,346 388,366 386,384 345,430 330,480 60,480 60,150 300,40 440,20"],
    ["sideR", "560,240 700,200 700,480 540,480 540,330 556,312"],
  ],
}
