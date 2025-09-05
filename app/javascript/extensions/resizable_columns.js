import { Node, mergeAttributes } from '@tiptap/core'

export const ResizableColumns = Node.create({
  name: 'resizableColumns',
  group: 'block',
  isolating: true,
  // ВАЖНО: теперь контент - это ровно две ноды типа 'column'
  content: 'column{2}',
  draggable: true,

  addAttributes() {
    return {
      // Сохраняем ширину колонок в процентах
      widths: {
        default: [50, 50],
      },
    }
  },

  parseHTML() {
    return [{ tag: 'div.resizable-columns-container' }]
  },

  renderHTML({ HTMLAttributes }) {
    // Эта функция будет использоваться как fallback, если NodeView по какой-то причине не сработает
    return ['div', mergeAttributes(HTMLAttributes, { 'data-type': this.name, class: 'resizable-columns-container', style: 'display: flex; justify-content: space-between; gap: 1rem; position: relative;' }), 0]
  },

  addNodeView() {
    return ({ node, getPos, editor }) => {
      // Основной контейнер
      const container = document.createElement('div');
      container.className = 'flex justify-between gap-4 relative';
      container.style = 'display: flex; justify-content: space-between; gap: 1rem; position: relative;';

      // Контейнер для дочерних нод (колонок). Tiptap сам вставит их сюда.
      const content = document.createElement('div');
      content.className = 'flex-grow flex justify-between gap-4';
      container.style = 'display: flex; justify-content: space-between; gap: 1rem; position: relative;';
      container.appendChild(content);

      // Применяем сохраненную ширину при отрисовке
      const updateColumnWidths = () => {
        const cols = content.querySelectorAll('.col');
        if (cols.length === 2) {
          cols[0].style.width = `${node.attrs.widths[0]}%`;
          cols[1].style.width = `${node.attrs.widths[1]}%`;
        }
      };

      // Ждем, пока Tiptap отрендерит дочерние элементы
      setTimeout(updateColumnWidths, 0);


      // Логика изменения размера
      const resizer = document.createElement('div');
      resizer.className = 'absolute top-0 bottom-0 w-1 bg-gray-300 cursor-col-resize hover:bg-blue-500 transition-colors z-10';
      // Позиционируем разделитель относительно контейнера
      resizer.style.left = `${node.attrs.widths[0]}%`;
      resizer.style.transform = 'translateX(-50%)';
      container.appendChild(resizer);

      let isResizing = false;
      let startX;
      let startLeftWidth;

      const handleMouseMove = (e) => {
        if (!isResizing) return;

        const dx = e.pageX - startX;
        const containerWidth = container.offsetWidth;
        // Ограничиваем ширину, чтобы колонки не "схлопывались"
        const newLeftWidthPercent = Math.min(Math.max(10, ((startLeftWidth + dx) / containerWidth) * 100), 90);
        const newRightWidthPercent = 100 - newLeftWidthPercent;

        const leftCol = content.children[0];
        const rightCol = content.children[1];

        if (leftCol && rightCol) {
          leftCol.style.width = `${newLeftWidthPercent}%`;
          rightCol.style.width = `${newRightWidthPercent}%`;
          resizer.style.left = `${newLeftWidthPercent}%`;
        }
      };

      const handleMouseUp = () => {
        if (isResizing) {
          isResizing = false;
          const leftCol = content.children[0];
          const newLeftWidth = parseFloat(leftCol.style.width);
          
          // Сохраняем новое состояние в атрибуты ноды
          const transaction = editor.state.tr.setNodeMarkup(getPos(), undefined, {
            widths: [newLeftWidth, 100 - newLeftWidth],
          });
          editor.view.dispatch(transaction);

          document.removeEventListener('mousemove', handleMouseMove);
          document.removeEventListener('mouseup', handleMouseUp);
          container.classList.remove('select-none');
        }
      };

      resizer.addEventListener('mousedown', (e) => {
        e.preventDefault();
        isResizing = true;
        startX = e.pageX;
        startLeftWidth = content.children[0].offsetWidth;
        container.classList.add('select-none');

        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleMouseUp);
      });

      return {
        dom: container,
        // Указываем Tiptap, куда рендерить дочерние ноды (наши колонки)
        contentDOM: content,
        destroy: () => {
          document.removeEventListener('mousemove', handleMouseMove);
          document.removeEventListener('mouseup', handleMouseUp);
        }
      };
    };
  },

  addCommands() {
    return {
      setResizableColumns: () => ({ commands }) => {
        return commands.insertContent({
          type: this.name,
          attrs: { widths: [50, 50] }, // Атрибуты по умолчанию
          content: [
            {
              type: 'column', // Первая колонка
              content: [{ type: 'paragraph' }], // с параграфом внутри
            },
            {
              type: 'column', // Вторая колонка
              content: [{ type: 'paragraph' }], // с параграфом внутри
            },
          ],
        });
      },
    };
  },
  
  // Комбинация клавиш остается без изменений
  addKeyboardShortcuts() {
    return {
      'Mod-Alt-c': () => this.editor.commands.setResizableColumns(),
    }
  },
})