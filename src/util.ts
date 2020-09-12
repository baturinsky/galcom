export type v2 = [number, number];

let seed: number;
export let R = (n) => (seed = (seed * 69069 + 1) % 2 ** 31) % n;
export let FR = () => R(1e9)/1e9;
export function RSeed(n: number) {
  seed = n;
}

export function v2Len(v: v2) {
  return Math.sqrt(v[0] ** 2 + v[1] ** 2);
}

export function v2Dist(a: v2, b: v2) {
  return v2Len(v2Dif(a, b));
}

export function v2Dif(a: v2, b: v2): v2 {
  return [b[0] - a[0], b[1] - a[1]];
}

export function v2Add(a: v2, b: v2): v2 {
  return [b[0] + a[0], b[1] + a[1]];
}

export function v2Norm(v: v2, n = 1): v2 {
  const scale = n / (v2Len(v) || 1);
  return [v[0] * scale, v[1] * scale];
}

export function distLinePoint(a: v2, b: v2, c: v2) {
  return (
    Math.abs(
      (b[1] - a[1]) * c[0] - (b[0] - a[0]) * c[1] + b[0] * a[1] - b[1] * a[0]
    ) / v2Dist(a, b)
  );
}

//If end is >= 0, returns path. Otherwise, returns distances

export function breadthSearch(
  start: number,
  end: number,
  neighbors: (star: number) => [number, number][]
): {route:number[], distances:number[], prev:number[]} {
  let bag = [start];
  let distances = [];
  distances[start] = 0;
  let prev = [];
  let route:number[] = null
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
  return {route, distances, prev}
}

export function listSum(a: number[]) {
  return a.reduce((x, y) => x + y, 0);
}

export function weightedRandom(a: number[]) {
  let roll = FR()*listSum(a) - a[0];
  if(roll==0)
    return a[0];
  let i = 0;
  while (roll >= 0) roll -= a[++i];
  return i;
}

export function listNorm(list:number[], newSum = 1, speed = 1){
  let sum = listSum(list);
  let factor = 1 + (newSum - sum) * speed / sum;
  return sum?list.map(v=>v * factor):list;
}
