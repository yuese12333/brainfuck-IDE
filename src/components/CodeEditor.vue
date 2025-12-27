<template>
  <div class="code-editor">
    <div class="editor-header">
      <div class="header-top">
        <h3>代码编辑器</h3>
        <div class="editor-actions">
          <button @click="checkCode" class="check-btn" :disabled="isRunning">
            🔍 检查
          </button>
          <button @click="importCode" class="import-btn" :disabled="isRunning">
            📁 导入
          </button>
          <button @click="exportCode" class="export-btn" :disabled="!localCode">
            💾 导出
          </button>
          <button @click="clearCode" class="clear-btn" :disabled="isRunning">
            🗑️ 清空
          </button>
        </div>
      </div>
      <div v-if="checkErrors.length > 0" class="error-panel">
        <div class="error-header">
          <span>⚠️ 发现 {{ checkErrors.length }} 个错误</span>
          <button @click="checkErrors = []" class="close-errors">✕</button>
        </div>
        <div class="error-list">
          <div v-for="(error, index) in checkErrors" :key="index" class="error-item">
            <span class="error-line">行 {{ error.line }}</span>
            <span class="error-message">{{ error.message }}</span>
          </div>
        </div>
      </div>
      <div v-else-if="checkSuccess" class="success-panel">
        <span>✅ 代码检查通过</span>
        <button @click="checkSuccess = false" class="close-success">✕</button>
      </div>
      <input 
        type="file" 
        ref="fileInputRef" 
        @change="handleFileImport" 
        accept=".bf,.b,.brainfuck,.txt"
        style="display: none;"
      />
    </div>
    <div class="editor-container">
      <div class="line-numbers" ref="lineNumbersRef">
        <div 
          v-for="n in lineCount" 
          :key="n" 
          class="line-number"
        >
          {{ n }}
        </div>
      </div>
      <div class="editor-wrapper">
        <!-- 高亮显示层 -->
        <pre 
          class="code-highlight" 
          ref="highlightRef" 
          v-html="highlightedCode"
        ></pre>
        <!-- 输入层 -->
        <textarea
          v-model="localCode"
          @input="updateCode"
          @scroll="syncScroll"
          @mouseup="handleTextSelection"
          @click="checkBracketMatch"
          @keyup="checkBracketMatch"
          ref="textareaRef"
          class="code-textarea"
          spellcheck="false"
          :disabled="isRunning"
          placeholder="在此输入Brainfuck代码...&#10;支持 # 注释（整行或行内）"
        ></textarea>
      </div>
    </div>
    <div class="editor-footer">
      <div class="instruction-buttons">
        <button 
          v-for="(instr, index) in instructions" 
          :key="instr.char"
          @click="insertInstruction(instr.char)"
          :class="['instr-btn', `instr-btn-${index + 1}`, { 'btn-pressed': pressedKey === shortcuts[index] }]"
          :title="`快捷键: ${shortcuts[index]}`"
        >
          <span class="instr-key">{{ shortcuts[index] }}</span>
          <span class="instr-char">{{ instr.char }}</span>
          <span class="instr-desc">{{ instr.desc }}</span>
        </button>
      </div>
      <span class="char-count">字符数: {{ charCount }} | 有效指令: {{ validInstructionCount }}</span>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted, nextTick, onBeforeUnmount } from 'vue'

const props = defineProps({
  modelValue: {
    type: String,
    default: ''
  },
  isRunning: {
    type: Boolean,
    default: false
  },
  currentPosition: {
    type: Number,
    default: 0
  },
  breakpoints: {
    type: Set,
    default: () => new Set()
  },
  shortcuts: {
    type: Array,
    default: () => ['1', '2', '3', '4', '5', '6', '7', '8']
  },
  isSettingsOpen: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['update:modelValue', 'run', 'step', 'stop', 'reset', 'toggle-breakpoint'])

const localCode = ref(props.modelValue)
const textareaRef = ref(null)
const highlightRef = ref(null)
const lineNumbersRef = ref(null)
const fileInputRef = ref(null)
const pressedKey = ref('')
const checkErrors = ref([])
const checkSuccess = ref(false)
const matchingBrackets = ref({ start: -1, end: -1 }) // 匹配的方括号位置

// 指令定义
const instructions = [
  { char: '>', desc: '右移' },
  { char: '<', desc: '左移' },
  { char: '+', desc: '加1' },
  { char: '-', desc: '减1' },
  { char: '.', desc: '输出' },
  { char: ',', desc: '输入' },
  { char: '[', desc: '循环开始' },
  { char: ']', desc: '循环结束' }
]

// 计算属性
const lineCount = computed(() => {
  return localCode.value.split('\n').length
})

const charCount = computed(() => {
  return localCode.value.length
})

const validInstructionCount = computed(() => {
  const validChars = '><+-.,[]'
  return localCode.value.split('').filter(char => validChars.includes(char)).length
})

// 语法高亮
const highlightedCode = computed(() => {
  if (!localCode.value) return '<span class="placeholder-text">在此输入Brainfuck代码...<br/>支持 # 注释（整行或行内）</span>'
  
  // 计算当前执行位置在原始代码中的位置
  let validInstructionIndex = 0
  let absoluteCharPosition = 0  // 在整个代码中的字符位置
  const validChars = '><+-.,[]'
  
  let result = ''
  const lines = localCode.value.split('\n')
  
  lines.forEach((line, index) => {
    const commentIndex = line.indexOf('#')
    
    if (commentIndex === -1) {
      // 没有注释，正常高亮
      result += highlightLine(line, validInstructionIndex, absoluteCharPosition)
      validInstructionIndex += line.split('').filter(char => validChars.includes(char)).length
    } else if (commentIndex === 0) {
      // 整行注释
      result += `<span class="comment">${escapeHtml(line)}</span>`
    } else {
      // 行内注释
      const code = line.substring(0, commentIndex)
      const comment = line.substring(commentIndex)
      result += highlightLine(code, validInstructionIndex, absoluteCharPosition) + `<span class="comment">${escapeHtml(comment)}</span>`
      validInstructionIndex += code.split('').filter(char => validChars.includes(char)).length
    }
    
    absoluteCharPosition += line.length + 1  // +1 for newline
    
    if (index < lines.length - 1) {
      result += '\n'
    }
  })
  
  return result || ' ' // 确保有内容，防止高度塌陷
})

// 高亮单行代码（不含注释部分）
const highlightLine = (line, startInstructionIndex, lineStartPosition) => {
  const validChars = '><+-.,[]'
  let instructionIndex = startInstructionIndex
  
  return line.split('').map((char, index) => {
    const absolutePos = lineStartPosition + index
    const isMatchedBracket = (char === '[' || char === ']') && 
                             (absolutePos === matchingBrackets.value.start || 
                              absolutePos === matchingBrackets.value.end)
    
    if (validChars.includes(char)) {
      const isCurrentInstruction = instructionIndex === props.currentPosition
      const isBreakpoint = props.breakpoints.has(instructionIndex)
      instructionIndex++
      
      let classes = `instruction instruction-${char}`
      if (isCurrentInstruction) {
        classes += ' current-instruction'
      } else if (isBreakpoint) {
        classes += ' breakpoint-instruction'
      }
      if (isMatchedBracket) {
        classes += ' matched-bracket'
      }
      
      return `<span class="${classes}" data-position="${instructionIndex - 1}">${escapeHtml(char)}</span>`
    } else if (char === ' ') {
      return ' '
    } else if (char === '\t') {
      return '\t'
    } else {
      return `<span class="invalid">${escapeHtml(char)}</span>`
    }
  }).join('')
}

// HTML转义
const escapeHtml = (text) => {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

// 同步滚动
const syncScroll = () => {
  const textarea = textareaRef.value
  const highlight = textarea?.previousElementSibling
  const lineNumbers = lineNumbersRef.value
  if (highlight && textarea) {
    highlight.scrollTop = textarea.scrollTop
    highlight.scrollLeft = textarea.scrollLeft
    if (lineNumbers) {
      lineNumbers.scrollTop = textarea.scrollTop
    }
  }
}

// 更新代码
const updateCode = () => {
  emit('update:modelValue', localCode.value)
}

// 检查括号匹配
const checkBracketMatch = () => {
  const textarea = textareaRef.value
  if (!textarea) {
    matchingBrackets.value = { start: -1, end: -1 }
    return
  }
  
  const cursorPos = textarea.selectionStart
  
  // 检查光标左边的字符
  if (cursorPos === 0) {
    matchingBrackets.value = { start: -1, end: -1 }
    return
  }
  
  const code = localCode.value
  const leftChar = code[cursorPos - 1]
  
  if (leftChar !== '[' && leftChar !== ']') {
    matchingBrackets.value = { start: -1, end: -1 }
    return
  }
  
  // 找到匹配的括号
  if (leftChar === '[') {
    // 向右找匹配的 ]
    let depth = 1
    for (let i = cursorPos; i < code.length; i++) {
      if (code[i] === '[') depth++
      else if (code[i] === ']') {
        depth--
        if (depth === 0) {
          matchingBrackets.value = { start: cursorPos - 1, end: i }
          return
        }
      }
    }
    // 没找到匹配
    matchingBrackets.value = { start: -1, end: -1 }
  } else {
    // 向左找匹配的 [
    let depth = 1
    for (let i = cursorPos - 2; i >= 0; i--) {
      if (code[i] === ']') depth++
      else if (code[i] === '[') {
        depth--
        if (depth === 0) {
          matchingBrackets.value = { start: i, end: cursorPos - 1 }
          return
        }
      }
    }
    // 没找到匹配
    matchingBrackets.value = { start: -1, end: -1 }
  }
}

// 清空代码
const clearCode = () => {
  localCode.value = ''
  updateCode()
  emit('reset')
}

// 静态代码检查
const checkCode = () => {
  checkErrors.value = []
  checkSuccess.value = false
  
  if (!localCode.value.trim()) {
    checkErrors.value.push({ line: 0, message: '代码为空' })
    return
  }
  
  const lines = localCode.value.split('\n')
  const bracketStack = []
  const validChars = '><+-.,[]'
  
  // 指针边界检查
  let minPointer = 0  // 记录最小指针位置
  let maxPointer = 0  // 记录最大指针位置
  let currentPointer = 0
  const MEMORY_SIZE = 30000
  
  // 构建完整的代码字符串（移除注释）
  let fullCode = ''
  const charToLine = []  // 记录每个字符对应的行号
  
  lines.forEach((line, lineIndex) => {
    const lineNum = lineIndex + 1
    const commentIndex = line.indexOf('#')
    const codePart = commentIndex >= 0 ? line.slice(0, commentIndex) : line
    
    for (let i = 0; i < codePart.length; i++) {
      const char = codePart[i]
      if (validChars.includes(char)) {
        fullCode += char
        charToLine.push(lineNum)
      }
    }
  })
  
  // 模拟指针移动（不考虑循环的具体执行次数）
  for (let i = 0; i < fullCode.length; i++) {
    const char = fullCode[i]
    
    if (char === '>') {
      currentPointer++
      maxPointer = Math.max(maxPointer, currentPointer)
      
      if (currentPointer >= MEMORY_SIZE) {
        checkErrors.value.push({
          line: charToLine[i],
          message: `指针可能越界（超过右边界 ${MEMORY_SIZE - 1}），当前模拟位置: ${currentPointer}`
        })
        break  // 检测到越界后停止
      }
    } else if (char === '<') {
      currentPointer--
      minPointer = Math.min(minPointer, currentPointer)
      
      if (currentPointer < 0) {
        checkErrors.value.push({
          line: charToLine[i],
          message: `指针可能越界（小于左边界 0），当前模拟位置: ${currentPointer}`
        })
        break  // 检测到越界后停止
      }
    }
  }
  
  // 检查每一行
  lines.forEach((line, lineIndex) => {
    const lineNum = lineIndex + 1
    
    // 移除注释部分
    const commentIndex = line.indexOf('#')
    const codePart = commentIndex >= 0 ? line.slice(0, commentIndex) : line
    
    // 检查括号匹配
    for (let i = 0; i < codePart.length; i++) {
      const char = codePart[i]
      
      if (char === '[') {
        bracketStack.push({ char: '[', line: lineNum, col: i + 1 })
      } else if (char === ']') {
        if (bracketStack.length === 0) {
          checkErrors.value.push({
            line: lineNum,
            message: `多余的右括号 ']' (位置 ${i + 1})`
          })
        } else {
          bracketStack.pop()
        }
      }
      
      // 检查无效字符（跳过空白字符）
      if (char.trim() && !validChars.includes(char)) {
        checkErrors.value.push({
          line: lineNum,
          message: `无效字符 '${char}' (位置 ${i + 1})，应为 ${validChars.split('').join(' ')}`
        })
      }
    }
  })
  
  // 检查未闭合的左括号
  if (bracketStack.length > 0) {
    bracketStack.forEach(bracket => {
      checkErrors.value.push({
        line: bracket.line,
        message: `未闭合的左括号 '[' (位置 ${bracket.col})`
      })
    })
  }
  
  // 如果没有错误，显示成功消息和指针范围信息
  if (checkErrors.value.length === 0) {
    checkSuccess.value = true
    
    // 如果使用了较大的内存范围，给予提示
    const pointerRange = maxPointer - minPointer
    console.log(`✅ 代码检查通过 | 指针范围: [${minPointer}, ${maxPointer}] | 使用内存: ${pointerRange + 1} 单元`)
    
    setTimeout(() => {
      checkSuccess.value = false
    }, 1000)
  }
}

// 导入代码
const importCode = () => {
  fileInputRef.value?.click()
}

// 处理文件导入
const handleFileImport = (event) => {
  const file = event.target.files?.[0]
  if (!file) return
  
  const reader = new FileReader()
  reader.onload = (e) => {
    const content = e.target?.result
    if (typeof content === 'string') {
      localCode.value = content
      updateCode()
      emit('reset')
    }
  }
  reader.readAsText(file)
  
  // 清空input，允许重复导入同一文件
  event.target.value = ''
}

// 导出代码
const exportCode = () => {
  if (!localCode.value) return
  
  // 生成文件名（带时间戳）
  const timestamp = new Date().toISOString().slice(0, 19).replace(/[:]/g, '-')
  const filename = `brainfuck-${timestamp}.bf`
  
  // 创建Blob并下载
  const blob = new Blob([localCode.value], { type: 'text/plain;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

// 插入指令
const insertInstruction = (char) => {
  if (props.isRunning) return
  
  const textarea = textareaRef.value
  if (!textarea) return
  
  const start = textarea.selectionStart
  const end = textarea.selectionEnd
  const text = localCode.value
  
  localCode.value = text.substring(0, start) + char + text.substring(end)
  updateCode()
  
  // 恢复光标位置
  nextTick(() => {
    textarea.focus()
    textarea.setSelectionRange(start + 1, start + 1)
  })
}

// 键盘事件处理
const handleKeyPress = (event) => {
  if (props.isRunning || props.isSettingsOpen) return
  
  // 检查焦点是否在CodeEditor的textarea上
  const textarea = textareaRef.value
  if (!textarea || document.activeElement !== textarea) {
    return // 如果焦点不在编辑器textarea上，不处理键盘事件
  }
  
  const key = event.key.toLowerCase()
  
  // 检查当前光标所在行是否有注释符号#
  const cursorPos = textarea.selectionStart
  const textBeforeCursor = localCode.value.substring(0, cursorPos)
  const lastNewlineIndex = textBeforeCursor.lastIndexOf('\n')
  const currentLineStart = lastNewlineIndex + 1
  const currentLine = localCode.value.substring(currentLineStart, localCode.value.indexOf('\n', cursorPos) === -1 ? localCode.value.length : localCode.value.indexOf('\n', cursorPos))
  
  // 如果当前行已经有#注释符号，且光标在#之后，则允许普通输入
  const commentIndex = currentLine.indexOf('#')
  const cursorInLine = cursorPos - currentLineStart
  if (commentIndex !== -1 && cursorInLine >= commentIndex) {
    // 在注释区域，允许普通输入
    return
  }
  
  // 检查是否是配置的快捷键
  const shortcutIndex = props.shortcuts.indexOf(key)
  if (shortcutIndex !== -1) {
    event.preventDefault()
    const index = shortcutIndex
    insertInstruction(instructions[index].char)
    
    // 显示按键效果
    pressedKey.value = props.shortcuts[index]
    setTimeout(() => {
      pressedKey.value = ''
    }, 150)
    return
  }
  
  // 如果按下#，允许输入（进入注释模式）
  if (key === '#') {
    return
  }
  
  // 其他按键：只允许字母、数字、标点符号（用于潜在的快捷键），其他按键正常处理
  const code = key.charCodeAt(0)
  const isAlphanumeric = (code >= 48 && code <= 57) || (code >= 97 && code <= 122)
  const isPunctuation = [';', ',', '.', '/', '[', ']', '-', '=', '`'].includes(key)
  
  if (key.length === 1 && (isAlphanumeric || isPunctuation)) {
    // 阻止非快捷键的字母数字标点输入（除了#）
    event.preventDefault()
  }
}

// 断点功能 - 选中指令切换断点
const handleTextSelection = () => {
  if (props.isRunning) return
  
  const textarea = textareaRef.value
  if (!textarea) return
  
  const start = textarea.selectionStart
  const end = textarea.selectionEnd
  const selectedText = localCode.value.substring(start, end)
  
  // 检查是否选中了单个指令字符
  const validInstructions = ['+', '-', '<', '>', '[', ']', '.', ',']
  if (selectedText.length === 1 && validInstructions.includes(selectedText)) {
    // 计算这是第几个指令（忽略非指令字符）
    let instructionPosition = -1
    let count = 0
    for (let i = 0; i < start; i++) {
      if (validInstructions.includes(localCode.value[i])) {
        count++
      }
    }
    // 当前选中的指令是第count个（从0开始）
    instructionPosition = count
    
    // 检查是否已有断点，并显示相应提示
    const hasBreakpoint = props.breakpoints.has(instructionPosition)
    const message = hasBreakpoint ? '取消断点' : '添加断点'
    
    if (confirm(message + '?')) {
      // 通知父组件切换断点
      emit('toggle-breakpoint', instructionPosition)
    }
  }
}

// 监听外部变化
watch(() => props.modelValue, (newValue) => {
  localCode.value = newValue
})

// 自动滚动到当前执行位置
watch(() => props.currentPosition, () => {
  if (props.currentPosition > 0 && highlightRef.value) {
    const currentInstructionEl = highlightRef.value.querySelector('.current-instruction')
    if (currentInstructionEl) {
      currentInstructionEl.scrollIntoView({ 
        behavior: 'smooth', 
        block: 'center',
        inline: 'center'
      })
    }
  }
})

// 监听示例加载事件
onMounted(() => {
  window.addEventListener('load-example', (event) => {
    localCode.value = event.detail
    updateCode()
    emit('reset')
  })
  
  // 添加键盘事件监听
  window.addEventListener('keydown', handleKeyPress)
})

// 清理事件监听
onBeforeUnmount(() => {
  window.removeEventListener('keydown', handleKeyPress)
})
</script>

<style scoped>
.code-editor {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: var(--bg-secondary);
}

.editor-header {
  padding: 12px 16px;
  border-bottom: 1px solid var(--border-color);
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.header-top {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.editor-header h3 {
  font-size: 14px;
  color: var(--text-primary);
  font-weight: 600;
}

.editor-actions {
  display: flex;
  gap: 8px;
}

.check-btn {
  background: #4caf50;
  font-size: 12px;
  padding: 6px 12px;
}

.check-btn:hover {
  background: #45a049;
}

.import-btn {
  background: var(--accent-color);
  font-size: 12px;
  padding: 6px 12px;
}

.error-panel, .success-panel {
  background: var(--bg-primary);
  border: 1px solid var(--border-color);
  border-radius: 6px;
  padding: 12px;
  max-height: 150px;
  overflow-y: auto;
}

.error-panel {
  border-color: #f44336;
}

.success-panel {
  border-color: #4caf50;
  background: rgba(76, 175, 80, 0.1);
  color: #4caf50;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.error-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
  color: #f44336;
  font-weight: 600;
}

.error-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.error-item {
  display: flex;
  gap: 8px;
  font-size: 12px;
  padding: 6px;
  background: rgba(244, 67, 54, 0.1);
  border-radius: 4px;
}

.error-line {
  font-weight: 600;
  color: #f44336;
  min-width: 50px;
}

.error-message {
  color: var(--text-primary);
}

.close-errors, .close-success {
  background: transparent;
  border: none;
  color: inherit;
  font-size: 16px;
  cursor: pointer;
  padding: 0 4px;
}

.close-errors:hover, .close-success:hover {
  opacity: 0.7;
}

.export-btn {
  background: var(--success-color);
  color: #000;
  font-size: 12px;
  padding: 6px 12px;
}

.clear-btn {
  background: var(--bg-tertiary);
  font-size: 12px;
  padding: 6px 12px;
}

.editor-container {
  flex: 1;
  display: flex;
  overflow: hidden;
  position: relative;
}

.line-numbers {
  background: var(--bg-tertiary);
  color: var(--text-secondary);
  padding: 12px 8px;
  text-align: right;
  user-select: none;
  font-family: 'Consolas', 'Monaco', monospace;
  font-size: 14px;
  line-height: 1.5;
  min-width: 45px;
  border-right: 1px solid var(--border-color);
  overflow-y: auto;
  overflow-x: hidden;
  -ms-overflow-style: none; /* IE and Edge */
  scrollbar-width: none; /* Firefox */
}

.line-numbers::-webkit-scrollbar {
  display: none; /* Chrome, Safari和新版Edge */
}

.line-number {
  height: 21px;
}

.editor-wrapper {
  flex: 1;
  position: relative;
  overflow: hidden;
}

.code-highlight {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  margin: 0;
  padding: 12px;
  background: var(--bg-secondary);
  color: transparent;
  font-family: 'Consolas', 'Monaco', monospace;
  font-size: 14px;
  line-height: 1.5;
  white-space: pre;
  overflow: auto;
  pointer-events: none;
  word-wrap: normal;
  overflow-wrap: normal;
}

.code-highlight :deep(.instruction) {
  pointer-events: auto;
  cursor: pointer;
  padding: 2px 0;
  border-radius: 2px;
  transition: background 0.15s;
}

.code-highlight :deep(.instruction:hover) {
  background: rgba(255, 255, 255, 0.05);
}

.code-textarea {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  width: 100%;
  height: 100%;
  padding: 12px;
  background: transparent;
  border: none;
  color: transparent;
  caret-color: var(--text-primary);
  font-family: 'Consolas', 'Monaco', monospace;
  font-size: 14px;
  line-height: 1.5;
  resize: none;
  outline: none;
  white-space: pre;
  overflow-wrap: normal;
  overflow-x: auto;
  overflow-y: auto;
  -webkit-text-fill-color: transparent;
}

.code-textarea:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.code-textarea::placeholder {
  color: transparent;
}

.code-highlight :deep(.current-instruction) {
  background: rgba(255, 215, 0, 0.3);
  color: #FFD700 !important;
  font-weight: bold;
  padding: 2px 0;
  border-radius: 2px;
  pointer-events: auto;
}

.code-highlight :deep(.breakpoint-instruction) {
  background: rgba(255, 100, 100, 0.25);
  color: #ff6b6b !important;
  font-weight: bold;
  padding: 2px 0;
  border-radius: 2px;
  pointer-events: auto;
  cursor: pointer;
}

.code-highlight :deep(.matched-bracket) {
  background: rgba(255, 215, 0, 0.3);
  border: 1px solid rgba(255, 215, 0, 0.8);
  padding: 1px 2px;
  border-radius: 3px;
  box-shadow: 0 0 8px rgba(255, 215, 0, 0.4);
  animation: bracket-pulse 0.3s ease-out;
}

@keyframes bracket-pulse {
  0% {
    box-shadow: 0 0 0 rgba(255, 215, 0, 0.4);
  }
  50% {
    box-shadow: 0 0 12px rgba(255, 215, 0, 0.6);
  }
  100% {
    box-shadow: 0 0 8px rgba(255, 215, 0, 0.4);
  }
}

/* 语法高亮样式 */
.code-highlight :deep(.comment) {
  color: #7CFC00;
  font-style: italic;
}

.code-highlight :deep(.instruction) {
  color: var(--text-primary);
  font-weight: 500;
  pointer-events: auto;
  cursor: pointer;
  padding: 2px 0;
  border-radius: 2px;
  transition: background 0.15s;
}

.code-highlight :deep(.instruction:hover) {
  background: rgba(255, 255, 255, 0.05);
}

.code-highlight :deep(.instruction-\>) {
  color: #569CD6;
}

.code-highlight :deep(.instruction-\<) {
  color: #569CD6;
}

.code-highlight :deep(.instruction-\+) {
  color: #4EC9B0;
}

.code-highlight :deep(.instruction-\-) {
  color: #4EC9B0;
}

.code-highlight :deep(.instruction-\.) {
  color: #CE9178;
}

.code-highlight :deep(.instruction-\,) {
  color: #CE9178;
}

.code-highlight :deep(.instruction-\[) {
  color: #C586C0;
  font-weight: bold;
}

.code-highlight :deep(.instruction-\]) {
  color: #C586C0;
  font-weight: bold;
}

.code-highlight :deep(.invalid) {
  color: var(--text-secondary);
  opacity: 0.4;
}

.code-highlight :deep(.placeholder-text) {
  color: var(--text-secondary);
  display: block;
  white-space: pre-line;
}

.instruction-buttons {
  display: grid;
  grid-template-columns: repeat(8, 1fr);
  gap: 6px;
}

.instr-btn {
  display: flex;
  flex-direction: column;
  align-items: center;
  font-size: 12px;
  color: var(--text-secondary);
  text-align: center;
  padding: 8px 4px;
  background: var(--bg-secondary);
  border: 1px solid var(--border-color);
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.15s;
  position: relative;
}

.instr-btn:hover {
  background: var(--accent-color);
  transform: translateY(-2px);
  box-shadow: 0 2px 8px rgba(0, 122, 204, 0.3);
}

.instr-btn:active,
.instr-btn.btn-pressed {
  transform: translateY(0) scale(0.95);
  box-shadow: 0 0 0 rgba(0, 122, 204, 0.3);
  background: var(--success-color);
}

.instr-key {
  position: absolute;
  top: 2px;
  left: 4px;
  font-size: 10px;
  color: var(--text-secondary);
  background: var(--bg-tertiary);
  padding: 2px 4px;
  border-radius: 3px;
  font-family: 'Consolas', 'Monaco', monospace;
}

.instr-char {
  font-size: 20px;
  font-weight: bold;
  color: var(--warning-color);
  font-family: 'Consolas', 'Monaco', monospace;
  margin-bottom: 2px;
}

.instr-desc {
  font-size: 11px;
  color: var(--text-secondary);
}

.instr-btn-1 .instr-char,
.instr-btn-2 .instr-char {
  color: #569CD6;
}

.instr-btn-3 .instr-char,
.instr-btn-4 .instr-char {
  color: #4EC9B0;
}

.instr-btn-5 .instr-char,
.instr-btn-6 .instr-char {
  color: #CE9178;
}

.instr-btn-7 .instr-char,
.instr-btn-8 .instr-char {
  color: #C586C0;
}

.editor-footer {
  padding: 8px 16px;
  border-top: 1px solid var(--border-color);
  background: var(--bg-tertiary);
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.char-count {
  font-family: 'Consolas', 'Monaco', monospace;
  font-size: 12px;
  color: var(--text-secondary);
  text-align: center;
}
</style>