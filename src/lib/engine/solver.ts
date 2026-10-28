import { isPlayable } from './graph'
import type { Board } from './types'

/**
 * Lo que el jugador sabe del tablero. `domains[id]` es un bitmask de los
 * pesos posibles de la celda: bit 0 = sin mina, bit 1 = mina, bit 2 = doble.
 * Una celda está determinada cuando su dominio tiene un solo bit.
 */
export interface Knowledge {
  revealed: boolean[]
  domains: number[]
}

export interface Deduction {
  safe: number[]
  mines: number[]
  /** Explicación corta, para el power-up Pista. */
  reason: string
}

export interface StepResult extends Deduction {
  knowledge: Knowledge
}

export interface SolveResult {
  solved: boolean
  steps: Deduction[]
}

interface Constraint {
  /** Celdas sin determinar que suman `target`. */
  vars: number[]
  target: number
  /** Celda con el número que origina la restricción; -1 = total de minas. */
  src: number
}

/** Celdas por componente a partir de las cuales no se enumera. */
const ENUM_LIMIT = 20

const SAFE = 0b001
const dmin = (d: number) => (d & 1 ? 0 : d & 2 ? 1 : 2)
const dmax = (d: number) => (d & 4 ? 2 : d & 2 ? 1 : 0)
const isFixed = (d: number) => (d & (d - 1)) === 0

const at = (board: Board, id: number) =>
  `(${board.cells[id].x + 1},${board.cells[id].y + 1})`

const numberAt = (board: Board, id: number) =>
  `el ${board.cells[id].adjacent} en ${at(board, id)}`

const capitalize = (s: string) => s[0].toUpperCase() + s.slice(1)

/** Información pública: la config dice si hay minas dobles y cuántas. */
const fullDomain = (board: Board) =>
  board.cells.some((c) => c.mineWeight === 2) ? 0b111 : 0b011

const totalWeight = (board: Board) =>
  board.cells.reduce((sum, c) => sum + c.mineWeight, 0)

/** Conocimiento a partir de lo visible en el tablero (ignora banderas). */
export function createKnowledge(board: Board): Knowledge {
  const full = fullDomain(board)
  const revealed = board.cells.map((c) => c.revealed && isPlayable(board, c.id))
  const domains = board.cells.map((c) =>
    revealed[c.id] || !isPlayable(board, c.id) ? SAFE : full,
  )
  return { revealed, domains }
}

const isUnknown = (board: Board, k: Knowledge, id: number) =>
  isPlayable(board, id) && !k.revealed[id] && !isFixed(k.domains[id])

function buildConstraints(board: Board, k: Knowledge) {
  const local: Constraint[] = []
  for (const cell of board.cells) {
    if (!k.revealed[cell.id] || cell.fog || cell.mineWeight > 0) continue
    const vars: number[] = []
    let fixed = 0
    for (const n of board.neighbors[cell.id]) {
      if (isFixed(k.domains[n])) fixed += dmin(k.domains[n])
      else vars.push(n)
    }
    if (vars.length) {
      local.push({ vars, target: cell.adjacent - fixed, src: cell.id })
    }
  }

  const vars: number[] = []
  let fixed = 0
  board.cells.forEach((c) => {
    if (!isPlayable(board, c.id)) return
    if (isUnknown(board, k, c.id)) vars.push(c.id)
    else fixed += dmin(k.domains[c.id])
  })
  const global: Constraint = {
    vars,
    target: totalWeight(board) - fixed,
    src: -1,
  }
  return { local, global }
}

/**
 * Acota los dominios de una restricción: un valor `v` de una celda es
 * posible solo si el resto puede sumar `target - v`. Con pesos 0/1 equivale
 * a la regla trivial (restante 0 → seguras, restante = máximo → minas).
 */
function tighten(c: Constraint, domains: number[]): Map<number, number> {
  let minSum = 0
  let maxSum = 0
  for (const v of c.vars) {
    minSum += dmin(domains[v])
    maxSum += dmax(domains[v])
  }
  const changes = new Map<number, number>()
  for (const id of c.vars) {
    const d = domains[id]
    const restMin = minSum - dmin(d)
    const restMax = maxSum - dmax(d)
    let next = 0
    for (let v = 0; v <= 2; v++) {
      if (d & (1 << v) && restMin <= c.target - v && c.target - v <= restMax) {
        next |= 1 << v
      }
    }
    // next === 0: contradicción; no se aplica (conocimiento inconsistente)
    if (next !== d && next !== 0) changes.set(id, next)
  }
  return changes
}

function result(
  k: Knowledge,
  domains: number[],
  changed: Iterable<number>,
  reason: string,
): StepResult {
  const safe: number[] = []
  const mines: number[] = []
  for (const id of changed) {
    const before = k.domains[id]
    const after = domains[id]
    if (after === SAFE && before !== SAFE) safe.push(id)
    else if (!(after & 1) && before & 1) mines.push(id)
  }
  return { safe, mines, reason, knowledge: { ...k, domains } }
}

function trivialReason(
  board: Board,
  c: Constraint,
  changes: Map<number, number>,
) {
  const values = [...changes.values()]
  if (c.src === -1) {
    return `Quedan ${c.target} de peso en minas para ${c.vars.length} celdas ocultas`
  }
  const who = capitalize(numberAt(board, c.src))
  if (values.every((d) => d === SAFE)) return `${who} ya tiene todas sus minas`
  if (values.every((d) => !(d & 1))) {
    return `${who} solo se completa si sus celdas ocultas son minas`
  }
  return `${who} limita las minas a su alrededor`
}

function trivialRule(
  board: Board,
  k: Knowledge,
  constraints: Constraint[],
  batch: boolean,
): StepResult | null {
  const domains = k.domains.slice()
  const changed = new Set<number>()
  let reason = ''
  for (const c of constraints) {
    // En batch los dominios ya acotados pueden dejar variables determinadas
    const live = { ...c, vars: c.vars.filter((v) => !isFixed(domains[v])) }
    if (live.vars.length !== c.vars.length) {
      live.target -= c.vars
        .filter((v) => isFixed(domains[v]))
        .reduce((s, v) => s + dmin(domains[v]), 0)
    }
    const changes = tighten(live, domains)
    if (!changes.size) continue
    if (!reason) reason = trivialReason(board, live, changes)
    for (const [id, d] of changes) {
      domains[id] = d
      changed.add(id)
    }
    if (!batch) break
  }
  return changed.size ? result(k, domains, changed, reason) : null
}

/** Si A ⊂ B, entonces B − A suma `tB − tA`. */
function subsetRule(
  board: Board,
  k: Knowledge,
  local: Constraint[],
  global: Constraint,
): StepResult | null {
  const byVar = new Map<number, Constraint[]>()
  for (const c of local) {
    for (const v of c.vars) {
      const list = byVar.get(v)
      if (list) list.push(c)
      else byVar.set(v, [c])
    }
  }
  const globalSet = new Set(global.vars)

  for (const a of local) {
    const candidates = [...(byVar.get(a.vars[0]) ?? []), global]
    for (const b of candidates) {
      if (b === a || b.vars.length <= a.vars.length) continue
      const bSet = b === global ? globalSet : new Set(b.vars)
      if (!a.vars.every((v) => bSet.has(v))) continue
      const aSet = new Set(a.vars)
      const derived: Constraint = {
        vars: b.vars.filter((v) => !aSet.has(v)),
        target: b.target - a.target,
        src: b.src,
      }
      const changes = tighten(derived, k.domains)
      if (!changes.size) continue
      const domains = k.domains.slice()
      for (const [id, d] of changes) domains[id] = d
      const reason =
        b === global
          ? `${capitalize(numberAt(board, a.src))} y las minas restantes (${b.target}) lo determinan`
          : `Comparando ${numberAt(board, a.src)} con ${numberAt(board, b.src)}`
      return result(k, domains, changes.keys(), reason)
    }
  }
  return null
}

/**
 * Enumera todas las asignaciones válidas de `vars` y devuelve, por celda,
 * el bitmask de valores que aparecen en alguna. `null` si no hay solución.
 * Corta en cuanto ninguna celda puede acotarse.
 */
function enumerate(
  vars: number[],
  constraints: Constraint[],
  domains: number[],
): number[] | null {
  const pos = new Map(vars.map((v, i) => [v, i]))
  const cons = constraints.filter((c) => c.vars.every((v) => pos.has(v)))
  const varCons: number[][] = vars.map(() => [])
  const sums = cons.map(() => 0)
  const remMin = cons.map(() => 0)
  const remMax = cons.map(() => 0)
  cons.forEach((c, ci) => {
    for (const v of c.vars) {
      varCons[pos.get(v)!].push(ci)
      remMin[ci] += dmin(domains[v])
      remMax[ci] += dmax(domains[v])
    }
  })

  const possible = vars.map(() => 0)
  let saturated = 0
  let found = false
  const assignment: number[] = vars.map(() => 0)

  const ok = (ci: number) =>
    sums[ci] + remMin[ci] <= cons[ci].target &&
    cons[ci].target <= sums[ci] + remMax[ci]

  const visit = (i: number): boolean => {
    if (i === vars.length) {
      found = true
      for (let j = 0; j < vars.length; j++) {
        const before = possible[j]
        possible[j] |= 1 << assignment[j]
        if (before !== possible[j] && possible[j] === domains[vars[j]]) {
          saturated++
        }
      }
      // true = abortar: ya no se puede deducir nada
      return saturated === vars.length
    }
    const d = domains[vars[i]]
    const lo = dmin(d)
    const hi = dmax(d)
    for (let v = 0; v <= 2; v++) {
      if (!(d & (1 << v))) continue
      assignment[i] = v
      let valid = true
      for (const ci of varCons[i]) {
        sums[ci] += v
        remMin[ci] -= lo
        remMax[ci] -= hi
        if (!ok(ci)) valid = false
      }
      const stop = valid && visit(i + 1)
      for (const ci of varCons[i]) {
        sums[ci] -= v
        remMin[ci] += lo
        remMax[ci] += hi
      }
      if (stop) return true
    }
    return false
  }

  visit(0)
  return found ? possible : null
}

/** Componentes conexas de la frontera, en orden BFS (mejor poda). */
function components(local: Constraint[]): number[][] {
  const byVar = new Map<number, Constraint[]>()
  for (const c of local) {
    for (const v of c.vars) {
      const list = byVar.get(v)
      if (list) list.push(c)
      else byVar.set(v, [c])
    }
  }
  const seen = new Set<number>()
  const out: number[][] = []
  for (const start of byVar.keys()) {
    if (seen.has(start)) continue
    const comp: number[] = []
    const queue = [start]
    seen.add(start)
    for (let i = 0; i < queue.length; i++) {
      const v = queue[i]
      comp.push(v)
      for (const c of byVar.get(v)!) {
        for (const w of c.vars) {
          if (!seen.has(w)) {
            seen.add(w)
            queue.push(w)
          }
        }
      }
    }
    out.push(comp)
  }
  return out.sort((a, b) => a.length - b.length)
}

function enumerationRule(
  board: Board,
  k: Knowledge,
  local: Constraint[],
  global: Constraint,
): StepResult | null {
  const tryGroup = (vars: number[], cons: Constraint[], reason: string) => {
    const possible = enumerate(vars, cons, k.domains)
    if (!possible) return null
    const changes = vars.filter((v, i) => possible[i] !== k.domains[v])
    if (!changes.length) return null
    const domains = k.domains.slice()
    vars.forEach((v, i) => (domains[v] = possible[i]))
    return result(k, domains, changes, reason)
  }

  // Pocas celdas ocultas: enumerar todo incluyendo el total de minas
  if (global.vars.length && global.vars.length <= ENUM_LIMIT) {
    const order = [...components(local).flat()]
    const inOrder = new Set(order)
    for (const v of global.vars) if (!inOrder.has(v)) order.push(v)
    const res = tryGroup(
      order,
      [...local, global],
      `Contando las ${global.target} minas restantes, todas las combinaciones lo confirman`,
    )
    if (res) return res
  }

  for (const comp of components(local)) {
    if (comp.length > ENUM_LIMIT) continue
    const res = tryGroup(
      comp,
      local,
      `Todas las combinaciones posibles cerca de ${at(board, comp[0])} lo confirman`,
    )
    if (res) return res
  }
  return null
}

/**
 * Una deducción lógica a partir de `knowledge`, probando reglas de menor a
 * mayor costo. `batch` aplica la regla trivial a todas las restricciones de
 * una vez (para `solve`); sin él devuelve una sola, con su razón exacta.
 */
export function step(
  board: Board,
  knowledge: Knowledge,
  { batch = false }: { batch?: boolean } = {},
): StepResult | null {
  const { local, global } = buildConstraints(board, knowledge)
  return (
    trivialRule(board, knowledge, [...local, global], batch) ??
    subsetRule(board, knowledge, local, global) ??
    enumerationRule(board, knowledge, local, global)
  )
}

/** Revela celdas en el conocimiento usando el tablero real (flood-fill). */
function open(board: Board, k: Knowledge, ids: number[]): Knowledge {
  const revealed = k.revealed.slice()
  const domains = k.domains.slice()
  const queue: number[] = []
  const push = (id: number) => {
    if (revealed[id] || !isPlayable(board, id)) return
    revealed[id] = true
    domains[id] = SAFE
    queue.push(id)
  }
  ids.forEach(push)
  for (let i = 0; i < queue.length; i++) {
    if (board.cells[queue[i]].adjacent === 0) {
      board.neighbors[queue[i]].forEach(push)
    }
  }
  return { revealed, domains }
}

/**
 * Simula una partida desde `firstClick` usando solo lógica. `solved` es
 * true si se revelan todas las celdas seguras sin adivinar.
 */
export function solve(board: Board, firstClick: number): SolveResult {
  if (board.cells[firstClick].mineWeight > 0)
    return { solved: false, steps: [] }

  const blank = createKnowledge({
    ...board,
    cells: board.cells.map((c) => (c.revealed ? { ...c, revealed: false } : c)),
  })
  let k = open(board, blank, [firstClick])
  const steps: Deduction[] = []

  for (;;) {
    const res = step(board, k, { batch: true })
    if (!res) break
    for (const id of res.safe) {
      if (board.cells[id].mineWeight > 0) {
        throw new Error(`Solver: dedujo segura una mina en ${at(board, id)}`)
      }
    }
    steps.push({ safe: res.safe, mines: res.mines, reason: res.reason })
    const pending = board.cells
      .filter(
        (c) =>
          isPlayable(board, c.id) &&
          !res.knowledge.revealed[c.id] &&
          res.knowledge.domains[c.id] === SAFE,
      )
      .map((c) => c.id)
    k = open(board, res.knowledge, pending)
  }

  const solved = board.cells.every(
    (c) => c.mineWeight > 0 || !isPlayable(board, c.id) || k.revealed[c.id],
  )
  return { solved, steps }
}
