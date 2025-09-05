import { Controller } from "@hotwired/stimulus"

export default class extends Controller {
  static targets = ["input", "output"]
  static values = {
    json: Object
  }

  connect() {
    if (this.hasInputTarget) {
      this.processJson(this.inputTarget.value)
    } else if (this.hasJsonValue) {
      this.processJson(JSON.stringify(this.jsonValue))
    }
  }

  processJson(jsonString) {
    try {
      const json = JSON.parse(jsonString)
      const formattedHtml = this.formatJson(json)
      this.outputTarget.innerHTML = `
        <pre>
          <code class="language-json" style="white-space: pre-wrap; word-wrap: break-word;">
            ${formattedHtml}
          </code>
        </pre>
      `
      this.setupDragHandlers()
    } catch (error) {
      console.error("Error processing JSON:", error)
      this.outputTarget.textContent = "Invalid JSON"
    }
  }

  /**
   * Рекурсивно форматирует JSON в HTML.
   */
  formatJson(obj, level = 0, path = []) {
    const indent = "  ".repeat(level)
    const nextIndent = "  ".repeat(level + 1)

    if (Array.isArray(obj)) {
      const items = obj.map((item, index) => {
        return this.formatJson(item, level + 1, [...path, index])
      }).join(",\n")
      return `[\n${items}\n${indent}]`
    }

    if (obj && typeof obj === 'object') {
      const entries = Object.entries(obj).map(([key, value]) => {
        const newPath = [...path, key]
        const formattedKey = this.wrapFieldInDraggableSpan(key, newPath, value)
        const formattedValue = this.formatJson(value, level + 1, newPath)
        return `${nextIndent}${formattedKey}: ${formattedValue}`
      }).join(",\n")
      return `{\n${entries}\n${indent}}`
    }

    if (typeof obj === 'string') {
      return this.wrapValueInDraggableSpan(JSON.stringify(obj), path)
    }

    return JSON.stringify(obj)
  }

  /**
   * Оборачивает ключ JSON. Контекст массива вычисляется из path.
   */
  wrapFieldInDraggableSpan(key, path, value) {
    const isArray = Array.isArray(value)
    const arrayContext = path.filter(p => typeof p === 'string').slice(0, -1)

    const className = isArray ? 'json-field json-array-field' : 'json-field'
    const dataAttrs = `
      data-field="${key}"
      data-is-array="${isArray}"
      data-array-context="${arrayContext.join(',')}"
    `
    return `<span class="${className}" draggable="true" ${dataAttrs}>"${key}"</span>`
  }

  /**
   * Оборачивает значение JSON. Контекст массива вычисляется из path.
   */
  wrapValueInDraggableSpan(value, path) {
    const stringKeysInPath = path.filter(p => typeof p === 'string')
    const key = stringKeysInPath.pop() || ''
    const arrayContext = stringKeysInPath

    const dataAttrs = `
      data-field="${key}"
      data-array-context="${arrayContext.join(',')}"
    `
    return `<span class="json-value" draggable="true" ${dataAttrs}>${value}</span>`
  }

  /**
   * Устанавливает обработчики перетаскивания.
   * Эта версия генерирует многострочный, форматированный шаблон.
   */
  setupDragHandlers() {
    this.element.querySelectorAll('.json-field, .json-value').forEach(field => {
      field.addEventListener('dragstart', (e) => {
        e.stopPropagation()

        const isArray = e.target.dataset.isArray === 'true'
        const fieldName = e.target.dataset.field
        const arrayContext = e.target.dataset.arrayContext.split(',').filter(Boolean)

        let template
        if (isArray) {
          template = `{{#each ${fieldName}}}\n  \n{{/each}}`
        } else {
          template = `{{${fieldName}}}`
        }

        if (arrayContext.length > 0 && !e.shiftKey) {
          const eachBlocks = arrayContext.map(array => `{{#each ${array}}}`).join('\n')
          const closingBlocks = arrayContext.map(() => `{{/each}}`).reverse().join('\n')
          const indentedTemplate = template.split('\n').map(line => `  ${line}`).join('\n')
          template = `${eachBlocks}\n${indentedTemplate}\n${closingBlocks}`
        }

        const lines = template.split('\n');

        const htmlParagraphs = lines
          .filter(line => line.trim() !== '')
          .map(line => `<p>${line.trim()}</p>`)
          .join('');

        // ---- ИЗМЕНЕНИЕ ЗДЕСЬ ----
        // Оборачиваем все параграфы в один родительский DIV
        const finalHtml = `<div>${htmlParagraphs}</div>`;

        e.dataTransfer.setData('text/html', finalHtml);
        e.dataTransfer.setData('text/plain', template);
        e.dataTransfer.effectAllowed = 'copy';
      })
    })
  }
}