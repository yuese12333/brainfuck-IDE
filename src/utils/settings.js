/**
 * 设置管理工具
 */

// 默认设置
export const DEFAULT_SETTINGS = {
  // 快捷键配置
  shortcuts: ['1', '2', '3', '4', '5', '6', '7', '8'],
  // 速度档位配置（毫秒）
  speedLevels: {
    fast: 50,
    medium: 100,
    slow: 200
  }
}

// 预设快捷键方案
export const PRESET_SHORTCUTS = {
  numbers: ['1', '2', '3', '4', '5', '6', '7', '8'],
  homeRow: ['a', 's', 'd', 'f', 'j', 'k', 'l', ';']
}

// 从localStorage加载设置
export function loadSettings() {
  try {
    const saved = localStorage.getItem('brainfuck-settings')
    if (saved) {
      const settings = JSON.parse(saved)
      return {
        shortcuts: settings.shortcuts || DEFAULT_SETTINGS.shortcuts,
        speedLevels: settings.speedLevels || DEFAULT_SETTINGS.speedLevels
      }
    }
  } catch (error) {
    console.error('Failed to load settings:', error)
  }
  return { ...DEFAULT_SETTINGS }
}

// 保存设置到localStorage
export function saveSettings(settings) {
  try {
    localStorage.setItem('brainfuck-settings', JSON.stringify(settings))
    return true
  } catch (error) {
    console.error('Failed to save settings:', error)
    return false
  }
}

// 验证快捷键（只能是字母、数字、标点符号）
export function isValidShortcutKey(key) {
  if (key.length !== 1) return false
  const code = key.charCodeAt(0)
  // 字母、数字、常用标点符号
  return (
    (code >= 48 && code <= 57) ||   // 0-9
    (code >= 65 && code <= 90) ||   // A-Z
    (code >= 97 && code <= 122) ||  // a-z
    [';', ',', '.', '/', '[', ']', '-', '=', '`'].includes(key)
  )
}

// 验证速度值
export function isValidSpeed(speed) {
  return typeof speed === 'number' && speed >= 0 && speed <= 1000
}
