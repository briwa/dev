---
title: "#shuffle"
date: 2026-07-18
---

Back in 2012 or so, I had an idea for a turn-based card game, but I got stuck trying to figure out how to shuffle the cards in JavaScript. After googling around, I stumbled upon [this article from Mike Bostock](https://web.archive.org/web/20190603060230/https://bost.ocks.org/mike/shuffle/). I didn't know explaining how shuffling works could be so entertaining. The article became one of my biggest inspirations in programming, and it was probably how I got into data visualization in the first place.

This is my attempt to pay tribute to that article by explaining what happened back then and replicating what it did.

---

I was pretty new to JavaScript at the time. In my head, the logic felt straightforward: if I had a deck of cards, shuffling it meant pulling a random card from it and placing it into a new set.

```js
const cards = [...];
const shuffledCards = [];

while (shuffledCards.length !== cards.length) {
  const randomCardIdx = Math.floor(Math.random() * cards.length);
  shuffledCards.push(cards[randomCardIdx]);
}
```

Wait... I'd be adding duplicate cards that way. So instead, check if it's already there:

```js
if (!hasCard(shuffledCards, randomCardIdx)) {
  shuffledCards.push(cards[randomCardIdx]);
}
```

The code, visualized:

```sandbox=js viz=canvas code
class InefficientlyShuffleCards extends Canvas.Step {
  enter() {
    let startAt = 0;
    const seen = new Set();
    while (seen.size < this.entities.length) {
      const idx = Math.floor(Math.random() * this.entities.length);
      const entity = this.entities[idx];

      this.tween(entity, {
        startAt,
        duration: SHUFFLE_STEP_DURATION,
        from: entity,
        to: { color: TO_COLOR },
      });
      startAt += SHUFFLE_STEP_DURATION;

      this.tween(entity, {
        startAt,
        duration: SHUFFLE_STEP_DURATION,
        from: { color: TO_COLOR },
        to: { color: entity.color },
      });
      startAt += SHUFFLE_STEP_DURATION;

      if (!seen.has(idx)) {
        const newX = CENTER_X + seen.size * SPACING;
        this.tween(entity, {
          startAt,
          duration: SHUFFLE_STEP_DURATION,
          from: entity,
          to: {
            x0: newX,
            x1: entity.x1 + (newX - entity.x0),
            y0: entity.y0 + Y_SHIFT,
            y1: entity.y1 + Y_SHIFT,
          },
        });
        startAt += SHUFFLE_STEP_DURATION;

        seen.add(idx);
      }
    }

    this.duration = startAt;
  }
}

const entities = createCards();
const timeline = new Canvas.Timeline(entities, [
  new Canvas.Step({ duration: 200 }),
  new MoveAllCards({ duration: 500, offset: { x: 0, y: -Y_SHIFT } }),
  new InefficientlyShuffleCards(),
  new Canvas.Step({ duration: 1000 }),
]);

render(entities);

```

Not only does it shuffle the cards randomly, the shuffle also takes a random amount of time (lol). As seen above, it kept picking the already-shuffled cards. To avoid that, it needs to shrink the unshuffled pool after every draw, which is something I was completely oblivious to at the time.

```js
const cards = [...];
const shuffledCards = [];

let i = cards.length;
while (i) {
  const randomCardIdx = Math.floor(Math.random() * i--);
  shuffledCards.push(cards.splice(randomCardIdx, 1));
}
```


```sandbox=js viz=canvas code
class AlmostShuffleCards extends Canvas.Step {
  enter() {
    let startAt = 0;
    const list = [...BASE_CARDS];
    const at = this.entities.map(({ x0, x1, y0, y1 }) => ({ x0, x1, y0, y1 }));

    while (list.length) {
      const pick = Math.floor(Math.random() * list.length);
      const cardIdx = list[pick];
      const entity = this.entities[cardIdx];
      const from = at[cardIdx];

      this.tween(entity, {
        startAt,
        duration: SHUFFLE_STEP_DURATION,
        from: { color: DEFAULT_COLOR },
        to: { color: TO_COLOR },
      });
      startAt += SHUFFLE_STEP_DURATION;

      this.tween(entity, {
        startAt,
        duration: SHUFFLE_STEP_DURATION,
        from: { color: TO_COLOR },
        to: { color: DEFAULT_COLOR },
      });
      startAt += SHUFFLE_STEP_DURATION;

      const newX = CENTER_X + (CARDS_COUNT - list.length) * SPACING;
      this.tween(entity, {
        startAt,
        duration: SHUFFLE_STEP_DURATION,
        from,
        to: {
          x0: newX,
          x1: from.x1 + (newX - from.x0),
          y0: from.y0 + Y_SHIFT,
          y1: from.y1 + Y_SHIFT,
        },
      });

      list.splice(pick, 1);

      const splicedDeckWidth = (list.length - 1) * SPACING + CARD_WIDTH;
      const splicedCenterX = (width - splicedDeckWidth) / 2;
      list.forEach((splicedIdx, listIdx) => {
        const spliced = this.entities[splicedIdx];
        const splicedFrom = at[splicedIdx];
        const splicedX = splicedCenterX + listIdx * SPACING;
        const to = {
          x0: splicedX,
          x1: splicedFrom.x1 + (splicedX - splicedFrom.x0),
        };

        this.tween(spliced, {
          startAt,
          duration: SHUFFLE_STEP_DURATION,
          from: splicedFrom,
          to,
        });

        at[splicedIdx] = { ...splicedFrom, ...to };
      });

      startAt += SHUFFLE_STEP_DURATION;
    }

    this.duration = startAt;
  }
}

const entities = createCards();
const timeline = new Canvas.Timeline(entities, [
  new Canvas.Step({ duration: 200 }),
  new MoveAllCards({ duration: 500, offset: { x: 0, y: -Y_SHIFT } }),
  new AlmostShuffleCards(),
  new Canvas.Step({ duration: 1000 }),
]);

render(entities);

```


This felt as good as it could get: no re-picking shuffled cards and the shuffle completed in linear time. As it turns out, though, according to the article, there's an even more efficient approach: the Fisher-Yates shuffle. Instead of splicing, the chosen random card is swapped with the last unshuffled card in the deck. The pool of unshuffled cards would still "shrink" the same way, but no splicing involved. In short, an in-place shuffle.


```sandbox=js viz=canvas code preview
class ShuffleCards extends Canvas.Step {
  enter() {
    let idxCursor = this.entities.length;
    let startAt = 0;
    const order = [...BASE_CARDS];

    while (idxCursor) {
      const pickedSlot = Math.floor(Math.random() * idxCursor--);
      const pickedIdx = order[pickedSlot];
      const settledIdx = order[idxCursor];
      const pickedEntity = this.entities[pickedIdx];
      const settledEntity = this.entities[settledIdx];

      this.tween(pickedEntity, {
        startAt,
        duration: SHUFFLE_STEP_DURATION,
        from: { color: DEFAULT_COLOR },
        to: { color: TO_COLOR },
      });
      startAt += SHUFFLE_STEP_DURATION;

      this.tween(pickedEntity, {
        startAt,
        duration: SHUFFLE_STEP_DURATION,
        from: { color: TO_COLOR },
        to: { color: DEFAULT_COLOR },
      });
      startAt += SHUFFLE_STEP_DURATION;

      if (pickedSlot === idxCursor) continue;

      this.tween(pickedEntity, {
        startAt,
        duration: SHUFFLE_STEP_DURATION,
        from: this.cardXAt(pickedSlot, pickedIdx),
        to: this.cardXAt(idxCursor, pickedIdx),
      });
      this.tween(settledEntity, {
        startAt,
        duration: SHUFFLE_STEP_DURATION,
        from: this.cardXAt(idxCursor, settledIdx),
        to: this.cardXAt(pickedSlot, settledIdx),
      });

      order[pickedSlot] = settledIdx;
      order[idxCursor] = pickedIdx;

      startAt += SHUFFLE_STEP_DURATION;
    }

    this.duration = startAt;
  }

  cardXAt(slot, cardIdx) {
    const x0 = CENTER_X + slot * SPACING;
    return { x0, x1: x0 - (cardIdx - CARDS_COUNT / 2) };
  }
}

const entities = createCards();
const timeline = new Canvas.Timeline(entities, [
  new Canvas.Step({ duration: 200 }),
  new ShuffleCards(),
  new Canvas.Step({ duration: 1000 }),
]);

render(entities);

```


It's kind of like a physical deck of cards. I could pick a random card and put it at the top of the deck, or putting it next to it, making a new deck. The former is what I'd do usually when I shuffle cards with both my hands. I didn't realize the parallel from the code is pretty close to real life.

Though, despite how much the article blew me away, I never got around to actually build the game.


---

```sandbox=js label="setup code"
const CARDS_COUNT = 60;
const CARD_HEIGHT = 50;
const CARD_WIDTH = 2;
const SPACING = 6;
const Y_SHIFT = 100;
const DEFAULT_COLOR = { r: 224, g: 122, b: 95 };
const TO_COLOR = { r: 255, g: 0, b: 0 };
const DECK_WIDTH = (CARDS_COUNT - 1) * SPACING + CARD_WIDTH;
const CENTER_X = (width - DECK_WIDTH) / 2;
const CENTER_Y = (height - CARD_HEIGHT) / 2;
const BASE_CARDS = Array.from({ length: CARDS_COUNT }, (_, idx) => idx);
const SHUFFLE_STEP_DURATION = 100;
const SHUFFLE_STEP_DELAY = 50;
const SHUFFLE_DURATION = (CARDS_COUNT - 1) * SHUFFLE_STEP_DELAY + SHUFFLE_STEP_DURATION;

function createCards() {
  return BASE_CARDS.map((idx) => {
    const xOffset = idx - CARDS_COUNT / 2;
    const height = Canvas.easeInOutSine(1 - Math.abs(xOffset / CARDS_COUNT)) * CARD_HEIGHT;

    const x0 = CENTER_X + idx * SPACING;
    const y0 = CENTER_Y + CARD_HEIGHT - height;

    return new Canvas.Line({
      x0,
      x1: x0 - xOffset,
      y0,
      y1: y0 + height,
      color: DEFAULT_COLOR,
      lineWidth: CARD_WIDTH,
    });
  });
}

class MoveAllCards extends Canvas.Step {
  constructor({ duration, offset }) {
    super({ duration });
    this.offset = offset;
  }

  enter() {
    for (const entity of this.entities) {
      this.tween(entity, {
        startAt: 0,
        duration: this.duration,
        from: entity,
        to: {
          x0: entity.x0 + this.offset.x,
          x1: entity.x1 + this.offset.x,
          y0: entity.y0 + this.offset.y,
          y1: entity.y1 + this.offset.y,
        },
      });
    }
  }
}

function render(entitites) {
  const renderer = new Canvas.Renderer(canvas, entities);
  
  loop((t) => {
    timeline.update(t);
    renderer.update(t);
  
    if (timeline.done) {
      reset();
      timeline.reset();
    }
  });
}

```

```sandbox=external label="canvas helper"
https://cdn.jsdelivr.net/npm/@briwa.dev/canvas@0.2.0/dist/index.iife.js
```
