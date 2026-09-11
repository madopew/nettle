# Nettle — Design Spec

Date: 2026-09-11
Status: approved, ready for implementation planning

## 1. Purpose

Nettle settles poker debt. A group plays a cash game, people buy in and rebuy,
the game ends, everyone counts their stack, and the app says who pays whom using
the fewest possible payments.

The name is net + settle.

That is the entire goal. The app does not track hands, pots, blinds, or cards.

## 2. Scope

In scope for this version:

- Start a game with a named list of players, optionally including a dealer.
- Record an initial buy-in per player and any number of rebuys during the game.
- Add a player who joins after the game has started.
- Let a player cash out early, locking their result and stopping further rebuys.
- Record every participant's final stack at the end of the game.
- Refuse to settle while the books do not balance, showing the exact gap.
- Compute the provably minimal set of payments and display them.
- Copy or share the result as plain text.
- Survive refresh, phone lock and browser restart.
- Work offline after first load, installable to the home screen.

Explicitly out of scope:

- Per-hand or per-pot tracking.
- Multi-device sync, accounts, or any server.
- Game history or a saved roster of regular players.
- Automatic time-based freezing of players.
- Per-entry timestamps in the interface.

## 3. Decisions already settled

These were decided during brainstorming and are not open questions.

| Topic | Decision |
|---|---|
| Dealer tips | Tipped in chips during play. Dealer is a participant with zero buy-in whose final count is the tip pile. |
| Early exit | Result is recorded and locked. Everyone still settles together at the end. |
| Late joiners | Allowed. A player can be added mid-game with their own initial buy-in. |
| Units | Real money only. No chip denominations, no conversion rate. |
| Books not balancing | Block settlement entirely and show the gap. No escape hatch. |
| Persistence | Exactly one game, persisted, resumable. Starting a new game replaces it. No history, no roster. |
| Devices | One host device. Results shared out as text at the end. |
| Language | Russian interface. |
| Money format | Whole tenge, thousands separated by spaces, `₸` suffix. |
| Delivery | Hosted static site, installable, fully offline capable. |
| Framework | React with TypeScript, built by Vite, styled with Tailwind. |
| State management | A single reducer plus context. No state library. |

## 4. Domain model

One game object, held in memory and mirrored to local storage.

```
Game
  id            string
  createdAt     number        epoch ms
  schemaVersion number
  status        "active" | "counting" | "settled"
  participants  Participant[]
  settlement    Settlement | null    frozen once computed

Participant
  id       string
  name     string
  role     "player" | "dealer"
  buyIns   BuyIn[]              always empty for the dealer
  cashOut  number | null        null until entered
  leftAt   number | null        set only when cashing out early

BuyIn
  id      string
  amount  number    integer tenge, positive
  at      number    epoch ms, used for ordering only

Settlement
  transfers   Transfer[]
  computedAt  number
  exact       boolean    false if the greedy fallback was used

Transfer
  fromId  string
  toId    string
  amount  number
```

Derived values are never stored:

- `totalIn(participant)` is the sum of their buy-in amounts.
- `net(participant)` is `(cashOut ?? 0) - totalIn(participant)`.
- `potInPlay(game)` is the sum of `totalIn` across all participants.
- `gap(game)` is the sum of `net` across all participants.

All money is an integer number of tenge. No floating point arithmetic anywhere.

## 5. Settlement engine

The engine is a pure function from a list of nets to a list of transfers. It has
no knowledge of React, storage, or the interface.

### 5.1 Preconditions

- Every net is an integer.
- The nets sum to exactly zero. The caller enforces this; the engine asserts it.
- Participants with a net of zero are dropped before solving.

### 5.2 Definition of optimal

Minimal means the smallest possible number of transfers.

Partition the participants into groups whose nets each cancel to zero. A group of
`k` members can always be settled in exactly `k - 1` transfers, and never fewer.
So the total transfer count is `n - g`, where `n` is the number of participants
with a non-zero net and `g` is the number of groups. Minimising transfers is
therefore exactly maximising the number of zero-sum groups.

### 5.3 Algorithm

1. Drop zero nets.
2. Enumerate every subset of the remaining participants and record which ones sum
   to zero.
3. Run a bitmask dynamic program over subsets to find the partition into the
   greatest number of zero-sum groups.
4. Within each group, repeatedly pay from the largest debtor to the largest
   creditor for the smaller of the two absolute amounts. Each payment zeroes at
   least one participant, so a group of `k` members produces exactly `k - 1`
   payments.
5. Sort the resulting transfers by amount, descending, for display.

Step 3 is exponential. With at most sixteen participants it completes in
milliseconds, which comfortably covers any poker table. Above sixteen the engine
skips steps 2 and 3, settles the whole set with step 4 alone, and reports
`exact: false` so the interface can say the result is good but not proven
minimal.

### 5.4 Invariants

The engine guarantees all of the following, and tests assert them:

1. For every participant, the sum of money received minus money sent equals their
   net exactly.
2. No participant both sends and receives money.
3. No participant sends more in total than they lost.
4. Every transfer amount is a positive integer.
5. In exact mode, the transfer count equals `n - g` for the maximal `g`. In
   fallback mode, only invariants 1 to 4 are guaranteed, plus a count of at most
   `n - 1`.

### 5.5 Tie-breaking

Where several minimal solutions exist, the engine is deterministic. Groups are
emitted in order of their lowest participant index, and within a group the
largest-debtor-to-largest-creditor rule is applied with participant index as the
tiebreak. The same input always produces the same output.

## 6. Interface

Phone-first, single column, primary actions within thumb reach. Four screens plus
one sheet. All copy in Russian.

### 6.1 Старт

With no saved game: a single primary button starts one. Player names are added to
a list, each with an initial buy-in. A toggle adds a dealer, who appears as a row
with no buy-in field.

With a saved game this screen is skipped entirely. The app opens straight onto
wherever the game was left: an active game onto `Игра`, a counting game onto
`Подсчёт` with the stacks already typed, and a settled game onto `Расчёт`
showing its frozen result. `Игра` carries the elapsed time in its header, so
resuming needs no separate card.

Rules:

- A game needs at least two players to start.
- Names must be unique within a game. Duplicates are rejected inline.
- At most one dealer.

### 6.2 Игра

The live table.

- A header strip shows total money in play.
- One row per player: name, total bought in, and a plus button.
- The plus button opens a numeric pad for a rebuy, with quick-pick amounts above
  it. Those are the distinct amounts already used in this game, most frequent
  first. Before any rebuy exists they are the distinct initial buy-ins.
- The dealer's row shows tips collected so far, or nothing if none yet.
- Each player row offers `Вышел из игры`. This prompts for their final stack,
  then locks the row, greys it out, and removes the rebuy button. Undoing it
  clears their recorded final stack and their exit marker, which re-enables
  rebuys. The dealer has no such action, because the dealer never leaves the
  table before the game ends.
- A secondary action adds a latecomer. It asks for a name and an initial buy-in
  and appends them to the table. From that moment they behave like any other
  player, with rebuys and an early exit of their own. Name uniqueness is enforced
  as it is at the start.
- The same action adds a dealer if the game started without one. Still at most
  one dealer, and still with no buy-in.
- One primary button at the bottom ends the game.

A latecomer needs no special handling in the settlement math. Their net is their
final stack minus what they bought in, exactly like everyone else, so the books
balance whether they sat down at the first hand or the fortieth.

### 6.3 Подсчёт

One field per participant for their final stack. Anyone who left early is
pre-filled and locked, with an unlock affordance for a miscount.

A sticky bottom bar is the centre of this screen. It shows the running gap:

- Negative gap: `Не хватает 5 000 ₸`
- Positive gap: `Лишние 2 000 ₸`
- Zero: `Сходится`, in green

The settle button is disabled until two conditions both hold. Every participant
has a final stack entered, and the gap is zero. The second alone is not enough,
because a dealer who was never tipped has a net of zero whether or not anyone
typed their number. There is no override for either condition.

An empty field and a field holding zero are different states. Un-entered fields
count as zero while the gap is being computed, so the gap starts negative and
closes as people report their stacks.

### 6.4 Расчёт

- The payment list, largest amount first. Each line names payer, receiver and
  amount.
- Below it, a per-person summary of net win or loss.
- A copy button places a plain-text version on the clipboard.
- A share button uses the native share sheet where the browser exposes one, and
  is hidden otherwise.
- Starting a new game from here asks for confirmation, since it erases this one.

### 6.5 Player sheet

Tapping any name opens a sheet with that participant's buy-in history as a list.
Each entry can be edited or deleted. The name can be corrected. This is the undo
path for a mistyped rebuy.

The sheet also removes the participant from the game, but only once they have no
buy-ins left. That keeps the books intact and makes the recovery from a
mistakenly added player explicit: delete their entries, then remove them.

### 6.6 Input rules

- Amount fields accept digits only. The numeric pad shows the running value with
  grouped thousands. The final-stack fields on `Подсчёт` are plain numeric
  inputs without grouping, because regrouping under a moving caret is a
  well-known source of input bugs and buys little at four or five digits.
- Amounts must be positive integers. Zero and negative values are rejected.
- A final stack of zero is valid and common. It is distinct from "not entered".

## 7. Persistence

- A single local storage key holds the serialised game.
- The key is written on every state change. The payload is a few kilobytes, so no
  debouncing and no IndexedDB.
- `schemaVersion` accompanies every write so a future shape change can migrate.
- Reads are defensive. A malformed or unreadable payload produces a recoverable
  message offering to discard it, never a blank screen.
- A settled game stays in storage until a new game replaces it, so the result can
  be reopened the next morning.
- The stored settlement is frozen at the moment it was computed. Reopening a
  settled game shows the payments people saw at the table, not a recomputation.

## 8. Testing

Test-first for the engine. It carries all the real logic.

Engine unit tests:

- The worked example from brainstorming, including the dealer.
- A table where two disjoint pairs cancel, proving the partition finds both.
- Participants who broke exactly even, proving they are dropped.
- A single loser paying a single winner.
- A table of one participant with a zero net.
- The greedy fallback above the exact-solver threshold.

Engine property tests over randomly generated balanced tables, asserting each of
the five invariants in section 5.4.

Component tests for the balance gate on `Подсчёт`. A bug there is the one that
sends people home with wrong numbers. Cover: gap displayed correctly in both
directions, settle disabled while non-zero, enabled at zero.

Persistence tests: round-trip a game, and recover from a corrupted payload.

The remaining interface is thin enough to verify by hand.

## 9. Delivery

- Static build, no server, no runtime network calls.
- Deployed to GitHub Pages from a build workflow, with the base path configured
  for a project subpath.
- A service worker precaches the application shell and assets so it opens with no
  connection after the first load.
- Web app manifest with an icon and the name Nettle, installable to the home
  screen.

## 10. Deferred

Recorded so they are not rediscovered as surprises:

- Game history and statistics across sessions.
- A saved roster of regular players.
- Chip denominations with a chips-to-money rate.
- Per-hand tracking.
- Multi-device sync.
- Per-entry timestamps in the interface. The data is already stored.
- Additional currencies and languages.
