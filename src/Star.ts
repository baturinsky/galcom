import { R, v2, listSum, FR, listNorm, weightedRandom } from "./util";
import { Link } from "./Link";

export const starsNumber = 100,
  migrationSpeed = 0.03,
  logging = true;

export function genNames() {
  let name = "";
  for (let l = R(3) + 2; l--; )
    name += "x.lexegezacebisousesarmaindirea.eratenberalavetiedorquanteisrion".substr(
      R(33) * 2,
      2
    );
  name = name.replace(/\./g, "");
  name = name[0].toUpperCase() + name.substr(1);
  return name;
}

const tagsConfig = `=CRAFTS=
industry
mining
construction
energetics
space
food
technology
medicine
science
stocks
galcom
travel
=ARTS=
sport
art
music
ponies
funny
kittens
movies
games
adult
literature
photo
history
=ISSUES=
news
politics
emigration
censorship
unemployment
pollution
ninjas
illness
poverty
epidemy
revolution
war`.split("\n");

export const tagsList = tagsConfig.filter((s) => /^[a-z]/.test(s));
export const tagNamed:{[id:string]:number} = {};
for(let i = 0; i<tagsList.length; i++)
  tagNamed[tagsList[i]] = i;

let ARTS = tagsConfig.indexOf("=ARTS=") - 1;
let ISSUES = tagsConfig.indexOf("=ISSUES=") - 2;

const positiveTagEffect = tagsList.map((v, tag) =>
  tag < ARTS ? 3 - tag * 0.1 : tag < ISSUES ? 1 : -(tag - ISSUES) * 0.2
);

const negativeTagEffect = tagsList.map((v, tag) =>
  tag < ARTS ? 1 - tag * 0.03 : tag < ISSUES ? 0.1 : -(tag - ISSUES) * 0.1
);

const tagSpread = tagsList.map((v, tag) =>
  tag < ISSUES ? 1 : tag < ISSUES + 6 ? 0 : 0.5
);

export const tagsNumber = tagsList.length;

console.log(tagsList.slice(0, ARTS));
console.log(tagsList.slice(ARTS, ISSUES));
console.log(tagsList.slice(ISSUES));

console.log(negativeTagEffect);
console.log(positiveTagEffect);
console.log(tagSpread);

function tagColorNumber(tag: number) {
  return 240 - (tag / tagsNumber) * 270;
}

export function tagColor(tag: number, opacity: number = 100) {
  return `hsla(${tagColorNumber(tag)},100%,80%, ${opacity}%)`;
}

export let tagColors: { [tag: string]: string } = {};
for (let i = 0; i < tagsNumber; i++) {
  tagColors[i] = tagColor(i);
}

export class Star {
  color: number;
  pop: number;
  capacity: number;
  at: v2;
  name: string;
  id: number;
  talks: number[] = [];
  talkers: number[] = [];
  has: number[] = [];
  makes: number[] = [];
  links: { [star: number]: Link } = {};
  linksLengths: [number, number][] = [];
  income = 0;
  logs = [];
  pricing = 0;

  grit = 1;

  serialise() {
    let save = Object.assign({}, this);
    delete save.logs;
    delete save.links;
    delete save.linksLengths;
    return save;
  }

  static order(a: Star, b: Star): [Star, Star] {
    return a.id < b.id ? [a, b] : [b, a];
  }

  static linkId(a: Star, b: Star) {
    [a, b] = Star.order(a, b);
    return a.id * starsNumber + b.id;
  }

  constructor() {}

  generateMakes(tag: number) {
    this.makes[tag] = (R(100) - 50) ** 3 / 1e5;
    if (tag >= ISSUES) this.makes[tag] = Math.abs(this.makes[tag]);
  }

  generate() {
    this.name = genNames();
    this.at = [R(830) + 10, R(850) + 10];
    this.pop = 0;
    this.capacity = R(100) / 10 + 1;
    for (let tag = 0; tag < tagsNumber; tag++) {
      this.generateMakes(tag);
      this.has[tag] = this.makes[tag] * (0.5 + FR());
      this.talks[tag] = R(100) ** 3;
    }
    this.talkers = [...new Array(100)].map((n) => 0);
    this.balanceTalks();
    this.updateColor();
    return this;
  }

  shakeTalks() {
    for (let i = 0; i < tagsNumber; i++) {
      this.talks[i] += R(5) ** 4 / (R(300) ? 1e7 : 3e3);
    }
    this.balanceTalks();
  }

  balanceTalks() {
    this.talks = listNorm(this.talks);
  }

  activity() {
    return this.pop;
  }

  averageTag() {
    return listSum(this.talks.map((v, i) => v * i)) / listSum(this.talks);
  }

  maxTag() {
    return this.talks.reduce(([pi, pv], c, i) => (c > pv ? [i, c] : [pi, pv]), [
      0,
      0,
    ]);
  }

  /*sortedTalks() {
    return Object.entries(this.talks).sort((a, b) => b[1] - a[1]);
  }*/

  linkTo(that: Star) {
    return this.links[that.id];
  }

  registerLink(that: Star, link: Link) {
    this.links[that.id] = link;
    this.linksLengths.push([that.id, link.length]);
  }

  removeLink(that: Star) {
    delete this.links[that.id];
    this.linksLengths.splice(
      this.linksLengths.findIndex((l) => l[0] == that.id),
      1
    );
  }

  log(data) {
    if (logging) {
      this.logs.push(data);
    }
    if (this.logs.length > 300) this.logs.splice(0, 100);
  }

  growCapped(delta: number) {
    //this.log({ growCapped: delta });
    this.changePop(delta / (1 + (this.pop / this.capacity) ** 2));
  }

  changePop(delta: number) {
    //if (delta < -0.02) debugger;
    if(!delta && delta!=0)
      debugger;
    //this.log({ changePop: delta });
    this.pop += delta;
    if (this.pop < 0) this.pop = 0;
  }

  updateColor() {
    this.color = tagColorNumber(this.maxTag()[0]);
  }

  interact(that: Star, flow: number, tag: number) {
    console.assert(tag<36);

    let factor = Math.abs(flow);
    let delta = that.has[tag] - this.has[tag];
    delta = Math.abs(delta) ** 0.5 * Math.sign(delta);

    if (delta < 0 && tag >= ARTS && tag < ISSUES) delta *= 0.2;

    let tagTypeMultiplier = tag > ISSUES ? -0.1 * (tag - ISSUES) : 1;

    let migration = delta * factor * tagTypeMultiplier * migrationSpeed;
    migration *= Math.min(migration > 0 ? this.pop : that.pop, 1);

    if(migration>0)
      this.has[tagNamed.emigration] += migration/this.pop;
    else
      this.has[tagNamed.unemployment] -= migration/this.pop;

    let sizeAdjust = (that.pop / (this.pop + 0.1)) ** 0.5;

    factor *= sizeAdjust;

    let bonus = 0.05 * tagTypeMultiplier;

    let dhas = (delta + bonus) * factor * 0.3;
    //let dmakes = factor * tagTypeMultiplier * 0.01;

    this.has[tag] += dhas;
    //this.makes[tag] += dmakes;

    if(tag>=ISSUES)
      this.grit += flow*0.01;    

    if (logging)
      this.log({
        that,
        migration,
        flow,
        tag,
        delta,
        sizeAdjust,
        dhas,
        makes: this.makes[tag],
        has: this.has[tag],
      });

    this.changePop(-migration);

  }

  update(dt: number) {
    let tag = weightedRandom(this.has.map(v=>Math.abs(v)));

    console.assert(tag<36);

    let change = (this.makes[tag] - this.has[tag]) * dt * 2;
    this.has[tag] += change;
    this.talks[tag] += FR() * 0.1 * dt;
    this.balanceTalks();

    if(FR()<0.1*dt){
      this.generateMakes(R(tagsNumber));
    }

    if(this.pop > this.capacity && FR()<dt){
      let tag = [tagNamed.unemployment, tagNamed.pollution, tagNamed.poverty][R(3)];
      this.has[tag] += (this.pop - this.capacity) / 10;
      this.has[[tagNamed.politics, tagNamed.news][R(2)]] += FR() * this.grit / 10;
    }

    /*if(FR()<0.02*dt){
      this.makes[R(tagsNumber)] = (FR()*10)**2;
    }*/

    let growth =
      dt *
      0.02 *
      this.has[tag] *
      (0.1 + this.pop) *
      (this.has[tag] < 0 ? negativeTagEffect[tag] : positiveTagEffect[tag]);

    if(growth<0)
      this.grit += dt;
    
    if(growth<0)
      growth /= 1 + this.grit*0.5;

    this.grit *= 1 - dt*0.01 * this.pop;

    this.log({
      tag,
      growth,
      pop: this.pop,
      has: this.has[tag],
      talks: this.talks[tag],
      dt,
    });

    this.growCapped(growth);

  }
}
