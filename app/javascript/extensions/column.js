// column.js
import { Node, mergeAttributes } from '@tiptap/core'

export const Column = Node.create({
  name: 'column',
  // Контент внутри колонки - это один или несколько блочных элементов
  content: 'block+',
  // Эта нода является частью ноды resizableColumns
  defining: true,

  parseHTML() {
    return [{ tag: 'div.col' }]
  },

  renderHTML({ HTMLAttributes }) {
    // 0 означает "дырку", куда Tiptap вставит контент (content: 'block+')
    return ['div', mergeAttributes(HTMLAttributes, { class: 'col border border-gray-300 dashed w-1/2' }), 0]
  },
})