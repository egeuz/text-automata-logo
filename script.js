let font;
let ta;

function preload() {
  font = loadFont('./assets/Satoshi-Black.woff')
}

function setup() {
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
    this.vectorText = this.initVectorText()
    this.grid = this.initCellGrid()
  }

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
    const {x, y, w, h} = this.getTextVectorRect(this.vectorText)
    const margin = 100;
    const resolution = 10;

    for (let i = x - margin; i < x + w + margin; i += resolution) {
      for (let j = y - margin; j < y + h + margin; i += resolution) {
        const state = this.getInitialCellState(i, j, resolution)
        const cell = new Cell(i, j, resolution, state)
        grid.push(cell)
      } 
    }

  }

  render() {
    push()
    fill('red')
    noStroke()
    rect(width / 2, 0, 1, height)
    rect(0, height / 2, width, 1)
    pop()

    let clr = 255
    strokeWeight(5)
    this.vectorText.forEach(letter => {
      beginShape()
      letter.forEach((pt) => {
        stroke(clr)
        vertex(pt.x, pt.y)
      })
      endShape(CLOSE)
    })
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
  getInitialCellState(x, y, res) {
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
}

class Cell {
  constructor(x, y, size, initialState) {
    this.x = x;
    this.y = y;
    this.size = size;
    this.initialState = initialState;
    this.state = initialState;
    this.history = [initialState];
  }
}