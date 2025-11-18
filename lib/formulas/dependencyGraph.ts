import { FormulaParser } from './parser'
import { parseA1Notation, getCellsInRange } from './utils'

export class DependencyGraph {
  private graph: Map<string, Set<string>> = new Map()
  private reverseGraph: Map<string, Set<string>> = new Map()

  // Add a dependency: fromCell depends on toCell
  addDependency(fromCell: string, toCell: string): void {
    if (!this.graph.has(fromCell)) {
      this.graph.set(fromCell, new Set())
    }
    this.graph.get(fromCell)!.add(toCell)

    if (!this.reverseGraph.has(toCell)) {
      this.reverseGraph.set(toCell, new Set())
    }
    this.reverseGraph.get(toCell)!.add(fromCell)
  }

  // Remove all dependencies for a cell
  removeDependencies(cell: string): void {
    const dependencies = this.graph.get(cell)
    if (dependencies) {
      dependencies.forEach((dep) => {
        const reverseDeps = this.reverseGraph.get(dep)
        if (reverseDeps) {
          reverseDeps.delete(cell)
          if (reverseDeps.size === 0) {
            this.reverseGraph.delete(dep)
          }
        }
      })
      this.graph.delete(cell)
    }
  }

  // Get all cells that depend on the given cell (direct dependents)
  getDependents(cell: string): string[] {
    return Array.from(this.reverseGraph.get(cell) || [])
  }

  // Get all cells that the given cell depends on (direct dependencies)
  getDependencies(cell: string): string[] {
    return Array.from(this.graph.get(cell) || [])
  }

  // Get all cells that should be recalculated when the given cell changes (transitive closure)
  getAffectedCells(cell: string): string[] {
    const affected = new Set<string>()
    const queue = [cell]

    while (queue.length > 0) {
      const current = queue.shift()!
      const dependents = this.getDependents(current)

      dependents.forEach((dep) => {
        if (!affected.has(dep)) {
          affected.add(dep)
          queue.push(dep)
        }
      })
    }

    return Array.from(affected)
  }

  // Check if there's a circular dependency
  hasCircularDependency(cell: string, visited = new Set<string>()): boolean {
    if (visited.has(cell)) {
      return true
    }

    visited.add(cell)
    const dependencies = this.getDependencies(cell)

    for (const dep of dependencies) {
      if (this.hasCircularDependency(dep, new Set(visited))) {
        return true
      }
    }

    return false
  }

  // Update dependencies for a cell based on its formula
  updateCellDependencies(cell: string, formula: string): void {
    // Remove old dependencies
    this.removeDependencies(cell)

    // If no formula, nothing to add
    if (!formula || !formula.startsWith('=')) {
      return
    }

    // Parse formula to find cell references
    const parser = new FormulaParser(formula)
    const tokens = parser.tokenize()

    const dependencies = new Set<string>()

    tokens.forEach((token) => {
      if (token.type === 'CELL') {
        dependencies.add(token.value)
      } else if (token.type === 'RANGE') {
        const cells = getCellsInRange(token.value)
        cells.forEach((c) => dependencies.add(c))
      }
    })

    // Add new dependencies
    dependencies.forEach((dep) => {
      this.addDependency(cell, dep)
    })
  }

  // Get calculation order (topological sort)
  getCalculationOrder(cells: string[]): string[] {
    const result: string[] = []
    const visited = new Set<string>()
    const temp = new Set<string>()

    const visit = (cell: string): boolean => {
      if (temp.has(cell)) {
        // Circular dependency detected
        return false
      }
      if (visited.has(cell)) {
        return true
      }

      temp.add(cell)
      const dependencies = this.getDependencies(cell)

      for (const dep of dependencies) {
        if (!visit(dep)) {
          return false
        }
      }

      temp.delete(cell)
      visited.add(cell)
      result.push(cell)
      return true
    }

    for (const cell of cells) {
      if (!visited.has(cell)) {
        if (!visit(cell)) {
          // Circular dependency detected
          console.error(`Circular dependency detected involving ${cell}`)
          return cells // Return original order if circular dependency
        }
      }
    }

    return result
  }

  clear(): void {
    this.graph.clear()
    this.reverseGraph.clear()
  }
}
