import {
  v2Dist,
  R,
  listSum,
  weightedRandom,
  RSeed,
  breadthSearch,
  FR,
  listNorm,
} from "./util";
import { Star, starsNumber, tagsList, tagsNumber } from "./Star";
import { Link } from "./Link";

export const encourageCooldown = 50,
  tagResearchRate = 400,
  passiveIncomeRate = 0.5;

export const rdConf: [string, number, number, number, (Galaxy) => string][] = [
  [
    "*Entanglements",
    3,
    200,
    100,
    (gal: Galaxy) =>
      `You need one entanglements to install a link or expand it. You have ${
        gal.entsLeft
      } entanglements left of ${
        gal.rd[ENTS]
      } total. It will cost $${gal.linkPrice()} (and an entanglement) to install a new link or expansion. Reclaiming entanglements is free`,
  ],
  [
    "Link range",
    2,
    1000,
    1000,
    (gal: Galaxy) => `Maximum link range is ${gal.linkRange()} pc.`,
  ],
  [
    "R&D Speed",
    0,
    1000,
    200,
    (gal: Galaxy) =>
      `R&D speed is ${
        (gal.rdSpeed() * 100) | 0
      }%. You get 50% for each repeat of this research, and also 1% for each 200EB sent.`,
  ],
  [
    "Latency",
    0,
    10000,
    10000,
    (gal: Galaxy) =>
      `Connection speed is increased by ${
        gal.speedBoost() * 100
      }%, and by the same amount for the each extra expansion`,
  ],
  [
    "Broadband",
    0,
    10000,
    10000,
    (
      gal: Galaxy
    ) => `Each link can transfer ${gal.baseBandwith()}TB/s. Each link expansion increases it by ${gal.bandwithUpgrade()}TB/s. 
    Going over this limit increases latency by 1ms/s per each TB/s.`,
  ],
  [
    "Flexible pricing",
    0,
    10000,
    5000,
    (
      gal: Galaxy
    ) => `Ability to discount or overcharge your service in specific system.
  Discounting reduces profit per message by half, but increases number of messages by ${
    gal.pricingBonus() * 100
  }%.
  Overcharging reduces messages by half, but increases profit per message by ${
    gal.pricingBonus() * 100
  }%.
  You can discount/overcharge ${gal.rd[PRICING]} systems.`,
  ],
  [
    "Search Engine",
    0,
    10000,
    10000,
    (gal: Galaxy) => `You can <em>P</em>romote up to ${gal.rd[PROMOTE]} topics. 
  That reduces profit per message by half for that topic, but increases messages by ${
    gal.promotingBonus() * 100
  }%`,
  ],
  [
    "Investments",
    0,
    100000,
    100000,
    (gal: Galaxy) =>
      `You can <em>I</em>nvest into any topic up to ${gal.rd[INVEST]} times, permanently increasing profit from related messages by 25%.`,
  ],

  [
    "Targeted Adverts",
    0,
    50000,
    50000,
    (
      gal: Galaxy
    ) => `You have created an algorithm that will learn from messages you transport and improve profits.
  After sending a certain amount of messages of any topic you will start getting 25% more income from such messages. 
  Also, if you get such a bonus for all topics, you will be able to unlock the next level of this upgrade. 
  After doing it 5 times, something interesting may happen.
  `,
  ],

  [
    "Social Engineering",
    0,
    30000,
    10000,
    (gal: Galaxy) => `You have enough knowledge and leverage to 
  <em>E</em>ncourage people through galaxy very interested in a topic of your choice. You will need to repeat this research for each such action.
  You can do it up to ${gal.rd[ENCOURAGE]} times`,
  ],
];

export const ENTS = 0,
  RANGE = 1,
  RDSPEED = 2,
  LATENCY = 3,
  TRANSPORT = 4,
  PRICING = 5,
  PROMOTE = 6,
  INVEST = 7,
  RESEARCH = 8,
  ENCOURAGE = 9;

export class Galaxy {
  get entsLeft() {
    return this.rd[ENTS] - this.entsUsed;
  }

  pricingBonus() {
    return 1 + this.rd[PRICING] * 0.25;
  }

  get pricingLeft() {
    return this.rd[PRICING] - this.pricingUsed;
  }

  promotingBonus() {
    return 0.5 + this.rd[PROMOTE] * 0.5;
  }

  stars: Star[] = [];
  links: Link[] = [];
  packets: [number, number, number, number, number[]][] = [];
  time = 0;
  colonized = 1;

  ai = false;

  cash = 1000;
  entsUsed = 0;
  pricingUsed = 0;
  promotionsUsed = 0;
  encouragementsUsed = 0;

  latency: [number, number][][] = [];

  talks: number[] = [];

  rd = rdConf.map((r) => r[1]);
  rdActive: number[] = rdConf.map((r) => 0);
  rdProgress = rdConf.map((r) => 0);

  invites: number[] = [];

  promoted: boolean[] = [];
  invested: number[] = [];
  encouraged: number[] = [];

  tagsResearched: number[] = [];

  exp = 0;

  flow = 0;
  pop = 0;
  income = 0;

  overflow(link: Link) {
    return Math.max(0, link.flow - this.linkBandwith(link));
  }

  baseBandwith() {
    return 50 + 25 * this.rd[TRANSPORT];
  }

  bandwithUpgrade() {
    return 50 + 50 * this.rd[TRANSPORT];
  }

  speedBoost() {
    return this.rd[LATENCY] * 0.1;
  }

  rdSpeed() {
    return 1 + this.rd[RDSPEED] * 0.5 + this.exp / 20000;
  }

  date() {
    return 2100 + this.time / 10;
  }

  rdRemainingCost(id: number) {
    return (1 - this.rdProgress[id]) * this.rdFullCost(id);
  }

  rdFullCost(id: number) {
    return rdConf[id][2] + rdConf[id][3] * this.rd[id];
  }

  linkRange() {
    return 50 + this.rd[RANGE] * 25;
  }

  inRange(a: Star, b: Star) {
    return v2Dist(a.at, b.at) <= this.linkRange();
  }

  latencyOf(link: Link) {
    let data = this.latency[link.ends[0].id].find(
      (a) => a[0] == link.ends[1].id
    );
    if (!data) return 1000;
    return data[1];
  }

  recalculateLatency() {
    this.latency = this.stars.map((star) =>
      Object.entries(star.links).map(
        ([otherId, link]) =>
          [
            Number(otherId),
            (link.length + 10 + this.overflow(link)) /
              (1 + this.speedBoost() * link.width),
          ] as [number, number]
      )
    );
  }

  constructor() {
    RSeed(1);
    for (let i = 200; i-- && this.stars.length < starsNumber; ) {
      let star = new Star().generate();
      if (
        !this.stars.every(
          (other) =>
            star.name != other.name &&
            (Math.abs(star.at[0] - other.at[0]) > 50 ||
              Math.abs(star.at[1] - other.at[1]) > 20)
        )
      )
        continue;

      star.id = this.stars.length;
      this.stars.push(star);
    }
    for (let i = 0; i < tagsNumber; i++) {
      this.promoted[i] = false;
      this.invested[i] = this.tagsResearched[i] = this.encouraged[i] = 0;
    }
    this.stars[0].pop = 10;
  }

  addLink(a: Star, b: Star, width = 1) {
    let link = new Link(Star.order(a, b));
    link.width = width;
    a.registerLink(b, link);
    b.registerLink(a, link);
    this.links.push(link);
    return link;
  }

  serialise() {
    let save = Object.assign({}, this) as any;
    save.stars = this.stars.map((star) => star.serialise());
    save.links = this.links.map((link) => link.serialise());
    delete save.packets;
    return save;
  }

  deserialise(save) {
    Object.assign(this, save);
    if (this.rd.length < rdConf.length) {
      this.rd = rdConf.map((v, i) => this.rd[i] || 0);
      this.rdActive = rdConf.map((v, i) => this.rdActive[i] || 0);
      this.rdProgress = rdConf.map((v, i) => this.rdProgress[i] || 0);
    }
    this.stars = [];
    this.links = [];
    for (let star of save.stars) this.deserialiseStar(star);
    for (let link of save.links) this.deserialiseLink(link);

    console.log(this);
  }

  deserialiseLink(save) {
    let link = this.addLink(this.stars[save.ends[0]], this.stars[save.ends[1]]);
    delete save.ends;
    Object.assign(link, save);
  }

  deserialiseStar(save) {
    let star = new Star();
    Object.assign(star, save);
    star.balanceTalks();
    this.stars.push(star);
    return star;
  }

  talk(start: Star, end: Star, tag: number) {
    let { route, distances } = this.findPath(start, end);

    let latency = 1000;
    let weight = 1;

    if (route) {
      latency = distances[end.id];
      let fee = 3 / (1 + latency / 100);

      if (this.promoted[tag]) {
        fee /= 2;
        weight *= 1 + this.promotingBonus();
      }

      if (this.rd[RESEARCH]) {
        fee *= 1 + (this.tagsResearched[tag] | 0) * 0.25;
      }

      if (this.invested[tag]) {
        fee *= 1 + this.invested[tag] * 0.25;
      }

      if (end.pricing == 1) {
        fee *= 1 + this.pricingBonus();
        weight /= 2;
      } else if (end.pricing == -1) {
        fee /= 2;
        weight *= 1 + this.pricingBonus();
      }

      end.income += fee * weight;
      this.cash += fee * weight;
      this.exp += weight;
      this.packets.push([start.id, end.id, tag, weight, route]);

      for (let i = 0; i < route.length - 1; i++) {
        let [a, b] = [this.stars[route[i]], this.stars[route[i + 1]]];
        let link = a.links[b.id];
        link.flow += weight;
        link.talks[tag] += 1e-4 * weight;
        link.talkers[start.id] += 1e-4 * weight;
        link.talkers[end.id] += 1e-4 * weight;
      }
    }

    if (this.rd[RESEARCH] > 0 && this.tagsResearched[tag] < this.rd[RESEARCH]) {
      this.tagsResearched[tag] +=
        (1 / tagResearchRate / 2 ** (this.rd[RESEARCH] - 1)) * weight;
      if (this.tagsResearched[tag] > this.rd[RESEARCH]) {
        this.tagsResearched[tag] = this.rd[RESEARCH];
      }
    }

    let intencity = 1e-3 * (1500 - latency) * weight;

    start.talkers[end.id] += intencity * 1e-4;
    end.talkers[start.id] += intencity * 1e-4;

    start.interact(end, intencity, tag);
    end.interact(start, -intencity, tag);
  }

  passiveIncome() {
    return this.pop * passiveIncomeRate;
  }

  update(dt: number) {
    let secondPassed = (this.time | 0) != ((this.time + dt) | 0);
    this.time += dt;
    this.cash += dt * this.passiveIncome();
    this.flow = this.pop = 0;
    this.income = this.passiveIncome();

    let activity = this.stars.map((s) => s.activity());

    this.packets.length = 0;

    for (let tag = 0; tag < tagsNumber; tag++) {
      if (this.encouraged[tag] > 0)
        this.encouraged[tag] = Math.max(0, this.encouraged[tag] - dt);
    }

    for (let link of this.links) {
      link.update(dt);
      this.flow += link.flow;
    }

    this.recalculateLatency();

    for (let i = listSum(activity) * dt * 3; i > 0; i--) {
      let star = this.stars[weightedRandom(activity)];
      let tag = weightedRandom(star.talks);
      let invite = this.invites[tag];
      if (invite != null && invite != star.id) {
        this.talk(this.stars[invite], star, tag);
        this.invites[tag] = null;
      } else {
        this.invites[tag] = star.id;
      }
    }

    for (let star of this.stars) {
      this.updateStar(star, dt);
      this.pop += star.pop;
      this.income += star.income;
    }

    this.talks.fill(0, 0, tagsNumber);

    for (let star of this.stars)
      for (let i = tagsNumber; i--; )
        this.talks[i] += star.talks[i] * star.activity();

    this.talks = listNorm(this.talks);

    for (let i = 0; i < this.rdActive.length; i++) {
      if (this.rdActive[i] > 0) if (this.doRD(i, dt)) this.rdActive[i]--;
    }

    let tag = R(tagsNumber);
    if (FR() < dt * this.talks[tag] ** 2 * 100) {
      console.log("censoring tag " + tagsList[tag]);
      for (let star of this.stars) {
        star.has[tag] *= FR();
        star.talks[tag] *= FR();
      }
    }

    if (FR() < 0.0001 * dt * this.pop) {
      let [star, issue, severity] = [
        this.stars[R(starsNumber)],
        tagsNumber - R(6) - 1,
        R(50) ** 2,
      ];
      console.log(
        `Unleashing ${severity} of ${tagsList[issue]} on ${star.name}`
      );
      star.has[issue] = severity;
    }

    if (this.ai) {
      if (this.cash < 10000) {
        this.rdActive.fill(0);
      } else if (this.cash > 100000) {
        if(FR()<dt/10){
          let res = R(this.rd.length - 1) + 1;
          if (this.rdFullCost(res) < this.cash) this.rdActive[res] = 1;
        }

        if (this.entsLeft < 10) {
          this.rdActive[0] = 10;
        } else {

          let link = this.links[R(this.links.length)];

          if (this.overflow(link) > 0 && this.entsLeft) {
            this.payForLink();
            link.width++;
          }

            let star1 = this.stars[R(starsNumber)];
          let star2 = this.stars[R(starsNumber)];
          if(star1 != star2 && !this.findPath(star1, star2).route && this.inRange(star1, star2)){
            this.payForLink();
            this.addLink(star1, star2);
          }
        }
      }
    } else {
      if(this.rd[RESEARCH]>=5){
        document.getElementById("over").style.display="block";
        this.ai = true;
      }
    }

    return secondPassed;
  }

  updateStar(star: Star, dt: number) {
    star.income /= 1 + dt;

    let issue = tagsNumber - R(6) - 1;
    if (Math.abs(star.has[issue]) > 3) {
      let other = this.stars[
        weightedRandom(
          this.stars.map((other) =>
            other != star ? 1 / (v2Dist(star.at, other.at) + 0.1) : 0
          )
        )
      ];
      let delta = star.has[issue] - other.has[issue];
      let transfer = delta * FR() * dt;
      //console.log(tagsList[issue], star.name, other.name, transfer);
      other.has[issue] += transfer;
      star.has[issue] -= transfer;
    }

    if (star.pop > 0 && FR() < dt * 10) {
      star.update(dt);

      star.talkers = listNorm(star.talkers);
      let other = this.stars[R(starsNumber)];
      let delta = Math.min(0.1, star.pop * R(1e3) * 5e-6);
      let path = this.findPath(star, other);

      if (
        (R(1e6) / (v2Dist(star.at, other.at)**0.9 + 0.1)) *
          (path.route ? 10 : 1) *
          star.pop >
        100000
      ) {
        if (other.pop == 0) this.colonized++;
        star.log({ arrived: delta });
        other.growCapped(delta);
        other.log({ grow: delta });
      } else {
        star.log({ migrate: delta });
        star.growCapped(delta);
      }
      star.updateColor();
    }
  }

  doRD(id: number, dt: number) {
    let price = dt * 100 * this.rdSpeed();
    let delta = price / this.rdFullCost(id);
    if (this.cash < price) return;
    this.cash -= price;
    this.rdProgress[id] += delta;
    if (this.rdProgress[id] >= 1) {
      this.rd[id]++;
      this.rdProgress[id] = 0;
      return true;
    }
    return false;
  }

  findPath(start: Star, end: Star) {
    let path = breadthSearch(
      start.id,
      end.id,
      (starId) => this.latency[starId]
    );
    return path;
  }

  findDistances(start: Star) {
    return breadthSearch(start.id, -1, (starId) => this.latency[starId]);
  }

  /*connect(a: Star, b: Star) {
    let link = a.linkTo(b);
    if (!link) link = this.addLink(a, b);
    return link;
  }*/

  startResearch(id: number) {
    this.rdActive[id]++;
  }

  toggleResearch(id: number) {
    if (this.rdActive[id]) this.rdActive[id] = 0;
    else this.rdActive[id] = 1;
  }

  linkPrice() {
    return 100 * this.rd[ENTS];
  }

  linkBandwith(link: Link) {
    return this.baseBandwith() + this.bandwithUpgrade() * (link.width - 1);
  }

  payForLink() {
    this.entsUsed++;
    this.cash -= this.linkPrice();
  }

  removeLink(link: Link) {
    this.links.splice(this.links.indexOf(link), 1);
    link.ends[0].removeLink(link.ends[1]);
    link.ends[1].removeLink(link.ends[0]);
  }

  upgradeLink(link: Link, delta: number) {
    if (delta == 1) {
      link.width++;
      this.payForLink();
    } else {
      this.entsUsed--;
      link.width--;
      if (link.width == 0) this.removeLink(link);
    }
    this.recalculateLatency();
  }

  linkById(id: number) {
    return this.stars[id % 1000].links[(id / 1000) | 0];
  }

  togglePricing(star: Star, w: number) {
    let prisingWas = star.pricing;
    if (star.pricing == w) {
      star.pricing = 0;
    } else {
      star.pricing = w;
    }
    this.pricingUsed += Math.abs(star.pricing) - Math.abs(prisingWas);
  }

  hasTagControls(): boolean {
    return !!(
      this.rd[PROMOTE] ||
      this.rd[INVEST] ||
      this.rd[RESEARCH] ||
      this.rd[ENCOURAGE]
    );
  }

  investCost(tag: number) {
    return 50000 * (this.invested[tag] + 1);
  }

  canInvest(tag: number) {
    return (
      this.cash >= this.investCost(tag) &&
      this.rd[INVEST] > (this.invested[tag] || 0)
    );
  }

  encourageTag(tag: number) {
    console.assert(tag < 36);
    this.encouragementsUsed++;
    this.encouraged[tag] = encourageCooldown;
    let multiplier = 1 + (this.tagsResearched[tag] | 0) / 2;
    for (let star of this.stars) {
      star.has[tag] += 50 * multiplier;
    }
  }

  tagResearchComplete(tag: number) {
    return this.tagsResearched[tag] >= this.rd[RESEARCH];
  }

  options(rdn: number, tag: number): number {
    if (!this.rd[rdn]) return 0;

    switch (rdn) {
      case PROMOTE:
        if (!this.promoted[tag] && this.promotionsUsed >= this.rd[PROMOTE])
          return 0;
        else return this.promoted[tag] ? 2 : 1;
      case INVEST:
        return this.canInvest(tag) ? 1 : 0;
      case ENCOURAGE:
        return this.encouragementsUsed < this.rd[ENCOURAGE] &&
          !this.encouraged[tag]
          ? 1
          : 0;
    }

    return 1;
  }

  tagControl(rdn: number, tag: number) {
    console.log(tag, rdn);
    switch (rdn) {
      case PROMOTE:
        if (this.promoted[tag]) {
          this.promoted[tag] = false;
          this.promotionsUsed--;
        } else {
          this.promoted[tag] = true;
          this.promotionsUsed++;
        }
        break;
      case INVEST:
        if (this.canInvest(tag)) {
          this.cash -= this.investCost(tag);
          this.invested[tag]++;
        }
        break;
      case ENCOURAGE:
        this.encourageTag(tag);
        break;
    }
  }

  researchExpRequired(r: number): number {
    return r < 1 ? 0 : 2 ** r * 500;
  }

  researchImpossible(r: number): string | null {
    if (this.exp < this.researchExpRequired(r))
      return `Send ${this.researchExpRequired(r)} EB`;
    if (r == RESEARCH && !this.tagsResearchUnlocked()) {
      return `Research topics`;
    }
    return null;
  }

  tagsResearchUnlocked() {
    return !this.tagsResearched.some((v) => v < this.rd[RESEARCH]);
  }
}
