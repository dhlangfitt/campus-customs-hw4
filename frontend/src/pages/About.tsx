import { OrnamentRule, WaxSeal } from '../components/Ornaments'

export default function About() {
  return (
    <div className="prose">
      <h1>what exactly is campus customs</h1>
      <p className="lead">the useful answer is mostly a list of things we do not do.</p>

      <OrnamentRule />

      <section data-campus="colleges">
        <h2>we do not make any of this</h2>
        <p>
          campus customs is a licensed reseller. the shield, the wordmark, the bulldog in its
          various moods: none of that is ours. neither are the garments. they come from champion,
          brooks brothers, district, under armour and a handful of others who have been making
          heavyweight cotton for rather longer than we have been choosing it. our trade is
          narrower. we decide which of several thousand possible yale things earn a place on a
          shelf on broadway, and then we keep them in six sizes.
        </p>
      </section>

      <section data-campus="library">
        <h2>so what is the actual work</h2>
        <p>
          translation, mostly. yale produces marks. a person produces a cold tuesday and a walk
          up to science hill. getting from the one to the other without anybody having to think
          about it is the whole of the job. when it is done properly, you do not notice us at
          all.
        </p>
      </section>

      <section data-campus="fields">
        <h2>how we keep the shelves honest</h2>
        <p>
          every product page carries a live count for all six sizes, so you can see what is on
          the shelf before you fall for something. ask the shop assistant for your size and it
          will show you only what it can actually hand you. a small thing, and the difference
          between a catalog and a shop.
        </p>
      </section>

      <section data-campus="broadway">
        <h2>come and find us</h2>
        <p>
          57 broadway, new haven. the shelves hold what these pages hold, and the people behind them
          have opinions about fit worth asking for. officially licensed, classic bulldog pride,
          and a bulldog on the door.
        </p>
      </section>

      <div className="sealrow">
        <WaxSeal size={58} />
        <p>and if we are missing something you would genuinely wear: what is it?</p>
      </div>
    </div>
  )
}
