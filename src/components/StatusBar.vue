<template>
  <div class="status-bar" ref="root">
        <div class="status-item">
          <span class="status-label">状态:</span>
          <span class="status-value" :class="statusClass">{{ statusText }}</span>
        </div>

        <div class="status-item">
          <span class="status-label">指令位置:</span>
          <span class="status-value">{{ currentPosition }}</span>
        </div>

        <div class="status-item">
          <span class="status-label">执行次数:</span>
          <button class="status-value clickable" @click.stop="toggleProfiler">{{ instructionCount }}</button>
        </div>

        <div class="status-item">
          <span class="status-label">内存指针:</span>
          <span class="status-value">{{ pointer }}</span>
        </div>

        <div class="status-item">
          <span class="status-label">执行速度:</span>
          <span class="status-value speed">{{ speedText }}</span>
        </div>

        <div v-if="profilerOpen" class="profiler-popup" ref="popup">
          <div class="profiler-header">
            <strong>指令执行统计</strong>
            <div class="header-controls">
              <label class="keep-stats-checkbox" title="重置时保持统计数据">
                <input 
                  type="checkbox" 
                  :checked="props.keepStatsOnReset"
                  @change="toggleKeepStats"
                />
                <span class="checkbox-label">保持统计</span>
              </label>
              <button class="close-btn" @click="closeProfiler">✕</button>
            </div>
          </div>

          <div class="profiler-list">
            <div v-if="profileEntries.length === 0" class="profiler-empty">暂无统计数据</div>
            <div v-for="entry in profileEntries" :key="entry.key" class="profiler-item" :class="entry.colorClass">
              <div class="instr-symbol">{{ entry.key }}</div>
              <div class="instr-stats">
                <span class="instr-count">{{ entry.count }}</span>
                <span class="instr-percentage">({{ entry.percentage }}%)</span>
              </div>
            </div>
          </div>
        </div>
      </div>
</template>

<script setup>
    import { ref, computed, onMounted, onBeforeUnmount } from 'vue'

    const props = defineProps({
      isRunning: Boolean,
      isCompleted: Boolean,
      currentPosition: { type: Number, default: 0 },
      instructionCount: { type: Number, default: 0 },
      // instructionProfile 可以是对象 {">": 123, "<": 10, ...} 或数组 [count0, count1, ...]
      instructionProfile: { type: [Object, Array], default: () => ({}) },
      pointer: { type: Number, default: 0 },
      instructionsPerSecond: { type: Number, default: 0 },
      keepStatsOnReset: { type: Boolean, default: false }
    })

    const emit = defineEmits(['toggle-keep-stats'])

    const root = ref(null)
    const popup = ref(null)
    const profilerOpen = ref(false)

    const statusText = computed(() => {
      if (props.isRunning) return '运行中'
      if (props.isCompleted) return '完成'
      return '就绪'
    })

    const statusClass = computed(() => {
      if (props.isRunning) return 'running'
      if (props.isCompleted) return 'completed'
      return 'ready'
    })

    const speedText = computed(() => {
      if (!props.isRunning) return '-'
      if (props.instructionsPerSecond >= 1000000) {
        return `${(props.instructionsPerSecond / 1000000).toFixed(2)}M IPS`
      }
      if (props.instructionsPerSecond >= 1000) {
        return `${(props.instructionsPerSecond / 1000).toFixed(2)}K IPS`
      }
      return `${props.instructionsPerSecond.toFixed(0)} IPS`
    })

    const profileEntries = computed(() => {
      const p = props.instructionProfile || {}
      const instructions = ['>', '<', '+', '-', '.', ',', '[', ']']
      
      let entries = []
      if (Array.isArray(p)) {
        entries = instructions.map((instr, i) => {
          const count = p[i] || 0
          return { key: instr, count }
        })
      } else {
        entries = instructions.map(instr => {
          const count = p[instr] || 0
          return { key: instr, count }
        })
      }
      
      // 计算总执行次数（基于所有指令的实际执行次数）
      const actualTotal = entries.reduce((sum, entry) => sum + entry.count, 0)
      
      // 计算颜色强度和百分比
      const maxCount = Math.max(...entries.map(e => e.count))
      return entries.map(entry => {
        const percentage = actualTotal > 0 ? (entry.count / actualTotal) * 100 : 0
        const intensity = maxCount > 0 ? entry.count / maxCount : 0
        
        let colorClass = 'intensity-0'
        if (intensity > 0.8) colorClass = 'intensity-5'
        else if (intensity > 0.6) colorClass = 'intensity-4'
        else if (intensity > 0.4) colorClass = 'intensity-3'
        else if (intensity > 0.2) colorClass = 'intensity-2'
        else if (intensity > 0) colorClass = 'intensity-1'
        
        return {
          ...entry,
          percentage: percentage.toFixed(1),
          colorClass,
          intensity
        }
      })
    })

    function toggleProfiler() {
      profilerOpen.value = !profilerOpen.value
    }
    function closeProfiler() {
      profilerOpen.value = false
    }
    function toggleKeepStats() {
      emit('toggle-keep-stats')
    }

    function handleKeydown(e) {
      if (e.key === 'Escape') closeProfiler()
    }

    onMounted(() => {
      document.addEventListener('keydown', handleKeydown)
    })

    onBeforeUnmount(() => {
      document.removeEventListener('keydown', handleKeydown)
    })
</script>

<style scoped>
    .status-bar {
      height: 32px;
      background: var(--bg-tertiary);
      border-top: 1px solid var(--border-color);
      display: flex;
      align-items: center;
      padding: 0 16px;
      gap: 24px;
      font-size: 12px;
      position: relative;
    }

    .status-item {
      display: flex;
      align-items: center;
      gap: 6px;
    }

    .status-label {
      color: var(--text-secondary);
    }

    .status-value {
      color: var(--text-primary);
      font-family: 'Consolas', 'Monaco', monospace;
      font-weight: 500;
      background: transparent;
      border: none;
    }

    .clickable {
      cursor: pointer;
      padding: 2px 6px;
      border-radius: 4px;
    }

    .clickable:hover {
      background: rgba(255,255,255,0.02);
    }

    .status-value.running {
      color: var(--success-color);
    }

    .status-value.completed {
      color: var(--warning-color);
    }

    .status-value.ready {
      color: var(--accent-color);
    }

    .status-value.speed {
      color: var(--warning-color);
      font-weight: 600;
    }

    .profiler-popup {
      position: absolute;
      bottom: 100%;
      right: 16px;
      margin-bottom: 8px;
      width: 320px;
      max-height: 300px;
      background: var(--bg-primary);
      border: 1px solid var(--border-color);
      box-shadow: 0 6px 20px rgba(0,0,0,0.4);
      border-radius: 6px;
      padding: 8px;
      overflow: auto;
      z-index: 50;
    }
    .profiler-header {
      display:flex;
      justify-content:space-between;
      align-items:center;
      padding:4px 8px;
      border-bottom:1px solid var(--border-color);
      margin-bottom:6px;
    }
    .header-controls {
      display: flex;
      align-items: center;
      gap: 6px;
    }
    .keep-stats-checkbox {
      display: flex;
      align-items: center;
      gap: 4px;
      cursor: pointer;
      font-size: 11px;
    }
    .keep-stats-checkbox input[type="checkbox"] {
      margin: 0;
      cursor: pointer;
    }
    .checkbox-label {
      color: var(--text-secondary);
      cursor: pointer;
      user-select: none;
    }
    .close-btn {
      background: transparent;
      border: none;
      cursor: pointer;
      font-size: 14px;
    }
    .profiler-list {
      display: grid;
      grid-template-columns: 1fr 1fr;
      grid-template-rows: repeat(4, 1fr);
      gap: 6px;
      font-family: 'Consolas', 'Monaco', monospace;
      font-size: 12px;
    }
    .profiler-item {
      display:flex;
      justify-content:space-between;
      align-items:center;
      gap:8px;
      padding: 2px 4px;
      border-radius: 3px;
      transition: all 0.3s ease;
    }
    .profiler-item:hover {
      background: rgba(255,255,255,0.02);
      transform: scale(1.02);
    }
    
    /* 执行频率颜色等级 */
    .profiler-item.intensity-0 {
      background: rgba(128,128,128,0.1);
    }
    .profiler-item.intensity-1 {
      background: rgba(0,255,0,0.15);
      border-left: 2px solid rgba(0,255,0,0.3);
    }
    .profiler-item.intensity-2 {
      background: rgba(255,255,0,0.15);
      border-left: 2px solid rgba(255,255,0,0.4);
    }
    .profiler-item.intensity-3 {
      background: rgba(255,165,0,0.2);
      border-left: 2px solid rgba(255,165,0,0.5);
    }
    .profiler-item.intensity-4 {
      background: rgba(255,100,100,0.25);
      border-left: 2px solid rgba(255,100,100,0.6);
    }
    .profiler-item.intensity-5 {
      background: rgba(255,0,0,0.3);
      border-left: 3px solid rgba(255,0,0,0.8);
      box-shadow: 0 0 8px rgba(255,0,0,0.3);
    }
    .instr-symbol {
      font-weight: bold;
      color: var(--warning-color);
      min-width: 16px;
      transition: color 0.3s ease;
    }
    .intensity-0 .instr-symbol { color: var(--text-secondary); }
    .intensity-1 .instr-symbol { color: #00ff00; }
    .intensity-2 .instr-symbol { color: #ffff00; }
    .intensity-3 .instr-symbol { color: #ffa500; }
    .intensity-4 .instr-symbol { color: #ff6464; }
    .intensity-5 .instr-symbol { color: #ff0000; font-size: 13px; }
    .instr-stats {
      display: flex;
      align-items: center;
      gap: 6px;
    }
    .instr-count {
      color: var(--text-primary);
      font-weight: 500;
    }
    .instr-percentage {
      color: var(--text-secondary);
      font-size: 11px;
    }
    .profiler-empty { text-align:center; color:var(--text-secondary); padding:12px 0 }
    </style>
