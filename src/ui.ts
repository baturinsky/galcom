import {
  Galaxy,
  rdConf,
  PROMOTE,
  INVEST,
  ENCOURAGE,
  RESEARCH,
  PRICING,
} from "./Galaxy";
import { Link } from "./Link";
import { Star, tagColors, tagsList, tagColor } from "./Star";
import { v2Dist, v2Dif, v2Norm, v2Add, v2, R } from "./util";

const packetSpeed = 300;
const RD = 0,
  OVERVIEW = 1,
  SAVES = 2;
let page = RD;
let debug = false;

/*let s = 0
for(let i=100;i--;)
  s+= i*i;
console.log(s);*/

function em(s:string|number){
  return `${s}`.replace(
    /[0-9]+(\.[0-9]*)?/g,
    (n)=>`<em>${(+n).toLocaleString('en-US', {maximumFractionDigits:0})}</em>`
  )  
}

export function play(gal: Galaxy) {
  for (let i = 0; i < 30000 && gal.colonized < 3; i++) gal.update(1 / 60);

  interface Particle {
    update(dtime: number): boolean;
    render(c: CanvasRenderingContext2D): void;
  }

  class PacketParticle implements Particle {
    tag: number;
    at: v2;
    route: number[];

    update(dtime: number) {
      if (paused) return true;
      if (this.route.length > 0) {
        let next = gal.stars[this.route[0]].at;
        let distance = dtime * packetSpeed;
        if (v2Dist(next, this.at) < distance) {
          this.at = next;
          this.route.shift();
          this.update(R(1000) / 10000);
        } else {
          let delta = v2Norm(v2Dif(this.at, next), distance);
          this.at = v2Add(this.at, delta);
        }
      }
      return this.route.length > 0;
    }

    render(c: CanvasRenderingContext2D) {
      c.fillStyle = tagColors[this.tag];
      c.fillRect(this.at[0] - 1, this.at[1], 2, 2);
    }
  }

  class TextParticle implements Particle {
    t = 0;

    constructor(public text: string, public at: v2, public dieIn = 1) {}

    update(dtime: number) {
      this.t += dtime;
      this.at[1] -= dtime * 30;
      return this.t < this.dieIn;
    }

    render(c: CanvasRenderingContext2D) {
      c.fillStyle = `hsla(0,100%,100%,${100 * (1 - this.t / this.dieIn)}%)`;
      c.fillText(this.text, this.at[0], this.at[1]);
    }
  }

  function ref(
    id: string | number,
    text: string,
    color?: string,
    size?: number
  ) {
    return `<span id=${id} class="ref" style="${
      color ? `color:${color}` : ``
    };${size ? `font-size:${size | 0}` : ``}">${text}</span> `;
  }

  let particles: Particle[] = [];

  let hovered: Star = null,
    selected: Star = null,
    highlighted: Star = null,
    paused = false;

  let hoveredLink: Link, selectedLink: Link, highlightedLink: Link;

  let selectedTag = -1,
    hoveredTag = -1;

  function unselect() {
    selected = hovered = highlighted = null;
    selectedLink = hoveredLink = highlightedLink = null;
    selectedTag = -1;
  }

  let mouse = { at: [0, 0] as v2, pressed: false };

  let C = document.getElementById("C") as HTMLCanvasElement;
  let D = document.getElementById("D") as HTMLCanvasElement;
  let c = C.getContext("2d");
  let d = D.getContext("2d");
  C.width = C.height = 900;
  D.width = D.height = 900;
  c.font = d.font = "14px Lucida Console, Monaco, monospace";
  let panel = document.getElementById("panel");
  let menuPanel = document.getElementById("menu");
  let time = 0,
    lasttime = 0;

  let starsImg = c.getImageData(0, 0, 900, 900);
  for (let i = 0; i < 10000; i++)
    starsImg.data.set(
      [R(155) + 100, R(155) + 100, R(155) + 100, R(70)],
      R(900 * 900) * 4
    );

  let hitboxes: number[][] = [];

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

  function localInfoShown(){
    return hovered || hoveredLink || selected || selectedLink;
  } 

  function renderMenuButtons() {
    menuPanel.innerHTML = ["R&D", "Overview", "Saves"]
      .map(
        (s, i) =>
          `<button id="seePage:${i}" style="${
            i == page && !localInfoShown() ? "border-bottom:solid 1px black" : ""
          }"">${s}</button>`
      )
      .reverse()
      .join("");
  }

  function seePage(n: number) {
    page = n;
    unselect();
    renderMenuButtons();
    showInfo();
  }

  function insideRect(at, rect) {
    return [0, 1].every(
      (i) => at[i] > rect[i] && at[i] < rect[i] + rect[i + 2]
    );
  }

  /*function hoverStar(star) {
    hovered = star;
  }*/

  function drawSegment(
    a: v2,
    b: v2,
    width: number = 1,
    color: string = "#fff",
    ctx: CanvasRenderingContext2D = d
  ) {
    ctx.strokeStyle = color;
    ctx.beginPath();
    ctx.lineWidth = width;
    ctx.moveTo(a[0], a[1]);
    ctx.lineTo(b[0], b[1]);
    ctx.stroke();
    ctx.lineWidth = 1;
  }

  function renderLink(
    link: Link,
    ctx: CanvasRenderingContext2D,
    bright = false
  ) {
    let [a, b] = link.ends.map((s) => s.at);
    drawSegment(a, b, link.width * 2, `#666`, ctx);
    let overflow = gal.overflow(link);
    drawSegment(
      a,
      b,
      link.width * 2 + 4,
      `hsla(0,${overflow ** 0.25 * 100}%,70%,${
        (bright ? 60 * (Math.sin(time * 10) + 1) : 0) + (overflow ? 40 : 0)
      }%)`,
      ctx
    );
  }

  function best<T>(ii: T[], f: (T) => number): T {
    let [v, b] = [-1e99, null as T];
    for (let i of ii) {
      if (f(i) > v) {
        v = f(i);
        b = i;
      }
    }
    return b;
  }

  function alert(text: string, at: v2) {
    particles.push(
      new TextParticle(text, at.slice() as v2, 0.5 + text.length / 20)
    );
  }

  calculateHitboxes();

  renderStars();

  renderMenuButtons();

  window["seePage"] = seePage;

  D.onmousedown = (m) => {
    mouse.pressed = true;
    selectedTag = -1;
    if (hovered) {
      if (selected) selected = null;
      else {
        selected = hovered;

        renderStars();

        if (m.shiftKey) {
          console.log(selected);
          console.log(gal);
        }
      }

      hoveredLink = selectedLink = null;
    } else if (hoveredLink) {
      if (m.shiftKey) {
        console.log(selectedLink);
      }
      if (selectedLink) {
        selectedLink = null;
      } else {
        selectedLink = hoveredLink;
      }
      selected = hovered = null;
    } else {
      selected = selectedLink = null;
    }
    if (paused) renderFlow();
    renderMenuButtons();
    return false;
  };

  function linkAffordable() {
    if (gal.entsLeft <= 0) {
      alert("No Entanglements left (increase in R&D)", selected?.at);
    } else if (gal.cash < gal.linkPrice()) {
      alert(`Need $${gal.linkPrice()}`, selected?.at);
    } else return true;
    return false;
  }

  D.onmouseup = (m) => {
    mouse.pressed = false;
    if (selected && hovered && selected != hovered) {
      selectedLink = selected.links[hovered.id];
      if (!selectedLink) {
        if (!gal.inRange(selected, hovered)) {
          alert("out of range", selected.at);
        } else if (linkAffordable()) {
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

    if (hovered && !wasHovered) showInfo();

    if (!hovered) {
      let nearest = best(gal.links, (l: Link) => -l.distToPoint(mouse.at));
      if (nearest && nearest.distToPoint(mouse.at) < 0.5) {
        hoveredLink = nearest;
        showInfo();
      } else {
        if (hoveredLink != null) {
          hoveredLink = null;
          showInfo();
        }
      }
    }

    if (paused) renderFlow();

    if (wasHovered && !hovered) {
      showInfo();
      renderMenuButtons();
    };
  };

  function saveGame(slot: number) {
    let save = gal.serialise();
    save.packets = particles.filter((p) => p instanceof PacketParticle);
    let json = JSON.stringify(save);
    json = json.replace(/([0-9]+\.[0-9]+)/g, (n)=>(+n).toPrecision(6))
    localStorage[`galcom${slot}`] = json;
    localStorage[`galcomname${slot}`] = `${new Date()
      .toISOString()
      .substr(0, 19)
      .replace("T", " ")}<br/>${gal.date().toFixed(1)} AD $${gal.cash | 0} *${
      gal.entsLeft
    }`;
    alert("SAVED", [450, 450]);
    showInfo();
  }

  function loadGame(slot: number) {
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
      case "!":
        debug = !debug;
        showInfo();
        break;
      case "@":
        gal.cash += 1e6;
        gal.rd = gal.rd.map((v, i) => v + gal.rdActive[i]);
        gal.rdActive.fill(0);
        gal.rdProgress.fill(0);
        break;
    }
  };

  let header = document.getElementById("header");

  function updateHeader() {
    header.innerHTML = em(`${gal.date().toFixed(1)}AD Pop:${gal.pop.toFixed(1)}BL Money:$${
      gal.cash | 0
    } <span id="rdh:0">Entanglements:*${gal.entsLeft}</span> Sent:${gal.exp|0}EB`);
  }

  function showInfo() {
    let shown: Link | Star = localInfoShown();
    let text = "";

    if (selectedTag >= 0 && !hovered && !hoveredLink) {
      text = `<h3>Tag</h3>`;
    } else if (shown instanceof Star) {
      text = starInfo(shown);
    } else if (shown instanceof Link) {
      text = linkInfo(shown);
    } else {
      switch (page) {
        case RD:
          text = rdInfo();
          break;
        case OVERVIEW:
          text += em(`<p>${gal.date().toFixed(1)} AD</p>Money: $${
            gal.cash | 0
          }<br/>Entanglements: *${gal.entsLeft}<br/>Overcharge/discounts: ${
            gal.pricingUsed
          }/${gal.rd[PRICING]} <br/>Pop: ${gal.pop | 0} BL<br/>Income: $${
            (gal.income + gal.passiveIncome()) | 0
          }/s<br/>Sent: ${gal.exp | 0}EB<br/>Flow: ${
            gal.flow | 0
          }TB/s`) + `<h4>Top topics</h4>${tagCloud(gal.talks)} <h4>Top systems</h4>${starCloud(gal.stars.map(star=>star.pop*5/gal.pop), 40)}`;
          break;
        case SAVES:
          for (let i = 0; i == 0 || localStorage[`galcom${i - 1}`]; i++) {
            let name = localStorage[`galcomname${i}`];
            text += `<button ${name ? "" : "disabled"} id="load:${i}">${
              name || "New Save"
            }</button><button id="save:${i}">Save</button>`;
          }
          text = `<div id="saves">${text}</div>`;
          break;
      }
    }
    panel.innerHTML = text;
  }

  function rdInfo() {
    let text: string[] = [];
    for (let i = 0; i < gal.rd.length; i++) {
      let progress = gal.rdProgress[i] * 100;
      let style = `background: linear-gradient(90deg, #aaa ${progress}%, #${
        gal.rdActive[i] ? "444" : "000"
      } ${progress + 0.1}%)`;
      let researchImpossible = gal.researchImpossible(i);
      text.push(
        `${
          researchImpossible
            ? `<div id="rd:${i}" style="text-align:center">${researchImpossible}</div>`
            : `<button style="${style}" id="rd:${i}">${
                (gal.rdActive[i] > 1 ? `x${gal.rdActive[i]} ` : "") +
                rdConf[i][0]
              }</button>`
        }<button style="visibility:${
          gal.rdActive[i] ? "" : "hidden"
        }" class="rdx" id="rdx:${i}">||</button><div>&nbsp;${
          gal.rd[i]
        }</div><div>$${gal.rdRemainingCost(i) | 0}</div>`
      );
    }

    if (gal.hasTagControls())
      text.push(
        `<div class="tagsControls">` +
          tagsList
            .map((name, row) =>
              [name, "P", "I", "E", ""]
                .map((v, col) => {
                  let showMode = 1;
                  let isButton = col > 0 && col < 4;
                  if (isButton)
                    showMode = gal.options(
                      [PROMOTE, INVEST, ENCOURAGE][col - 1],
                      row
                    );
                  if (col == 0) {
                    return `<div id="tag:${row}" style="cursor:pointer;color:${tagColor(
                      row
                    )}">#${tagsList[row]}</div>`;
                  }
                  if (col == 2 && gal.invested[row]) {
                    v = `<em>${gal.invested[row]}</em>`;
                    if (showMode == 0)
                      return `<div style="text-align: center;">${v}</div>`;
                  }
                  if (col == 3 && gal.rd[RESEARCH] && gal.encouraged[row]) {
                    return `<div style="text-align: center;"><em>${(
                      gal.encouraged[row] / 10
                    ).toFixed(1)}</em></div>`;
                  }
                  if (col == 4 && gal.rd[RESEARCH]) {
                    return `<div>${
                      ((1 + gal.tagsResearched[row] - gal.rd[RESEARCH]) * 100) |
                      0
                    }%</div>`;
                  }
                  if (showMode == 0) return `<div></div>`;
                  return `<div class="${
                    isButton ? "tagControl" : ""
                  }" id="tagControl:${row}:${col}" style="background:${
                    showMode == 2 ? "#888" : "#000"
                  }">${v}</div>`;
                })
                .join("")
            )
            .join("") +
          `</div>`
      );

    return `<div id="rdmenu">${text.join("")}</div>`;
  }

  //Promote, Invest, Encourage, Research

  function linkInfo(link: Link) {
    return `<button class="close">X</button><h3>${link.ends
      .map((star) =>
        ref("star:" + star.id, `<big>${star.name}</big>`, starHsl(star))
      )
      .join(`&lt;${"=".repeat(link.width)}&gt; `)} </h3>
    <p>${em(`${link.flow | 0}/${gal.linkBandwith(link)}TB/s ${gal.latencyOf(link)|0}ms`)}</p>
    <p><button id="linkup:-1">${
      link.width == 1 ? "Remove" : "Downgrade"
    }</button><button id="linkup:1">Expand</button></p>
    <h4>Top topics</h4>
    ${tagCloud(link.talks, 30)}
    <h4>Used by</h4>
    ${starCloud(link.talkers, 20)}
    `;
  }

  function debugInfo(star: Star) {
    return (
      `<div class="stardbg">` +
      tagsList
        .map((v, row) =>
          [v, star.makes[row], star.has[row]]
            .map(
              (v: number, col) =>
                `<div id="tag:${row}" style="color:${
                  col ? `hsl(${v * 60 + 60},80%, 80%)` : tagColor(row)
                }">${col ? v.toFixed(2) : v}</div>`
            )
            .join("")
        )
        .join("") +
      `</div>Grit: ${star.grit.toFixed(1)} Capacity: ${star.capacity|0}`
    );
  }

  function starInfo(star: Star) {
    return (
      `<button class="close">X</button> <h3><big style="color:${starHsl(
        star
      )}">${star.name}</big> ${em(
        star.pop > 0
          ? `${star.pop.toPrecision(3)}BL $${star.income | 0}/s`
          : `Uninhabited`
      )}</h3>` +
      (star.pricing == 0 && gal.pricingLeft == 0
        ? ``
        : `<p><button ${
            star.pricing == -1 ? `class="enabled"` : ``
          } style="color:#8f8" id="pricing:${
            star.id
          }:-1">Discount</button><button ${
            star.pricing == 1 ? `class="enabled"` : ``
          } style="color:#f88" id="pricing:${
            star.id
          }:1">Overcharge</button></p>`) +
      (debug
        ? debugInfo(star)
        : `${
            Object.keys(star.links).length == 0
              ? ""
              : "<h4>Linked</h4> " +
                Object.entries(star.links)
                  .map(([starId, link]) =>
                    ref(
                      "link:" + link.id,
                      gal.stars[starId].name,
                      starHsl(gal.stars[starId])
                    )
                  )
                  .join("")
          }
      ${
        star.pop == 0
          ? ``
          : `<h4>Top topics</h4>
      ${tagCloud(star.talks, 30)}
      <h4>Friends</h4>
      ${starCloud(star.talkers, 20)}
      `
      }`)
    );
  }

  function tagCloud(list: number[], limit = 100) {
    return sortedTags(list)
      .slice(0, limit)
      .map(([tag, value]) =>
        ref(
          "tag:" + tag,
          "#" + tagsList[tag],
          tagColors[tag],
          Math.min(50, 10 + value * 200)
        )
      )
      .join(" ");
  }

  function starHsl(star: Star) {
    return `hsl(${star.color},100%,80%)`;
  }

  function starCloud(list: number[], limit = 100) {
    return sortedTags(list)
      .slice(0, limit)
      .map(([star, value]) =>
        value
          ? ref(
              "star:" + star,
              gal.stars[star].name,
              starHsl(gal.stars[star]),
              10 + Math.min(10, value * 100)
            )
          : ``
      )
      .join(``);
  }

  function sortedTags(list: number[]) {
    return Object.entries(list).sort((a, b) => b[1] - a[1]);
  }

  function renderFlow() {
    d.clearRect(0, 0, 900, 900);

    document.getElementById("paused").style.display = paused ? "" : "none";

    for (let star of [hovered, highlighted].filter((s) => s)) {
      d.strokeStyle = `hsl(${star.color},100%,80%)`;
      d.strokeRect.apply(d, hitboxes[star.id]);
    }

    if (hoveredTag >= 0) {
      d.save();
      for (let star of gal.stars) {
        if(star.pop ==0)
          continue;
        d.beginPath();
        d.strokeStyle = tagColor(hoveredTag);
        d.lineWidth = 0.5 + star.pop ** 0.5 / 3;
        d.arc(
          star.at[0],
          star.at[1],
          star.talks[hoveredTag] * 100,
          0,
          Math.PI * 2
        );
        d.stroke();
      }
      d.restore();
    }

    if (selected) {
      d.strokeStyle = `hsl(${selected.color},100%,40%)`;
      d.strokeRect.apply(d, hitboxes[selected.id]);
      if (mouse.pressed && hovered != selected) {
        let dist = Math.min(gal.linkRange(), v2Dist(selected.at, mouse.at));
        drawSegment(
          selected.at,
          v2Add(selected.at, v2Norm(v2Dif(selected.at, mouse.at), dist)),
          1,
          "#fff",
          d
        );
        d.fillStyle = "#888";
        d.fillText(
          (v2Dist(selected.at, mouse.at) | 0).toString(),
          mouse.at[0] + 10,
          mouse.at[1]
        );

        for (let star of gal.stars) {
          if (
            star != selected &&
            star != hovered &&
            v2Dist(selected.at, star.at) <= gal.linkRange()
          ) {
            d.strokeStyle = `hsla(${star.color},100%,40%,40%)`;
            d.strokeRect.apply(d, hitboxes[star.id]);
          }
        }
      }
    }

    d.save();
    [hoveredLink, selectedLink, highlightedLink].forEach(
      (link) => link && renderLink(link, d, true)
    );
    d.restore();

    d.save();
    for (let p of particles) {
      p.render(d);
    }
    d.restore();

    for(let i=0;i<gal.rdProgress.length;i++){
      if(gal.rdProgress[i]!=0){
        d.fillStyle = gal.rdActive[i]?"#ddd":"#777";
        d.beginPath()
        //d.fillRect(0,i*30,5,gal.rdProgress[i]*30);
        d.moveTo(10,28 + i*25);        
        d.arc(10,28 + i*25,7,Math.PI*0.5,Math.PI*(0.5 + 2*gal.rdProgress[i]));
        d.closePath();
        d.fill()
      }
    }

    d.strokeStyle = "#fff";
  }

  function renderStars() {
    //c.clearRect(0, 0, 900, 900);
    c.putImageData(starsImg, 0, 0);
    c.lineWidth = 1;

    let distances: number[];
    if (selected) {
      distances = gal.findDistances(selected).distances;
    }
    for (let star of gal.stars) {
      c.fillStyle = `hsl(${[`150,80%`, `0,0%`, `0,80%`][star.pricing + 1]}, ${
        star.pop == 0 ? 15 : Object.keys(star.links).length ? 70 : 40
      }%)`;
      let title =
        star.name +
        (distances && distances[star.id]
          ? "\n" + (distances[star.id] | 0) + "ms"
          : "");
      c.fillText(title, star.at[0] + 8, star.at[1] + 5);
      c.save();
      let R = star.pop ** 0.5 / 2 + 1;
      c.fillStyle = `hsla(${star.color},100%,70%,30%)`;
      c.fillRect(star.at[0] - 1.25, star.at[1] - R * 2 - 0.5, 1.5, R * 4);
      c.fillRect(star.at[0] - R * 2 - 0.5, star.at[1] - 1.25, R * 4, 1.5);
      for (let r = 1.5; r > 0.4; r -= 0.2) {
        c.fillStyle = `hsla(${star.color},100%,${150 - r * 80}%,${
          100 - r * 60
        }%)`;
        c.beginPath();
        c.arc(star.at[0] - 0.5, star.at[1] - 0.5, R * r * 1.1, 0, Math.PI * 2);
        c.fill();
      }
    }
    c.save();
    gal.links.forEach((l) => renderLink(l, c));
    c.restore();
  }

  function sendPacket(start: number, tag: number, route: number[]) {
    //let route = gal.findPath(gal.stars[start], gal.stars[end]);
    let p = new PacketParticle();
    p.route = route;
    p.tag = tag;
    p.at = gal.stars[start].at.slice() as v2;
    particles.push(p);
    p.update(R(1000) / 10000);
  }

  function update(t: number) {
    time = t / 1000;
    let dtime = Math.min(0.1, time - lasttime);

    particles = particles.filter((p) => p.update(dtime));

    if (!paused && !document.hidden) {
      if (gal.update(dtime)) renderStars();

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

  function expandId(e: MouseEvent): string[] {
    let id = (e.target as HTMLElement).id;
    if (!id) return [];
    return id.split(":");
  }

  document.onmousedown = (e) => {
    let el = e.target as HTMLElement;
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
      case "seePage":
        seePage(v);
        break;
      case "save":
        return saveGame(v);
      case "load":
        return loadGame(v);
      case "paused":
        paused = false;
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
        if (v == 1 && !linkAffordable()) break;
        gal.upgradeLink(selectedLink, v);
        if (selectedLink.width == 0) selectedLink = null;
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
    if (paused) renderFlow();
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
    let el = e.target as HTMLElement;
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
        if(gal.exp >= gal.researchExpRequired(v))
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
        if (paused) renderFlow();
        break;
      default:
        tooltip.style.opacity = "0";
        highlighted = null;
        highlightedLink = null;
        hoveredTag = -1;
        break;
    }
  };

  let tooltipShown = 0,
    tooltipCol = 0;

  function updateTooltip(el?: HTMLElement, newRow?: number, newCol?: number) {
    if (newCol >= 0) tooltipCol = newCol;

    if (newRow >= 0) tooltipShown = newRow;

    if (el) {
      let top = Math.max(50,el.offsetTop);
      tooltip.style.cssText = `top:${top}px; opacity:1`;
    }

    if (tooltipShown >= 0 && tooltipShown < 100) {
      tooltip.innerHTML = em((rdConf[tooltipShown][4](gal) as string));
    } else if (tooltipShown >= 100) {
      let tag = tooltipShown - 100;
      switch (tooltipCol) {
        case 1:
          tooltip.innerHTML = gal.promoted[tag]
            ? `Stop promoting ${tagSpan(tag)}.`
            : `Promote ${tagSpan(tag)}.`;
          break;
        case 2:
          tooltip.innerHTML = `Invest $${em(gal.investCost(tag))} into ${tagSpan(
            tag
          )}.`;
          break;
        case 3:
          tooltip.innerHTML = `Encourage interest in ${tagSpan(tag)}`;
          break;
        default:
          tooltip.innerHTML = tagSpan(tag);
      }
    }
  }

  function tagSpan(tag: number) {
    return `<span style="color:${tagColor(tag)}">#${tagsList[tag]}</span>`;
  }

  update(0);
}
