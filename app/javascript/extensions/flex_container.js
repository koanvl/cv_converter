import { Node, mergeAttributes } from '@tiptap/core'

export const FlexContainer = Node.create({
  name: 'flexContainer',
  
  group: 'block',
  
  content: 'block+',
  
  draggable: true,

  parseHTML() {
    return [
      {
        tag: 'div[data-type="flex-container"]',
      },
    ]
  },

  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes(HTMLAttributes, {
      'data-type': 'flex-container',
      class: 'flex flex-col min-h-[40px] border border-dashed border-gray-300 p-2 my-2',
    }), 0]
  },

  addNodeView() {
    return ({ node, getPos, editor }) => {
      const dom = document.createElement('div')
      dom.setAttribute('data-type', 'flex-container')
      dom.className = 'flex flex-col min-h-[40px] border border-dashed border-gray-300 p-2 my-2'

      const contentDOM = document.createElement('div')
      contentDOM.className = 'flex-grow'
      dom.appendChild(contentDOM)

      return {
        dom,
        contentDOM,
        update: (node) => {
          return true
        },
      }
    }
  },

  addCommands() {
    return {
      setFlexContainer: () => ({ commands }) => {
        return commands.wrapIn(this.name)
      },
    }
  },

  addKeyboardShortcuts() {
    return {
      'Mod-Alt-f': () => this.editor.commands.setFlexContainer(),
    }
  },
})