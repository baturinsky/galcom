(function () {
  'use strict';

  let seed;
  let R = (n) => (seed = (seed * 69069 + 1) % Math.pow(2, 31)) % n;
  let FR = () => R(1e9) / 1e9;
  function RSeed(n) {
      seed = n;
  }
  function v2Len(v) {
      return Math.sqrt(Math.pow(v[0], 2) + Math.pow(v[1], 2));
  }
  function v2Dist(a, b) {
      return v2Len(v2Dif(a, b));
  }
  function v2Dif(a, b) {
      return [b[0] - a[0], b[1] - a[1]];
  }
  function v2Add(a, b) {
      return [b[0] + a[0], b[1] + a[1]];
  }
  function v2Norm(v, n = 1) {
      const scale = n / (v2Len(v) || 1);
      return [v[0] * scale, v[1] * scale];
  }
  //If end is >= 0, returns path. Otherwise, returns distances
  function breadthSearch(start, end, neighbors) {
      let bag = [start];
      let distances = [];
      distances[start] = 0;
      let prev = [];
      let route = null;
      for (let limit = 0; limit < 10000; limit++) {
          if (bag.length == 0) {
              break;
          }
          let walking = bag.shift();
          if (walking == end) {
              route = [];
              while (walking >= 0) {
                  route.push(walking);
                  walking = prev[walking];
              }
              route.reverse();
              break;
          }
          for (let [cell, cost] of neighbors(walking)) {
              let totalCost = cost + distances[walking];
              if (!(cell in distances) || distances[cell] > totalCost) {
                  let bigger = bag.findIndex((v) => distances[v] > totalCost);
                  bag.splice(bigger >= 0 ? bigger : bag.length, 0, cell);
                  distances[cell] = totalCost;
                  prev[cell] = walking;
              }
          }
      }
      return { route, distances, prev };
  }
  function listSum(a) {
      return a.reduce((x, y) => x + y, 0);
  }
  function weightedRandom(a) {
      let roll = FR() * listSum(a) - a[0];
      if (roll == 0)
          return a[0];
      let i = 0;
      while (roll >= 0)
          roll -= a[++i];
      return i;
  }
  function listNorm(list, newSum = 1, speed = 1) {
      let sum = listSum(list);
      let factor = 1 + (newSum - sum) * speed / sum;
      return sum ? list.map(v => v * factor) : list;
  }

  const starsNumber = 100, migrationSpeed = 0.03;
  function genNames() {
      let name = "";
      for (let l = R(3) + 2; l--;)
          name += "x.lexegezacebisousesarmaindirea.eratenberalavetiedorquanteisrion".substr(R(33) * 2, 2);
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
  const tagsList = tagsConfig.filter((s) => /^[a-z]/.test(s));
  const tagNamed = {};
  for (let i = 0; i < tagsList.length; i++)
      tagNamed[tagsList[i]] = i;
  let ARTS = tagsConfig.indexOf("=ARTS=") - 1;
  let ISSUES = tagsConfig.indexOf("=ISSUES=") - 2;
  const positiveTagEffect = tagsList.map((v, tag) => tag < ARTS ? 3 - tag * 0.1 : tag < ISSUES ? 1 : -(tag - ISSUES) * 0.2);
  const negativeTagEffect = tagsList.map((v, tag) => tag < ARTS ? 1 - tag * 0.03 : tag < ISSUES ? 0.1 : -(tag - ISSUES) * 0.1);
  const tagSpread = tagsList.map((v, tag) => tag < ISSUES ? 1 : tag < ISSUES + 6 ? 0 : 0.5);
  const tagsNumber = tagsList.length;
  console.log(tagsList.slice(0, ARTS));
  console.log(tagsList.slice(ARTS, ISSUES));
  console.log(tagsList.slice(ISSUES));
  console.log(negativeTagEffect);
  console.log(positiveTagEffect);
  console.log(tagSpread);
  function tagColorNumber(tag) {
      return 240 - (tag / tagsNumber) * 270;
  }
  function tagColor(tag, opacity = 100) {
      return `hsla(${tagColorNumber(tag)},100%,80%, ${opacity}%)`;
  }
  let tagColors = {};
  for (let i = 0; i < tagsNumber; i++) {
      tagColors[i] = tagColor(i);
  }
  class Star {
      constructor() {
          this.talks = [];
          this.talkers = [];
          this.has = [];
          this.makes = [];
          this.links = {};
          this.linksLengths = [];
          this.income = 0;
          this.logs = [];
          this.pricing = 0;
          this.grit = 1;
      }
      serialise() {
          let save = Object.assign({}, this);
          delete save.logs;
          delete save.links;
          delete save.linksLengths;
          return save;
      }
      static order(a, b) {
          return a.id < b.id ? [a, b] : [b, a];
      }
      static linkId(a, b) {
          [a, b] = Star.order(a, b);
          return a.id * starsNumber + b.id;
      }
      generateMakes(tag) {
          this.makes[tag] = Math.pow((R(100) - 50), 3) / 1e5;
          if (tag >= ISSUES)
              this.makes[tag] = Math.abs(this.makes[tag]);
      }
      generate() {
          this.name = genNames();
          this.at = [R(830) + 10, R(850) + 10];
          this.pop = 0;
          this.capacity = R(100) / 10 + 1;
          for (let tag = 0; tag < tagsNumber; tag++) {
              this.generateMakes(tag);
              this.has[tag] = this.makes[tag] * (0.5 + FR());
              this.talks[tag] = Math.pow(R(100), 3);
          }
          this.talkers = [...new Array(100)].map((n) => 0);
          this.balanceTalks();
          this.updateColor();
          return this;
      }
      shakeTalks() {
          for (let i = 0; i < tagsNumber; i++) {
              this.talks[i] += Math.pow(R(5), 4) / (R(300) ? 1e7 : 3e3);
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
          return listSum(this.talks.map((v, i) => v * i)) / (listSum(this.talks) + 0.01);
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
      linkTo(that) {
          return this.links[that.id];
      }
      registerLink(that, link) {
          this.links[that.id] = link;
          this.linksLengths.push([that.id, link.length]);
      }
      removeLink(that) {
          delete this.links[that.id];
          this.linksLengths.splice(this.linksLengths.findIndex((l) => l[0] == that.id), 1);
      }
      log(data) {
          {
              this.logs.push(data);
          }
          if (this.logs.length > 300)
              this.logs.splice(0, 100);
      }
      growCapped(delta) {
          //this.log({ growCapped: delta });
          this.changePop(delta / (1 + Math.pow((this.pop / this.capacity), 2)));
      }
      changePop(delta) {
          //if (delta < -0.02) debugger;
          if (!delta && delta != 0)
              debugger;
          //this.log({ changePop: delta });
          this.pop += delta;
          if (this.pop < 0)
              this.pop = 0;
      }
      updateColor() {
          this.color = tagColorNumber(this.maxTag()[0]);
      }
      interact(that, flow, tag) {
          console.assert(tag < 36);
          let factor = Math.abs(flow);
          let delta = that.has[tag] - this.has[tag];
          delta = Math.pow(Math.abs(delta), 0.5) * Math.sign(delta);
          if (delta < 0 && tag >= ARTS && tag < ISSUES)
              delta *= 0.2;
          let tagTypeMultiplier = tag > ISSUES ? -0.1 * (tag - ISSUES) : 1;
          let migration = delta * factor * tagTypeMultiplier * migrationSpeed;
          migration *= Math.min(migration > 0 ? this.pop : that.pop, 1);
          let scaledMigration = migration / (this.pop + 0.01);
          if (migration > 0)
              this.has[tagNamed.emigration] += scaledMigration;
          else
              this.has[tagNamed.unemployment] -= scaledMigration;
          let sizeAdjust = Math.pow((that.pop / (this.pop + 0.1)), 0.5);
          factor *= sizeAdjust;
          let bonus = 0.05 * tagTypeMultiplier;
          let dhas = (delta + bonus) * factor * 0.3;
          //let dmakes = factor * tagTypeMultiplier * 0.01;
          this.has[tag] += dhas;
          //this.makes[tag] += dmakes;
          if (tag >= ISSUES)
              this.grit += flow * 0.01;
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
      update(dt) {
          let tag = weightedRandom(this.has.map(v => Math.abs(v)));
          console.assert(tag < 36);
          let change = (this.makes[tag] - this.has[tag]) * dt * 2;
          this.has[tag] += change;
          if (tag == tagNamed.epidemy) {
              this.has[tag] -= this.has[tagNamed.medicine] * dt;
          }
          this.talks[tag] += FR() * 0.1 * dt;
          this.balanceTalks();
          if (FR() < 0.1 * dt) {
              this.generateMakes(R(tagsNumber));
          }
          if (this.pop > this.capacity && FR() < dt) {
              let tag = [tagNamed.unemployment, tagNamed.pollution, tagNamed.poverty][R(3)];
              this.has[tag] += (this.pop - this.capacity) / 10;
              this.has[[tagNamed.politics, tagNamed.news][R(2)]] += FR() * this.grit / 10;
          }
          /*if(FR()<0.02*dt){
            this.makes[R(tagsNumber)] = (FR()*10)**2;
          }*/
          let growth = dt *
              0.02 *
              this.has[tag] *
              (this.has[tag] < 0 ? negativeTagEffect[tag] : positiveTagEffect[tag]);
          if (growth < 0) {
              this.grit += dt * growth * 10;
              growth /= 1 + this.grit * 0.5;
              this.has[tagsNumber - 1 - R(6)] += growth * FR();
          }
          this.grit *= 1 - dt * 0.01 * this.pop;
          growth *= (0.1 + this.pop);
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

  class Link {
      constructor(ends) {
          this.ends = ends;
          this.width = 1;
          this.flow = 0;
          this.talks = Array.from({ length: tagsNumber }, () => 0.01);
          this.talkers = Array.from({ length: 100 }, () => 0);
          this.length = v2Dist(this.ends[0].at, this.ends[1].at);
      }
      distToPoint(c) {
          let [a, b] = [this.ends[0].at, this.ends[1].at];
          return v2Dist(a, c) + v2Dist(b, c) - v2Dist(a, b);
      }
      serialise() {
          let save = Object.assign({}, this);
          save.ends = this.ends.map(s => s.id);
          return save;
      }
      update(dt) {
          this.flow /= 1 + dt;
          this.talks = listNorm(this.talks);
          this.talkers = listNorm(this.talkers);
      }
      get id() {
          return this.ends[0].id * 1000 + this.ends[1].id;
      }
      center() {
          return [(this.ends[0].at[0] + this.ends[1].at[0]) / 2, (this.ends[0].at[1] + this.ends[0].at[1]) / 2];
      }
  }

  const encourageCooldown = 50, tagResearchRate = 400;
  const rdConf = [
      [
          "*Entanglements",
          3,
          200,
          100,
          (gal) => `You need one entanglements to install a link or expand it. You have ${gal.entsLeft} entanglements left of ${gal.rd[ENTS]} total. It will cost $${gal.linkPrice()} (and an entanglement) to install a new link or expansion. Reclaiming entanglements is free`,
      ],
      [
          "Link range",
          2,
          1000,
          1000,
          (gal) => `Maximum link range is ${gal.linkRange()} pc.`,
      ],
      [
          "R&D Speed",
          0,
          1000,
          200,
          (gal) => `R&D speed is ${(gal.rdSpeed() * 100) | 0}%. You get 50% for each repeat of this research, and also 1% for each 100EB sent.`,
      ],
      [
          "Latency",
          0,
          10000,
          10000,
          (gal) => `Connection speed is increased by ${gal.speedBoost() * 100}%, and by same amount for the each extra expansion`,
      ],
      [
          "Broadband",
          0,
          10000,
          10000,
          (gal) => `Each link can transfer ${gal.baseBandwith()}TB/s. Each link expansion increases it by ${gal.bandwithUpgrade()}TB/s. 
    Going over this limit increases latency by 1ms/s per each TB/s.`,
      ],
      [
          "Flexible pricing",
          0,
          10000,
          10000,
          (gal) => `Ability to discount or overcharge your service in specific system.
  Discounting reduces profit per message by half, but increases number of messages by ${gal.pricingBonus() * 100}%.
  Overcharging reduces messages by half, but increases profit per message by ${gal.pricingBonus() * 100}%.
  You can discount/overcharge ${gal.rd[PRICING]} systems.`,
      ],
      [
          "Search Engine",
          0,
          20000,
          20000,
          (gal) => `You can promote up to ${gal.rd[PROMOTE]} topics. 
  That reduces profit per message by half for that topic, but increases messages by ${gal.promotingBonus() * 100}%`,
      ],
      [
          "Investments",
          0,
          200000,
          100000,
          (gal) => `You can invest into any topic up to ${gal.rd[INVEST]} times, permanently increasing profit from related messages by 25%.`,
      ],
      [
          "Targeted Adverts",
          0,
          100000,
          100000,
          (gal) => `You have created an algorithm that will learn from messages you transport and improve profits.
  After sending certain amount of messages of any topic you will start getting 25% more income from such messages. 
  Also, if you get such bonus for all topics, you will be able to unlock next level of this upgrade. 
  After doing it 5 times, something interesting may happen.
  `,
      ],
      [
          "Social Engineering",
          0,
          100000,
          100000,
          (gal) => `You have enough knowledge and leverage to 
  make people through galaxy very interested in a topic of your choice. You will need to repeat this research for each such action.
  You can do it up to ${gal.rd[ENCOURAGE]} times`,
      ],
  ];
  const ENTS = 0, RANGE = 1, RDSPEED = 2, LATENCY = 3, TRANSPORT = 4, PRICING = 5, PROMOTE = 6, INVEST = 7, RESEARCH = 8, ENCOURAGE = 9;
  class Galaxy {
      constructor() {
          this.stars = [];
          this.links = [];
          this.packets = [];
          this.time = 0;
          this.colonized = 1;
          this.cash = 1000;
          this.entsUsed = 0;
          this.pricingUsed = 0;
          this.promotionsUsed = 0;
          this.encouragementsUsed = 0;
          this.latency = [];
          this.talks = [];
          this.rd = rdConf.map((r) => r[1]);
          this.rdActive = rdConf.map((r) => 0);
          this.rdProgress = rdConf.map((r) => 0);
          this.invites = [];
          this.promoted = [];
          this.invested = [];
          this.encouraged = [];
          this.tagsResearched = [];
          this.exp = 0;
          this.flow = 0;
          this.pop = 0;
          this.income = 0;
          RSeed(1);
          for (let i = 200; i-- && this.stars.length < starsNumber;) {
              let star = new Star().generate();
              if (!this.stars.every((other) => star.name != other.name &&
                  (Math.abs(star.at[0] - other.at[0]) > 50 ||
                      Math.abs(star.at[1] - other.at[1]) > 20)))
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
      overflow(link) {
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
          return 1 + this.rd[RDSPEED] * 0.5 + this.exp / 10000;
      }
      date() {
          return 2100 + this.time / 10;
      }
      rdRemainingCost(id) {
          return (1 - this.rdProgress[id]) * this.rdFullCost(id);
      }
      rdFullCost(id) {
          return rdConf[id][2] + rdConf[id][3] * this.rd[id];
      }
      linkRange() {
          return 50 + this.rd[RANGE] * 25;
      }
      inRange(a, b) {
          return v2Dist(a.at, b.at) <= this.linkRange();
      }
      latencyOf(link) {
          return this.latency[link.ends[0].id].find((a) => a[0] == link.ends[1].id)[1];
      }
      recalculateLatency() {
          this.latency = this.stars.map((star) => Object.entries(star.links).map(([otherId, link]) => [
              Number(otherId),
              (link.length + 10 + this.overflow(link)) /
                  (1 + this.speedBoost() * link.width),
          ]));
      }
      addLink(a, b, width = 1) {
          let link = new Link(Star.order(a, b));
          link.width = width;
          a.registerLink(b, link);
          b.registerLink(a, link);
          this.links.push(link);
          return link;
      }
      serialise() {
          let save = Object.assign({}, this);
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
          for (let star of save.stars)
              this.deserialiseStar(star);
          for (let link of save.links)
              this.deserialiseLink(link);
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
      talk(start, end, tag) {
          let { route, distances } = this.findPath(start, end);
          let latency = 1000;
          let packets = 1;
          if (route) {
              latency = distances[end.id];
              let fee = 5 / (1 + latency / 100);
              if (this.promoted[tag]) {
                  fee /= 2;
                  packets *= 1 + this.promotingBonus();
              }
              if (this.rd[RESEARCH]) {
                  fee *= 1 + (this.tagsResearched[tag] | 0) * 0.25;
              }
              if (this.invested[tag]) {
                  fee *= 1 + this.invested[tag] * 0.25;
              }
              if (end.pricing == 1) {
                  fee *= 1 + this.pricingBonus();
                  packets /= 2;
              }
              else if (end.pricing == 1) {
                  fee /= 2;
                  packets *= 1 + this.pricingBonus();
              }
              packets = (packets | 0) + FR() * (packets - (packets | 0));
              end.income += fee * packets;
              this.cash += fee * packets;
              this.exp += packets;
              this.packets.push([start.id, end.id, tag, route]);
              for (let i = 0; i < route.length - 1; i++) {
                  let [a, b] = [this.stars[route[i]], this.stars[route[i + 1]]];
                  let link = a.links[b.id];
                  link.flow += packets;
                  link.talks[tag] += 1e-4 * packets;
                  link.talkers[start.id] += 1e-4 * packets;
                  link.talkers[end.id] += 1e-4 * packets;
              }
          }
          if (this.rd[RESEARCH] > 0 && this.tagsResearched[tag] < this.rd[RESEARCH]) {
              this.tagsResearched[tag] +=
                  (1 / tagResearchRate / Math.pow(2, (this.rd[RESEARCH] - 1))) * packets;
              if (this.tagsResearched[tag] > this.rd[RESEARCH]) {
                  this.tagsResearched[tag] = this.rd[RESEARCH];
              }
          }
          let intencity = 1e-3 * (1500 - latency) * packets;
          start.talkers[end.id] += intencity * 1e-4;
          end.talkers[start.id] += intencity * 1e-4;
          start.interact(end, intencity, tag);
          end.interact(start, -intencity, tag);
      }
      passiveIncome() {
          return this.pop / 2;
      }
      update(dt) {
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
              }
              else {
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
              for (let i = tagsNumber; i--;)
                  this.talks[i] += star.talks[i] * star.activity();
          this.talks = listNorm(this.talks);
          for (let i = 0; i < this.rdActive.length; i++) {
              if (this.rdActive[i] > 0)
                  if (this.doRD(i, dt))
                      this.rdActive[i]--;
          }
          let tag = R(tagsNumber);
          if (FR() < dt * Math.pow(this.talks[tag], 2) * 100) {
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
                  Math.pow(R(50), 2),
              ];
              console.log(`Unleashing ${severity} of ${tagsList[issue]} on ${star.name}`);
              star.has[issue] = severity;
          }
          return secondPassed;
      }
      updateStar(star, dt) {
          star.income /= 1 + dt;
          let issue = tagsNumber - R(6) - 1;
          if (Math.abs(star.has[issue]) > 3) {
              let other = this.stars[weightedRandom(this.stars.map((other) => other != star ? 1 / (v2Dist(star.at, other.at) + 0.1) : 0))];
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
              if ((R(1e6) / (v2Dist(star.at, other.at) + 0.1)) *
                  (path ? 5 : 1) *
                  star.pop *
                  (other.pop > 0 ? 10 : 1) >
                  500000) {
                  if (other.pop == 0)
                      this.colonized++;
                  star.log({ arrived: delta });
                  other.growCapped(delta);
                  other.log({ grow: delta });
              }
              else {
                  star.log({ migrate: delta });
                  star.growCapped(delta);
              }
              star.updateColor();
          }
      }
      doRD(id, dt) {
          let price = dt * 100 * this.rdSpeed();
          let delta = price / this.rdFullCost(id);
          if (this.cash < price)
              return;
          this.cash -= price;
          this.rdProgress[id] += delta;
          if (this.rdProgress[id] >= 1) {
              this.rd[id]++;
              this.rdProgress[id] = 0;
              return true;
          }
          return false;
      }
      findPath(start, end) {
          let path = breadthSearch(start.id, end.id, (starId) => this.latency[starId]);
          return path;
      }
      findDistances(start) {
          return breadthSearch(start.id, -1, (starId) => this.latency[starId]);
      }
      /*connect(a: Star, b: Star) {
        let link = a.linkTo(b);
        if (!link) link = this.addLink(a, b);
        return link;
      }*/
      startResearch(id) {
          this.rdActive[id]++;
      }
      toggleResearch(id) {
          if (this.rdActive[id])
              this.rdActive[id] = 0;
          else
              this.rdActive[id] = 1;
      }
      linkPrice() {
          return 100 * this.rd[ENTS];
      }
      linkBandwith(link) {
          return this.baseBandwith() + this.bandwithUpgrade() * (link.width - 1);
      }
      payForLink() {
          this.entsUsed++;
          this.cash -= this.linkPrice();
      }
      removeLink(link) {
          this.links.splice(this.links.indexOf(link), 1);
          link.ends[0].removeLink(link.ends[1]);
          link.ends[1].removeLink(link.ends[0]);
      }
      upgradeLink(link, delta) {
          if (delta == 1) {
              link.width++;
              this.payForLink();
          }
          else {
              this.entsUsed--;
              link.width--;
              if (link.width == 0)
                  this.removeLink(link);
          }
          this.recalculateLatency();
      }
      linkById(id) {
          return this.stars[id % 1000].links[(id / 1000) | 0];
      }
      togglePricing(star, w) {
          let prisingWas = star.pricing;
          if (star.pricing == w) {
              star.pricing = 0;
          }
          else {
              star.pricing = w;
          }
          this.pricingUsed += Math.abs(star.pricing) - Math.abs(prisingWas);
      }
      hasTagControls() {
          return !!(this.rd[PROMOTE] ||
              this.rd[INVEST] ||
              this.rd[RESEARCH] ||
              this.rd[ENCOURAGE]);
      }
      investCost(tag) {
          return 100000 * (this.invested[tag] + 1);
      }
      canInvest(tag) {
          return (this.cash >= this.investCost(tag) &&
              this.rd[INVEST] > (this.invested[tag] || 0));
      }
      encourageTag(tag) {
          console.assert(tag < 36);
          this.encouragementsUsed++;
          this.encouraged[tag] = encourageCooldown;
          let multiplier = 1 + (this.tagsResearched[tag] | 0) / 2;
          for (let star of this.stars) {
              star.has[tag] += 50 * multiplier;
          }
      }
      tagResearchComplete(tag) {
          return this.tagsResearched[tag] >= this.rd[RESEARCH];
      }
      options(rdn, tag) {
          if (!this.rd[rdn])
              return 0;
          switch (rdn) {
              case PROMOTE:
                  if (!this.promoted[tag] && this.promotionsUsed >= this.rd[PROMOTE])
                      return 0;
                  else
                      return this.promoted[tag] ? 2 : 1;
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
      tagControl(rdn, tag) {
          console.log(tag, rdn);
          switch (rdn) {
              case PROMOTE:
                  if (this.promoted[tag]) {
                      this.promoted[tag] = false;
                      this.promotionsUsed--;
                  }
                  else {
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
      researchExpRequired(r) {
          return r < 1 ? 0 : Math.pow(2, r) * 500;
      }
      researchImpossible(r) {
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

  const packetSpeed = 300;
  const RD = 0, OVERVIEW = 1, SAVES = 2;
  let page = RD;
  let debug = false;
  /*let s = 0
  for(let i=100;i--;)
    s+= i*i;
  console.log(s);*/
  function em(s) {
      return `${s}`.replace(/[0-9]+(\.[0-9]*)?/g, (n) => `<em>${(+n).toLocaleString("en-US", { maximumFractionDigits: 0 })}</em>`);
  }
  function play(gal) {
      for (let i = 0; i < 30000 && gal.colonized < 3; i++)
          gal.update(1 / 60);
      class PacketParticle {
          update(dtime) {
              if (paused)
                  return true;
              if (this.route.length > 0) {
                  let next = gal.stars[this.route[0]].at;
                  let distance = dtime * packetSpeed;
                  if (v2Dist(next, this.at) < distance) {
                      this.at = next;
                      this.route.shift();
                      this.update(R(1000) / 10000);
                  }
                  else {
                      let delta = v2Norm(v2Dif(this.at, next), distance);
                      this.at = v2Add(this.at, delta);
                  }
              }
              return this.route.length > 0;
          }
          render(c) {
              c.fillStyle = tagColors[this.tag];
              c.fillRect(this.at[0] - 1, this.at[1], 2, 2);
          }
      }
      class TextParticle {
          constructor(text, at, dieIn = 1) {
              this.text = text;
              this.at = at;
              this.dieIn = dieIn;
              this.t = 0;
          }
          update(dtime) {
              this.t += dtime;
              this.at[1] -= dtime * 30;
              return this.t < this.dieIn;
          }
          render(c) {
              c.fillStyle = `hsla(0,100%,100%,${100 * (1 - this.t / this.dieIn)}%)`;
              c.fillText(this.text, this.at[0], this.at[1]);
          }
      }
      function ref(id, text, color, size) {
          return `<span id=${id} class="ref" style="${color ? `color:${color}` : ``};${size ? `font-size:${size | 0}` : ``}">${text}</span> `;
      }
      let particles = [];
      let hovered = null, selected = null, highlighted = null, paused = false;
      let hoveredLink, selectedLink, highlightedLink;
      let selectedTag = -1, hoveredTag = -1;
      function unselect() {
          selected = hovered = highlighted = null;
          selectedLink = hoveredLink = highlightedLink = null;
          selectedTag = -1;
      }
      let mouse = { at: [0, 0], pressed: false };
      let C = document.getElementById("C");
      let D = document.getElementById("D");
      let c = C.getContext("2d");
      let d = D.getContext("2d");
      C.width = C.height = 900;
      D.width = D.height = 900;
      c.font = d.font = "14px Lucida Console, Monaco, monospace";
      let panel = document.getElementById("panel");
      let menuPanel = document.getElementById("menu");
      let time = 0, lasttime = 0;
      let starsImg = c.getImageData(0, 0, 900, 900);
      for (let i = 0; i < 10000; i++)
          starsImg.data.set([R(155) + 100, R(155) + 100, R(155) + 100, R(70)], R(900 * 900) * 4);
      let hitboxes = [];
      function calculateHitboxes() {
          for (let star of gal.stars) {
              hitboxes[star.id] = [
                  star.at[0] - 8.5,
                  star.at[1] - 9.5,
                  //18,
                  20 + (c.measureText(star.name).width | 0),
                  18,
              ];
          }
      }
      function localInfoShown() {
          return hovered || hoveredLink || selected || selectedLink;
      }
      function renderMenuButtons() {
          menuPanel.innerHTML = ["R&D", "Overview", "Saves"]
              .map((s, i) => `<button id="seePage:${i}" style="${i == page && !localInfoShown()
            ? "border-bottom:solid 1px black"
            : ""}"">${s}</button>`)
              .reverse()
              .join("");
      }
      function seePage(n) {
          page = n;
          renderMenuButtons();
          showInfo();
      }
      function insideRect(at, rect) {
          return [0, 1].every((i) => at[i] > rect[i] && at[i] < rect[i] + rect[i + 2]);
      }
      /*function hoverStar(star) {
        hovered = star;
      }*/
      function drawSegment(a, b, width = 1, color = "#fff", ctx = d) {
          ctx.strokeStyle = color;
          ctx.beginPath();
          ctx.lineWidth = width;
          ctx.moveTo(a[0], a[1]);
          ctx.lineTo(b[0], b[1]);
          ctx.stroke();
          ctx.lineWidth = 1;
      }
      function renderLink(link, ctx, bright = false) {
          let [a, b] = link.ends.map((s) => s.at);
          drawSegment(a, b, link.width * 2, `#666`, ctx);
          let overflow = gal.overflow(link);
          drawSegment(a, b, link.width * 2 + 4, `hsla(0,${Math.pow(overflow, 0.25) * 100}%,70%,${(bright ? 60 * (Math.sin(time * 10) + 1) : 0) + (overflow ? 40 : 0)}%)`, ctx);
      }
      function best(ii, f) {
          let [v, b] = [-1e99, null];
          for (let i of ii) {
              if (f(i) > v) {
                  v = f(i);
                  b = i;
              }
          }
          return b;
      }
      function alert(text, at) {
          particles.push(new TextParticle(text, at ? at.slice() : [450, 450], 0.5 + text.length / 20));
      }
      calculateHitboxes();
      renderStars();
      renderMenuButtons();
      window["seePage"] = seePage;
      D.onmousedown = (m) => {
          mouse.pressed = true;
          selectedTag = -1;
          if (hovered) {
              if (selected == hovered)
                  selected = null;
              else {
                  selected = hovered;
                  renderStars();
                  if (m.shiftKey) {
                      console.log(selected);
                      console.log(gal);
                  }
              }
              hoveredLink = selectedLink = null;
          }
          else if (hoveredLink) {
              if (m.shiftKey) {
                  console.log(selectedLink);
              }
              if (selectedLink == hoveredLink) {
                  selectedLink = null;
              }
              else {
                  selectedLink = hoveredLink;
              }
              selected = hovered = null;
          }
          else {
              selected = selectedLink = null;
          }
          if (paused)
              renderFlow();
          renderMenuButtons();
          return false;
      };
      function linkAffordable() {
          if (gal.entsLeft <= 0) {
              alert("No Entanglements left (increase in R&D)", selectedLink === null || selectedLink === void 0 ? void 0 : selectedLink.center());
          }
          else if (gal.cash < gal.linkPrice()) {
              alert(`Need $${gal.linkPrice()}`, selectedLink === null || selectedLink === void 0 ? void 0 : selectedLink.center());
          }
          else
              return true;
          return false;
      }
      D.onmouseup = (m) => {
          mouse.pressed = false;
          if (selected && hovered && selected != hovered) {
              selectedLink = selected.links[hovered.id];
              if (!selectedLink) {
                  if (!gal.inRange(selected, hovered)) {
                      alert("out of range", selected.at);
                  }
                  else if (linkAffordable()) {
                      gal.payForLink();
                      gal.addLink(selected, hovered);
                      alert(`-*1 -$${gal.linkPrice()}`, selected.at);
                      renderStars();
                  }
              }
              selected = null;
          }
          renderStars();
      };
      let drect = D.getBoundingClientRect();
      D.onmousemove = (m) => {
          mouse.at = [m.clientX - drect.left, m.clientY - drect.top];
          let wasHovered = hovered;
          hovered = null;
          hoveredTag = -1;
          for (let star of gal.stars) {
              if (insideRect(mouse.at, hitboxes[star.id])) {
                  hovered = star;
                  hoveredLink = null;
                  showInfo();
                  break;
              }
          }
          if (hovered && !wasHovered)
              showInfo();
          if (!hovered) {
              let nearest = best(gal.links, (l) => -l.distToPoint(mouse.at));
              if (nearest && nearest.distToPoint(mouse.at) < 0.5) {
                  hoveredLink = nearest;
                  showInfo();
              }
              else {
                  if (hoveredLink != null) {
                      hoveredLink = null;
                      showInfo();
                  }
              }
          }
          if (paused)
              renderFlow();
          if (wasHovered && !hovered) {
              showInfo();
              renderMenuButtons();
          }
      };
      function saveGame(slot) {
          let save = gal.serialise();
          save.packets = particles.filter((p) => p instanceof PacketParticle);
          let json = JSON.stringify(save);
          json = json.replace(/([0-9]+\.[0-9]+)/g, (n) => (+n).toPrecision(6));
          localStorage[`galcom${slot}`] = json;
          localStorage[`galcomname${slot}`] = `${new Date()
            .toISOString()
            .substr(0, 19)
            .replace("T", " ")}<br/>${gal.date().toFixed(1)} AD $${gal.cash | 0} *${gal.entsLeft}`;
          alert("SAVED", [450, 450]);
          showInfo();
      }
      function loadGame(slot) {
          particles = [];
          let stored = localStorage[`galcom${slot}`];
          let save = JSON.parse(stored);
          let packets = save.packets;
          if (packets) {
              for (let p of packets) {
                  let pp = new PacketParticle();
                  Object.assign(pp, p);
                  particles.push(pp);
              }
          }
          //delete save.packets;
          gal.deserialise(save);
          paused = false;
          alert("LOADED", [450, 450]);
          calculateHitboxes();
          renderStars();
      }
      onkeydown = (k) => {
          switch (k.key) {
              case " ":
                  paused = !paused;
                  renderFlow();
                  break;
              case "s":
                  saveGame(0);
                  break;
              case "l":
                  loadGame(0);
                  break;
              case "@":
                  debug = !debug;
                  showInfo();
                  break;
              case "!":
                  gal.cash += 1e6;
                  gal.rd = gal.rd.map((v, i) => v + gal.rdActive[i]);
                  gal.rdActive.fill(0);
                  gal.rdProgress.fill(0);
                  break;
          }
      };
      let header = document.getElementById("header");
      function updateHeader() {
          header.innerHTML = em(`${gal.date().toFixed(1)}AD Pop:${gal.pop.toFixed(1)}BL Money:$${gal.cash | 0} <span id="rdh:0">Entanglements:*${gal.entsLeft}</span> Sent:${gal.exp | 0}EB`);
      }
      function showInfo() {
          let shown = localInfoShown();
          let text = "";
          if (selectedTag >= 0 && !hovered && !hoveredLink) {
              text = `<h3>Tag</h3>`;
          }
          else if (shown instanceof Star) {
              text = starInfo(shown);
          }
          else if (shown instanceof Link) {
              text = linkInfo(shown);
          }
          else {
              switch (page) {
                  case RD:
                      text = rdInfo();
                      break;
                  case OVERVIEW:
                      text +=
                          em(`<p>${gal.date().toFixed(1)} AD</p>Money: $${gal.cash | 0}<br/>Entanglements: *${gal.entsLeft}<br/>Overcharge/discounts: ${gal.pricingUsed}/${gal.rd[PRICING]} <br/>Pop: ${gal.pop | 0} BL<br/>Income: $${(gal.income + gal.passiveIncome()) | 0}/s<br/>Sent: ${gal.exp | 0}EB<br/>Flow: ${gal.flow | 0}TB/s`) +
                              `<h4>Top topics</h4>${tagCloud(gal.talks)} <h4>Top systems</h4>${starCloud(gal.stars.map((star) => (star.pop * 5) / gal.pop), 40)}`;
                      break;
                  case SAVES:
                      for (let i = 0; i == 0 || localStorage[`galcom${i - 1}`]; i++) {
                          let name = localStorage[`galcomname${i}`];
                          text += `<button ${name ? "" : "disabled"} id="load:${i}">${name || "New Save"}</button><button id="save:${i}">Save</button>`;
                      }
                      text = `<div id="saves">${text}</div>`;
                      break;
              }
          }
          panel.innerHTML = text;
      }
      function rdInfo() {
          let text = [];
          for (let i = 0; i < gal.rd.length; i++) {
              let progress = gal.rdProgress[i] * 100;
              let style = `background: linear-gradient(90deg, #aaa ${progress}%, #${gal.rdActive[i] ? "444" : "000"} ${progress + 0.1}%)`;
              let researchImpossible = gal.researchImpossible(i);
              text.push(`${researchImpossible
                ? `<div id="rd:${i}" style="text-align:center">${researchImpossible}</div>`
                : `<button style="${style}" id="rd:${i}">${(gal.rdActive[i] > 1 ? `x${gal.rdActive[i]} ` : "") +
                    rdConf[i][0]}</button>`}<button style="visibility:${gal.rdActive[i] ? "" : "hidden"}" class="rdx" id="rdx:${i}">||</button><div>&nbsp;${gal.rd[i]}</div><div>$${gal.rdRemainingCost(i) | 0}</div>`);
          }
          if (gal.hasTagControls())
              text.push(`<div class="tagsControls">` +
                  tagsList
                      .map((name, row) => [name, "P", "I", "E", ""]
                      .map((v, col) => {
                      let showMode = 1;
                      let isButton = col > 0 && col < 4;
                      if (isButton)
                          showMode = gal.options([PROMOTE, INVEST, ENCOURAGE][col - 1], row);
                      if (col == 0) {
                          return `<div id="tag:${row}" style="cursor:pointer;color:${tagColor(row)}">#${tagsList[row]}</div>`;
                      }
                      if (col == 2 && gal.invested[row]) {
                          v = `<em>${gal.invested[row]}</em>`;
                          if (showMode == 0)
                              return `<div style="text-align: center;">${v}</div>`;
                      }
                      if (col == 3 && gal.rd[RESEARCH] && gal.encouraged[row]) {
                          return `<div style="text-align: center;"><em>${(gal.encouraged[row] / 10).toFixed(1)}</em></div>`;
                      }
                      if (col == 4 && gal.rd[RESEARCH]) {
                          return `<div>${((1 + gal.tagsResearched[row] - gal.rd[RESEARCH]) * 100) |
                            0}%</div>`;
                      }
                      if (showMode == 0)
                          return `<div></div>`;
                      return `<div class="${isButton ? "tagControl" : ""}" id="tagControl:${row}:${col}" style="background:${showMode == 2 ? "#888" : "#000"}">${v}</div>`;
                  })
                      .join(""))
                      .join("") +
                  `</div>`);
          return `<div id="rdmenu">${text.join("")}</div>`;
      }
      //Promote, Invest, Encourage, Research
      function linkInfo(link) {
          return `<button class="close">X</button><h3>${link.ends
            .map((star) => ref("star:" + star.id, `<big>${star.name}</big>`, starHsl(star)))
            .join(`&lt;${"=".repeat(link.width)}&gt; `)} </h3>
    <p>${em(`${link.flow | 0}/${gal.linkBandwith(link)}TB/s ${gal.latencyOf(link) | 0}ms`)}</p>
    <p><button id="linkup:-1">${link.width == 1 ? "Remove" : "Downgrade"}</button><button id="linkup:1">Expand</button></p>
    <h4>Top topics</h4>
    ${tagCloud(link.talks, 30)}
    <h4>Used by</h4>
    ${starCloud(link.talkers, 20)}
    `;
      }
      function debugInfo(star) {
          return (`<div class="stardbg">` +
              tagsList
                  .map((v, row) => [v, star.makes[row], star.has[row]]
                  .map((v, col) => `<div id="tag:${row}" style="color:${col ? `hsl(${v * 60 + 60},80%, 80%)` : tagColor(row)}">${col ? v.toFixed(2) : v}</div>`)
                  .join(""))
                  .join("") +
              `</div>Grit: ${star.grit.toFixed(1)} Capacity: ${star.capacity | 0}`);
      }
      function starInfo(star) {
          return (`<button class="close">X</button> <h3><big style="color:${starHsl(star)}">${star.name}</big> ${em(star.pop > 0
            ? `${star.pop.toPrecision(3)}BL $${star.income | 0}/s`
            : `Uninhabited`)}</h3>` +
              (star.pricing == 0 && gal.pricingLeft == 0
                  ? ``
                  : `<p><button ${star.pricing == -1 ? `class="enabled"` : ``} style="color:#8f8" id="pricing:${star.id}:-1">Discount</button><button ${star.pricing == 1 ? `class="enabled"` : ``} style="color:#f88" id="pricing:${star.id}:1">Overcharge</button></p>`) +
              (debug
                  ? debugInfo(star)
                  : `${Object.keys(star.links).length == 0
                    ? ""
                    : "<h4>Linked</h4> " +
                        Object.entries(star.links)
                            .map(([starId, link]) => ref("link:" + link.id, gal.stars[starId].name, starHsl(gal.stars[starId])))
                            .join("")}
      ${star.pop == 0
                    ? ``
                    : `<h4>Top topics</h4>
      ${tagCloud(star.talks, 30)}
      <h4>Friends</h4>
      ${starCloud(star.talkers, 20)}
      `}`));
      }
      function tagCloud(list, limit = 100) {
          return sortedTags(list)
              .slice(0, limit)
              .map(([tag, value]) => ref("tag:" + tag, "#" + tagsList[tag], tagColors[tag], Math.min(50, 10 + value * 200)))
              .join(" ");
      }
      function starHsl(star) {
          return `hsl(${star.color},100%,80%)`;
      }
      function starCloud(list, limit = 100) {
          return sortedTags(list)
              .slice(0, limit)
              .map(([star, value]) => value
              ? ref("star:" + star, gal.stars[star].name, starHsl(gal.stars[star]), 10 + Math.min(10, value * 100))
              : ``)
              .join(``);
      }
      function sortedTags(list) {
          return Object.entries(list).sort((a, b) => b[1] - a[1]);
      }
      function renderFlow() {
          d.clearRect(0, 0, 900, 900);
          let cl = document.getElementById("paused").classList;
          if (paused)
              cl.remove("off");
          else
              cl.add("off");
          for (let star of [hovered, highlighted].filter((s) => s)) {
              d.strokeStyle = `hsl(${star.color},100%,80%)`;
              d.strokeRect.apply(d, hitboxes[star.id]);
          }
          if (hoveredTag >= 0) {
              d.save();
              for (let star of gal.stars) {
                  if (star.pop == 0)
                      continue;
                  d.beginPath();
                  d.strokeStyle = tagColor(hoveredTag);
                  d.lineWidth = 0.5 + Math.pow(star.pop, 0.5) / 3;
                  d.arc(star.at[0], star.at[1], star.talks[hoveredTag] * 100, 0, Math.PI * 2);
                  d.stroke();
              }
              d.restore();
          }
          if (selected) {
              d.strokeStyle = `hsl(${selected.color},100%,40%)`;
              d.strokeRect.apply(d, hitboxes[selected.id]);
              if (mouse.pressed && hovered != selected) {
                  let dist = Math.min(gal.linkRange(), v2Dist(selected.at, mouse.at));
                  drawSegment(selected.at, v2Add(selected.at, v2Norm(v2Dif(selected.at, mouse.at), dist)), 1, "#fff", d);
                  d.fillStyle = "#888";
                  d.fillText((v2Dist(selected.at, mouse.at) | 0).toString(), mouse.at[0] + 10, mouse.at[1]);
                  for (let star of gal.stars) {
                      if (star != selected &&
                          star != hovered &&
                          v2Dist(selected.at, star.at) <= gal.linkRange()) {
                          d.strokeStyle = `hsla(${star.color},100%,40%,40%)`;
                          d.strokeRect.apply(d, hitboxes[star.id]);
                      }
                  }
              }
          }
          d.save();
          [hoveredLink, selectedLink, highlightedLink].forEach((link) => link && renderLink(link, d, true));
          d.restore();
          d.save();
          for (let p of particles) {
              p.render(d);
          }
          d.restore();
          for (let i = 0; i < gal.rdProgress.length; i++) {
              if (gal.rdProgress[i] != 0) {
                  d.fillStyle = gal.rdActive[i] ? "#ddd" : "#777";
                  d.beginPath();
                  //d.fillRect(0,i*30,5,gal.rdProgress[i]*30);
                  d.moveTo(10, 28 + i * 25);
                  d.arc(10, 28 + i * 25, 7, Math.PI * 0.5, Math.PI * (0.5 + 2 * gal.rdProgress[i]));
                  d.closePath();
                  d.fill();
              }
          }
          d.strokeStyle = "#fff";
      }
      function renderStars() {
          //c.clearRect(0, 0, 900, 900);
          c.putImageData(starsImg, 0, 0);
          c.lineWidth = 1;
          let distances;
          if (selected) {
              distances = gal.findDistances(selected).distances;
          }
          for (let star of gal.stars) {
              c.fillStyle = `hsl(${[`150,80%`, `0,0%`, `0,80%`][star.pricing + 1]}, ${star.pop == 0 ? 15 : Object.keys(star.links).length ? 70 : 40}%)`;
              let title = star.name +
                  (distances && distances[star.id]
                      ? "\n" + (distances[star.id] | 0) + "ms"
                      : "");
              c.fillText(title, star.at[0] + 8, star.at[1] + 5);
              c.save();
              let R = Math.pow(star.pop, 0.5) / 2 + 1;
              c.fillStyle = `hsla(${star.color},100%,70%,30%)`;
              c.fillRect(star.at[0] - 1.25, star.at[1] - R * 2 - 0.5, 1.5, R * 4);
              c.fillRect(star.at[0] - R * 2 - 0.5, star.at[1] - 1.25, R * 4, 1.5);
              for (let r = 1.5; r > 0.4; r -= 0.2) {
                  c.fillStyle = `hsla(${star.color},100%,${150 - r * 80}%,${100 - r * 60}%)`;
                  c.beginPath();
                  c.arc(star.at[0] - 0.5, star.at[1] - 0.5, R * r * 1.1, 0, Math.PI * 2);
                  c.fill();
              }
          }
          c.save();
          gal.links.forEach((l) => renderLink(l, c));
          c.restore();
      }
      function sendPacket(start, tag, route) {
          //let route = gal.findPath(gal.stars[start], gal.stars[end]);
          let p = new PacketParticle();
          p.route = route;
          p.tag = tag;
          p.at = gal.stars[start].at.slice();
          particles.push(p);
          p.update(R(1000) / 10000);
      }
      function update(t) {
          time = t / 1000;
          let dtime = Math.min(0.1, time - lasttime);
          particles = particles.filter((p) => p.update(dtime));
          if (!paused && !document.hidden) {
              if (gal.update(dtime))
                  renderStars();
              for (let i = 0; i < gal.packets.length && i < 3; i++) {
                  let p = gal.packets[i];
                  sendPacket(p[0], p[2], p[3]);
              }
              updateHeader();
              renderFlow();
              if (page == RD || (time | 0) != (lasttime | 0)) {
                  showInfo();
                  updateTooltip();
              }
          }
          lasttime = time;
          window.requestAnimationFrame(update);
      }
      function expandId(e) {
          let id = e.target.id;
          if (!id)
              return [];
          return id.split(":");
      }
      document.onmousedown = (e) => {
          let el = e.target;
          console.log(e);
          let a = expandId(e);
          let [v, w] = [Number(a[1]), Number(a[2])];
          console.log(a);
          if (el.classList.contains("close")) {
              selectedLink = selected = null;
              showInfo();
              renderMenuButtons();
              return;
          }
          switch (a[0]) {
              case "helpToggle":
              case "helpToggleHeader":
                  let help = document.getElementById("help");
                  let shown = help.style.display == "block";
                  if (shown) {
                      help.style.display = "none";
                  }
                  else {
                      help.style.display = "block";
                  }
                  break;
              case "seePage":
                  unselect();
                  seePage(v);
                  break;
              case "save":
                  return saveGame(v);
              case "load":
                  return loadGame(v);
              case "paused":
                  paused = !paused;
                  renderFlow();
                  return;
              case "rdh":
                  gal.rdActive[0]++;
                  paused = false;
                  break;
              case "rd":
                  gal.rdActive[v]++;
                  paused = false;
                  break;
              case "rdx":
                  gal.rdActive[v] = 0;
                  break;
              case "linkup":
                  if (v == 1 && !linkAffordable())
                      break;
                  gal.upgradeLink(selectedLink, v);
                  if (selectedLink.width == 0)
                      selectedLink = null;
                  renderStars();
                  break;
              case "link":
                  unselect();
                  let link = gal.linkById(v);
                  selectedLink = link;
                  break;
              case "star":
                  unselect();
                  selected = gal.stars[v];
                  break;
              /*case "tag":
                unselect();
                selectedTag = v;
                break;*/
              case "pricing":
                  gal.togglePricing(gal.stars[v], w);
                  renderStars();
                  break;
              case "tagControl":
                  gal.tagControl([PROMOTE, INVEST, ENCOURAGE][w - 1], v);
                  updateTooltip();
                  break;
          }
          if (paused)
              renderFlow();
          updateHeader();
          showInfo();
      };
      let tooltip = document.getElementById("tooltip");
      document.onmouseout = (e) => {
          let a = expandId(e);
          switch (a[0]) {
              case "tag":
                  hoveredTag = -1;
                  break;
          }
      };
      document.onmousemove = (e) => {
          let el = e.target;
          let a = expandId(e);
          let [v, w] = [Number(a[1]), Number(a[2])];
          switch (a[0]) {
              case "tag":
                  if (v != hoveredTag) {
                      hoveredTag = v;
                      renderFlow();
                  }
                  break;
              case "rdh":
                  updateTooltip(el, 0);
                  break;
              case "rd":
                  if (gal.exp >= gal.researchExpRequired(v))
                      updateTooltip(el, v);
                  break;
              case "pricing":
                  break;
              case "tagControl":
                  updateTooltip(el, v + 100, w);
                  break;
              case "link":
                  highlightedLink = gal.linkById(v);
                  highlighted = null;
                  break;
              case "star":
                  highlighted = gal.stars[v];
                  highlightedLink = null;
                  if (paused)
                      renderFlow();
                  break;
              default:
                  tooltip.style.opacity = "0";
                  highlighted = null;
                  highlightedLink = null;
                  hoveredTag = -1;
                  break;
          }
      };
      let tooltipShown = 0, tooltipCol = 0;
      function updateTooltip(el, newRow, newCol) {
          if (newCol >= 0)
              tooltipCol = newCol;
          if (newRow >= 0)
              tooltipShown = newRow;
          if (el) {
              let top = Math.max(50, el.offsetTop);
              tooltip.style.cssText = `top:${top}px; opacity:1`;
          }
          if (tooltipShown >= 0 && tooltipShown < 100) {
              tooltip.innerHTML = em(rdConf[tooltipShown][4](gal));
          }
          else if (tooltipShown >= 100) {
              let tag = tooltipShown - 100;
              switch (tooltipCol) {
                  case 1:
                      tooltip.innerHTML = gal.promoted[tag]
                          ? `Stop promoting ${tagSpan(tag)}.`
                          : `Promote ${tagSpan(tag)}.`;
                      break;
                  case 2:
                      tooltip.innerHTML = `Invest $${em(gal.investCost(tag))} into ${tagSpan(tag)}.`;
                      break;
                  case 3:
                      tooltip.innerHTML = `Encourage interest in ${tagSpan(tag)}`;
                      break;
                  default:
                      tooltip.innerHTML = tagSpan(tag);
              }
          }
      }
      function tagSpan(tag) {
          return `<span style="color:${tagColor(tag)}">#${tagsList[tag]}</span>`;
      }
      update(0);
  }

  let gal = new Galaxy();
  play(gal);

}());
