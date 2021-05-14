let font;
let ta;

function preload() {
  font = loadFont('./assets/Satoshi-Black.woff')
}

function setup() {
  frameRate(60)
  createCanvas(windowWidth, windowHeight)
  ta = new TextAutomata("EGE UZ", {
    font: font,
    fontSize: 180,
    lineHeight: 1.2
  })
}

function draw() {
  background(11)
  ta.render()
}


class TextAutomata {
  constructor(...args) {
    //receive input
    const text = args.filter(a => typeof a === "string")
    const config = args.find(a => typeof a === "object")
    //config properties
    this.baseText = text
    this.font = config.font
    this.fontSize = config.fontSize
    this.lineHeight = config.lineHeight || 1.5
    this.position = !config.position ?
      createVector(width / 2, height / 2) :
      config.position
    //operational properties
    this.resolution = 6; //grid resolution
    this.margin = 100; //margin around grid
    this.vectorText = this.initVectorText()
    this.vectorRect = this.getTextVectorRect(this.vectorText)
    this.grid = this.initCellGrid()
    this.initCellNeighbors()
    this.steps = 0;
  }

  /*** RENDER METHODS ***/

  render() {
    push()
    strokeWeight(1.5)
    this.grid.forEach(cell => {
      cell.render()
      if (this.mouseIsHovering()) {
        cell.generate()
        this.steps += 1;
      } else if (this.steps > 0) {
        cell.backstep()
        this.steps -= 1;
      }
    })
    pop()
  }

  /*** INIT METHODS ***/
  initVectorText() {
    // const vectorText = [] //an array of letters -> objects w/ vector array forming letters
    let { x: posx, y: posy } = this.position //starting position

    const vectorText = this.baseText.map(line => {
      //get text to points
      const raw = this.font.textToPoints(line, posx, posy, this.fontSize)
      //get base values for the vector rect
      const rect = this.getTextVectorRect(raw)
      // const letters = separateTextLetters(raw, 50)
      const textMargin = rect.x - posx
      const letters = this.repositionTextVector(
        this.separateTextLetters(raw, 50),
        { x: posx, y: posy },
        rect,
        textMargin
      )
      posy += rect.h * this.lineHeight
      //add letters to vectorText
      return letters;
    }).flat(1)

    return this.repositionTextVector(
      vectorText,
      { x: this.position.x, y: this.position.y },
      this.getTextVectorRect(vectorText)
    )
  }

  initCellGrid() {
    const grid = [];
    const { x, y, w, h } = this.vectorRect
    const m = this.margin
    const res = this.resolution
    for (let i = x - m; i < x + w + m; i += res) {
      for (let j = y - m; j < y + h + m; j += res) {
        const state = this.getInitialCellState(i, j, res)
        const cell = new Cell(i, j, res, state)
        grid.push(cell)
      }
    }
    return grid;
  }

  initCellNeighbors() {
    const { w } = this.vectorRect
    const res = this.resolution
    const cols = floor(w / res)
    const getCellNeighbors = i => [
      this.grid[i - 1], //west
      this.grid[i + 1], //east
      this.grid[i - cols], //north
      this.grid[i + cols], //south
      this.grid[i - cols - 1], //nw
      this.grid[i + cols - 1], //sw
      this.grid[i - cols + 1], //ne
      this.grid[i + cols + 1] //se
    ]
    this.grid.forEach((cell, i) => {
      cell.neighbors = [...new Set(getCellNeighbors(i))].filter(n => n !== undefined)
    })
  }


  renderVectorText() { //testing only
    push()
    fill(255)
    stroke(255)
    this.vectorText.forEach(letter => {
      beginShape()
      letter.forEach((pt) => {
        vertex(pt.x, pt.y)
      })
      endShape(CLOSE)
    })
    pop()
  }

  renderGuides() { //testing only
    push()
    fill('red')
    noStroke()
    rect(width / 2, 0, 1, height)
    rect(0, height / 2, width, 1)
    pop()
  }

  /*** HELPER METHODS  ***/
  //treating the text vector
  getTextVectorRect(textVector) {
    const x = Math.min(...textVector.flat().map(pt => pt.x))
    const y = Math.min(...textVector.flat().map(pt => pt.y))
    const w = Math.max(...textVector.flat().map(pt => pt.x)) - x
    const h = Math.max(...textVector.flat().map(pt => pt.y)) - y
    return { x, y, w, h }
  }

  repositionTextVector(letters, target, rect, margin = 0) {
    const centerX = target.x - (rect.w + margin) / 2;
    const centerY = target.y - rect.h / 2;
    const deltaX = centerX - rect.x;
    const deltaY = centerY - rect.y;
    return letters.map(letter =>
      letter.map(point =>
        createVector(point.x + deltaX, point.y + deltaY)
      )
    )
  }

  separateTextLetters(textPoints, maxSpace) {
    const letters = [];
    let letterIndex = 0;
    for (let i = 0; i < textPoints.length - 1; i++) {
      const thisPoint = textPoints[i]
      const nextPoint = textPoints[i + 1]
      //add current point to letter array
      if (letters[letterIndex]) {
        letters[letterIndex].push(thisPoint)
      } else {
        letters[letterIndex] = [thisPoint]
      }
      const distance = dist(thisPoint.x, thisPoint.y, nextPoint.x, nextPoint.y)
      if (distance >= maxSpace) {
        letterIndex += 1;
      }
    }
    return letters;
  }

  //generating automata cells
  getInitialCellState(x, y) {
    for (let i = 0; i < this.vectorText.length; i++) {
      const letter = this.vectorText[i]
      if (this.raycast(letter, x, y)) return 1;
    }
    return 0;
  }

  raycast(shape, x, y) {
    let count = 0;
    for (let i = 0; i < shape.length; i++) {
      const v1 = shape[i];
      const v2 = shape[(i + 1) % shape.length]
      if (west(v1, v2, x, y)) ++count;
    }
    return count % 2;

    function west(v1, v2, x, y) {
      if (v1.y <= v2.y) {
        if (y <= v1.y || y > v2.y || x >= v1.x && x >= v2.x) {
          return false;
        } else if (x < v1.x && x < v2.x) {
          return true;
        } else {
          return (y - v1.y) / (x - v1.x) > (v2.y - v1.y) / (v2.x - v1.x)
        }
      } else {
        return west(v2, v1, x, y)
      }
    }
  }

  //hover interaction
  mouseIsHovering() {
    const { x, y, w, h } = this.vectorRect;
    return mouseX >= x &&
      mouseX <= x + w &&
      mouseY >= y &&
      mouseY <= y + h
  }
}

class Cell {
  constructor(x, y, size, initialState) {
    this.x = x;
    this.y = y;
    this.size = size;
    this.initialState = initialState;
    this.state = initialState;
    this.history = [];
    this.neighbors; //initialized during TextAutomata init
  }

  render() {
    const clr = this.state === 1 ? 255 : 0
    fill(clr)
    stroke(clr)
    strokeWeight(this.size / 4)
    rect(this.x, this.y, this.size)
  }

  generate() {
    const aliveCells = this.neighbors.map(n => n.state).reduce((a, b) => a + b)
    const newState = this.determineState(this.state, aliveCells)
    this.history.push(this.state)
    this.state = newState
  }

  backstep() {
    this.state = this.history.pop()
  }

  determineState(cell, aliveCells) {
    if (cell === 1 && aliveCells < 2) {
      return 0
    } else if (cell === 1 && aliveCells > 3) {
      return 0
    } else if (cell === 0 && aliveCells === 3) {
      return 1
    } else {
      return cell
    }
  }
}