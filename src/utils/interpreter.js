/**
 * Brainfuck 解释器
 * 支持8个基本指令: > < + - . , [ ]
 */
export class BrainfuckInterpreter {
  constructor(code, input = '', outputCallback = null) {
    this.code = this.sanitizeCode(code)
    this.input = input
    this.inputPointer = 0
    this.outputCallback = outputCallback
    
    // 内存相关
    this.memory = new Array(30000).fill(0)
    this.pointer = 0
    
    // 执行相关
    this.instructionPointer = 0
    this.instructionCount = 0
    
    // 断点相关
    this.breakpoints = new Set()
    this.hitBreakpoint = false
    
    // 指令执行统计
    this.instructionProfile = {
      '>': 0,
      '<': 0,
      '+': 0,
      '-': 0,
      '.': 0,
      ',': 0,
      '[': 0,
      ']': 0
    }
    
    // 预处理循环跳转表
    this.jumpTable = this.buildJumpTable()
  }
  
  /**
   * 清理代码,只保留有效的Brainfuck指令
   * 支持 # 注释（整行注释和行内注释）
   */
  sanitizeCode(code) {
    // 先处理注释：移除 # 及其后面的所有内容（直到换行）
    const lines = code.split('\n')
    const codeWithoutComments = lines.map(line => {
      const commentIndex = line.indexOf('#')
      if (commentIndex !== -1) {
        return line.substring(0, commentIndex)
      }
      return line
    }).join('\n')
    
    // 然后只保留有效的Brainfuck指令
    const validChars = '><+-.,[]'
    return codeWithoutComments.split('').filter(char => validChars.includes(char)).join('')
  }
  
  /**
   * 构建循环跳转表,优化[]的匹配
   */
  buildJumpTable() {
    const jumpTable = {}
    const stack = []
    
    for (let i = 0; i < this.code.length; i++) {
      if (this.code[i] === '[') {
        stack.push(i)
      } else if (this.code[i] === ']') {
        if (stack.length === 0) {
          throw new Error(`不匹配的 ']' 在位置 ${i}`)
        }
        const openBracket = stack.pop()
        jumpTable[openBracket] = i
        jumpTable[i] = openBracket
      }
    }
    
    if (stack.length > 0) {
      throw new Error(`不匹配的 '[' 在位置 ${stack[stack.length - 1]}`)
    }
    
    return jumpTable
  }
  
  /**
   * 执行单步
   */
  step() {
    if (this.isFinished()) {
      return false
    }
    
    // 检查是否命中断点
    if (this.breakpoints.has(this.instructionPointer) && !this.hitBreakpoint) {
      this.hitBreakpoint = true
      return 'breakpoint' // 返回特殊值表示命中断点
    }
    
    this.hitBreakpoint = false
    
    const instruction = this.code[this.instructionPointer]
    
    // 统计指令执行次数
    if (this.instructionProfile[instruction] !== undefined) {
      this.instructionProfile[instruction]++
    }
    
    switch (instruction) {
      case '>':
        this.pointer++
        if (this.pointer >= this.memory.length) {
          this.pointer = 0 // 循环回到开始
        }
        break
        
      case '<':
        this.pointer--
        if (this.pointer < 0) {
          this.pointer = this.memory.length - 1 // 循环到末尾
        }
        break
        
      case '+':
        this.memory[this.pointer] = (this.memory[this.pointer] + 1) % 256
        break
        
      case '-':
        this.memory[this.pointer] = (this.memory[this.pointer] - 1 + 256) % 256
        break
        
      case '.':
        const outputChar = String.fromCharCode(this.memory[this.pointer])
        if (this.outputCallback) {
          this.outputCallback(outputChar)
        }
        break
        
      case ',':
        if (this.inputPointer < this.input.length) {
          this.memory[this.pointer] = this.input.charCodeAt(this.inputPointer)
          this.inputPointer++
        } else {
          this.memory[this.pointer] = 0 // 输入结束时设置为0
        }
        break
        
      case '[':
        if (this.memory[this.pointer] === 0) {
          this.instructionPointer = this.jumpTable[this.instructionPointer]
        }
        break
        
      case ']':
        if (this.memory[this.pointer] !== 0) {
          this.instructionPointer = this.jumpTable[this.instructionPointer]
        }
        break
    }
    
    this.instructionPointer++
    this.instructionCount++
    return true
  }
  
  /**
   * 运行到结束
   */
  run() {
    while (!this.isFinished()) {
      this.step()
    }
  }
  
  /**
   * 检查是否执行完成
   */
  isFinished() {
    return this.instructionPointer >= this.code.length
  }
  
  /**
   * 重置解释器状态
   */
  reset() {
    this.memory = new Array(30000).fill(0)
    this.pointer = 0
    this.instructionPointer = 0
    this.instructionCount = 0
    this.inputPointer = 0
    this.hitBreakpoint = false
  }
  
  /**
   * 添加断点
   */
  addBreakpoint(position) {
    this.breakpoints.add(position)
  }
  
  /**
   * 删除断点
   */
  removeBreakpoint(position) {
    this.breakpoints.delete(position)
  }
  
  /**
   * 切换断点
   */
  toggleBreakpoint(position) {
    if (this.breakpoints.has(position)) {
      this.breakpoints.delete(position)
      return false
    } else {
      this.breakpoints.add(position)
      return true
    }
  }
  
  /**
   * 清除所有断点
   */
  clearBreakpoints() {
    this.breakpoints.clear()
  }
  
  /**
   * 获取所有断点
   */
  getBreakpoints() {
    return Array.from(this.breakpoints)
  }
}
