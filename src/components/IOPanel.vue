<template>
  <div class="io-panel">
    <div class="input-section">
      <div class="section-header">
        <h3>输入</h3>
        <div class="input-mode-toggle">
          <button 
            @click="inputMode = 'char'" 
            :class="['mode-btn', { active: inputMode === 'char' }]"
          >
            字符模式
          </button>
          <button 
            @click="inputMode = 'ascii'" 
            :class="['mode-btn', { active: inputMode === 'ascii' }]"
          >
            ASCII模式
          </button>
        </div>
      </div>
      <textarea
        :value="displayInput"
        @input="handleInput"
        :placeholder="inputPlaceholder"
        class="io-textarea input-textarea"
      ></textarea>
    </div>
    
    <div class="output-section">
      <div class="section-header">
        <h3>输出</h3>
        <div class="output-mode-toggle">
          <button 
            @click="outputMode = 'char'" 
            :class="['mode-btn', { active: outputMode === 'char' }]"
          >
            字符
          </button>
          <button 
            @click="outputMode = 'ascii'" 
            :class="['mode-btn', { active: outputMode === 'ascii' }]"
          >
            ASCII
          </button>
        </div>
        <button @click="$emit('clear-output')" class="clear-output-btn">
          🗑️ 清空
        </button>
      </div>
      <div class="output-textarea" ref="outputEl">{{ formattedOutput || '等待输出...' }}</div>
    </div>
  </div>
</template>

<script setup>
import { ref, watch, nextTick, computed } from 'vue'

const props = defineProps({
  input: {
    type: String,
    default: ''
  },
  output: {
    type: String,
    default: ''
  }
})

const emit = defineEmits(['update:input', 'clear-output'])

const outputEl = ref(null)
const inputMode = ref('char') // 'char' 或 'ascii'
const outputMode = ref('char') // 'char' 或 'ascii'

// ASCII控制字符映射
const controlChars = {
  0: 'NUL', 1: 'SOH', 2: 'STX', 3: 'ETX', 4: 'EOT', 5: 'ENQ', 6: 'ACK', 7: 'BEL',
  8: 'BS', 9: 'TAB', 10: 'LF', 11: 'VT', 12: 'FF', 13: 'CR', 14: 'SO', 15: 'SI',
  16: 'DLE', 17: 'DC1', 18: 'DC2', 19: 'DC3', 20: 'DC4', 21: 'NAK', 22: 'SYN', 23: 'ETB',
  24: 'CAN', 25: 'EM', 26: 'SUB', 27: 'ESC', 28: 'FS', 29: 'GS', 30: 'RS', 31: 'US',
  127: 'DEL'
}

// 格式化输出
const formattedOutput = computed(() => {
  if (!props.output) return ''
  
  if (outputMode.value === 'ascii') {
    // ASCII模式：显示每个字符的ASCII码和对应字符
    return props.output.split('').map((char, index) => {
      const code = char.charCodeAt(0)
      const controlName = controlChars[code]
      if (controlName) {
        return `[${code}:${controlName}]`
      }
      // 可打印字符
      if (code >= 32 && code <= 126) {
        return `${code}:${char}`
      }
      // 扩展ASCII
      return `[${code}]`
    }).join(' ')
  } else {
    // 字符模式：可视化不可打印字符
    return props.output.split('').map(char => {
      const code = char.charCodeAt(0)
      const controlName = controlChars[code]
      
      if (controlName) {
        // 特殊处理常见字符
        if (code === 10) return '\n'  // 换行
        if (code === 9) return '\t'   // 制表符
        if (code === 13) return ''    // 回车（通常与换行一起，忽略）
        // 其他控制字符显示为可视化标记
        return `⟨${controlName}⟩`
      }
      
      // 可打印ASCII字符
      if (code >= 32 && code <= 126) {
        return char
      }
      
      // 扩展ASCII（128-255）尝试显示，如果无法显示则用十六进制
      if (code >= 128 && code <= 255) {
        return char  // 让浏览器尝试渲染
      }
      
      // 其他情况显示十六进制
      return `⟨0x${code.toString(16).toUpperCase()}⟩`
    }).join('')
  }
})

// 输入占位符
const inputPlaceholder = computed(() => {
  return inputMode.value === 'char' 
    ? '在此输入字符，如：Hello' 
    : '在此输入ASCII码（空格分隔），如：72 101 108 108 111'
})

// 显示的输入内容
const displayInput = computed(() => {
  if (inputMode.value === 'ascii') {
    // 将字符串转换为ASCII码显示
    return props.input.split('').map(char => char.charCodeAt(0)).join(' ')
  }
  return props.input
})

// 处理输入
const handleInput = (event) => {
  const value = event.target.value
  
  if (inputMode.value === 'ascii') {
    // ASCII模式：将空格分隔的数字转换为字符
    const codes = value.split(/\s+/).filter(s => s.length > 0)
    const chars = codes.map(code => {
      const num = parseInt(code, 10)
      if (isNaN(num) || num < 0 || num > 255) return ''
      return String.fromCharCode(num)
    }).join('')
    emit('update:input', chars)
  } else {
    // 字符模式：直接使用
    emit('update:input', value)
  }
}

// 自动滚动到底部
watch(() => props.output, async () => {
  await nextTick()
  if (outputEl.value) {
    outputEl.value.scrollTop = outputEl.value.scrollHeight
  }
})
</script>

<style scoped>
.io-panel {
  flex: 1;
  display: flex;
  flex-direction: column;
  background: var(--bg-secondary);
  overflow: hidden;
}

.input-section,
.output-section {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 0;
}

.input-section {
  border-bottom: 1px solid var(--border-color);
}

.section-header {
  padding: 12px 16px;
  border-bottom: 1px solid var(--border-color);
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 8px;
  flex-wrap: nowrap;
}

.section-header h3 {
  font-size: 14px;
  color: var(--text-primary);
  font-weight: 600;
  flex-shrink: 0;
  margin-right: auto;
}

.input-mode-toggle,
.output-mode-toggle {
  display: flex;
  gap: 4px;
  background: var(--bg-tertiary);
  padding: 3px;
  border-radius: 6px;
  flex-shrink: 0;
}

.mode-btn {
  padding: 4px 10px;
  font-size: 11px;
  background: transparent;
  color: var(--text-secondary);
  border-radius: 4px;
  transition: all 0.2s;
  white-space: nowrap;
}

.mode-btn.active {
  background: var(--accent-color);
  color: white;
}

.mode-btn:hover:not(.active) {
  background: var(--bg-secondary);
  color: var(--text-primary);
}

.clear-output-btn {
  background: var(--bg-tertiary);
  font-size: 12px;
  padding: 6px 12px;
  flex-shrink: 0;
  white-space: nowrap;
}

.io-textarea {
  flex: 1;
  padding: 12px;
  background: var(--bg-tertiary);
  border: none;
  color: var(--text-primary);
  font-family: 'Consolas', 'Monaco', monospace;
  font-size: 14px;
  line-height: 1.5;
  resize: none;
  outline: none;
}

.input-textarea {
  min-height: 100px;
}

.input-hint {
  padding: 8px 12px;
  background: var(--bg-secondary);
  border-top: 1px solid var(--border-color);
  font-size: 12px;
  color: var(--text-secondary);
  display: flex;
  align-items: center;
  gap: 6px;
}

.output-textarea {
  flex: 1;
  padding: 12px;
  background: var(--bg-tertiary);
  color: var(--success-color);
  font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
  font-size: 14px;
  line-height: 1.5;
  overflow-y: auto;
  white-space: pre-wrap;
  word-break: break-word;
  unicode-bidi: embed;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}
</style>
