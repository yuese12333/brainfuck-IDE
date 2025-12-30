<template>
  <header class="header">
    <div class="logo">
      <span class="logo-icon">🧠</span>
      <h1>Brainfuck IDE</h1>
    </div>
    <div class="header-actions">
      <button @click="showSettings" class="settings-btn">
        <span>⚙️</span> 设置
      </button>
      <button @click="showHelp" class="help-btn">
        <span>❓</span> 帮助
      </button>
      <button @click="showExamples" class="examples-btn">
        <span>📚</span> 示例
      </button>
    </div>
    
    <!-- 帮助对话框 -->
    <div v-if="helpVisible" class="modal" @click.self="helpVisible = false">
      <div class="modal-content">
        <div class="modal-header">
          <h2>Brainfuck 指令说明</h2>
          <button @click="helpVisible = false" class="close-btn">×</button>
        </div>
        <div class="modal-body">
          <table class="instruction-table">
            <thead>
              <tr>
                <th>指令</th>
                <th>说明</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td><code>&gt;</code></td>
                <td>指针右移一位</td>
              </tr>
              <tr>
                <td><code>&lt;</code></td>
                <td>指针左移一位</td>
              </tr>
              <tr>
                <td><code>+</code></td>
                <td>当前单元值加1</td>
              </tr>
              <tr>
                <td><code>-</code></td>
                <td>当前单元值减1</td>
              </tr>
              <tr>
                <td><code>.</code></td>
                <td>将当前单元的值作为ASCII码输出对应字符</td>
              </tr>
              <tr>
                <td><code>,</code></td>
                <td>读取一个字符到当前单元（可输入字符或ASCII码）</td>
              </tr>
              <tr>
                <td><code>[</code></td>
                <td>如果当前单元为0,跳转到匹配的]</td>
              </tr>
              <tr>
                <td><code>]</code></td>
                <td>如果当前单元不为0,跳回到匹配的[</td>
              </tr>
            </tbody>
          </table>
          <div class="help-note">
            <p><strong>提示:</strong></p>
            <ul>
              <li>内存有30000个单元,每个单元存储0-255的值</li>
              <li>输出(.)：将单元值作为ASCII码转换为字符，如65输出'A'</li>
              <li>输入(,)：支持两种输入模式：
                <ul style="margin-top: 5px;">
                  <li>字符模式：直接输入字符，如输入'A'存储为65</li>
                  <li>ASCII模式：输入数字，如输入49存储为49（字符'1'）</li>
                </ul>
              </li>
              <li>可以使用控制面板调节执行速度</li>
              <li>单步执行可以更好地理解代码逻辑</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
    
    <!-- 设置对话框 -->
    <div v-if="settingsVisible" class="modal" @click.self="closeSettings" @keydown="handleShortcutKeydown">
      <div class="modal-content settings-modal">
        <div class="modal-header">
          <h2>⚙️ 设置</h2>
          <button @click="closeSettings" class="close-btn">×</button>
        </div>
        <div class="modal-body">
          <!-- 快捷键设置 -->
          <div class="settings-section">
            <h3>快捷键配置</h3>
            <p class="settings-desc">设置8个指令按键的快捷键（只能是字母、数字、标点符号）</p>
            
            <div class="shortcuts-grid">
              <div v-for="(instruction, index) in ['+', '-', '<', '>', '[', ']', '.', ',']" :key="index" class="shortcut-item">
                <label>{{ instruction }}</label>
                <div 
                  class="shortcut-input"
                  :class="{ active: activeShortcutIndex === index }"
                  @click="activateShortcut(index)"
                  tabindex="0"
                >
                  {{ activeShortcutIndex === index ? '请键盘输入' : (settingsForm.shortcuts[index] || '_') }}
                </div>
              </div>
            </div>
            
            <div class="preset-buttons">
              <button @click="applyPreset('numbers')" class="preset-btn">数字键 1-8</button>
              <button @click="applyPreset('homeRow')" class="preset-btn">主键盘 a s d f j k l ;</button>
            </div>
          </div>
          
          <!-- 速度档位设置 -->
          <div class="settings-section">
            <h3>速度档位配置</h3>
            <p class="settings-desc">设置执行速度档位的延迟（毫秒）。<strong>注意：值越小速度越快！</strong></p>
            
            <div class="speed-settings">
              <div class="speed-setting-item">
                <label>🚀 快速</label>
                <input 
                  type="number" 
                  v-model.number="settingsForm.speedLevels.fast"
                  min="0"
                  max="1000"
                  class="speed-input"
                />
                <span class="unit">ms</span>
              </div>
              <div class="speed-setting-item">
                <label>🚶 中速</label>
                <input 
                  type="number" 
                  v-model.number="settingsForm.speedLevels.medium"
                  min="0"
                  max="1000"
                  class="speed-input"
                />
                <span class="unit">ms</span>
              </div>
              <div class="speed-setting-item">
                <label>🐌 慢速</label>
                <input 
                  type="number" 
                  v-model.number="settingsForm.speedLevels.slow"
                  min="0"
                  max="1000"
                  class="speed-input"
                />
                <span class="unit">ms</span>
              </div>
            </div>
          </div>
          
          <div class="settings-actions">
            <button @click="resetToDefault" class="reset-btn">恢复默认</button>
            <button @click="saveSettings" class="save-btn">保存设置</button>
          </div>
        </div>
      </div>
    </div>
    
    <!-- 示例对话框 -->
    <div v-if="examplesVisible" class="modal" @click.self="examplesVisible = false">
      <div class="modal-content">
        <div class="modal-header">
          <h2>示例程序</h2>
          <button @click="examplesVisible = false" class="close-btn">×</button>
        </div>
        <div class="modal-body">
          <div class="example-list">
            <div 
              v-for="example in examples" 
              :key="example.name"
              class="example-item"
              @click="loadExample(example)"
            >
              <h3>{{ example.name }}</h3>
              <p>{{ example.description }}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  </header>
</template>

<script setup>
import { ref } from 'vue'
import { PRESET_SHORTCUTS } from '../utils/settings.js'

const props = defineProps({
  settings: {
    type: Object,
    required: true
  }
})

const emit = defineEmits(['update-settings', 'settings-open'])

const helpVisible = ref(false)
const examplesVisible = ref(false)
const settingsVisible = ref(false)
const activeShortcutIndex = ref(-1) // 当前正在设置的快捷键索引

// 设置表单数据
const settingsForm = ref({
  shortcuts: [...props.settings.shortcuts],
  speedLevels: { ...props.settings.speedLevels }
})

const examples = [
  {
    name: 'Hello World',
    description: '输出 "Hello World!"',
    code: `# Hello World 程序
# 这是一个经典的Brainfuck程序，输出"Hello World!"

# 初始化内存单元，设置不同的值用于输出不同字符
++++++++[>++++[>++>+++>+++>+<<<<-]>+>+>->>+[<]<-]

# 开始输出字符：
>>.        # 输出 'H' (72)
>---.      # 输出 'e' (101)
+++++++..  # 输出 'll' (108, 108)
+++.       # 输出 'o' (111)
>>.        # 输出 ' ' (32, 空格)
<-.        # 输出 'W' (87)
<.         # 输出 'o' (111)
+++.       # 输出 'r' (114)
------.    # 输出 'l' (108)
--------.  # 输出 'd' (100)
>>+.       # 输出 '!' (33)
>++.       # 输出换行符 (10)`
  },
  {
    name: '输出字母A',
    description: '输出字符 "A" (ASCII 65)',
    code: `# 输出字母A程序
# 将当前单元的值设为65（字母A的ASCII码）

# 通过65个+号
+++++ +++++ +++++ +++++ +++++ +++++ +++++ +++++ +++++ +++++ +++++ +++++ +++++
.     # 输出当前单元值对应的字符 'A'`
  },
  {
    name: '回显输入',
    description: '读取一个字符并输出',
    code: `# 回显输入程序
# 读取用户输入的一个字符，然后立即输出

,    # 从输入读取一个字符存储到当前内存单元
     # 可以输入字符（如'A'）或ASCII码（如65）
.    # 输出当前单元的值对应的字符
     # 如果输入的是'A'，输出就是'A'
     # 如果输入的是65，输出也是'A'`
  },
  {
    name: '数字加法',
    description: '计算 2+3 并输出结果（ASCII码运算，输出字符\'\u0005\'）',
    code: `# 数字加法程序 (2+3)
# 注意：这是ASCII码级别的运算，不是数学意义上的加法

++        # 在第一个单元放入数字2
>         # 移动到第二个单元
+++       # 在第二个单元放入数字3
<         # 回到第一个单元

# 执行加法：将第一个单元的值加到第二个单元
[         # 如果第一个单元不为0
  >       # 移动到第二个单元
  +       # 第二个单元加1
  <       # 回到第一个单元
  -       # 第一个单元减1
]         # 重复直到第一个单元为0

>         # 移动到结果单元（第二个单元）
.         # 输出结果：ASCII码5对应的字符（不可见控制字符）`
  },
  {
    name: '输出数字0-9',
    description: '输出ASCII字符 "0123456789"',
    code: `# 输出数字0-9程序
# 输出ASCII字符'0'到'9'（ASCII码48-57）

# 第一步：计算48（字符'0'的ASCII码）
++++       # 第一个单元 = 4
[          # 循环4次
  >        # 移动到第二个单元
  +++      # 第二个单元每次加3
  <        # 回到第一个单元
  -        # 第一个单元减1
]          # 现在第二个单元 = 12

>          # 移动到第二个单元
++         # 第二个单元 = 14
[          # 循环14次
  <        # 移动到第一个单元
  +++      # 第一个单元每次加3
  >        # 回到第二个单元
  -        # 第二个单元减1
]          # 现在第一个单元 = 42

<          # 移动到第一个单元
++++++     # 第一个单元 = 48 (ASCII '0')

# 输出字符'0'到'9'
.+.+.+.+.+.+.+.+.+.    # 依次输出并递增：'0','1','2','3','4','5','6','7','8','9'`
  },
  {
    name: '性能测试',
    description: '执行大量循环操作，测试解释器性能（约1亿次指令）',
    code: `# 性能测试程序
# 执行多层嵌套循环，测试解释器的执行速度
# 建议使用"最快"速度运行以观察IPS指标

++++++++++[>++++++++[>++++++++++[>+++++++++[>+++++++++[>++++++++++[>++++++++++[>++++++++++<-]<-]<-]<-]<-]<-]<-]

# 原测试程序（约100万次指令）：
# ++++++++++[>++++++++[>++++++++++[>+++++++++[>+++++++++[>++++++++++<-]<-]<-]<-]<-]

# 完成后输出"Done"
>++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++.      # D
+++++++++++++++++++++++++++++++++++++++++++.                                # o
-.                                                                          # n
---------.                                                                  # e`
  }
]

const showSettings = () => {
  // 重置表单为当前设置
  settingsForm.value = {
    shortcuts: [...props.settings.shortcuts],
    speedLevels: { ...props.settings.speedLevels }
  }
  activeShortcutIndex.value = -1
  settingsVisible.value = true
  emit('settings-open', true)
}

const closeSettings = () => {
  settingsVisible.value = false
  activeShortcutIndex.value = -1
  emit('settings-open', false)
}

const showHelp = () => {
  helpVisible.value = true
}

const showExamples = () => {
  examplesVisible.value = true
}

const loadExample = (example) => {
  // 这里应该通过emit或者全局状态来加载示例代码
  // 为简化,我们使用自定义事件
  window.dispatchEvent(new CustomEvent('load-example', { detail: example.code }))
  examplesVisible.value = false
}

// 设置管理
const activateShortcut = (index) => {
  activeShortcutIndex.value = index
}

const handleShortcutKeydown = (event) => {
  if (activeShortcutIndex.value === -1) return
  
  event.preventDefault()
  event.stopPropagation() // 阻止事件冒泡到其他组件
  const key = event.key.toLowerCase()
  
  // 验证按键：只能是字母、数字、标点符号
  if (key.length !== 1) {
    activeShortcutIndex.value = -1
    return
  }
  
  const code = key.charCodeAt(0)
  const isValid = (
    (code >= 48 && code <= 57) ||   // 0-9
    (code >= 97 && code <= 122) ||  // a-z
    [';', ',', '.', '/', '[', ']', '-', '=', '`'].includes(key)
  )
  
  if (!isValid) {
    alert('只能使用字母、数字、标点符号作为快捷键！')
    activeShortcutIndex.value = -1
    return
  }
  
  // 检查快捷键是否重复
  const currentIndex = activeShortcutIndex.value
  const isDuplicate = settingsForm.value.shortcuts.some((shortcut, index) => {
    return index !== currentIndex && shortcut === key
  })
  
  if (isDuplicate) {
    const instructions = ['+', '-', '<', '>', '[', ']', '.', ',']
    const duplicateIndex = settingsForm.value.shortcuts.findIndex((shortcut, index) => 
      index !== currentIndex && shortcut === key
    )
    alert(`快捷键 "${key}" 已被指令 "${instructions[duplicateIndex]}" 使用，请选择其他按键！`)
    activeShortcutIndex.value = -1
    return
  }
  
  settingsForm.value.shortcuts[activeShortcutIndex.value] = key
  activeShortcutIndex.value = -1
}

const applyPreset = (presetName) => {
  settingsForm.value.shortcuts = [...PRESET_SHORTCUTS[presetName]]
}

const resetToDefault = () => {
  settingsForm.value = {
    shortcuts: ['1', '2', '3', '4', '5', '6', '7', '8'],
    speedLevels: { fast: 50, medium: 100, slow: 200 }
  }
  activeShortcutIndex.value = -1
}

const saveSettings = () => {
  // 验证快捷键不重复
  const shortcuts = settingsForm.value.shortcuts
  const uniqueShortcuts = new Set(shortcuts.filter(k => k))
  if (uniqueShortcuts.size !== shortcuts.filter(k => k).length) {
    alert('快捷键不能重复！')
    return
  }
  
  // 验证速度值
  const { fast, medium, slow } = settingsForm.value.speedLevels
  if (fast < 0 || medium < 0 || slow < 0 || fast > 1000 || medium > 1000 || slow > 1000) {
    alert('速度值必须在0-1000之间！')
    return
  }
  
  emit('update-settings', {
    shortcuts: [...settingsForm.value.shortcuts],
    speedLevels: { ...settingsForm.value.speedLevels }
  })
  closeSettings()
}

</script>

<style scoped>
.header {
  height: 60px;
  background: var(--bg-secondary);
  border-bottom: 1px solid var(--border-color);
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 20px;
}

.logo {
  display: flex;
  align-items: center;
  gap: 12px;
}

.logo-icon {
  font-size: 28px;
}

.logo h1 {
  font-size: 20px;
  font-weight: 600;
  color: var(--text-primary);
}

.header-actions {
  display: flex;
  gap: 10px;
}

.help-btn, .examples-btn, .settings-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  background: var(--bg-tertiary);
  padding: 8px 16px;
}

.help-btn span, .examples-btn span, .settings-btn span {
  font-size: 16px;
}

/* 模态框样式 */
.modal {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  animation: fadeIn 0.2s;
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

.modal-content {
  background: var(--bg-secondary);
  border: 1px solid var(--border-color);
  border-radius: 8px;
  width: 90%;
  max-width: 600px;
  max-height: 80vh;
  display: flex;
  flex-direction: column;
  animation: slideUp 0.3s;
}

@keyframes slideUp {
  from {
    transform: translateY(20px);
    opacity: 0;
  }
  to {
    transform: translateY(0);
    opacity: 1;
  }
}

.modal-header {
  padding: 20px;
  border-bottom: 1px solid var(--border-color);
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.modal-header h2 {
  font-size: 20px;
  color: var(--text-primary);
}

.close-btn {
  background: transparent;
  color: var(--text-secondary);
  font-size: 32px;
  padding: 0;
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
}

.close-btn:hover {
  background: var(--bg-tertiary);
  color: var(--text-primary);
}

.modal-body {
  padding: 20px;
  overflow-y: auto;
}

/* 指令表格 */
.instruction-table {
  width: 100%;
  border-collapse: collapse;
  margin-bottom: 20px;
}

.instruction-table th,
.instruction-table td {
  padding: 12px;
  text-align: left;
  border-bottom: 1px solid var(--border-color);
}

.instruction-table th {
  background: var(--bg-tertiary);
  color: var(--success-color);
  font-weight: 600;
}

.instruction-table code {
  background: var(--bg-tertiary);
  padding: 4px 8px;
  border-radius: 4px;
  font-family: 'Consolas', 'Monaco', monospace;
  color: var(--warning-color);
  font-size: 16px;
}

.help-note {
  background: var(--bg-tertiary);
  padding: 15px;
  border-radius: 6px;
  border-left: 3px solid var(--accent-color);
}

.help-note p {
  margin-bottom: 10px;
  color: var(--success-color);
}

.help-note ul {
  list-style-position: inside;
  color: var(--text-secondary);
}

.help-note li {
  margin: 5px 0;
}

/* 示例列表 */
.example-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.example-item {
  padding: 16px;
  background: var(--bg-tertiary);
  border: 1px solid var(--border-color);
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s;
}

.example-item:hover {
  border-color: var(--accent-color);
  transform: translateX(4px);
}

.example-item h3 {
  color: var(--success-color);
  margin-bottom: 8px;
  font-size: 16px;
}

.example-item p {
  color: var(--text-secondary);
  font-size: 14px;
}

/* 设置对话框 */
.settings-modal {
  max-width: 700px;
}

.settings-section {
  margin-bottom: 30px;
  padding-bottom: 25px;
  border-bottom: 1px solid var(--border-color);
}

.settings-section:last-of-type {
  border-bottom: none;
}

.settings-section h3 {
  color: var(--success-color);
  margin-bottom: 8px;
  font-size: 18px;
}

.settings-desc {
  color: var(--text-secondary);
  font-size: 13px;
  margin-bottom: 15px;
}

.shortcuts-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 12px;
  margin-bottom: 15px;
}

.shortcut-item {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.shortcut-item label {
  color: var(--success-color);
  font-size: 14px;
  font-weight: 600;
}

.shortcut-input {
  padding: 8px;
  background: var(--bg-tertiary);
  border: 1px solid var(--border-color);
  border-radius: 4px;
  color: var(--text-primary);
  font-size: 16px;
  text-align: center;
  font-family: 'Consolas', 'Monaco', monospace;
  cursor: pointer;
  transition: all 0.2s;
  user-select: none;
}

.shortcut-input:hover {
  background: var(--bg-secondary);
  border-color: var(--accent-color);
  transform: translateY(-1px);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
}

.shortcut-input.active {
  background: var(--accent-color);
  border-color: var(--accent-color);
  color: white;
  animation: pulse 1s infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.7; }
}

.preset-buttons {
  display: flex;
  gap: 10px;
}

.preset-btn {
  padding: 8px 16px;
  background: var(--bg-tertiary);
  border: 1px solid var(--border-color);
  border-radius: 6px;
  color: var(--text-primary);
  cursor: pointer;
  font-size: 13px;
  transition: all 0.2s;
}

.preset-btn:hover {
  background: var(--accent-color);
  border-color: var(--accent-color);
  color: white;
}

.speed-settings {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.speed-setting-item {
  display: flex;
  align-items: center;
  gap: 12px;
}

.speed-setting-item label {
  color: var(--text-primary);
  font-size: 14px;
  min-width: 80px;
}

.speed-input {
  padding: 8px 12px;
  background: var(--bg-tertiary);
  border: 1px solid var(--border-color);
  border-radius: 4px;
  color: var(--text-primary);
  font-size: 14px;
  width: 100px;
}

.speed-input:focus {
  outline: none;
  border-color: var(--accent-color);
}

.unit {
  color: var(--text-secondary);
  font-size: 13px;
}

.settings-actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  padding-top: 20px;
}

.reset-btn, .save-btn {
  padding: 10px 20px;
  border-radius: 6px;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s;
}

.reset-btn {
  background: var(--bg-tertiary);
  border: 1px solid var(--border-color);
  color: var(--text-primary);
}

.reset-btn:hover {
  background: var(--error-color);
  border-color: var(--error-color);
  color: white;
}

.save-btn {
  background: var(--success-color);
  border: 1px solid var(--success-color);
  color: white;
}

.save-btn:hover {
  background: #38a169;
  border-color: #38a169;
}
</style>

