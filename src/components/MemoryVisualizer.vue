<template>
  <div class="memory-visualizer">
    <div class="panel-header">
      <h3>内存可视化 (共30000单元)</h3>
      <div class="pagination-controls">
        <button @click="prevPage" :disabled="currentPage === 0" class="page-btn">
          ◀ 上一页
        </button>
        <span class="page-info">
          第 {{ currentPage + 1 }} 页 ({{ startIndex }}-{{ endIndex }})
        </span>
        <button @click="nextPage" :disabled="currentPage >= maxPage" class="page-btn">
          下一页 ▶
        </button>
      </div>
    </div>
    <div class="memory-grid">
      <div 
        v-for="(value, index) in displayMemory" 
        :key="startIndex + index"
        class="memory-cell"
        :class="{ 'active': startIndex + index === pointer, 'has-value': value > 0 }"
        :title="`索引: ${startIndex + index}, 值: ${value}, 字符: ${getChar(value)}`"
      >
        <div class="cell-index">{{ startIndex + index }}</div>
        <div class="cell-value">{{ value }}</div>
        <div class="cell-char">{{ getChar(value) }}</div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, ref, watch } from 'vue'

const props = defineProps({
  memory: {
    type: Array,
    default: () => new Array(30).fill(0)
  },
  pointer: {
    type: Number,
    default: 0
  }
})

const currentPage = ref(0)
const pageSize = 30
const maxPage = computed(() => Math.floor(29999 / pageSize))

// 完整内存数组（30000单元）
const fullMemory = ref(new Array(30000).fill(0))

// 初始化前60个单元
watch(() => props.memory, (newMemory) => {
  // 更新前60个单元
  for (let i = 0; i < Math.min(60, newMemory.length); i++) {
    fullMemory.value[i] = newMemory[i]
  }
  
  // 如果指针位置在当前页之外，按需加载该位置的数据
  if (props.pointer >= 60 && props.pointer < 30000) {
    // 从解释器获取完整内存（这里暂时用传入的memory填充）
    // 实际应该从解释器获取完整的30000个单元
  }
}, { immediate: true })

// 当前页的起始和结束索引
const startIndex = computed(() => currentPage.value * pageSize)
const endIndex = computed(() => Math.min(startIndex.value + pageSize - 1, 29999))

// 当前页显示的内存
const displayMemory = computed(() => {
  return fullMemory.value.slice(startIndex.value, startIndex.value + pageSize)
})

// 自动跳转到指针所在页
watch(() => props.pointer, (newPointer) => {
  const pointerPage = Math.floor(newPointer / pageSize)
  if (pointerPage !== currentPage.value) {
    currentPage.value = pointerPage
  }
})

const prevPage = () => {
  if (currentPage.value > 0) {
    currentPage.value--
  }
}

const nextPage = () => {
  if (currentPage.value < maxPage.value) {
    currentPage.value++
  }
}

const getChar = (value) => {
  if (value >= 32 && value <= 126) {
    return String.fromCharCode(value)
  }
  return '·'
}
</script>

<style scoped>
.memory-visualizer {
  background: var(--bg-secondary);
  border-bottom: 1px solid var(--border-color);
  display: flex;
  flex-direction: column;
  max-height: 280px;
}

.panel-header {
  padding: 12px 16px;
  border-bottom: 1px solid var(--border-color);
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.panel-header h3 {
  font-size: 14px;
  color: var(--text-primary);
  font-weight: 600;
}

.pagination-controls {
  display: flex;
  align-items: center;
  gap: 12px;
}

.page-btn {
  padding: 4px 12px;
  font-size: 12px;
  background: var(--bg-tertiary);
}

.page-btn:disabled {
  opacity: 0.3;
  cursor: not-allowed;
}

.page-info {
  font-size: 12px;
  color: var(--text-secondary);
  font-family: 'Consolas', 'Monaco', monospace;
  min-width: 150px;
  text-align: center;
}

.memory-grid {
  padding: 12px;
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(65px, 1fr));
  gap: 8px;
  overflow-y: auto;
  flex: 1;
}

.memory-cell {
  background: var(--bg-tertiary);
  border: 2px solid var(--border-color);
  border-radius: 6px;
  padding: 8px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  transition: all 0.2s;
  cursor: pointer;
}

.memory-cell:hover {
  border-color: var(--text-secondary);
  transform: translateY(-2px);
}

.memory-cell.active {
  border-color: var(--accent-color);
  background: rgba(0, 122, 204, 0.1);
  box-shadow: 0 0 10px rgba(0, 122, 204, 0.3);
}

.memory-cell.has-value {
  background: rgba(78, 201, 176, 0.05);
}

.cell-index {
  font-size: 10px;
  color: var(--text-secondary);
  font-family: 'Consolas', 'Monaco', monospace;
}

.cell-value {
  font-size: 16px;
  font-weight: 600;
  color: var(--success-color);
  font-family: 'Consolas', 'Monaco', monospace;
}

.cell-char {
  font-size: 12px;
  color: var(--warning-color);
  font-family: 'Consolas', 'Monaco', monospace;
  height: 14px;
}
</style>
