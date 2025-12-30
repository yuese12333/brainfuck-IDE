<template>
  <div class="control-panel">
    <div class="panel-header">
      <h3>控制面板</h3>
    </div>
    <div class="panel-body">
      <div class="button-group">
        <button 
          @click="$emit('run')" 
          :disabled="isRunning || isPaused || isCompleted"
          class="run-btn"
        >
          ▶️ 运行
        </button>
        <button 
          @click="$emit('continue')" 
          :disabled="!isPaused"
          class="continue-btn"
        >
          ⏭️ 继续
        </button>
        <button 
          @click="$emit('step')" 
          :disabled="isRunning || isCompleted"
          class="step-btn"
        >
          ⏯️ 单步
        </button>
        <button 
          @click="$emit('stop')" 
          :disabled="!isRunning && !isPaused"
          class="stop-btn"
        >
          ⏹️ 停止
        </button>
        <button 
          @click="$emit('reset')"
          class="reset-btn"
        >
          🔄 重置
        </button>
      </div>
      
      <div class="speed-control">
        <label>执行速度</label>
        <div class="speed-buttons">
          <button 
            @click="setSpeed(0)"
            class="speed-btn"
            :class="{ active: executionSpeed === 0 }"
            :disabled="isRunning"
          >
            ⚡ 最快
          </button>
          <button 
            @click="setSpeed(speedLevels.fast)"
            class="speed-btn"
            :class="{ active: executionSpeed === speedLevels.fast }"
            :disabled="isRunning"
          >
            🚀 快
          </button>
          <button 
            @click="setSpeed(speedLevels.medium)"
            class="speed-btn"
            :class="{ active: executionSpeed === speedLevels.medium }"
            :disabled="isRunning"
          >
            🚶 中
          </button>
          <button 
            @click="setSpeed(speedLevels.slow)"
            class="speed-btn"
            :class="{ active: executionSpeed === speedLevels.slow }"
            :disabled="isRunning"
          >
            🐌 慢
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  isRunning: Boolean,
  isPaused: Boolean,
  isCompleted: Boolean,
  executionSpeed: {
    type: Number,
    default: 100
  },
  speedLevels: {
    type: Object,
    default: () => ({ fast: 50, medium: 100, slow: 200 })
  }
})

const emit = defineEmits(['run', 'continue', 'step', 'stop', 'reset', 'update-speed'])

const setSpeed = (speed) => {
  emit('update-speed', speed)
}
</script>

<style scoped>
.control-panel {
  background: var(--bg-secondary);
  border-bottom: 1px solid var(--border-color);
}

.panel-header {
  padding: 12px 16px;
  border-bottom: 1px solid var(--border-color);
}

.panel-header h3 {
  font-size: 14px;
  color: var(--text-primary);
  font-weight: 600;
}

.panel-body {
  padding: 16px;
}

.button-group {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
  margin-bottom: 20px;
}

.button-group button {
  padding: 12px;
  font-size: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
}

.run-btn {
  background: var(--success-color);
  color: #000;
}

.continue-btn {
  background: #4CAF50;
  color: #fff;
}

.step-btn {
  background: var(--accent-color);
}

.stop-btn {
  background: var(--error-color);
}

.reset-btn {
  background: var(--warning-color);
  color: #000;
}

.speed-control {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.speed-control label {
  font-size: 14px;
  color: var(--text-primary);
  font-weight: 500;
}

.speed-buttons {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 8px;
}

.speed-btn {
  padding: 10px 12px;
  border: 1px solid var(--border-color);
  border-radius: 6px;
  background: var(--bg-secondary);
  color: var(--text-primary);
  cursor: pointer;
  font-size: 14px;
  transition: all 0.2s;
  white-space: nowrap;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
}

.speed-btn:hover {
  background: var(--bg-tertiary);
  transform: translateY(-1px);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
}

.speed-btn.active {
  background: var(--accent-color);
  border-color: var(--accent-color);
  color: white;
  font-weight: 600;
  box-shadow: 0 4px 12px rgba(66, 153, 225, 0.4);
}

.speed-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  background: var(--bg-secondary);
  color: var(--text-secondary);
  transform: none;
  box-shadow: none;
}

.speed-btn:disabled:hover {
  background: var(--bg-secondary);
  transform: none;
  box-shadow: none;
}
</style>
