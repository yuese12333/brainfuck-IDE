<template>
  <div class="brainfuck-ide">
    <Header 
      :settings="settings"
      @update-settings="updateSettings"
      @settings-open="isSettingsOpen = $event"
    />
    <div class="main-content">
      <div class="left-panel">
        <CodeEditor 
          v-model="code" 
          @run="runCode"
          @step="stepCode"
          @stop="stopCode"
          @reset="resetCode"
          @toggle-breakpoint="toggleBreakpoint"
          :is-running="isRunning"
          :current-position="currentPosition"
          :breakpoints="savedBreakpoints"
          :shortcuts="settings.shortcuts"
          :is-settings-open="isSettingsOpen"
        />
      </div>
      <div class="right-panel">
        <ControlPanel 
          :is-running="isRunning"
          :is-paused="isPaused"
          :is-completed="isCompleted"
          :execution-speed="executionSpeed"
          :speed-levels="settings.speedLevels"
          @update-speed="executionSpeed = $event"
          @run="runCode"
          @continue="continueCode"
          @step="stepCode"
          @stop="stopCode"
          @reset="resetCode"
        />
        <MemoryVisualizer 
          :memory="memory"
          :pointer="pointer"
        />
        <IOPanel 
          v-model:input="inputBuffer"
          :output="output"
          @clear-output="output = ''"
        />
      </div>
    </div>
    <StatusBar 
      :instruction-count="instructionCount"
      :current-position="currentPosition"
      :pointer="pointer"
      :is-running="isRunning"
      :is-completed="isCompleted"
      :instructions-per-second="instructionsPerSecond"
      :instruction-profile="instructionProfile"
      :keep-stats-on-reset="keepStatsOnReset"
      @toggle-keep-stats="keepStatsOnReset = !keepStatsOnReset"
    />
  </div>
</template>

<script setup>
import { ref, watch } from 'vue'
import Header from './components/Header.vue'
import CodeEditor from './components/CodeEditor.vue'
import ControlPanel from './components/ControlPanel.vue'
import MemoryVisualizer from './components/MemoryVisualizer.vue'
import IOPanel from './components/IOPanel.vue'
import StatusBar from './components/StatusBar.vue'
import { BrainfuckInterpreter } from './utils/interpreter.js'
import { loadSettings, saveSettings as saveSettingsToStorage } from './utils/settings.js'

// 加载设置
const settings = ref(loadSettings())

// 代码状态
const code = ref(`# Hello World 示例程序
# 这是一个经典的 Brainfuck 程序
++++++++[>++++[>++>+++>+++>+<<<<-]>+>+>->>+[<]<-]>>.>---.+++++++..+++.>>.<-.<.+++.------.--------.>>+.>++.

# 可以使用 # 符号添加注释
# 支持整行注释和行内注释`)
const inputBuffer = ref('')
const output = ref('')

// 执行状态
const isRunning = ref(false)
const isPaused = ref(false) // 是否在断点处暂停
const isCompleted = ref(false) // 程序是否已完成执行
const executionSpeed = ref(100) // ms per instruction
const isSettingsOpen = ref(false) // 设置对话框是否打开

// 内存状态
const memory = ref(new Array(30).fill(0))
const pointer = ref(0)
const instructionCount = ref(0)
const currentPosition = ref(0)

// 性能统计
const instructionsPerSecond = ref(0)
let lastInstructionCount = 0
let lastTime = Date.now()

// 指令执行统计
const instructionProfile = ref({})
const keepStatsOnReset = ref(false)

// 断点状态（持久化保存）
const savedBreakpoints = ref(new Set())

// 解释器实例
let interpreter = null

// 初始化解释器
const initInterpreter = () => {
  interpreter = new BrainfuckInterpreter(
    code.value,
    inputBuffer.value,
    (char) => {
      output.value += char
    }
  )
  
  // 恢复保存的断点
  savedBreakpoints.value.forEach(pos => {
    interpreter.addBreakpoint(pos)
  })
  
  // 如果保持统计模式启用，恢复之前的统计数据
  if (keepStatsOnReset.value && instructionProfile.value) {
    Object.keys(instructionProfile.value).forEach(instr => {
      if (interpreter.instructionProfile[instr] !== undefined) {
        interpreter.instructionProfile[instr] = instructionProfile.value[instr] || 0
      }
    })
  }
}

// 运行代码
const runCode = async () => {
  if (isRunning.value) return
  
  if (!interpreter || currentPosition.value === 0) {
    initInterpreter()
  }
  
  isRunning.value = true
  isPaused.value = false
  isCompleted.value = false
  
  // 初始化IPS计算
  lastInstructionCount = instructionCount.value
  lastTime = Date.now()
  const ipsInterval = setInterval(() => {
    if (isRunning.value) {
      const now = Date.now()
      const timeDiff = (now - lastTime) / 1000
      const countDiff = instructionCount.value - lastInstructionCount
      instructionsPerSecond.value = timeDiff > 0 ? countDiff / timeDiff : 0
      lastInstructionCount = instructionCount.value
      lastTime = now
    }
  }, 200) // 每200ms更新一次IPS
  
  // 最快模式：批量执行，减少UI更新
  if (executionSpeed.value === 0) {
    let batchCount = 0
    const batchSize = 1000 // 每批执行1000条指令
    
    while (isRunning.value && !interpreter.isFinished()) {
      try {
        // 批量执行
        for (let i = 0; i < batchSize && !interpreter.isFinished(); i++) {
          const result = interpreter.step()
          
          // 检查是否命中断点
          if (result === 'breakpoint') {
            isPaused.value = true
            isRunning.value = false
            updateState()
            clearInterval(ipsInterval)
            instructionsPerSecond.value = 0
            return
          }
        }
        
        // 每批执行后更新一次UI
        updateState()
        
        // 让出控制权，避免阻塞UI
        await new Promise(resolve => setTimeout(resolve, 0))
      } catch (error) {
        output.value += `\n错误: ${error.message}`
        isRunning.value = false
        isPaused.value = false
        break
      }
    }
  } else {
    // 普通模式：每条指令更新UI
    while (isRunning.value && !interpreter.isFinished()) {
      try {
        const result = interpreter.step()
        updateState()
        
        // 检查是否命中断点
        if (result === 'breakpoint') {
          isPaused.value = true
          isRunning.value = false
          break
        }
        
        await sleep(executionSpeed.value)
      } catch (error) {
        output.value += `\n错误: ${error.message}`
        isRunning.value = false
        isPaused.value = false
        break
      }
    }
  }
  
  clearInterval(ipsInterval)
  instructionsPerSecond.value = 0
  
  if (interpreter.isFinished()) {
    isRunning.value = false
    isPaused.value = false
    isCompleted.value = true
  }
}

// 继续执行（从断点处）
const continueCode = async () => {
  if (!isPaused.value || !interpreter) return
  
  isPaused.value = false
  isRunning.value = true
  
  // 初始化IPS计算
  lastInstructionCount = instructionCount.value
  lastTime = Date.now()
  const ipsInterval = setInterval(() => {
    if (isRunning.value) {
      const now = Date.now()
      const timeDiff = (now - lastTime) / 1000
      const countDiff = instructionCount.value - lastInstructionCount
      instructionsPerSecond.value = timeDiff > 0 ? countDiff / timeDiff : 0
      lastInstructionCount = instructionCount.value
      lastTime = now
    }
  }, 200)
  
  // 先执行当前断点处的指令
  if (!interpreter.isFinished()) {
    try {
      interpreter.hitBreakpoint = false // 清除断点命中标记，允许继续执行
      interpreter.step()
      updateState()
      if (executionSpeed.value > 0) {
        await sleep(executionSpeed.value)
      }
    } catch (error) {
      output.value += `\n错误: ${error.message}`
      isRunning.value = false
      isPaused.value = false
      clearInterval(ipsInterval)
      instructionsPerSecond.value = 0
      return
    }
  }
  
  // 最快模式：批量执行
  if (executionSpeed.value === 0) {
    const batchSize = 1000
    
    while (isRunning.value && !interpreter.isFinished()) {
      try {
        // 批量执行
        for (let i = 0; i < batchSize && !interpreter.isFinished(); i++) {
          const result = interpreter.step()
          
          // 检查是否命中断点
          if (result === 'breakpoint') {
            isPaused.value = true
            isRunning.value = false
            updateState()
            clearInterval(ipsInterval)
            instructionsPerSecond.value = 0
            return
          }
        }
        
        // 每批执行后更新一次UI
        updateState()
        
        // 让出控制权
        await new Promise(resolve => setTimeout(resolve, 0))
      } catch (error) {
        output.value += `\n错误: ${error.message}`
        isRunning.value = false
        isPaused.value = false
        break
      }
    }
  } else {
    // 普通模式
    while (isRunning.value && !interpreter.isFinished()) {
      try {
        const result = interpreter.step()
        updateState()
        
        // 检查是否命中断点
        if (result === 'breakpoint') {
          isPaused.value = true
          isRunning.value = false
          break
        }
        
        await sleep(executionSpeed.value)
      } catch (error) {
        output.value += `\n错误: ${error.message}`
        isRunning.value = false
        isPaused.value = false
        break
      }
    }
  }
  
  clearInterval(ipsInterval)
  instructionsPerSecond.value = 0
  
  if (interpreter.isFinished()) {
    isRunning.value = false
    isPaused.value = false
    isCompleted.value = true
  }
}

// 单步执行
const stepCode = () => {
  if (!interpreter || currentPosition.value === 0) {
    initInterpreter()
  }
  
  if (!interpreter.isFinished()) {
    try {
      interpreter.step()
      updateState()
    } catch (error) {
      output.value += `\n错误: ${error.message}`
    }
  }
}

// 停止执行
const stopCode = () => {
  isRunning.value = false
}

// 重置
const resetCode = () => {
  stopCode()
  isPaused.value = false
  isCompleted.value = false
  interpreter = null
  output.value = ''
  memory.value = new Array(30).fill(0)
  pointer.value = 0
  instructionCount.value = 0
  currentPosition.value = 0
  
  // 根据设置决定是否清空指令统计
  if (!keepStatsOnReset.value) {
    instructionProfile.value = {}
  }
}

// 切换断点
const toggleBreakpoint = (instructionPosition) => {
  // 切换保存的断点状态
  if (savedBreakpoints.value.has(instructionPosition)) {
    savedBreakpoints.value.delete(instructionPosition)
  } else {
    savedBreakpoints.value.add(instructionPosition)
  }
  
  // 如果解释器已存在，同步更新断点
  if (interpreter) {
    interpreter.toggleBreakpoint(instructionPosition)
  }
}

// 更新状态
const updateState = () => {
  if (interpreter) {
    // 获取完整的30000个内存单元（但只传前60个以优化性能）
    const displayMemory = []
    for (let i = 0; i < 60; i++) {
      displayMemory.push(interpreter.memory[i])
    }
    // 如果指针在60之后，也包含指针附近的内存
    if (interpreter.pointer >= 60) {
      const start = Math.max(60, interpreter.pointer - 15)
      const end = Math.min(30000, interpreter.pointer + 15)
      for (let i = start; i < end; i++) {
        displayMemory[i] = interpreter.memory[i]
      }
    }
    memory.value = displayMemory
    pointer.value = interpreter.pointer
    instructionCount.value = interpreter.instructionCount
    currentPosition.value = interpreter.instructionPointer
    
    // 更新指令执行统计
    if (interpreter.instructionProfile) {
      instructionProfile.value = { ...interpreter.instructionProfile }
    }
  }
}

// 辅助函数
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms))

// 更新设置
const updateSettings = (newSettings) => {
  settings.value = newSettings
  saveSettingsToStorage(newSettings)
}


// 监听代码变化,自动重置
watch(code, () => {
  if (!isRunning.value) {
    resetCode()
  }
})
</script>

<style scoped>
.brainfuck-ide {
  display: flex;
  flex-direction: column;
  height: 100vh;
  background: var(--bg-primary);
}

.main-content {
  display: flex;
  flex: 1;
  overflow: hidden;
}

.left-panel {
  flex: 1;
  display: flex;
  flex-direction: column;
  border-right: 1px solid var(--border-color);
  min-width: 400px;
}

.right-panel {
  width: 450px;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

@media (max-width: 1200px) {
  .main-content {
    flex-direction: column;
  }
  
  .left-panel {
    border-right: none;
    border-bottom: 1px solid var(--border-color);
    min-width: unset;
    flex: 1;
  }
  
  .right-panel {
    width: 100%;
    max-height: 400px;
  }
}
</style>
