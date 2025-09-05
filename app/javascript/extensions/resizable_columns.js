import { Node, mergeAttributes } from '@tiptap/core'

export const ResizableColumns = Node.create({
  name: 'resizableColumns',
  group: 'block',
  isolating: true,
  content: 'column{2}',
  draggable: true,

  parseHTML() {
    return [{ tag: 'div.resizable-columns-container' }]
  },

  renderHTML({ HTMLAttributes }) {
    return [
      'div',
      mergeAttributes(HTMLAttributes, {
        'data-type': this.name,
        class: 'resizable-columns-container',
        style: 'display: flex; justify-content: space-between; position: relative;',
      }),
      0,
    ]
  },

  addNodeView() {
    return () => {
      // Основной контейнер
      const container = document.createElement('div')
      container.className = 'flex justify-between relative'
      container.style = 'display: flex; justify-content: space-between; position: relative;'

      // Контейнер для дочерних нод (колонок)
      const content = document.createElement('div')
      content.className = 'flex-grow flex justify-between'
      container.appendChild(content)

      return {
        dom: container,
        contentDOM: content,
      }
    }
  },

  addCommands() {
    return {
      setResizableColumns: () => ({ commands }) => {
        return commands.insertContent({
          type: this.name,
          content: [
            {
              type: 'column',
              content: [{ type: 'paragraph' }],
            },
            {
              type: 'column',
              content: [{ type: 'paragraph' }],
            },
          ],
        })
      },
    }
  },

  addKeyboardShortcuts() {
    return {
      'Mod-Alt-c': () => this.editor.commands.setResizableColumns(),
    }
  },
})