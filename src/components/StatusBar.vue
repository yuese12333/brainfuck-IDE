<template>
  <div class="status-bar">
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
      <span class="status-value">{{ instructionCount }}</span>
    </div>
    <div class="status-item">
      <span class="status-label">内存指针:</span>
      <span class="status-value">{{ pointer }}</span>
    </div>
    <div class="status-item">
      <span class="status-label">执行速度:</span>
      <span class="status-value speed">{{ speedText }}</span>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  isRunning: Boolean,
  isCompleted: Boolean,
  currentPosition: {
    type: Number,
    default: 0
  },
  instructionCount: {
    type: Number,
    default: 0
  },
  pointer: {
    type: Number,
    default: 0
  },
  instructionsPerSecond: {
    type: Number,
    default: 0
  }
})

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
</style>
